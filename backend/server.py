#!/usr/bin/env python3
"""
HUMANLY - Production HTTP & REST API Server (Python Edition)
Full parity with backend/server.js: SQLite integration, PBKDF2 SHA-512 auth,
user/password management, persistent settings, surveys, kudos, announcements, and audit logs.
"""

import http.server
import socketserver
import os
import sys
import json
import sqlite3
import hashlib
import secrets
import re
from datetime import datetime, timedelta
from urllib.parse import urlparse

PORT = int(os.environ.get("PORT", 8080))
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR) if os.path.basename(BACKEND_DIR) == "backend" else BACKEND_DIR
WEB_DIR = os.path.join(PROJECT_ROOT, "web")
HTML_DIR = os.path.join(WEB_DIR, "html")
CSS_DIR = os.path.join(WEB_DIR, "css")
JS_DIR = os.path.join(WEB_DIR, "js")

DB_CANDIDATES = [
    os.path.join(PROJECT_ROOT, "database", "humanly.db"),
    os.path.join(BACKEND_DIR, "database", "humanly.db"),
    os.path.join(PROJECT_ROOT, "humanly.db"),
    os.path.join(BACKEND_DIR, "humanly.db")
]
DB_PATH = next((p for p in DB_CANDIDATES if os.path.exists(p)), DB_CANDIDATES[0])


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            settings_json TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    return conn


def hash_pw(password):
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return pw_hash, salt


def verify_pw(password, stored_hash, salt):
    # Support both utf-8 hex-string salt (Node.js crypto.pbkdf2Sync) and raw bytes
    test_hash = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return secrets.compare_digest(stored_hash, test_hash)


def log_audit(conn, user_id, user_email, action, details, ip='127.0.0.1'):
    conn.execute(
        "INSERT INTO audit_logs (user_id, user_email, action, details, ip_address) VALUES (?, ?, ?, ?, ?)",
        (user_id, user_email, action, details, ip)
    )


class HumanlyAPIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_ROOT, **kwargs)

    def translate_path(self, path):
        path = urlparse(path).path
        if path == '/' or path == '':
            return os.path.join(HTML_DIR, 'index.html')
        if path.startswith('/css/'):
            return os.path.join(CSS_DIR, path[5:].lstrip('/\\'))
        if path.startswith('/js/'):
            return os.path.join(JS_DIR, path[4:].lstrip('/\\'))
        if path.startswith('/html/'):
            return os.path.join(HTML_DIR, path[6:].lstrip('/\\'))
        if path.endswith('.html'):
            candidate = os.path.join(HTML_DIR, os.path.basename(path))
            if os.path.exists(candidate):
                return candidate
        rel_path = path.lstrip('/\\')
        for base in [WEB_DIR, PROJECT_ROOT]:
            test_target = os.path.abspath(os.path.join(base, rel_path))
            if os.path.exists(test_target):
                return test_target
        return os.path.abspath(os.path.join(PROJECT_ROOT, rel_path))

    def send_json(self, status, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def get_auth_user(self):
        auth = self.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return None
        token = auth[7:].strip()
        conn = get_db()
        row = conn.execute("""
            SELECT u.id, u.name, u.email, u.role, u.department, u.title, u.avatar, u.status
            FROM sessions s JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
        """, (token,)).fetchone()
        conn.close()
        return dict(row) if row else None

    def read_json_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length == 0:
            return {}
        data = self.rfile.read(length)
        return json.loads(data.decode('utf-8'))

    def do_POST(self):
        path = urlparse(self.path).path
        client_ip = self.client_address[0] if self.client_address else '127.0.0.1'

        if path == '/api/auth/login':
            data = self.read_json_body()
            email = data.get('email', '').strip()
            password = data.get('password', '')

            conn = get_db()
            user = conn.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email,)).fetchone()

            if not user or not verify_pw(password, user['password_hash'], user['salt']):
                log_audit(conn, user['id'] if user else None, email, 'LOGIN_FAILED', 'Invalid password or unverified account attempt', client_ip)
                conn.commit()
                conn.close()
                return self.send_json(401, {"success": False, "message": "Invalid credentials. Please verify your work email and password."})

            token = secrets.token_hex(32)
            expires = (datetime.utcnow() + timedelta(hours=48)).isoformat()
            conn.execute("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", (token, user['id'], expires))
            log_audit(conn, user['id'], user['email'], 'LOGIN_SUCCESS', f"Authenticated via database credentials. Role: {user['role']}", client_ip)
            s_row = conn.execute("SELECT settings_json FROM user_settings WHERE user_id = ?", (user['id'],)).fetchone()
            user_settings = json.loads(s_row['settings_json']) if s_row else {}
            conn.commit()
            conn.close()

            safe_user = {k: user[k] for k in ('id', 'name', 'email', 'role', 'department', 'title', 'avatar', 'status')}
            return self.send_json(200, {"success": True, "token": token, "expiresAt": expires, "user": safe_user, "settings": user_settings})

        elif path == '/api/auth/register':
            data = self.read_json_body()
            name = (data.get('name') or '').strip()
            email = (data.get('email') or '').strip()
            password = data.get('password') or ''
            role = 'admin' if data.get('role') == 'admin' else 'employee'
            department = (data.get('department') or 'General').strip()
            title = (data.get('title') or 'Team Member').strip()

            if not name or not email or len(password) < 6:
                return self.send_json(400, {"success": False, "message": "Name, email, and password (min 6 chars) required"})

            conn = get_db()
            if conn.execute("SELECT id FROM users WHERE email = ? COLLATE NOCASE", (email,)).fetchone():
                conn.close()
                return self.send_json(409, {"success": False, "message": "An account with this email already exists."})

            pw_hash, salt = hash_pw(password)
            avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, salt, role, department, title, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (name, email, pw_hash, salt, role, department, title, avatar)
            )
            uid = cur.lastrowid
            token = secrets.token_hex(32)
            expires = (datetime.utcnow() + timedelta(hours=48)).isoformat()
            conn.execute("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", (token, uid, expires))
            log_audit(conn, uid, email, 'USER_REGISTERED', f"New account created. Role: {role}", client_ip)
            new_user = dict(conn.execute("SELECT id, name, email, role, department, title, avatar, status FROM users WHERE id = ?", (uid,)).fetchone())
            conn.commit()
            conn.close()
            return self.send_json(201, {"success": True, "token": token, "user": new_user})

        elif path == '/api/auth/logout':
            auth = self.headers.get('Authorization', '')
            if auth.startswith('Bearer '):
                token = auth[7:].strip()
                conn = get_db()
                u = conn.execute("SELECT u.id, u.email, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?", (token,)).fetchone()
                if u:
                    log_audit(conn, u['id'], u['email'], 'USER_LOGOUT', f"User signed out ({u['role']})", client_ip)
                conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
                conn.commit()
                conn.close()
            return self.send_json(200, {"success": True, "message": "Session logged out"})

        elif path == '/api/audit/activity':
            auth_user = self.get_auth_user()
            if not auth_user:
                return self.send_json(401, {"success": False, "message": "Unauthorized session"})
            data = self.read_json_body()
            conn = get_db()
            log_audit(conn, auth_user['id'], auth_user['email'], str(data.get('action', 'PAGE_VIEW'))[:60], str(data.get('details', ''))[:300], client_ip)
            conn.commit()
            conn.close()
            return self.send_json(201, {"success": True})

        elif path == '/api/users':
            auth_user = self.get_auth_user()
            if not auth_user or auth_user.get('role') != 'admin':
                return self.send_json(403, {"success": False, "message": "Admin privileges required"})
            data = self.read_json_body()
            name = (data.get('name') or '').strip()
            email = (data.get('email') or '').strip()
            password = data.get('password') or ''
            if not name or not email or not password:
                return self.send_json(400, {"success": False, "message": "Name, email, and password required"})
            if len(password) < 6:
                return self.send_json(400, {"success": False, "message": "Password must be at least 6 characters"})
            conn = get_db()
            if conn.execute("SELECT id FROM users WHERE email = ? COLLATE NOCASE", (email,)).fetchone():
                conn.close()
                return self.send_json(409, {"success": False, "message": "A user with this email already exists"})
            pw_hash, salt = hash_pw(password)
            role = data.get('role') if data.get('role') in ('admin', 'employee', 'hr_manager') else 'employee'
            department = (data.get('department') or 'General').strip()
            title = (data.get('title') or 'Team Member').strip()
            avatar = data.get('avatar') or 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, salt, role, department, title, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (name, email, pw_hash, salt, role, department, title, avatar)
            )
            uid = cur.lastrowid
            log_audit(conn, auth_user['id'], auth_user['email'], 'USER_CREATED_BY_ADMIN', f"Admin created user {email} with role {role}", client_ip)
            new_user = dict(conn.execute("SELECT id, name, email, role, department, title, avatar, status, retention_risk, created_at FROM users WHERE id = ?", (uid,)).fetchone())
            conn.commit()
            conn.close()
            return self.send_json(201, {"success": True, "user": new_user})

        elif path == '/api/surveys':
            auth_user = self.get_auth_user()
            if not auth_user or auth_user.get('role') != 'admin':
                return self.send_json(403, {"success": False, "message": "Admin privileges required"})
            data = self.read_json_body()
            conn = get_db()
            cur = conn.execute(
                "INSERT INTO surveys (title, description, category, department, deadline, total_target, participation, responses_count) VALUES (?, ?, ?, ?, ?, ?, 0, 0)",
                (data.get('title'), data.get('description', ''), data.get('category', 'Well-Being'), data.get('department', 'All Company'), data.get('deadline', 'Jan 30, 2027'), int(data.get('total_target', 100)))
            )
            sid = cur.lastrowid
            log_audit(conn, auth_user['id'], auth_user['email'], 'SURVEY_CREATED', f"Launched survey: {data.get('title')}", client_ip)
            survey = dict(conn.execute("SELECT * FROM surveys WHERE id = ?", (sid,)).fetchone())
            conn.commit()
            conn.close()
            return self.send_json(201, {"success": True, "survey": survey})

        elif re.match(r'^/api/surveys/\d+/respond$', path):
            sid = int(path.split('/')[3])
            auth_user = self.get_auth_user()
            data = self.read_json_body()
            conn = get_db()
            conn.execute(
                "INSERT INTO survey_responses (survey_id, user_id, rating, balance_score, comments) VALUES (?, ?, ?, ?, ?)",
                (sid, auth_user['id'] if auth_user else None, data.get('rating', 5), data.get('balanceScore', 8), data.get('comments', ''))
            )
            cnt = conn.execute("SELECT COUNT(*) as c FROM survey_responses WHERE survey_id = ?", (sid,)).fetchone()['c']
            s_row = conn.execute("SELECT total_target FROM surveys WHERE id = ?", (sid,)).fetchone()
            if s_row and s_row['total_target'] > 0:
                part = min(100, round((cnt / s_row['total_target']) * 100))
                conn.execute("UPDATE surveys SET participation = ?, responses_count = ? WHERE id = ?", (part, cnt, sid))
            if auth_user:
                log_audit(conn, auth_user['id'], auth_user['email'], 'SURVEY_RESPONSE', f"Submitted response to survey #{sid}", client_ip)
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "message": "Response recorded in database"})

        elif path == '/api/kudos':
            auth_user = self.get_auth_user()
            data = self.read_json_body()
            conn = get_db()
            cur = conn.execute("""
                INSERT INTO kudos (sender_id, sender_name, sender_role, sender_avatar, recipient_name, recipient_role, badge, core_value, message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                auth_user['id'] if auth_user else None,
                auth_user['name'] if auth_user else 'Anonymous',
                auth_user['title'] if auth_user else 'Team Member',
                auth_user['avatar'] if auth_user else 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                data.get('recipient_name', 'Colleague'),
                data.get('recipient_role', 'Colleague'),
                data.get('badge', '🌟 Star Performer'),
                data.get('core_value', '#Teamwork'),
                data.get('message', '')
            ))
            new_id = cur.lastrowid
            if auth_user:
                log_audit(conn, auth_user['id'], auth_user['email'], 'KUDOS_SENT', f"Sent {data.get('badge', 'Kudos')} to {data.get('recipient_name')}", client_ip)
            kudo = dict(conn.execute("SELECT * FROM kudos WHERE id = ?", (new_id,)).fetchone())
            conn.commit()
            conn.close()
            return self.send_json(201, {"success": True, "kudo": kudo})

        elif path == '/api/calendar':
            auth_user = self.get_auth_user()
            data = self.read_json_body()
            conn = get_db()
            cur = conn.execute(
                "INSERT INTO calendar_events (title, event_date, event_time, platform, host_id, attendees, link) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (data.get('title'), data.get('event_date'), data.get('event_time'), data.get('platform', 'Google Meet'), auth_user['id'] if auth_user else None, data.get('attendees', 'Team'), data.get('link', '#'))
            )
            ev = dict(conn.execute("SELECT * FROM calendar_events WHERE id = ?", (cur.lastrowid,)).fetchone())
            conn.commit()
            conn.close()
            return self.send_json(201, {"success": True, "event": ev})

        elif path == '/api/admin/broadcast':
            auth_user = self.get_auth_user()
            if not auth_user or auth_user.get('role') != 'admin':
                return self.send_json(403, {"success": False, "message": "Admin privileges required"})
            data = self.read_json_body()
            conn = get_db()
            conn.execute("INSERT INTO system_announcements (author_id, title, message, priority) VALUES (?, ?, ?, ?)",
                         (auth_user['id'], data.get('title'), data.get('message'), data.get('priority', 'normal')))
            log_audit(conn, auth_user['id'], auth_user['email'], 'SYSTEM_BROADCAST', f"Broadcast announcement posted: {data.get('title')}", client_ip)
            conn.commit()
            conn.close()
            return self.send_json(201, {"success": True, "message": "Announcement broadcasted"})

        elif path.startswith('/api/'):
            return self.send_json(404, {"success": False, "message": "API endpoint not found"})

        return super().do_POST()

    def do_PUT(self):
        path = urlparse(self.path).path
        client_ip = self.client_address[0] if self.client_address else '127.0.0.1'

        if path == '/api/auth/profile':
            auth_user = self.get_auth_user()
            if not auth_user:
                return self.send_json(401, {"success": False, "message": "Unauthorized session"})
            data = self.read_json_body()
            is_admin = auth_user.get('role') == 'admin'
            name = data.get('name').strip() if is_admin and data.get('name') else auth_user['name']
            title = data.get('title').strip() if is_admin and data.get('title') else auth_user['title']
            dept = data.get('department').strip() if is_admin and data.get('department') else auth_user['department']
            status = data.get('status') or auth_user['status']
            conn = get_db()
            conn.execute("UPDATE users SET name = ?, title = ?, department = ?, status = ? WHERE id = ?", (name, title, dept, status, auth_user['id']))
            log_audit(conn, auth_user['id'], auth_user['email'], 'PROFILE_UPDATED', f"{name} updated availability status to {status}", client_ip)
            updated = dict(conn.execute("SELECT id, name, email, role, department, title, avatar, status, retention_risk FROM users WHERE id = ?", (auth_user['id'],)).fetchone())
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "user": updated})

        elif path == '/api/auth/password':
            auth_user = self.get_auth_user()
            if not auth_user:
                return self.send_json(401, {"success": False, "message": "Unauthorized session"})
            data = self.read_json_body()
            cur_pw = data.get('currentPassword') or ''
            new_pw = data.get('newPassword') or ''
            if not cur_pw or len(new_pw) < 6:
                return self.send_json(400, {"success": False, "message": "Current password and a new password (min 6 chars) are required."})
            conn = get_db()
            full_user = conn.execute("SELECT * FROM users WHERE id = ?", (auth_user['id'],)).fetchone()
            if not full_user or not verify_pw(cur_pw, full_user['password_hash'], full_user['salt']):
                conn.close()
                return self.send_json(401, {"success": False, "message": "Current password is incorrect."})
            pw_hash, salt = hash_pw(new_pw)
            conn.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", (pw_hash, salt, auth_user['id']))
            log_audit(conn, auth_user['id'], auth_user['email'], 'PASSWORD_CHANGED', 'User changed account password', client_ip)
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "message": "Password updated successfully."})

        elif path == '/api/settings':
            auth_user = self.get_auth_user()
            if not auth_user:
                return self.send_json(401, {"success": False, "message": "Unauthorized session"})
            data = self.read_json_body()
            settings_obj = data.get('settings') or {}
            conn = get_db()
            conn.execute("""
                INSERT INTO user_settings (user_id, settings_json, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = CURRENT_TIMESTAMP
            """, (auth_user['id'], json.dumps(settings_obj)))
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "settings": settings_obj})

        elif re.match(r'^/api/users/\d+/role$', path):
            auth_user = self.get_auth_user()
            if not auth_user or auth_user.get('role') != 'admin':
                return self.send_json(403, {"success": False, "message": "Admin privileges required"})
            tid = int(path.split('/')[3])
            role = (self.read_json_body()).get('role')
            if role not in ('admin', 'employee', 'hr_manager'):
                return self.send_json(400, {"success": False, "message": "Invalid role specified"})
            conn = get_db()
            conn.execute("UPDATE users SET role = ? WHERE id = ?", (role, tid))
            log_audit(conn, auth_user['id'], auth_user['email'], 'ROLE_CHANGED', f"Changed user {tid} role to {role}", client_ip)
            updated = dict(conn.execute("SELECT id, name, email, role, department, title, avatar, status, retention_risk FROM users WHERE id = ?", (tid,)).fetchone())
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "user": updated})

        elif re.match(r'^/api/users/\d+/password$', path):
            auth_user = self.get_auth_user()
            if not auth_user or auth_user.get('role') != 'admin':
                return self.send_json(403, {"success": False, "message": "Admin privileges required"})
            tid = int(path.split('/')[3])
            pw = (self.read_json_body()).get('password') or ''
            if len(pw) < 6:
                return self.send_json(400, {"success": False, "message": "New password must be at least 6 characters"})
            conn = get_db()
            target = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (tid,)).fetchone()
            if not target:
                conn.close()
                return self.send_json(404, {"success": False, "message": "User not found"})
            pw_hash, salt = hash_pw(pw)
            conn.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", (pw_hash, salt, tid))
            log_audit(conn, auth_user['id'], auth_user['email'], 'ADMIN_PASSWORD_RESET', f"Admin set new password for {target['email']}", client_ip)
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "message": f"Password updated for {target['name']}"})

        elif re.match(r'^/api/users/\d+$', path):
            auth_user = self.get_auth_user()
            if not auth_user or auth_user.get('role') != 'admin':
                return self.send_json(403, {"success": False, "message": "Admin privileges required"})
            tid = int(path.split('/')[3])
            data = self.read_json_body()
            conn = get_db()
            target = conn.execute("SELECT * FROM users WHERE id = ?", (tid,)).fetchone()
            if not target:
                conn.close()
                return self.send_json(404, {"success": False, "message": "User not found"})
            conn.execute(
                "UPDATE users SET name = ?, department = ?, title = ?, status = ?, retention_risk = ? WHERE id = ?",
                (
                    data.get('name', target['name']).strip(),
                    data.get('department', target['department']).strip(),
                    data.get('title', target['title']).strip(),
                    data.get('status', target['status']).strip(),
                    float(data.get('retention_risk', target['retention_risk'])),
                    tid
                )
            )
            log_audit(conn, auth_user['id'], auth_user['email'], 'USER_UPDATED', f"Admin updated user {target['email']} (ID {tid})", client_ip)
            updated = dict(conn.execute("SELECT id, name, email, role, department, title, avatar, status, retention_risk FROM users WHERE id = ?", (tid,)).fetchone())
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "user": updated})

        elif re.match(r'^/api/surveys/\d+$', path):
            auth_user = self.get_auth_user()
            if not auth_user or auth_user.get('role') != 'admin':
                return self.send_json(403, {"success": False, "message": "Admin privileges required"})
            sid = int(path.split('/')[3])
            status = (self.read_json_body()).get('status')
            if status not in ('Active', 'Closed', 'Draft'):
                return self.send_json(400, {"success": False, "message": "Invalid survey status"})
            conn = get_db()
            conn.execute("UPDATE surveys SET status = ? WHERE id = ?", (status, sid))
            log_audit(conn, auth_user['id'], auth_user['email'], 'SURVEY_UPDATED', f"Updated survey {sid} status to {status}", client_ip)
            survey = dict(conn.execute("SELECT * FROM surveys WHERE id = ?", (sid,)).fetchone())
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "survey": survey})

        return self.send_json(404, {"success": False, "message": "API endpoint not found"})

    def do_DELETE(self):
        path = urlparse(self.path).path
        client_ip = self.client_address[0] if self.client_address else '127.0.0.1'
        auth_user = self.get_auth_user()
        if not auth_user or auth_user.get('role') != 'admin':
            return self.send_json(403, {"success": False, "message": "Admin privileges required"})

        if re.match(r'^/api/users/\d+$', path):
            tid = int(path.split('/')[3])
            if tid == auth_user['id']:
                return self.send_json(400, {"success": False, "message": "Cannot delete your own active admin account"})
            conn = get_db()
            conn.execute("DELETE FROM users WHERE id = ?", (tid,))
            log_audit(conn, auth_user['id'], auth_user['email'], 'USER_DELETED', f"Deleted user ID {tid}", client_ip)
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "message": "User deleted"})

        elif re.match(r'^/api/surveys/\d+$', path):
            sid = int(path.split('/')[3])
            conn = get_db()
            conn.execute("DELETE FROM surveys WHERE id = ?", (sid,))
            log_audit(conn, auth_user['id'], auth_user['email'], 'SURVEY_DELETED', f"Deleted survey ID {sid}", client_ip)
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "message": "Survey deleted"})

        elif re.match(r'^/api/announcements/\d+$', path):
            aid = int(path.split('/')[3])
            conn = get_db()
            conn.execute("DELETE FROM system_announcements WHERE id = ?", (aid,))
            log_audit(conn, auth_user['id'], auth_user['email'], 'ANNOUNCEMENT_DELETED', f"Deleted announcement ID {aid}", client_ip)
            conn.commit()
            conn.close()
            return self.send_json(200, {"success": True, "message": "Announcement removed"})

        return self.send_json(404, {"success": False, "message": "API endpoint not found"})

    def do_GET(self):
        path = urlparse(self.path).path

        if path == '/api/auth/me':
            user = self.get_auth_user()
            if not user:
                return self.send_json(401, {"success": False, "message": "Unauthorized"})
            return self.send_json(200, {"success": True, "user": user})

        elif path == '/api/settings':
            user = self.get_auth_user()
            if not user:
                return self.send_json(401, {"success": False, "message": "Unauthorized"})
            conn = get_db()
            row = conn.execute("SELECT settings_json FROM user_settings WHERE user_id = ?", (user['id'],)).fetchone()
            conn.close()
            return self.send_json(200, {"success": True, "settings": json.loads(row['settings_json']) if row else {}})

        elif path == '/api/users':
            conn = get_db()
            rows = conn.execute("SELECT id, name, email, role, department, title, avatar, status, retention_risk, created_at FROM users ORDER BY name ASC").fetchall()
            users = [dict(r) for r in rows]
            conn.close()
            return self.send_json(200, {"success": True, "users": users})

        elif path == '/api/surveys':
            conn = get_db()
            surveys = [dict(r) for r in conn.execute("SELECT * FROM surveys ORDER BY id DESC").fetchall()]
            conn.close()
            return self.send_json(200, {"success": True, "surveys": surveys})

        elif path == '/api/kudos':
            conn = get_db()
            rows = conn.execute("SELECT * FROM kudos ORDER BY id DESC LIMIT 50").fetchall()
            kudos = []
            for r in rows:
                d = dict(r)
                try:
                    d['reactions'] = json.loads(d['reactions'] or '{}')
                except Exception:
                    d['reactions'] = {}
                kudos.append(d)
            conn.close()
            return self.send_json(200, {"success": True, "kudos": kudos})

        elif path == '/api/calendar':
            conn = get_db()
            events = [dict(r) for r in conn.execute("SELECT * FROM calendar_events ORDER BY event_date ASC").fetchall()]
            conn.close()
            return self.send_json(200, {"success": True, "events": events})

        elif path == '/api/announcements':
            conn = get_db()
            anns = [dict(r) for r in conn.execute("""
                SELECT a.*, u.name as author_name FROM system_announcements a
                LEFT JOIN users u ON a.author_id = u.id
                ORDER BY a.id DESC LIMIT 10
            """).fetchall()]
            conn.close()
            return self.send_json(200, {"success": True, "announcements": anns})

        elif path == '/api/admin/stats':
            auth_user = self.get_auth_user()
            if not auth_user or auth_user.get('role') != 'admin':
                return self.send_json(403, {"success": False, "message": "Admin privileges required"})
            conn = get_db()
            total_users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()['c']
            admin_count = conn.execute("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").fetchone()['c']
            emp_count = conn.execute("SELECT COUNT(*) as c FROM users WHERE role != 'admin'").fetchone()['c']
            surveys = conn.execute("SELECT COUNT(*) as c FROM surveys WHERE status = 'Active'").fetchone()['c']
            total_surveys = conn.execute("SELECT COUNT(*) as c FROM surveys").fetchone()['c']
            total_resp = conn.execute("SELECT COUNT(*) as c FROM survey_responses").fetchone()['c']
            kudos = conn.execute("SELECT COUNT(*) as c FROM kudos").fetchone()['c']
            meetings = conn.execute("SELECT COUNT(*) as c FROM calendar_events").fetchone()['c']
            audits = conn.execute("SELECT COUNT(*) as c FROM audit_logs").fetchone()['c']
            dept_breakdown = [dict(r) for r in conn.execute("SELECT department, COUNT(*) as count FROM users GROUP BY department ORDER BY count DESC").fetchall()]
            recent_audits = [dict(r) for r in conn.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 8").fetchall()]
            conn.close()
            return self.send_json(200, {
                "success": True,
                "stats": {
                    "totalUsers": total_users,
                    "adminCount": admin_count,
                    "employeeCount": emp_count,
                    "activeSurveys": surveys,
                    "totalSurveys": total_surveys,
                    "totalSurveyResponses": total_resp,
                    "totalKudos": kudos,
                    "totalMeetings": meetings,
                    "totalAuditEvents": audits,
                    "departmentBreakdown": dept_breakdown,
                    "recentAudits": recent_audits
                }
            })

        elif path == '/api/admin/audit-logs':
            auth_user = self.get_auth_user()
            if not auth_user or auth_user.get('role') != 'admin':
                return self.send_json(403, {"success": False, "message": "Admin privileges required"})
            conn = get_db()
            logs = [dict(r) for r in conn.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100").fetchall()]
            conn.close()
            return self.send_json(200, {"success": True, "logs": logs})

        elif path.startswith('/api/'):
            return self.send_json(404, {"success": False, "message": "API endpoint not found"})

        return super().do_GET()


def main():
    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    socketserver.TCPServer.allow_reuse_address = True
    server_address = ("", port)
    try:
        with socketserver.TCPServer(server_address, HumanlyAPIHandler) as httpd:
            url = f"http://localhost:{port}"
            print("=" * 68)
            print("🌟 HUMANLY - Production HTTP & REST API Server (Python)")
            print(f"📍 Server running at: {url}")
            print(f"💾 Database connected: {DB_PATH}")
            print("=" * 68)
            httpd.serve_forever()
    except OSError as e:
        if e.errno in (48, 98, 10048):
            print(f"⚠️ Port {port} is occupied. Retrying with port {port + 1}...")
            sys.argv[1] = str(port + 1)
            main()
        else:
            raise e


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
HUMANLY - Production HTTP & REST API Server (Python Edition)
Lightweight HTTP server with SQLite database integration, JWT/Session validation,
and REST endpoints for Authentication, RBAC, and System Telemetry.
"""

import http.server
import socketserver
import os
import sys
import json
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlparse

PORT = 8080
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
    return conn

def verify_pw(password, stored_hash, salt):
    test_hash = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), bytes.fromhex(salt), 100000).hex()
    return secrets.compare_digest(stored_hash, test_hash)

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
        cur = conn.cursor()
        cur.execute("""
            SELECT u.id, u.name, u.email, u.role, u.department, u.title, u.avatar, u.status
            FROM sessions s JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
        """, (token,))
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else None

    def read_json_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length == 0:
            return {}
        data = self.rfile.read(length)
        return json.loads(data.decode('utf-8'))

    def do_POST(self):
        url = urlparse(self.path)
        path = url.path

        if path == '/api/auth/login':
            data = self.read_json_body()
            email = data.get('email', '').strip()
            password = data.get('password', '')

            conn = get_db()
            cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email,))
            user = cur.fetchone()

            if not user or not verify_pw(password, user['password_hash'], user['salt']):
                conn.close()
                return self.send_json(401, {"success": False, "message": "Invalid email or password"})

            token = secrets.token_hex(32)
            expires = (datetime.now() + timedelta(days=2)).isoformat()
            cur.execute("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", (token, user['id'], expires))
            cur.execute("INSERT INTO audit_logs (user_id, user_email, action, details) VALUES (?, ?, ?, ?)",
                        (user['id'], user['email'], 'LOGIN_SUCCESS', f"Authenticated via Python Server. Role: {user['role']}"))
            conn.commit()
            conn.close()

            safe_user = {
                "id": user['id'],
                "name": user['name'],
                "email": user['email'],
                "role": user['role'],
                "department": user['department'],
                "title": user['title'],
                "avatar": user['avatar'],
                "status": user['status']
            }
            return self.send_json(200, {"success": True, "token": token, "expiresAt": expires, "user": safe_user})

        elif path == '/api/auth/logout':
            auth = self.headers.get('Authorization', '')
            if auth.startswith('Bearer '):
                token = auth[7:].strip()
                conn = get_db()
                conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
                conn.commit()
                conn.close()
            return self.send_json(200, {"success": True, "message": "Session invalidated"})

        elif path == '/api/kudos':
            auth_user = self.get_auth_user()
            data = self.read_json_body()
            conn = get_db()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO kudos (sender_id, sender_name, sender_role, sender_avatar, recipient_name, recipient_role, badge, core_value, message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                auth_user['id'] if auth_user else None,
                auth_user['name'] if auth_user else 'Anonymous',
                auth_user['title'] if auth_user else 'Team Member',
                auth_user['avatar'] if auth_user else 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                data.get('recipient_name', 'Colleague'),
                data.get('recipient_role', 'Team'),
                data.get('badge', '🌟 Star'),
                data.get('core_value', '#Teamwork'),
                data.get('message', '')
            ))
            new_id = cur.lastrowid
            conn.commit()
            conn.close()
            return self.send_json(201, {"success": True, "id": new_id})

        elif path == '/api/admin/broadcast':
            auth_user = self.get_auth_user()
            if not auth_user or auth_user.get('role') != 'admin':
                return self.send_json(403, {"success": False, "message": "Admin privileges required"})
            data = self.read_json_body()
            conn = get_db()
            conn.execute("INSERT INTO system_announcements (author_id, title, message, priority) VALUES (?, ?, ?, ?)",
                         (auth_user['id'], data.get('title'), data.get('message'), data.get('priority', 'normal')))
            conn.commit()
            conn.close()
            return self.send_json(201, {"success": True, "message": "Broadcast sent"})

        elif path.startswith('/api/'):
            return self.send_json(404, {"success": False, "message": "API endpoint not found"})

        return super().do_POST()

    def do_GET(self):
        url = urlparse(self.path)
        path = url.path

        if path == '/api/auth/me':
            user = self.get_auth_user()
            if not user:
                return self.send_json(401, {"success": False, "message": "Unauthorized"})
            return self.send_json(200, {"success": True, "user": user})

        elif path == '/api/users':
            conn = get_db()
            rows = conn.execute("SELECT id, name, email, role, department, title, avatar, status, retention_risk FROM users ORDER BY name ASC").fetchall()
            users = [dict(r) for r in rows]
            conn.close()
            return self.send_json(200, {"success": True, "users": users})

        elif path == '/api/surveys':
            conn = get_db()
            rows = conn.execute("SELECT * FROM surveys ORDER BY id DESC").fetchall()
            surveys = [dict(r) for r in rows]
            conn.close()
            return self.send_json(200, {"success": True, "surveys": surveys})

        elif path == '/api/kudos':
            conn = get_db()
            rows = conn.execute("SELECT * FROM kudos ORDER BY id DESC LIMIT 50").fetchall()
            kudos = []
            for r in rows:
                d = dict(r)
                try:
                    d['reactions'] = json.loads(d['reactions'])
                except Exception:
                    d['reactions'] = {}
                kudos.append(d)
            conn.close()
            return self.send_json(200, {"success": True, "kudos": kudos})

        elif path == '/api/calendar':
            conn = get_db()
            rows = conn.execute("SELECT * FROM calendar_events ORDER BY event_date ASC").fetchall()
            events = [dict(r) for r in rows]
            conn.close()
            return self.send_json(200, {"success": True, "events": events})

        elif path == '/api/admin/stats':
            auth_user = self.get_auth_user()
            if not auth_user or auth_user.get('role') != 'admin':
                return self.send_json(403, {"success": False, "message": "Admin privileges required"})
            conn = get_db()
            total_users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()['c']
            admin_count = conn.execute("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").fetchone()['c']
            emp_count = conn.execute("SELECT COUNT(*) as c FROM users WHERE role = 'employee'").fetchone()['c']
            surveys = conn.execute("SELECT COUNT(*) as c FROM surveys WHERE status = 'Active'").fetchone()['c']
            kudos = conn.execute("SELECT COUNT(*) as c FROM kudos").fetchone()['c']
            meetings = conn.execute("SELECT COUNT(*) as c FROM calendar_events").fetchone()['c']
            audits = conn.execute("SELECT COUNT(*) as c FROM audit_logs").fetchone()['c']
            recent_audits = [dict(r) for r in conn.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 8").fetchall()]
            conn.close()
            return self.send_json(200, {
                "success": True,
                "stats": {
                    "totalUsers": total_users,
                    "adminCount": admin_count,
                    "employeeCount": emp_count,
                    "activeSurveys": surveys,
                    "totalKudos": kudos,
                    "totalMeetings": meetings,
                    "totalAuditEvents": audits,
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

    server_address = ("", port)
    try:
        with socketserver.TCPServer(server_address, HumanlyAPIHandler) as httpd:
            url = f"http://localhost:{port}"
            print("=" * 68)
            print("🌟 HUMANLY - Production HTTP & REST API Server (Python)")
            print(f"📍 Server running at: {url}")
            print(f"📁 Serving directory: {PROJECT_ROOT}")
            print(f"💾 Database connected: {DB_PATH}")
            print("🛡️ Production APIs: /api/auth/*, /api/admin/*")
            print("⚡ Press Ctrl+C to stop")
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

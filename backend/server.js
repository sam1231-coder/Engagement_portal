/**
 * HUMANLY - Production HTTP & REST API Server
 * Built with Node.js native HTTP server and SQLite database engine.
 * Provides full REST APIs for Authentication, RBAC, Surveys, Kudos, Calendar,
 * and Administrative Telemetry, while serving client-side assets.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db.js');

const PORT = process.env.PORT || 8080;
const ROOT = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT, 'web');
const HTML_DIR = path.join(WEB_DIR, 'html');
const CSS_DIR = path.join(WEB_DIR, 'css');
const JS_DIR = path.join(WEB_DIR, 'js');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        // 5MB safeguard
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return db.validateSession(token);
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const clientIp = req.socket.remoteAddress || '127.0.0.1';

  // =========================================================================
  // REST API ROUTING (/api/*)
  // =========================================================================
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Auth: Login
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const { email, password } = await parseJSONBody(req);
        if (!email || !password) {
          return sendJSON(res, 400, { success: false, message: 'Email and password required' });
        }

        const user = db.findUserByEmail(email.trim());
        if (!user || !db.verifyPassword(password, user.password_hash, user.salt)) {
          db.logAudit(user ? user.id : null, email, 'LOGIN_FAILED', 'Invalid password or unverified account attempt', clientIp);
          return sendJSON(res, 401, { success: false, message: 'Invalid credentials. Please verify your work email and password.' });
        }

        const session = db.createSession(user.id);
        db.logAudit(user.id, user.email, 'LOGIN_SUCCESS', `Authenticated via database credentials. Role: ${user.role}`, clientIp);

        const safeUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          title: user.title,
          avatar: user.avatar,
          status: user.status
        };

        const userSettings = db.getUserSettings(user.id) || {};

        return sendJSON(res, 200, {
          success: true,
          token: session.token,
          expiresAt: session.expiresAt,
          user: safeUser,
          settings: userSettings
        });
      }

      // 2. Auth: Register New Account
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const { name, email, password, role = 'employee', department = 'General', title = 'Team Member' } = await parseJSONBody(req);
        if (!name || !email || !password) {
          return sendJSON(res, 400, { success: false, message: 'Name, email, and password required' });
        }

        const existing = db.findUserByEmail(email.trim());
        if (existing) {
          return sendJSON(res, 409, { success: false, message: 'An account with this email already exists.' });
        }

        const newUser = db.createUser({
          name: name.trim(),
          email: email.trim(),
          password,
          role: role === 'admin' ? 'admin' : 'employee',
          department: department.trim(),
          title: title.trim()
        });

        const session = db.createSession(newUser.id);
        db.logAudit(newUser.id, newUser.email, 'USER_REGISTERED', `New account created in database. Assigned role: ${newUser.role}`, clientIp);

        return sendJSON(res, 201, {
          success: true,
          message: 'Account registered successfully',
          token: session.token,
          user: newUser
        });
      }

      // 3. Auth: Current User Profile (Me)
      if (pathname === '/api/auth/me' && req.method === 'GET') {
        const user = getAuthUser(req);
        if (!user) {
          return sendJSON(res, 401, { success: false, message: 'Unauthorized session' });
        }
        return sendJSON(res, 200, { success: true, user });
      }

      // 3b. Auth: Update Own Profile (Employees can only update Status; Admins can also update Name/Title/Dept)
      if (pathname === '/api/auth/profile' && req.method === 'PUT') {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJSON(res, 401, { success: false, message: 'Unauthorized session' });
        }
        const data = await parseJSONBody(req);
        const isAdmin = authUser.role === 'admin';
        const updated = db.updateUser(authUser.id, {
          name: isAdmin && data.name ? data.name.trim() : authUser.name,
          title: isAdmin && data.title ? data.title.trim() : authUser.title,
          department: isAdmin && data.department ? data.department.trim() : authUser.department,
          status: data.status || authUser.status
        });
        db.logAudit(authUser.id, authUser.email, 'PROFILE_UPDATED', `${updated.name} updated availability status to ${updated.status}`, clientIp);
        return sendJSON(res, 200, { success: true, user: updated });
      }

      // 3c. Auth: Change Own Password
      if (pathname === '/api/auth/password' && req.method === 'PUT') {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJSON(res, 401, { success: false, message: 'Unauthorized session' });
        }
        const { currentPassword, newPassword } = await parseJSONBody(req);
        if (!currentPassword || !newPassword || newPassword.length < 6) {
          return sendJSON(res, 400, { success: false, message: 'Current password and a new password (min 6 chars) are required.' });
        }
        const fullUser = db.findUserByEmail(authUser.email);
        if (!fullUser || !db.verifyPassword(currentPassword, fullUser.password_hash, fullUser.salt)) {
          return sendJSON(res, 401, { success: false, message: 'Current password is incorrect.' });
        }
        db.updateUserPassword(authUser.id, newPassword);
        db.logAudit(authUser.id, authUser.email, 'PASSWORD_CHANGED', 'User changed account password', clientIp);
        return sendJSON(res, 200, { success: true, message: 'Password updated successfully.' });
      }

      // 3d. User Settings (Persistent across reloads & relogins)
      if (pathname === '/api/settings' && req.method === 'GET') {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJSON(res, 401, { success: false, message: 'Unauthorized session' });
        }
        const settings = db.getUserSettings(authUser.id) || {};
        return sendJSON(res, 200, { success: true, settings });
      }

      if (pathname === '/api/settings' && req.method === 'PUT') {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJSON(res, 401, { success: false, message: 'Unauthorized session' });
        }
        const { settings } = await parseJSONBody(req);
        const saved = db.saveUserSettings(authUser.id, settings || {});
        return sendJSON(res, 200, { success: true, settings: saved });
      }

      // 4. Auth: Logout
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const u = db.validateSession(token);
          if (u) {
            db.logAudit(u.id, u.email, 'USER_LOGOUT', `User signed out (${u.role})`, clientIp);
          }
          db.deleteSession(token);
        }
        return sendJSON(res, 200, { success: true, message: 'Session logged out' });
      }

      // 4b. Real-time Employee Activity Audit Tracking
      if (pathname === '/api/audit/activity' && req.method === 'POST') {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJSON(res, 401, { success: false, message: 'Unauthorized session' });
        }
        const { action = 'PAGE_VIEW', details = '' } = await parseJSONBody(req);
        db.logAudit(authUser.id, authUser.email, String(action).slice(0, 60), String(details).slice(0, 300), clientIp);
        return sendJSON(res, 201, { success: true });
      }

      // 5. Users List
      if (pathname === '/api/users' && req.method === 'GET') {
        const users = db.listUsers();
        return sendJSON(res, 200, { success: true, users });
      }

      // 6. Admin: Create User
      if (pathname === '/api/users' && req.method === 'POST') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required' });
        }

        const data = await parseJSONBody(req);
        if (!data.name || !data.email || !data.password) {
          return sendJSON(res, 400, { success: false, message: 'Name, email, and password required' });
        }
        if (data.password.length < 6) {
          return sendJSON(res, 400, { success: false, message: 'Password must be at least 6 characters' });
        }

        const existing = db.findUserByEmail(data.email.trim());
        if (existing) {
          return sendJSON(res, 409, { success: false, message: 'A user with this email already exists' });
        }

        const newUser = db.createUser({
          name: data.name.trim(),
          email: data.email.trim(),
          password: data.password,
          role: ['admin', 'employee', 'hr_manager'].includes(data.role) ? data.role : 'employee',
          department: (data.department || 'General').trim(),
          title: (data.title || 'Team Member').trim(),
          avatar: data.avatar || ''
        });
        db.logAudit(authUser.id, authUser.email, 'USER_CREATED_BY_ADMIN', `Admin created user ${newUser.email} with role ${newUser.role}`, clientIp);
        return sendJSON(res, 201, { success: true, user: newUser });
      }

      // 6b. Admin: Update User Details
      if (pathname.match(/^\/api\/users\/\d+$/) && req.method === 'PUT') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required' });
        }

        const targetId = parseInt(pathname.split('/')[3], 10);
        const target = db.findUserById(targetId);
        if (!target) {
          return sendJSON(res, 404, { success: false, message: 'User not found' });
        }

        const data = await parseJSONBody(req);
        const updated = db.updateUser(targetId, {
          name: data.name ? data.name.trim() : undefined,
          department: data.department ? data.department.trim() : undefined,
          title: data.title ? data.title.trim() : undefined,
          role: ['admin', 'employee', 'hr_manager'].includes(data.role) ? data.role : undefined,
          status: data.status ? data.status.trim() : undefined,
          retention_risk: data.retention_risk !== undefined ? Number(data.retention_risk) : undefined
        });
        db.logAudit(authUser.id, authUser.email, 'USER_UPDATED', `Admin updated user ${updated.email} (ID ${targetId})`, clientIp);
        return sendJSON(res, 200, { success: true, user: updated });
      }

      // 6c. Admin: Reset / Give User Password
      if (pathname.match(/^\/api\/users\/\d+\/password$/) && req.method === 'PUT') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required' });
        }

        const targetId = parseInt(pathname.split('/')[3], 10);
        const target = db.findUserById(targetId);
        if (!target) {
          return sendJSON(res, 404, { success: false, message: 'User not found' });
        }

        const { password } = await parseJSONBody(req);
        if (!password || password.length < 6) {
          return sendJSON(res, 400, { success: false, message: 'New password must be at least 6 characters' });
        }

        db.updateUserPassword(targetId, password);
        db.logAudit(authUser.id, authUser.email, 'ADMIN_PASSWORD_RESET', `Admin set new password for ${target.email}`, clientIp);
        return sendJSON(res, 200, { success: true, message: `Password updated for ${target.name}` });
      }

      // 7. Admin: Update User Role
      if (pathname.match(/^\/api\/users\/\d+\/role$/) && req.method === 'PUT') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required' });
        }

        const targetId = parseInt(pathname.split('/')[3], 10);
        const { role } = await parseJSONBody(req);
        if (!['admin', 'employee', 'hr_manager'].includes(role)) {
          return sendJSON(res, 400, { success: false, message: 'Invalid role specified' });
        }

        const updated = db.updateUserRole(targetId, role);
        db.logAudit(authUser.id, authUser.email, 'ROLE_CHANGED', `Changed user ${targetId} role to ${role}`, clientIp);
        return sendJSON(res, 200, { success: true, user: updated });
      }

      // 8. Admin: Delete User
      if (pathname.match(/^\/api\/users\/\d+$/) && req.method === 'DELETE') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required' });
        }

        const targetId = parseInt(pathname.split('/')[3], 10);
        if (targetId === authUser.id) {
          return sendJSON(res, 400, { success: false, message: 'Cannot delete your own active admin account' });
        }
        db.deleteUser(targetId);
        db.logAudit(authUser.id, authUser.email, 'USER_DELETED', `Deleted user ID ${targetId}`, clientIp);
        return sendJSON(res, 200, { success: true, message: 'User deleted' });
      }

      // 9. Surveys
      if (pathname === '/api/surveys' && req.method === 'GET') {
        const surveys = db.listSurveys();
        return sendJSON(res, 200, { success: true, surveys });
      }

      if (pathname === '/api/surveys' && req.method === 'POST') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required to launch surveys' });
        }

        const surveyData = await parseJSONBody(req);
        const created = db.createSurvey(surveyData);
        db.logAudit(authUser.id, authUser.email, 'SURVEY_CREATED', `Launched survey: ${created.title}`, clientIp);
        return sendJSON(res, 201, { success: true, survey: created });
      }

      if (pathname.match(/^\/api\/surveys\/\d+\/respond$/) && req.method === 'POST') {
        const surveyId = parseInt(pathname.split('/')[3], 10);
        const authUser = getAuthUser(req);
        const { rating, balanceScore, comments } = await parseJSONBody(req);
        db.saveSurveyResponse(surveyId, authUser ? authUser.id : null, rating || 5, balanceScore || 8, comments || '');
        if (authUser) {
          db.logAudit(authUser.id, authUser.email, 'SURVEY_RESPONSE', `Submitted response to survey #${surveyId} (rating ${rating || 5}/5)`, clientIp);
        }
        return sendJSON(res, 200, { success: true, message: 'Response recorded in database' });
      }

      if (pathname.match(/^\/api\/surveys\/\d+$/) && req.method === 'PUT') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required' });
        }
        const surveyId = parseInt(pathname.split('/')[3], 10);
        const { status } = await parseJSONBody(req);
        if (!['Active', 'Closed', 'Draft'].includes(status)) {
          return sendJSON(res, 400, { success: false, message: 'Invalid survey status' });
        }
        const updated = db.updateSurveyStatus(surveyId, status);
        db.logAudit(authUser.id, authUser.email, 'SURVEY_UPDATED', `Updated survey ${surveyId} status to ${status}`, clientIp);
        return sendJSON(res, 200, { success: true, survey: updated });
      }

      if (pathname.match(/^\/api\/surveys\/\d+$/) && req.method === 'DELETE') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required' });
        }
        const surveyId = parseInt(pathname.split('/')[3], 10);
        db.deleteSurvey(surveyId);
        db.logAudit(authUser.id, authUser.email, 'SURVEY_DELETED', `Deleted survey ID ${surveyId}`, clientIp);
        return sendJSON(res, 200, { success: true, message: 'Survey deleted' });
      }

      // 10. Kudos Feed
      if (pathname === '/api/kudos' && req.method === 'GET') {
        const kudos = db.listKudos(50);
        return sendJSON(res, 200, { success: true, kudos });
      }

      if (pathname === '/api/kudos' && req.method === 'POST') {
        const authUser = getAuthUser(req);
        const kudoData = await parseJSONBody(req);
        const newKudo = db.createKudo({
          sender_id: authUser ? authUser.id : null,
          sender_name: authUser ? authUser.name : (kudoData.sender_name || 'Anonymous'),
          sender_role: authUser ? authUser.title : 'Team Member',
          sender_avatar: authUser ? authUser.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
          recipient_name: kudoData.recipient_name,
          recipient_role: kudoData.recipient_role || 'Colleague',
          badge: kudoData.badge || '🌟 Star Performer',
          core_value: kudoData.core_value || '#Teamwork',
          message: kudoData.message
        });
        if (authUser) {
          db.logAudit(authUser.id, authUser.email, 'KUDOS_SENT', `Sent ${kudoData.badge || 'Kudos'} to ${kudoData.recipient_name}`, clientIp);
        }
        return sendJSON(res, 201, { success: true, kudo: newKudo });
      }

      // 11. Calendar Meetings
      if (pathname === '/api/calendar' && req.method === 'GET') {
        const events = db.listCalendarEvents();
        return sendJSON(res, 200, { success: true, events });
      }

      if (pathname === '/api/calendar' && req.method === 'POST') {
        const authUser = getAuthUser(req);
        const eventData = await parseJSONBody(req);
        const newEvent = db.createCalendarEvent({
          ...eventData,
          host_id: authUser ? authUser.id : null
        });
        return sendJSON(res, 201, { success: true, event: newEvent });
      }

      // 12. Admin Stats & Audit Logs
      if (pathname === '/api/admin/stats' && req.method === 'GET') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required' });
        }
        const stats = db.getAdminStats();
        return sendJSON(res, 200, { success: true, stats });
      }

      if (pathname === '/api/admin/audit-logs' && req.method === 'GET') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required' });
        }
        const logs = db.listAuditLogs(100);
        return sendJSON(res, 200, { success: true, logs });
      }

      // 13. System Announcements
      if (pathname === '/api/admin/broadcast' && req.method === 'POST') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required' });
        }
        const { title, message, priority } = await parseJSONBody(req);
        db.createAnnouncement(authUser.id, title, message, priority);
        db.logAudit(authUser.id, authUser.email, 'SYSTEM_BROADCAST', `Broadcast announcement posted: ${title}`, clientIp);
        return sendJSON(res, 201, { success: true, message: 'Announcement broadcasted' });
      }

      if (pathname === '/api/announcements' && req.method === 'GET') {
        const announcements = db.listAnnouncements();
        return sendJSON(res, 200, { success: true, announcements });
      }

      if (pathname.match(/^\/api\/announcements\/\d+$/) && req.method === 'DELETE') {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'admin') {
          return sendJSON(res, 403, { success: false, message: 'Admin privileges required' });
        }
        const annId = parseInt(pathname.split('/')[3], 10);
        db.deleteAnnouncement(annId);
        db.logAudit(authUser.id, authUser.email, 'ANNOUNCEMENT_DELETED', `Deleted announcement ID ${annId}`, clientIp);
        return sendJSON(res, 200, { success: true, message: 'Announcement removed' });
      }

      return sendJSON(res, 404, { success: false, message: 'API route not found' });
    } catch (apiErr) {
      console.error('[API Error]', apiErr);
      return sendJSON(res, 500, { success: false, message: apiErr.message || 'Internal Server Error' });
    }
  }

  // =========================================================================
  // STATIC ASSETS SERVING
  // =========================================================================
  let reqPath = decodeURI(pathname);
  let filePath = null;

  if (reqPath === '/' || reqPath === '') {
    filePath = path.join(HTML_DIR, 'index.html');
  } else if (reqPath.startsWith('/css/')) {
    filePath = path.join(CSS_DIR, reqPath.slice(5));
  } else if (reqPath.startsWith('/js/')) {
    filePath = path.join(JS_DIR, reqPath.slice(4));
  } else if (reqPath.startsWith('/html/')) {
    filePath = path.join(HTML_DIR, reqPath.slice(6));
  } else if (reqPath.endsWith('.html')) {
    const candidate = path.join(HTML_DIR, path.basename(reqPath));
    filePath = fs.existsSync(candidate) ? candidate : path.join(ROOT, reqPath);
  } else {
    // Check web folder first, then ROOT
    const webCandidate = path.join(WEB_DIR, reqPath.replace(/^\//, ''));
    if (fs.existsSync(webCandidate)) {
      filePath = webCandidate;
    } else {
      filePath = path.join(ROOT, reqPath);
    }
  }

  // Security check: ensure path stays within ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('='.repeat(68));
  console.log('🌟 HUMANLY - People & Organizational Engagement Platform');
  console.log(`📍 Production Portal running at: http://localhost:${PORT}`);
  console.log(`💾 Connected Database: SQLite engine at ./humanly.db`);
  console.log('🛡️ Authentication & RBAC APIs active at /api/auth/*');
  console.log('📊 Admin Telemetry & Management APIs active at /api/admin/*');
  console.log('⚡ Press Ctrl+C to stop');
  console.log('='.repeat(68));
});

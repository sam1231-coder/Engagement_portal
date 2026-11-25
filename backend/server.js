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

        return sendJSON(res, 200, {
          success: true,
          token: session.token,
          expiresAt: session.expiresAt,
          user: safeUser
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

      // 4. Auth: Logout
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          db.deleteSession(authHeader.substring(7));
        }
        return sendJSON(res, 200, { success: true, message: 'Session logged out' });
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

        const newUser = db.createUser(data);
        db.logAudit(authUser.id, authUser.email, 'USER_CREATED_BY_ADMIN', `Admin created user ${newUser.email} with role ${newUser.role}`, clientIp);
        return sendJSON(res, 201, { success: true, user: newUser });
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
        return sendJSON(res, 200, { success: true, message: 'Response recorded in database' });
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

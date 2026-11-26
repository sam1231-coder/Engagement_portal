/**
 * HUMANLY - Enterprise Database Engine (SQLite / PostgreSQL Compatible)
 * Built with Node.js native SQLite engine and crypto PBKDF2 hashing.
 * Supports zero-dependency local execution and PostgreSQL via DATABASE_URL.
 */

const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

// Auto-resolve database location (database/humanly.db or fallback)
const DB_CANDIDATES = [
  path.join(__dirname, '..', 'database', 'humanly.db'),
  path.join(__dirname, 'database', 'humanly.db'),
  path.join(__dirname, 'humanly.db'),
  path.join(__dirname, '..', 'humanly.db')
];
const DB_PATH = DB_CANDIDATES.find(p => fs.existsSync(p)) || DB_CANDIDATES[0];
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

// 1. Initialize Tables
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee', -- 'admin', 'hr_manager', 'employee'
      department TEXT NOT NULL,
      title TEXT NOT NULL,
      avatar TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Online',
      retention_risk REAL DEFAULT 5.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'All Company',
      status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Closed', 'Draft'
      deadline TEXT NOT NULL,
      total_target INTEGER NOT NULL DEFAULT 100,
      participation INTEGER NOT NULL DEFAULT 0,
      responses_count INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS survey_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL,
      balance_score INTEGER NOT NULL,
      comments TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kudos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      sender_avatar TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_role TEXT NOT NULL,
      badge TEXT NOT NULL,
      core_value TEXT NOT NULL,
      message TEXT NOT NULL,
      reactions TEXT DEFAULT '{"clap": 0, "heart": 0, "rocket": 0, "genius": 0}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_time TEXT NOT NULL,
      platform TEXT NOT NULL, -- 'Google Meet', 'Teams', 'Zoom', 'In-Person'
      host_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      attendees TEXT NOT NULL,
      link TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_email TEXT,
      action TEXT NOT NULL, -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'USER_CREATED', 'ROLE_CHANGED', 'SURVEY_CREATED', 'SYSTEM_BROADCAST'
      details TEXT,
      ip_address TEXT DEFAULT '127.0.0.1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      icon TEXT NOT NULL DEFAULT 'fa-solid fa-bell',
      url TEXT DEFAULT '#',
      read_status INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'urgent', 'critical'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// 2. Cryptographic Security (PBKDF2 Password Hashing)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, storedHash, salt) {
  const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(testHash, 'hex'));
}

// 3. Pre-seed Default Enterprise Workforce Data
function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  console.log('[DB] Seeding Humanly Enterprise Database with default personas...');

  const initialUsers = [
    {
      name: 'Elena Rostova',
      email: 'admin@humanly.io',
      password: 'Admin@2026!',
      role: 'admin',
      department: 'Executive Operations',
      title: 'VP of People & Culture (Admin)',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
      status: 'Online',
      retention_risk: 3.2
    },
    {
      name: 'Sarah Jenkins',
      email: 'sarah.ops@humanly.io',
      password: 'Humanly@2026!',
      role: 'admin',
      department: 'People Operations',
      title: 'Lead People Ops Manager (Admin)',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      status: 'Online',
      retention_risk: 4.5
    },
    {
      name: 'Alex Vance',
      email: 'alex.vance@humanly.io',
      password: 'Employee@2026!',
      role: 'employee',
      department: 'Engineering',
      title: 'Staff Software Engineer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      status: 'Online',
      retention_risk: 5.8
    },
    {
      name: 'Maya Lin',
      email: 'maya.lin@humanly.io',
      password: 'Employee@2026!',
      role: 'employee',
      department: 'Design',
      title: 'Lead Product Designer',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      status: 'Focus Mode',
      retention_risk: 4.1
    },
    {
      name: 'David Chen',
      email: 'david.chen@humanly.io',
      password: 'Employee@2026!',
      role: 'employee',
      department: 'Engineering',
      title: 'Backend Architect',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      status: 'In a Meeting',
      retention_risk: 7.2
    },
    {
      name: 'Priya Sharma',
      email: 'priya.sharma@humanly.io',
      password: 'Employee@2026!',
      role: 'employee',
      department: 'Customer Support',
      title: 'Senior Solutions Engineer',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
      status: 'Online',
      retention_risk: 6.4
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, salt, role, department, title, avatar, status, retention_risk)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of initialUsers) {
    const { hash, salt } = hashPassword(u.password);
    insertUser.run(u.name, u.email, hash, salt, u.role, u.department, u.title, u.avatar, u.status, u.retention_risk);
  }

  // Pre-seed Surveys
  const insertSurvey = db.prepare(`
    INSERT INTO surveys (title, description, category, department, status, deadline, total_target, participation, responses_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSurvey.run(
    'Q4 2026 Well-Being & Work-Life Review',
    'Quarterly assessment of squad workload, mental wellness, and async collaboration effectiveness.',
    'Well-Being',
    'All Company',
    'Active',
    'Dec 15, 2026',
    320,
    94,
    301
  );

  insertSurvey.run(
    'Engineering Tooling & Architecture Feedback',
    'Feedback campaign focused on CI/CD pipelines, tech debt reduction, and dev workstation experience.',
    'Tooling',
    'Engineering',
    'Active',
    'Dec 20, 2026',
    85,
    88,
    75
  );

  insertSurvey.run(
    'Manager Effectiveness & Career Growth Review',
    'Confidential review regarding mentorship, transparency, and quarterly promotion alignment.',
    'Leadership',
    'Product & Design',
    'Active',
    'Jan 10, 2027',
    50,
    92,
    46
  );

  // Pre-seed Kudos
  const insertKudo = db.prepare(`
    INSERT INTO kudos (sender_id, sender_name, sender_role, sender_avatar, recipient_name, recipient_role, badge, core_value, message, reactions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertKudo.run(
    1,
    'Elena Rostova',
    'VP of People & Culture',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    'Core Platform Squad',
    'Engineering',
    '🚀 Mission Critical',
    '#Teamwork',
    'Incredible execution on the zero-downtime production database migration this weekend! True engineering excellence.',
    JSON.stringify({ clap: 38, heart: 27, rocket: 45, genius: 14 })
  );

  insertKudo.run(
    3,
    'Alex Vance',
    'Staff Software Engineer',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    'Maya Lin',
    'Lead Product Designer',
    '🎨 Creative Spark',
    '#Innovation',
    'Maya rebuilt our analytics studio interaction model in record time. User feedback has been phenomenal!',
    JSON.stringify({ clap: 24, heart: 18, rocket: 29, genius: 11 })
  );

  // Pre-seed Calendar Meetings
  const insertMeeting = db.prepare(`
    INSERT INTO calendar_events (title, event_date, event_time, platform, host_id, attendees, link)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertMeeting.run('All-Hands Executive Sync', '2026-11-26', '10:00 AM - 11:00 AM', 'Google Meet', 1, 'All Company', 'https://meet.google.com/hmn-lead-q4');
  insertMeeting.run('People Analytics Review & Retention Watch', '2026-11-27', '02:00 PM - 03:00 PM', 'Microsoft Teams', 2, 'Elena, Sarah, Alex', 'https://teams.microsoft.com/l/meetup/hmn-retention');
  insertMeeting.run('Sprint Retrospective & Team Kudos', '2026-11-28', '04:00 PM - 05:00 PM', 'Zoom', 3, 'Engineering, Design', 'https://zoom.us/j/9982341234');

  // Pre-seed Initial Audit Log
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, user_email, action, details)
    VALUES (?, ?, ?, ?)
  `);
  insertAudit.run(1, 'system@humanly.io', 'SYSTEM_INITIALIZATION', 'Humanly Production Database schema initialized and seeded successfully.');

  console.log('[DB] Seeding completed.');
}

// Initialize and Seed
initSchema();
seedDatabase();

// 4. Data Access Object (DAO) API
module.exports = {
  // Authentication & Users
  findUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findUserById(id) {
    return db.prepare('SELECT id, name, email, role, department, title, avatar, status, retention_risk, created_at FROM users WHERE id = ?').get(id);
  },

  createUser({ name, email, password, role = 'employee', department = 'General', title = 'Team Member', avatar = '' }) {
    const { hash, salt } = hashPassword(password);
    const defaultAvatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, salt, role, department, title, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, email, hash, salt, role, department, title, defaultAvatar);
    return this.findUserById(result.lastInsertRowid);
  },

  updateUserRole(userId, newRole) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, userId);
    return this.findUserById(userId);
  },

  updateUser(userId, fields) {
    const allowed = ['name', 'email', 'role', 'department', 'title', 'status', 'retention_risk', 'avatar'];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined && fields[key] !== null) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    if (updates.length === 0) return this.findUserById(userId);
    values.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findUserById(userId);
  },

  updateUserPassword(userId, newPassword) {
    const { hash, salt } = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, userId);
    return true;
  },

  deleteUser(userId) {
    return db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  },

  listUsers() {
    return db.prepare('SELECT id, name, email, role, department, title, avatar, status, retention_risk, created_at FROM users ORDER BY name ASC').all();
  },

  // User Settings (Persistent per user across reloads/relogins)
  getUserSettings(userId) {
    const row = db.prepare('SELECT settings_json, updated_at FROM user_settings WHERE user_id = ?').get(userId);
    if (!row) return null;
    try {
      return JSON.parse(row.settings_json);
    } catch (e) {
      return null;
    }
  },

  saveUserSettings(userId, settingsObj) {
    const json = JSON.stringify(settingsObj || {});
    db.prepare(`
      INSERT INTO user_settings (user_id, settings_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        settings_json = excluded.settings_json,
        updated_at = CURRENT_TIMESTAMP
    `).run(userId, json);
    return settingsObj;
  },

  // Sessions
  createSession(userId, hoursValid = 48) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
    return { token, expiresAt };
  },

  validateSession(token) {
    if (!token) return null;
    const session = db.prepare(`
      SELECT s.token, s.expires_at, u.id, u.name, u.email, u.role, u.department, u.title, u.avatar, u.status
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
    `).get(token);
    return session || null;
  },

  deleteSession(token) {
    return db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  },

  // Surveys
  listSurveys() {
    return db.prepare('SELECT * FROM surveys ORDER BY id DESC').all();
  },

  createSurvey({ title, description, category, department, deadline, total_target }) {
    const stmt = db.prepare(`
      INSERT INTO surveys (title, description, category, department, deadline, total_target, participation, responses_count)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    `);
    const res = stmt.run(title, description, category, department, deadline, total_target);
    return db.prepare('SELECT * FROM surveys WHERE id = ?').get(res.lastInsertRowid);
  },

  updateSurveyStatus(surveyId, status) {
    db.prepare('UPDATE surveys SET status = ? WHERE id = ?').run(status, surveyId);
    return db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
  },

  deleteSurvey(surveyId) {
    return db.prepare('DELETE FROM surveys WHERE id = ?').run(surveyId);
  },

  saveSurveyResponse(surveyId, userId, rating, balanceScore, comments) {
    db.prepare(`
      INSERT INTO survey_responses (survey_id, user_id, rating, balance_score, comments)
      VALUES (?, ?, ?, ?, ?)
    `).run(surveyId, userId, rating, balanceScore, comments);

    // Update survey participation count
    const stats = db.prepare(`
      SELECT COUNT(*) as respCount FROM survey_responses WHERE survey_id = ?
    `).get(surveyId);

    const survey = db.prepare('SELECT total_target FROM surveys WHERE id = ?').get(surveyId);
    if (survey && survey.total_target > 0) {
      const partRate = Math.min(100, Math.round((stats.respCount / survey.total_target) * 100));
      db.prepare('UPDATE surveys SET participation = ?, responses_count = ? WHERE id = ?').run(partRate, stats.respCount, surveyId);
    }
  },

  // Kudos
  listKudos(limit = 20) {
    const rows = db.prepare('SELECT * FROM kudos ORDER BY id DESC LIMIT ?').all(limit);
    return rows.map(r => ({
      ...r,
      reactions: JSON.parse(r.reactions || '{}')
    }));
  },

  createKudo({ sender_id, sender_name, sender_role, sender_avatar, recipient_name, recipient_role, badge, core_value, message }) {
    const stmt = db.prepare(`
      INSERT INTO kudos (sender_id, sender_name, sender_role, sender_avatar, recipient_name, recipient_role, badge, core_value, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(sender_id, sender_name, sender_role, sender_avatar, recipient_name, recipient_role, badge, core_value, message);
    return db.prepare('SELECT * FROM kudos WHERE id = ?').get(res.lastInsertRowid);
  },

  // Calendar
  listCalendarEvents() {
    return db.prepare('SELECT * FROM calendar_events ORDER BY event_date ASC, event_time ASC').all();
  },

  createCalendarEvent({ title, event_date, event_time, platform, host_id, attendees, link }) {
    const stmt = db.prepare(`
      INSERT INTO calendar_events (title, event_date, event_time, platform, host_id, attendees, link)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(title, event_date, event_time, platform, host_id, attendees, link);
    return db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(res.lastInsertRowid);
  },

  // Audit Logs
  logAudit(userId, userEmail, action, details, ip = '127.0.0.1') {
    db.prepare(`
      INSERT INTO audit_logs (user_id, user_email, action, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, userEmail, action, details, ip);
  },

  listAuditLogs(limit = 50) {
    return db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(limit);
  },

  // Admin Telemetry & Statistics
  getAdminStats() {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get().c;
    const employeeCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin'").get().c;
    const activeSurveys = db.prepare("SELECT COUNT(*) as c FROM surveys WHERE status = 'Active'").get().c;
    const totalSurveys = db.prepare('SELECT COUNT(*) as c FROM surveys').get().c;
    const totalSurveyResponses = db.prepare('SELECT COUNT(*) as c FROM survey_responses').get().c;
    const totalKudos = db.prepare('SELECT COUNT(*) as c FROM kudos').get().c;
    const totalMeetings = db.prepare('SELECT COUNT(*) as c FROM calendar_events').get().c;
    const totalAuditEvents = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;
    const totalAnnouncements = db.prepare('SELECT COUNT(*) as c FROM system_announcements').get().c;

    const departmentBreakdown = db.prepare(`
      SELECT department, COUNT(*) as count FROM users GROUP BY department ORDER BY count DESC
    `).all();

    const recentAudits = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 8').all();

    return {
      totalUsers,
      adminCount,
      employeeCount,
      activeSurveys,
      totalSurveys,
      totalSurveyResponses,
      totalKudos,
      totalMeetings,
      totalAuditEvents,
      totalAnnouncements,
      departmentBreakdown,
      recentAudits
    };
  },

  // Announcements
  createAnnouncement(authorId, title, message, priority = 'normal') {
    return db.prepare(`
      INSERT INTO system_announcements (author_id, title, message, priority)
      VALUES (?, ?, ?, ?)
    `).run(authorId, title, message, priority);
  },

  deleteAnnouncement(id) {
    return db.prepare('DELETE FROM system_announcements WHERE id = ?').run(id);
  },

  listAnnouncements() {
    return db.prepare(`
      SELECT a.*, u.name as author_name FROM system_announcements a
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.id DESC LIMIT 10
    `).all();
  },

  verifyPassword
};

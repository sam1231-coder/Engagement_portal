-- ============================================================================
-- HUMANLY ENTERPRISE PEOPLE & ENGAGEMENT PORTAL
-- Production PostgreSQL Database Schema
-- ============================================================================

-- 1. Users & RBAC
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'hr_manager', 'employee')),
    department VARCHAR(100) NOT NULL,
    title VARCHAR(150) NOT NULL,
    avatar TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Online',
    retention_risk NUMERIC(4, 2) DEFAULT 5.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_dept ON users(department);

-- 2. Sessions (Bearer Tokens)
CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 3. Review & Survey Campaigns
CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL DEFAULT 'All Company',
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Closed', 'Draft')),
    deadline VARCHAR(50) NOT NULL,
    total_target INTEGER NOT NULL DEFAULT 100,
    participation INTEGER NOT NULL DEFAULT 0,
    responses_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    balance_score INTEGER NOT NULL CHECK (balance_score >= 1 AND balance_score <= 10),
    comments TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Team & Social Kudos Wall
CREATE TABLE IF NOT EXISTS kudos (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sender_name VARCHAR(150) NOT NULL,
    sender_role VARCHAR(150) NOT NULL,
    sender_avatar TEXT NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_role VARCHAR(150) NOT NULL,
    badge VARCHAR(100) NOT NULL,
    core_value VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    reactions JSONB DEFAULT '{"clap": 0, "heart": 0, "rocket": 0, "genius": 0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Calendar & Meetings
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    event_date VARCHAR(20) NOT NULL,
    event_time VARCHAR(50) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    host_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    attendees TEXT NOT NULL,
    link TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Audit & Security Telemetry
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- 7. System Broadcast Announcements
CREATE TABLE IF NOT EXISTS system_announcements (
    id SERIAL PRIMARY KEY,
    author_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

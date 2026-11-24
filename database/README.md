# Humanly Database Architecture & Schema Guide

This directory holds the relational schema definitions, migrations, and database connection documentation for the **Humanly** platform.

---

## 1. Supported Database Engines

### Engine A: Embedded SQLite (Default & Zero Setup)
- **Engine**: Node.js v20+ native `node:sqlite` (or Python's built-in `sqlite3`).
- **File**: `humanly.db` (auto-created in root on first boot).
- **Concurrency**: Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and enforced Foreign Keys (`PRAGMA foreign_keys = ON;`).
- **Best for**: Rapid development, single-instance deployments, local evaluation, and air-gapped systems.

### Engine B: PostgreSQL (Enterprise & Cloud Scalable)
- **Engine**: PostgreSQL 14+.
- **Schema File**: [`database/schema.sql`](schema.sql).
- **Best for**: Multi-replica Kubernetes clusters, AWS RDS, Supabase, Neon, or enterprise HRIS integrations.

---

## 2. Table Schema Overview

```
                      +-------------------+
                      |       users       |
                      +---------+---------+
                                | 1
                                |
             +------------------+------------------+-------------------+
             | N                | N                | N                 | N
             v                  v                  v                   v
      +--------------+   +--------------+   +--------------+   +---------------+
      |   sessions   |   | survey_resp. |   |    kudos     |   |calendar_events|
      +--------------+   +--------------+   +--------------+   +---------------+
                                | N                |                   |
                                v                  |                   |
                         +--------------+          |                   |
                         |   surveys    |          |                   |
                         +--------------+          v                   v
                                            +--------------+   +---------------+
                                            |  audit_logs  |   | announcements |
                                            +--------------+   +---------------+
```

### Table Definitions

| Table | Primary Key | Description |
| :--- | :--- | :--- |
| `users` | `id` (INTEGER / SERIAL) | Workforce profiles, role (`admin`, `employee`), department, salted password hash |
| `sessions` | `token` (VARCHAR(128)) | Cryptographic bearer session tokens with expiration timestamps |
| `surveys` | `id` (INTEGER / SERIAL) | Review campaigns, target headcount, status (`Active`, `Closed`), participation stats |
| `survey_responses`| `id` (INTEGER / SERIAL) | Anonymous survey responses, 1-5 rating, work-life balance slider (1-10), feedback |
| `kudos` | `id` (INTEGER / SERIAL) | Peer appreciation cards, badges, core values (`#Teamwork`, `#Innovation`), emoji reactions |
| `calendar_events` | `id` (INTEGER / SERIAL) | Team meetings, 1-on-1s, sync links (Google Meet, Teams, Zoom) |
| `audit_logs` | `id` (INTEGER / SERIAL) | Real-time security telemetry, login records, privilege alterations, IP logs |
| `system_announcements` | `id` (INTEGER / SERIAL) | Executive broadcasts, priority alerts (`normal`, `urgent`, `critical`) |

---

## 3. Cryptographic Password Hashing

Humanly implements **PBKDF2** (Password-Based Key Derivation Function 2) with:
- **Digest Algorithm**: `SHA-512`
- **Iterations**: 100,000 rounds
- **Salt**: 16-byte cryptographically secure pseudorandom salt (`crypto.randomBytes(16)`)
- **Key Length**: 64 bytes (512 bits)
- **Comparison**: `crypto.timingSafeEqual` to eliminate timing attack vectors.

---

## 4. Deploying to PostgreSQL

To deploy against a PostgreSQL instance:
```bash
# 1. Create the database
createdb -U postgres humanly

# 2. Execute schema DDL
psql -U postgres -d humanly -f database/schema.sql

# 3. Configure connection string in .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/humanly
```

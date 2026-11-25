# Humanly Database Architecture and Schema Guide

This document details the relational data model, cryptographic security implementation, and deployment strategies supported by the Humanly platform.

---

Supported Relational Engines

Embedded SQLite Architecture

By default, Humanly utilizes an embedded SQLite database engine using Node.js native sqlite capabilities or Python standard sqlite3. The database file resides at humanly.db in the application root directory. It runs with Write-Ahead Logging enabled and foreign key enforcement active, providing robust performance and ACID transactions for single-host deployments without requiring background database services.

PostgreSQL Cloud Architecture

For containerized environments, high-availability clusters, or integrations with corporate HRIS platforms, Humanly is fully compatible with PostgreSQL version 14 and higher. The complete data definition script is available in database/schema.sql, incorporating standard primary keys, indexed foreign relationships, and strict data type constraints.

---

Relational Entity Structure

The core schema revolves around the central users entity, establishing relationships across sessions, feedback surveys, peer appreciation, calendar schedules, and administrative security logs.

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

The users table holds employee profiles, roles, departmental affiliations, and salted cryptographic hashes.

The sessions table tracks active bearer tokens, user identifiers, and expiration timestamps.

The surveys table stores active, draft, and closed review campaigns, participation statistics, and completion goals.

The survey_responses table records anonymous survey submissions, numerical scores, well-being metrics, and written feedback.

The kudos table stores peer recognition cards, core organizational values, badges, and JSON-encoded emoji reaction counts.

The calendar_events table coordinates team schedules, one-on-one sessions, host relationships, and meeting URLs.

The audit_logs table maintains an immutable record of system events, authentication outcomes, role changes, and originating IP addresses.

The system_announcements table contains leadership broadcasts, priority flags, and author attribution.

---

Cryptographic Security Model

To protect user credentials against credential stuffing and brute-force attacks, Humanly employs the PBKDF2 key derivation algorithm. Passwords undergo one hundred thousand iterations of the SHA-512 digest function with sixteen bytes of cryptographically secure random salt generated per user. Hash comparison uses timing-safe equality verification to prevent side-channel timing analysis.

---

PostgreSQL Deployment Sequence

To deploy the schema against a PostgreSQL instance, create your database and pipe the schema file through the psql command line tool:

```bash
createdb -U postgres humanly
psql -U postgres -d humanly -f database/schema.sql
```

Then specify your connection string in the environment configuration file using the DATABASE_URL key, pointing to your database host, port, credentials, and database name.

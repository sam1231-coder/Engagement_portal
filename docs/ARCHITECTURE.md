# Humanly Architecture & Technical Specification

This document details the software architecture, design principles, segregated frontend structure, and security model of **Humanly**.

---

## 1. System Architecture Overview

```
                               +------------------------------------------+
                               |              Client Browser              |
                               |  - Segregated Multi-Page HTML5           |
                               |  - Natural Solid Color Palette           |
                               |  - Web Audio Micro-Interaction Chimes    |
                               +--------------------+---------------------+
                                                    |
                                      HTTP / REST   |   (Bearer Token Auth)
                                                    v
                               +------------------------------------------+
                               |     Humanly HTTP & REST API Engine       |
                               |   (server.js / server.py on Port 8080)   |
                               +--------------------+---------------------+
                                                    |
                               +--------------------+---------------------+
                               |                                          |
                               v                                          v
                +------------------------------+           +------------------------------+
                |     Database Engine (db.js)  |           |     PostgreSQL Compatibility |
                |   - SQLite (humanly.db)      |           |   - Remote / Cloud Clusters  |
                |   - PBKDF2 / SHA-512 Hashing |           |   - schema.sql DDL           |
                +------------------------------+           +------------------------------+
```

---

## 2. Segregated Multi-Page Architecture

Rather than a bloated, fragile Single Page Application bundle, Humanly uses **isolated, segregated HTML5 interfaces** where each capability has its own specialized document:

| Page | Role Required | Purpose |
| :--- | :--- | :--- |
| `index.html` | Any | Root gatekeeper; routes users to login or dashboard |
| `login.html` | Public | Credential authentication & new employee registration |
| `admin-dashboard.html` | `admin` | Executive control center, audit logs, campaign launcher |
| `admin-users.html` | `admin` | Workforce directory, role modification, account management |
| `dashboard.html` | `employee` / `admin` | Longitudinal engagement trends, live pulse poll widget |
| `analytics.html` | `employee` / `admin` | Document Analytics Studio (Excel/CSV/PDF analysis) |
| `surveys.html` | `employee` / `admin` | Active review campaigns & participation modal |
| `kudos.html` | `employee` / `admin` | Team recognition feed, reactions & confetti triggers |
| `calendar.html` | `employee` / `admin` | Meeting schedule & external video conferencing sync |
| `directory.html` | `employee` / `admin` | Workforce list with retention health monitoring |
| `settings.html` | `employee` / `admin` | Natural palette switcher, synthesized audio toggles |

---

## 3. Security & Route Protection (`auth-guard.js`)

Route enforcement is executed before DOM content renders:
1. **Unauthenticated Redirect**: Any unauthenticated request to an internal page triggers an immediate rewrite to `login.html`.
2. **Role Verification (RBAC)**: When accessing `admin-dashboard.html` or `admin-users.html`, the user's role is checked. If `role !== 'admin'`, the session is redirected to `dashboard.html`.
3. **Session Verification**: The client sends bearer tokens in the `Authorization: Bearer <token>` header for all REST operations.
4. **CSRF & XSS Mitigation**: All inputs use strict DOM parsing (`textContent`), prepared SQL statements, and parameter binding.

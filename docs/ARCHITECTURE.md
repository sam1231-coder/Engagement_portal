# Humanly System Architecture and Technical Specification

This document provides a comprehensive overview of the design philosophy, application architecture, frontend isolation patterns, and security guard mechanisms that power the Humanly platform.

---

High-Level Architecture

Humanly uses a decoupled architecture where modern client-side documents communicate with a lightweight REST API backend. The system minimizes complexity by avoiding heavy build tooling while providing full production security and transactional persistence.

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

Segregated Multi-Page Design

Rather than bundling the entire application into a monolithic single-page script, Humanly segregates each functional capability into an independent HTML document. This ensures that memory consumption remains low, pages load instantaneously, and navigation boundaries are clear and maintainable.

The index.html file acts as an intelligent gateway, checking user authentication and routing visitors directly to their appropriate destination based on role and session validity.

The login.html interface provides a dedicated authentication screen supporting both email credential sign-in and new account registration.

The admin-dashboard.html and admin-users.html documents serve as the executive control center, providing administrative telemetry, workforce role assignment, and audit inspection.

The dashboard.html, analytics.html, surveys.html, kudos.html, calendar.html, directory.html, and settings.html pages deliver the employee experience, covering engagement indicators, spreadsheet analysis, pulse reviews, peer appreciation, scheduling, directory search, and display settings.

---

Security and Route Enforcement

The client-side routing guard resides in js/auth-guard.js and executes immediately upon page initialization.

If an unauthenticated user attempts to access an internal dashboard or tool, the guard halts rendering and redirects the browser to login.html.

When an employee attempts to navigate to administrative consoles, the guard detects insufficient privileges and safely redirects the user back to the standard dashboard.

For authenticated administrators, the guard dynamically injects the administrator navigation drawer into the sidebar and provides a quick switcher pill in the top header.

All state transitions and credentials are validated on the server via standard HTTP bearer tokens, ensuring that client-side route protection is paired with strict database-level authorization.

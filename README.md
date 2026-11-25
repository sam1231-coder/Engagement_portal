<img width="1906" height="863" alt="Screenshot 2026-11-25 192219" src="https://github.com/user-attachments/assets/d99b408a-9abe-4757-be4d-ae2d3e3aa1c9" />


# Humanly: People, Culture and Organizational Engagement Platform

Humanly is an enterprise-grade people analytics, employee engagement, and workplace culture platform. Engineered with a natural solid palette, full client-side route protection, and a production-grade database backend, the platform delivers a cohesive operational environment for leadership and employees alike.

Repository Architecture and Workspace Schema

The codebase is organized into dedicated functional directories, separating core application assets, database management files, operational documentation, and user interfaces.

```
humanly/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── pull_request_template.md
│
├── database/
│   ├── schema.sql
│   └── README.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── css/
│   ├── humanly.css
│   ├── components.css
│   └── adminator.css
│
├── js/
│   ├── auth-guard.js
│   ├── admin-dashboard.js
│   ├── admin-users.js
│   ├── app.js
│   ├── analytics-studio.js
│   ├── dashboard.js
│   ├── calendar.js
│   ├── kudos.js
│   ├── surveys.js
│   └── directory.js
│
├── data/
│   ├── employee_engagement_q4_2026.csv
│   └── quarterly_sentiment_breakdown.csv
│
├── admin-dashboard.html
├── admin-users.html
├── analytics.html
├── calendar.html
├── dashboard.html
├── directory.html
├── index.html
├── kudos.html
├── login.html
├── settings.html
├── surveys.html
│
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
├── db.js
├── package.json
├── server.js
└── server.py
```

---

Authentication and Role-Based Access Control

User authentication is performed directly against the production database using salted cryptographic password hashing through PBKDF2 with SHA-512 and one hundred thousand iterations. Sessions are maintained via cryptographically random sixty-four character bearer tokens with automatic expiration checks.

Default Pre-Seeded Accounts

The platform includes pre-configured workforce accounts for immediate evaluation:

| Persona       | Email                 | Password       | Assigned Role | System Access Scope                        |
| :------------ | :-------------------- | :------------- | :------------ | :----------------------------------------- |
| Elena Rostova | admin@humanly.io      | Admin@2026!    | admin         | Full Executive Control and User Management |
| Sarah Jenkins | sarah.ops@humanly.io  | Humanly@2026!  | admin         | People Operations and Workforce Console    |
| Alex Vance    | alex.vance@humanly.io | Employee@2026! | employee      | Core Employee Portal and Engagement Tools  |
| Maya Lin      | maya.lin@humanly.io   | Employee@2026! | employee      | Core Employee Portal and Engagement Tools  |
| David Chen    | david.chen@humanly.io | Employee@2026! | employee      | Core Employee Portal and Engagement Tools  |

New team members may also be provisioned through the registration interface on the sign-in page or through the administrator management console.

---

Running the Application

Node.js Environment

The primary runtime uses standard Node.js without third-party dependencies, utilizing the built-in SQLite database engine and HTTP server.

```powershell
npm start
```

This starts the HTTP listener on port 8080, connects to the local database file at ./humanly.db, and activates all RESTful endpoints for authentication, administration, surveys, and collaboration.

Python Environment

Alternatively, the platform can be executed within a Python runtime:

```powershell
npm run py
```

This launches the Python server on port 8080, interacting with the exact same relational database and exposing matching API routes. The application can be viewed in any modern browser at http://localhost:8080.

Reference Documentation

Comprehensive architectural descriptions are available in docs/ARCHITECTURE.md, explaining our multi-page isolation design and request lifecycle.

Detailed interface contracts and payload schemas are documented in docs/API.md for engineers building integrations.

Database structure, hashing mechanics, and PostgreSQL migration instructions are cataloged in database/README.md.

Infrastructure deployment steps for Docker, Nginx, and cloud hosting platforms are provided in docs/DEPLOYMENT.md.

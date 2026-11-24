# Humanly — People, Culture & Engagement Platform

An enterprise-grade, beautifully designed **People Analytics, Employee Engagement & Culture Platform** engineered with a natural solid palette (zero gradients), full client-side route protection, and a real production-grade database backend.

---

## 📂 Repository Folder Schema

```
humanly/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md        # Structured bug reporting template
│   │   └── feature_request.md   # Feature suggestion template
│   └── pull_request_template.md # PR verification checklist
│
├── database/
│   ├── schema.sql               # Production PostgreSQL DDL schema & indexes
│   └── README.md                # Database architecture & migration guide
│
├── docs/
│   ├── ARCHITECTURE.md          # System components & segregated routing model
│   ├── API.md                   # Full REST API specification (Auth, Admin, Surveys)
│   └── DEPLOYMENT.md            # Production deployment guide (Docker, Nginx, Linux)
│
├── css/
│   ├── humanly.css              # Core design system (Natural solid palette, zero gradients)
│   ├── components.css           # Dropzone, interactive chart stage, calendar, kudos
│   └── adminator.css            # Legacy stylesheet forwarder
│
├── js/
│   ├── auth-guard.js            # Database session gatekeeper, RBAC & admin navigation
│   ├── admin-dashboard.js       # Admin Console controller, telemetry KPIs, audit logs
│   ├── admin-users.js           # Workforce role administration, CRUD user management
│   ├── app.js                   # Common controller, themes, sidebar, audio, Ctrl+K
│   ├── analytics-studio.js      # Ingestion engine, interactive Chart.js, PNG export
│   ├── dashboard.js             # Trajectory line/bar chart, interactive pulse poll
│   ├── calendar.js              # Interactive month grid, meeting API sync, scheduler
│   ├── kudos.js                 # Team and social recognition feed, reactions, confetti
│   ├── surveys.js               # Review and survey campaigns, participation modal
│   └── directory.js             # Filterable workforce table & retention monitor
│
├── data/
│   ├── employee_engagement_q4_2026.csv   # Sample CSV dataset for studio testing
│   └── quarterly_sentiment_breakdown.csv # Longitudinal sentiment dataset
│
├── admin-dashboard.html         # Admin Console & Executive Telemetry
├── admin-users.html             # Workforce & Role Administration
├── analytics.html               # Document Analytics Studio (Excel/CSV/PDF analysis)
├── calendar.html                # Team Calendar & Meeting Schedule
├── dashboard.html               # Employee Engagement health, trends & live pulse poll
├── directory.html               # Team Directory & Retention Monitor
├── index.html                   # Root gateway (Routes based on DB session token and role)
├── kudos.html                   # "Team and social" recognition feed
├── login.html                   # Production authentication portal (DB Login & Registration)
├── settings.html                # Portal Settings, Natural Palettes & Sign Out
├── surveys.html                 # "Review and survey" campaigns & participation modal
│
├── .env.example                 # Environment configuration template
├── .gitignore                   # Ignores runtime binaries, humanly.db, logs, __pycache__
├── CONTRIBUTING.md              # Contribution guidelines & PR process
├── db.js                        # Production SQLite database engine with PBKDF2/SHA-512
├── package.json                 # Project manifest & npm scripts
├── server.js                    # Node.js production HTTP & REST API server
└── server.py                    # Python production HTTP & REST API server
```

---

## 🛡️ Authentication & Database Access Control (RBAC)

Authentication is verified directly against the production database with salted cryptographic password hashing (`PBKDF2` with `SHA-512` and 100,000 iterations).

### Pre-Seeded Production Accounts

| Persona | Email | Password | Role | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Elena Rostova** | `admin@humanly.io` | `Admin@2026!` | `admin` | Full Admin Console & User Management |
| **Sarah Jenkins** | `sarah.ops@humanly.io` | `Humanly@2026!` | `admin` | People Ops Manager (Admin Console) |
| **Alex Vance** | `alex.vance@humanly.io` | `Employee@2026!` | `employee` | Standard Employee Portal |
| **Maya Lin** | `maya.lin@humanly.io` | `Employee@2026!` | `employee` | Standard Employee Portal |
| **David Chen** | `david.chen@humanly.io` | `Employee@2026!` | `employee` | Standard Employee Portal |

*New accounts can also be created live using the **"Register"** tab on `login.html` or via the Admin User Management console.*

---

## 🚀 How to Run the Platform

### Option A: Node.js Production Server (Recommended)
```powershell
npm start
# or: node server.js
```
- Starts HTTP server on port `8080`.
- Connects to SQLite database (`./humanly.db`).
- Serves REST APIs (`/api/auth/*`, `/api/admin/*`, `/api/users/*`, `/api/surveys/*`).

### Option B: Python Production Server
```powershell
npm run py
# or: python server.py
```
- Starts lightweight Python server on port `8080` with identical SQLite REST API endpoints.

*Open **[http://localhost:8080](http://localhost:8080)** in any browser.*

---

## 📤 How to Commit and Push to GitHub

To publish this project to your GitHub repository:

```bash
# 1. Initialize git if not already present
git init

# 2. Stage all organized files (.gitignore will exclude binaries and cache)
git add .

# 3. Commit with a clean descriptive message
git commit -m "feat: complete Humanly platform with production database, RBAC, and GitHub schema"

# 4. Link your GitHub remote repository
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 5. Push to main branch
git branch -M main
git push -u origin main
```

---

## 📚 Technical Documentation

- **[System Architecture](docs/ARCHITECTURE.md)**: Detailed component overview, data flow, and security model.
- **[REST API Specification](docs/API.md)**: Full endpoint definitions, request schemas, and responses.
- **[Database Guide](database/README.md)**: Table schema diagrams, PBKDF2 hashing, and PostgreSQL migration.
- **[Deployment Guide](docs/DEPLOYMENT.md)**: Instructions for Docker, Nginx, and cloud providers.

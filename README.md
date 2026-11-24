# Adminator Pulse — Employee Engagement & Data Analytics Portal

An enterprise-grade, beautifully animated **Employee Engagement & People Analytics Portal** inspired by the architecture and visual polish of [puikinsh/Adminator-admin-dashboard](https://github.com/puikinsh/Adminator-admin-dashboard).

Engineered with modern **HTML5, CSS3** (applied with the 60-30-10 Color Theory Rule, dark/light themes, and glassmorphism) and **modular ES6 JavaScript**, the application is **fully segregated into dedicated, cleanly linked HTML pages** with client-side route protection.

---

## 📂 Segregated Multi-Page Architecture

Each feature operates as a dedicated, focused HTML page protected by `js/auth-guard.js`:

```
Engagement_portal/
├── index.html                   # Root gateway (Routes to login.html or dashboard.html)
├── login.html                   # Dedicated authentication portal with 1-click demo personas
├── dashboard.html               # Executive Engagement health, trends & live pulse poll
├── analytics.html               # Document Analytics Studio (Upload Excel/PDF, Interactive Chart, PNG Export)
├── surveys.html                 # "review and survey" campaigns & participation modal
├── kudos.html                   # "Team and social" recognition feed, reactions & confetti
├── calendar.html                # Team Calendar & Meeting Schedule (Google Meet, Teams, Zoom)
├── directory.html               # Team Directory & Retention Monitor (Search, Filters, 1-on-1s)
├── settings.html                # Portal Settings, Color Theory Palettes & Sign Out
├── server.py                    # Python HTTP dev server with CORS
├── server.js                    # Node.js zero-dependency HTTP server
├── css/
│   ├── adminator.css            # Layout, login styles, color theory, dark/light themes
│   └── components.css           # Dropzone, interactive chart stage, calendar, kudos
├── js/
│   ├── auth-guard.js            # Route protection gatekeeper & session synchronizer
│   ├── app.js                   # Common controller, themes, sidebar, audio, Ctrl+K
│   ├── sample-data.js           # Demo personas, calendar meetings, survey datasets
│   ├── analytics-studio.js      # Ingestion engine, interactive Chart.js, PNG export
│   ├── dashboard.js             # Trajectory line chart, interactive pulse poll
│   ├── calendar.js              # Interactive month grid, meeting API sync, scheduler
│   ├── kudos.js                 # Team and social recognition feed, reactions, confetti
│   ├── surveys.js               # Review and survey campaigns, participation modal
│   └── directory.js             # Filterable workforce table & retention monitor
└── data/
    ├── employee_engagement_q4_2026.csv   # Sample CSV dataset for upload & testing
    └── quarterly_sentiment_breakdown.csv # Longitudinal sentiment dataset
```

---

## 🔒 Authentication Flow & Route Protection (`auth-guard.js`)

1. **Unauthenticated Access Gate**:
   - If a user tries to access `dashboard.html`, `analytics.html`, `calendar.html`, or any other internal page without logging in, `js/auth-guard.js` immediately intercepts the request and redirects them to **`login.html`**.
2. **Dedicated `login.html`**:
   - Displays a corporate authentication screen with 1-Click Quick Demo Personas:
     - 👔 **Alex Vance** (Head of People Ops / Executive)
     - 👩‍💻 **Sarah Jenkins** (Lead DevOps Engineer / Employee)
     - 🎨 **Maya Lin** (Lead Product Designer / Team Lead)
   - Clicking any persona or submitting the work email form stores the session in `localStorage` and redirects to **`dashboard.html`**.
   - If an already authenticated user visits `login.html`, they are automatically routed to `dashboard.html`.
3. **Sign Out**:
   - Available in the user profile dropdown in the top header and on `settings.html`.
   - Clears the session and routes back to `login.html`.

---

## 🌟 Segregated Page Walkthrough

### 1. 📊 `dashboard.html` (Executive Health)
- **KPI Metrics**: Real-time tracking of eNPS (`+68`), Engagement Index (`86.4%`), Review Participation (`93.8%`), and Kudos volume (`1,420`).
- **Trajectory Line Chart**: Interactive multi-series trends with **Monthly, Quarterly, and Yearly** filters.
- **Interactive Quick Pulse Poll**: In-card voting widget with animated progress bars and local storage persistence.
- **Departmental Alignment Radar & Sentiment Breakdown Doughnut**.

### 2. 📈 `analytics.html` (Document Analytics Studio)
- **Prominent Interactive Chart Below Ingestion Flow**:
  - Upload `.xlsx`, `.xls` (via SheetJS), `.csv`, `.pdf` reports, or `.json`.
  - 4-stage animated pipeline stepper: Ingestion $\to$ Schema Cleanse $\to$ Statistical Synthesis $\to$ Interactive Chart.
  - Interactive live Chart.js chart rendered **directly below the pipeline on the page**.
  - **1-Click Representation Switcher**: Instantly switch between **Vertical Bar, Line Graph, Doughnut, Pie/Polar Area, Horizontal Ranking Bar, and Radar**.
  - **Explicit Axis Naming & Badges**: Prominent visual indicators identifying the current X-Axis (Categories) and Y-Axis (Metric & Aggregation).
  - Dynamic controls: X & Y Axis mapping, Aggregation (**Mean, Sum, Count, Min, Max**), and Natural Color Palettes.
  - Dedicated buttons: **"Save PNG"** (downloads high-resolution chart image) and **"Save CSV"**.

### 3. 📋 `surveys.html` ("Review and survey")
- **Active Review Campaigns**: Participation progress bars, responder statistics, and countdown timers.
- **"Quick Pulse Review" Modal**: Star rating, work-life balance slider (1-10), and anonymous suggestions.
- **Department Sentiment Matrix**: Cross-departmental heatmap comparing satisfaction and psychological safety.

### 4. 🌟 `kudos.html` ("Team and social")
- **Social Recognition Feed**: Peer appreciation cards tagged with core values (`#Innovation`, `#Teamwork`, `#CustomerFirst`).
- **Live Emoji Reactions**: Clickable reactions (👏 `Clap`, ❤️ `Heart`, 🚀 `Rocket`, 💡 `Genius`) with live bouncing counters.
- **"Give Kudos" Modal**: Recipient selector, badge picker, custom praise note, and **celebratory confetti explosion**.

### 5. 📅 `calendar.html` ("Calendar & Meetings")
- **Meeting APIs Integration Banner**: Live status for **Google Meet**, **Microsoft Teams**, and **Zoom API** with simulated API sync.
- **Interactive Month Grid**: Active date highlight and color-coded event chips.
- **"Schedule Meeting / 1-on-1" Modal**: Book sessions and sync them live into the calendar.
- **Upcoming Agenda Panel**: Cards with date/time tags, attendee rosters, and direct **"Join Call"** buttons.

### 6. 👥 `directory.html` ("Team Directory")
- **Workforce Roster**: Search by employee name or role.
- **Filters**: Filter by department and retention risk (Low, Medium, High).
- **Quick Actions**: Schedule 1-on-1s and route peer kudos directly from the table.

### 7. ⚙️ `settings.html` ("Settings")
- **Natural Solid Color Palettes**: Switch between Cerulean Sapphire, Emerald Sage, Teal Horizon, and Warm Amber (Zero Gradients).
- **Interactive Audio Synthesizer**: Toggle soft synthesized UI micro-chimes.
- **Active Profile Card & Sign Out Action**.

---

## 🔔 Dynamic Notification Center
- **Unread-Only Indicator**: The bell's red dot (`#notificationDot`) appears **strictly when unread notifications are present**.
- **Interactive Popover**: Click the bell to view categorized alerts (Surveys, Kudos, Calendar).
- **1-Click Mark All Read**: Clears unread state and automatically dismisses the red dot.
- **Cross-Page Synchronization**: Reads and writes through `localStorage` to keep all open tabs synchronized.

---

## 🏗️ Enterprise Upgrades (Database & Real-time Backend)
A detailed architecture proposal with full **MongoDB Atlas (Mongoose)** and **PostgreSQL (Prisma)** schemas, **Socket.io** WebSocket broadcasting, and **Docker Compose** configurations is available in [database_and_ux_upgrade_proposal.md](file:///C:/Users/samso/.gemini/antigravity/brain/495eb555-a8db-4f00-9408-7c1fd5a366cd/database_and_ux_upgrade_proposal.md).

---

## 🚀 How to Run the Application

### Option A: Python HTTP Server (Recommended)
```powershell
cd c:\Users\samso\Desktop\Engagement_portal
python server.py
```
*Open [http://localhost:8080](http://localhost:8080) in your browser.*

### Option B: Node.js Zero-Dependency Server
```powershell
cd c:\Users\samso\Desktop\Engagement_portal
node server.js
```
*Open [http://localhost:8080](http://localhost:8080) in your browser.*

### Option C: Direct Browser Opening
Double-click `login.html` (or `index.html`) in Chrome, Edge, Safari, or Firefox!

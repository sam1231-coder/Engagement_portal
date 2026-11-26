/**
 * HUMANLY - Enterprise Authentication Guard & RBAC Controller
 * Connects to Database Backend (/api/auth/*) with Session Bearer Tokens,
 * Role-Based Access Control (Admin vs Employee), and Route Protection.
 */

const AuthGuard = (function () {
  // =========================================================================
  // 0. RESILIENT API BRIDGE (Supports Node/Python backend + Live Server/file:// + Offline LocalDB)
  // =========================================================================
  (function installApiBridge() {
    if (window.__humanlyFetchInstalled) return;
    window.__humanlyFetchInstalled = true;
    const nativeFetch = window.fetch.bind(window);
    const LOCAL_DB_KEY = "humanly_offline_db_v1";

    function getOfflineDB() {
      try {
        const raw = localStorage.getItem(LOCAL_DB_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      const seed = {
        nextId: 100,
        users: [
          { id: 1, name: "Elena Rostova", email: "admin@humanly.io", password: "Admin@2026!", role: "admin", department: "Executive Operations", title: "VP of People & Culture (Admin)", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80", status: "Online", retention_risk: 3.2 },
          { id: 2, name: "Sarah Jenkins", email: "sarah.ops@humanly.io", password: "Humanly@2026!", role: "admin", department: "People Operations", title: "Lead People Ops Manager (Admin)", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80", status: "Online", retention_risk: 4.5 },
          { id: 3, name: "Alex Vance", email: "alex.vance@humanly.io", password: "Employee@2026!", role: "employee", department: "Engineering", title: "Staff Software Engineer", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80", status: "Online", retention_risk: 5.8 },
          { id: 4, name: "Maya Lin", email: "maya.lin@humanly.io", password: "Employee@2026!", role: "employee", department: "Design", title: "Lead Product Designer", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80", status: "Focus Mode", retention_risk: 4.1 },
          { id: 5, name: "David Chen", email: "david.chen@humanly.io", password: "Employee@2026!", role: "employee", department: "Engineering", title: "Backend Architect", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80", status: "In a Meeting", retention_risk: 7.2 },
          { id: 6, name: "Priya Sharma", email: "priya.sharma@humanly.io", password: "Employee@2026!", role: "employee", department: "Customer Support", title: "Senior Solutions Engineer", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80", status: "Online", retention_risk: 6.4 }
        ],
        surveys: [
          { id: 1, title: "Q4 2026 Well-Being & Work-Life Review", description: "Quarterly assessment of squad workload and wellness.", category: "Well-Being", department: "All Company", status: "Active", deadline: "Dec 15, 2026", total_target: 320, participation: 94, responses_count: 301 },
          { id: 2, title: "Engineering Tooling & Architecture Feedback", description: "CI/CD pipelines and workstation experience.", category: "Tooling", department: "Engineering", status: "Active", deadline: "Dec 20, 2026", total_target: 85, participation: 88, responses_count: 75 },
          { id: 3, title: "Manager Effectiveness & Career Growth Review", description: "Mentorship and promotion alignment.", category: "Leadership", department: "Product & Design", status: "Active", deadline: "Jan 10, 2027", total_target: 50, participation: 92, responses_count: 46 }
        ],
        announcements: [],
        audit_logs: [
          { id: 1, user_id: 1, user_email: "system@humanly.io", action: "SYSTEM_INITIALIZATION", details: "Humanly Workforce Database initialized.", ip_address: "127.0.0.1", created_at: new Date().toISOString().slice(0, 19).replace("T", " ") }
        ],
        kudos: [
          { id: 1, sender_name: "Elena Rostova", recipient_name: "Core Platform Squad", badge: "🚀 Mission Critical", core_value: "#Teamwork", message: "Zero-downtime database migration!", reactions: { clap: 38, heart: 27, rocket: 45, genius: 14 } }
        ],
        settings: {}
      };
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(seed));
      return seed;
    }

    function saveOfflineDB(dbObj) {
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(dbObj));
    }

    function jsonResp(status, payload) {
      return new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" }
      });
    }

    function handleOfflineApi(urlPath, options = {}) {
      const db = getOfflineDB();
      const method = (options.method || "GET").toUpperCase();
      let body = {};
      if (options.body) {
        try { body = JSON.parse(options.body); } catch (e) {}
      }
      const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");
      let authUser = null;
      try {
        authUser = JSON.parse(localStorage.getItem("humanly_user") || "null");
      } catch (e) {}

      const addLog = (u, action, details) => {
        db.audit_logs.unshift({
          id: ++db.nextId,
          user_id: u ? u.id : null,
          user_email: u ? u.email : "system@humanly.io",
          action,
          details,
          ip_address: "127.0.0.1",
          created_at: nowStr
        });
      };

      if (urlPath === "/api/auth/login" && method === "POST") {
        const match = db.users.find(u => u.email.toLowerCase() === (body.email || "").trim().toLowerCase() && u.password === body.password);
        if (!match) {
          addLog({ id: null, email: body.email }, "LOGIN_FAILED", "Invalid credentials");
          saveOfflineDB(db);
          return jsonResp(401, { success: false, message: "Invalid credentials. Please verify your work email and password." });
        }
        addLog(match, "LOGIN_SUCCESS", `Authenticated locally. Role: ${match.role}`);
        saveOfflineDB(db);
        const safe = { ...match };
        delete safe.password;
        return jsonResp(200, { success: true, token: "local_tok_" + match.id + "_" + Date.now(), user: safe, settings: db.settings[match.id] || {} });
      }

      if (urlPath === "/api/auth/register" && method === "POST") {
        if (db.users.some(u => u.email.toLowerCase() === (body.email || "").trim().toLowerCase())) {
          return jsonResp(409, { success: false, message: "An account with this email already exists." });
        }
        const newU = {
          id: ++db.nextId,
          name: body.name,
          email: body.email.trim(),
          password: body.password,
          role: body.role === "admin" ? "admin" : "employee",
          department: body.department || "General",
          title: body.title || "Team Member",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
          status: "Online",
          retention_risk: 5.0
        };
        db.users.push(newU);
        addLog(newU, "USER_REGISTERED", `New account registered (${newU.role})`);
        saveOfflineDB(db);
        const safe = { ...newU };
        delete safe.password;
        return jsonResp(201, { success: true, token: "local_tok_" + newU.id, user: safe });
      }

      if (urlPath === "/api/auth/logout" && method === "POST") {
        if (authUser) { addLog(authUser, "USER_LOGOUT", `User signed out`); saveOfflineDB(db); }
        return jsonResp(200, { success: true });
      }

      if (urlPath === "/api/auth/profile" && method === "PUT") {
        const idx = db.users.findIndex(u => authUser && u.id === authUser.id);
        if (idx === -1) return jsonResp(401, { success: false, message: "Unauthorized" });
        const isAdmin = db.users[idx].role === "admin";
        if (isAdmin && body.name) db.users[idx].name = body.name;
        if (isAdmin && body.title) db.users[idx].title = body.title;
        if (isAdmin && body.department) db.users[idx].department = body.department;
        if (body.status) db.users[idx].status = body.status;
        addLog(db.users[idx], "PROFILE_UPDATED", `${db.users[idx].name} updated status to ${db.users[idx].status}`);
        saveOfflineDB(db);
        const safe = { ...db.users[idx] }; delete safe.password;
        return jsonResp(200, { success: true, user: safe });
      }

      if (urlPath === "/api/auth/password" && method === "PUT") {
        const idx = db.users.findIndex(u => authUser && u.id === authUser.id);
        if (idx === -1 || db.users[idx].password !== body.currentPassword) {
          return jsonResp(401, { success: false, message: "Current password is incorrect." });
        }
        db.users[idx].password = body.newPassword;
        addLog(db.users[idx], "PASSWORD_CHANGED", "User changed account password");
        saveOfflineDB(db);
        return jsonResp(200, { success: true, message: "Password updated successfully." });
      }

      if (urlPath === "/api/settings") {
        if (!authUser) return jsonResp(401, { success: false });
        if (method === "GET") return jsonResp(200, { success: true, settings: db.settings[authUser.id] || {} });
        if (method === "PUT") { db.settings[authUser.id] = body.settings || {}; saveOfflineDB(db); return jsonResp(200, { success: true, settings: db.settings[authUser.id] }); }
      }

      if (urlPath === "/api/audit/activity" && method === "POST") {
        if (authUser) { addLog(authUser, body.action || "PAGE_VIEW", body.details || ""); saveOfflineDB(db); }
        return jsonResp(201, { success: true });
      }

      if (urlPath === "/api/users" && method === "GET") {
        return jsonResp(200, { success: true, users: db.users.map(({ password, ...rest }) => rest) });
      }

      if (urlPath === "/api/users" && method === "POST") {
        if (db.users.some(u => u.email.toLowerCase() === (body.email || "").trim().toLowerCase())) {
          return jsonResp(409, { success: false, message: "A user with this email already exists" });
        }
        const newU = {
          id: ++db.nextId,
          name: body.name,
          email: body.email.trim(),
          password: body.password,
          role: body.role || "employee",
          department: body.department || "General",
          title: body.title || "Team Member",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
          status: "Online",
          retention_risk: 5.0
        };
        db.users.push(newU);
        addLog(authUser, "USER_CREATED_BY_ADMIN", `Admin created user ${newU.email} with role ${newU.role}`);
        saveOfflineDB(db);
        const safe = { ...newU }; delete safe.password;
        return jsonResp(201, { success: true, user: safe });
      }

      if (urlPath.match(/^\/api\/users\/\d+\/password$/) && method === "PUT") {
        const id = parseInt(urlPath.split("/")[3], 10);
        const u = db.users.find(x => x.id === id);
        if (!u) return jsonResp(404, { success: false, message: "User not found" });
        u.password = body.password;
        addLog(authUser, "ADMIN_PASSWORD_RESET", `Admin set new password for ${u.email}`);
        saveOfflineDB(db);
        return jsonResp(200, { success: true, message: `Password updated for ${u.name}` });
      }

      if (urlPath.match(/^\/api\/users\/\d+\/role$/) && method === "PUT") {
        const id = parseInt(urlPath.split("/")[3], 10);
        const u = db.users.find(x => x.id === id);
        if (u) { u.role = body.role; addLog(authUser, "ROLE_CHANGED", `Changed user ${id} role to ${body.role}`); saveOfflineDB(db); }
        return jsonResp(200, { success: true, user: u });
      }

      if (urlPath.match(/^\/api\/users\/\d+$/) && method === "PUT") {
        const id = parseInt(urlPath.split("/")[3], 10);
        const u = db.users.find(x => x.id === id);
        if (u) {
          Object.assign(u, { name: body.name || u.name, department: body.department || u.department, title: body.title || u.title, status: body.status || u.status, retention_risk: body.retention_risk ?? u.retention_risk });
          addLog(authUser, "USER_UPDATED", `Admin updated user ${u.email}`);
          saveOfflineDB(db);
        }
        return jsonResp(200, { success: true, user: u });
      }

      if (urlPath.match(/^\/api\/users\/\d+$/) && method === "DELETE") {
        const id = parseInt(urlPath.split("/")[3], 10);
        db.users = db.users.filter(x => x.id !== id);
        addLog(authUser, "USER_DELETED", `Deleted user ID ${id}`);
        saveOfflineDB(db);
        return jsonResp(200, { success: true, message: "User deleted" });
      }

      if (urlPath === "/api/surveys" && method === "GET") return jsonResp(200, { success: true, surveys: db.surveys });
      if (urlPath === "/api/surveys" && method === "POST") {
        const s = { id: ++db.nextId, ...body, status: "Active", participation: 0, responses_count: 0 };
        db.surveys.unshift(s);
        addLog(authUser, "SURVEY_CREATED", `Launched survey: ${s.title}`);
        saveOfflineDB(db);
        return jsonResp(201, { success: true, survey: s });
      }
      if (urlPath.match(/^\/api\/surveys\/\d+$/) && method === "PUT") {
        const id = parseInt(urlPath.split("/")[3], 10);
        const s = db.surveys.find(x => x.id === id);
        if (s) { s.status = body.status; addLog(authUser, "SURVEY_UPDATED", `Updated survey ${id} to ${body.status}`); saveOfflineDB(db); }
        return jsonResp(200, { success: true, survey: s });
      }
      if (urlPath.match(/^\/api\/surveys\/\d+$/) && method === "DELETE") {
        const id = parseInt(urlPath.split("/")[3], 10);
        db.surveys = db.surveys.filter(x => x.id !== id);
        addLog(authUser, "SURVEY_DELETED", `Deleted survey ID ${id}`);
        saveOfflineDB(db);
        return jsonResp(200, { success: true });
      }

      if (urlPath === "/api/announcements" && method === "GET") return jsonResp(200, { success: true, announcements: db.announcements });
      if (urlPath === "/api/admin/broadcast" && method === "POST") {
        const ann = { id: ++db.nextId, author_id: authUser?.id, author_name: authUser?.name || "Admin", title: body.title, message: body.message, priority: body.priority || "normal", created_at: nowStr };
        db.announcements.unshift(ann);
        addLog(authUser, "SYSTEM_BROADCAST", `Broadcast announcement posted: ${body.title}`);
        saveOfflineDB(db);
        return jsonResp(201, { success: true, message: "Announcement broadcasted" });
      }
      if (urlPath.match(/^\/api\/announcements\/\d+$/) && method === "DELETE") {
        const id = parseInt(urlPath.split("/")[3], 10);
        db.announcements = db.announcements.filter(x => x.id !== id);
        saveOfflineDB(db);
        return jsonResp(200, { success: true });
      }

      if (urlPath === "/api/admin/stats" && method === "GET") {
        const deptMap = {};
        db.users.forEach(u => { deptMap[u.department] = (deptMap[u.department] || 0) + 1; });
        const departmentBreakdown = Object.entries(deptMap).map(([department, count]) => ({ department, count }));
        return jsonResp(200, {
          success: true,
          stats: {
            totalUsers: db.users.length,
            adminCount: db.users.filter(u => u.role === "admin").length,
            employeeCount: db.users.filter(u => u.role !== "admin").length,
            activeSurveys: db.surveys.filter(s => s.status === "Active").length,
            totalSurveyResponses: db.surveys.reduce((a, b) => a + (b.responses_count || 0), 0),
            totalKudos: db.kudos.length,
            totalMeetings: 3,
            totalAuditEvents: db.audit_logs.length,
            departmentBreakdown,
            recentAudits: db.audit_logs.slice(0, 8)
          }
        });
      }

      if (urlPath === "/api/admin/audit-logs" && method === "GET") {
        return jsonResp(200, { success: true, logs: db.audit_logs.slice(0, 100) });
      }

      if (urlPath === "/api/kudos" && method === "GET") return jsonResp(200, { success: true, kudos: db.kudos });
      if (urlPath === "/api/kudos" && method === "POST") {
        const k = { id: ++db.nextId, sender_name: authUser?.name || "Anonymous", ...body, reactions: { clap: 0, heart: 0, rocket: 0, genius: 0 } };
        db.kudos.unshift(k);
        addLog(authUser, "KUDOS_SENT", `Sent kudos to ${body.recipient_name}`);
        saveOfflineDB(db);
        return jsonResp(201, { success: true, kudo: k });
      }

      return jsonResp(404, { success: false, message: "Offline API endpoint not found" });
    }

    window.fetch = async function (input, init) {
      const urlStr = typeof input === "string" ? input : (input && input.url) || "";
      if (!urlStr.startsWith("/api/")) {
        return nativeFetch(input, init);
      }

      const isSameBackendOrigin = window.location.protocol.startsWith("http") && (window.location.port === "8080" || window.location.port === "");
      if (isSameBackendOrigin) {
        try {
          const res = await nativeFetch(input, init);
          if (res.status !== 404 && res.status !== 405) return res;
        } catch (e) {
          // Server unreachable -> try offline DB fallback below
        }
      } else {
        // Opened via file:// or alternate static port (e.g. Live Server :5500) -> try localhost:8080 first
        try {
          const res = await nativeFetch("http://localhost:8080" + urlStr, init);
          if (res.status !== 404 && res.status !== 405) return res;
        } catch (e) {
          // Backend on :8080 not running -> use Offline LocalDB so UI remains 100% functional
        }
      }

      return handleOfflineApi(urlStr, init);
    };
  })();

  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const isAuthPage = currentPage === "login.html" || currentPage === "register.html";
  const adminOnlyPages = ["admin-dashboard.html", "admin-users.html", "admin-audit.html"];

  // 1. Session state from LocalStorage
  const token = localStorage.getItem("humanly_token");
  const isLoggedIn = localStorage.getItem("humanly_logged_in") === "true" && !!token;
  const savedUserJson = localStorage.getItem("humanly_user");

  let currentUser = null;
  if (savedUserJson) {
    try {
      currentUser = JSON.parse(savedUserJson);
    } catch (e) {
      currentUser = null;
    }
  }

  // 2. Strict Route Protection
  if (!isLoggedIn && !isAuthPage) {
    // Unauthenticated: Redirect to login
    window.location.replace("login.html");
  } else if (isLoggedIn && isAuthPage) {
    // Authenticated visiting auth pages: Redirect based on role
    if (currentUser && currentUser.role === "admin") {
      window.location.replace("admin-dashboard.html");
    } else {
      window.location.replace("dashboard.html");
    }
  } else if (isLoggedIn && adminOnlyPages.includes(currentPage)) {
    // Non-admin attempting to access Admin Pages: Deny & Redirect
    if (!currentUser || currentUser.role !== "admin") {
      alert("Access Denied: You need Administrator privileges to access the Admin Console.");
      window.location.replace("dashboard.html");
    }
  }

  // 3. UI Initialization
  function init() {
    if (currentUser) {
      populateUserInfo(currentUser);
      injectAdminNavigation(currentUser);
      trackRealtimeActivity(currentUser);
      initSessionTimeoutGuard(currentUser);
    }
    setupLogoutHandlers();
  }

  function trackRealtimeActivity(user) {
    if (isAuthPage || !token) return;
    fetch("/api/audit/activity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        action: "PAGE_VIEW",
        details: `${user.name} (${user.role}) opened ${currentPage}`
      })
    }).catch(() => {});
  }

  // 3b. 15-Minute Employee Session Timeout & Tab-Switch Expiry Prompt
  function initSessionTimeoutGuard(user) {
    if (isAuthPage || user.role === "admin") return;

    const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    const TAB_WARN_MIN_MS = 6 * 1000;        // 0.1 minute (6s)
    const TAB_WARN_MAX_MS = 2 * 60 * 1000;   // 2 minutes (120s)
    const ACTIVITY_KEY = "humanly_last_activity";

    const resetActivity = () => {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    };

    if (!localStorage.getItem(ACTIVITY_KEY)) {
      resetActivity();
    }

    let hiddenAt = null;
    let countdownTimer = null;
    let modalEl = null;

    function formatTime(ms) {
      const totalSec = Math.max(0, Math.ceil(ms / 1000));
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    function ensureModal() {
      if (modalEl) return modalEl;
      modalEl = document.createElement("div");
      modalEl.id = "sessionExpiryModal";
      modalEl.className = "modal-overlay";
      modalEl.style.zIndex = "9999";
      modalEl.innerHTML = `
        <div class="modal-container" style="max-width: 420px;">
          <div class="modal-header">
            <h3 class="modal-title"><i class="fa-solid fa-clock" style="color: var(--warning); margin-right: 0.45rem;"></i> Session Expiring Soon</h3>
          </div>
          <div class="modal-body" style="text-align: center; padding: 1.5rem 1.25rem;">
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
              For your security, inactive employee sessions time out after 15 minutes.
            </p>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">
              Session is expiring in <span id="sessionExpiryCountdown" style="color: var(--warning); font-variant-numeric: tabular-nums;">02:00</span>
            </div>
          </div>
          <div class="modal-footer" style="justify-content: center; gap: 0.75rem;">
            <button type="button" class="btn btn-secondary" id="sessionSignOutBtn">
              <i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
            </button>
            <button type="button" class="btn btn-primary" id="sessionStayBtn">
              <i class="fa-solid fa-check"></i> Stay Signed In
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);

      document.getElementById("sessionStayBtn")?.addEventListener("click", () => {
        clearInterval(countdownTimer);
        countdownTimer = null;
        modalEl.classList.remove("active");
        resetActivity();
      });

      document.getElementById("sessionSignOutBtn")?.addEventListener("click", () => {
        clearInterval(countdownTimer);
        logout();
      });

      return modalEl;
    }

    function showExpiryPrompt(initialRemainingMs) {
      const m = ensureModal();
      const countdownEl = document.getElementById("sessionExpiryCountdown");
      let remaining = Math.max(0, initialRemainingMs);
      if (countdownEl) countdownEl.textContent = formatTime(remaining);
      m.classList.add("active");

      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = setInterval(() => {
        remaining -= 1000;
        if (countdownEl) countdownEl.textContent = formatTime(remaining);
        if (remaining <= 0) {
          clearInterval(countdownTimer);
          logout();
        }
      }, 1000);
    }

    // Track active user interaction when modal is not open
    ["mousemove", "keydown", "click", "scroll"].forEach((evt) => {
      window.addEventListener(evt, () => {
        if (!modalEl || !modalEl.classList.contains("active")) {
          resetActivity();
        }
      }, { passive: true });
    });

    // Tab switch detection (0.1 to 2 minutes away -> prompt Stay or Sign Out)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (document.visibilityState === "visible") {
        const last = parseInt(localStorage.getItem(ACTIVITY_KEY) || String(Date.now()), 10);
        const remaining = SESSION_TIMEOUT_MS - (Date.now() - last);

        if (remaining <= 0) {
          logout();
          return;
        }

        if (hiddenAt) {
          const awayMs = Date.now() - hiddenAt;
          hiddenAt = null;
          if ((awayMs >= TAB_WARN_MIN_MS && awayMs <= TAB_WARN_MAX_MS) || remaining <= TAB_WARN_MAX_MS) {
            showExpiryPrompt(Math.min(remaining, TAB_WARN_MAX_MS));
          }
        }
      }
    });

    // Background 15-minute inactivity check
    setInterval(() => {
      if (modalEl && modalEl.classList.contains("active")) return;
      const last = parseInt(localStorage.getItem(ACTIVITY_KEY) || String(Date.now()), 10);
      const remaining = SESSION_TIMEOUT_MS - (Date.now() - last);
      if (remaining <= 0) {
        logout();
      } else if (remaining <= TAB_WARN_MAX_MS) {
        showExpiryPrompt(remaining);
      }
    }, 5000);
  }

  function populateUserInfo(user) {
    document.querySelectorAll(".user-name").forEach((el) => (el.textContent = user.name));
    document.querySelectorAll(".user-role").forEach((el) => (el.textContent = user.title || user.role));
    document.querySelectorAll(".user-avatar").forEach((el) => {
      if (el.tagName === "IMG") el.src = user.avatar;
    });
    const dropdownEmail = document.getElementById("dropdownUserEmail");
    if (dropdownEmail) dropdownEmail.textContent = user.email;

    // Show role badge in user dropdown if available
    const headerProfile = document.getElementById("headerProfileDropdown");
    if (headerProfile && !document.getElementById("headerUserRoleBadge")) {
      const headerTitle = headerProfile.querySelector(".dropdown-user-header");
      if (headerTitle) {
        const badge = document.createElement("span");
        badge.id = "headerUserRoleBadge";
        badge.className = "card-badge";
        badge.style.marginTop = "0.35rem";
        badge.style.display = "inline-block";
        badge.style.fontSize = "0.7rem";
        if (user.role === "admin") {
          badge.style.background = "var(--danger)";
          badge.style.color = "#ffffff";
          badge.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Administrator';
        } else {
          badge.style.background = "var(--primary)";
          badge.style.color = "var(--btn-primary-text, #ffffff)";
          badge.innerHTML = '<i class="fa-solid fa-user"></i> Employee';
        }
        headerTitle.appendChild(badge);
      }
    }
  }

  // 4. Dynamic Admin Navigation Injection
  function injectAdminNavigation(user) {
    if (user.role !== "admin") return;

    // A. Add "Admin Console" Section in Sidebar ONLY if not already present on admin pages
    const navMenu = document.querySelector(".sidebar-menu");
    const alreadyHasAdminLinks = navMenu && navMenu.querySelector('a[href="admin-dashboard.html"]');
    if (navMenu && !alreadyHasAdminLinks && !document.getElementById("sidebarAdminSection")) {
      const adminSection = document.createElement("div");
      adminSection.id = "sidebarAdminSection";
      adminSection.innerHTML = `
        <div class="menu-category" style="color: var(--danger); font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
          <i class="fa-solid fa-shield-halved"></i> Admin Console
        </div>
        <a href="admin-dashboard.html" class="menu-item ${currentPage === 'admin-dashboard.html' ? 'active' : ''}">
          <i class="fa-solid fa-sliders"></i>
          <span class="menu-label">Executive Control</span>
          <span class="menu-badge" style="background: var(--danger); color: #fff;">Admin</span>
        </a>
        <a href="admin-users.html" class="menu-item ${currentPage === 'admin-users.html' ? 'active' : ''}">
          <i class="fa-solid fa-user-gear"></i>
          <span class="menu-label">Workforce &amp; Roles</span>
          <span class="menu-badge" style="background: var(--bg-surface); color: var(--text-secondary);">Manage</span>
        </a>
        <a href="admin-audit.html" class="menu-item ${currentPage === 'admin-audit.html' ? 'active' : ''}">
          <i class="fa-solid fa-wave-square"></i>
          <span class="menu-label">Live Audit Log</span>
          <span class="menu-badge badge-pulse">Live</span>
        </a>
      `;
      navMenu.insertBefore(adminSection, navMenu.firstChild);
    }

    // B. Add quick topbar "Admin Switcher" link
    const headerRight = document.querySelector(".header-right");
    if (headerRight && !document.getElementById("headerAdminPill")) {
      const adminPill = document.createElement("a");
      adminPill.id = "headerAdminPill";
      if (currentPage.startsWith("admin-")) {
        adminPill.href = "dashboard.html";
        adminPill.className = "btn btn-sm btn-secondary";
        adminPill.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Employee View';
        adminPill.title = "Switch back to standard Employee Portal view";
      } else {
        adminPill.href = "admin-dashboard.html";
        adminPill.className = "btn btn-sm";
        adminPill.style.background = "var(--danger)";
        adminPill.style.color = "#ffffff";
        adminPill.style.fontWeight = "700";
        adminPill.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Admin Console';
        adminPill.title = "Go to Executive & Workforce Administration";
      }
      headerRight.insertBefore(adminPill, headerRight.firstChild);
    }
  }

  // 5. Database Authentication (Login API)
  async function loginWithCredentials(email, password) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Authentication failed");
      }

      // Save database session & profile
      localStorage.setItem("humanly_token", data.token);
      localStorage.setItem("humanly_logged_in", "true");
      localStorage.setItem("humanly_user", JSON.stringify(data.user));

      let targetPage = data.user.role === "admin" ? "admin-dashboard.html" : "dashboard.html";
      if (data.settings && Object.keys(data.settings).length > 0) {
        localStorage.setItem(`humanly_settings_${data.user.id}`, JSON.stringify(data.settings));
        if (data.settings.theme) {
          localStorage.setItem("humanly_theme", data.settings.theme);
          localStorage.setItem("adminator_theme", data.settings.theme);
        }
        if (data.user.role !== "admin" && data.settings.defaultPage) {
          targetPage = data.settings.defaultPage;
        }
      }

      window.location.href = targetPage;
      return { success: true };
    } catch (err) {
      // In case server is accessed statically via file:// or offline fallback:
      if (window.location.protocol === "file:") {
        return fallbackStaticLogin(email, password);
      }
      throw err;
    }
  }

  // 6. User Registration (Register API)
  async function registerAccount(userData) {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Registration failed");
    }

    localStorage.setItem("humanly_token", data.token);
    localStorage.setItem("humanly_logged_in", "true");
    localStorage.setItem("humanly_user", JSON.stringify(data.user));

    if (data.user.role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "dashboard.html";
    }
    return data;
  }

  // 7. Fallback for Static Local Inspection (file:// protocol)
  function fallbackStaticLogin(email, password) {
    const defaultAccounts = [
      {
        email: "admin@humanly.io",
        pass: "Admin@2026!",
        user: {
          id: 1,
          name: "Elena Rostova",
          email: "admin@humanly.io",
          role: "admin",
          department: "Executive Operations",
          title: "VP of People & Culture (Admin)",
          avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80"
        }
      },
      {
        email: "sarah.ops@humanly.io",
        pass: "Humanly@2026!",
        user: {
          id: 2,
          name: "Sarah Jenkins",
          email: "sarah.ops@humanly.io",
          role: "admin",
          department: "People Operations",
          title: "Lead People Ops Manager (Admin)",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80"
        }
      },
      {
        email: "alex.vance@humanly.io",
        pass: "Employee@2026!",
        user: {
          id: 3,
          name: "Alex Vance",
          email: "alex.vance@humanly.io",
          role: "employee",
          department: "Engineering",
          title: "Staff Software Engineer",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
        }
      }
    ];

    const match = defaultAccounts.find(
      (a) => a.email.toLowerCase() === email.toLowerCase() && a.pass === password
    );

    if (match) {
      localStorage.setItem("humanly_token", "static_token_" + Date.now());
      localStorage.setItem("humanly_logged_in", "true");
      localStorage.setItem("humanly_user", JSON.stringify(match.user));
      window.location.href = match.user.role === "admin" ? "admin-dashboard.html" : "dashboard.html";
      return { success: true };
    }

    throw new Error("Invalid credentials. Please verify your email and password.");
  }

  // 8. Logout
  async function logout() {
    try {
      const currentToken = localStorage.getItem("humanly_token");
      if (currentToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentToken}`
          }
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem("humanly_token");
      localStorage.removeItem("humanly_logged_in");
      localStorage.removeItem("humanly_user");
      window.location.href = "login.html";
    }
  }

  function setupLogoutHandlers() {
    document.querySelectorAll(".logout-trigger-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    });
  }

  function getToken() {
    return localStorage.getItem("humanly_token");
  }

  return {
    init,
    loginWithCredentials,
    registerAccount,
    logout,
    getUser: () => currentUser,
    isAdmin: () => currentUser && currentUser.role === "admin",
    getToken
  };
})();

// Execute immediately on DOM ready
document.addEventListener("DOMContentLoaded", AuthGuard.init);

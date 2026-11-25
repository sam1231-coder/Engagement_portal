/**
 * HUMANLY - Enterprise Authentication Guard & RBAC Controller
 * Connects to Database Backend (/api/auth/*) with Session Bearer Tokens,
 * Role-Based Access Control (Admin vs Employee), and Route Protection.
 */

const AuthGuard = (function () {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const isAuthPage = currentPage === "login.html" || currentPage === "register.html";
  const adminOnlyPages = ["admin-dashboard.html", "admin-users.html"];

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
    }
    setupLogoutHandlers();
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

    // A. Add "Admin Console" Section in Sidebar if not already present
    const navMenu = document.querySelector(".sidebar-menu");
    if (navMenu && !document.getElementById("sidebarAdminSection")) {
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
          <i class="fa-solid fa-user-shield"></i>
          <span class="menu-label">User & Roles</span>
          <span class="menu-badge" style="background: var(--bg-surface); color: var(--text-secondary);">Manage</span>
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

      // Route based on role
      if (data.user.role === "admin") {
        window.location.href = "admin-dashboard.html";
      } else {
        window.location.href = "dashboard.html";
      }
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

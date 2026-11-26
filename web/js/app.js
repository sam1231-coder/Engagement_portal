/**
 * HUMANLY - Core Application Controller
 * Handles themes, responsive sidebar, top navbar, command palette (Ctrl+K),
 * Web Audio synthesizer, and toast notifications across all pages.
 */

const App = (function () {
  let audioContext = null;
  let isSoundEnabled = true;
  let isToastEnabled = true;

  const DEFAULT_SETTINGS = {
    theme: "dark",
    accentColor: "",
    soundEnabled: true,
    toastEnabled: true,
    compactDensity: false,
    reduceMotion: false,
    sidebarCollapsed: false,
    weeklyDigest: true,
    defaultPage: "dashboard.html"
  };

  function getUserSettingsKey() {
    try {
      const u = JSON.parse(localStorage.getItem("humanly_user") || "null");
      if (u && u.id) return `humanly_settings_${u.id}`;
    } catch (e) {}
    return "humanly_settings_guest";
  }

  function loadLocalSettings() {
    try {
      const raw = localStorage.getItem(getUserSettingsKey());
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {}
    return {
      ...DEFAULT_SETTINGS,
      theme: localStorage.getItem("humanly_theme") || localStorage.getItem("adminator_theme") || "dark"
    };
  }

  let currentSettings = loadLocalSettings();

  function applyAllSettings(s) {
    currentSettings = { ...DEFAULT_SETTINGS, ...s };
    isSoundEnabled = currentSettings.soundEnabled !== false;
    isToastEnabled = currentSettings.toastEnabled !== false;

    applyTheme(currentSettings.theme || "dark", false);

    if (currentSettings.accentColor) {
      document.documentElement.style.setProperty("--primary", currentSettings.accentColor);
    } else {
      document.documentElement.style.removeProperty("--primary");
    }

    document.documentElement.setAttribute("data-density", currentSettings.compactDensity ? "compact" : "comfortable");
    document.documentElement.setAttribute("data-motion", currentSettings.reduceMotion ? "reduced" : "normal");

    const sidebar = document.getElementById("appSidebar");
    if (sidebar) {
      if (currentSettings.sidebarCollapsed) {
        sidebar.classList.add("collapsed");
      } else {
        sidebar.classList.remove("collapsed");
      }
    }
  }

  async function saveSettings(partial) {
    currentSettings = { ...currentSettings, ...partial };
    localStorage.setItem(getUserSettingsKey(), JSON.stringify(currentSettings));
    applyAllSettings(currentSettings);

    const token = localStorage.getItem("humanly_token");
    if (token) {
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ settings: currentSettings })
        });
        const badge = document.getElementById("settingsSyncStatus");
        if (res.ok && badge) {
          badge.innerHTML = '<i class="fa-solid fa-cloud-check"></i> Synced to Account';
        }
      } catch (e) {
        // Offline / static fallback already saved to per-user localStorage
      }
    }
  }

  async function syncSettingsFromServer() {
    const token = localStorage.getItem("humanly_token");
    if (!token) return;
    try {
      const res = await fetch("/api/settings", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.settings && Object.keys(data.settings).length > 0) {
        localStorage.setItem(getUserSettingsKey(), JSON.stringify({ ...DEFAULT_SETTINGS, ...data.settings }));
        applyAllSettings(data.settings);
        syncSettingsUI();
      }
    } catch (e) {}
  }

  function init() {
    applyAllSettings(currentSettings);
    initTheme();
    initSidebar();
    initHeaderProfileDropdown();
    initCommandPalette();
    initSettingsControls();

    const page = window.location.pathname.split("/").pop() || "";
    const isAuthPage = page === "login.html" || page === "register.html";
    if (!isAuthPage) {
      initScrollUX();
      NotificationCenter.init();
      syncSettingsFromServer();
    }
  }

  // 1. Theme Management (Dark / Light Mode)
  function initTheme() {
    const themeToggleBtn = document.getElementById("themeSwitchBtn");
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        const next = current === "dark" ? "light" : "dark";
        saveSettings({ theme: next });
        syncSettingsUI();
        playSound("click");
      });
    }
  }

  function applyTheme(theme, persist = true) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("humanly_theme", theme);
    localStorage.setItem("adminator_theme", theme);
    if (persist) {
      currentSettings.theme = theme;
      localStorage.setItem(getUserSettingsKey(), JSON.stringify(currentSettings));
    }

    if (typeof Dashboard !== "undefined" && Dashboard.refresh) {
      Dashboard.refresh();
    }
    if (typeof AnalyticsStudio !== "undefined" && AnalyticsStudio.renderDynamicChart) {
      AnalyticsStudio.renderDynamicChart();
    }
  }

  // 2. Sidebar Controls (Desktop Collapse & Mobile Off-canvas Drawer)
  function initSidebar() {
    const sidebar = document.getElementById("appSidebar");
    const collapseBtn = document.getElementById("sidebarCollapseBtn");
    const mobileToggleBtn = document.getElementById("mobileSidebarToggle");

    const isCollapsed = localStorage.getItem("adminator_sidebar_collapsed") === "true";
    if (isCollapsed && sidebar) {
      sidebar.classList.add("collapsed");
    }

    if (collapseBtn && sidebar) {
      collapseBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        const collapsed = sidebar.classList.contains("collapsed");
        localStorage.setItem("adminator_sidebar_collapsed", collapsed);
        saveSettings({ sidebarCollapsed: collapsed });
        syncSettingsUI();
        playSound("click");
      });
    }

    if (mobileToggleBtn && sidebar) {
      mobileToggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("mobile-open");
        playSound("click");
      });
    }
  }

  // 3. User Profile Dropdown in Header
  function initHeaderProfileDropdown() {
    const headerProfileBtn = document.getElementById("headerProfileBtn");
    const headerProfileDropdown = document.getElementById("headerProfileDropdown");

    if (headerProfileBtn && headerProfileDropdown) {
      headerProfileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        headerProfileDropdown.classList.toggle("show");
        playSound("click");
      });

      document.addEventListener("click", () => {
        headerProfileDropdown.classList.remove("show");
      });
    }
  }

  // 4. Global Command Palette (Ctrl + K)
  function initCommandPalette() {
    const modal = document.getElementById("commandPaletteModal");
    const input = document.getElementById("commandPaletteInput");
    const shortcutTriggers = document.querySelectorAll("[data-open-palette]");

    const openPalette = () => {
      if (modal) {
        modal.classList.add("active");
        if (input) {
          input.value = "";
          input.focus();
        }
        renderPaletteItems("");
        playSound("click");
      }
    };

    const closePalette = () => {
      if (modal) modal.classList.remove("active");
    };

    shortcutTriggers.forEach((el) => el.addEventListener("click", openPalette));

    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (modal && modal.classList.contains("active")) {
          closePalette();
        } else {
          openPalette();
        }
      }
      if (e.key === "Escape" && modal && modal.classList.contains("active")) {
        closePalette();
      }
    });

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closePalette();
      });
    }

    if (input) {
      input.addEventListener("input", (e) => {
        renderPaletteItems(e.target.value);
      });
    }
  }

  const paletteCommands = [
    { title: "Admin Console & Executive Control", category: "Admin", icon: "fa-shield-halved", action: () => (window.location.href = "admin-dashboard.html") },
    { title: "Workforce & Role Management", category: "Admin", icon: "fa-user-gear", action: () => (window.location.href = "admin-users.html") },
    { title: "Real-Time Employee Audit Log", category: "Admin", icon: "fa-wave-square", action: () => (window.location.href = "admin-audit.html") },
    { title: "Dashboard Overview", category: "Navigation", icon: "fa-gauge", action: () => (window.location.href = "dashboard.html") },
    { title: "Document Analytics Studio", category: "Navigation", icon: "fa-chart-pie", action: () => (window.location.href = "analytics.html") },
    { title: "Review and survey", category: "Navigation", icon: "fa-clipboard-question", action: () => (window.location.href = "surveys.html") },
    { title: "Team and social", category: "Navigation", icon: "fa-award", action: () => (window.location.href = "kudos.html") },
    { title: "Calendar & Meetings", category: "Navigation", icon: "fa-calendar-days", action: () => (window.location.href = "calendar.html") },
    { title: "Team Directory & Retention", category: "Navigation", icon: "fa-users", action: () => (window.location.href = "directory.html") },
    { title: "Settings & Appearance", category: "Navigation", icon: "fa-sliders", action: () => (window.location.href = "settings.html") },
    { title: "Upload Excel / CSV / PDF", category: "Actions", icon: "fa-cloud-arrow-up", action: () => (window.location.href = "analytics.html") },
    { title: "Schedule 1-on-1 Meeting", category: "Actions", icon: "fa-calendar-plus", action: () => (window.location.href = "calendar.html") },
    { title: "Toggle Dark / Light Theme", category: "Preferences", icon: "fa-circle-half-stroke", action: () => document.getElementById("themeSwitchBtn")?.click() },
    { title: "Sign Out", category: "Account", icon: "fa-arrow-right-from-bracket", action: () => AuthGuard.logout() }
  ];

  function renderPaletteItems(query) {
    const container = document.getElementById("paletteResults");
    if (!container) return;

    const filtered = paletteCommands.filter(
      (cmd) => cmd.title.toLowerCase().includes(query.toLowerCase()) || cmd.category.toLowerCase().includes(query.toLowerCase())
    );

    container.innerHTML = "";
    if (filtered.length === 0) {
      container.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No commands matching "${query}"</div>`;
      return;
    }

    filtered.forEach((cmd) => {
      const item = document.createElement("div");
      item.className = "palette-item";
      item.innerHTML = `
        <div class="palette-item-left">
          <div class="palette-item-icon"><i class="fa-solid ${cmd.icon}"></i></div>
          <div>
            <div class="palette-item-title">${cmd.title}</div>
            <div class="palette-item-category">${cmd.category}</div>
          </div>
        </div>
        <span style="font-size: 0.7rem; color: var(--text-muted);"><i class="fa-solid fa-arrow-turn-down"></i> Jump</span>
      `;

      item.addEventListener("click", () => {
        const modal = document.getElementById("commandPaletteModal");
        if (modal) modal.classList.remove("active");
        cmd.action();
      });

      container.appendChild(item);
    });
  }

  // 5. Native Web Audio Synthesizer
  function playSound(type) {
    if (!isSoundEnabled) return;
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);

      const now = audioContext.currentTime;

      if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.04);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === "pop") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === "success") {
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const subOsc = audioContext.createOscillator();
          const subGain = audioContext.createGain();
          subOsc.type = "sine";
          subOsc.frequency.setValueAtTime(freq, now + idx * 0.05);
          subGain.gain.setValueAtTime(0.05, now + idx * 0.05);
          subGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
          subOsc.connect(subGain);
          subGain.connect(audioContext.destination);
          subOsc.start(now + idx * 0.05);
          subOsc.stop(now + idx * 0.05 + 0.2);
        });
      }
    } catch (e) {
      // Audio fallback
    }
  }

  // 6. Toast Notifications
  function showToast(title, message, type = "info") {
    if (!isToastEnabled && type !== "danger") return;
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";

    let iconHtml = '<i class="fa-solid fa-circle-info" style="color: var(--primary);"></i>';
    if (type === "success") iconHtml = '<i class="fa-solid fa-circle-check" style="color: var(--success);"></i>';
    if (type === "warning") iconHtml = '<i class="fa-solid fa-triangle-exclamation" style="color: var(--warning);"></i>';
    if (type === "danger") iconHtml = '<i class="fa-solid fa-circle-xmark" style="color: var(--danger);"></i>';

    toast.innerHTML = `
      <div class="toast-icon">${iconHtml}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-desc">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
    }, 3800);
  }

  function syncSettingsUI() {
    const soundToggle = document.getElementById("settingsSoundToggle");
    if (soundToggle) soundToggle.checked = currentSettings.soundEnabled !== false;

    const toastToggle = document.getElementById("settingsToastToggle");
    if (toastToggle) toastToggle.checked = currentSettings.toastEnabled !== false;

    const compactToggle = document.getElementById("settingsCompactToggle");
    if (compactToggle) compactToggle.checked = !!currentSettings.compactDensity;

    const motionToggle = document.getElementById("settingsReduceMotionToggle");
    if (motionToggle) motionToggle.checked = !!currentSettings.reduceMotion;

    const sidebarToggle = document.getElementById("settingsSidebarToggle");
    if (sidebarToggle) sidebarToggle.checked = !!currentSettings.sidebarCollapsed;

    const digestToggle = document.getElementById("settingsDigestToggle");
    if (digestToggle) digestToggle.checked = currentSettings.weeklyDigest !== false;

    const defaultPageSel = document.getElementById("settingsDefaultPage");
    if (defaultPageSel && currentSettings.defaultPage) defaultPageSel.value = currentSettings.defaultPage;

    document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-theme-choice") === currentSettings.theme);
    });

    document.querySelectorAll(".accent-color-pill").forEach((pill) => {
      const isActive = pill.getAttribute("data-color") === currentSettings.accentColor;
      pill.classList.toggle("active", isActive);
      pill.style.borderColor = isActive ? "var(--text-primary)" : "transparent";
    });
  }

  // 7. Settings Controls
  function initSettingsControls() {
    syncSettingsUI();

    document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosen = btn.getAttribute("data-theme-choice");
        saveSettings({ theme: chosen });
        syncSettingsUI();
        playSound("click");
        showToast("Theme Updated", `Switched to ${chosen} mode`, "success");
      });
    });

    document.getElementById("settingsSoundToggle")?.addEventListener("change", (e) => {
      saveSettings({ soundEnabled: e.target.checked });
      showToast("Audio Setting", e.target.checked ? "Interactive sound enabled" : "Interactive sound muted", "info");
    });

    document.getElementById("settingsToastToggle")?.addEventListener("change", (e) => {
      saveSettings({ toastEnabled: e.target.checked });
      if (e.target.checked) showToast("Notifications", "Toast alerts enabled", "info");
    });

    document.getElementById("settingsCompactToggle")?.addEventListener("change", (e) => {
      saveSettings({ compactDensity: e.target.checked });
      playSound("click");
      showToast("Layout Density", e.target.checked ? "Compact mode enabled" : "Comfortable mode enabled", "success");
    });

    document.getElementById("settingsReduceMotionToggle")?.addEventListener("change", (e) => {
      saveSettings({ reduceMotion: e.target.checked });
      showToast("Motion Preference", e.target.checked ? "Reduced motion enabled" : "Animations enabled", "info");
    });

    document.getElementById("settingsSidebarToggle")?.addEventListener("change", (e) => {
      saveSettings({ sidebarCollapsed: e.target.checked });
      playSound("click");
      showToast("Sidebar", e.target.checked ? "Sidebar auto-collapse enabled" : "Sidebar expanded", "info");
    });

    document.getElementById("settingsDigestToggle")?.addEventListener("change", (e) => {
      saveSettings({ weeklyDigest: e.target.checked });
      showToast("Digest Saved", e.target.checked ? "Weekly engagement digest enabled" : "Weekly digest paused", "info");
    });

    document.getElementById("settingsDefaultPage")?.addEventListener("change", (e) => {
      saveSettings({ defaultPage: e.target.value });
      showToast("Landing Page Saved", "Default workspace updated", "success");
    });

    const colorPills = document.querySelectorAll(".accent-color-pill");
    colorPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        const primaryColor = pill.getAttribute("data-color");
        saveSettings({ accentColor: primaryColor });
        syncSettingsUI();
        playSound("click");
        showToast("Theme Updated", "Accent color saved to your account", "success");
      });
    });

    document.getElementById("resetSettingsBtn")?.addEventListener("click", () => {
      saveSettings({ ...DEFAULT_SETTINGS });
      syncSettingsUI();
      playSound("pop");
      showToast("Settings Reset", "Restored default preferences", "info");
    });

    // Populate & handle Profile Update Form on settings.html
    const profileForm = document.getElementById("profileUpdateForm");
    if (profileForm) {
      let currentU = null;
      try {
        currentU = JSON.parse(localStorage.getItem("humanly_user") || "null");
      } catch (e) {}

      const isAdminUser = currentU && currentU.role === "admin";
      const adminFields = document.getElementById("adminOnlyProfileFields");
      const roInfo = document.getElementById("employeeReadOnlyInfo");
      const lockNote = document.getElementById("employeeProfileLockNote");

      if (currentU) {
        if (isAdminUser) {
          if (adminFields) adminFields.style.display = "grid";
          if (roInfo) roInfo.style.display = "none";
          if (lockNote) lockNote.style.display = "none";
          document.getElementById("profileNameInput").value = currentU.name || "";
          document.getElementById("profileTitleInput").value = currentU.title || "";
          document.getElementById("profileDeptInput").value = currentU.department || "";
        } else {
          if (adminFields) adminFields.style.display = "none";
          if (roInfo) roInfo.style.display = "grid";
          if (lockNote) lockNote.style.display = "block";
          const roName = document.getElementById("roProfileName");
          const roTitle = document.getElementById("roProfileTitle");
          const roDept = document.getElementById("roProfileDept");
          if (roName) roName.textContent = currentU.name || "--";
          if (roTitle) roTitle.textContent = currentU.title || "--";
          if (roDept) roDept.textContent = currentU.department || "--";
        }
        document.getElementById("profileStatusInput").value = currentU.status || "Online";
      }

      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = isAdminUser
          ? {
              name: document.getElementById("profileNameInput").value.trim(),
              title: document.getElementById("profileTitleInput").value.trim(),
              department: document.getElementById("profileDeptInput").value.trim(),
              status: document.getElementById("profileStatusInput").value
            }
          : {
              status: document.getElementById("profileStatusInput").value
            };

        try {
          const res = await fetch("/api/auth/profile", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("humanly_token")}`
            },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.message);
          localStorage.setItem("humanly_user", JSON.stringify(data.user));
          document.querySelectorAll(".user-name").forEach(el => (el.textContent = data.user.name));
          document.querySelectorAll(".user-role").forEach(el => (el.textContent = data.user.title));
          playSound("success");
          showToast("Status Saved", isAdminUser ? "Your profile has been updated" : `Availability status updated to ${data.user.status}`, "success");
        } catch (err) {
          showToast("Error", err.message || "Could not update profile", "danger");
        }
      });
    }

    // Handle Change Password Form on settings.html
    document.getElementById("changePasswordForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById("currentPwInput").value;
      const newPassword = document.getElementById("newPwInput").value;
      const confirmPw = document.getElementById("confirmPwInput").value;

      if (newPassword !== confirmPw) {
        showToast("Mismatch", "New passwords do not match", "danger");
        return;
      }

      try {
        const res = await fetch("/api/auth/password", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("humanly_token")}`
          },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message);
        e.target.reset();
        playSound("success");
        showToast("Password Changed", "Your new password is active", "success");
      } catch (err) {
        showToast("Password Error", err.message || "Failed to update password", "danger");
      }
    });
  }

  // 7b. Scroll & Navigation UX (Reveal cards + Scroll-to-Top button)
  function initScrollUX() {
    if (document.querySelector(".app-main")) {
      const scrollBtn = document.createElement("button");
      scrollBtn.className = "scroll-top-btn";
      scrollBtn.title = "Scroll to top";
      scrollBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
      document.body.appendChild(scrollBtn);

      window.addEventListener("scroll", () => {
        scrollBtn.classList.toggle("visible", window.scrollY > 260);
      }, { passive: true });

      scrollBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        playSound("click");
      });
    }

    if ("IntersectionObserver" in window) {
      const cards = document.querySelectorAll(".app-content .card");
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-in");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.06 });

      cards.forEach((c, idx) => {
        c.style.transitionDelay = `${Math.min(idx * 35, 180)}ms`;
        observer.observe(c);
      });
    }
  }

  // 8. Notification Center Management (Red dot appears ONLY when there are unread notifications)
  const NotificationCenter = (function () {
    const STORAGE_KEY = "adminator_notifications_data";

    function getNotifications() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          // fallback
        }
      }
      const initial = typeof SampleData !== "undefined" && SampleData.notifications ? SampleData.notifications : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    function saveNotifications(notifs) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
      updateUI();
    }

    function updateUI() {
      const notifs = getNotifications();
      const unreadCount = notifs.filter((n) => !n.read).length;

      // Update Red Dot on Bell Button: visible ONLY when unreadCount > 0
      const dot = document.getElementById("notificationDot");
      if (dot) {
        if (unreadCount > 0) {
          dot.classList.add("active");
        } else {
          dot.classList.remove("active");
        }
      }

      // Update Header Unread Badge in dropdown header
      const badge = document.getElementById("notificationsUnreadCountBadge");
      if (badge) {
        badge.textContent = `${unreadCount} new`;
        badge.style.display = unreadCount > 0 ? "inline-block" : "none";
      }

      // Populate Notifications List
      const listContainer = document.getElementById("notificationsListContainer");
      if (!listContainer) return;

      if (notifs.length === 0) {
        listContainer.innerHTML = `
          <div class="notification-empty-state">
            <i class="fa-regular fa-bell-slash"></i>
            <p>No notifications available</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = notifs
        .map(
          (n) => `
        <div class="notification-item ${!n.read ? "unread" : ""}" data-id="${n.id}" data-url="${n.url || "#"}">
          <div class="notification-item-icon ${n.type || "system"}">
            <i class="${n.icon || "fa-solid fa-bell"}"></i>
          </div>
          <div class="notification-item-content">
            <div class="notification-item-title">${n.title}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.35; margin: 0.2rem 0;">${n.message}</div>
            <div class="notification-item-time">${n.time}</div>
          </div>
        </div>
      `
        )
        .join("");

      // Bind click on items
      listContainer.querySelectorAll(".notification-item").forEach((el) => {
        el.addEventListener("click", () => {
          const id = el.getAttribute("data-id");
          const url = el.getAttribute("data-url");
          markAsRead(id);
          if (url && url !== "#") {
            window.location.href = url;
          }
        });
      });
    }

    function markAsRead(id) {
      const notifs = getNotifications();
      const item = notifs.find((n) => n.id === id);
      if (item && !item.read) {
        item.read = true;
        saveNotifications(notifs);
      }
    }

    function markAllAsRead() {
      const notifs = getNotifications();
      notifs.forEach((n) => (n.read = true));
      saveNotifications(notifs);
      showToast("Notifications", "All notifications marked as read", "info");
    }

    function addNotification(title, message, type = "info", url = "#") {
      const notifs = getNotifications();
      const newNotif = {
        id: "notif-" + Date.now(),
        title,
        message,
        time: "Just now",
        type,
        icon:
          type === "survey"
            ? "fa-solid fa-square-poll-vertical"
            : type === "kudo"
            ? "fa-solid fa-award"
            : type === "calendar"
            ? "fa-solid fa-calendar-check"
            : "fa-solid fa-circle-info",
        read: false,
        url
      };
      notifs.unshift(newNotif);
      saveNotifications(notifs);
      playSound("pop");
      showToast(title, message, type);
    }

    function showBroadcastPopup(ann) {
      const existing = document.querySelector(`.broadcast-popup-banner[data-ann-id="${ann.id}"]`);
      if (existing) return;

      const prioColor = ann.priority === "critical" ? "var(--danger)" : ann.priority === "urgent" ? "var(--warning)" : "var(--primary)";
      const popup = document.createElement("div");
      popup.className = "broadcast-popup-banner";
      popup.setAttribute("data-ann-id", ann.id);
      popup.style.borderLeft = `4px solid ${prioColor}`;
      popup.innerHTML = `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-bullhorn" style="color: ${prioColor};"></i>
            <strong style="font-size: 0.88rem; color: var(--text-primary);">${ann.title}</strong>
            <span class="card-badge" style="font-size: 0.62rem; text-transform: uppercase;">${ann.priority || "notice"}</span>
          </div>
          <button type="button" class="broadcast-close-btn" title="Dismiss" style="color: var(--text-muted); font-size: 0.9rem;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.45rem 0; line-height: 1.45;">${ann.message}</p>
        <div style="font-size: 0.7rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
          <span>From ${ann.author_name || "Admin"}</span>
          <span>${ann.created_at || "Just now"}</span>
        </div>
      `;

      popup.querySelector(".broadcast-close-btn")?.addEventListener("click", () => {
        popup.classList.remove("show");
        setTimeout(() => popup.remove(), 250);
      });

      document.body.appendChild(popup);
      requestAnimationFrame(() => popup.classList.add("show"));
      playSound("pop");

      setTimeout(() => {
        if (popup.parentNode) {
          popup.classList.remove("show");
          setTimeout(() => popup.remove(), 250);
        }
      }, 12000);
    }

    async function pollBroadcastAnnouncements() {
      const token = localStorage.getItem("humanly_token");
      if (!token) return;
      let uid = "guest";
      try {
        const u = JSON.parse(localStorage.getItem("humanly_user") || "null");
        if (u && u.id) uid = u.id;
      } catch (e) {}

      const seenKey = `humanly_seen_ann_${uid}`;
      let seenIds = [];
      try {
        seenIds = JSON.parse(localStorage.getItem(seenKey) || "[]");
      } catch (e) { seenIds = []; }

      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const data = await res.json();
        const anns = data.announcements || [];
        if (!anns.length) return;

        const unseen = anns.filter(a => !seenIds.includes(a.id));
        if (unseen.length > 0) {
          const notifs = getNotifications();
          unseen.slice().reverse().forEach(ann => {
            notifs.unshift({
              id: `ann-${ann.id}`,
              title: `Broadcast: ${ann.title}`,
              message: ann.message,
              time: ann.created_at || "Just now",
              type: "system",
              icon: "fa-solid fa-bullhorn",
              read: false,
              url: "#"
            });
            seenIds.push(ann.id);
            showBroadcastPopup(ann);
          });
          localStorage.setItem(seenKey, JSON.stringify(seenIds.slice(-50)));
          saveNotifications(notifs.slice(0, 30));
        }
      } catch (e) {}
    }

    function init() {
      const bellBtn = document.getElementById("notificationsBellBtn");
      const dropdown = document.getElementById("notificationsDropdown");
      const markAllBtn = document.getElementById("markAllNotificationsReadBtn");

      if (bellBtn && dropdown) {
        bellBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdown.classList.toggle("show");
          playSound("click");
          document.getElementById("headerProfileDropdown")?.classList.remove("show");
        });

        document.addEventListener("click", (e) => {
          if (!dropdown.contains(e.target) && e.target !== bellBtn) {
            dropdown.classList.remove("show");
          }
        });
      }

      if (markAllBtn) {
        markAllBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          markAllAsRead();
        });
      }

      updateUI();
      pollBroadcastAnnouncements();
      setInterval(pollBroadcastAnnouncements, 6000);
    }

    return {
      init,
      updateUI,
      markAllAsRead,
      markAsRead,
      addNotification
    };
  })();

  return {
    init,
    playSound,
    showToast,
    NotificationCenter,
    addNotification: NotificationCenter.addNotification
  };
})();

document.addEventListener("DOMContentLoaded", App.init);

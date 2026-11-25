/**
 * HUMANLY - Core Application Controller
 * Handles themes, responsive sidebar, top navbar, command palette (Ctrl+K),
 * Web Audio synthesizer, and toast notifications across all pages.
 */

const App = (function () {
  let audioContext = null;
  let isSoundEnabled = true;

  function init() {
    initTheme();
    initSidebar();
    initHeaderProfileDropdown();
    initCommandPalette();
    initSettingsControls();
    NotificationCenter.init();
  }

  // 1. Theme Management (Dark / Light Mode)
  function initTheme() {
    const savedTheme = localStorage.getItem("humanly_theme") || localStorage.getItem("adminator_theme") || "dark";
    applyTheme(savedTheme);

    const themeToggleBtn = document.getElementById("themeSwitchBtn");
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
        playSound("click");
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("humanly_theme", theme);
    localStorage.setItem("adminator_theme", theme);

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
        localStorage.setItem("adminator_sidebar_collapsed", sidebar.classList.contains("collapsed"));
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

  // 7. Settings Controls
  function initSettingsControls() {
    const soundToggle = document.getElementById("settingsSoundToggle");
    if (soundToggle) {
      soundToggle.addEventListener("change", (e) => {
        isSoundEnabled = e.target.checked;
        showToast("Audio Setting", isSoundEnabled ? "Interactive sound enabled" : "Interactive sound muted", "info");
      });
    }

    const colorPills = document.querySelectorAll(".accent-color-pill");
    colorPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        const primaryColor = pill.getAttribute("data-color");
        document.documentElement.style.setProperty("--primary", primaryColor);
        colorPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        showToast("Theme Updated", `Applied executive palette accent`, "success");
      });
    });
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

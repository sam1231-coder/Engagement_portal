/**
 * HUMANLY - Real-Time Audit Log Controller
 * Polls /api/admin/audit-logs every 4s to track employee & admin activity live.
 */

document.addEventListener("DOMContentLoaded", () => {
  const user = AuthGuard.getUser();
  if (!user || user.role !== "admin") return;

  const tbody = document.getElementById("fullAuditTableBody");
  const countEl = document.getElementById("auditEventCount");
  const searchInput = document.getElementById("auditPageSearchInput");
  const toggleBtn = document.getElementById("toggleLiveStreamBtn");
  const liveIndicator = document.getElementById("auditLiveIndicator");
  const filterPills = document.querySelectorAll("[data-audit-filter]");

  let allLogs = [];
  let activeFilter = "all";
  let searchQuery = "";
  let isLive = true;
  let pollInterval = null;

  async function fetchLogs() {
    try {
      const res = await fetch("/api/admin/audit-logs", {
        headers: { "Authorization": `Bearer ${AuthGuard.getToken()}` }
      });
      if (res.status === 401 || res.status === 403) {
        AuthGuard.logout();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      allLogs = data.logs || [];
      renderLogs();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger); padding: 1.5rem;">Unable to load audit logs: ${err.message}</td></tr>`;
    }
  }

  function renderLogs() {
    const filtered = allLogs.filter(log => {
      const action = (log.action || "").toUpperCase();
      let matchesFilter = true;
      if (activeFilter === "PAGE_VIEW") matchesFilter = action === "PAGE_VIEW";
      else if (activeFilter === "LOGIN") matchesFilter = action.includes("LOGIN") || action.includes("LOGOUT");
      else if (activeFilter === "USER") matchesFilter = action.includes("USER") || action.includes("ROLE") || action.includes("PASSWORD") || action.includes("PROFILE");
      else if (activeFilter === "SURVEY") matchesFilter = action.includes("SURVEY") || action.includes("KUDOS");

      const matchesSearch = !searchQuery ||
        action.toLowerCase().includes(searchQuery) ||
        (log.user_email || "").toLowerCase().includes(searchQuery) ||
        (log.details || "").toLowerCase().includes(searchQuery);

      return matchesFilter && matchesSearch;
    });

    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching activity events found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(log => {
      let badgeColor = "var(--primary)";
      let textColor = "var(--btn-primary-text, #fff)";
      if (log.action.includes("FAILED") || log.action.includes("DELETED") || log.action.includes("PASSWORD")) {
        badgeColor = "var(--danger)";
        textColor = "#fff";
      } else if (log.action.includes("ROLE") || log.action.includes("ADMIN") || log.action.includes("LOGOUT")) {
        badgeColor = "#d97706";
        textColor = "#fff";
      } else if (log.action.includes("SUCCESS") || log.action.includes("CREATED") || log.action.includes("KUDOS") || log.action.includes("SURVEY")) {
        badgeColor = "var(--success)";
        textColor = "#fff";
      }

      return `
        <tr>
          <td style="color: var(--text-muted); font-size: 0.76rem; white-space: nowrap;">${log.created_at}</td>
          <td>
            <span class="card-badge" style="font-size: 0.68rem; background: ${badgeColor}; color: ${textColor};">
              ${log.action}
            </span>
          </td>
          <td style="font-weight: 600; color: var(--text-primary);">${log.user_email || "System"}</td>
          <td style="color: var(--text-secondary);">${log.details || ""}</td>
          <td style="color: var(--text-muted); font-size: 0.76rem;">${log.ip_address || "127.0.0.1"}</td>
        </tr>
      `;
    }).join("");
  }

  filterPills.forEach(pill => {
    pill.addEventListener("click", () => {
      filterPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeFilter = pill.getAttribute("data-audit-filter");
      renderLogs();
      App.playSound("click");
    });
  });

  searchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderLogs();
  });

  document.getElementById("manualRefreshAuditBtn")?.addEventListener("click", () => {
    fetchLogs();
    App.playSound("click");
    App.showToast("Refreshed", "Audit log synced with database", "info");
  });

  toggleBtn?.addEventListener("click", () => {
    isLive = !isLive;
    if (isLive) {
      toggleBtn.innerHTML = '<i class="fa-solid fa-circle-pause"></i> Pause Live (4s)';
      if (liveIndicator) {
        liveIndicator.style.color = "var(--success)";
        liveIndicator.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 0.55rem;"></i> Live';
      }
      fetchLogs();
    } else {
      toggleBtn.innerHTML = '<i class="fa-solid fa-circle-play"></i> Resume Live';
      if (liveIndicator) {
        liveIndicator.style.color = "var(--text-muted)";
        liveIndicator.innerHTML = '<i class="fa-solid fa-pause" style="font-size: 0.65rem;"></i> Paused';
      }
    }
  });

  document.getElementById("exportFullAuditBtn")?.addEventListener("click", () => {
    if (!allLogs.length) return;
    const rows = [["ID", "Timestamp", "Action", "User", "Details", "IP"]];
    allLogs.forEach(l => {
      rows.push([l.id, l.created_at, l.action, l.user_email || "System", (l.details || "").replace(/,/g, ";"), l.ip_address || "127.0.0.1"]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `humanly_realtime_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    App.playSound("success");
    App.showToast("Exported", "Audit log CSV downloaded", "success");
  });

  fetchLogs();
  pollInterval = setInterval(() => {
    if (isLive) fetchLogs();
  }, 4000);
});

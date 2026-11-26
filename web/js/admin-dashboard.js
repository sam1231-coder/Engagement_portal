/**
 * HUMANLY - Admin Dashboard Controller
 * Connects to /api/admin/stats, /api/admin/audit-logs, /api/surveys, and /api/announcements.
 */

document.addEventListener("DOMContentLoaded", () => {
  const user = AuthGuard.getUser();
  if (!user || user.role !== "admin") return;

  const totalUsersEl = document.getElementById("adminTotalUsers");
  const roleRatioEl = document.getElementById("adminRoleRatio");
  const activeSurveysEl = document.getElementById("adminActiveSurveys");
  const totalResponsesEl = document.getElementById("adminTotalResponses");
  const totalKudosEl = document.getElementById("adminTotalKudos");
  const totalAuditEl = document.getElementById("adminTotalAudit");
  const auditBody = document.getElementById("adminAuditLogBody");
  const deptList = document.getElementById("deptDistributionList");
  const surveysListEl = document.getElementById("adminSurveysList");
  const annListEl = document.getElementById("adminAnnouncementsList");

  let allAuditLogs = [];

  // Modals (use .active class consistent with components.css)
  const surveyModal = document.getElementById("launchSurveyModal");
  const broadcastModal = document.getElementById("broadcastModal");

  const openSurveyModal = () => surveyModal?.classList.add("active");
  const closeSurveyModal = () => surveyModal?.classList.remove("active");
  const openBroadcastModal = () => broadcastModal?.classList.add("active");
  const closeBroadcastModal = () => broadcastModal?.classList.remove("active");

  document.getElementById("openNewSurveyModalBtn")?.addEventListener("click", openSurveyModal);
  document.getElementById("openNewSurveyModalBtn2")?.addEventListener("click", openSurveyModal);
  document.getElementById("closeSurveyModalBtn")?.addEventListener("click", closeSurveyModal);
  document.getElementById("cancelSurveyModalBtn")?.addEventListener("click", closeSurveyModal);

  document.getElementById("openBroadcastModalBtn")?.addEventListener("click", openBroadcastModal);
  document.getElementById("openBroadcastModalBtn2")?.addEventListener("click", openBroadcastModal);
  document.getElementById("closeBroadcastModalBtn")?.addEventListener("click", closeBroadcastModal);
  document.getElementById("cancelBroadcastModalBtn")?.addEventListener("click", closeBroadcastModal);

  surveyModal?.addEventListener("click", (e) => { if (e.target === surveyModal) closeSurveyModal(); });
  broadcastModal?.addEventListener("click", (e) => { if (e.target === broadcastModal) closeBroadcastModal(); });

  document.getElementById("refreshAuditBtn")?.addEventListener("click", () => {
    loadAuditLogs();
    loadAdminStats();
    App.playSound("click");
    App.showToast("Refreshed", "Audit log and telemetry synced with database", "info");
  });

  document.getElementById("auditSearchInput")?.addEventListener("input", (e) => {
    renderAuditLogs(e.target.value.toLowerCase().trim());
  });

  document.getElementById("exportAuditBtn")?.addEventListener("click", () => {
    if (!allAuditLogs.length) return;
    const rows = [["ID", "Timestamp", "Action", "User", "Details", "IP"]];
    allAuditLogs.forEach(l => {
      rows.push([l.id, l.created_at, l.action, l.user_email || "System", (l.details || "").replace(/,/g, ";"), l.ip_address || "127.0.0.1"]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `humanly_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    App.playSound("success");
    App.showToast("Exported", "Audit log CSV downloaded", "success");
  });

  // Load Admin Telemetry
  async function loadAdminStats() {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "Authorization": `Bearer ${AuthGuard.getToken()}` }
      });
      if (res.status === 401 || res.status === 403) {
        AuthGuard.logout();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      const s = data.stats;
      totalUsersEl.textContent = s.totalUsers;
      roleRatioEl.textContent = `${s.adminCount} Admins | ${s.employeeCount} Employees`;
      activeSurveysEl.textContent = s.activeSurveys;
      if (totalResponsesEl) totalResponsesEl.textContent = `${s.totalSurveyResponses || 0} responses logged`;
      totalKudosEl.textContent = s.totalKudos.toLocaleString();
      totalAuditEl.textContent = s.totalAuditEvents;

      const badge = document.getElementById("sidebarUserCountBadge");
      if (badge) badge.textContent = `${s.totalUsers} Users`;

      if (s.departmentBreakdown && deptList) {
        deptList.innerHTML = s.departmentBreakdown.map(d => {
          const pct = s.totalUsers ? Math.round((d.count / s.totalUsers) * 100) : 0;
          return `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.3rem;">
                <span style="font-weight: 600;">${d.department}</span>
                <strong style="color: var(--primary);">${d.count} Members (${pct}%)</strong>
              </div>
              <div style="height: 7px; background: var(--bg-subtle); border-radius: 99px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background: var(--primary); border-radius: 99px; transition: width 0.4s ease;"></div>
              </div>
            </div>
          `;
        }).join("");
      }
    } catch (err) {
      console.warn("Failed to load admin stats", err);
    }
  }

  // Load Audit Logs
  async function loadAuditLogs() {
    try {
      const res = await fetch("/api/admin/audit-logs", {
        headers: { "Authorization": `Bearer ${AuthGuard.getToken()}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      allAuditLogs = data.logs || [];
      renderAuditLogs(document.getElementById("auditSearchInput")?.value.toLowerCase().trim() || "");
    } catch (err) {
      auditBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--danger); padding: 1.5rem;">Failed to load audit logs.</td></tr>';
    }
  }

  function renderAuditLogs(query) {
    const filtered = allAuditLogs.filter(log => {
      if (!query) return true;
      return (
        log.action.toLowerCase().includes(query) ||
        (log.user_email || "").toLowerCase().includes(query) ||
        (log.details || "").toLowerCase().includes(query)
      );
    });

    if (filtered.length === 0) {
      auditBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No matching audit logs found.</td></tr>';
      return;
    }

    auditBody.innerHTML = filtered.map(log => {
      let actionBadgeColor = "var(--primary)";
      let textColor = "var(--btn-primary-text, #fff)";
      if (log.action.includes("FAILED") || log.action.includes("DELETED") || log.action.includes("PASSWORD")) {
        actionBadgeColor = "var(--danger)";
        textColor = "#fff";
      } else if (log.action.includes("ROLE") || log.action.includes("ADMIN")) {
        actionBadgeColor = "#d97706";
        textColor = "#fff";
      } else if (log.action.includes("SURVEY") || log.action.includes("SUCCESS") || log.action.includes("CREATED")) {
        actionBadgeColor = "var(--success)";
        textColor = "#fff";
      }

      return `
        <tr>
          <td style="color: var(--text-muted); font-size: 0.72rem; white-space: nowrap;">${log.created_at}</td>
          <td>
            <span class="card-badge" style="font-size: 0.65rem; background: ${actionBadgeColor}; color: ${textColor};">
              ${log.action}
            </span>
          </td>
          <td style="font-weight: 600; color: var(--text-primary); font-size: 0.78rem;">${log.user_email || "System"}</td>
          <td style="color: var(--text-secondary); font-size: 0.75rem;">${log.details || ""}</td>
        </tr>
      `;
    }).join("");
  }

  // Load & Manage Surveys
  async function loadSurveys() {
    if (!surveysListEl) return;
    try {
      const res = await fetch("/api/surveys");
      const data = await res.json();
      const surveys = data.surveys || [];
      const badge = document.getElementById("adminSurveyCountBadge");
      if (badge) badge.textContent = `${surveys.length} Total`;

      if (surveys.length === 0) {
        surveysListEl.innerHTML = '<div style="color: var(--text-muted); font-size: 0.82rem; padding: 1rem 0;">No review campaigns yet.</div>';
        return;
      }

      surveysListEl.innerHTML = surveys.map(s => {
        const isActive = s.status === "Active";
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 0.9rem; background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
            <div style="min-width: 0;">
              <div style="font-weight: 700; font-size: 0.84rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.title}</div>
              <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 0.15rem;">
                <span>${s.department}</span> • <span>${s.participation}% (${s.responses_count}/${s.total_target})</span> • <span>Due ${s.deadline}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
              <button class="btn btn-sm btn-secondary toggle-survey-btn" data-id="${s.id}" data-next="${isActive ? 'Closed' : 'Active'}" title="${isActive ? 'Close Campaign' : 'Reopen Campaign'}">
                <span style="color: ${isActive ? 'var(--success)' : 'var(--text-muted)'}; font-weight: 700;">${s.status}</span>
              </button>
              <button class="btn btn-sm btn-secondary delete-survey-btn" data-id="${s.id}" data-title="${s.title}" style="color: var(--danger);" title="Delete Campaign">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        `;
      }).join("");

      surveysListEl.querySelectorAll(".toggle-survey-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const next = btn.getAttribute("data-next");
          const res = await fetch(`/api/surveys/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AuthGuard.getToken()}` },
            body: JSON.stringify({ status: next })
          });
          if (res.ok) {
            App.playSound("click");
            App.showToast("Campaign Updated", `Survey status set to ${next}`, "success");
            loadSurveys();
            loadAdminStats();
            loadAuditLogs();
          }
        });
      });

      surveysListEl.querySelectorAll(".delete-survey-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const title = btn.getAttribute("data-title");
          if (!confirm(`Delete campaign "${title}"?`)) return;
          const res = await fetch(`/api/surveys/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${AuthGuard.getToken()}` }
          });
          if (res.ok) {
            App.playSound("pop");
            App.showToast("Campaign Deleted", `"${title}" removed`, "info");
            loadSurveys();
            loadAdminStats();
            loadAuditLogs();
          }
        });
      });
    } catch (err) {
      surveysListEl.innerHTML = '<div style="color: var(--danger); font-size: 0.82rem;">Failed to load campaigns.</div>';
    }
  }

  // Load & Manage Announcements
  async function loadAnnouncements() {
    if (!annListEl) return;
    try {
      const res = await fetch("/api/announcements");
      const data = await res.json();
      const anns = data.announcements || [];
      const badge = document.getElementById("adminAnnCountBadge");
      if (badge) badge.textContent = `${anns.length} Active`;

      if (anns.length === 0) {
        annListEl.innerHTML = '<div style="color: var(--text-muted); font-size: 0.82rem; padding: 1rem 0;">No company announcements posted yet. Use Broadcast Notice to notify your workforce.</div>';
        return;
      }

      annListEl.innerHTML = anns.map(a => {
        const prioColor = a.priority === "critical" ? "var(--danger)" : a.priority === "urgent" ? "var(--warning)" : "var(--primary)";
        return `
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 0.9rem; background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-left: 3px solid ${prioColor}; border-radius: var(--radius-md);">
            <div style="min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                <strong style="font-size: 0.84rem; color: var(--text-primary);">${a.title}</strong>
                <span class="card-badge" style="font-size: 0.62rem; text-transform: uppercase;">${a.priority}</span>
              </div>
              <p style="font-size: 0.76rem; color: var(--text-secondary); margin: 0.25rem 0;">${a.message}</p>
              <span style="font-size: 0.68rem; color: var(--text-muted);">By ${a.author_name || "Admin"} • ${a.created_at}</span>
            </div>
            <button class="btn btn-sm btn-secondary delete-ann-btn" data-id="${a.id}" style="color: var(--danger); flex-shrink: 0;" title="Delete Announcement">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        `;
      }).join("");

      annListEl.querySelectorAll(".delete-ann-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const res = await fetch(`/api/announcements/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${AuthGuard.getToken()}` }
          });
          if (res.ok) {
            App.playSound("pop");
            App.showToast("Removed", "Announcement deleted", "info");
            loadAnnouncements();
            loadAuditLogs();
          }
        });
      });
    } catch (err) {
      annListEl.innerHTML = '<div style="color: var(--danger); font-size: 0.82rem;">Failed to load announcements.</div>';
    }
  }

  // Handle New Survey Launch Form
  document.getElementById("newSurveyForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("surveyTitle").value.trim();
    const category = document.getElementById("surveyCategory").value;
    const department = document.getElementById("surveyDept").value;
    const total_target = parseInt(document.getElementById("surveyTarget").value, 10);
    const description = document.getElementById("surveyDesc").value.trim();
    const deadline = document.getElementById("surveyDeadline")?.value.trim() || "Jan 30, 2027";

    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AuthGuard.getToken()}`
        },
        body: JSON.stringify({ title, category, department, total_target, description, deadline })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      App.playSound("success");
      App.showToast("Campaign Launched", `Review campaign "${title}" is now active!`, "success");
      document.getElementById("newSurveyForm").reset();
      closeSurveyModal();
      loadAdminStats();
      loadSurveys();
      loadAuditLogs();
    } catch (err) {
      App.showToast("Error", err.message || "Failed to launch survey", "danger");
    }
  });

  // Handle Broadcast Notice Form
  document.getElementById("broadcastForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("broadcastTitle").value.trim();
    const priority = document.getElementById("broadcastPriority").value;
    const message = document.getElementById("broadcastMsg").value.trim();

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AuthGuard.getToken()}`
        },
        body: JSON.stringify({ title, priority, message })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      App.playSound("pop");
      App.showToast("Broadcast Sent", `Announcement "${title}" pushed to all employees`, "success");
      document.getElementById("broadcastForm").reset();
      closeBroadcastModal();
      loadAnnouncements();
      loadAuditLogs();
    } catch (err) {
      App.showToast("Error", err.message || "Failed to broadcast announcement", "danger");
    }
  });

  loadAdminStats();
  loadAuditLogs();
  loadSurveys();
  loadAnnouncements();
});

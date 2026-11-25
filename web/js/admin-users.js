/**
 * HUMANLY - Admin Users & Role Management Controller
 * Connects to /api/users for CRUD operations and role modifications.
 */

document.addEventListener("DOMContentLoaded", () => {
  const user = AuthGuard.getUser();
  if (!user || user.role !== "admin") return;

  const tableBody = document.getElementById("userTableBody");
  const countDisplay = document.getElementById("userDisplayCount");
  const searchInput = document.getElementById("userSearchInput");
  const addUserModal = document.getElementById("addUserModal");
  const roleFilterPills = document.querySelectorAll("[data-role-filter]");

  let allUsers = [];
  let currentFilter = "all";
  let searchQuery = "";

  document.getElementById("openAddUserModalBtn")?.addEventListener("click", () => {
    addUserModal.style.display = "flex";
  });
  document.getElementById("closeAddUserModalBtn")?.addEventListener("click", () => {
    addUserModal.style.display = "none";
  });

  // Role Filter Pills
  roleFilterPills.forEach(pill => {
    pill.addEventListener("click", () => {
      roleFilterPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilter = pill.getAttribute("data-role-filter");
      renderUsers();
      App.playSound("click");
    });
  });

  // Search input
  searchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderUsers();
  });

  // Fetch Users from Database API
  async function loadUsers() {
    try {
      const res = await fetch("/api/users", {
        headers: { "Authorization": `Bearer ${AuthGuard.getToken()}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      allUsers = data.users || [];
      const badge = document.getElementById("sidebarUserCountBadge");
      if (badge) badge.textContent = `${allUsers.length} Users`;
      renderUsers();
    } catch (err) {
      console.warn("Failed to fetch users from database", err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 1.5rem;">Database query error: ${err.message}</td></tr>`;
    }
  }

  // Render Table
  function renderUsers() {
    let filtered = allUsers.filter(u => {
      const matchesRole = currentFilter === "all" || u.role === currentFilter;
      const matchesSearch = !searchQuery ||
        u.name.toLowerCase().includes(searchQuery) ||
        u.email.toLowerCase().includes(searchQuery) ||
        (u.department && u.department.toLowerCase().includes(searchQuery)) ||
        (u.title && u.title.toLowerCase().includes(searchQuery));
      return matchesRole && matchesSearch;
    });

    countDisplay.textContent = filtered.length;

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching users found in database.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map(u => {
      const isAdmin = u.role === "admin";
      const isSelf = u.id === user.id;

      let riskColor = "var(--success)";
      let riskLabel = "Low (Healthy)";
      if (u.retention_risk >= 7) {
        riskColor = "var(--danger)";
        riskLabel = "High (Watch)";
      } else if (u.retention_risk >= 5) {
        riskColor = "#d97706";
        riskLabel = "Moderate";
      }

      return `
        <tr data-user-id="${u.id}">
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <img src="${u.avatar}" alt="${u.name}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid ${isAdmin ? 'var(--danger)' : 'var(--border-color)'};" />
              <div>
                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">${u.name} ${isSelf ? '<span class="card-badge" style="font-size: 0.62rem; background: var(--bg-surface);">(You)</span>' : ''}</div>
                <div style="font-size: 0.74rem; color: var(--text-muted);">${u.email}</div>
              </div>
            </div>
          </td>
          <td><span class="card-badge">${u.department}</span></td>
          <td style="color: var(--text-secondary);">${u.title || "Team Member"}</td>
          <td>
            <select class="role-changer-select" data-user-id="${u.id}" ${isSelf ? 'disabled title="Cannot demote yourself"' : ''} style="font-size: 0.78rem; font-weight: 600; padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); background: ${isAdmin ? 'rgba(185, 28, 28, 0.15)' : 'var(--bg-surface)'}; color: ${isAdmin ? 'var(--danger)' : 'var(--text-primary)'}; border: 1px solid var(--border-color);">
              <option value="employee" ${u.role === 'employee' ? 'selected' : ''}>Employee</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrator</option>
            </select>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${riskColor}; display: inline-block;"></span>
              <span>${riskLabel} (${u.retention_risk || 5.0}%)</span>
            </div>
          </td>
          <td style="text-align: right;">
            ${isSelf ? '<span style="font-size: 0.75rem; color: var(--text-muted);">Active Session</span>' : `
              <button class="btn btn-sm btn-secondary delete-user-btn" data-user-id="${u.id}" data-user-name="${u.name}" title="Deactivate & Delete Account" style="color: var(--danger); border-color: rgba(185, 28, 28, 0.3);">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            `}
          </td>
        </tr>
      `;
    }).join("");

    // Bind Role Changers
    tableBody.querySelectorAll(".role-changer-select").forEach(sel => {
      sel.addEventListener("change", async (e) => {
        const targetId = e.target.getAttribute("data-user-id");
        const newRole = e.target.value;
        try {
          const res = await fetch(`/api/users/${targetId}/role`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${AuthGuard.getToken()}`
            },
            body: JSON.stringify({ role: newRole })
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.message);

          App.playSound("pop");
          App.showToast("Role Updated", `User role saved in database as ${newRole}`, "success");
          loadUsers();
        } catch (err) {
          alert(err.message || "Failed to update role");
          loadUsers();
        }
      });
    });

    // Bind Delete Handlers
    tableBody.querySelectorAll(".delete-user-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const targetId = btn.getAttribute("data-user-id");
        const targetName = btn.getAttribute("data-user-name");
        if (!confirm(`Are you sure you want to delete user account "${targetName}" from the database?`)) return;

        try {
          const res = await fetch(`/api/users/${targetId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${AuthGuard.getToken()}` }
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.message);

          App.playSound("success");
          App.showToast("User Deleted", `Account "${targetName}" removed from database`, "info");
          loadUsers();
        } catch (err) {
          alert(err.message || "Failed to delete user");
        }
      });
    });
  }

  // Handle Add User Form Submission
  document.getElementById("addUserForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("newUserName").value.trim();
    const email = document.getElementById("newUserEmail").value.trim();
    const title = document.getElementById("newUserTitle").value.trim();
    const department = document.getElementById("newUserDept").value;
    const role = document.getElementById("newUserRole").value;
    const password = document.getElementById("newUserPassword").value;

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AuthGuard.getToken()}`
        },
        body: JSON.stringify({ name, email, title, department, role, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      App.playSound("success");
      App.showToast("User Created", `Added ${name} (${role}) to database!`, "success");
      addUserModal.style.display = "none";
      document.getElementById("addUserForm").reset();
      loadUsers();
    } catch (err) {
      alert(err.message || "Failed to create user account");
    }
  });

  loadUsers();
});

/**
 * HUMANLY - Admin Users & Role Management Controller
 * Full CRUD: Create user with password, edit details, reset password, change role, delete user, export CSV.
 */

document.addEventListener("DOMContentLoaded", () => {
  const user = AuthGuard.getUser();
  if (!user || user.role !== "admin") return;

  const tableBody = document.getElementById("userTableBody");
  const countDisplay = document.getElementById("userDisplayCount");
  const searchInput = document.getElementById("userSearchInput");
  const roleFilterPills = document.querySelectorAll("[data-role-filter]");

  const addUserModal = document.getElementById("addUserModal");
  const editUserModal = document.getElementById("editUserModal");
  const resetPwModal = document.getElementById("resetPasswordModal");

  let allUsers = [];
  let currentFilter = "all";
  let searchQuery = "";

  function generateStrongPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let pw = "Hmn!";
    for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  }

  function wirePasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    toggle?.addEventListener("click", () => {
      const isPass = input.getAttribute("type") === "password";
      input.setAttribute("type", isPass ? "text" : "password");
      toggle.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }

  wirePasswordToggle("toggleNewUserPw", "newUserPassword");
  wirePasswordToggle("toggleResetPw", "resetPwInput");

  document.getElementById("generateNewPwBtn")?.addEventListener("click", () => {
    const inp = document.getElementById("newUserPassword");
    inp.value = generateStrongPassword();
    inp.setAttribute("type", "text");
    App.playSound("click");
  });

  document.getElementById("generateResetPwBtn")?.addEventListener("click", () => {
    const inp = document.getElementById("resetPwInput");
    inp.value = generateStrongPassword();
    inp.setAttribute("type", "text");
    App.playSound("click");
  });

  // Modal Open/Close
  document.getElementById("openAddUserModalBtn")?.addEventListener("click", () => addUserModal.classList.add("active"));
  document.getElementById("closeAddUserModalBtn")?.addEventListener("click", () => addUserModal.classList.remove("active"));
  document.getElementById("cancelAddUserModalBtn")?.addEventListener("click", () => addUserModal.classList.remove("active"));

  document.getElementById("closeEditUserModalBtn")?.addEventListener("click", () => editUserModal.classList.remove("active"));
  document.getElementById("cancelEditUserModalBtn")?.addEventListener("click", () => editUserModal.classList.remove("active"));

  document.getElementById("closeResetPwModalBtn")?.addEventListener("click", () => resetPwModal.classList.remove("active"));
  document.getElementById("cancelResetPwModalBtn")?.addEventListener("click", () => resetPwModal.classList.remove("active"));

  [addUserModal, editUserModal, resetPwModal].forEach(m => {
    m?.addEventListener("click", (e) => {
      if (e.target === m) m.classList.remove("active");
    });
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

  // Export CSV
  document.getElementById("exportUsersCsvBtn")?.addEventListener("click", () => {
    if (!allUsers.length) return;
    const rows = [["ID", "Name", "Email", "Department", "Title", "Role", "Status", "RetentionRisk"]];
    allUsers.forEach(u => {
      rows.push([u.id, u.name, u.email, u.department, u.title, u.role, u.status, u.retention_risk]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `humanly_workforce_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    App.playSound("success");
    App.showToast("Exported", "Workforce CSV downloaded", "success");
  });

  // Fetch Users from Database API
  async function loadUsers() {
    try {
      const res = await fetch("/api/users", {
        headers: { "Authorization": `Bearer ${AuthGuard.getToken()}` }
      });
      if (res.status === 401 || res.status === 403) {
        AuthGuard.logout();
        return;
      }
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
    const filtered = allUsers.filter(u => {
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
      let riskLabel = "Low";
      if (u.retention_risk >= 7) {
        riskColor = "var(--danger)";
        riskLabel = "High";
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
                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">
                  ${u.name} ${isSelf ? '<span class="card-badge" style="font-size: 0.62rem;">You</span>' : ''}
                </div>
                <div style="font-size: 0.74rem; color: var(--text-muted);">${u.email}</div>
              </div>
            </div>
          </td>
          <td><span class="card-badge">${u.department}</span></td>
          <td style="color: var(--text-secondary);">${u.title || "Team Member"}</td>
          <td>
            <select class="role-changer-select" data-user-id="${u.id}" ${isSelf ? 'disabled title="Cannot demote yourself"' : ''} style="font-size: 0.78rem; font-weight: 600; padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); background: ${isAdmin ? 'rgba(239, 68, 68, 0.14)' : 'var(--bg-surface)'}; color: ${isAdmin ? 'var(--danger)' : 'var(--text-primary)'}; border: 1px solid var(--border-color);">
              <option value="employee" ${u.role === 'employee' ? 'selected' : ''}>Employee</option>
              <option value="hr_manager" ${u.role === 'hr_manager' ? 'selected' : ''}>HR Manager</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrator</option>
            </select>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${riskColor}; display: inline-block;"></span>
              <span>${riskLabel} (${u.retention_risk || 5.0}%)</span>
            </div>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
              <button class="btn btn-sm btn-secondary edit-user-btn" data-user-id="${u.id}" title="Edit User Details">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-sm btn-secondary reset-pw-btn" data-user-id="${u.id}" data-user-name="${u.name}" title="Set / Reset Password">
                <i class="fa-solid fa-key" style="color: var(--warning);"></i>
              </button>
              ${isSelf ? '' : `
                <button class="btn btn-sm btn-secondary delete-user-btn" data-user-id="${u.id}" data-user-name="${u.name}" title="Delete Account" style="color: var(--danger);">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              `}
            </div>
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
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AuthGuard.getToken()}` },
            body: JSON.stringify({ role: newRole })
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.message);
          App.playSound("pop");
          App.showToast("Role Updated", `User role saved as ${newRole}`, "success");
          loadUsers();
        } catch (err) {
          App.showToast("Error", err.message || "Failed to update role", "danger");
          loadUsers();
        }
      });
    });

    // Bind Edit Buttons
    tableBody.querySelectorAll(".edit-user-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = parseInt(btn.getAttribute("data-user-id"), 10);
        const u = allUsers.find(item => item.id === targetId);
        if (!u) return;
        document.getElementById("editUserId").value = u.id;
        document.getElementById("editUserName").value = u.name;
        document.getElementById("editUserDept").value = u.department;
        document.getElementById("editUserTitle").value = u.title || "";
        document.getElementById("editUserStatus").value = u.status || "Online";
        document.getElementById("editUserRisk").value = u.retention_risk ?? 5.0;
        editUserModal.classList.add("active");
      });
    });

    // Bind Reset Password Buttons
    tableBody.querySelectorAll(".reset-pw-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("resetPwUserId").value = btn.getAttribute("data-user-id");
        document.getElementById("resetPwUserName").textContent = btn.getAttribute("data-user-name");
        document.getElementById("resetPwInput").value = "";
        resetPwModal.classList.add("active");
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
          App.showToast("Error", err.message || "Failed to delete user", "danger");
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
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AuthGuard.getToken()}` },
        body: JSON.stringify({ name, email, title, department, role, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      App.playSound("success");
      App.showToast("User Created", `Added ${name} (${role}) to database`, "success");
      addUserModal.classList.remove("active");
      document.getElementById("addUserForm").reset();
      loadUsers();
    } catch (err) {
      App.showToast("Creation Failed", err.message || "Failed to create user account", "danger");
    }
  });

  // Handle Edit User Form Submission
  document.getElementById("editUserForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const targetId = document.getElementById("editUserId").value;
    const payload = {
      name: document.getElementById("editUserName").value.trim(),
      department: document.getElementById("editUserDept").value,
      title: document.getElementById("editUserTitle").value.trim(),
      status: document.getElementById("editUserStatus").value,
      retention_risk: parseFloat(document.getElementById("editUserRisk").value) || 5.0
    };

    try {
      const res = await fetch(`/api/users/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AuthGuard.getToken()}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      App.playSound("success");
      App.showToast("User Updated", `Saved changes for ${payload.name}`, "success");
      editUserModal.classList.remove("active");
      loadUsers();
    } catch (err) {
      App.showToast("Update Failed", err.message || "Failed to update user", "danger");
    }
  });

  // Handle Reset Password Form Submission
  document.getElementById("resetPasswordForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const targetId = document.getElementById("resetPwUserId").value;
    const password = document.getElementById("resetPwInput").value;

    try {
      const res = await fetch(`/api/users/${targetId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AuthGuard.getToken()}` },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      App.playSound("success");
      App.showToast("Password Updated", data.message || "New password saved to database", "success");
      resetPwModal.classList.remove("active");
    } catch (err) {
      App.showToast("Failed", err.message || "Could not update password", "danger");
    }
  });

  loadUsers();
});

/**
 * ADMINATOR PULSE - Employee Directory & Retention Health
 * Filterable team table, department filters, attrition risk indicators,
 * 1-on-1 sync scheduling, and instant peer kudos routing.
 */

const Directory = (function () {
  let employees = [];

  function init() {
    employees = [...SampleData.employees];
    renderDirectoryTable();
    setupFilters();
  }

  function renderDirectoryTable() {
    const tbody = document.getElementById("directoryTableBody");
    const countEl = document.getElementById("directoryCountLabel");
    if (!tbody) return;

    const searchTerm = document.getElementById("directorySearchInput")?.value.toLowerCase() || "";
    const deptFilter = document.getElementById("directoryDeptFilter")?.value || "all";
    const riskFilter = document.getElementById("directoryRiskFilter")?.value || "all";

    const filtered = employees.filter((emp) => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm) || emp.role.toLowerCase().includes(searchTerm);
      const matchesDept = deptFilter === "all" || emp.department === deptFilter;
      const matchesRisk = riskFilter === "all" || emp.risk === riskFilter;
      return matchesSearch && matchesDept && matchesRisk;
    });

    if (countEl) countEl.textContent = `Showing ${filtered.length} employees`;

    tbody.innerHTML = "";
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No team members found matching search filters.</td></tr>`;
      return;
    }

    filtered.forEach((emp) => {
      const tr = document.createElement("tr");

      let badgeClass = "badge-low";
      if (emp.risk === "Medium") badgeClass = "badge-medium";
      if (emp.risk === "High") badgeClass = "badge-high";

      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${emp.avatar}" alt="${emp.name}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" />
            <div>
              <strong style="font-size: 0.88rem; color: var(--text-primary); display: block;">${emp.name}</strong>
              <span style="font-size: 0.72rem; color: var(--text-muted);">${emp.role}</span>
            </div>
          </div>
        </td>
        <td><span style="font-size: 0.82rem; font-weight: 500;">${emp.department}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 60px; height: 6px; background: var(--bg-input); border-radius: 99px; overflow: hidden;">
              <div style="width: ${emp.score}%; height: 100%; background: ${emp.score >= 85 ? "var(--success)" : emp.score >= 75 ? "var(--primary)" : "var(--danger)"};"></div>
            </div>
            <strong style="font-size: 0.85rem;">${emp.score}%</strong>
          </div>
        </td>
        <td><span class="badge ${badgeClass}">${emp.risk} Risk</span></td>
        <td><span style="font-size: 0.78rem; color: var(--text-secondary);">${emp.lastOneOnOne}</span></td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-sm btn-secondary schedule-sync-btn" data-name="${emp.name}" title="Schedule 1-on-1 Sync">
              <i class="fa-regular fa-calendar-check"></i> 1-on-1
            </button>
            <button class="btn btn-sm btn-primary route-kudos-btn" data-name="${emp.name}" title="Send Kudos">
              <i class="fa-solid fa-gift"></i> Kudos
            </button>
          </div>
        </td>
      `;

      // Event handlers
      tr.querySelector(".schedule-sync-btn").addEventListener("click", () => {
        App.playSound("click");
        App.showToast("1-on-1 Invitation", `Calendar invite sent to ${emp.name} for upcoming check-in.`, "success");
      });

      tr.querySelector(".route-kudos-btn").addEventListener("click", () => {
        // Pre-select employee in kudos modal and open it
        const recipientSelect = document.getElementById("kudosRecipientSelect");
        if (recipientSelect) recipientSelect.value = emp.name;
        const modal = document.getElementById("sendKudosModal");
        if (modal) modal.classList.add("active");
        App.playSound("click");
      });

      tbody.appendChild(tr);
    });
  }

  function setupFilters() {
    const searchInput = document.getElementById("directorySearchInput");
    const deptFilter = document.getElementById("directoryDeptFilter");
    const riskFilter = document.getElementById("directoryRiskFilter");

    if (searchInput) searchInput.addEventListener("input", renderDirectoryTable);
    if (deptFilter) deptFilter.addEventListener("change", renderDirectoryTable);
    if (riskFilter) riskFilter.addEventListener("change", renderDirectoryTable);
  }

  return {
    init,
    renderDirectoryTable
  };
})();

// Auto-bootstrap when on Directory page
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("directoryTableBody")) {
    Directory.init();
  }
});

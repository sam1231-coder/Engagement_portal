/**
 * ADMINATOR PULSE - Calendar & Team Schedule Controller
 * Interactive month calendar grid, event filtering, API sync simulation,
 * and meeting creation with Google Meet / MS Teams / Zoom integrations.
 */

const Calendar = (function () {
  let events = [];
  let currentYear = 2026;
  let currentMonth = 10; // November (0-indexed: 10 = Nov)
  let selectedDay = null;
  let activeFilter = "all";

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  function init() {
    events = [...SampleData.calendarEvents];
    renderCalendar();
    renderUpcomingMeetings();
    setupEventListeners();
    setupScheduleModal();
  }

  function setupEventListeners() {
    // Prev / Next month buttons
    document.getElementById("calPrevMonthBtn")?.addEventListener("click", () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      selectedDay = null;
      renderCalendar();
      renderUpcomingMeetings();
      App.playSound("click");
    });

    document.getElementById("calNextMonthBtn")?.addEventListener("click", () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      selectedDay = null;
      renderCalendar();
      renderUpcomingMeetings();
      App.playSound("click");
    });

    document.getElementById("calTodayBtn")?.addEventListener("click", () => {
      currentYear = 2026;
      currentMonth = 10;
      selectedDay = 23;
      renderCalendar();
      renderUpcomingMeetings();
      App.playSound("click");
    });

    // Event Filter Pills
    const filterPills = document.querySelectorAll(".cal-filter-pill");
    filterPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        filterPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        activeFilter = pill.getAttribute("data-filter") || "all";
        renderCalendar();
        renderUpcomingMeetings();
        App.playSound("click");
      });
    });

    // Simulate API Sync
    document.getElementById("syncCalendarApiBtn")?.addEventListener("click", () => {
      syncWithMeetingApi();
    });
  }

  function renderCalendar() {
    const monthYearTitle = document.getElementById("calMonthYearTitle");
    const gridContainer = document.getElementById("calendarDaysGrid");

    if (monthYearTitle) {
      monthYearTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }

    if (!gridContainer) return;
    gridContainer.innerHTML = "";

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    // 1. Inactive days from previous month
    for (let x = firstDayIndex; x > 0; x--) {
      const prevDayNum = prevMonthDays - x + 1;
      const cell = document.createElement("div");
      cell.className = "calendar-day-cell inactive";
      cell.innerHTML = `<span class="day-number">${prevDayNum}</span>`;
      gridContainer.appendChild(cell);
    }

    // 2. Active days of current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const cell = document.createElement("div");
      cell.className = "calendar-day-cell";
      if (selectedDay === day) cell.classList.add("selected-day");
      if (currentYear === 2026 && currentMonth === 10 && day === 21) {
        cell.classList.add("today");
      }

      // Filter events matching this date and active filter
      const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEvents = events.filter((e) => {
        const matchesDate = e.date === dayStr || e.day === day;
        const matchesFilter = activeFilter === "all" || e.type === activeFilter;
        return matchesDate && matchesFilter;
      });

      let eventChipsHtml = "";
      dayEvents.forEach((evt) => {
        eventChipsHtml += `
          <div class="cal-event-chip ${evt.badgeClass}" title="${evt.title} (${evt.time})">
            <i class="${evt.platformIcon}"></i>
            <span>${evt.title}</span>
          </div>
        `;
      });

      cell.innerHTML = `
        <div class="day-cell-header">
          <span class="day-number">${day}</span>
          ${dayEvents.length > 0 ? `<span class="events-count-badge">${dayEvents.length}</span>` : ""}
        </div>
        <div class="day-cell-events">${eventChipsHtml}</div>
      `;

      // Click date to filter upcoming agenda
      cell.addEventListener("click", () => {
        selectedDay = selectedDay === day ? null : day;
        renderCalendar();
        renderUpcomingMeetings();
        App.playSound("click");
      });

      gridContainer.appendChild(cell);
    }
  }

  function renderUpcomingMeetings() {
    const container = document.getElementById("upcomingMeetingsContainer");
    const countBadge = document.getElementById("upcomingCountBadge");
    if (!container) return;

    let filtered = events.filter((e) => {
      const matchesFilter = activeFilter === "all" || e.type === activeFilter;
      const matchesDay = selectedDay === null || e.day === selectedDay;
      return matchesFilter && matchesDay;
    });

    if (countBadge) countBadge.textContent = `${filtered.length} scheduled`;

    container.innerHTML = "";
    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
          <i class="fa-regular fa-calendar-xmark" style="font-size: 2rem; margin-bottom: 0.75rem; display: block; opacity: 0.5;"></i>
          No meetings scheduled ${selectedDay ? `for Day ${selectedDay}` : "matching filter"}.
        </div>
      `;
      return;
    }

    filtered.forEach((m) => {
      const card = document.createElement("div");
      card.className = "meeting-card";

      card.innerHTML = `
        <div class="meeting-card-left">
          <div class="meeting-time-box">
            <span class="meeting-date-label">Nov ${m.day}</span>
            <span class="meeting-time-label">${m.time.split(" - ")[0]}</span>
          </div>
          <div class="meeting-details">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge ${m.badgeClass}">${m.typeLabel}</span>
              <span class="platform-badge"><i class="${m.platformIcon}"></i> ${m.platform}</span>
            </div>
            <h4 class="meeting-title">${m.title}</h4>
            <p class="meeting-notes">${m.notes || "No agenda notes provided."}</p>
            <div class="meeting-attendees">
              <i class="fa-solid fa-users" style="font-size: 0.75rem; color: var(--text-muted); margin-right: 0.35rem;"></i>
              <span>${m.attendees.join(", ")}</span>
            </div>
          </div>
        </div>
        <div class="meeting-card-actions">
          <a href="${m.link}" target="_blank" class="btn btn-sm btn-primary">
            <i class="fa-solid fa-video"></i> Join Call
          </a>
        </div>
      `;

      container.appendChild(card);
    });
  }

  // Modal Setup
  function setupScheduleModal() {
    const modal = document.getElementById("scheduleMeetingModal");
    const openBtn = document.getElementById("openScheduleMeetingBtn");
    const closeBtn = document.getElementById("closeScheduleModalBtn");
    const form = document.getElementById("scheduleMeetingForm");

    const closeModal = () => modal?.classList.remove("active");

    if (openBtn) {
      openBtn.addEventListener("click", () => {
        modal?.classList.add("active");
        App.playSound("click");
      });
    }

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();

        const title = document.getElementById("meetingTitleInput")?.value.trim();
        const type = document.getElementById("meetingTypeSelect")?.value || "1on1";
        const dateVal = document.getElementById("meetingDateInput")?.value || "2026-11-25";
        const timeVal = document.getElementById("meetingTimeInput")?.value || "10:00 AM - 10:30 AM";
        const platform = document.getElementById("meetingPlatformSelect")?.value || "Google Meet";
        const attendeesInput = document.getElementById("meetingAttendeesInput")?.value.trim() || "Team";
        const notes = document.getElementById("meetingNotesInput")?.value.trim() || "";

        if (!title) {
          App.showToast("Missing Information", "Please enter a meeting title.", "warning");
          return;
        }

        const dateObj = new Date(dateVal);
        const dayNum = !isNaN(dateObj.getDate()) ? dateObj.getDate() : 25;

        let badgeClass = "badge-blue";
        let typeLabel = "1-on-1 Sync";
        if (type === "townhall") { badgeClass = "badge-purple"; typeLabel = "All-Hands Townhall"; }
        if (type === "pulse") { badgeClass = "badge-teal"; typeLabel = "Team Pulse"; }
        if (type === "workshop") { badgeClass = "badge-amber"; typeLabel = "Culture Workshop"; }

        let platformIcon = "fa-solid fa-video";
        let link = "https://meet.google.com/new";
        if (platform.includes("Teams")) { platformIcon = "fa-solid fa-users"; link = "https://teams.microsoft.com"; }
        if (platform.includes("Zoom")) { platformIcon = "fa-solid fa-video"; link = "https://zoom.us"; }

        const newEvent = {
          id: `evt-${Date.now()}`,
          title: title,
          type: type,
          typeLabel: typeLabel,
          date: dateVal,
          day: dayNum,
          time: timeVal,
          platform: platform,
          platformIcon: platformIcon,
          link: link,
          attendees: attendeesInput.split(",").map((s) => s.trim()),
          badgeClass: badgeClass,
          notes: notes
        };

        events.unshift(newEvent);
        renderCalendar();
        renderUpcomingMeetings();

        if (typeof confetti === "function") {
          confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        }

        App.playSound("success");
        App.showToast("Meeting Scheduled", `Added "${title}" with calendar sync!`, "success");

        form.reset();
        closeModal();
      });
    }
  }

  // Simulate Calendar API Integration Sync
  function syncWithMeetingApi() {
    const syncBtn = document.getElementById("syncCalendarApiBtn");
    const syncIcon = syncBtn?.querySelector("i");

    if (syncIcon) syncIcon.classList.add("fa-spin");
    App.playSound("click");
    App.showToast("Syncing with APIs", "Connecting to Google Calendar & Microsoft Graph...", "info");

    setTimeout(() => {
      if (syncIcon) syncIcon.classList.remove("fa-spin");
      App.playSound("success");
      App.showToast("Calendar Synced", "All 5 meetings are up to date with Google Meet & Teams.", "success");
    }, 900);
  }

  return {
    init,
    renderCalendar,
    renderUpcomingMeetings
  };
})();

// Auto-bootstrap when on Calendar page
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("calendarDaysGrid")) {
    Calendar.init();
  }
});

/**
 * ADMINATOR PULSE - Surveys & Pulse Feedback
 * Active surveys list, interactive survey participation modal,
 * and departmental sentiment breakdown matrix.
 */

const Surveys = (function () {
  let surveyList = [];
  let currentActiveSurvey = null;

  function init() {
    surveyList = [...SampleData.surveys];
    renderSurveysList();
    setupTakeSurveyModal();
  }

  function renderSurveysList() {
    const container = document.getElementById("surveysListContainer");
    if (!container) return;

    container.innerHTML = "";

    surveyList.forEach((s) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.justifyContent = "space-between";

      card.innerHTML = `
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
            <span class="badge ${s.status === "Active" ? "badge-low" : "badge-medium"}">${s.status}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-regular fa-clock"></i> ${s.deadline}</span>
          </div>

          <h3 style="font-size: 1.1rem; margin-bottom: 0.4rem;">${s.title}</h3>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1.25rem;">${s.description}</p>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 0.4rem;">
            <span style="color: var(--text-muted);">Participation Rate</span>
            <strong style="color: var(--primary);">${s.participation}% (${s.responses}/${s.totalTarget})</strong>
          </div>
          <div style="height: 6px; background: var(--bg-input); border-radius: 99px; overflow: hidden; margin-bottom: 1.25rem;">
            <div style="height: 100%; width: ${s.participation}%; background: var(--primary); border-radius: 99px;"></div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-users"></i> ${s.department}</span>
            <button class="btn btn-sm ${s.status === "Active" ? "btn-primary" : "btn-secondary"}" ${s.status === "Closed" ? "disabled" : ""} data-survey-id="${s.id}">
              ${s.status === "Active" ? '<i class="fa-solid fa-pen-nib"></i> Participate' : "Closed"}
            </button>
          </div>
        </div>
      `;

      // Event listener for participate
      if (s.status === "Active") {
        card.querySelector("button").addEventListener("click", () => {
          openSurveyModal(s);
        });
      }

      container.appendChild(card);
    });
  }

  function setupTakeSurveyModal() {
    const modal = document.getElementById("takeSurveyModal");
    const closeBtn = document.getElementById("closeTakeSurveyModal");
    const form = document.getElementById("takeSurveyForm");

    const closeModal = () => {
      if (modal) modal.classList.remove("active");
    };

    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Star rating selection
    const starBtns = document.querySelectorAll(".star-rating-btn");
    starBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const rating = parseInt(btn.getAttribute("data-star"), 10);
        document.getElementById("selectedStarRating").value = rating;

        starBtns.forEach((b) => {
          const bVal = parseInt(b.getAttribute("data-star"), 10);
          b.style.color = bVal <= rating ? "#f59e0b" : "var(--text-muted)";
        });
      });
    });

    // Slider value update
    const slider = document.getElementById("surveyBalanceSlider");
    const sliderVal = document.getElementById("sliderBalanceVal");
    if (slider && sliderVal) {
      slider.addEventListener("input", (e) => {
        sliderVal.textContent = e.target.value + "/10";
      });
    }

    // Submit Survey
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (currentActiveSurvey) {
          currentActiveSurvey.responses += 1;
          currentActiveSurvey.participation = Math.min(100, Math.round((currentActiveSurvey.responses / currentActiveSurvey.totalTarget) * 100));
          renderSurveysList();
        }

        App.playSound("success");
        App.showToast("Response Recorded! 🎉", "Your feedback was submitted anonymously.", "success");

        closeModal();
        form.reset();
      });
    }
  }

  function openSurveyModal(survey) {
    currentActiveSurvey = survey;
    const modal = document.getElementById("takeSurveyModal");
    const titleEl = document.getElementById("surveyModalTitle");

    if (titleEl) titleEl.textContent = survey.title;
    if (modal) modal.classList.add("active");
    App.playSound("click");
  }

  return {
    init
  };
})();

// Auto-bootstrap when on Review and survey page
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("surveysListContainer")) {
    Surveys.init();
  }
});

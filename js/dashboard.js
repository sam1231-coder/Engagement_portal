/**
 * ADMINATOR PULSE - Dashboard Controller
 * Executive KPI trends, departmental radar benchmarks,
 * sentiment breakdown, and interactive pulse poll widget.
 */

const Dashboard = (function () {
  let trendsChart = null;
  let sentimentChart = null;
  let departmentRadarChart = null;
  let trendsChartMode = "line";

  function init() {
    initCharts();
    setupPulsePoll();
    setupChartFilters();
    setupChartModeToggles();
  }

  function initCharts() {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const textColor = isDark ? "#94a3b8" : "#475569";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";

    // 1. Engagement Trends Over Time (Interactive Line / Bar Chart)
    const trendsCtx = document.getElementById("engagementTrendsChart")?.getContext("2d");
    if (trendsCtx) {
      if (trendsChart) trendsChart.destroy();

      const isLine = trendsChartMode === "line";

      trendsChart = new Chart(trendsCtx, {
        type: trendsChartMode,
        data: {
          labels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
          datasets: [
            {
              label: "Engagement Score (%)",
              data: [81.5, 82.8, 84.1, 85.0, 85.9, 86.4],
              borderColor: "#2563eb",
              backgroundColor: isLine ? "rgba(37, 99, 235, 0.12)" : "rgba(37, 99, 235, 0.85)",
              borderWidth: 2,
              borderRadius: isLine ? 0 : 4,
              fill: isLine,
              tension: 0.4,
              pointBackgroundColor: "#2563eb",
              pointRadius: 4,
              pointHoverRadius: 7
            },
            {
              label: "eNPS Rating",
              data: [52, 55, 59, 62, 65, 68],
              borderColor: "#15803d",
              backgroundColor: isLine ? "transparent" : "rgba(21, 128, 61, 0.85)",
              borderWidth: 2,
              borderRadius: isLine ? 0 : 4,
              borderDash: isLine ? [5, 5] : [],
              tension: 0.35,
              pointBackgroundColor: "#15803d",
              pointRadius: 4,
              pointHoverRadius: 7
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { color: textColor, font: { family: "Inter", size: 12 } }
            },
            tooltip: {
              backgroundColor: isDark ? "rgba(17, 24, 39, 0.96)" : "rgba(255, 255, 255, 0.96)",
              titleColor: isDark ? "#f8fafc" : "#0f172a",
              bodyColor: isDark ? "#cbd5e1" : "#334155",
              borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
              borderWidth: 1,
              padding: 12
            }
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: "Inter", size: 11 } },
              title: {
                display: true,
                text: "Reporting Timeline / Period",
                color: textColor,
                font: { family: "Inter", size: 12, weight: "600" },
                padding: { top: 8, bottom: 4 }
              }
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: "Inter", size: 11 } },
              title: {
                display: true,
                text: "Score (%) / Net Promoter Index",
                color: textColor,
                font: { family: "Inter", size: 12, weight: "600" },
                padding: { top: 4, bottom: 8 }
              }
            }
          }
        }
      });
    }

    // 2. Departmental Benchmark (Radar Chart)
    const radarCtx = document.getElementById("deptRadarChart")?.getContext("2d");
    if (radarCtx) {
      if (departmentRadarChart) departmentRadarChart.destroy();

      departmentRadarChart = new Chart(radarCtx, {
        type: "radar",
        data: {
          labels: ["Leadership", "Work-Life", "Career Growth", "Innovation", "Culture", "Reward"],
          datasets: [
            {
              label: "Engineering",
              data: [88, 82, 85, 94, 90, 80],
              borderColor: "#2563eb",
              backgroundColor: "rgba(37, 99, 235, 0.2)",
              pointBackgroundColor: "#2563eb"
            },
            {
              label: "Design & Product",
              data: [92, 86, 89, 96, 94, 85],
              borderColor: "#0d9488",
              backgroundColor: "rgba(13, 148, 136, 0.2)",
              pointBackgroundColor: "#0d9488"
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { color: textColor, font: { family: "Inter", size: 11 } }
            }
          },
          scales: {
            r: {
              grid: { color: gridColor },
              angleLines: { color: gridColor },
              pointLabels: { color: textColor, font: { family: "Inter", size: 11 } },
              ticks: { display: false }
            }
          }
        }
      });
    }

    // 3. Sentiment Distribution (Doughnut Chart)
    const sentimentCtx = document.getElementById("sentimentDistributionChart")?.getContext("2d");
    if (sentimentCtx) {
      if (sentimentChart) sentimentChart.destroy();

      sentimentChart = new Chart(sentimentCtx, {
        type: "doughnut",
        data: {
          labels: ["Highly Engaged", "Engaged", "Neutral", "At Risk"],
          datasets: [
            {
              data: [64, 24, 8, 4],
              backgroundColor: ["#059669", "#2563eb", "#d97706", "#e11d48"],
              borderWidth: 0,
              hoverOffset: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "72%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: textColor, font: { family: "Inter", size: 11 }, padding: 14 }
            }
          }
        }
      });
    }
  }

  // Interactive Quick Pulse Poll Widget
  function setupPulsePoll() {
    const pollButtons = document.querySelectorAll(".poll-option-btn");
    const pollVoted = localStorage.getItem("adminator_poll_voted");

    if (pollVoted) {
      applyPollResults(pollVoted);
    }

    pollButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const optionId = btn.getAttribute("data-poll-id");
        localStorage.setItem("adminator_poll_voted", optionId);
        App.playSound("success");
        applyPollResults(optionId);
        App.showToast("Feedback Logged", "Your pulse response was recorded anonymously.", "success");
      });
    });
  }

  function applyPollResults(selectedId) {
    const pollButtons = document.querySelectorAll(".poll-option-btn");
    const percentages = {
      opt1: 64,
      opt2: 24,
      opt3: 8,
      opt4: 4
    };

    pollButtons.forEach((btn) => {
      const id = btn.getAttribute("data-poll-id");
      const progress = btn.querySelector(".poll-option-progress");
      const pctLabel = btn.querySelector(".poll-option-percentage");
      const pct = percentages[id] || 25;

      if (progress) progress.style.width = pct + "%";
      if (pctLabel) pctLabel.textContent = pct + "%";

      if (id === selectedId) {
        btn.style.borderColor = "var(--primary)";
        btn.querySelector(".poll-option-label").innerHTML += ' <i class="fa-solid fa-circle-check" style="color: var(--primary); margin-left: 0.35rem;"></i>';
      }
      btn.disabled = true;
    });
  }

  // Chart Filters (Month, Quarter, Year)
  function setupChartFilters() {
    const pills = document.querySelectorAll(".chart-filter-pills .pill-btn");
    pills.forEach((pill) => {
      pill.addEventListener("click", () => {
        pills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        App.playSound("click");

        const range = pill.getAttribute("data-range");
        if (trendsChart) {
          if (range === "quarter") {
            trendsChart.data.labels = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"];
            trendsChart.data.datasets[0].data = [79.2, 82.4, 85.0, 86.4];
            trendsChart.data.datasets[1].data = [46, 54, 62, 68];
          } else if (range === "year") {
            trendsChart.data.labels = ["2023", "2024", "2025", "2026 (YTD)"];
            trendsChart.data.datasets[0].data = [72.0, 78.5, 83.2, 86.4];
            trendsChart.data.datasets[1].data = [35, 48, 58, 68];
          } else {
            trendsChart.data.labels = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
            trendsChart.data.datasets[0].data = [81.5, 82.8, 84.1, 85.0, 85.9, 86.4];
            trendsChart.data.datasets[1].data = [52, 55, 59, 62, 65, 68];
          }
          trendsChart.update();
        }
      });
    });
  }

  // 1-Click Toggle for Line vs Bar chart on Trends
  function setupChartModeToggles() {
    const lineBtn = document.getElementById("dashboardTrendTypeLine");
    const barBtn = document.getElementById("dashboardTrendTypeBar");

    if (lineBtn && barBtn) {
      lineBtn.addEventListener("click", () => {
        if (trendsChartMode === "line") return;
        trendsChartMode = "line";
        lineBtn.classList.add("active");
        barBtn.classList.remove("active");
        App.playSound("pop");
        initCharts();
      });

      barBtn.addEventListener("click", () => {
        if (trendsChartMode === "bar") return;
        trendsChartMode = "bar";
        barBtn.classList.add("active");
        lineBtn.classList.remove("active");
        App.playSound("pop");
        initCharts();
      });
    }
  }

  function refresh() {
    initCharts();
  }

  return {
    init,
    refresh
  };
})();

// Auto-initialize if canvas is present
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("engagementTrendsChart")) {
    Dashboard.init();
  }
});

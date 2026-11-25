/**
 * ADMINATOR PULSE - Dashboard Controller
 * Executive KPI trends, departmental radar benchmarks,
 * sentiment breakdown, interactive pulse poll widget, and
 * Google-search-style responsive cursor trajectory chart.
 */

const Dashboard = (function () {
  let trendsChart = null;
  let sentimentChart = null;
  let departmentRadarChart = null;
  let trendsChartMode = "line";

  // Google Search Style Vertical Crosshair Cursor Plugin
  const cursorCrosshairPlugin = {
    id: "cursorCrosshair",
    afterDatasetsDraw: (chart) => {
      if (chart.tooltip?._active && chart.tooltip._active.length) {
        const activePoint = chart.tooltip._active[0];
        const ctx = chart.ctx;
        const x = activePoint.element.x;
        const topY = chart.scales.y.top;
        const bottomY = chart.scales.y.bottom;
        const isDark = document.documentElement.getAttribute("data-theme") !== "light";

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]); // Google style dashed vertical line
        ctx.strokeStyle = isDark ? "rgba(96, 193, 229, 0.6)" : "rgba(22, 125, 141, 0.55)";
        ctx.stroke();

        // Responsive focal point halo rings
        chart.tooltip._active.forEach((pt) => {
          const el = pt.element;
          if (el && typeof el.y === "number") {
            ctx.beginPath();
            ctx.arc(el.x, el.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? "rgba(96, 193, 229, 0.3)" : "rgba(22, 125, 141, 0.25)";
            ctx.fill();
          }
        });

        ctx.restore();
      }
    }
  };

  function updateLiveReadout(index) {
    if (!trendsChart) return;
    const labels = trendsChart.data.labels;
    const engData = trendsChart.data.datasets[0]?.data || [];
    const enpsData = trendsChart.data.datasets[1]?.data || [];

    const validIndex = (typeof index === "number" && index >= 0 && index < labels.length) 
      ? index 
      : labels.length - 1;

    const scoreEl = document.getElementById("readoutScore");
    const dateEl = document.getElementById("readoutDate");
    const enpsEl = document.getElementById("readoutEnps");
    const deltaEl = document.getElementById("readoutDelta");

    const currentScore = engData[validIndex];
    if (typeof currentScore === "undefined") return;

    const prevScore = validIndex > 0 ? engData[validIndex - 1] : currentScore;
    const delta = (currentScore - prevScore).toFixed(1);
    const isPositive = delta >= 0;

    if (scoreEl) scoreEl.textContent = `${currentScore.toFixed(1)}%`;
    if (dateEl) {
      const isLatest = validIndex === labels.length - 1;
      dateEl.textContent = `${labels[validIndex]}${isLatest ? " (Latest)" : ""}`;
    }
    if (enpsEl && enpsData[validIndex] !== undefined) {
      const val = enpsData[validIndex];
      enpsEl.innerHTML = `eNPS: <strong>${val > 0 ? "+" : ""}${val}</strong>`;
    }
    if (deltaEl) {
      deltaEl.className = `readout-delta ${isPositive ? "positive" : "negative"}`;
      deltaEl.innerHTML = `${isPositive ? '<i class="fa-solid fa-arrow-trend-up"></i> +' : '<i class="fa-solid fa-arrow-trend-down"></i> '}${delta}%`;
    }
  }

  function init() {
    initCharts();
    setupPulsePoll();
    setupChartFilters();
    setupChartModeToggles();

    // Reset readout on mouse leave canvas
    const canvasEl = document.getElementById("engagementTrendsChart");
    canvasEl?.addEventListener("mouseleave", () => {
      updateLiveReadout();
    });
  }

  function initCharts() {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    // Color Hunt Palettes:
    // Dark: https://colorhunt.co/palette/1b365d005a9c60c1e5a0e0ef (#1b365d, #005a9c, #60c1e5, #a0e0ef)
    // Light: https://colorhunt.co/palette/071b2b167d8db9e4e8eeeeee (#071b2b, #167d8d, #b9e4e8, #eeeeee)
    const primaryColor = isDark ? "#60c1e5" : "#167d8d";
    const primaryBgLine = isDark ? "rgba(96, 193, 229, 0.16)" : "rgba(22, 125, 141, 0.14)";
    const primaryBgBar = isDark ? "rgba(96, 193, 229, 0.85)" : "rgba(22, 125, 141, 0.85)";

    const secondaryColor = isDark ? "#a0e0ef" : "#071b2b";
    const secondaryBgLine = isDark ? "transparent" : "transparent";
    const secondaryBgBar = isDark ? "rgba(0, 90, 156, 0.85)" : "rgba(7, 27, 43, 0.85)";

    const textColor = isDark ? "#a0e0ef" : "#167d8d";
    const gridColor = isDark ? "rgba(96, 193, 229, 0.1)" : "rgba(22, 125, 141, 0.1)";

    // 1. Engagement Trends Over Time (Interactive Google Search Style Chart)
    const trendsCtx = document.getElementById("engagementTrendsChart")?.getContext("2d");
    if (trendsCtx) {
      if (trendsChart) trendsChart.destroy();

      const isLine = trendsChartMode === "line";

      trendsChart = new Chart(trendsCtx, {
        type: trendsChartMode,
        plugins: [cursorCrosshairPlugin],
        data: {
          labels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
          datasets: [
            {
              label: "Engagement Score (%)",
              data: [81.5, 82.8, 84.1, 85.0, 85.9, 86.4],
              borderColor: primaryColor,
              backgroundColor: isLine ? primaryBgLine : primaryBgBar,
              borderWidth: 2.5,
              borderRadius: isLine ? 0 : 5,
              fill: isLine,
              tension: 0.38,
              pointBackgroundColor: primaryColor,
              pointBorderColor: isDark ? "#1b365d" : "#ffffff",
              pointBorderWidth: 1.5,
              pointRadius: isLine ? 3 : 0,
              pointHoverRadius: 7,
              pointHoverBorderWidth: 2.5
            },
            {
              label: "eNPS Rating",
              data: [52, 55, 59, 62, 65, 68],
              borderColor: secondaryColor,
              backgroundColor: isLine ? secondaryBgLine : secondaryBgBar,
              borderWidth: 2,
              borderRadius: isLine ? 0 : 5,
              borderDash: isLine ? [5, 5] : [],
              tension: 0.35,
              pointBackgroundColor: secondaryColor,
              pointBorderColor: isDark ? "#1b365d" : "#ffffff",
              pointBorderWidth: 1.5,
              pointRadius: isLine ? 3 : 0,
              pointHoverRadius: 7,
              pointHoverBorderWidth: 2.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false
          },
          hover: {
            mode: "index",
            intersect: false
          },
          onHover: (event, activeElements) => {
            if (activeElements && activeElements.length > 0) {
              const idx = activeElements[0].index;
              updateLiveReadout(idx);
            }
          },
          plugins: {
            legend: {
              position: "top",
              labels: { 
                color: textColor, 
                font: { family: "Inter", size: 12, weight: "500" },
                boxWidth: 12,
                boxHeight: 12,
                usePointStyle: true
              }
            },
            tooltip: {
              enabled: true,
              mode: "index",
              intersect: false,
              backgroundColor: isDark ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.96)",
              titleColor: isDark ? "#f8fafc" : "#0f172a",
              bodyColor: isDark ? "#cbd5e1" : "#334155",
              borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8,
              boxPadding: 4,
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || "";
                  if (label) label += ": ";
                  if (context.parsed.y !== null) {
                    label += context.datasetIndex === 0 ? context.parsed.y + "%" : "+" + context.parsed.y;
                  }
                  return label;
                }
              }
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

      // Initialize readout with latest data
      updateLiveReadout();
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
              borderColor: isDark ? "#60c1e5" : "#167d8d",
              backgroundColor: isDark ? "rgba(96, 193, 229, 0.25)" : "rgba(22, 125, 141, 0.2)",
              pointBackgroundColor: isDark ? "#60c1e5" : "#167d8d"
            },
            {
              label: "Design & Product",
              data: [92, 86, 89, 96, 94, 85],
              borderColor: isDark ? "#a0e0ef" : "#071b2b",
              backgroundColor: isDark ? "rgba(160, 224, 239, 0.2)" : "rgba(7, 27, 43, 0.12)",
              pointBackgroundColor: isDark ? "#a0e0ef" : "#071b2b"
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
              backgroundColor: isDark
                ? ["#60c1e5", "#005a9c", "#a0e0ef", "#1b365d"]
                : ["#167d8d", "#071b2b", "#b9e4e8", "#577885"],
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
          updateLiveReadout();
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

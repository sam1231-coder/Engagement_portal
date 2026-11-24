/**
 * ADMINATOR PULSE - Kudos & Recognition Wall
 * Social recognition stream, interactive reaction toggling,
 * confetti celebratory particle animations, and kudos creation modal.
 */

const Kudos = (function () {
  let kudosList = [];

  function init() {
    kudosList = [...SampleData.kudos];
    renderKudosFeed();
    setupKudosModal();
  }

  function renderKudosFeed() {
    const feedContainer = document.getElementById("kudosFeedContainer");
    if (!feedContainer) return;

    feedContainer.innerHTML = "";

    kudosList.forEach((item) => {
      const card = createKudosCardElement(item);
      feedContainer.appendChild(card);
    });
  }

  function createKudosCardElement(item) {
    const card = document.createElement("div");
    card.className = "kudos-card";
    card.id = `card-${item.id}`;

    card.innerHTML = `
      <div>
        <div class="kudos-card-header">
          <div class="kudos-author">
            <img src="${item.senderAvatar}" alt="${item.senderName}" class="author-avatar" />
            <div class="author-details">
              <h4>${item.senderName}</h4>
              <span>${item.senderRole} • ${item.timestamp}</span>
            </div>
          </div>
          <span class="kudos-badge-tag">${item.badge}</span>
        </div>

        <div style="margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 0.8rem; color: var(--text-muted);">Recognized:</span>
          <strong style="color: var(--text-primary); font-size: 0.88rem;">${item.recipientName}</strong>
          <span style="font-size: 0.72rem; color: var(--primary); font-weight: 700;">${item.coreValue}</span>
        </div>

        <div class="kudos-body">
          "${item.message}"
        </div>
      </div>

      <div class="kudos-reactions-bar">
        <button class="reaction-btn ${item.userReacted?.clap ? "reacted" : ""}" data-kudos-id="${item.id}" data-type="clap">
          👏 <span class="rx-count">${item.reactions.clap}</span>
        </button>
        <button class="reaction-btn ${item.userReacted?.heart ? "reacted" : ""}" data-kudos-id="${item.id}" data-type="heart">
          ❤️ <span class="rx-count">${item.reactions.heart}</span>
        </button>
        <button class="reaction-btn ${item.userReacted?.rocket ? "reacted" : ""}" data-kudos-id="${item.id}" data-type="rocket">
          🚀 <span class="rx-count">${item.reactions.rocket}</span>
        </button>
        <button class="reaction-btn ${item.userReacted?.genius ? "reacted" : ""}" data-kudos-id="${item.id}" data-type="genius">
          💡 <span class="rx-count">${item.reactions.genius}</span>
        </button>
      </div>
    `;

    // Add reaction click events
    card.querySelectorAll(".reaction-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        handleReactionClick(item.id, btn.getAttribute("data-type"), btn);
      });
    });

    return card;
  }

  function handleReactionClick(kudosId, reactionType, btnElement) {
    const post = kudosList.find((k) => k.id === kudosId);
    if (!post) return;

    if (!post.userReacted) post.userReacted = {};
    const isCurrentlyReacted = post.userReacted[reactionType];

    if (isCurrentlyReacted) {
      post.reactions[reactionType]--;
      post.userReacted[reactionType] = false;
      btnElement.classList.remove("reacted");
    } else {
      post.reactions[reactionType]++;
      post.userReacted[reactionType] = true;
      btnElement.classList.add("reacted");
      App.playSound("pop");

      // Micro confetti on reaction
      if (typeof confetti === "function") {
        confetti({
          particleCount: 18,
          spread: 45,
          origin: { y: 0.8 }
        });
      }
    }

    const countSpan = btnElement.querySelector(".rx-count");
    if (countSpan) countSpan.textContent = post.reactions[reactionType];
  }

  // Setup "Send Kudos" Modal
  function setupKudosModal() {
    const openBtn = document.getElementById("openSendKudosBtn");
    const openHeroBtn = document.getElementById("openSendKudosHeroBtn");
    const modal = document.getElementById("sendKudosModal");
    const closeBtn = document.getElementById("closeSendKudosModal");
    const form = document.getElementById("sendKudosForm");
    const recipientSelect = document.getElementById("kudosRecipientSelect");

    // Populate Recipient Dropdown
    if (recipientSelect && SampleData.employees) {
      recipientSelect.innerHTML = '<option value="">-- Choose Colleague --</option>';
      SampleData.employees.forEach((emp) => {
        const opt = document.createElement("option");
        opt.value = emp.name;
        opt.textContent = `${emp.name} (${emp.role} - ${emp.department})`;
        recipientSelect.appendChild(opt);
      });
    }

    const openModal = () => {
      if (modal) modal.classList.add("active");
      App.playSound("click");
    };

    const closeModal = () => {
      if (modal) modal.classList.remove("active");
    };

    if (openBtn) openBtn.addEventListener("click", openModal);
    if (openHeroBtn) openHeroBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Submit Kudos Form
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();

        const recipient = recipientSelect ? recipientSelect.value : "";
        const badge = document.getElementById("kudosBadgeSelect")?.value || "🌟 Stellar Work";
        const coreValue = document.getElementById("kudosValueSelect")?.value || "#Innovation";
        const message = document.getElementById("kudosMessageInput")?.value.trim() || "";

        if (!recipient || !message) {
          App.showToast("Incomplete Form", "Please pick a recipient and write a brief note.", "warning");
          return;
        }

        const newKudos = {
          id: `kudos-${Date.now()}`,
          senderName: "Alex Vance (You)",
          senderRole: "Senior Enterprise Lead",
          senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
          recipientName: recipient,
          recipientRole: "Valued Team Member",
          badge: badge,
          coreValue: coreValue,
          message: message,
          timestamp: "Just now",
          reactions: { clap: 1, heart: 1, rocket: 2, genius: 0 },
          userReacted: { rocket: true }
        };

        // Prepend to feed
        kudosList.unshift(newKudos);
        renderKudosFeed();

        // Celebration Confetti
        if (typeof confetti === "function") {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
          });
        }

        App.playSound("success");
        App.showToast("Kudos Sent! 🎉", `Recognition shared with ${recipient}!`, "success");

        // Reset and close
        form.reset();
        closeModal();
      });
    }
  }

  return {
    init,
    renderKudosFeed
  };
})();

// Auto-bootstrap when on Team and social page or when modal exists
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("kudosFeedContainer") || document.getElementById("sendKudosModal")) {
    Kudos.init();
  }
});

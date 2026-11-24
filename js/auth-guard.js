/**
 * ADMINATOR PULSE - Authentication Guard & Session Controller
 * Protects pages from unauthenticated access, handles session persistence,
 * and synchronizes user profile data across all segregated HTML pages.
 */

const AuthGuard = (function () {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const isLoginPage = currentPage === "login.html";

  // Check login status
  const isLoggedIn = localStorage.getItem("adminator_logged_in") === "true";
  const savedUserJson = localStorage.getItem("adminator_user");

  let currentUser = null;
  if (savedUserJson) {
    try {
      currentUser = JSON.parse(savedUserJson);
    } catch (e) {
      currentUser = null;
    }
  }

  // Enforce access control
  if (!isLoggedIn && !isLoginPage) {
    // If not on login page and not logged in, redirect to login.html
    window.location.replace("login.html");
  } else if (isLoggedIn && isLoginPage) {
    // If already logged in and visiting login.html, redirect to dashboard.html
    window.location.replace("dashboard.html");
  }

  function init() {
    if (currentUser) {
      populateUserInfo(currentUser);
    }
    setupLogoutHandlers();
  }

  function populateUserInfo(user) {
    document.querySelectorAll(".user-name").forEach((el) => (el.textContent = user.name));
    document.querySelectorAll(".user-role").forEach((el) => (el.textContent = user.role));
    document.querySelectorAll(".user-avatar").forEach((el) => {
      if (el.tagName === "IMG") el.src = user.avatar;
    });
    const dropdownEmail = document.getElementById("dropdownUserEmail");
    if (dropdownEmail) dropdownEmail.textContent = user.email;
  }

  function login(user) {
    localStorage.setItem("adminator_logged_in", "true");
    localStorage.setItem("adminator_user", JSON.stringify(user));
    window.location.href = "dashboard.html";
  }

  function logout() {
    localStorage.removeItem("adminator_logged_in");
    localStorage.removeItem("adminator_user");
    window.location.href = "login.html";
  }

  function setupLogoutHandlers() {
    document.querySelectorAll(".logout-trigger-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    });
  }

  return {
    init,
    login,
    logout,
    getUser: () => currentUser
  };
})();

// Execute immediately on DOM ready
document.addEventListener("DOMContentLoaded", AuthGuard.init);

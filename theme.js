/**
 * 8-BIT ALU SIMULATOR - THEME MANAGEMENT MODULE
 * Manages persistent Light/Dark mode across all pages
 */

(function () {
  const THEME_KEY = "alu-theme-preference";

  // Determine initial theme: localStorage -> system preference -> default light
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") {
      return saved;
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    updateToggleButtons(theme);
  }

  // Update theme toggle button icons
  function updateToggleButtons(theme) {
    const btns = document.querySelectorAll(".theme-toggle-btn");
    btns.forEach((btn) => {
      const isDark = theme === "dark";
      btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      btn.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");

      // Sun icon for dark mode (click to go light), Moon icon for light mode (click to go dark)
      if (isDark) {
        btn.innerHTML = `
          <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <span class="theme-text">Light</span>
        `;
      } else {
        btn.innerHTML = `
          <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <span class="theme-text">Dark</span>
        `;
      }
    });
  }

  // Toggle between themes
  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  }

  // Initialize immediately
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  // Bind to DOM when ready
  document.addEventListener("DOMContentLoaded", () => {
    updateToggleButtons(document.documentElement.getAttribute("data-theme") || "light");
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".theme-toggle-btn");
      if (btn) {
        toggleTheme();
      }
    });
  });

  // Listen for system preference changes if user hasn't explicitly set preference
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
  }

  // Expose helper globally
  window.aluTheme = {
    get: () => document.documentElement.getAttribute("data-theme") || "light",
    toggle: toggleTheme,
    set: applyTheme
  };
})();

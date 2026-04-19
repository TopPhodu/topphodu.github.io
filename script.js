const THEME_KEY = "pn-site-theme";

const body = document.body;
const header = document.querySelector(".site-header");
const themeToggle = document.getElementById("theme-toggle");
const themeLabel = themeToggle?.querySelector(".theme-label");
const navLinks = document.querySelectorAll(".nav-links a");
const sectionNodes = document.querySelectorAll("main section[id]");
const revealNodes = document.querySelectorAll(".reveal");
const timelineToggles = document.querySelectorAll(".timeline-toggle");
const yearEl = document.getElementById("year");

function setTheme(theme) {
  body.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);

  const isDark = theme === "dark";
  if (themeLabel) {
    themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
  }
  themeToggle?.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}

function initTheme() {
  const storedTheme = localStorage.getItem(THEME_KEY);
  setTheme(storedTheme === "light" ? "light" : "dark");
}

function initThemeToggle() {
  themeToggle?.addEventListener("click", () => {
    const nextTheme = body.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  });
}

function initHeaderState() {
  const updateHeader = () => {
    header?.classList.toggle("scrolled", window.scrollY > 12);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

function initSmoothScroll() {
  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id?.startsWith("#")) return;

      const target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initActiveSectionHighlight() {
  // Highlights the nav link for the section currently in view.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const activeId = entry.target.id;
        navLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${activeId}`;
          link.setAttribute("aria-current", String(isActive));
        });
      });
    },
    { rootMargin: "-35% 0px -55% 0px", threshold: 0.01 }
  );

  sectionNodes.forEach((section) => observer.observe(section));
}

function initRevealAnimations() {
  // One-time reveal animation for sections/cards as they enter viewport.
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.08 }
  );

  revealNodes.forEach((node) => observer.observe(node));
}

function setPanelState(toggle, isOpen) {
  const panel = toggle.nextElementSibling;
  if (!panel) return;

  toggle.setAttribute("aria-expanded", String(isOpen));
  panel.classList.toggle("is-open", isOpen);

  if (isOpen) {
    panel.style.maxHeight = `${panel.scrollHeight}px`;
  } else {
    panel.style.maxHeight = "0px";
  }
}

function initTimelineAccordions() {
  // Single-open accordion behavior for timeline roles.
  timelineToggles.forEach((toggle, index) => {
    setPanelState(toggle, index === 0);

    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";

      timelineToggles.forEach((node) => setPanelState(node, false));
      setPanelState(toggle, !isOpen);
    });
  });
}

function initYear() {
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}

initTheme();
initThemeToggle();
initHeaderState();
initSmoothScroll();
initActiveSectionHighlight();
initRevealAnimations();
initTimelineAccordions();
initYear();

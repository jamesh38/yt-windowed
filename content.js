(() => {
  "use strict";

  const api = globalThis.browser ?? globalThis.chrome;

  const DEFAULTS = {
    shortcut: "`",
    autoEnable: false,
    scrollable: true,
    hideScrollbar: false,
    miniPlayer: false,
  };

  function icon(d) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS(ns, "path");
    Object.entries({
      d,
      fill: "none",
      stroke: "#fff",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }).forEach(([k, v]) => path.setAttribute(k, v));
    svg.appendChild(path);
    return svg;
  }

  const ICON_ENTER = icon("M4 10V4h6M20 14v6h-6M14 4h6v6M10 20H4v-6");
  const ICON_EXIT = icon("M10 4v6H4M14 20v-6h6M20 10h-6V4M4 14h6v6");

  let settings = { ...DEFAULTS };
  let active = false;
  let wasTheater = false;
  let button = null;
  let topButton = null;

  const isWatchPage = () => /^\/(watch|live\/|clip\/)/.test(location.pathname);
  const watchEl = () =>
    document.querySelector("ytd-watch-flexy, ytd-watch-grid, ytd-watch");
  const isTheater = () => watchEl()?.hasAttribute("theater") ?? false;
  const player = () => document.getElementById("movie_player");
  const nudgeLayout = () => window.dispatchEvent(new Event("resize"));

  function setTheater(on, attempts = 15) {
    if (isTheater() === on || attempts <= 0) return;
    document.querySelector("#movie_player .ytp-size-button")?.click();
    setTimeout(() => setTheater(on, attempts - 1), 300);
  }

  function applyBodyClasses() {
    const cl = document.body.classList;
    cl.toggle("ywf-on", active);
    cl.toggle("ywf-noscroll", active && !settings.scrollable);
    cl.toggle("ywf-hide-scrollbar", active && settings.hideScrollbar);
    updateScrollState();
  }

  function enable() {
    if (active || !isWatchPage()) return;
    active = true;
    wasTheater = isTheater();
    setTheater(true);
    window.scrollTo(0, 0);
    applyBodyClasses();
    updateButton();
    nudgeLayout();
  }

  function disable() {
    if (!active) return;
    active = false;
    setMini(false);
    applyBodyClasses();
    document.body.classList.remove("ywf-scrolled");
    if (!wasTheater) setTheater(false);
    updateButton();
    nudgeLayout();
  }

  const toggle = () => (active ? disable() : enable());

  function updateButton() {
    if (!button) return;
    button.replaceChildren(active ? ICON_EXIT : ICON_ENTER);
    const label = `${active ? "Exit" : "Enter"} windowed fullscreen (${settings.shortcut})`;
    button.title = label;
    button.setAttribute("aria-label", label);
    // Native fullscreen already fills the screen; our button is meaningless there.
    button.style.display = document.fullscreenElement ? "none" : "";
  }

  function injectButton() {
    if (document.getElementById("ywf-btn")) return true;
    const sizeButton = document.querySelector("#movie_player .ytp-size-button");
    if (!sizeButton) return false;

    button = document.createElement("button");
    button.id = "ywf-btn";
    button.className = "ytp-button";
    button.addEventListener("click", toggle);
    sizeButton.parentNode.insertBefore(button, sizeButton);
    updateButton();
    return true;
  }

  // The player and its controls are built lazily after navigation, so poll
  // briefly until they show up.
  function onNavigate() {
    if (!isWatchPage()) {
      disable();
      return;
    }
    let tries = 40;
    const timer = setInterval(() => {
      if (injectButton() || --tries <= 0) {
        clearInterval(timer);
        if (active) {
          setTheater(true);
          nudgeLayout();
        } else if (settings.autoEnable) {
          enable();
        }
      }
    }, 250);
  }

  function setMini(on) {
    const p = player();
    if (!p || p.classList.contains("ywf-mini") === on) return;
    if (on) {
      if (!topButton) {
        topButton = document.createElement("button");
        topButton.id = "ywf-top-btn";
        topButton.textContent = "Back to top";
        topButton.addEventListener("click", (e) => {
          e.stopPropagation();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
      p.appendChild(topButton);
    }
    p.classList.toggle("ywf-mini", on);
    p.classList.toggle("ytp-small-mode", on);
    nudgeLayout();
  }

  function updateScrollState() {
    if (!active) return;
    document.body.classList.toggle("ywf-scrolled", window.scrollY >= 100);
    setMini(
      settings.miniPlayer &&
        settings.scrollable &&
        window.scrollY > window.innerHeight - 100,
    );
  }

  function isTyping(target) {
    return (
      target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.nodeName)
    );
  }

  document.addEventListener(
    "keydown",
    (e) => {
      if (!isWatchPage() || isTyping(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === settings.shortcut) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      } else if (e.key === "Escape" && active && !document.fullscreenElement) {
        disable();
      }
    },
    true,
  );

  document.addEventListener("fullscreenchange", updateButton);
  window.addEventListener("scroll", updateScrollState, { passive: true });
  document.addEventListener("yt-navigate-finish", onNavigate);

  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in DEFAULTS) settings[key] = newValue ?? DEFAULTS[key];
    }
    applyBodyClasses();
    updateButton();
  });

  Promise.resolve(api.storage.sync.get(DEFAULTS)).then((stored) => {
    settings = { ...DEFAULTS, ...stored };
    onNavigate();
  });
})();

const api = globalThis.browser ?? globalThis.chrome;

const DEFAULTS = {
  shortcut: "`",
  autoEnable: false,
  scrollable: true,
  hideScrollbar: false,
  miniPlayer: false,
};

const shortcutInput = document.getElementById("shortcut");

Promise.resolve(api.storage.sync.get(DEFAULTS)).then((settings) => {
  shortcutInput.value = settings.shortcut;
  for (const key of ["autoEnable", "scrollable", "hideScrollbar", "miniPlayer"]) {
    const box = document.getElementById(key);
    box.checked = settings[key];
    box.addEventListener("change", () => api.storage.sync.set({ [key]: box.checked }));
  }
});

shortcutInput.addEventListener("keydown", (e) => {
  if (e.key === "Tab") return;
  e.preventDefault();
  if (e.key.length !== 1 || e.key === " ") return;
  shortcutInput.value = e.key;
  api.storage.sync.set({ shortcut: e.key });
});

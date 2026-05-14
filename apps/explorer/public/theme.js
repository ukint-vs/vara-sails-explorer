(function () {
  const key = "vara-sails-explorer-theme";
  const root = document.documentElement;
  const stored = localStorage.getItem(key);
  const initial = stored || root.getAttribute("data-theme") || "dark";

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(key, theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const next = theme === "dark" ? "Light" : "Dark";
      button.textContent = next;
      button.setAttribute("aria-label", `Switch to ${next} theme`);
    });
  }

  function ready() {
    setTheme(initial);

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const current = root.getAttribute("data-theme") || "dark";
        setTheme(current === "dark" ? "light" : "dark");
      });
    });

    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const value = button.getAttribute("data-copy") || "";
        try {
          await navigator.clipboard.writeText(value);
        } catch (_) {
          return;
        }
        const old = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = old;
        }, 1000);
      });
    });

    const filter = document.querySelector("[data-local-filter]");
    if (filter) {
      filter.addEventListener("input", () => {
        const query = filter.value.toLowerCase();
        document.querySelectorAll("[data-searchable]").forEach((row) => {
          row.hidden = !row.textContent.toLowerCase().includes(query);
        });
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();

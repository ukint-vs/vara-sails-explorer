(function () {
  function ready() {
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
        button.textContent = "COPIED";
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

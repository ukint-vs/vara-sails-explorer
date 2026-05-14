
(function () {
  const key = 'vara-sails-explorer-theme-v2';
  const stored = localStorage.getItem(key);
  const initial = stored || 'dark';
  document.documentElement.setAttribute('data-theme', initial);

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(key, theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.textContent = theme === 'dark' ? 'Light' : 'Dark';
      button.setAttribute('aria-label', `Switch to ${button.textContent} theme`);
    });
  }

  function ready() {
    setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        setTheme(current === 'dark' ? 'light' : 'dark');
      });
    });

    document.querySelectorAll('[data-copy]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const value = button.getAttribute('data-copy') || '';
        try { await navigator.clipboard.writeText(value); } catch (_) {}
        const old = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = old; }, 1000);
      });
    });

    const searchInput = document.querySelector('[data-local-filter]');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase();
        document.querySelectorAll('[data-searchable]').forEach((row) => {
          row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();

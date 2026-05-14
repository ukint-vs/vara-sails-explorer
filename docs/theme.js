// Vara Explorer — theme toggle (dark | light).
// See styles.css header for the brand-override note.
// Reads localStorage BEFORE first paint to prevent FOUC, so this script MUST
// be loaded synchronously in <head>.
(function () {
  var KEY = "vara-explorer-theme";
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  var theme = stored === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);

  function labelFor(t) { return t === "dark" ? "[LIGHT]" : "[DARK]"; }

  function apply(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(KEY, t); } catch (e) { /* ignore */ }
    var btns = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < btns.length; i++) btns[i].textContent = labelFor(t);
  }

  // After DOM is ready, wire up any toggle buttons and set their initial label.
  function init() {
    var btns = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      b.textContent = labelFor(document.documentElement.getAttribute("data-theme"));
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        var cur = document.documentElement.getAttribute("data-theme") || "dark";
        apply(cur === "dark" ? "light" : "dark");
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

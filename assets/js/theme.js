/* ============================================================
   theme.js — persistent theme with an explicit three-way choice.

   Rules
     • First visit  → follow the OS ("system").
     • After that   → whatever the visitor picked, kept in
                      localStorage under "ig-theme", across reloads.
     • "system"     → keeps tracking the OS live.

   Markup: put <div id="theme-switch"></div> in the header.
   Also paste the inline no-flash snippet (see INTEGRATION.md) in <head>.
   ============================================================ */
(function () {
  var KEY = "ig-theme";
  var MODES = [
    { id: "light",  label: "Light",  icon: "fa-sun" },
    { id: "dark",   label: "Dark",   icon: "fa-moon" },
    { id: "system", label: "System", icon: "fa-circle-half-stroke" }
  ];
  var mq = window.matchMedia("(prefers-color-scheme: dark)");

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return (v === "light" || v === "dark" || v === "system") ? v : "system";
    } catch (e) { return "system"; }
  }
  function resolve(mode) {
    return mode === "system" ? (mq.matches ? "dark" : "light") : mode;
  }
  function apply(mode) {
    var t = resolve(mode);
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.setAttribute("data-theme-mode", mode);
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    window.dispatchEvent(new CustomEvent("ig:themechange", { detail: { mode: mode, theme: t } }));
  }

  // Expose for other scripts (charts re-colour on change).
  window.IGTheme = {
    get mode() { return stored(); },
    get theme() { return resolve(stored()); },
    set: apply
  };

  // Live OS tracking only while in "system".
  var onOS = function () { if (stored() === "system") apply("system"); };
  if (mq.addEventListener) mq.addEventListener("change", onOS);
  else if (mq.addListener) mq.addListener(onOS);

  document.addEventListener("DOMContentLoaded", function () {
    apply(stored());

    var host = document.getElementById("theme-switch");
    if (!host) return;

    host.classList.add("theme-switch");
    host.innerHTML =
      '<button type="button" class="theme-switch-btn" aria-haspopup="listbox" aria-expanded="false">' +
        '<i class="fas" data-role="icon"></i><span data-role="label"></span>' +
        '<i class="fas fa-chevron-down theme-switch-caret"></i>' +
      '</button>' +
      '<ul class="theme-switch-menu" role="listbox" tabindex="-1">' +
        MODES.map(function (m) {
          return '<li role="option" data-mode="' + m.id + '" tabindex="0">' +
                   '<i class="fas ' + m.icon + '"></i><span>' + m.label + '</span>' +
                   '<i class="fas fa-check theme-switch-tick"></i></li>';
        }).join("") +
      '</ul>';

    var btn  = host.querySelector(".theme-switch-btn");
    var menu = host.querySelector(".theme-switch-menu");

    function sync() {
      var mode = stored();
      var m = MODES.filter(function (x) { return x.id === mode; })[0] || MODES[2];
      btn.querySelector('[data-role="icon"]').className = "fas " + m.icon;
      btn.querySelector('[data-role="label"]').textContent = m.label;
      btn.setAttribute("title", "Appearance: " + m.label);
      menu.querySelectorAll("li").forEach(function (li) {
        li.classList.toggle("is-active", li.dataset.mode === mode);
      });
    }
    function close() { host.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); }
    function open()  { host.classList.add("is-open");    btn.setAttribute("aria-expanded", "true"); }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      host.classList.contains("is-open") ? close() : open();
    });
    menu.addEventListener("click", function (e) {
      var li = e.target.closest("li"); if (!li) return;
      apply(li.dataset.mode); sync(); close();
    });
    menu.addEventListener("keydown", function (e) {
      var li = e.target.closest("li"); if (!li) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apply(li.dataset.mode); sync(); close(); btn.focus(); }
    });
    document.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("ig:themechange", sync);

    sync();
  });
})();

/* ============================================================
   levels.js — index.html only. Wires the L0-L3 selector in
   "The hierarchy" section (#levels): tab click swaps the stage's
   reference video, badge, name, blurb and the real-world P+FT
   success number for that level. Reads IG.levelMeta and
   IG.perLevel.average (figdata.js) — no numbers are hardcoded here.
   ============================================================ */
(function () {
  var LEVEL_COLOR = { L0: "var(--fig-l0)", L1: "var(--fig-l1)", L2: "var(--fig-l2)", L3: "var(--fig-l3)" };
  var VIDEO_BASE = "assets/media/levels/";

  function init() {
    var widget = document.getElementById("lvl-widget");
    if (!widget || !window.IG) return;

    var tabs = Array.prototype.slice.call(widget.querySelectorAll(".lvl-tab"));
    var badge = document.getElementById("lvl-badge");
    var name = document.getElementById("lvl-name");
    var blurb = document.getElementById("lvl-blurb");
    var statV = document.getElementById("lvl-stat-v");
    var statL = document.getElementById("lvl-stat-l");
    var shot = document.getElementById("lvl-shot");
    var video = document.getElementById("lvl-video");
    var shotLabel = document.getElementById("lvl-shot-label");
    var shotTitle = document.getElementById("lvl-shot-title");
    var shotDesc = document.getElementById("lvl-shot-desc");
    var shotCode = document.getElementById("lvl-shot-code");

    if (video) {
      video.addEventListener("error", function () { shot.classList.add("is-empty"); });
      video.addEventListener("loadeddata", function () { shot.classList.remove("is-empty"); });
    }

    function show(idx) {
      var meta = IG.levelMeta[idx];              // { id, name, blurb }
      var sr = IG.perLevel.average.sr[idx];       // real-world P+FT success at this level
      var color = LEVEL_COLOR[meta.id];
      var src = VIDEO_BASE + meta.id + "_sample.mp4";

      tabs.forEach(function (t, i) { t.classList.toggle("is-active", i === idx); t.setAttribute("aria-selected", i === idx ? "true" : "false"); });

      widget.style.setProperty("--lvl-c", color);
      if (badge) badge.textContent = meta.id;
      if (name) name.textContent = meta.name;
      if (blurb) blurb.textContent = meta.blurb;
      if (statL) statL.textContent = "real-world P+FT success at " + meta.id + ", averaged over 4 representative models";

      if (statV) {
        statV.dataset.countTo = sr;
        statV.dataset.countDecimals = "2";
        if (window.IGMotion) window.IGMotion.count(statV);
        else statV.textContent = (sr == null ? "—" : sr.toFixed(2));
      }

      if (shotLabel) shotLabel.textContent = "Reference · " + meta.id;
      if (shotTitle) shotTitle.textContent = meta.id;
      if (shotDesc) shotDesc.textContent = meta.blurb;
      if (shotCode) shotCode.textContent = src;
      if (video && video.getAttribute("src") !== src) {
        video.setAttribute("src", src);
        video.load();
      }
    }

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(i); });
    });

    // Distance-from-demonstration rail: level i has i+1 of 4 cells filled.
    tabs.forEach(function (t, i) {
      var cells = t.querySelectorAll(".lvl-tab-dist i");
      cells.forEach(function (c, j) { c.classList.toggle("is-filled", j <= i); });
    });

    show(0);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
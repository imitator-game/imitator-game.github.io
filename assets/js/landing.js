/* ============================================================
   landing.js — index.html only.

   Fills the four data-driven regions of the landing page from
   figdata.js, all after DOMContentLoaded (theme.js / motion.js /
   figdata.js / charts.js / site.js load first):

     #model-ticker   — the evaluated-models marquee in the hero
     #level-ladder   — the L0-L3 ladder cards
     #figdeck-nav    — tab buttons for the 6 results figures
                        (charts.js watches .ig-figdeck-panel via
                        MutationObserver, so toggling .is-active
                        here is enough to trigger drawing/replay)
     #lb-preview     — top-5-by-seen-SR leaderboard preview table

   This file was previously missing from the release, which is why
   the ladder/ticker/leaderboard-preview areas were empty and only
   the first results figure (the one already marked is-active in
   the HTML) was reachable — there was no nav to switch panels.
   ============================================================ */
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Re-run motion.js's reveal observer on nodes injected after its own
     DOMContentLoaded pass already fired (children of a [data-stagger]
     container that didn't exist yet when motion.js scanned the page). */
  function stagger(nodes, step) {
    if (!window.IGMotion) return;
    Array.prototype.forEach.call(nodes, function (n, i) {
      if (!n.hasAttribute("data-reveal")) n.setAttribute("data-reveal", "up");
      if (!n.dataset.revealDelay) n.dataset.revealDelay = String(i * (step || 90));
    });
    window.IGMotion.reveal();
  }

  /* ── 1 · Evaluated-models ticker (hero strip) ────────────── */
  function buildTicker() {
    var host = document.getElementById("model-ticker");
    if (!host || !window.IG) return;
    var seen = {};
    var items = [];
    IG.sim.forEach(function (r) {
      if (seen[r.model]) return;
      seen[r.model] = true;
      items.push(r);
    });
    var html = items.map(function (r) {
      return '<span class="ig-marquee-item" style="--dot:' + IG.famColor(r.fam) + '">' + esc(r.model) + "</span>";
    }).join("");
    // Duplicated once so the CSS marquee (`translateX(-50%)`, see motion.css
    // `@keyframes ig-marquee`) loops seamlessly instead of jumping.
    host.innerHTML = html + html;
  }

  /* ── 2 · Level ladder ─────────────────────────────────────── */
  function buildLadder() {
    var host = document.getElementById("level-ladder");
    if (!host || !window.IG) return;
    var LV_VAR = ["--fig-l0", "--fig-l1", "--fig-l2", "--fig-l3"];
    var LV_TONE = ["is-human", "is-robot", "is-sim", "is-robot"];
    var scores = (IG.perLevel && IG.perLevel.average && IG.perLevel.average.sr) || [0, 0, 0, 0];

    host.innerHTML = IG.levelMeta.map(function (lv, i) {
      var pct = Math.round((scores[i] || 0) * 100);
      var slug = lv.id.toLowerCase();
      return (
        '<div class="ladder-step" style="--lv:var(' + LV_VAR[i] + ')">' +
          '<div class="ig-shot ig-shot-4x3">' +
            '<span class="ig-shot-label ' + LV_TONE[i] + '">' + esc(lv.id) + "</span>" +
            '<video muted loop playsinline data-autoplay preload="metadata" ' +
              'src="assets/media/levels/' + slug + '_sample.mp4"></video>' +
            '<div class="ig-shot-slot">' +
              '<i class="fas fa-film"></i>' +
              "<div><b>" + esc(lv.id) + " reference clip</b></div>" +
              "<div>" + esc(lv.blurb) + "</div>" +
              "<code>assets/media/levels/" + slug + "_sample.mp4</code>" +
            "</div>" +
          "</div>" +
          '<div class="ladder-body">' +
            '<div class="ladder-id">' + esc(lv.id) + "</div>" +
            '<div class="ladder-name">' + esc(lv.name) + "</div>" +
            '<div class="ladder-desc">' + esc(lv.blurb) + "</div>" +
            '<div class="ladder-score"><b>' + pct + "%</b>" +
              "<span>real-world P+FT success, averaged over 4 representative models</span></div>" +
          "</div>" +
        "</div>"
      );
    }).join("");

    // Videos are injected after motion.js's own error-listener pass, so wire
    // the "file not filmed yet" placeholder fallback by hand here — same
    // behaviour as motion.js's initVideos()/gallery.js's videoPanel().
    host.querySelectorAll(".ig-shot video").forEach(function (v) {
      var shot = v.closest(".ig-shot");
      v.addEventListener("error", function () { shot.classList.add("is-empty"); });
      if (!v.getAttribute("src")) shot.classList.add("is-empty");
    });

    stagger(host.children, 120);
  }

  /* ── 3 · Figure-deck navigation ──────────────────────────── */
  function buildFigdeckNav() {
    var nav = document.getElementById("figdeck-nav");
    var deck = nav ? nav.closest(".ig-figdeck") : null;
    if (!nav || !deck) return;
    var panels = Array.prototype.slice.call(deck.querySelectorAll(".ig-figdeck-panel"));
    if (!panels.length) return;

    nav.innerHTML = panels.map(function (p) {
      var tag = p.querySelector(".ig-figure-tag");
      var title = p.querySelector(".ig-figure-title");
      var active = p.classList.contains("is-active");
      return (
        '<button type="button" class="ig-figdeck-tab' + (active ? " is-active" : "") +
          '" data-fig="' + esc(p.dataset.fig) + '">' +
          esc(title ? title.textContent : "Figure " + p.dataset.fig) +
          (tag ? "<small>" + esc(tag.textContent) + "</small>" : "") +
        "</button>"
      );
    }).join("");

    nav.addEventListener("click", function (e) {
      var btn = e.target.closest(".ig-figdeck-tab");
      if (!btn) return;
      var fig = btn.dataset.fig;
      nav.querySelectorAll(".ig-figdeck-tab").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
      panels.forEach(function (p) { p.classList.toggle("is-active", p.dataset.fig === fig); });
      // charts.js's watchDecks() MutationObserver picks up the class change
      // on the freshly-active panel and draws (first time) or replays
      // (subsequent times) the chart inside it — nothing else to do here.
      btn.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    });
  }

  /* ── 4 · Leaderboard preview (top 5 by seen SR) ──────────── */
  function buildLeaderboardPreview() {
    var host = document.getElementById("lb-preview");
    if (!host || !window.IG) return;
    var top = IG.sim.slice().sort(function (a, b) { return b.seen - a.seen; }).slice(0, 5);

    var rows = top.map(function (r, i) {
      return (
        '<div class="lbp-row" style="--tone:' + IG.famColor(r.fam) + ';--v:' + r.seen + '">' +
          '<span class="lbp-rank">' + (i + 1) + "</span>" +
          '<span class="lbp-name">' + esc(r.model) + "</span>" +
          '<span class="lbp-metric">' + r.seen.toFixed(2) + "<small>seen SR</small>" +
            '<span class="lbp-track"></span></span>' +
          '<span class="lbp-metric">' + r.pft.toFixed(2) + "<small>P+FT SR</small></span>" +
        "</div>"
      );
    }).join("");

    host.innerHTML =
      '<div class="lbp-head"><span></span><span>Model</span>' +
        '<span style="text-align:right">Seen SR</span><span style="text-align:right">P+FT SR</span></div>' +
      rows;
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildTicker();
    buildLadder();
    buildFigdeckNav();
    buildLeaderboardPreview();
  });
})();
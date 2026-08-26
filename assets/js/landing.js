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

  // window.IGMedia (the shared video/image interface pair) now lives in
  // site.js, which loads before this file on every page that needs it.

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

  /* ── 3 · Figure-deck navigation ──────────────────────────────
     A grouped, editorial index rather than a flat tab strip: figures
     cluster under the same Q1/Q2/Q3 the key-finding cards above already
     use, a heavy accent rail on each pill carries the figure's own
     chart colour so the picker previews the story before you click it,
     a progress rail + counter track position, and prev/next arrows (plus
     arrow-key / swipe) move linearly through the deck. Same data, same
     panels — only how you get between them changed.                    */
  var FIG_ACCENT = {
    0: "var(--fig-vla)", 1: "var(--fig-skill)", 2: "var(--fig-videova)",
    3: "var(--fig-l2)", 4: "var(--fig-l3)", 5: "var(--primary)"
  };
  var Q_LABEL = { Q1: "Interface", Q2: "Scale", Q3: "Hierarchy", Validity: "Sanity check" };

  function buildFigdeckNav() {
    var nav = document.getElementById("figdeck-nav");
    var deck = nav ? nav.closest(".ig-figdeck") : null;
    if (!nav || !deck) return;
    var panels = Array.prototype.slice.call(deck.querySelectorAll(".ig-figdeck-panel"));
    if (!panels.length) return;

    var counter = document.getElementById("figdeck-counter");
    var rail = document.getElementById("figdeck-rail");
    var prevBtn = document.getElementById("figdeck-prev");
    var nextBtn = document.getElementById("figdeck-next");

    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", "Result figures");

    // Group consecutive panels sharing the same data-q so a divider only
    // appears where the question actually changes.
    var groups = [];
    panels.forEach(function (p, i) {
      var q = p.dataset.q || "";
      if (!groups.length || groups[groups.length - 1].q !== q) groups.push({ q: q, items: [] });
      groups[groups.length - 1].items.push(i);
    });

    nav.innerHTML = groups.map(function (grp) {
      var head = grp.q ? '<span class="ig-figdeck-group-label">' + esc(Q_LABEL[grp.q] || grp.q) + "</span>" : "";
      var tabs = grp.items.map(function (i) {
        var p = panels[i];
        var tag = p.querySelector(".ig-figure-tag");
        var title = p.querySelector(".ig-figure-title");
        var active = p.classList.contains("is-active");
        var tabId = "figdeck-tab-" + i;
        p.id = "figdeck-panel-" + i;
        p.setAttribute("role", "tabpanel");
        p.setAttribute("aria-labelledby", tabId);
        p.setAttribute("tabindex", "0");
        if (active) p.removeAttribute("hidden"); else p.setAttribute("hidden", "");
        return (
          '<button type="button" role="tab" id="' + tabId + '" class="ig-figdeck-tab' +
            (active ? " is-active" : "") + '" data-fig="' + esc(p.dataset.fig) + '"' +
            ' style="--accent:' + (FIG_ACCENT[i] || "var(--primary)") + '"' +
            ' aria-selected="' + (active ? "true" : "false") + '"' +
            ' aria-controls="' + p.id + '" tabindex="' + (active ? "0" : "-1") + '">' +
            (tag ? "<small>" + esc(tag.textContent) + "</small>" : "") +
            "<span>" + esc(title ? title.textContent : "Figure " + p.dataset.fig) + "</span>" +
          "</button>"
        );
      }).join("");
      return '<div class="ig-figdeck-group">' + head + '<div class="ig-figdeck-group-tabs">' + tabs + "</div></div>";
    }).join("");

    if (rail) {
      rail.innerHTML = panels.map(function (p, i) {
        return '<span class="ig-figdeck-dot" data-fig="' + i + '" style="--accent:' + (FIG_ACCENT[i] || "var(--primary)") + '"></span>';
      }).join("");
    }

    var tabs = Array.prototype.slice.call(nav.querySelectorAll(".ig-figdeck-tab"));
    var dots = rail ? Array.prototype.slice.call(rail.querySelectorAll(".ig-figdeck-dot")) : [];

    function indexOfFig(fig) { return panels.findIndex(function (p) { return p.dataset.fig === fig; }); }

    function activate(fig, focus, silent) {
      var idx = indexOfFig(String(fig));
      if (idx === -1) return;
      tabs.forEach(function (b) {
        var on = b.dataset.fig === String(fig);
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.setAttribute("tabindex", on ? "0" : "-1");
        if (on && focus) b.focus();
      });
      panels.forEach(function (p) {
        var on = p.dataset.fig === String(fig);
        p.classList.toggle("is-active", on);
        if (on) p.removeAttribute("hidden"); else p.setAttribute("hidden", "");
      });
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === idx); });
      if (counter) counter.textContent = (idx + 1) + " / " + panels.length;
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = idx === panels.length - 1;
      // Only actual user interaction (a click, a prev/next press, arrow-key
      // navigation) should ever move the page. The silent call below just
      // initialises which panel starts active on page load — scrolling
      // there unconditionally was what jerked a fresh page load down to
      // the Results section every time (nowhere near the visitor clicking
      // anything), which is exactly the "jumps down, then back to top"
      // glitch.
      var activeTab = tabs[idx];
      if (activeTab && !silent) activeTab.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }

    nav.addEventListener("click", function (e) {
      var btn = e.target.closest(".ig-figdeck-tab");
      if (!btn) return;
      activate(btn.dataset.fig, false);
    });
    if (rail) {
      rail.addEventListener("click", function (e) {
        var dot = e.target.closest(".ig-figdeck-dot");
        if (dot) activate(dot.dataset.fig, false);
      });
    }
    if (prevBtn) prevBtn.addEventListener("click", function () {
      var idx = tabs.findIndex(function (b) { return b.classList.contains("is-active"); });
      if (idx > 0) activate(tabs[idx - 1].dataset.fig, false);
    });
    if (nextBtn) nextBtn.addEventListener("click", function () {
      var idx = tabs.findIndex(function (b) { return b.classList.contains("is-active"); });
      if (idx < tabs.length - 1) activate(tabs[idx + 1].dataset.fig, false);
    });

    nav.addEventListener("keydown", function (e) {
      var idx = tabs.indexOf(document.activeElement);
      if (idx === -1) return;
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(idx + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(idx - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); activate(next.dataset.fig, true); }
    });

    // Initialise counter/rail/arrow state for whichever panel started active.
    // `silent = true` — this is page-load setup, not a user picking a
    // panel, so it must not scroll the page anywhere (see the comment in
    // activate() above).
    var startFig = (panels.filter(function (p) { return p.classList.contains("is-active"); })[0] || panels[0]).dataset.fig;
    activate(startFig, false, true);
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
          '<span class="lbp-name">' + esc(r.model) +
            '<span class="lbp-fam" style="color:' + IG.famColor(r.fam) + ';border-color:' + IG.famColor(r.fam) + '">' + esc(IG.famShort(r.fam)) + "</span>" +
          "</span>" +
          '<span class="lbp-metric lbp-metric-muted">' + Math.round(r.zs * 100) + "%<small>zero-shot</small></span>" +
          '<span class="lbp-metric">' + r.seen.toFixed(2) + "<small>seen SR</small>" +
            '<span class="lbp-track"></span></span>' +
          '<span class="lbp-metric">' + r.pft.toFixed(2) + "<small>P+FT SR</small></span>" +
          '<span class="lbp-metric ' + (r.delta > 0 ? "lbp-delta-pos" : "lbp-delta-neg") + '">' + (r.delta > 0 ? "+" : "") + r.delta.toFixed(2) + "<small>Δ P+FT−Scr</small></span>" +
        "</div>"
      );
    }).join("");

    host.innerHTML =
      '<div class="lbp-head"><span></span><span>Model</span>' +
        '<span style="text-align:right">Zero-shot SR</span>' +
        '<span style="text-align:right">Seen SR</span>' +
        '<span style="text-align:right">P+FT SR</span>' +
        '<span style="text-align:right">Δ P+FT−Scr</span></div>' +
      rows;
  }

  /* ── 4b · Shared lazy-video loader ──────────────────────────
     Every reel/grid on this page can hold 30-150+ <video> tags. Loading
     and playing all of them the moment the page renders is the single
     biggest cause of homepage jank. Instead every video keeps its real
     URL in data-src and only gets .src/.load()/.play() when it actually
     scrolls into view, and gets paused (not just left playing off-screen)
     the moment it scrolls back out. Ancestors with overflow:hidden (the
     hero band, the reel rows) clip the intersection rect for us, so
     tiles sitting off to the side of a horizontally-scrolling marquee
     row correctly count as "not visible" even though the row container
     itself is on screen.

     opts.maxConcurrent additionally caps how many videos in this pool
     may be decoding/playing at once — on a wide hero even the on-screen
     slice can be a dozen+ tiles, and every extra concurrently-decoding
     video is real main-thread cost. Tiles beyond the cap stay loaded
     (so they're instant once a slot frees) but paused. */
  function lazyLoadVideos(nodes, opts) {
    opts = opts || {};
    var rootMargin = opts.rootMargin || "150px";
    var maxConcurrent = opts.maxConcurrent || 0; // 0 = uncapped
    var list = Array.prototype.slice.call(nodes);
    if (!list.length) return null;
    var playing = [];   // currently decoding/playing, honours maxConcurrent
    var waiting = [];   // visible + loaded, wants to play, parked over budget

    // Previously: a tile that was on-screen while the cap was already full
    // just stayed paused forever — nothing ever went back and gave it a
    // turn, which is why some visible reel tiles never autoplayed. Now
    // over-budget tiles are parked in `waiting`, and every time a slot
    // frees up (a tile leaves the viewport / finishes) we immediately
    // promote the next waiting tile — so with the reel's own motion
    // continuously cycling tiles through the viewport, every tile gets
    // its turn instead of a fixed first-10 winning forever.
    function fillFromWaiting() {
      if (!maxConcurrent) return;
      while (waiting.length && playing.length < maxConcurrent) {
        var v = waiting.shift();
        if (playing.indexOf(v) !== -1) continue;
        playing.push(v);
        if (v.paused) v.play().catch(function () {});
      }
    }
    function tryPlay(v) {
      if (maxConcurrent) {
        playing = playing.filter(function (p) { return !p.paused; });
        if (playing.indexOf(v) === -1) {
          if (playing.length >= maxConcurrent) {
            if (waiting.indexOf(v) === -1) waiting.push(v);
            return; // over budget — parked, plays as soon as a slot frees
          }
          playing.push(v);
        }
      }
      if (v.paused) v.play().catch(function () {});
    }
    function stop(v) {
      var idx = playing.indexOf(v);
      if (idx !== -1) playing.splice(idx, 1);
      var widx = waiting.indexOf(v);
      if (widx !== -1) waiting.splice(widx, 1);
      if (!v.paused) v.pause();
      fillFromWaiting();
    }

    list.forEach(function (v) {
      var tile = v.closest(".ig-reel-tile, .suite-task-video") || v;
      v.addEventListener("error", function () { tile.classList.add("is-empty"); });
      if (!v.dataset.src) tile.classList.add("is-empty");
    });

    if (!("IntersectionObserver" in window)) {
      list.forEach(function (v) {
        if (v.dataset.src) { v.src = v.dataset.src; v.load(); }
        tryPlay(v);
      });
      return null;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          if (v.dataset.src && v.getAttribute("src") !== v.dataset.src) {
            v.src = v.dataset.src;
            v.load();
          }
          tryPlay(v);
        } else {
          stop(v);
        }
      });
    }, { root: null, rootMargin: rootMargin, threshold: 0.01 });

    list.forEach(function (v) { io.observe(v); });
    return io;
  }

  /* ── 5 · Hero reel (multi-row still-frame mosaic) ─────
     Pulls real footage straight out of the Gallery manifest — human,
     robot and sim clips mixed together — into several rows, filling the
     full hero height, scrolling in alternating directions at different
     speeds. Each tile shows a single still frame (see lazyLoadPosterFrames
     / heroReelTileHtml below) — no autoplay, no concurrent-decode budget
     to manage. No cropping: each tile's *width* is set from that clip's
     own intrinsic aspect ratio once its metadata loads (object-fit:contain
     is only the safety net for the instant before that), instead of a
     guessed random width. Falls back to a flat placeholder tile per clip
     that hasn't been filmed yet. */
  // Row-to-row and tile-to-tile spacing are the SAME custom property
  // (--reel-gap, set on .ig-hero-reel in style.css) so they always match —
  // adjust that one variable to change spacing everywhere in the reel.
  var REEL_GAP_PX = 14; // keep in sync with --reel-gap in style.css

  function buildReelRows(count) {
    var heights = [76, 104, 88, 112, 82, 98, 90, 106];
    var rows = [];
    for (var i = 0; i < count; i++) {
      var h = heights[i % heights.length];
      rows.push({
        dir: i % 2 === 0 ? "left" : "right",
        dur: (50 + (i % 5) * 9) + "s",
        h: h,
        // Assume a ~16:9-ish average tile width up front for a reasonable
        // tile count; real widths correct themselves once metadata loads.
        n: Math.max(9, Math.ceil(2800 / (h * 1.5 + 12)))
      });
    }
    return rows;
  }

  // Enough rows (of varying height, like a real mosaic) to fill the hero's
  // actual on-screen height with --reel-gap between every row — computed
  // from the live viewport instead of a fixed count, so a tall monitor and
  // a short laptop screen both end up with a reel that exactly fills the
  // hero band, with no leftover gap and no overflow. Recomputed on resize.
  function reelRowCountForHeight(px) {
    var heights = [76, 104, 88, 112, 82, 98, 90, 106];
    var avg = heights.reduce(function (a, b) { return a + b; }, 0) / heights.length;
    return Math.max(5, Math.ceil(px / (avg + REEL_GAP_PX)));
  }

  function collectReelPool() {
    if (typeof MANIFEST_DATA === "undefined") return [];
    var tasks = MANIFEST_DATA.tasks || {};
    var base = MANIFEST_DATA.video_base || MANIFEST_DATA.media_base || "";
    var seen = {};
    var pool = [];
    Object.keys(tasks).forEach(function (tg) {
      var levels = tasks[tg].levels || {};
      ["L0", "L1", "L2", "L3"].forEach(function (lv) {
        var ld = levels[lv];
        if (!ld) return;
        [["human_video", "human"], ["robot_video", "robot"], ["sim_video", "sim"]].forEach(function (pair) {
          var url = ld[pair[0]];
          if (!url || seen[url]) return;
          seen[url] = true;
          // taskId carries straight through to the tile's href so clicking
          // any clip in the reel jumps to that exact task in the Gallery.
          pool.push({ url: base + url, kind: pair[1], taskId: tg });
        });
      });
    });
    // Fisher-Yates — decorative shuffle, a fresh mosaic each page load.
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool;
  }

  // Sizes a reel tile to its clip's real aspect ratio once metadata is
  // known, instead of a guessed width — this is what removes the crop.
  function fitReelTileToVideo(tile, video, h) {
    function apply() {
      var vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh) return;
      tile.style.setProperty("--w", Math.round(h * (vw / vh)) + "px");
    }
    if (video.readyState >= 1) apply();
    else video.addEventListener("loadedmetadata", apply, { once: true });
  }

  // Lightweight loader for the hero reel: it shows one still frame per
  // clip, never plays, so there is no decode budget to manage and no
  // autoplay/pause bookkeeping at all — just fetch the frame once, when
  // the tile scrolls near the viewport, and leave it. Far cheaper than
  // the old always-decoding hero reel, and it's what makes every tile
  // show up reliably instead of only the first N under a concurrency cap.
  // Shared, page-wide concurrency budget for poster-frame decoding. The
  // hero reel fills the *entire* hero height, so dozens of tiles can be
  // "visible" (within rootMargin) in the same instant — without a global
  // cap, every one of them would start decoding a video frame in the
  // same tick, which is exactly the initial-load stutter this budget
  // removes. Tiles queue up and are served a few at a time; the next one
  // starts the moment a slot frees up, so nothing is ever skipped, just
  // spread out over a few hundred ms instead of hitting all at once.
  var POSTER_FRAME_MAX_CONCURRENT = 3;
  var posterFrameActive = 0;
  var posterFrameQueue = [];

  function pumpPosterFrameQueue() {
    while (posterFrameActive < POSTER_FRAME_MAX_CONCURRENT && posterFrameQueue.length) {
      var v = posterFrameQueue.shift();
      posterFrameActive++;
      var freed = false;
      var done = function () {
        if (freed) return;
        freed = true;
        posterFrameActive--;
        pumpPosterFrameQueue();
      };
      v.addEventListener("loadeddata", done, { once: true });
      v.addEventListener("error", done, { once: true });
      v.src = v.dataset.src;
      v.load();
      // Safety net: some browsers are inconsistent firing loadeddata for
      // preload="metadata" + a #t= media-fragment seek, so never let one
      // stuck tile eat a queue slot forever.
      setTimeout(done, 4000);
    }
  }

  function lazyLoadPosterFrames(nodes, opts) {
    opts = opts || {};
    var rootMargin = opts.rootMargin || "200px";
    var list = Array.prototype.slice.call(nodes);
    if (!list.length) return null;

    list.forEach(function (v) {
      var tile = v.closest(".ig-reel-tile") || v;
      v.addEventListener("error", function () { tile.classList.add("is-empty"); });
      if (!v.dataset.src) tile.classList.add("is-empty");
    });

    function requestFrame(v) {
      if (v.dataset.loaded) return;
      v.dataset.loaded = "1";
      posterFrameQueue.push(v);
      pumpPosterFrameQueue();
    }

    if (!("IntersectionObserver" in window)) {
      list.forEach(requestFrame);
      return null;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { requestFrame(entry.target); io.unobserve(entry.target); }
      });
    }, { root: null, rootMargin: rootMargin, threshold: 0.01 });
    list.forEach(function (v) { io.observe(v); });
    return io;
  }

  function heroReelTileHtml(item, h) {
    // Default width guess (16:9) — corrected the instant real metadata loads.
    var w = Math.round(h * 1.6);
    var href = item.taskId ? "gallery.html#task=" + encodeURIComponent(item.taskId) : "gallery.html";
    // The #t=0.1 fragment (Media Fragments URI) tells the browser to seek
    // to that instant, so a preload="metadata" video decodes and shows
    // just that one frame instead of playing — a thumbnail with no extra
    // image assets to generate, and no ongoing decode cost.
    return (
      '<a class="ig-reel-tile tone-' + item.kind + '" href="' + esc(href) + '" style="--h:' + h + 'px;--w:' + w + 'px">' +
        '<video muted playsinline preload="metadata" data-src="' + esc(item.url) + '#t=0.1"></video>' +
        '<span class="ig-reel-fallback"><i class="fas fa-film"></i></span>' +
      '</a>'
    );
  }

  // Cache real intrinsic sizes per clip URL — so when the SAME clip shows
  // up twice (main row + its cloned duplicate, see finalizeReelRow below),
  // the second copy doesn't have to independently decode metadata to know
  // its own width; it can just read this cache instantly.
  var reelSizeCache = Object.create(null);

  function buildHeroReel() {
    var host = document.getElementById("hero-reel");
    if (!host) return;
    var pool = collectReelPool();
    if (!pool.length) return;

    // Fill the hero's real on-screen height, not a fixed guess of 6 rows —
    // see reelRowCountForHeight() above. window.innerHeight already
    // includes the header's own height, and the hero band is sized to
    // (100dvh + header height) so this lines up exactly.
    var rows = buildReelRows(reelRowCountForHeight(window.innerHeight));

    var cursor = 0;
    // Build ONE copy of each row's tiles — NOT the old `rowHtml + rowHtml`.
    // Two independently-lazy-loaded DOM copies of the same content used to
    // decode their video frames at different times, so the two "halves"
    // the translateX(-50%) loop depends on drifted apart in width and the
    // marquee visibly jumped/stuttered at the seam. Instead we finalize
    // real sizes on this single copy first, then clone it (see
    // finalizeReelRow) once everything has settled — the clone is then
    // guaranteed pixel-identical, and its <video src> is byte-identical
    // too, so the browser cache serves it instantly with no real second
    // network fetch or decode.
    var rowsHtml = rows.map(function (row) {
      var tiles = [];
      for (var k = 0; k < row.n; k++) {
        var item = pool[cursor % pool.length]; cursor++;
        tiles.push(heroReelTileHtml(item, row.h));
      }
      return '<div class="ig-hero-reel-row is-pending" data-dir="' + row.dir + '" style="--dur:' + row.dur + '">' +
        tiles.join("") + '</div>';
    }).join("");
    host.innerHTML = rowsHtml;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      host.querySelectorAll(".ig-reel-tile").forEach(function (t) { t.classList.add("is-empty"); });
      host.querySelectorAll(".ig-hero-reel-row").forEach(function (row) { row.classList.remove("is-pending"); });
      return;
    }

    host.querySelectorAll(".ig-hero-reel-row").forEach(function (row) { finalizeReelRow(row); });
  }

  // Waits for every tile's real size in a single row to settle (or a
  // capped timeout, so one slow/broken clip can't stall the row forever),
  // THEN clones the row for the seamless duplicate and starts the
  // marquee — this ordering is what actually fixes the loop stutter.
  // Shared by the hero reel (poster-frame tiles) and the task reel
  // (looping video tiles further down the page) via `opts.loader`.
  function finalizeReelRow(row, opts) {
    opts = opts || {};
    var loader = opts.loader || lazyLoadPosterFrames;
    var rootMargin = opts.rootMargin || "150px";
    var loaderExtra = opts.maxConcurrent ? { maxConcurrent: opts.maxConcurrent } : {};

    var tiles = Array.prototype.slice.call(row.querySelectorAll(".ig-reel-tile"));
    var pending = tiles.length;
    if (!pending) { start(); return; }

    tiles.forEach(function (tile) {
      var video = tile.querySelector("video");
      var h = parseFloat(tile.style.getPropertyValue("--h")) || 92;
      var url = video && video.dataset.src;
      var cached = url && reelSizeCache[url];

      function settle() { if (--pending <= 0) start(); }

      if (!video) { settle(); return; }
      // No width-change transition while we're still settling — a visible
      // resize mid-scroll is exactly the "twitch" we're removing.
      tile.style.transition = "none";

      if (cached) {
        tile.style.setProperty("--w", cached + "px");
        settle();
      } else {
        fitReelTileToVideo(tile, video, h);
        video.addEventListener("loadedmetadata", function () {
          if (url && video.videoWidth && video.videoHeight) {
            reelSizeCache[url] = Math.round(h * (video.videoWidth / video.videoHeight));
          }
          settle();
        }, { once: true });
        video.addEventListener("error", settle, { once: true });
      }
    });

    var extend = Object.assign({ rootMargin: rootMargin }, loaderExtra);
    loader(row.querySelectorAll(".ig-reel-tile video"), extend);
    // Safety net: never let a stuck/offline clip freeze the row in its
    // paused pre-loop state.
    var fallback = setTimeout(start, 1600);

    function start() {
      if (row.dataset.finalized) return;
      row.dataset.finalized = "1";
      clearTimeout(fallback);
      tiles.forEach(function (t) { t.style.transition = ""; });
      // Duplicate the tiles WITHIN this same row — NOT a whole extra row.
      // The row's own translateX(-50%) marquee needs to loop through 2x
      // ITS OWN content horizontally (exactly what the old `rowHtml +
      // rowHtml` string-concat used to do). Inserting a cloned *row* as a
      // sibling (row.after(clone)) was a bug: since rows stack vertically
      // in `.ig-hero-reel`, that added a whole second visual row under
      // the first instead of extending one row sideways — the "double
      // rows" glitch. Appending clones of the tiles themselves keeps
      // everything inside the single scrolling row it belongs to.
      var clones = tiles.map(function (t) {
        var c = t.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        // cloneNode also copies the *loaded* state (the already-resolved
        // `src` attribute, and our own `data-loaded` marker) — left as-is,
        // every loader would see "src already matches, nothing to do" and
        // skip it, since a cloned <video> doesn't actually start decoding
        // just because it inherited a src attribute (that only happens via
        // an explicit .load()/.src= call or parser-driven creation, not
        // cloneNode). Strip that state so the clone gets a completely
        // normal fresh load through the same loader path as any other
        // tile — the URL is identical to one the browser just fetched, so
        // this still resolves straight from HTTP cache.
        var cv = c.querySelector("video");
        if (cv) { cv.removeAttribute("src"); delete cv.dataset.loaded; }
        return c;
      });
      clones.forEach(function (c) { row.appendChild(c); });
      // The clones' <video data-src> is byte-identical to the originals',
      // so this second load is served straight from the browser's HTTP
      // cache — no real extra network fetch, and it still respects the
      // same concurrency budget as everything else.
      var cloneVideos = clones.map(function (c) { return c.querySelector("video"); }).filter(Boolean);
      loader(cloneVideos, extend);
      // Only now do both halves exist at their final width — safe to let
      // the CSS marquee animation run.
      row.classList.remove("is-pending");
    }
  }

  // Rebuild the hero reel's row count when the viewport height changes
  // enough to need more/fewer rows (rotating a tablet, resizing a
  // desktop window) — debounced so it doesn't thrash during drag-resize.
  //
  // Mobile Safari/Chrome fire `resize` while the page is being scrolled,
  // not just when the window actually changes shape: their address
  // bar/toolbar collapses or expands as you scroll, and innerHeight
  // shifts by however tall that bar is (usually well under ~150px) with
  // innerWidth untouched. Reacting to that the same way as a real resize
  // used to rebuild the whole reel mid-scroll — fresh shuffled tiles,
  // marquee animations restarted from position 0 — which is exactly what
  // looked like the reel suddenly jumping backward/forward while you were
  // scrolling past it. A genuine resize always changes the width too
  // (rotating the device, dragging a desktop window), or changes the
  // height by far more than a toolbar ever does; only those should
  // trigger a rebuild.
  (function watchHeroReelHeight() {
    var lastCount = -1, timer = null;
    var lastW = window.innerWidth, lastH = window.innerHeight;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var w = window.innerWidth, h = window.innerHeight;
        var widthChanged = Math.abs(w - lastW) > 2;
        var heightJump = Math.abs(h - lastH) > 150;
        lastW = w; lastH = h;
        if (!widthChanged && !heightJump) return;
        var count = reelRowCountForHeight(h);
        if (count !== lastCount) { lastCount = count; buildHeroReel(); }
      }, 220);
    });
  })();

  /* ── 6 · Evaluation suite — the ten headline tasks, indexed by name ──
     Not a random sample of the wider task pool: this grid is keyed to
     the exact ten task names the results tables report on
     (PickRemoteControl, ScanMilkBox, PourKettle, PickFood, FoldBox,
     StirSpoon, PlacePlateRack, PlaceFileFolder, FoldTowel, PlaceMugRack).
     Each is resolved against MANIFEST_DATA by matching that name inside
     its L0 sim_task_id (e.g. "L0_TwoRobotStirSpoon-v1") — the same ID
     space task_mapping.json uses to line human/robot/sim task IDs up —
     so a card always shows the correct real-robot H-task rollout, the
     matching sim rollout, and the paired human reference clip, not
     whatever happened to be filmed under a similar name.

     Layout: a real CSS grid (auto-fill, one `gap`) so column spacing
     and row spacing always match and the grid always fills the band's
     width, and every video panel is a fixed 16:9 box, so card height
     never depends on which clip loaded first and cropping is the same
     controlled amount everywhere, not a random per-tile guess. */
  var HEADLINE_TASKS = [
    "PickRemoteControl", "ScanMilkBox", "PourKettle", "PickFood", "FoldBox",
    "StirSpoon", "PlacePlateRack", "PlaceFileFolder", "FoldTowel", "PlaceMugRack"
  ];
  var SUITE_LEVELS = ["L0", "L1", "L2", "L3"];

  function findTaskIdByName(tasks, shortName) {
    var re = new RegExp("TwoRobot" + shortName + "-v1$");
    var ids = Object.keys(tasks);
    for (var i = 0; i < ids.length; i++) {
      var l0 = tasks[ids[i]].levels && tasks[ids[i]].levels.L0;
      if (l0 && l0.sim_task_id && re.test(l0.sim_task_id)) return ids[i];
    }
    return null;
  }

  function resolveHeadlineTasks() {
    if (typeof MANIFEST_DATA === "undefined") return [];
    var tasks = MANIFEST_DATA.tasks || {};
    return HEADLINE_TASKS.map(function (name) {
      var id = findTaskIdByName(tasks, name);
      return id ? { shortName: name, id: id, task: tasks[id] } : null;
    }).filter(Boolean);
  }

  var suiteEntries = null;   // resolved once, reused across level switches
  var suiteGridHost = null;

  function suiteVideoPanel(kind, label, url) {
    return (
      '<div class="suite-task-video' + (url ? "" : " is-empty") + '" data-kind="' + kind + '">' +
        '<span class="suite-task-video-label">' + esc(label) + "</span>" +
        (url
          ? '<video muted loop playsinline preload="none" data-src="' + esc(url) + '"></video>'
          : "") +
        '<span class="suite-task-video-fallback"><i class="fas fa-film"></i></span>' +
      "</div>"
    );
  }

  function renderSuiteLevel(level) {
    if (!suiteGridHost || !suiteEntries) return;
    if (!suiteEntries.length) {
      suiteGridHost.innerHTML = '<div class="suite-task-grid-empty">No gallery footage indexed for this build yet.</div>';
      return;
    }
    var base = (typeof MANIFEST_DATA !== "undefined" && (MANIFEST_DATA.video_base || MANIFEST_DATA.media_base)) || "";
    suiteGridHost.innerHTML = suiteEntries.map(function (entry) {
      var t = entry.task;
      var ld = (t.levels || {})[level] || {};
      var human = ld.human_video ? base + ld.human_video : (t.human_video ? base + t.human_video : "");
      var robot = ld.robot_video ? base + ld.robot_video : "";
      var sim = ld.sim_video ? base + ld.sim_video : "";
      return (
        '<div class="suite-task-card">' +
          '<div class="suite-task-card-head">' +
            '<span class="suite-task-card-title">' + esc(t.display_name || entry.shortName) + "</span>" +
            '<span class="suite-task-card-id">' + esc(entry.shortName) + "</span>" +
          "</div>" +
          '<div class="suite-task-card-desc">' + esc(ld.gallery_desc || t.task_intent || "") + "</div>" +
          '<div class="suite-task-videos">' +
            suiteVideoPanel("human", "Human", human) +
            suiteVideoPanel("robot", "Real Robot", robot) +
            suiteVideoPanel("sim", "Simulation", sim) +
          "</div>" +
        "</div>"
      );
    }).join("");

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      suiteGridHost.querySelectorAll(".suite-task-video").forEach(function (t) {
        if (!t.querySelector("video")) t.classList.add("is-empty");
      });
      return;
    }
    // Grid starts well below the fold, so give tiles a generous rootMargin —
    // they finish loading before the user actually scrolls to them.
    lazyLoadVideos(suiteGridHost.querySelectorAll(".suite-task-video video"), { rootMargin: "300px" });
  }

  function buildSuiteTaskGrid() {
    suiteGridHost = document.getElementById("suite-task-grid");
    if (!suiteGridHost) return;
    suiteEntries = resolveHeadlineTasks();
    renderSuiteLevel("L0");

    var tabs = document.getElementById("suite-level-tabs");
    if (!tabs) return;
    tabs.addEventListener("click", function (e) {
      var btn = e.target.closest(".suite-level-tab");
      if (!btn) return;
      Array.prototype.forEach.call(tabs.querySelectorAll(".suite-level-tab"), function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      renderSuiteLevel(btn.dataset.level);
    });
  }

  /* ── 6b · Scrolling reel of the ten headline tasks ─────────────
     A second, dynamic view onto the exact same ten tasks as the grid
     above — not the grid's static cards, a continuously scrolling
     mosaic like the hero reel, but the pool is restricted to these ten
     tasks (all four levels, all three sources) instead of the full
     53-task Gallery pool, and each tile is labelled with its task +
     level. Same no-crop (aspect-ratio-fitted tiles), same lazy-load +
     concurrency cap discipline as the hero reel. */
  var TASK_REEL_MAX_CONCURRENT = 16;

  function collectTaskReelPool() {
    var entries = suiteEntries || resolveHeadlineTasks();
    var base = (typeof MANIFEST_DATA !== "undefined" && (MANIFEST_DATA.video_base || MANIFEST_DATA.media_base)) || "";
    var pool = [];
    entries.forEach(function (entry) {
      var t = entry.task;
      SUITE_LEVELS.forEach(function (lv) {
        var ld = (t.levels || {})[lv];
        if (!ld) return;
        [["human_video", "human"], ["robot_video", "robot"], ["sim_video", "sim"]].forEach(function (pair) {
          var url = ld[pair[0]] || (pair[0] === "human_video" ? t.human_video : null);
          if (!url) return;
          pool.push({
            url: base + url, kind: pair[1], level: lv, taskId: entry.id,
            label: (t.display_name || entry.shortName) + " · " + lv
          });
        });
      });
    });
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool;
  }

  function buildTaskReel() {
    var host = document.getElementById("task-reel");
    if (!host) return;
    var pool = collectTaskReelPool();
    if (!pool.length) return;

    // Three rows, ALL the same height — explicitly requested: earlier this
    // varied per row (116/104/116), which reads as tiles "scaling" between
    // rows even though each individual tile is uncropped. One fixed height
    // for every row removes that inconsistency; only dir/dur vary so it
    // doesn't look like one row copy-pasted three times.
    var TASK_ROW_H = 116;
    var rows = [
      { dir: "left",  dur: "58s", h: TASK_ROW_H },
      { dir: "right", dur: "70s", h: TASK_ROW_H },
      { dir: "left",  dur: "64s", h: TASK_ROW_H }
    ];
    var cursor = 0;
    var rowsHtml = rows.map(function (row) {
      var perRow = Math.max(10, Math.ceil(2600 / (row.h * 1.5 + 14)));
      var tiles = [];
      for (var k = 0; k < perRow; k++) {
        var item = pool[cursor % pool.length]; cursor++;
        var w = Math.round(row.h * 1.6);
        var href = item.taskId ? "gallery.html#task=" + encodeURIComponent(item.taskId) : "gallery.html";
        tiles.push(
          '<a class="ig-reel-tile tone-' + item.kind + '" href="' + esc(href) + '" title="' + esc(item.label) +
            '" style="--h:' + row.h + 'px;--w:' + w + 'px">' +
            '<span class="ig-reel-lv">' + esc(item.label) + '</span>' +
            '<video muted loop playsinline preload="none" data-src="' + esc(item.url) + '"></video>' +
            '<span class="ig-reel-fallback"><i class="fas fa-film"></i></span>' +
          '</a>'
        );
      }
      // Single copy per row now — see finalizeReelRow for why the old
      // `rowHtml + rowHtml` duplication caused the loop to stutter.
      return '<div class="ig-hero-reel-row is-pending" data-dir="' + row.dir + '" style="--dur:' + row.dur + '">' + tiles.join("") + '</div>';
    }).join("");
    host.innerHTML = rowsHtml;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      host.querySelectorAll(".ig-reel-tile").forEach(function (t) { t.classList.add("is-empty"); });
      host.querySelectorAll(".ig-hero-reel-row").forEach(function (row) { row.classList.remove("is-pending"); });
      return;
    }
    host.querySelectorAll(".ig-hero-reel-row").forEach(function (row) {
      finalizeReelRow(row, { loader: lazyLoadVideos, rootMargin: "250px", maxConcurrent: TASK_REEL_MAX_CONCURRENT });
    });
  }

  /* ── 7 · Level-hierarchy widget (#lvl-widget) ──────────────────
     "One task, four distances from the demonstration" — five fixed
     clips shot for this widget specifically (assets/media/levels/):
       human_ref.mp4                     — ONE shared reference clip
       l0_sample.mp4 … l3_sample.mp4     — that level's rollout
     The human side is the same physical <video> element/source for
     every level — switching tabs must never reset or reload it, only
     the rollout side changes. */
  var LEVEL_CLIP_BASE = "assets/media/levels/";
  var LEVEL_SAMPLE = { L0: "l0_sample.mp4", L1: "l1_sample.mp4", L2: "l2_sample.mp4", L3: "l3_sample.mp4" };
  var LEVEL_HUMAN_REF = "human_ref.mp4";

  /* Hover-and-hold flip: front = the shared human demonstration, back =
     that level's rollout sample. The level tabs only ever swap the back
     face's source — the front face is loaded once at init and just
     keeps playing straight through every tab switch. */
  function buildLevelWidget() {
    var widget = document.getElementById("lvl-widget");
    if (!widget) return;
    var tasks = (typeof MANIFEST_DATA !== "undefined" && MANIFEST_DATA.tasks) || {};
    var demoId = findTaskIdByName(tasks, "StirSpoon") || Object.keys(tasks)[0];
    var demo = tasks[demoId] || {};

    var tabs = Array.prototype.slice.call(widget.querySelectorAll(".lvl-tab"));
    var flip = document.getElementById("lvl-shot");
    var shotFront = document.getElementById("lvl-shot-front");
    var shotBack = document.getElementById("lvl-shot-back");
    var videoFront = document.getElementById("lvl-video-front");
    var videoBack = document.getElementById("lvl-video-back");
    var labelFront = document.getElementById("lvl-shot-label-front");
    var labelBack = document.getElementById("lvl-shot-label-back");
    var codeFront = document.getElementById("lvl-shot-code-front");
    var codeBack = document.getElementById("lvl-shot-code-back");
    var badge = document.getElementById("lvl-badge");
    var nameEl = document.getElementById("lvl-name");
    var blurbEl = document.getElementById("lvl-blurb");

    function isInViewport(el) {
      var r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight);
    }
    // The back face only ever plays while actually flipped into view —
    // no point decoding the rollout clip while the human side is showing.
    function isBackAllowedToPlay() {
      return !!(flip && flip.classList.contains("is-flipped"));
    }

    // Loads the shared human-reference clip exactly once. Called only
    // from init, never from show() — that's what keeps it playing
    // uninterrupted across every level switch instead of restarting.
    function initHumanRef() {
      var full = LEVEL_CLIP_BASE + LEVEL_HUMAN_REF;
      if (codeFront) codeFront.textContent = full;
      if (shotFront) shotFront.classList.remove("is-empty");
      if (!videoFront) return;
      videoFront.src = full;
      videoFront.load();
      videoFront.addEventListener("error", function () {
        if (shotFront) shotFront.classList.add("is-empty");
      });
      if (isInViewport(videoFront)) videoFront.play().catch(function () {});
    }

    function setBackSrc(lv) {
      var url = LEVEL_CLIP_BASE + (LEVEL_SAMPLE[lv] || "");
      var full = url;
      if (codeBack) codeBack.textContent = full;
      if (shotBack) shotBack.classList.remove("is-empty");
      if (!videoBack) return;
      videoBack.src = full;
      videoBack.load();
      videoBack.onerror = function () { if (shotBack) shotBack.classList.add("is-empty"); };
    }

    function show(lv) {
      var meta = (typeof MANIFEST_DATA !== "undefined" && (MANIFEST_DATA.levels || {})[lv]) || {};
      var tabEl = widget.querySelector('.lvl-tab[data-level="' + lv + '"]');
      var tabName = tabEl ? tabEl.querySelector(".lvl-tab-name") : null;

      widget.style.setProperty("--lvl-c", "var(--fig-" + lv.toLowerCase() + ")");
      tabs.forEach(function (t) {
        var on = t.dataset.level === lv;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      // Distance-from-demonstration rail: fill dots up to the active level.
      tabs.forEach(function (t) {
        var tIdx = SUITE_LEVELS.indexOf(t.dataset.level);
        t.querySelectorAll(".lvl-tab-dist i").forEach(function (dot, i) {
          dot.classList.toggle("is-filled", i <= tIdx);
        });
      });

      if (labelFront) labelFront.textContent = "Human demonstration (shared reference)";
      if (labelBack) labelBack.textContent = "Rollout sample · " + lv;
      if (badge) badge.textContent = lv;
      if (nameEl) nameEl.textContent = (meta.name || (tabName && tabName.textContent) || lv);
      if (blurbEl) blurbEl.textContent = meta.desc || "";

      // Changing level always lands you back on the human side first —
      // hover again to see that level's rollout. The human clip itself
      // is untouched: only the flip state resets, not its src/currentTime.
      if (flip) flip.classList.remove("is-flipped");
      if (videoBack && !videoBack.paused) videoBack.pause();

      setBackSrc(lv);
    }

    widget.addEventListener("click", function (e) {
      var btn = e.target.closest(".lvl-tab");
      if (!btn) return;
      show(btn.dataset.level);
    });

    // This section sits well below the fold, so a single play() call at
    // tab-switch time isn't enough on its own — autoplay/pause on scroll
    // like every other reel on the page, for whichever face is current.
    [videoFront, videoBack].forEach(function (video) {
      if (!video || !("IntersectionObserver" in window)) return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var allowed = video === videoBack ? isBackAllowedToPlay() : true;
          if (entry.isIntersecting && allowed) {
            if (video.getAttribute("src") && video.paused) video.play().catch(function () {});
          } else if (!video.paused) {
            video.pause();
          }
        });
      }, { threshold: 0.15 });
      io.observe(video);
    });

    // Flip in → start the rollout clip from the top; flip out → pause it,
    // so it's never quietly decoding behind the human side. The human
    // clip is completely unaffected by flipping either way.
    if (flip) {
      flip.addEventListener("ig:flip", function (e) {
        if (e.detail.flipped) {
          if (videoBack && videoBack.getAttribute("src") && isInViewport(videoBack)) {
            videoBack.currentTime = 0;
            videoBack.play().catch(function () {});
          }
        } else if (videoBack && !videoBack.paused) {
          videoBack.pause();
        }
      });
    }

    initHumanRef();
    show("L0");
  }


  /* ── 8 · Suite task chips — the ten named tasks, linked to the Gallery ──
     Moved here from the Leaderboard page: five tasks the models trained
     on and five they never saw, laid out as two even rows of five so the
     seen/unseen split is visually symmetric (an auto-fill grid produced a
     lopsided 4+1 wrap at some widths — an explicit 5-column grid can't). */
  var SEEN_TASK_NAMES = { StirSpoon: 1, PlacePlateRack: 1, FoldTowel: 1, PlaceMugRack: 1, PlaceFileFolder: 1 };
  var CHIP_ORDER = [
    "StirSpoon", "PlacePlateRack", "FoldTowel", "PlaceMugRack", "PlaceFileFolder",
    "PickRemoteControl", "ScanMilkBox", "PourKettle", "PickFood", "FoldBox"
  ];

  function buildSuiteChips() {
    var host = document.getElementById("suite-task-chips");
    if (!host || typeof MANIFEST_DATA === "undefined") return;
    var tasks = MANIFEST_DATA.tasks || {};
    var html = CHIP_ORDER.map(function (name) {
      var id = findTaskIdByName(tasks, name);
      var t = id ? tasks[id] : null;
      var display = t ? (t.display_name || name) : name;
      var desc = t ? (t.task_intent || "") : "";
      var isSeen = !!SEEN_TASK_NAMES[name];
      return (
        '<a class="suite-chip ' + (isSeen ? "is-seen" : "is-unseen") + '" href="gallery.html#task=' + encodeURIComponent(id || "") + '">' +
          '<span class="suite-chip-top">' +
            '<span class="suite-chip-id">' + esc(display) + '</span>' +
            '<span class="suite-chip-tag">' + (isSeen ? "Seen" : "Unseen") + '</span>' +
          '</span>' +
          '<span class="suite-chip-desc">' + esc(desc) + '</span>' +
        '</a>'
      );
    }).join("");
    host.innerHTML = html;
    stagger(host.querySelectorAll(".suite-chip"), 45);
  }

  /* ── 9 · Seen / Unseen suite cards — hover-and-hold flip ──────────────
     Front keeps the existing prose. Back lists that card's five tasks,
     each one a real link into the Gallery, resolved through the same
     findTaskIdByName() the chips/reel already use so the two views can
     never drift out of sync with each other. */
  function buildSuiteCardFlipLists() {
    if (typeof MANIFEST_DATA === "undefined") return;
    var tasks = MANIFEST_DATA.tasks || {};
    var seenHost = document.getElementById("suite-card-seen-list");
    var unseenHost = document.getElementById("suite-card-unseen-list");
    if (!seenHost && !unseenHost) return;

    function itemHtml(name) {
      var id = findTaskIdByName(tasks, name);
      var t = id ? tasks[id] : null;
      var display = t ? (t.display_name || name) : name;
      var href = "gallery.html#task=" + encodeURIComponent(id || "");
      return (
        '<a class="suite-card-task" href="' + href + '">' +
          '<span class="suite-card-task-name">' + esc(display) + '</span>' +
          '<i class="fas fa-arrow-right" aria-hidden="true"></i>' +
        '</a>'
      );
    }

    var seenNames = CHIP_ORDER.filter(function (n) { return SEEN_TASK_NAMES[n]; });
    var unseenNames = CHIP_ORDER.filter(function (n) { return !SEEN_TASK_NAMES[n]; });
    if (seenHost) seenHost.innerHTML = seenNames.map(itemHtml).join("");
    if (unseenHost) unseenHost.innerHTML = unseenNames.map(itemHtml).join("");
  }

  /* ── 10 · Generic hover-and-hold flip cards (.ig-flip) ────────────────
     Powers both the Seen/Unseen suite cards and the hierarchy widget's
     human/robot shot. "Hold" rather than instant-flip on hover, so just
     sweeping the mouse across the section doesn't flip every card you
     pass over — you have to actually pause on one (data-flip-delay, ms,
     default 420). Leaving flips back immediately, no dwell needed for
     that direction. On touch (no real :hover), tapping the card toggles
     it instead, and taps on a link inside are left alone so navigation
     still works. Dispatches "ig:flip" ({detail:{flipped}}) so callers
     that need to start/stop a video on flip (see buildLevelWidget) don't
     have to duplicate this hit-testing themselves. */
  function initFlipCards(root) {
    root = root || document;
    var canHover = !(window.matchMedia && window.matchMedia("(hover: none)").matches);
    root.querySelectorAll(".ig-flip").forEach(function (card) {
      if (card.dataset.flipWired) return;
      card.dataset.flipWired = "1";
      var delay = parseInt(card.dataset.flipDelay || "420", 10);
      var timer = null;

      function setFlipped(v) {
        clearTimeout(timer);
        if (card.classList.contains("is-flipped") === v) return;
        card.classList.toggle("is-flipped", v);
        card.dispatchEvent(new CustomEvent("ig:flip", { bubbles: false, detail: { flipped: v } }));
      }

      if (canHover) {
        card.addEventListener("pointerenter", function (e) {
          if (e.pointerType === "touch") return;
          timer = setTimeout(function () { setFlipped(true); }, delay);
        });
        card.addEventListener("pointerleave", function (e) {
          if (e.pointerType === "touch") return;
          setFlipped(false);
        });
        // Keyboard users tabbing onto a link inside the card get the same
        // dwell-free-exit behaviour via focus instead of hover.
        card.addEventListener("focusin", function () {
          timer = setTimeout(function () { setFlipped(true); }, delay);
        });
        card.addEventListener("focusout", function () {
          if (!card.contains(document.activeElement)) setFlipped(false);
        });
      } else {
        card.addEventListener("click", function (e) {
          if (e.target.closest("a, button")) return; // let real controls work
          setFlipped(!card.classList.contains("is-flipped"));
        });
      }
    });
  }

  /* ── 8 · Story frame 2 — the level-grow filmstrip ────────────────
     Builds the static DOM once: the shared human-reference on the left,
     and the four L0-L3 tiles on the right (initially hidden via CSS —
     updateLevelGrow() in motion.js reveals them one at a time as the
     reader scrolls through this beat). Reuses the exact same four clips
     as the Level Ladder / #lvl-widget sections further down the page
     (assets/media/levels/). Unlike the poster-frame reels above, these
     five clips actually play on loop once loaded — there are only five
     of them and they're the point of this beat, not decoration — and
     ig:beat (dispatched by initStory in motion.js) pauses them again the
     moment this beat is no longer the active one. */
  var LEVEL_GROW_META = [
    { id: "L0", fallback: "Identical scene" },
    { id: "L1", fallback: "Rearranged" },
    { id: "L2", fallback: "Same-kind objects" },
    { id: "L3", fallback: "Functional substitutes" }
  ];

  function buildLevelGrow() {
    var levelsHost = document.getElementById("story-levelgrow-levels");
    var humanVideo = document.getElementById("story-levelgrow-human-video");
    if (!levelsHost && !humanVideo) return;

    if (humanVideo) {
      humanVideo.dataset.src = LEVEL_CLIP_BASE + LEVEL_HUMAN_REF;
      humanVideo.loop = true;
    }

    if (levelsHost) {
      levelsHost.innerHTML = LEVEL_GROW_META.map(function (lv) {
        var meta = (typeof MANIFEST_DATA !== "undefined" && (MANIFEST_DATA.levels || {})[lv.id]) || {};
        return (
          '<div class="ig-levelgrow-tile" data-level="' + lv.id + '" style="--lv-c:var(--fig-' + lv.id.toLowerCase() + ')">' +
            '<span class="ig-levelgrow-tag">' + lv.id + '</span>' +
            '<video class="ig-levelgrow-media" muted playsinline loop preload="metadata" data-src="' +
              esc(LEVEL_CLIP_BASE + (LEVEL_SAMPLE[lv.id] || "")) + '"></video>' +
            '<span class="ig-levelgrow-name">' + esc(meta.name || lv.fallback) + '</span>' +
          '</div>'
        );
      }).join("");
    }

    var videos = levelsHost ? Array.prototype.slice.call(levelsHost.querySelectorAll("video[data-src]")) : [];
    if (humanVideo) videos.push(humanVideo);
    lazyLoadPlayableClips(videos, { rootMargin: "500px" });

    // Pause/resume with the beat, not with plain scroll-visibility — the
    // stage's other frames sit right on top of this one at opacity 0
    // while a different beat is active, so a naive IntersectionObserver
    // would keep these five playing the entire time the story section is
    // anywhere near the viewport.
    var stage = levelsHost ? levelsHost.closest("[data-story-stage]") : (humanVideo && humanVideo.closest("[data-story-stage]"));
    if (stage && videos.length) {
      stage.addEventListener("ig:beat", function (e) {
        var active = !!(e.detail && e.detail.index === 2);
        videos.forEach(function (v) {
          if (active) { if (v.readyState > 0 && v.paused) v.play().catch(function () {}); }
          else if (!v.paused) v.pause();
        });
      });
    }
  }

  // Loader for clips meant to actually play (frame 2's five references),
  // as opposed to lazyLoadPosterFrames' single-frame-then-stop behaviour
  // used by the reels: fetch the clip once it's near the viewport, then
  // start it playing as soon as it has a frame ready.
  function lazyLoadPlayableClips(nodes, opts) {
    opts = opts || {};
    var rootMargin = opts.rootMargin || "200px";
    var list = Array.prototype.slice.call(nodes);
    if (!list.length) return null;

    list.forEach(function (v) {
      var tile = v.closest(".ig-levelgrow-tile, .ig-levelgrow-human") || v;
      v.addEventListener("error", function () { tile.classList.add("is-empty"); });
      if (!v.dataset.src) tile.classList.add("is-empty");
    });

    function requestLoad(v) {
      if (v.dataset.loaded) return;
      v.dataset.loaded = "1";
      v.addEventListener("loadeddata", function () { v.play().catch(function () {}); }, { once: true });
      v.src = v.dataset.src;
      v.load();
    }

    if (!("IntersectionObserver" in window)) { list.forEach(requestLoad); return null; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { requestLoad(entry.target); io.unobserve(entry.target); }
      });
    }, { root: null, rootMargin: rootMargin, threshold: 0.01 });
    list.forEach(function (v) { io.observe(v); });
    return io;
  }

  /* ── 9 · Story frame 3 — the evaluation reel ────────────────────
     A dense, borderless, many-row mosaic (no card) built from the whole
     manifest — the "6-8 rows, smaller clips, fading edges" version of
     the hero/task reels above, reusing the exact same row/tile/loader
     machinery. */
  function buildStoryReel() {
    var host = document.getElementById("story-reel");
    if (!host) return;
    var pool = collectReelPool();
    if (!pool.length) return;

    var ROW_H = 58;
    // Durations scaled up ~15% to match the longer rows below, so the
    // apparent px/s scroll speed stays about the same as before — only
    // the fade band got softer, not the pacing.
    var rows = [
      { dir: "left",  dur: "55s", h: ROW_H }, { dir: "right", dur: "67s", h: ROW_H },
      { dir: "left",  dur: "48s", h: ROW_H }, { dir: "right", dur: "60s", h: ROW_H },
      { dir: "left",  dur: "69s", h: ROW_H }, { dir: "right", dur: "53s", h: ROW_H },
      { dir: "left",  dur: "62s", h: ROW_H }
    ];
    var cursor = 0;
    var rowsHtml = rows.map(function (row) {
      // Wider mask fade (see .ig-story-reel in story.css) needs more real
      // tile content behind it at all times — 2600 → 3400 keeps each row
      // comfortably longer than the fade band ever eats into, on any
      // screen width, instead of the old length that just barely covered
      // the previous, narrower fade.
      var perRow = Math.max(12, Math.ceil(3400 / (row.h * 1.6 + 8)));
      var tiles = [];
      for (var k = 0; k < perRow; k++) {
        var item = pool[cursor % pool.length]; cursor++;
        tiles.push(heroReelTileHtml(item, row.h));
      }
      return '<div class="ig-hero-reel-row is-pending" data-dir="' + row.dir + '" style="--dur:' + row.dur + '">' + tiles.join("") + '</div>';
    }).join("");
    host.innerHTML = rowsHtml;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      host.querySelectorAll(".ig-reel-tile").forEach(function (t) { t.classList.add("is-empty"); });
      host.querySelectorAll(".ig-hero-reel-row").forEach(function (row) { row.classList.remove("is-pending"); });
      return;
    }
    host.querySelectorAll(".ig-hero-reel-row").forEach(function (row) { finalizeReelRow(row); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildTicker();
    buildLadder();
    buildFigdeckNav();
    buildLeaderboardPreview();
    buildHeroReel();
    buildSuiteTaskGrid();
    buildTaskReel();
    buildSuiteChips();
    buildSuiteCardFlipLists();
    buildLevelWidget();
    buildLevelGrow();
    buildStoryReel();
    initFlipCards();
  });
})();
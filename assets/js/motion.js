/* ============================================================
   motion.js — the site's animation engine.

   Everything here is opt-in through data-attributes, so it can be
   sprinkled onto the existing markup without rewriting it:

     data-reveal="up|left|right|scale|blur"   scroll entrance
     data-reveal-delay="120"                  ms stagger
     data-stagger                             stagger direct children
     data-split                               word-by-word headline
     data-count-to="20000" data-count-suffix="+"   number roll-up
     data-parallax="0.15"                     gentle scroll drift
     data-tilt                                pointer tilt on cards

   Respects prefers-reduced-motion: elements land in their final
   state immediately instead of animating.
   ============================================================ */
(function () {
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── 1 · Scroll reveal ─────────────────────────────────────── */
  /* Two-way: an element gets .is-in when it scrolls into view (after its
     delay) and LOSES .is-in the moment it scrolls back out — of either
     edge, not just downward past the bottom. That's what makes every
     reveal on the page replay each time you scroll back to it, instead
     of firing once and being done. A pending "add is-in" timer is
     cancelled if the element leaves again before the delay elapses, so a
     quick flick past a staggered group can't leave it mid-animation. */
  var revealTimers = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    if (REDUCED || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        if (revealTimers) {
          var pending = revealTimers.get(el);
          if (pending) { clearTimeout(pending); revealTimers.delete(el); }
        }
        if (e.isIntersecting) {
          var d = parseInt(el.dataset.revealDelay || "0", 10);
          var t = setTimeout(function () { el.classList.add("is-in"); }, d);
          if (revealTimers) revealTimers.set(el, t);
        } else {
          el.classList.remove("is-in");
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* Auto-stagger direct children of [data-stagger] */
  function initStagger() {
    document.querySelectorAll("[data-stagger]").forEach(function (parent) {
      var step = parseInt(parent.dataset.stagger || "90", 10) || 90;
      Array.prototype.forEach.call(parent.children, function (child, i) {
        if (!child.hasAttribute("data-reveal")) child.setAttribute("data-reveal", "up");
        if (!child.hasAttribute("data-reveal-delay")) child.dataset.revealDelay = String(i * step);
      });
    });
  }

  /* ── 2 · Word-by-word headlines ────────────────────────────── */
  function initSplit() {
    document.querySelectorAll("[data-split]").forEach(function (el) {
      if (el.dataset.splitDone) return;
      el.dataset.splitDone = "1";
      el.classList.add("ig-split");
      var step = parseInt(el.dataset.split, 10) || 55;
      // Only split top-level text nodes so inline <em>/<img> survive.
      Array.prototype.slice.call(el.childNodes).forEach(function (node) {
        if (node.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (chunk) {
          if (!chunk.trim()) { frag.appendChild(document.createTextNode(chunk)); return; }
          var s = document.createElement("span");
          s.className = "ig-split-word";
          s.textContent = chunk;
          frag.appendChild(s);
        });
        el.replaceChild(frag, node);
      });
      el.querySelectorAll(".ig-split-word").forEach(function (w, i) {
        w.style.transitionDelay = (i * step) + "ms";
      });
      if (REDUCED) el.classList.add("is-in");
      else if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", "none");
    });
  }

  /* ── 3 · Counters ──────────────────────────────────────────── */
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function fmtCount(el, v) {
    var dec = parseInt(el.dataset.countDecimals || "0", 10);
    var group = el.dataset.countGroup !== "false";
    var s = v.toFixed(dec);
    if (group) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (el.dataset.countPrefix || "") + s + (el.dataset.countSuffix || "");
  }

  // Every run gets its own id, stamped on the element. A frame checks the
  // id is still current before scheduling the next one, so leaving the
  // viewport mid-count (which bumps the id via resetCount) cleanly kills
  // the in-flight rAF loop instead of racing a fresh one when it re-enters.
  function runCount(el) {
    var to = parseFloat(el.dataset.countTo);
    if (isNaN(to)) return;
    var from = parseFloat(el.dataset.countFrom || "0");
    var dur = parseInt(el.dataset.countDuration || "1500", 10);
    var runId = String((parseInt(el.dataset.countRunId || "0", 10) + 1));
    el.dataset.countRunId = runId;

    if (REDUCED) { el.textContent = fmtCount(el, to); return; }
    var t0 = performance.now();
    (function frame(now) {
      if (el.dataset.countRunId !== runId) return; // superseded or reset
      var p = Math.min(1, (now - t0) / dur);
      el.textContent = fmtCount(el, from + (to - from) * easeOutExpo(p));
      if (p < 1) requestAnimationFrame(frame);
    })(t0);
  }

  // Puts the counter back at its starting value and invalidates any
  // in-flight run, so the next time it scrolls into view runCount() plays
  // the full count-up again from scratch instead of resuming or skipping.
  function resetCount(el) {
    el.dataset.countRunId = String((parseInt(el.dataset.countRunId || "0", 10) + 1));
    var from = parseFloat(el.dataset.countFrom || "0");
    el.textContent = fmtCount(el, from);
  }

  function initCounters() {
    var els = document.querySelectorAll("[data-count-to]");
    if (!els.length) return;
    els.forEach(function (el) { el.classList.add("ig-counter"); });
    if (!("IntersectionObserver" in window)) { els.forEach(runCount); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) runCount(e.target);
        else resetCount(e.target);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ── 4 · Parallax + scroll progress (one rAF loop) ─────────── */
  function initScrollFx() {
    var bar = document.querySelector(".ig-scroll-progress");
    var px = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
    if (REDUCED || (!bar && !px.length)) return;
    var ticking = false;

    function update() {
      ticking = false;
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
      }
      var vh = window.innerHeight;
      px.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var k = parseFloat(el.dataset.parallax) || 0.12;
        var centre = r.top + r.height / 2 - vh / 2;
        el.style.transform = "translate3d(0," + (-centre * k).toFixed(2) + "px,0)";
      });
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ── 5 · Pointer tilt ──────────────────────────────────────── */
  function initTilt() {
    if (REDUCED || window.matchMedia("(hover: none)").matches) return;
    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      var max = parseFloat(el.dataset.tilt) || 6;
      el.style.transformStyle = "preserve-3d";
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5;
        var y = (e.clientY - r.top) / r.height - .5;
        el.style.transform =
          "perspective(900px) rotateX(" + (-y * max).toFixed(2) + "deg) rotateY(" +
          (x * max).toFixed(2) + "deg) translateY(-4px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ── 6 · Story scrubber ────────────────────────────────────────
     Pins a stage while the reader scrolls past a stack of beats.
     Markup:
       <section data-story>
         <div data-story-stage>…</div>
         <div data-story-beat data-beat="0">…</div>
         …
       </section>
     The stage gets .beat-0 / .beat-1 … and fires ig:beat events.

     Driven by scroll position instead of an IntersectionObserver band.
     The old version watched a thin ±5% strip at the middle of the
     viewport and only switched a beat when it crossed that strip — on a
     fast upward flick a beat could jump straight past the strip between
     two observer callbacks and never register, which is why scrolling up
     sometimes got stuck on shot 2 instead of returning to shot 1. Picking
     "whichever beat's centre is nearest the viewport's centre" on every
     scroll frame has no strip to skip over: it's a plain function of
     scroll position, so it can't "miss" a crossing and is automatically
     correct scrolling in either direction. The same per-frame pass also
     drives the frame-0 wipe below with a continuous 0-1 progress value
     instead of a one-shot trigger, which is what makes that wipe scrub
     forward and backward with the page instead of only ever playing once.
  ──────────────────────────────────────────────────────────────── */
  function initStory() {
    document.querySelectorAll("[data-story]").forEach(function (root) {
      var stage = root.querySelector("[data-story-stage]");
      var beats = Array.prototype.slice.call(root.querySelectorAll("[data-story-beat]"));
      if (!stage || !beats.length) return;

      var wipeBox = root.querySelector("[data-wipe-box]");
      var wipeOverlay = root.querySelector("[data-wipe-overlay]");
      var wipeLabel = root.querySelector("[data-wipe-label]");
      var cornerThumb = root.querySelector("[data-corner-thumb]");
      var active = -1;

      // Representative still for the blurred background bleed behind the
      // stage (see .story-frames::before in story.css) — one per beat,
      // read straight off data-bg-N attributes on the stage itself so the
      // glow always matches whatever frame is actually showing.
      function updateBg(i) {
        var url = stage.getAttribute("data-bg-" + i);
        if (url) {
          stage.style.setProperty("--story-bg", "url(" + url + ")");
          stage.style.setProperty("--story-bg-op", "1");
        } else {
          stage.style.setProperty("--story-bg-op", "0");
        }
      }

      function setBeat(i) {
        if (i === active) return;
        active = i;
        beats.forEach(function (b, j) { b.classList.toggle("is-active", j === i); });
        stage.className = stage.className.replace(/\bbeat-\d+\b/g, "").trim() + " beat-" + i;
        updateBg(i);
        stage.dispatchEvent(new CustomEvent("ig:beat", { bubbles: true, detail: { index: i } }));
      }

      // progress 0 → the top of beat 0 is at the viewport's centre (just
      // arrived). progress 1 → its bottom has reached the centre (about to
      // hand off to beat 1). Pure function of scroll position: scrolling
      // up recomputes the same value on the way back down, no state to
      // desync — that's what makes the wipe reverse cleanly.
      function beatProgress(idx) {
        var b = beats[idx];
        if (!b) return 0;
        var r = b.getBoundingClientRect();
        var p = (window.innerHeight / 2 - r.top) / r.height;
        return Math.max(0, Math.min(1, p));
      }
      function beat0Progress() { return beatProgress(0); }

      // Frame 1's corner thumb: shrinks from its resting size down to
      // ~40% and fades out over the course of beat 1, then reverses
      // cleanly on the way back up — same continuous-progress approach
      // as the frame-0 wipe, just driving a transform/opacity instead of
      // a clip-path.
      function updateCorner() {
        if (!cornerThumb) return;
        var p = beatProgress(1);
        var scale = 1 - p * 0.6;
        var opacity = Math.max(0, 1 - p * 1.3);
        cornerThumb.style.transform = "scale(" + scale.toFixed(3) + ")";
        cornerThumb.style.opacity = opacity.toFixed(3);
      }

      // Frame 2's filmstrip: the human reference is on screen from the
      // start of this beat; L0 through L3 join one at a time on the right
      // as scroll progress climbs, each tile's own threshold spaced evenly
      // across the beat so the last one (L3) is in well before the beat
      // hands off to the next — by the end of this beat all four are
      // showing. Re-queries the tiles on every call (rather than caching
      // them once, like wipeBox/cornerThumb) because they're built by
      // landing.js's buildLevelGrow(), which — despite loading after this
      // file — still finishes its own DOMContentLoaded work before the
      // reader can scroll far enough for this to matter; caching an empty
      // NodeList at init time would otherwise leave every tile stuck
      // hidden forever.
      function updateLevelGrow() {
        var host = root.querySelector("[data-levelgrow]");
        if (!host) return;
        var tiles = host.querySelectorAll(".ig-levelgrow-tile");
        var n = tiles.length;
        if (!n) return;
        var p = beatProgress(2);
        Array.prototype.forEach.call(tiles, function (tile, i) {
          tile.classList.toggle("is-shown", p >= (i + 0.4) / n);
        });
      }

      // The reveal is a soft feathered dissolve along the same 45° axis
      // the box's corners define, instead of a hard clip-path edge: a
      // two-stop mask-image gradient whose position tracks scroll
      // progress directly (no easing/transition on the mask itself, so it
      // never lags behind the scroll), giving a dissolve rather than a
      // razor-sharp cut. Percentage-based, so it needs no measured
      // width/height and works before the box has even laid out.
      function updateWipe() {
        updateCorner();
        updateLevelGrow();
        if (!wipeBox || !wipeOverlay) return;
        var p = beat0Progress();
        var threshold = (1 - p) * 100;
        var feather = 16;
        var stop2 = Math.max(0, threshold - feather).toFixed(1);
        var stop3 = threshold.toFixed(1);
        var mask = "linear-gradient(135deg, transparent 0%, transparent " +
          stop2 + "%, black " + stop3 + "%, black 100%)";
        wipeOverlay.style.opacity = p <= 0.001 ? "0" : "1";
        wipeOverlay.style.webkitMaskImage = mask;
        wipeOverlay.style.maskImage = mask;
        if (wipeLabel) {
          var toRobot = p >= 0.5;
          wipeLabel.textContent = toRobot ? "Imitator scene" : "Demonstrator scene";
          wipeLabel.classList.toggle("is-human", !toRobot);
          wipeLabel.classList.toggle("is-robot", toRobot);
        }
      }

      if (REDUCED || !("IntersectionObserver" in window)) {
        setBeat(0);
        beats.forEach(function (b) { b.classList.add("is-active"); });
        stage.dispatchEvent(new CustomEvent("ig:beat", { bubbles: true, detail: { index: 2 } }));
        // No scroll-driven update() loop runs in this path, so give the
        // scroll-scrubbed pieces a fixed, fully-revealed end state instead
        // of leaving them stuck at their initial (hidden) CSS values.
        if (wipeOverlay) {
          wipeOverlay.style.opacity = "1";
          wipeOverlay.style.webkitMaskImage = "none";
          wipeOverlay.style.maskImage = "none";
        }
        if (cornerThumb) cornerThumb.style.opacity = "0";
        root.querySelectorAll(".ig-levelgrow-tile").forEach(function (t) { t.classList.add("is-shown"); });
        return;
      }

      var ticking = false;
      function update() {
        ticking = false;
        var rootRect = root.getBoundingClientRect();
        if (rootRect.bottom > 0 && rootRect.top < window.innerHeight) {
          var vhCenter = window.innerHeight / 2;
          var bestIdx = 0, bestDist = Infinity;
          beats.forEach(function (b, i) {
            var r = b.getBoundingClientRect();
            var d = Math.abs((r.top + r.height / 2) - vhCenter);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
          });
          setBeat(bestIdx);
        }
        updateWipe();
      }
      function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      update();
    });
  }

  /* ── 7 · Video slots: mark missing files, play only in view ── */
  function initVideos() {
    document.querySelectorAll(".ig-shot video").forEach(function (v) {
      var shot = v.closest(".ig-shot");
      v.addEventListener("error", function () { shot.classList.add("is-empty"); });
      if (!v.getAttribute("src") && !v.querySelector("source")) shot.classList.add("is-empty");
    });
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        // Was `v.autoplay !== false`, which only fires for videos carrying
        // the real HTML `autoplay` attribute — every video here is marked
        // via the data-autoplay attribute instead (see the query below),
        // so that check silently skipped all of them and they never
        // resumed after scrolling back into view.
        if (e.isIntersecting) { if (v.paused) v.play().catch(function () {}); }
        else if (!v.paused) v.pause();
      });
    }, { threshold: 0.25 });
    document.querySelectorAll(".ig-shot video[data-autoplay]").forEach(function (v) { io.observe(v); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initStagger();
    initSplit();
    initReveal();
    initCounters();
    initScrollFx();
    initTilt();
    initStory();
    initVideos();
  });

  window.IGMotion = { reveal: initReveal, count: runCount };
})();
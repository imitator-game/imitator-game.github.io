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
  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    if (REDUCED || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var d = parseInt(el.dataset.revealDelay || "0", 10);
        setTimeout(function () { el.classList.add("is-in"); }, d);
        io.unobserve(el);
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

  function runCount(el) {
    var to = parseFloat(el.dataset.countTo);
    if (isNaN(to)) return;
    var from = parseFloat(el.dataset.countFrom || "0");
    var dec = parseInt(el.dataset.countDecimals || "0", 10);
    var dur = parseInt(el.dataset.countDuration || "1500", 10);
    var pre = el.dataset.countPrefix || "";
    var suf = el.dataset.countSuffix || "";
    var group = el.dataset.countGroup !== "false";
    var t0 = performance.now();

    function fmt(v) {
      var s = v.toFixed(dec);
      if (group) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return pre + s + suf;
    }
    if (REDUCED) { el.textContent = fmt(to); return; }
    (function frame(now) {
      var p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(from + (to - from) * easeOutExpo(p));
      if (p < 1) requestAnimationFrame(frame);
    })(t0);
  }

  function initCounters() {
    var els = document.querySelectorAll("[data-count-to]");
    if (!els.length) return;
    els.forEach(function (el) { el.classList.add("ig-counter"); });
    if (!("IntersectionObserver" in window)) { els.forEach(runCount); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        runCount(e.target); io.unobserve(e.target);
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
  ──────────────────────────────────────────────────────────────── */
  function initStory() {
    document.querySelectorAll("[data-story]").forEach(function (root) {
      var stage = root.querySelector("[data-story-stage]");
      var beats = Array.prototype.slice.call(root.querySelectorAll("[data-story-beat]"));
      if (!stage || !beats.length) return;
      var active = -1;

      function setBeat(i) {
        if (i === active) return;
        active = i;
        beats.forEach(function (b, j) { b.classList.toggle("is-active", j === i); });
        stage.className = stage.className.replace(/\bbeat-\d+\b/g, "").trim() + " beat-" + i;
        stage.dispatchEvent(new CustomEvent("ig:beat", { bubbles: true, detail: { index: i } }));
      }

      if (REDUCED || !("IntersectionObserver" in window)) { setBeat(0); beats.forEach(function(b){b.classList.add("is-active");}); return; }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) setBeat(beats.indexOf(e.target));
        });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      beats.forEach(function (b) { io.observe(b); });
      setBeat(0);
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
        if (e.isIntersecting) { if (v.paused && v.autoplay !== false) v.play().catch(function () {}); }
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

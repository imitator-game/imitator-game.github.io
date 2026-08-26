/* ============================================================
   site.js — Shared utilities and page-level interactions.

   Exports (globals used by arena.js and gallery.js):
     loadManifest()  — fetch assets/manifest.json → Promise<object>
     mediaUrl(manifest, path) — resolve a media path against manifest.base_url

   Page features (auto-wired on DOMContentLoaded):
     • Results carousel (infinite-loop)
     • Levels tab switcher
     • BibTeX copy button
     • Smooth-scroll for header anchor links
     • Theme toggle (☾ / ☀)
     • Landing-page: scroll-based nav active state
   ============================================================ */

/* ── Shared manifest helpers (used by arena.js + gallery.js) ─── */
function loadManifest() {
  if (typeof MANIFEST_DATA !== 'undefined') {
    return Promise.resolve(MANIFEST_DATA);
  }
  return fetch('manifest.json', { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' fetching manifest.json');
      return r.json();
    });
}

function mediaUrl(manifest, path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  var base = (manifest && (manifest.media_base || manifest.base_url)) || '';
  return base + path;
}

/* ── Shared media interfaces (used by gallery.js + landing.js) ────────
   Two small, reusable ways to render any clip:
     IGMedia.video(src, opts) → the real, playing clip.
     IGMedia.image(src, opts) → a still. Pass opts.poster for a dedicated
       image; leave it out and the clip's OWN first frame is used
       instead (a paused <video> seeked to 0.1s via a Media Fragment) —
       no separate poster image ever needs to be generated or stored.
   Both default to lazy (`data-src`, filled in by a loader later); pass
   opts.lazy:false for an immediate real `src`. */
(function () {
  function escAttr(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  window.IGMedia = {
    video: function (src, opts) {
      opts = opts || {};
      var lazy = opts.lazy !== false;
      var bits = ['muted', 'playsinline'];
      if (opts.loop !== false) bits.push('loop');
      bits.push('preload="' + (opts.preload || 'metadata') + '"');
      if (opts.autoplay) bits.push('data-autoplay');
      bits.push((lazy ? 'data-src="' : 'src="') + escAttr(src) + '"');
      if (opts.className) bits.push('class="' + escAttr(opts.className) + '"');
      return '<video ' + bits.join(' ') + '></video>';
    },
    image: function (src, opts) {
      opts = opts || {};
      if (opts.poster) {
        return '<img src="' + escAttr(opts.poster) + '" alt="' + escAttr(opts.alt || '') + '"' +
          (opts.className ? ' class="' + escAttr(opts.className) + '"' : '') + ' loading="lazy">';
      }
      var lazy = opts.lazy !== false;
      var attr = (lazy ? 'data-src="' : 'src="') + escAttr(src) + '#t=0.1"';
      return '<video muted playsinline preload="metadata" ' + attr +
        (opts.className ? ' class="' + escAttr(opts.className) + '"' : '') + '></video>';
    }
  };
})();

/* ============================================================
   Brand logo — always returns to the top of the page it's on
   ============================================================
   The main fix for "logo/Home lands mid-page instead of at the top" lives
   in each page's <head> (history.scrollRestoration = 'manual' set before
   anything else, plus a load-time scrollTo(0,0)) — that's what actually
   stops the browser from restoring an old scroll offset on refresh or on
   a fresh navigation. This part only covers the one case that isn't a
   navigation at all: some browsers no-op a click to the exact URL already
   loaded, so nothing above ever runs — the logo needs its own handler for
   that click specifically. */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.pst-header-brand').forEach(function (brand) {
    brand.addEventListener('click', function (e) {
      var dest = new URL(brand.getAttribute('href'), location.href);
      var norm = function (p) { return p.replace(/\/index\.html$/, '/').replace(/\/$/, ''); };
      if (norm(dest.pathname) === norm(location.pathname)) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
});

/* ============================================================
   Results Carousel — infinite-loop gallery
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  var track   = document.getElementById('carouselTrack');
  var dotsEl  = document.getElementById('carouselDots');
  var btnPrev = document.getElementById('carouselPrev');
  var btnNext = document.getElementById('carouselNext');
  if (!track) return;

  var origSlides = Array.from(track.querySelectorAll('.results-carousel-slide'));
  var total = origSlides.length;

  /* Clone first and last slides for infinite-loop illusion */
  var cloneFirst = origSlides[0].cloneNode(true);
  var cloneLast  = origSlides[total - 1].cloneNode(true);
  [cloneFirst, cloneLast].forEach(function (c) { c.setAttribute('aria-hidden', 'true'); });
  track.appendChild(cloneFirst);
  track.insertBefore(cloneLast, origSlides[0]);

  var current = 1;
  var locked  = false;

  /* Build dots (one per real slide) */
  var dots = origSlides.map(function (_, i) {
    var btn = document.createElement('button');
    btn.className = 'results-carousel-dot';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-label', 'Result ' + (i + 1));
    btn.addEventListener('click', function () { if (!locked) goTo(i + 1); });
    dotsEl.appendChild(btn);
    return btn;
  });

  function updateDots() {
    var realIdx = current === 0 ? total - 1
                : current === total + 1 ? 0
                : current - 1;
    dots.forEach(function (d, i) { d.classList.toggle('active', i === realIdx); });
  }

  function setPosition(idx, animate) {
    track.style.transition = animate
      ? 'transform 420ms cubic-bezier(.4,0,.2,1)'
      : 'none';
    track.style.transform = 'translateX(-' + (idx * 100) + '%)';
  }

  function goTo(idx) {
    if (locked) return;
    locked = true;
    current = idx;
    setPosition(current, true);
    updateDots();
  }

  /* After transition ends, silently snap from clone to real slide */
  track.addEventListener('transitionend', function () {
    if (current === 0) {
      current = total;
      setPosition(current, false);
    } else if (current === total + 1) {
      current = 1;
      setPosition(current, false);
    }
    locked = false;
  });

  btnPrev.addEventListener('click', function () { goTo(current - 1); });
  btnNext.addEventListener('click', function () { goTo(current + 1); });

  /* Swipe / drag */
  var startX = 0;
  var vp = track.parentElement;
  vp.addEventListener('pointerdown', function (e) { startX = e.clientX; });
  vp.addEventListener('pointerup', function (e) {
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
  });

  /* Keyboard (when hovering the carousel) */
  document.addEventListener('keydown', function (e) {
    var carousel = document.getElementById('resultsCarousel');
    if (!carousel || !carousel.matches(':hover')) return;
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  setPosition(current, false);
  updateDots();
});

/* ============================================================
   Levels Tab Switcher
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  var tabsContainer = document.getElementById('levelsTabs');
  if (!tabsContainer) return;

  var buttons = tabsContainer.querySelectorAll('.levels-tab-btn');
  var panels  = tabsContainer.querySelectorAll('.levels-tab-panel');

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.level;

      buttons.forEach(function (b) {
        b.classList.toggle('active', b.dataset.level === target);
        b.setAttribute('aria-selected', b.dataset.level === target ? 'true' : 'false');
      });

      panels.forEach(function (p) {
        var isActive = p.dataset.level === target;
        p.classList.toggle('active', isActive);
        if (isActive) {
          tabsContainer.querySelectorAll('.levels-panel-video').forEach(function (v) { v.pause(); });
          var vid = p.querySelector('.levels-panel-video');
          if (vid) { vid.currentTime = 0; vid.play().catch(function () {}); }
        }
      });
    });
  });
});

/* ============================================================
   BibTeX Copy Button
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('bibtexCopyBtn');
  var pre = document.getElementById('bibtexContent');
  if (!btn || !pre) return;

  btn.addEventListener('click', function () {
    navigator.clipboard.writeText(pre.textContent.trim()).then(function () {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(function () {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    }).catch(function () {
      var sel = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(pre);
      sel.removeAllRanges();
      sel.addRange(range);
    });
  });
});

/* ============================================================
   Smooth-scroll for nav anchor links
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.pst-header-nav a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var headerH = (document.querySelector('.pst-header') || {}).offsetHeight || 60;
      var top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });
});

/* ============================================================
   Theme toggle
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  function syncLabel() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.textContent = dark ? '☀ Light' : '☾ Dark';
  }
  btn.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    syncLabel();
  });
  systemTheme.addEventListener('change', function (event) {
    document.documentElement.setAttribute('data-theme', event.matches ? 'dark' : 'light');
    syncLabel();
  });
  syncLabel();
});

/* ============================================================
   Landing page: scroll-based nav active-state highlight
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  if (!document.body.classList.contains('landing-page')) return;
  var bands = Array.from(document.querySelectorAll('.lp-band[id]'));
  var navLinks = Array.from(document.querySelectorAll('.pst-header-nav a[href^="#"]'));
  if (!bands.length || !navLinks.length) return;

  var headerH = (document.querySelector('.pst-header') || {}).offsetHeight || 56;

  function updateActive() {
    var currentId = '';
    bands.forEach(function (band) {
      var rect = band.getBoundingClientRect();
      if (rect.top <= headerH + 80) currentId = band.id;
    });
    navLinks.forEach(function (a) {
      var matches = a.getAttribute('href') === '#' + currentId;
      a.classList.toggle('active', matches);
    });
  }

  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();
});

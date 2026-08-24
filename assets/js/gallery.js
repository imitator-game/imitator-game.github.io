/* ============================================================
   Gallery — static, manifest-driven.
   Grid of task cards + per-task detail view (human / robot / sim
   videos per level). Mirrors the original Flask gallery, but with
   no backend: everything comes from manifest.json.
   ============================================================ */

const LEVEL_ORDER = ["L0", "L1", "L2", "L3"];
let MANIFEST = null;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ── Grid view ─────────────────────────────────────────────── */
function renderGrid() {
  const tasks = MANIFEST.tasks || {};
  const groups = Object.keys(tasks);
  const grid = document.getElementById("gallery-grid");
  document.getElementById("gallery-subtitle").textContent =
    `Browse all ${groups.length} task groups, each with up to four imitation difficulty levels.`;

  if (!groups.length) {
    grid.innerHTML =
      `<p style="color:var(--pst-color-muted);padding:2rem 0;">No gallery videos in this build yet.
       Run <code>build_static.py</code> on the server to populate the gallery.</p>`;
    updateCount(0);
    return;
  }

  grid.innerHTML = groups.map((tg) => {
    const t = tasks[tg];
    const present = t.levels || {};
    const dots = LEVEL_ORDER.map((lv) =>
      `<span class="gallery-lv-dot ${lv in present ? "lv-present" : ""} level-${lv.toLowerCase()}">${lv}</span>`
    ).join("");
    const nLv = Object.keys(present).length;
    const search = `${(t.display_name || tg)} ${(t.task_intent || "")}`.toLowerCase();
    return `
      <a href="#task=${encodeURIComponent(tg)}" class="gallery-card" data-name="${esc(search)}">
        <div class="gallery-card-levels">${dots}</div>
        <div class="gallery-card-title">${esc(t.display_name || tg)}</div>
        <div class="gallery-card-desc">${esc(t.task_intent || "")}</div>
        <div class="gallery-card-footer">
          <span class="gallery-card-meta">${nLv} level${nLv !== 1 ? "s" : ""}</span>
          <span class="gallery-card-arrow">→</span>
        </div>
      </a>`;
  }).join("");

  stagger(grid.children, 45);
  updateCount(groups.length);
}

/* Cards and task panels are injected after motion.js has already scanned the
   page, so tag them and re-run the observer. No-op without motion.js, which
   keeps the content visible rather than stuck at opacity 0. */
function stagger(nodes, step) {
  if (!window.IGMotion) return;
  Array.prototype.forEach.call(nodes, function (n, i) {
    n.setAttribute("data-reveal", "up");
    n.dataset.revealDelay = String(Math.min(i, 14) * (step || 45));
  });
  window.IGMotion.reveal();
}

function updateCount(n) {
  document.getElementById("gallery-count").textContent = `${n} task${n !== 1 ? "s" : ""}`;
}

function filterGallery(q) {
  q = (q || "").toLowerCase();
  let visible = 0;
  document.querySelectorAll(".gallery-card").forEach((c) => {
    const match = c.dataset.name.includes(q);
    c.style.display = match ? "" : "none";
    if (match) visible++;
  });
  updateCount(visible);
}

/* ── Detail view ───────────────────────────────────────────── */
function videoPanel(headerClass, label, url) {
  if (!url) {
    return `
      <div class="video-panel video-missing">
        <div class="video-panel-header ${headerClass}">${label}</div>
        <video controls preload="none" loop muted playsinline></video>
      </div>`;
  }
  return `
    <div class="video-panel">
      <div class="video-panel-header ${headerClass}">${label}</div>
      <video controls preload="none" loop muted playsinline
             data-src="${esc(mediaUrl(MANIFEST, url))}"
             onerror="this.closest('.video-panel').classList.add('video-missing')"></video>
    </div>`;
}

function renderTask(tg) {
  const t = (MANIFEST.tasks || {})[tg];
  const gridView = document.getElementById("gallery-view");
  const taskView = document.getElementById("task-view");
  if (!t) { location.hash = ""; return; }

  gridView.style.display = "none";
  taskView.style.display = "";

  const levels = t.levels || {};
  const ordered = LEVEL_ORDER.filter((lv) => lv in levels);

  const badges = ordered.map((lv) => `<span class="level-badge ${lv}">${lv}</span>`).join(" ");

  const cards = ordered.map((lv) => {
    const ld = levels[lv];

    // Per-level human video: prefer ld.human_video, fall back to task-level t.human_video.
    // L0 always uses t.human_video (the original demonstrator clip); L1-L3 use
    // the level-specific clip recorded under the new scene, if available.
    const humanVideoUrl = ld.human_video || t.human_video;

    const hVid = videoPanel("human", '<i class="fas fa-user"></i> Human Reference', humanVideoUrl);
    const rVid = videoPanel("robot", '<i class="fas fa-robot"></i> Real Robot', ld.robot_video);
    const sVid = videoPanel("sim",   '<i class="fas fa-desktop"></i> Simulation', ld.sim_video);
    const desc = ld.gallery_desc
      ? `<p style="font-size:.85rem;color:var(--pst-color-muted);margin-bottom:1rem;">${esc(ld.gallery_desc)}</p>`
      : "";
    return `
      <div class="pst-card mb-4">
        <div class="pst-card-header">
          <span class="level-badge ${lv}" style="font-size:.8rem;">${lv}</span>
          ${esc(ld.name || lv)}
          <span class="text-muted" style="font-weight:400;font-size:.85rem;margin-left:.5rem;">— ${esc(ld.desc || "")}</span>
        </div>
        <div class="pst-card-body">
          <div class="video-grid video-grid-3">${hVid}${rVid}${sVid}</div>
        </div>
      </div>`;
  }).join("");

  taskView.innerHTML = `
    <nav style="font-size:.85rem;color:var(--pst-color-muted);margin-bottom:1rem;">
      <a href="#">Gallery</a><span style="margin:0 .4rem;">›</span><span>${esc(t.display_name || tg)}</span>
    </nav>
    <div style="margin-bottom:1.25rem;">
      <h1 style="font-size:1.5rem;margin:0 0 .5rem;">${esc(t.display_name || tg)}</h1>
      ${t.task_intent ? `<div class="task-desc-box">${esc(t.task_intent)}</div>` : ""}
    </div>
    ${cards}`;

  stagger(taskView.querySelectorAll(".pst-card"), 90);
  observeVideos(taskView);
  window.scrollTo(0, 0);
}

/* Lazy-load + autoplay on scroll (same behaviour as the original). */
function observeVideos(root) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        if (video.dataset.src && !video.getAttribute("src")) {
          video.src = video.dataset.src;
          video.load();
          video.addEventListener("canplay", () => video.play().catch(() => {}), { once: true });
        } else if (video.getAttribute("src") && video.paused) {
          video.play().catch(() => {});
        }
      } else if (!video.paused) {
        video.pause();
      }
    });
  }, { threshold: 0.1 });
  root.querySelectorAll("video[data-src]").forEach((v) => observer.observe(v));
}

/* ── Routing ───────────────────────────────────────────────── */
function route() {
  const m = location.hash.match(/^#task=(.+)$/);
  if (m) {
    renderTask(decodeURIComponent(m[1]));
  } else {
    document.getElementById("task-view").style.display = "none";
    document.getElementById("gallery-view").style.display = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadManifest()
    .then((m) => {
      MANIFEST = m;
      renderGrid();
      document.getElementById("gallery-search")
        .addEventListener("input", (e) => filterGallery(e.target.value));
      window.addEventListener("hashchange", route);
      route();
    })
    .catch((err) => {
      document.getElementById("gallery-grid").innerHTML =
        `<p style="color:var(--pst-color-muted);">Could not load manifest.json — ${esc(err.message)}</p>`;
    });
});
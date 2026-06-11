/* ============================================================
   Imitator Arena — static, no-backend port.

   Reproduces the original A/B selection logic from eval_index.py +
   app.py _pick_annotation_item, but entirely client-side:

     1. pick a random bucket (seen / zeroshot / transfer) that has a
        usable item;
     2. pick a random item (task_group, level, episode) in it that has
        >= 2 model rollouts;
     3. pick two distinct rollouts and randomly assign them to A / B
        (so the order carries no information);
     4. the model identities are never revealed (the manifest only ever
        stores opaque rollout ids and per-comparison "Model A/B" labels).

   Nothing is persisted: "Submit & Next" validates, flashes a toast, and
   loads the next comparison. Session-only counts are kept in memory.
   ============================================================ */

const BUCKET_LABEL = {
  seen:     "Seen tasks",
  zeroshot: "Zero-shot (unseen)",
  scratch:  "From scratch (unseen)",
  transfer: "Pretrain + fine-tune (unseen)",
};

let MANIFEST = null;
let SESSION_COUNT = 0;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function randItem(a) { return a[Math.floor(Math.random() * a.length)]; }

/* An item is usable for A/B only if it has at least two rollouts. */
function itemUsable(item) {
  return item && item.rollouts && Object.keys(item.rollouts).length >= 2;
}

function usableBuckets() {
  const arena = MANIFEST.arena || {};
  return Object.keys(arena).filter((b) =>
    Array.isArray(arena[b]) && arena[b].some(itemUsable)
  );
}

/* Pick the next (bucket, item, expA, expB) following the original strategy. */
function pickNext() {
  const buckets = usableBuckets();
  if (!buckets.length) return null;
  const bucket = randItem(buckets);
  const items = MANIFEST.arena[bucket].filter(itemUsable);
  const item = randItem(items);
  const keys = shuffle(Object.keys(item.rollouts)).slice(0, 2);
  return { bucket, item, expA: keys[0], expB: keys[1] };
}

/* ── Rendering ─────────────────────────────────────────────── */
function rubricAnchors() {
  const r = MANIFEST.score_rubric || [
    [0, "Complete failure"], [2, "Minimal intent understanding"],
    [5, "Partial, no adaptation"], [8, "Good with minor errors"],
    [10, "Perfect imitation"],
  ];
  return r.map(([v, t]) => `<span><b>${v}</b> ${esc(t)}</span>`).join("");
}

function assessmentBlock(side) {
  // side = 'a' | 'b'
  return `
    <div class="video-panel-body arena-assessment-body">
      <div class="question-block">
        <div class="question-label">Success</div>
        <div class="choice-group" data-target="success_${side}">
          <button type="button" class="choice-btn" data-value="success">Success</button>
          <button type="button" class="choice-btn" data-value="partial">Partial</button>
          <button type="button" class="choice-btn" data-value="failure">Failure</button>
        </div>
      </div>
      <div class="question-block">
        <div class="question-label"><span>Quality</span><span class="score-display" id="score_${side}_display">5</span></div>
        <div class="score-slider-wrap">
          <input type="range" class="score-slider" id="score_${side}" data-display="score_${side}_display"
                 min="0" max="10" value="5" step="1">
        </div>
        <div class="score-anchor-line"><span>0 failure</span><span>5 partial</span><span>10 perfect</span></div>
      </div>
    </div>`;
}

function render(pick) {
  const { bucket, item, expA, expB } = pick;

  // Bucket badge
  const badge = document.getElementById("arena-bucket-badge");
  badge.className = "arena-bucket-badge " + bucket;
  badge.textContent = BUCKET_LABEL[bucket] || bucket;

  const humanUrl = mediaUrl(MANIFEST, item.human_video);
  const aUrl = mediaUrl(MANIFEST, item.rollouts[expA]);
  const bUrl = mediaUrl(MANIFEST, item.rollouts[expB]);

  const human = item.human_desc
    ? `<div class="arena-context-item"><div class="arena-context-label">Human intent</div><div class="arena-context-text">${esc(item.human_desc)}</div></div>` : "";
  const scenario = (item.task_desc && item.task_desc !== item.human_desc)
    ? `<div class="arena-context-item"><div class="arena-context-label">Robot scenario</div><div class="arena-context-text">${esc(item.task_desc)}</div></div>` : "";
  const ctxCard = (human || scenario)
    ? `<div class="task-context-card"><div class="task-context-header">Task description</div><div class="task-context-content">${human}${scenario}</div></div>` : "";

  document.getElementById("arena-card").innerHTML = `
    <div class="arena-2col">
      <aside class="arena-sidebar">
        ${ctxCard}
        <div class="video-panel arena-reference-panel">
          <div class="video-panel-header human">Human Reference</div>
          <video class="arena-video" controls preload="metadata" loop autoplay muted playsinline src="${esc(humanUrl)}"></video>
        </div>
        <div class="arena-controls-card">
          <div class="arena-controls-card-header">Controls</div>
          <div class="arena-controls-body">
            <div class="arena-controls-row">
              <button type="button" class="btn arena-control-btn" data-video-action="play" title="Play all">▶</button>
              <button type="button" class="btn arena-control-btn" data-video-action="pause" title="Pause all">⏸</button>
              <button type="button" class="btn arena-control-btn" data-video-action="restart" title="Restart all">↺</button>
              <button type="button" class="btn arena-control-btn" data-video-action="sync" title="Sync time">⇋</button>
            </div>
            <div class="arena-controls-row">
              <button type="button" class="btn arena-control-btn arena-speed-btn" data-video-speed="0.5">0.5×</button>
              <button type="button" class="btn arena-control-btn arena-speed-btn is-active" data-video-speed="1">1×</button>
            </div>
            <div class="arena-controls-hint"><kbd>Space</kbd> play / pause &nbsp; <kbd>R</kbd> restart</div>
          </div>
        </div>
      </aside>

      <main class="arena-stage">
        <div class="arena-compare-grid">
          <div class="video-panel arena-model-panel">
            <div class="video-panel-header model-a">Model A</div>
            <video class="arena-video" controls preload="metadata" loop autoplay muted playsinline src="${esc(aUrl)}"></video>
            ${assessmentBlock("a")}
          </div>
          <div class="video-panel arena-model-panel">
            <div class="video-panel-header model-b">Model B</div>
            <video class="arena-video" controls preload="metadata" loop autoplay muted playsinline src="${esc(bUrl)}"></video>
            ${assessmentBlock("b")}
          </div>
        </div>

        <div class="arena-bottom-bar">
          <div class="arena-rubric-row">
            <span class="arena-rubric-label">Quality scale</span>
            <div class="arena-rubric-anchors">${rubricAnchors()}</div>
          </div>
          <div class="arena-bottom-main">
            <div class="arena-preference">
              <div class="arena-preference-label">Overall preference</div>
              <div class="choice-group" data-target="preference">
                <button type="button" class="choice-btn" data-value="a">Model A</button>
                <button type="button" class="choice-btn" data-value="b">Model B</button>
                <button type="button" class="choice-btn" data-value="tie">Tie</button>
              </div>
            </div>
            <div class="arena-bottom-actions">
              <button type="button" id="skip-btn" class="pst-btn pst-btn-lg">Skip</button>
              <button type="button" id="submit-btn" class="pst-btn pst-btn-primary pst-btn-lg" disabled style="opacity:.4;">
                Submit &amp; Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>`;

  // State held on the card for validation
  CURRENT = { bucket, success_a: null, success_b: null, preference: null };
  wireCard();
}

/* ── Interaction wiring (per render) ───────────────────────── */
let CURRENT = null;

function wireCard() {
  const card = document.getElementById("arena-card");

  // Choice buttons
  card.querySelectorAll(".choice-group").forEach((group) => {
    const target = group.dataset.target; // success_a | success_b | preference
    group.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        group.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        if (target in CURRENT) CURRENT[target] = btn.dataset.value;
        updateSubmitState();
      });
    });
  });

  // Sliders
  card.querySelectorAll(".score-slider").forEach((s) => {
    const d = document.getElementById(s.dataset.display);
    const upd = () => { if (d) d.textContent = s.value; };
    s.addEventListener("input", upd); upd();
  });

  // Buttons
  card.querySelector("#submit-btn").addEventListener("click", onSubmit);
  card.querySelector("#skip-btn").addEventListener("click", next);

  wireVideoControls(card);
  updateSubmitState();
}

function updateSubmitState() {
  const btn = document.querySelector("#submit-btn");
  if (!btn || !CURRENT) return;
  const ok = CURRENT.success_a && CURRENT.success_b && CURRENT.preference;
  btn.disabled = !ok;
  btn.style.opacity = ok ? "1" : "0.4";
}

function onSubmit() {
  if (!CURRENT || !(CURRENT.success_a && CURRENT.success_b && CURRENT.preference)) {
    alert("Please answer Success for both models and pick an overall preference.");
    return;
  }
  SESSION_COUNT += 1;
  toast("Recorded for this session only (not saved). Loading next…");
  next();
}

function toast(msg) {
  const t = document.getElementById("arena-toast");
  t.textContent = msg;
  t.style.display = "";
  t.style.opacity = "1";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => { t.style.display = "none"; }, 350);
  }, 1800);
}

/* Arena video controls (ported from the original main.js). */
function wireVideoControls(card) {
  const vids = () => Array.from(card.querySelectorAll(".arena-video"));
  card.querySelectorAll("[data-video-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const a = btn.dataset.videoAction;
      if (a === "play") vids().forEach((v) => v.play().catch(() => {}));
      if (a === "pause") vids().forEach((v) => v.pause());
      if (a === "restart") vids().forEach((v) => { v.currentTime = 0; v.play().catch(() => {}); });
      if (a === "sync") { const t = vids()[0] ? vids()[0].currentTime : 0; vids().forEach((v) => { v.currentTime = t; }); }
    });
  });
  card.querySelectorAll("[data-video-speed]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sp = parseFloat(btn.dataset.videoSpeed);
      vids().forEach((v) => { v.playbackRate = sp; });
      card.querySelectorAll(".arena-speed-btn").forEach((b) =>
        b.classList.toggle("is-active", String(sp) === b.dataset.videoSpeed));
    });
  });
}

// Global keyboard shortcuts (operate on whatever arena videos are live).
document.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  const vids = Array.from(document.querySelectorAll(".arena-video"));
  if (!vids.length) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (vids.some((v) => v.paused)) vids.forEach((v) => v.play().catch(() => {}));
    else vids.forEach((v) => v.pause());
  }
  if (e.key === "r" || e.key === "R") vids.forEach((v) => { v.currentTime = 0; v.play().catch(() => {}); });
});

/* ── Loop ──────────────────────────────────────────────────── */
function next() {
  const pick = pickNext();
  if (!pick) {
    document.getElementById("arena-bucket-badge").textContent = "";
    document.getElementById("arena-card").innerHTML =
      `<div class="arena-empty">No comparison pairs are available in this demo build.<br>
       (Each comparison needs at least two model rollouts for the same task, level and episode.)</div>`;
    return;
  }
  render(pick);
}

document.addEventListener("DOMContentLoaded", () => {
  loadManifest()
    .then((m) => { MANIFEST = m; next(); })
    .catch((err) => {
      document.getElementById("arena-card").innerHTML =
        `<div class="arena-empty">Could not load manifest.json — ${esc(err.message)}</div>`;
    });
});

/* ============================================================
   leaderboard.js — leaderboard.html only.

   Three boards sharing one table shell:
     sim   — 15 trained simulation variants, automated metrics
     real  — 4 representative real-world models, Arena-judged
     level — resolved by hierarchy level (L0-L3); this is the one
             where "sorted by Seen SR" and "sorted by L3" genuinely
             disagree, which is the point of shipping it at all.

   Family chips and the search box filter every board. Column
   headers are clickable to sort (click again to flip direction).
   The "By level" board additionally shows a regime switcher
   (#lb-regime): "seen" resolves from simulation, all 15 trained
   variants (figC5). "zs", "scr" and "pft" each resolve from the
   real world, the same 4 representative models (figdata.js's
   IG.perLevelZS / IG.perLevelScr / IG.perLevel).
   ============================================================ */
(function () {
  if (!window.IG) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pct(v) { return (v == null || isNaN(v)) ? "—" : Math.round(v * 100) + "%"; }
  function num1(v) { return (v == null || isNaN(v)) ? "—" : v.toFixed(1); }

  var SRC_LABEL = { sim: "Sim", real: "Real" };

  /* ── Column definitions per board ────────────────────────── */
  var SIM_COLS = [
    { key: "model",   label: "Model",       type: "name",  sortable: false },
    { key: "fam",     label: "Paradigm",    type: "fam",   sortable: false },
    { key: "src",     label: "Source",      type: "src",   sortable: false },
    { key: "seen",    label: "Seen SR",     type: "pct" },
    { key: "seenSub", label: "Seen Sub-SR", type: "pct" },
    { key: "zs",      label: "Zero-shot SR",type: "pct" },
    { key: "scr",     label: "Scratch SR",  type: "pct" },
    { key: "pft",     label: "P+FT SR",     type: "pct" },
    { key: "delta",   label: "Δ P+FT−Scr",  type: "delta" }
  ];
  var REAL_COLS = [
    { key: "model",  label: "Model",    type: "name", sortable: false },
    { key: "fam",    label: "Paradigm", type: "fam",  sortable: false },
    { key: "src",    label: "Source",   type: "src",  sortable: false },
    { key: "seenSR", label: "Seen SR",  type: "pct" },
    { key: "seenQ",  label: "Seen Q̄",   type: "num1" },
    { key: "seenWR", label: "Seen WR",  type: "pct" },
    { key: "zsSR",   label: "ZS SR",    type: "pct" },
    { key: "zsQ",    label: "ZS Q̄",     type: "num1" },
    { key: "zsWR",   label: "ZS WR",    type: "pct" },
    { key: "scrSR",  label: "Scr SR",   type: "pct" },
    { key: "scrQ",   label: "Scr Q̄",    type: "num1" },
    { key: "scrWR",  label: "Scr WR",   type: "pct" },
    { key: "pftSR",  label: "P+FT SR",  type: "pct" },
    { key: "pftQ",   label: "P+FT Q̄",   type: "num1" },
    { key: "pftWR",  label: "P+FT WR",  type: "pct" }
  ];
  function levelCols(metric) {
    var type = metric === "q" ? "num1" : "pct";
    var suffix = metric === "q" ? " Q̄" : "";
    return [
      { key: "name", label: "Model / paradigm", type: "name", sortable: false },
      { key: "src",  label: "Source", type: "src", sortable: false },
      { key: "L0",   label: "L0" + suffix, type: type },
      { key: "L1",   label: "L1" + suffix, type: type },
      { key: "L2",   label: "L2" + suffix, type: type },
      { key: "L3",   label: "L3" + suffix, type: type }
    ];
  }

  var REGIME_LABEL = {
    seen: "Seen tasks", zs: "Zero-shot", scr: "From scratch", pft: "Pretrain + fine-tune"
  };
  /* Which environment each "By level" regime is judged in — drives both
     the per-row Source column and the metric-switcher's availability
     (sim only ever reports SR, so Quality is disabled while regime=seen). */
  var REGIME_SRC = { seen: "sim", zs: "real", scr: "real", pft: "real" };

  /* ── State ────────────────────────────────────────────────── */
  var state = {
    board: "sim",
    regime: "seen",
    metric: "sr",          // "sr" | "q" — By-level board only
    sortKey: "seen",
    sortDir: -1,           // -1 = desc, 1 = asc
    search: "",
    famOff: {}             // { VLA: true } means VLA is filtered OUT
  };

  var BOARD_DEFAULT_SORT = {
    sim:   { key: "seen",   dir: -1 },
    real:  { key: "seenWR", dir: -1 },
    level: { key: "L0",     dir: -1 }
  };

  /* Each board's companion figure — same live SVG builders and accent
     palette as the homepage's figure deck (see landing.js FIG_ACCENT), so
     switching boards here reads as the same object switching context, not
     a different chart bolted on. tag/title/accent replace the ig-figure
     head text that used to be hardcoded to "Fig. C5" regardless of board. */
  var BOARD_CHART = {
    sim: {
      chart: "paradigm", tag: "Fig. C1", accent: "var(--fig-vla)",
      title: "Which imitation interface is strongest?",
      caption: "<b>Simulation landscape.</b> Every trained variant on the (seen-SR, P+FT-SR) plane, preserving the family markers and automated success-rate axes."
    },
    real: {
      chart: "perlevel", tag: "Fig. C5", accent: "var(--fig-l3)",
      title: "Where does the hierarchy become hard?",
      caption: "<b>Real-world level profile.</b> Success slightly drops through L2, then falls at L3, and the human imitation score falls with it."
    },
    level: {
      chart: "levelscale", tag: "Fig. C4", accent: "var(--fig-l2)",
      title: "Does scale help at every level?",
      caption: "<b>Level × corpus scale.</b> Under pretrain + fine-tune, success rises with corpus size at every level; under zero-shot the floor doesn't move."
    }
  };

  /* ── Row builders ─────────────────────────────────────────── */
  function simRows() {
    return IG.sim.map(function (r) {
      return { model: r.model, fam: r.fam, src: "sim", seen: r.seen, seenSub: r.seenSub,
               zs: r.zs, scr: r.scr, pft: r.pft, delta: r.delta };
    });
  }
  function realRows() {
    return IG.real.map(function (r) {
      return {
        model: r.model, fam: r.fam, src: "real",
        seenSR: r.seen.sr, seenQ: r.seen.q, seenWR: r.seen.wr,
        zsSR:   r.zs.sr,   zsQ:   r.zs.q,   zsWR:   r.zs.wr,
        scrSR:  r.scr.sr,  scrQ:  r.scr.q,  scrWR:  r.scr.wr,
        pftSR:  r.pft.sr,  pftQ:  r.pft.q,  pftWR:  r.pft.wr
      };
    });
  }
  function levelRows(regime, metric) {
    var src = REGIME_SRC[regime] || "real";
    var m = metric === "q" ? "q" : "sr";

    if (regime === "seen") {
      // Simulation only ever reports SR (automated success rate) — no
      // human quality score exists for this regime, so Quality falls
      // back to the SR series here rather than showing empty cells.
      var byFam = IG.figC5.simSeenByFamily;
      var rows = [{ name: "All 15 variants", fam: null, src: src, tone: "var(--fig-grey)",
                    L0: IG.figC5.simSeenAll[0], L1: IG.figC5.simSeenAll[1],
                    L2: IG.figC5.simSeenAll[2], L3: IG.figC5.simSeenAll[3] }];
      ["VLA", "Skill", "VideoVA"].forEach(function (f) {
        var v = byFam[f];
        rows.push({ name: IG.famShort(f), fam: f, src: src, tone: IG.famColor(f), L0: v[0], L1: v[1], L2: v[2], L3: v[3] });
      });
      return { rows: rows, note: "Simulation, seen tasks, automated metric — verified against the paper's appendix. Simulation has no human Quality score, so the Quality view falls back to SR for this regime." };
    }

    var SOURCE = { pft: IG.perLevel, zs: IG.perLevelZS, scr: IG.perLevelScr }[regime];
    if (!SOURCE) return { rows: [], note: "" };
    var rows2 = SOURCE.rows.map(function (r) {
      var series = r[m];
      return { name: r.model, fam: r.fam, src: src, tone: IG.famColor(r.fam), L0: series[0], L1: series[1], L2: series[2], L3: series[3] };
    });
    var avgSeries = SOURCE.average[m];
    rows2.push({ name: "Average", fam: null, src: src, tone: "var(--fig-grey)",
                 L0: avgSeries[0], L1: avgSeries[1], L2: avgSeries[2], L3: avgSeries[3] });

    var NOTE = {
      pft: "Real world, pretrain + fine-tune, Arena-judged — this is the drop the paper calls out at L3.",
      zs:  "Real world, zero-shot, Arena-judged — the same 4 representative models as the P+FT breakdown, given no pretraining or fine-tuning on the target task.",
      scr: "Real world, trained from scratch on the target task only, Arena-judged — the same 4 representative models as the P+FT breakdown."
    }[regime];
    return { rows: rows2, note: NOTE + (m === "q" ? " Showing the 0-10 human Quality score." : " Showing success rate (SR).") };
  }

  function flatten() {
    if (state.board === "sim") return { rows: simRows(), cols: SIM_COLS };
    if (state.board === "real") return { rows: realRows(), cols: REAL_COLS };
    var lv = levelRows(state.regime, state.metric);
    return { rows: lv.rows, cols: levelCols(state.regime === "seen" ? "sr" : state.metric), note: lv.note };
  }

  /* ── Filter + sort ────────────────────────────────────────── */
  function applyFilters(rows) {
    var q = state.search.trim().toLowerCase();
    return rows.filter(function (r) {
      var name = r.model || r.name || "";
      if (q && name.toLowerCase().indexOf(q) === -1) return false;
      if (r.fam && state.famOff[r.fam]) return false; // rows with no family (averages) always pass
      return true;
    });
  }
  function applySort(rows) {
    var k = state.sortKey, d = state.sortDir;
    return rows.slice().sort(function (a, b) {
      var av = a[k], bv = b[k];
      if (av == null) return 1;
      if (bv == null) return -1;
      return av === bv ? 0 : (av < bv ? -1 : 1) * d;
    });
  }

  /* ── Rendering ────────────────────────────────────────────── */
  function cellHTML(row, col) {
    if (col.type === "name") {
      var tone = row.tone || IG.famColor(row.fam);
      return '<span class="lbt-name"><span class="lbt-dot" style="background:' + tone + '"></span>' +
        esc(row.model || row.name) + "</span>";
    }
    if (col.type === "fam") {
      return '<span class="lbt-fam" style="color:' + IG.famColor(row.fam) + '">' + esc(IG.famShort(row.fam)) + "</span>";
    }
    if (col.type === "src") {
      var s = row.src || "sim";
      return '<span class="lbt-src lbt-src-' + s + '">' + esc(SRC_LABEL[s] || s) + "</span>";
    }
    if (col.type === "pct") {
      var v = row[col.key];
      if (v == null) return '<span class="lbt-num">—</span>';
      return '<span class="lbt-num"><span class="lbt-bar"><span class="lbt-bar-fill" style="width:' +
        Math.max(2, Math.round(v * 100)) + '%;background:' + (row.tone || IG.famColor(row.fam)) +
        '"></span></span>' + pct(v) + "</span>";
    }
    if (col.type === "num1") return '<span class="lbt-num">' + num1(row[col.key]) + "</span>";
    if (col.type === "delta") {
      var d = row[col.key];
      var cls = d > 0 ? "lbt-delta-pos" : d < 0 ? "lbt-delta-neg" : "";
      return '<span class="lbt-num ' + cls + '">' + (d > 0 ? "+" : "") + (d == null ? "—" : d.toFixed(2)) + "</span>";
    }
    return "";
  }

  function render() {
    var data = flatten();
    var rows = applySort(applyFilters(data.rows));

    var thead = document.getElementById("lb-head");
    var tbody = document.getElementById("lb-body");
    var note = document.getElementById("lb-note");
    if (!thead || !tbody) return;

    thead.innerHTML = "<tr><th class=\"lbt-rank-h\">#</th>" + data.cols.map(function (c) {
      var active = c.key === state.sortKey;
      var cls = "lbt-th" + (c.sortable === false ? "" : " lbt-th-btn") + (active ? " is-active" : "");
      var arrow = active ? (state.sortDir === -1 ? " ↓" : " ↑") : "";
      return '<th class="' + cls + '" data-key="' + c.key + '" data-sortable="' + (c.sortable !== false) + '">' +
        esc(c.label) + arrow + "</th>";
    }).join("") + "</tr>";

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="' + (data.cols.length + 1) + '" class="lbt-empty">No entries match the current filters.</td></tr>';
    } else {
      tbody.innerHTML = rows.map(function (r, i) {
        return "<tr>" + '<td class="lbt-rank">' + (i + 1) + "</td>" +
          data.cols.map(function (c) { return "<td>" + cellHTML(r, c) + "</td>"; }).join("") + "</tr>";
      }).join("");
    }

    if (note) note.textContent = data.note || defaultNote();
    updateMetricBar();
  }

  function defaultNote() {
    if (state.board === "sim") return "15 trained variants across 3 paradigms, automated metric. The ranking by Seen SR and by P+FT SR are not the same list — try sorting by each.";
    if (state.board === "real") return "4 representative models, Arena-judged by blind human comparison. All four regimes (Seen, Zero-shot, From-scratch, Pretrain+fine-tune) are shown side by side.";
    return "";
  }

  /* Show/enable the SR-vs-Quality metric switcher only on the level board,
     and disable "Quality" while regime=seen (simulation has no Q score). */
  function updateMetricBar() {
    var bar = document.getElementById("lb-metric");
    if (!bar) return;
    var onLevel = state.board === "level";
    bar.style.display = onLevel ? "" : "none";
    if (!onLevel) return;
    var qBtn = bar.querySelector('[data-metric="q"]');
    var simRegime = state.regime === "seen";
    if (qBtn) {
      qBtn.disabled = simRegime;
      qBtn.classList.toggle("is-disabled", simRegime);
      qBtn.title = simRegime ? "Simulation (seen) has no human Quality score — showing SR." : "";
    }
    bar.querySelectorAll("[data-metric]").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.metric === state.metric);
    });
  }

  /* ── Controls wiring ──────────────────────────────────────── */
  function switchBoard(board) {
    state.board = board;
    var d = BOARD_DEFAULT_SORT[board];
    state.sortKey = d.key; state.sortDir = d.dir;
    document.querySelectorAll(".lb-tab").forEach(function (b) { b.classList.toggle("is-active", b.dataset.board === board); });
    var regimeBar = document.getElementById("lb-regime");
    if (regimeBar) regimeBar.style.display = board === "level" ? "" : "none";
    updateBoardChart(board);
    render();
  }

  function updateBoardChart(board) {
    var host = document.getElementById("lb-chart");
    var caption = document.getElementById("lb-chart-caption");
    var config = BOARD_CHART[board];
    if (!host || !config) return;
    var card = host.closest(".ig-figure");
    var tagEl = card ? card.querySelector(".ig-figure-tag") : null;
    var titleEl = card ? card.querySelector(".ig-figure-title") : null;
    if (tagEl) { tagEl.textContent = config.tag; tagEl.style.color = config.accent; tagEl.style.background = "color-mix(in srgb, " + config.accent + " 16%, transparent)"; }
    if (titleEl) titleEl.textContent = config.title;
    host.dataset.chart = config.chart;
    host.removeAttribute("data-drawn");
    host.innerHTML = "";
    if (caption) caption.innerHTML = config.caption;
    if (window.IGCharts) window.IGCharts.build(host);
  }

  function switchRegime(regime) {
    state.regime = regime;
    if (regime === "seen") state.metric = "sr"; // no Q score in sim — force back to SR
    var d = BOARD_DEFAULT_SORT.level;
    state.sortKey = d.key; state.sortDir = d.dir;
    document.querySelectorAll(".lb-regime-btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.regime === regime); });
    render();
  }

  function switchMetric(metric) {
    if (metric === "q" && state.regime === "seen") return; // guarded, see updateMetricBar
    state.metric = metric;
    render();
  }

  function wire() {
    document.querySelectorAll(".lb-tab").forEach(function (b) {
      b.addEventListener("click", function () { switchBoard(b.dataset.board); });
    });
    document.querySelectorAll(".lb-regime-btn").forEach(function (b) {
      b.addEventListener("click", function () { switchRegime(b.dataset.regime); });
    });
    var metricBar = document.getElementById("lb-metric");
    if (metricBar) {
      metricBar.querySelectorAll("[data-metric]").forEach(function (b) {
        b.addEventListener("click", function () { switchMetric(b.dataset.metric); });
      });
    }
    document.querySelectorAll(".lb-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var f = chip.dataset.fam;
        state.famOff[f] = !state.famOff[f];
        chip.classList.toggle("is-off", !!state.famOff[f]);
        render();
      });
    });
    var search = document.getElementById("lb-search");
    if (search) search.addEventListener("input", function () { state.search = search.value; render(); });

    var thead = document.getElementById("lb-head");
    if (thead) {
      thead.addEventListener("click", function (e) {
        var th = e.target.closest("th");
        if (!th || th.dataset.sortable === "false") return;
        var key = th.dataset.key;
        if (state.sortKey === key) state.sortDir *= -1;
        else { state.sortKey = key; state.sortDir = -1; }
        render();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    wire();
    var regimeBar = document.getElementById("lb-regime");
    if (regimeBar) regimeBar.style.display = "none";
    var metricBar = document.getElementById("lb-metric");
    if (metricBar) metricBar.style.display = "none";
    updateBoardChart(state.board);
    render();
  });
})();
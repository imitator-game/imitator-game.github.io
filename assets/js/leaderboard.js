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
   (#lb-regime); only "seen" and "pft" have per-row breakdown data
   today (see figdata.js's audit note) — "zs" falls back to a
   single all-variant row from figC4, and "scr" has no per-level
   data published yet and renders an explanatory note instead of
   an empty guess.
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

  /* ── Column definitions per board ────────────────────────── */
  var SIM_COLS = [
    { key: "model",   label: "Model",       type: "name",  sortable: false },
    { key: "fam",     label: "Paradigm",    type: "fam",   sortable: false },
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
    { key: "seenSR", label: "Seen SR",  type: "pct" },
    { key: "seenQ",  label: "Seen Q̄",   type: "num1" },
    { key: "seenWR", label: "Seen WR",  type: "pct" },
    { key: "pftSR",  label: "P+FT SR",  type: "pct" },
    { key: "pftQ",   label: "P+FT Q̄",   type: "num1" },
    { key: "pftWR",  label: "P+FT WR",  type: "pct" }
  ];
  var LEVEL_COLS = [
    { key: "name", label: "Model / paradigm", type: "name", sortable: false },
    { key: "L0",   label: "L0", type: "pct" },
    { key: "L1",   label: "L1", type: "pct" },
    { key: "L2",   label: "L2", type: "pct" },
    { key: "L3",   label: "L3", type: "pct" }
  ];

  var REGIME_LABEL = {
    seen: "Seen tasks", zs: "Zero-shot", scr: "From scratch", pft: "Pretrain + fine-tune"
  };

  /* ── State ────────────────────────────────────────────────── */
  var state = {
    board: "sim",
    regime: "seen",
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

  /* ── Row builders ─────────────────────────────────────────── */
  function simRows() {
    return IG.sim.map(function (r) {
      return { model: r.model, fam: r.fam, seen: r.seen, seenSub: r.seenSub,
               zs: r.zs, scr: r.scr, pft: r.pft, delta: r.delta };
    });
  }
  function realRows() {
    return IG.real.map(function (r) {
      return { model: r.model, fam: r.fam, seenSR: r.seen.sr, seenQ: r.seen.q, seenWR: r.seen.wr,
               pftSR: r.pft.sr, pftQ: r.pft.q, pftWR: r.pft.wr };
    });
  }
  function levelRows(regime) {
    if (regime === "seen") {
      var byFam = IG.figC5.simSeenByFamily;
      var rows = [{ name: "All 15 variants", fam: null, tone: "var(--fig-grey)",
                    L0: IG.figC5.simSeenAll[0], L1: IG.figC5.simSeenAll[1],
                    L2: IG.figC5.simSeenAll[2], L3: IG.figC5.simSeenAll[3] }];
      ["VLA", "Skill", "VideoVA"].forEach(function (f) {
        var v = byFam[f];
        rows.push({ name: IG.famShort(f), fam: f, tone: IG.famColor(f), L0: v[0], L1: v[1], L2: v[2], L3: v[3] });
      });
      return { rows: rows, note: "Simulation, seen tasks, automated metric — verified against the paper's appendix." };
    }
    if (regime === "pft") {
      var rows2 = IG.perLevel.rows.map(function (r) {
        return { name: r.model, fam: r.fam, tone: IG.famColor(r.fam), L0: r.sr[0], L1: r.sr[1], L2: r.sr[2], L3: r.sr[3] };
      });
      rows2.push({ name: "Average", fam: null, tone: "var(--fig-grey)",
                   L0: IG.perLevel.average.sr[0], L1: IG.perLevel.average.sr[1],
                   L2: IG.perLevel.average.sr[2], L3: IG.perLevel.average.sr[3] });
      return { rows: rows2, note: "Real world, pretrain + fine-tune, Arena-judged — this is the drop the paper calls out at L3." };
    }
    if (regime === "zs") {
      var p = IG.figC4.panels.filter(function (x) { return x.key === "sim-zs"; })[0];
      if (!p) return { rows: [], note: "" };
      var i = IG.figC4.scales.length - 1; // 45-task corpus
      var row = { name: "All 15 variants (45-task corpus)", fam: null, tone: "var(--fig-grey)",
                  L0: p.series.L0[i], L1: p.series.L1[i], L2: p.series.L2[i], L3: p.series.L3[i] };
      return { rows: [row], note: "Simulation, zero-shot, automated metric — per-model breakdown by level isn't published yet, so this is the all-variant average." };
    }
    // scr: no per-level breakdown exists anywhere in the released numbers.
    return { rows: [], note: "Per-level breakdown for the from-scratch regime isn't published yet." };
  }

  function flatten() {
    if (state.board === "sim") return { rows: simRows(), cols: SIM_COLS };
    if (state.board === "real") return { rows: realRows(), cols: REAL_COLS };
    var lv = levelRows(state.regime);
    return { rows: lv.rows, cols: LEVEL_COLS, note: lv.note };
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
  }

  function defaultNote() {
    if (state.board === "sim") return "15 trained variants across 3 paradigms, automated metric. The ranking by Seen SR and by P+FT SR are not the same list — try sorting by each.";
    if (state.board === "real") return "4 representative models, Arena-judged by blind human comparison.";
    return "";
  }

  /* ── Controls wiring ──────────────────────────────────────── */
  function switchBoard(board) {
    state.board = board;
    var d = BOARD_DEFAULT_SORT[board];
    state.sortKey = d.key; state.sortDir = d.dir;
    document.querySelectorAll(".lb-tab").forEach(function (b) { b.classList.toggle("is-active", b.dataset.board === board); });
    var regimeBar = document.getElementById("lb-regime");
    if (regimeBar) regimeBar.style.display = board === "level" ? "" : "none";
    render();
  }

  function switchRegime(regime) {
    state.regime = regime;
    var d = BOARD_DEFAULT_SORT.level;
    state.sortKey = d.key; state.sortDir = d.dir;
    document.querySelectorAll(".lb-regime-btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.regime === regime); });
    render();
  }

  function wire() {
    document.querySelectorAll(".lb-tab").forEach(function (b) {
      b.addEventListener("click", function () { switchBoard(b.dataset.board); });
    });
    document.querySelectorAll(".lb-regime-btn").forEach(function (b) {
      b.addEventListener("click", function () { switchRegime(b.dataset.regime); });
    });
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
    render();
  });
})();
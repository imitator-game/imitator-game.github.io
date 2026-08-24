/* ============================================================
   figdata.js — every number the site draws, in one place.

   Sources
     • Table "Simulation results"        → IG.sim
     • Table "Real-world Arena results"  → IG.real
     • Table "Real-world P+FT by level"  → IG.perLevel
     • appendix_C_numbers.csv            → IG.figC*
   Keep this file the single point of edit when results change:
   the charts, the leaderboard and the key-finding cards all read
   from it.

   Audit note (2026-08-25): cross-checked against appendix_C_numbers.csv
   and make_appendix_figs.py.
     - figC1 / figC2 / figC3 / figC4 / figC7.correlations: verified exact,
       byte-for-byte against the CSV.
     - figC5 (below) now holds only the VERIFIED slice of the paper's
       four-panel fig_perlevel(): simulation, Seen, all-variant and
       per-family, resolved by level — this is panel (c) of that figure.
       The real-world P+FT panel (b) — per-model SR/Q by level — is NOT in
       appendix_C_numbers.csv, so it is kept separately under IG.perLevel
       and flagged there as an unverified placeholder.
     - figC8: verified exact, not yet drawn by any chart (no renderer
       exists for it in charts.js yet).
   ============================================================ */
window.IG = (function () {

  var FAMILY = {
    VLA:     { key: "VLA",     label: "Language-conditioned VLA", short: "VLA",         color: "var(--fig-vla)",     marker: "circle" },
    Skill:   { key: "Skill",   label: "Cross-embodiment skill",   short: "Video-Skill", color: "var(--fig-skill)",   marker: "square" },
    VideoVA: { key: "VideoVA", label: "Video-conditioned VA",     short: "Video-VA",    color: "var(--fig-videova)", marker: "triangle" }
  };

  /* ── Simulation: 15 trained variants ─────────────────────────
     SR / Sub-SR averaged over the {15,30,45}-task pretraining scales.
     Verified: family means/ranges reproduce appendix_C_numbers.csv
     "sim seen-SR mean/range [family]" exactly. */
  var sim = [
    { model: "ACT/DINOv2",      fam: "VideoVA", enc: "DINOv2",   seen: .81, seenSub: .93, zs: .02, zsSub: .13, scr: .76, scrSub: .83, pft: .84, pftSub: .88 },
    { model: "XSkill",          fam: "Skill",   enc: null,       seen: .79, seenSub: .91, zs: .10, zsSub: .25, scr: .35, scrSub: .51, pft: .73, pftSub: .82 },
    { model: "ACT/SigLIP2",     fam: "VideoVA", enc: "SigLIP2",  seen: .79, seenSub: .93, zs: .03, zsSub: .12, scr: .65, scrSub: .78, pft: .80, pftSub: .86 },
    { model: "UniSkill",        fam: "Skill",   enc: null,       seen: .75, seenSub: .89, zs: .07, zsSub: .17, scr: .27, scrSub: .46, pft: .59, pftSub: .76 },
    { model: "π₀.₅",            fam: "VLA",     enc: null,       seen: .73, seenSub: .89, zs: .09, zsSub: .22, scr: .80, scrSub: .86, pft: .85, pftSub: .91 },
    { model: "ACT/VideoMAE",    fam: "VideoVA", enc: "VideoMAE", seen: .72, seenSub: .88, zs: .04, zsSub: .14, scr: .63, scrSub: .76, pft: .82, pftSub: .87 },
    { model: "DP/DINOv2",       fam: "VideoVA", enc: "DINOv2",   seen: .67, seenSub: .84, zs: .07, zsSub: .21, scr: .13, scrSub: .36, pft: .54, pftSub: .73 },
    { model: "DP/SigLIP2",      fam: "VideoVA", enc: "SigLIP2",  seen: .61, seenSub: .84, zs: .05, zsSub: .20, scr: .11, scrSub: .35, pft: .48, pftSub: .69 },
    { model: "VQ-BeT/SigLIP2",  fam: "VideoVA", enc: "SigLIP2",  seen: .57, seenSub: .78, zs: .08, zsSub: .23, scr: .26, scrSub: .46, pft: .17, pftSub: .34 },
    { model: "VQ-BeT/DINOv2",   fam: "VideoVA", enc: "DINOv2",   seen: .52, seenSub: .76, zs: .13, zsSub: .27, scr: .35, scrSub: .53, pft: .23, pftSub: .43 },
    { model: "GR00T-N1.6",      fam: "VLA",     enc: null,       seen: .51, seenSub: .81, zs: .03, zsSub: .17, scr: .21, scrSub: .49, pft: .67, pftSub: .79 },
    { model: "RDT-1B",          fam: "VLA",     enc: null,       seen: .43, seenSub: .72, zs: .07, zsSub: .19, scr: .35, scrSub: .55, pft: .21, pftSub: .43 },
    { model: "VQ-BeT/VideoMAE", fam: "VideoVA", enc: "VideoMAE", seen: .30, seenSub: .51, zs: .07, zsSub: .21, scr: .14, scrSub: .36, pft: .15, pftSub: .33 },
    { model: "OpenVLA",         fam: "VLA",     enc: null,       seen: .29, seenSub: .60, zs: .06, zsSub: .20, scr: .14, scrSub: .34, pft: .20, pftSub: .44 },
    { model: "DP/VideoMAE",     fam: "VideoVA", enc: "VideoMAE", seen: .14, seenSub: .44, zs: .02, zsSub: .15, scr: .09, scrSub: .27, pft: .36, pftSub: .58 }
  ];
  sim.forEach(function (r) { r.delta = +(r.pft - r.scr).toFixed(2); });

  /* ── Real world: 4 representative models, human-judged ─────── */
  var real = [
    { model: "XSkill",     fam: "Skill",   seen: { sr:.63, q:7.49, wr:.89 }, zs: { sr:.29, q:5.24, wr:.50 }, scr: { sr:.28, q:5.40, wr:.52 }, pft: { sr:.49, q:6.72, wr:.95 } },
    { model: "π₀.₅",       fam: "VLA",     seen: { sr:.51, q:6.87, wr:.56 }, zs: { sr:.04, q:2.34, wr:.04 }, scr: { sr:.27, q:5.52, wr:.50 }, pft: { sr:.36, q:5.89, wr:.73 } },
    { model: "ACT/DINOv2", fam: "VideoVA", seen: { sr:.49, q:6.70, wr:.41 }, zs: { sr:.26, q:5.44, wr:.42 }, scr: { sr:.22, q:5.38, wr:.24 }, pft: { sr:.35, q:5.88, wr:.70 } },
    { model: "DP/DINOv2",  fam: "VideoVA", seen: { sr:.39, q:6.19, wr:.14 }, zs: { sr:.22, q:4.96, wr:.25 }, scr: { sr:.22, q:5.32, wr:.24 }, pft: { sr:.31, q:5.77, wr:.58 } }
  ];
  real.forEach(function (r) {
    r.delta = { sr: +(r.pft.sr - r.scr.sr).toFixed(2), q: +(r.pft.q - r.scr.q).toFixed(2), wr: +(r.pft.wr - r.scr.wr).toFixed(2) };
  });

  /* ── Real-world P+FT, resolved by hierarchy level (fig_perlevel panel b) ──
     average.sr VERIFIED against appendix_C_numbers.csv "real P+FT per level
     L0-L3" = 0.42/0.42/0.39/0.29 — exact match.
     rows[].sr, rows[].q and average.q are NOT in appendix_C_numbers.csv
     (dump_numbers.py computes them but the exported CSV was filtered before
     it reached us). Treat as unverified placeholders, directionally
     consistent with the paper's stated axis convention Q ≈ 5*SR + 4 —
     replace with real_*.xlsx-derived numbers when available. */
  var perLevel = {
    levels: ["L0", "L1", "L2", "L3"],
    rows: [
      { model: "π₀.₅",       fam: "VLA",     sr: [.44, .35, .37, .28], q: [6.27, 5.77, 5.97, 5.57] }, // unverified
      { model: "XSkill",     fam: "Skill",   sr: [.53, .57, .56, .29], q: [6.80, 7.20, 7.23, 5.63] }, // unverified
      { model: "ACT/DINOv2", fam: "VideoVA", sr: [.37, .37, .33, .33], q: [6.00, 5.90, 5.77, 5.83] }, // unverified
      { model: "DP/DINOv2",  fam: "VideoVA", sr: [.33, .37, .29, .25], q: [5.97, 6.00, 5.70, 5.43] }  // unverified
    ],
    average: { sr: [.42, .42, .39, .29], q: [6.26, 6.22, 6.17, 5.62] } // sr verified, q unverified
  };

  /* ── Appendix C · figure-by-figure numbers ─────────────────── */

  // C1 · paradigm landscape — verified exact
  var figC1 = {
    familyStats: [
      { fam: "VLA",     mean: .488, lo: .29, hi: .73, arenaWR: .423 },
      { fam: "Skill",   mean: .769, lo: .75, hi: .79, arenaWR: .644 },
      { fam: "VideoVA", mean: .570, lo: .14, hi: .81, arenaWR: .500 }
    ],
    arenaWR: [
      { model: "ACT/DINOv2",  fam: "VideoVA", wr: .82, q: 8.1 },
      { model: "ACT/SigLIP2", fam: "VideoVA", wr: .77, q: 8.0 },
      { model: "ACT/VideoMAE",fam: "VideoVA", wr: .68, q: 7.7 },
      { model: "π₀.₅",        fam: "VLA",     wr: .616, q: null }
    ]
  };

  // C2 · encoder ablation — verified exact
  var figC2 = {
    encoders: ["DINOv2", "SigLIP2", "VideoMAE"],
    sim: {
      Seen:   { ACT: [.81, .79, .72], DP: [.67, .61, .14], "VQ-BeT": [.52, .57, .30] },
      "P+FT": { ACT: [.84, .80, .82], DP: [.54, .49, .36], "VQ-BeT": [.23, .17, .15] }
    },
    real: {
      Seen:   [.48, .45, .39],
      ZS:     [.30, .27, .25],
      Scr:    [.22, .22, .17],
      "P+FT": [.43, .41, .33]
    }
  };

  // C3 · pretraining-corpus scaling — verified exact (30-task midpoint of
  // zsFloor series is a linear interpolation of the 15/45 endpoints; the
  // CSV only gives 15 and 45).
  var figC3 = {
    improvedOf: [18, 19],
    deltaSim: [
      { model: "VQ-BeT/DINOv2",  fam: "VideoVA", d: .210 },
      { model: "VQ-BeT/SigLIP2", fam: "VideoVA", d: .200 },
      { model: "DP/DINOv2",      fam: "VideoVA", d: .165 },
      { model: "DP/SigLIP2",     fam: "VideoVA", d: .160 },
      { model: "GR00T-N1.6",     fam: "VLA",     d: .160 },
      { model: "VQ-BeT/VideoMAE",fam: "VideoVA", d: .155 },
      { model: "DP/VideoMAE",    fam: "VideoVA", d: .135 },
      { model: "XSkill",         fam: "Skill",   d: .120 },
      { model: "ACT/SigLIP2",    fam: "VideoVA", d: .085 },
      { model: "RDT-1B",         fam: "VLA",     d: .055 },
      { model: "π₀.₅",           fam: "VLA",     d: .045 },
      { model: "ACT/DINOv2",     fam: "VideoVA", d: .035 },
      { model: "OpenVLA",        fam: "VLA",     d: .035 },
      { model: "ACT/VideoMAE",   fam: "VideoVA", d: .020 },
      { model: "UniSkill",       fam: "Skill",   d: -.090 }
    ],
    deltaReal: [
      { model: "ACT/DINOv2", fam: "VideoVA", d: .17 },
      { model: "DP/DINOv2",  fam: "VideoVA", d: .14 },
      { model: "π₀.₅",       fam: "VLA",     d: .13 },
      { model: "XSkill",     fam: "Skill",   d: .11 }
    ],
    zsFloor: {
      scales: [15, 30, 45],
      series: [
        { model: "XSkill",     fam: "Skill",   v: [.24, .285, .33] },
        { model: "ACT/DINOv2", fam: "VideoVA", v: [.22, .26,  .30] },
        { model: "DP/DINOv2",  fam: "VideoVA", v: [.19, .22,  .25] },
        { model: "π₀.₅",       fam: "VLA",     v: [.04, .04,  .04] }
      ]
    }
  };

  // C4 · level × corpus scale — verified exact, all 16 series
  var figC4 = {
    scales: [15, 30, 45],
    panels: [
      { key: "sim-zs",   domain: "Simulation", regime: "Zero-shot",
        series: { L0: [.08, .06, .06], L1: [.14, .09, .07], L2: [.04, .07, .06], L3: [.03, .01, .04] } },
      { key: "sim-pft",  domain: "Simulation", regime: "Pretrain + fine-tune",
        series: { L0: [.52, .59, .62], L1: [.48, .59, .58], L2: [.34, .36, .41], L3: [.47, .55, .59] } },
      { key: "real-zs",  domain: "Real world", regime: "Zero-shot",
        series: { L0: [.18, .23, .23], L1: [.18, .20, .24], L2: [.14, .16, .20], L3: [.19, .23, .25] } },
      { key: "real-pft", domain: "Real world", regime: "Pretrain + fine-tune",
        series: { L0: [.34, .44, .48], L1: [.35, .45, .45], L2: [.31, .37, .49], L3: [.23, .28, .36] } }
    ]
  };

  // C5 · per-level fidelity (verified slice only — see file header note).
  // Simulation, Seen tasks, all 15 variants and per-family, resolved by
  // level. This is panel (c) of make_appendix_figs.py's fig_perlevel().
  var figC5 = {
    simSeenAll: [.62, .57, .48, .63],
    simSeenByFamily: { VLA: [.55, .42, .36, .62], Skill: [.83, .78, .74, .72], VideoVA: [.61, .59, .47, .61] }
  };

  // C7 · does the automated metric agree with the humans? — correlations
  // verified exact against appendix_C_numbers.csv; the 12-point scatter is
  // illustrative (raw per-episode rows aren't in the CSV) but consistent
  // with r = 0.956.
  var figC7 = {
    correlations: [
      { label: "SR vs human SR",       scope: "variant × regime", r: .956 },
      { label: "Sub-SR vs human Q",    scope: "variant × regime", r: .952 },
      { label: "SR vs human SR",       scope: "+ level",          r: .867 },
      { label: "Sub-SR vs human Q",    scope: "+ level",          r: .874 },
      { label: "Simulation vs real",   scope: "all regimes",      r: .742 },
      { label: "Simulation vs real",   scope: "within Seen/P+FT", r: .365 }
    ],
    agreement: [
      { model: "XSkill",     fam: "Skill",   x: .63, y: .63 },
      { model: "XSkill",     fam: "Skill",   x: .49, y: .49 },
      { model: "XSkill",     fam: "Skill",   x: .31, y: .29 },
      { model: "π₀.₅",       fam: "VLA",     x: .53, y: .51 },
      { model: "π₀.₅",       fam: "VLA",     x: .38, y: .36 },
      { model: "π₀.₅",       fam: "VLA",     x: .07, y: .04 },
      { model: "ACT/DINOv2", fam: "VideoVA", x: .51, y: .49 },
      { model: "ACT/DINOv2", fam: "VideoVA", x: .34, y: .35 },
      { model: "ACT/DINOv2", fam: "VideoVA", x: .28, y: .26 },
      { model: "DP/DINOv2",  fam: "VideoVA", x: .41, y: .39 },
      { model: "DP/DINOv2",  fam: "VideoVA", x: .29, y: .31 },
      { model: "DP/DINOv2",  fam: "VideoVA", x: .24, y: .22 }
    ],
    // Panel (b) of fig_validity() — Arena SR_human / Qbar, Seen regime, by
    // level — verified exact against the CSV ("arena seen SRhuman/Qbar
    // L0-L3"), but no chart or leaderboard consumer reads this yet.
    arenaSeenByLevel: { SRhuman: [.58, .53, .46, .65], Qbar: [7.25, 6.98, 6.70, 7.46] }
  };

  // C8 · per-task spread across levels — verified exact against
  // appendix_C_numbers.csv. Not yet drawn by charts.js (no "pertask" chart
  // function exists yet) — data is ready for a future figC8 renderer, per
  // fig_pertask() in make_appendix_figs.py.
  var figC8 = {
    seen: [
      { task: "Fold towel",        v: [.71, .66, .42, .54] },
      { task: "Place file folder", v: [.64, .55, .51, .76] },
      { task: "Hang mug on rack",  v: [.66, .68, .61, .81] },
      { task: "Place plate rack",  v: [.67, .63, .46, .68] },
      { task: "Stir with spoon",   v: [.44, .34, .39, .36] }
    ],
    unseenPFT: [
      { task: "Fold box",          v: [.78, .82, .80, .70] },
      { task: "Pick food",         v: [.37, .44, .05, .46] },
      { task: "Pick remote",       v: [.67, .67, .51, .52] },
      { task: "Pour kettle",       v: [.58, .39, .00, .59] },
      { task: "Scan milk box",     v: [.48, .45, .50, .42] }
    ]
  };

  var levelMeta = [
    { id: "L0", name: "Scene-identical execution", blurb: "The imitator scene matches the demonstration. Replaying the trajectory is enough." },
    { id: "L1", name: "Spatial adaptation",        blurb: "Same objects, different layout. The outcome must survive a new trajectory." },
    { id: "L2", name: "Visual-physical generalization", blurb: "A different instance of the same category — new look, new geometry, same role." },
    { id: "L3", name: "Intent-level transfer",     blurb: "The object is replaced by one with different semantics. Teapot → tap, for the same goal." }
  ];

  return {
    FAMILY: FAMILY, sim: sim, real: real, perLevel: perLevel, levelMeta: levelMeta,
    figC1: figC1, figC2: figC2, figC3: figC3, figC4: figC4, figC5: figC5, figC7: figC7, figC8: figC8,
    famColor: function (f) { return (FAMILY[f] || {}).color || "var(--fig-grey)"; },
    famShort: function (f) { return (FAMILY[f] || {}).short || f; }
  };
})();
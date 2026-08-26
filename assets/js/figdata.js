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

   Audit note (2026-08-25, second pass): re-checked every number leaderboard.js
   and this file draw against the raw source files (all_summary.json /
   all_master_records.csv for simulation, act|dp|pi|xskill 测试记录.xlsx for
   real-world). Everything reproduced exactly except one transcription slip:
   IG.real's DP/DINOv2 zs.q was 4.96, the sheets give 4.97 — fixed above.
   Also added IG.perLevelZS / IG.perLevelScr (real-world zero-shot and
   from-scratch, resolved by level, same 4 models as IG.perLevel) — this
   data was derivable from the xlsx all along but nothing on the site
   surfaced it; see leaderboard.js's "By level" board.
   ============================================================ */
window.IG = (function () {

  var FAMILY = {
    VLA:     { key: "VLA",     label: "Language-conditioned VLA", short: "VLA",         color: "var(--fig-vla)",     marker: "circle" },
    Skill:   { key: "Skill",   label: "Cross-embodiment skill",   short: "Video-Skill", color: "var(--fig-skill)",   marker: "square" },
    VideoVA: { key: "VideoVA", label: "Video-conditioned VA",     short: "Video-VA",    color: "var(--fig-videova)", marker: "triangle" }
  };

  /* ── Simulation: 15 trained variants ─────────────────────────
     SR / Sub-SR averaged over the {15,30,45}-task pretraining scales for
     Seen/ZS/P+FT. Cross-checked 2026-08 against Table "Simulation results"
     in 4_exp.tex (\label{tab:main-sim}) — every one of the 15 rows, all
     ten fields, matches exactly. This also settles the Scr column, which
     is NOT a plain mean: Table 1's Scr basis takes, per (task, level)
     cell, the MIN success rate across the three corpus scales (a
     variant's worst from-scratch run "wins" the cell), then averages the
     20 cells — see scr_table1_basis() in make_appendix_figs.py. A plain
     per-scale mean gives visibly different (higher) Scr numbers; this
     file's Scr/Scr-Sub match the paper's min-basis figures, not the
     naive mean. */
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

  /* ── Real world: 4 representative models, human-judged ───────
     Every field — sr, q, AND wr — reproduces Table "Real-world Arena
     results" in 4_exp.tex (\label{tab:main-real}) exactly, cross-checked
     2026-08. (An earlier pass could only confirm sr/q from the raw
     hardware trial files and flagged wr as unverified, because
     results.json's Arena buckets turned out to be simulation-rollout
     judgments, not real-world ones — the paper's own table is the
     correct source for wr and settles it.)
     Re-audited 2026-08-25 against act/dp/pi/xskill 测试记录.xlsx
     (per-episode 成功/总数 + 平均分, averaged over the 15/30/45-task
     scales for seen/zs/pft, single value for scr — same basis as
     IG.perLevel below): every sr and q value reproduces the raw sheets
     exactly EXCEPT DP/DINOv2's zs.q, which the sheets give as 4.97, not
     4.96 — corrected here. wr still cannot be derived from the sheets
     (they carry no pairwise/win-rate column), so it remains sourced
     from the paper table only, as before. */
  var real = [
    { model: "XSkill",     fam: "Skill",   seen: { sr:.63, q:7.49, wr:.89 }, zs: { sr:.29, q:5.24, wr:.50 }, scr: { sr:.28, q:5.40, wr:.52 }, pft: { sr:.49, q:6.72, wr:.95 } },
    { model: "π₀.₅",       fam: "VLA",     seen: { sr:.51, q:6.87, wr:.56 }, zs: { sr:.04, q:2.34, wr:.04 }, scr: { sr:.27, q:5.52, wr:.50 }, pft: { sr:.36, q:5.89, wr:.73 } },
    { model: "ACT/DINOv2", fam: "VideoVA", seen: { sr:.49, q:6.70, wr:.41 }, zs: { sr:.26, q:5.44, wr:.42 }, scr: { sr:.22, q:5.38, wr:.24 }, pft: { sr:.35, q:5.88, wr:.70 } },
    { model: "DP/DINOv2",  fam: "VideoVA", seen: { sr:.39, q:6.19, wr:.14 }, zs: { sr:.22, q:4.97, wr:.25 }, scr: { sr:.22, q:5.32, wr:.24 }, pft: { sr:.31, q:5.77, wr:.58 } }
  ];
  real.forEach(function (r) {
    r.delta = { sr: +(r.pft.sr - r.scr.sr).toFixed(2), q: +(r.pft.q - r.scr.q).toFixed(2), wr: +(r.pft.wr - r.scr.wr).toFixed(2) };
  });

  /* ── Real-world P+FT, resolved by hierarchy level (fig_perlevel panel b) ──
     average.sr VERIFIED against appendix_C_numbers.csv "real P+FT per level
     L0-L3" = 0.42/0.42/0.39/0.29 — exact match.
     rows[].sr, rows[].q and average.q are now VERIFIED exact — cross-checked
     2026-08 against the raw pipeline (all_master_records.csv / real_*.xlsx /
     results.json run through ig_common.load_all + dump_numbers.py) rather
     than the filtered CSV export. Every value below reproduced bit for bit. */
  var perLevel = {
    levels: ["L0", "L1", "L2", "L3"],
    rows: [
      { model: "π₀.₅",       fam: "VLA",     sr: [.44, .35, .37, .28], q: [6.27, 5.77, 5.97, 5.57] },
      { model: "XSkill",     fam: "Skill",   sr: [.53, .57, .56, .29], q: [6.80, 7.20, 7.23, 5.63] },
      { model: "ACT/DINOv2", fam: "VideoVA", sr: [.37, .37, .33, .33], q: [6.00, 5.90, 5.77, 5.83] },
      { model: "DP/DINOv2",  fam: "VideoVA", sr: [.33, .37, .29, .25], q: [5.97, 6.00, 5.70, 5.43] }
    ],
    average: { sr: [.42, .42, .39, .29], q: [6.26, 6.22, 6.17, 5.62] } // verified exact
  };

  /* ── Real-world zero-shot and from-scratch, resolved by level ──
     Added 2026-08-25. These did not exist anywhere in the site before —
     the leaderboard's "By level" board used to fall back to a single
     simulation-only zs row and an empty "not published" scr note. Both
     are derivable from the same real_*.xlsx sheets as IG.perLevel
     above (per-episode 成功/总数 + 平均分, grouped by the robot_H*_L0-3
     suffix on 训练任务名): zs averages the {15,30,45}(unseen) sheets per
     level, scr uses the single *_unseen_scratch sheet per level — same
     basis as the corresponding overall figures in IG.real. Every row's
     model-level average reproduces IG.real's zs/scr sr and q exactly. */
  var perLevelZS = {
    levels: ["L0", "L1", "L2", "L3"],
    rows: [
      { model: "π₀.₅",       fam: "VLA",     sr: [.08, .04, .03, .03], q: [2.40, 2.27, 2.23, 2.47] },
      { model: "XSkill",     fam: "Skill",   sr: [.32, .28, .23, .32], q: [5.40, 5.20, 4.83, 5.53] },
      { model: "ACT/DINOv2", fam: "VideoVA", sr: [.21, .31, .24, .28], q: [5.13, 5.70, 5.37, 5.57] },
      { model: "DP/DINOv2",  fam: "VideoVA", sr: [.24, .20, .17, .27], q: [5.03, 4.87, 4.67, 5.30] }
    ],
    average: { sr: [.21, .21, .17, .22], q: [4.49, 4.51, 4.28, 4.72] }
  };
  var perLevelScr = {
    levels: ["L0", "L1", "L2", "L3"],
    rows: [
      { model: "π₀.₅",       fam: "VLA",     sr: [.32, .24, .28, .24], q: [5.80, 5.40, 5.60, 5.30] },
      { model: "XSkill",     fam: "Skill",   sr: [.28, .28, .28, .28], q: [5.50, 5.50, 5.20, 5.40] },
      { model: "ACT/DINOv2", fam: "VideoVA", sr: [.20, .24, .16, .28], q: [5.30, 5.50, 5.00, 5.70] },
      { model: "DP/DINOv2",  fam: "VideoVA", sr: [.28, .24, .20, .16], q: [5.70, 5.40, 5.20, 5.00] }
    ],
    average: { sr: [.27, .25, .23, .24], q: [5.58, 5.45, 5.25, 5.35] }
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

  // C5 · per-level fidelity — Simulation, Seen tasks, all 15 variants and
  // per-family, resolved by level. This is panel (c) of fig_perlevel().
  // SubSR rows re-verified 2026-08 against the raw pipeline (previously
  // estimated — see git history — now exact).
  var figC5 = {
    simSeenAll: [.62, .57, .48, .63],
    simSeenByFamily: { VLA: [.55, .42, .36, .62], Skill: [.83, .78, .74, .72], VideoVA: [.61, .59, .47, .61] },
    simSeenSubAll: [.82, .77, .73, .81],
    simSeenSubByFamily: { VLA: [.81, .70, .68, .83], Skill: [.92, .89, .89, .91], VideoVA: [.79, .77, .72, .78] }
  };

  // C7 · does the automated metric agree with the humans? — correlations
  // verified exact against appendix_C_numbers.csv. The scatter in panel (a)
  // is the FULL set fig_validity() actually plots: sim.groupby(["variant",
  // "setting"]) joined to arena.groupby(["variant","setting"]) — all 15
  // trained variants × 4 regimes (Seen/ZS/Scr/P+FT) = 60 points, colored by
  // regime (C_SETTING), not by paradigm family — re-derived 2026-08 by
  // running ig_common.load_all() + the same groupby against the raw
  // all_master_records.csv / real_*.xlsx / results.json. r reproduces the
  // CSV's 0.956 / 0.952 to 3 decimals.
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
      { model: "π₀.₅", fam: "VLA", setting: "P+FT", x: 0.8483, y: 0.9200, subx: 0.9053, q: 8.46 },
      { model: "π₀.₅", fam: "VLA", setting: "Scr", x: 0.7950, y: 0.7619, subx: 0.8631, q: 7.67 },
      { model: "π₀.₅", fam: "VLA", setting: "Seen", x: 0.7283, y: 0.6512, subx: 0.8881, q: 7.98 },
      { model: "π₀.₅", fam: "VLA", setting: "ZS", x: 0.0917, y: 0.0000, subx: 0.2203, q: 2.46 },
      { model: "ACT/DINOv2", fam: "VideoVA", setting: "P+FT", x: 0.8433, y: 0.8750, subx: 0.8842, q: 8.75 },
      { model: "ACT/DINOv2", fam: "VideoVA", setting: "Scr", x: 0.8033, y: 0.8235, subx: 0.8667, q: 8.29 },
      { model: "ACT/DINOv2", fam: "VideoVA", setting: "Seen", x: 0.8083, y: 0.8333, subx: 0.9307, q: 8.65 },
      { model: "ACT/DINOv2", fam: "VideoVA", setting: "ZS", x: 0.0217, y: 0.0000, subx: 0.1267, q: 2.33 },
      { model: "ACT/SigLIP2", fam: "VideoVA", setting: "P+FT", x: 0.7983, y: 0.8955, subx: 0.8563, q: 8.73 },
      { model: "ACT/SigLIP2", fam: "VideoVA", setting: "Scr", x: 0.7400, y: 0.6923, subx: 0.8300, q: 7.62 },
      { model: "ACT/SigLIP2", fam: "VideoVA", setting: "Seen", x: 0.7867, y: 0.7391, subx: 0.9272, q: 8.33 },
      { model: "ACT/SigLIP2", fam: "VideoVA", setting: "ZS", x: 0.0250, y: 0.0000, subx: 0.1205, q: 1.44 },
      { model: "ACT/VideoMAE", fam: "VideoVA", setting: "P+FT", x: 0.8167, y: 0.8704, subx: 0.8744, q: 8.44 },
      { model: "ACT/VideoMAE", fam: "VideoVA", setting: "Scr", x: 0.7350, y: 0.7692, subx: 0.8300, q: 7.38 },
      { model: "ACT/VideoMAE", fam: "VideoVA", setting: "Seen", x: 0.7217, y: 0.7105, subx: 0.8838, q: 8.32 },
      { model: "ACT/VideoMAE", fam: "VideoVA", setting: "ZS", x: 0.0450, y: 0.0000, subx: 0.1413, q: 2.00 },
      { model: "DP/DINOv2", fam: "VideoVA", setting: "P+FT", x: 0.5417, y: 0.4898, subx: 0.7253, q: 6.84 },
      { model: "DP/DINOv2", fam: "VideoVA", setting: "Scr", x: 0.2100, y: 0.1500, subx: 0.4373, q: 4.90 },
      { model: "DP/DINOv2", fam: "VideoVA", setting: "Seen", x: 0.6717, y: 0.6667, subx: 0.8410, q: 7.76 },
      { model: "DP/DINOv2", fam: "VideoVA", setting: "ZS", x: 0.0717, y: 0.0000, subx: 0.2064, q: 3.00 },
      { model: "DP/SigLIP2", fam: "VideoVA", setting: "P+FT", x: 0.4850, y: 0.4792, subx: 0.6908, q: 6.69 },
      { model: "DP/SigLIP2", fam: "VideoVA", setting: "Scr", x: 0.2033, y: 0.0000, subx: 0.4279, q: 4.69 },
      { model: "DP/SigLIP2", fam: "VideoVA", setting: "Seen", x: 0.6067, y: 0.4643, subx: 0.8377, q: 6.89 },
      { model: "DP/SigLIP2", fam: "VideoVA", setting: "ZS", x: 0.0517, y: 0.0000, subx: 0.1951, q: 2.09 },
      { model: "DP/VideoMAE", fam: "VideoVA", setting: "P+FT", x: 0.3600, y: 0.4167, subx: 0.5772, q: 6.40 },
      { model: "DP/VideoMAE", fam: "VideoVA", setting: "Scr", x: 0.1550, y: 0.1875, subx: 0.3515, q: 4.62 },
      { model: "DP/VideoMAE", fam: "VideoVA", setting: "Seen", x: 0.1433, y: 0.1493, subx: 0.4397, q: 4.87 },
      { model: "DP/VideoMAE", fam: "VideoVA", setting: "ZS", x: 0.0233, y: 0.0000, subx: 0.1471, q: 3.71 },
      { model: "GR00T", fam: "VLA", setting: "P+FT", x: 0.6717, y: 0.7660, subx: 0.7947, q: 7.53 },
      { model: "GR00T", fam: "VLA", setting: "Scr", x: 0.2150, y: 0.1111, subx: 0.4856, q: 4.94 },
      { model: "GR00T", fam: "VLA", setting: "Seen", x: 0.5067, y: 0.7241, subx: 0.8127, q: 8.02 },
      { model: "GR00T", fam: "VLA", setting: "ZS", x: 0.0283, y: 0.1250, subx: 0.1677, q: 2.44 },
      { model: "OpenVLA", fam: "VLA", setting: "P+FT", x: 0.1967, y: 0.3409, subx: 0.4375, q: 5.54 },
      { model: "OpenVLA", fam: "VLA", setting: "Scr", x: 0.1400, y: 0.1579, subx: 0.3351, q: 4.79 },
      { model: "OpenVLA", fam: "VLA", setting: "Seen", x: 0.2883, y: 0.2745, subx: 0.5971, q: 5.75 },
      { model: "OpenVLA", fam: "VLA", setting: "ZS", x: 0.0550, y: 0.0000, subx: 0.2035, q: 1.58 },
      { model: "RDT-1B", fam: "VLA", setting: "P+FT", x: 0.2117, y: 0.0769, subx: 0.4340, q: 4.54 },
      { model: "RDT-1B", fam: "VLA", setting: "Scr", x: 0.3500, y: 0.0000, subx: 0.5462, q: 2.95 },
      { model: "RDT-1B", fam: "VLA", setting: "Seen", x: 0.4283, y: 0.1200, subx: 0.7237, q: 4.50 },
      { model: "RDT-1B", fam: "VLA", setting: "ZS", x: 0.0717, y: 0.0000, subx: 0.1876, q: 2.23 },
      { model: "UniSkill", fam: "Skill", setting: "P+FT", x: 0.5883, y: 0.5606, subx: 0.7633, q: 7.14 },
      { model: "UniSkill", fam: "Skill", setting: "Scr", x: 0.3367, y: 0.1765, subx: 0.5297, q: 5.00 },
      { model: "UniSkill", fam: "Skill", setting: "Seen", x: 0.7467, y: 0.8519, subx: 0.8915, q: 8.54 },
      { model: "UniSkill", fam: "Skill", setting: "ZS", x: 0.0733, y: 0.0000, subx: 0.1733, q: 0.88 },
      { model: "VQ-BeT/DINOv2", fam: "VideoVA", setting: "P+FT", x: 0.2283, y: 0.2500, subx: 0.4278, q: 4.92 },
      { model: "VQ-BeT/DINOv2", fam: "VideoVA", setting: "Scr", x: 0.4367, y: 0.5556, subx: 0.6023, q: 6.33 },
      { model: "VQ-BeT/DINOv2", fam: "VideoVA", setting: "Seen", x: 0.5183, y: 0.4500, subx: 0.7570, q: 6.83 },
      { model: "VQ-BeT/DINOv2", fam: "VideoVA", setting: "ZS", x: 0.1267, y: 0.0714, subx: 0.2682, q: 2.29 },
      { model: "VQ-BeT/SigLIP2", fam: "VideoVA", setting: "P+FT", x: 0.1717, y: 0.1803, subx: 0.3436, q: 4.39 },
      { model: "VQ-BeT/SigLIP2", fam: "VideoVA", setting: "Scr", x: 0.4217, y: 0.3125, subx: 0.5942, q: 6.31 },
      { model: "VQ-BeT/SigLIP2", fam: "VideoVA", setting: "Seen", x: 0.5750, y: 0.6111, subx: 0.7797, q: 7.24 },
      { model: "VQ-BeT/SigLIP2", fam: "VideoVA", setting: "ZS", x: 0.0800, y: 0.0000, subx: 0.2300, q: 1.75 },
      { model: "VQ-BeT/VideoMAE", fam: "VideoVA", setting: "P+FT", x: 0.1483, y: 0.1930, subx: 0.3250, q: 4.42 },
      { model: "VQ-BeT/VideoMAE", fam: "VideoVA", setting: "Scr", x: 0.2733, y: 0.1579, subx: 0.4825, q: 4.74 },
      { model: "VQ-BeT/VideoMAE", fam: "VideoVA", setting: "Seen", x: 0.2967, y: 0.3448, subx: 0.5104, q: 5.69 },
      { model: "VQ-BeT/VideoMAE", fam: "VideoVA", setting: "ZS", x: 0.0750, y: 0.0000, subx: 0.2138, q: 1.50 },
      { model: "XSkill", fam: "Skill", setting: "P+FT", x: 0.7267, y: 0.7083, subx: 0.8226, q: 7.67 },
      { model: "XSkill", fam: "Skill", setting: "Scr", x: 0.4200, y: 0.2727, subx: 0.5881, q: 5.18 },
      { model: "XSkill", fam: "Skill", setting: "Seen", x: 0.7917, y: 0.8387, subx: 0.9133, q: 8.08 },
      { model: "XSkill", fam: "Skill", setting: "ZS", x: 0.0950, y: 0.0833, subx: 0.2542, q: 3.33 }
    ],
    // Panel (b) of fig_validity() — Arena SR_human / Qbar, Seen regime, by
    // level — verified exact. Paired with figC5.simSeenAll / simSeenSubAll
    // (both now verified) to draw the actual four-line panel (b): SR /
    // SR_human on the left axis, Sub-SR×10 / Qbar on the right axis.
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
    { id: "L2", name: "Visual generalization", blurb: "A different instance of the same category — new look, new geometry, same role." },
    { id: "L3", name: "Intent-level transfer",     blurb: "The object is replaced by one with different semantics. Teapot → tap, for the same goal." }
  ];

  return {
    FAMILY: FAMILY, sim: sim, real: real, perLevel: perLevel, perLevelZS: perLevelZS, perLevelScr: perLevelScr, levelMeta: levelMeta,
    figC1: figC1, figC2: figC2, figC3: figC3, figC4: figC4, figC5: figC5, figC7: figC7, figC8: figC8,
    famColor: function (f) { return (FAMILY[f] || {}).color || "var(--fig-grey)"; },
    famShort: function (f) { return (FAMILY[f] || {}).short || f; }
  };
})();
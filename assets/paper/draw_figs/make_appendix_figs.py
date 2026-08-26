#!/usr/bin/env python3
"""
make_appendix_figs.py -- regenerate the Appendix C figure set of *The Imitator Game*.

    python make_appendix_figs.py --uploads /path/to/raw --out figures/

Produces (one figure per appendix subsection, aligned to Q1/Q2/Q3):

  Q1  figC1_paradigm.pdf        which imitation interface is strongest
      figC2_encoder.pdf         video-encoder ablation (sim + real)
  Q2  figC3_scaling.pdf         P+FT scaling with corpus size
      figC4_level_scale.pdf     scaling resolved by hierarchy level
  Q3  figC5_perlevel.pdf        where the hierarchy becomes hard (real vs sim)
      figC6_demoswap.pdf        is the demonstration actually used
  --  figC7_validity.pdf        automated vs human, simulation vs real
      figC8_pertask.pdf         per-task / per-level diagnostics
"""
import argparse, os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Patch
from scipy.stats import pearsonr, spearmanr

from ig_common import (set_style, ygrid, panel_tag, load_all, dino_only,
                       C_FAMILY, C_MODEL, C_LEVEL, C_ENCODER, C_SETTING,
                       C_GREY, C_LIGHT, MARKER_FAMILY, LEVELS, SCALES,
                       PRETTY_POLICY,
                       sc, lw, ms, sz, hl, hl_from_ms)   # 按图/子图缩放：sc=倍数, lw=线宽,
                                             # ms=折线节点, sz=散点节点, hl(_from_ms)=图例线段长度

PI = PRETTY_POLICY["pi"]
REPS = [PI, "XSkill", "ACT/DINOv2", "DP/DINOv2"]


def scr_table1_basis(sim):
    """Simulation \textsc{scratch} aggregated exactly as Table 1 does.

    Table 1's Scr. column comes from ``all_summary.json``  ->  ``unseen_scratch_flat``,
    which for each (task, level) cell takes the MINIMUM over the from-scratch runs that
    exist for that variant, then averages the 20 cells.  Variants with a single
    from-scratch run are unaffected.  Verified to reproduce all 150 cells of that file
    exactly (SR and Sub-SR, overall and by level).
    """
    s = sim[sim.setting == "Scr"]
    per_cell = s.groupby(["variant", "task", "level", "num_tasks"])["SR"].mean()
    flat = per_cell.groupby(["variant", "task", "level"]).min()
    return flat.groupby("variant").mean()


# ======================================================================================
# Q1-a : figC1 -- which imitation interface is strongest
# ======================================================================================
def fig_paradigm(sim, arena, out):
    seen = sim[sim.setting == "Seen"].groupby(["variant", "family"])["SR"].mean()
    pft = sim[sim.setting == "P+FT"].groupby(["variant", "family"])["SR"].mean()
    tab = pd.concat([seen.rename("seen"), pft.rename("pft")], axis=1).reset_index()

    fig, axes = plt.subplots(1, 3, figsize=(15.7, 5.1), constrained_layout=True)

    # (a) seen-SR vs P+FT-SR plane -----------------------------------------------------
    ax = axes[0]
    for fam, g in tab.groupby("family"):
        ax.scatter(g.seen, g.pft, s=sz("paradigm_a", 46), c=C_FAMILY[fam], marker=MARKER_FAMILY[fam],
                   edgecolor="white", linewidth=0.6, label=fam, zorder=3)
    NUDGE = {"OpenVLA": (-10, -15), "RDT-1B": (7, 8), "VQ-BeT/SigLIP": (3, -15),
             "VQ-BeT/DINOv2": (7, 7), "VQ-BeT/VMAE": (-13, -15), "ACT/VMAE": (-48, -3),
             r"$\pi_{0.5}$": (-6, 11), "DP/DINOv2": (5, -13), "DP/SigLIP": (-48, -5), "RDT-1B": (3, 8)}
    for _, r in tab.iterrows():
        lab = r.variant.replace("VideoMAE", "VMAE").replace("SigLIP2", "SigLIP")
        ax.annotate(lab, (r.seen, r.pft), textcoords="offset points",
                    xytext=NUDGE.get(lab, (7, 7)), fontsize=10.1, color="#444444", fontweight="bold")
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    ax.set_xlabel("seen-task SR (automated)")
    ax.set_ylabel("unseen P+FT SR (automated)")
    ax.set_title("Simulation: seen imitation vs. fast adaptation", pad=6)
    ax.legend(loc="upper left", handletextpad=0.4, borderpad=0.2)
    ygrid(ax, "both"); panel_tag(ax, "(a)")

    # (b) within-family spread ---------------------------------------------------------
    ax = axes[1]
    fams = ["VLA", "Video-Skill", "Video-VA"]
    data = [tab.loc[tab.family == f, "seen"].values for f in fams]
    bp = ax.boxplot(data, positions=range(3), widths=0.5, patch_artist=True,
                    medianprops=dict(color="black", lw=1.4),
                    whiskerprops=dict(color=C_GREY), capprops=dict(color=C_GREY),
                    flierprops=dict(marker=""), zorder=2)
    for patch, f in zip(bp["boxes"], fams):
        patch.set(facecolor=C_FAMILY[f], alpha=0.28, edgecolor=C_FAMILY[f], lw=1.1)
    rng = np.random.default_rng(0)
    for i, (f, d) in enumerate(zip(fams, data)):
        ax.scatter(i + rng.uniform(-0.13, 0.13, len(d)), d, s=sz("paradigm_b", 22), c=C_FAMILY[f],
                   edgecolor="white", linewidth=0.5, zorder=3)
        ax.text(i + 0.30, np.mean(d), f"{np.mean(d):.2f}", fontsize=12,
                va="center", color=C_FAMILY[f], fontweight="bold")
    ax.set_xticks(range(3)); ax.set_xticklabels(fams)
    ax.set_ylim(0, 1); ax.set_ylabel("seen-task SR (automated)")
    ax.set_title("Within-paradigm spread (simulation, automated)", pad=6)
    ygrid(ax); panel_tag(ax, "(b)")

    # (c) Arena win rate ---------------------------------------------------------------
    ax = axes[2]
    wr = (arena.groupby(["variant", "family"])
          .agg(WR=("win", "mean"), Q=("Q", "mean"), n=("win", "size"))
          .reset_index().sort_values("WR"))
    ypos = np.arange(len(wr))
    ax.barh(ypos, wr.WR, color=[C_FAMILY[f] for f in wr.family], height=0.68,
            edgecolor="white", linewidth=0.5)
    ax.axvline(0.5, color=C_GREY, lw=0.9, ls=(0, (3, 3)))
    ax.set_yticks(ypos)
    ax.set_yticklabels([v.replace("VideoMAE", "VMAE").replace("SigLIP2", "SigLIP")
                        for v in wr.variant], fontsize=11.3)
    ax.set_xlim(0, 1.16); ax.set_xticks(np.arange(0, 1.01, 0.2))
    ax.set_xlabel("WR = win rate (Arena, blind A/B)")
    ax.set_title(r"Simulation Arena: WR (bars) and $\overline{Q}$ (labels)", pad=6)
    # Bars are WR.  The text next to each bar reports BOTH numbers explicitly so the
    # panel cannot be misread as plotting Q.
    for y, w_, q in zip(ypos, wr.WR, wr.Q):
        ax.text(w_ + 0.015, y, f"WR={w_:.2f}   $\\overline{{Q}}$={q:.1f}", va="center",
                fontsize=9.4, color="#333333")
    ygrid(ax, "x"); panel_tag(ax, "(c)", dx=-0.42)

    fig.savefig(os.path.join(out, "figC1_paradigm.pdf"))
    fig.savefig(os.path.join(out, "figC1_paradigm.png"))
    plt.close(fig)
    print("  seen-SR by family:", tab.groupby('family').seen.mean().round(3).to_dict())
    print("  arena WR by family:", arena.groupby('family').win.mean().round(3).to_dict())


# ======================================================================================
# Q1-b : figC2 -- the video-encoder ablation (promised in the appendix intro)
# ======================================================================================
def fig_encoder(sim, real, out):
    va = sim[sim.family == "Video-VA"]
    heads = ["ACT", "DP", "VQ-BeT"]
    encs = ["DINOv2", "SigLIP2", "VideoMAE"]

    fig, axes = plt.subplots(1, 3, figsize=(15.7, 4.8), constrained_layout=True,
                             gridspec_kw=dict(width_ratios=[1.0, 1.0, 1.0]))

    def grouped(ax, piv, title, ylab="SR (automated)"):
        x = np.arange(len(heads)); w = 0.25
        for k, e in enumerate(encs):
            v = [piv.loc[h, e] for h in heads]
            b = ax.bar(x + (k - 1) * w, v, w, color=C_ENCODER[e], label=e,
                       edgecolor="white", linewidth=0.6)
            ax.bar_label(b, fmt="%.2f", fontsize=10.5, padding=1.5)
        ax.set_xticks(x); ax.set_xticklabels(heads)
        ax.set_ylim(0, 1.0); ax.set_ylabel(ylab); ax.set_title(title, pad=6)
        ygrid(ax)

    piv_seen = va[va.setting == "Seen"].pivot_table(index="policy", columns="encoder", values="SR")
    piv_seen.index = ["ACT", "DP", "VQ-BeT"]
    piv_pft = va[va.setting == "P+FT"].pivot_table(index="policy", columns="encoder", values="SR")
    piv_pft.index = ["ACT", "DP", "VQ-BeT"]

    grouped(axes[0], piv_seen, "Simulation, seen tasks (automated)")
    axes[0].legend(loc="upper center", ncols=3, handlelength=1.0, borderpad=0.2,
                   columnspacing=0.8, handletextpad=0.4, bbox_to_anchor=(0.45, 1.0))
    panel_tag(axes[0], "(a)")

    grouped(axes[1], piv_pft, "Simulation, unseen P+FT (automated)")
    panel_tag(axes[1], "(b)")

    # Real-world ACT encoder ablation, averaged over the pre-training scales that each
    # encoder was actually run at: DINOv2 over {15,30,45}, SigLIP2 and VideoMAE at 45 only
    # (they were never run at 15 or 30).  The bar labels below carry the scale so the
    # reader can see that this is an average over different numbers of checkpoints.
    ax = axes[2]
    order = ["Seen", "ZS", "Scr", "P+FT"]

    # 45-task checkpoint only: the one scale DINOv2, SigLIP2, and VideoMAE were all run
    # at for ACT, so the three encoders are compared on matched data (Scr has no scale
    # label to begin with, so it is kept as-is).
    a = real[real.policy == "act"]
    a45 = a[(a.scale == 45) | (a.setting == "Scr")]
    act_tab = pd.DataFrame({e: [a45[(a45.setting == s) & (a45.encoder == e)]["SR"].mean()
                                for s in order] for e in encs}, index=order)

    x = np.arange(len(order)); w = 0.25
    for k, e in enumerate(encs):
        b = ax.bar(x + (k - 1) * w, act_tab[e].values, w, color=C_ENCODER[e],
                   edgecolor="white", linewidth=0.6, label=e)
        ax.bar_label(b, fmt="%.2f", fontsize=10.1, padding=1.5)
    ax.set_xticks(x); ax.set_xticklabels(order)
    ax.set_ylim(0, 0.75); ax.set_ylabel("SR (Arena)")
    ax.set_title("Real world, ACT, 45-task pre-training (Arena)", pad=6)
    ygrid(ax); panel_tag(ax, "(c)")

    fig.savefig(os.path.join(out, "figC2_encoder.pdf"))
    fig.savefig(os.path.join(out, "figC2_encoder.png"))
    plt.close(fig)
    print("  sim seen encoder x head:\n", piv_seen.round(3))
    print("  real ACT ablation (avg over available scales):\n", act_tab.round(3))


# ======================================================================================
# Q2-a : figC3 -- P+FT scaling
# ======================================================================================
def fig_scaling(sim, real, out):
    rd = dino_only(real)
    fig, axes = plt.subplots(1, 3, figsize=(18.1, 5.7), constrained_layout=True,
                             gridspec_kw=dict(width_ratios=[1.0, 1.35, 1.0]))

    # (a) family-level scaling curves ---------------------------------------------------
    ax = axes[0]
    for fam, g in sim[sim.setting == "P+FT"].groupby("family"):
        m = g.groupby("num_tasks")["SR"].mean()
        ax.plot(SCALES, m.reindex(SCALES), "-o", color=C_FAMILY[fam], label=fam,
                lw=lw("scaling_a", 1.6), ms=ms("scaling_a", 5))
    for fam, g in rd[rd.setting == "P+FT"].groupby("family"):
        m = g.groupby("scale")["SR"].mean()
        ax.plot(SCALES, m.reindex(SCALES), "--s", color=C_FAMILY[fam], mfc="white",
                lw=lw("scaling_a", 1.6), ms=ms("scaling_a", 4.5))
    # Scr (scratch) baselines: one line per domain, averaged over all models in that
    # domain -- not broken out per family/model.
    # Simulation scratch baseline on the SAME basis as Table 1 (see scr_table1_basis).
    scr_sim = scr_table1_basis(sim).mean()
    scr_real = rd[rd.setting == "Scr"]["SR"].mean()
    ax.axhline(scr_sim, color=C_GREY, ls="-", alpha=0.85, zorder=0, ms=ms("scaling_a", 5))
    ax.axhline(scr_real, color=C_GREY, ls="--", alpha=0.85, zorder=0, ms=ms("scaling_a", 5))
    ax.set_xticks(SCALES); ax.set_xlim(12, 48); ax.set_ylim(0, 1.0)
    ax.set_xlabel("Pre-training tasks")
    ax.set_ylabel("unseen P+FT SR   (sim: automated / real: Arena)")
    ax.set_title("Adaptation improves with paired corpus size", pad=6)
    h = [Line2D([], [], color=C_FAMILY[f], marker="o", label=f, ms=ms("scaling_a", 5)) for f in C_FAMILY]
    h += [Line2D([], [], color=C_GREY, ls="-", marker="o", label="simulation",
                 ms=ms("scaling_a", 5)),
          Line2D([], [], color=C_GREY, ls="--", marker="s", mfc="white", label="real world",
                 ms=ms("scaling_a", 4.5)),
          Line2D([], [], color=C_GREY, ls="-", label="Scr mean (sim)", ms=ms("scaling_a", 5)),
          Line2D([], [], color=C_GREY, ls=(0, (1, 1)), label="Scr mean (real)", ms=ms("scaling_a", 4.5))]
    ax.legend(handles=h, loc="lower right", ncols=2, handlelength=hl("scaling_a", 5),
              columnspacing=1.0, borderpad=0.2, fontsize=10.9)
    ygrid(ax); panel_tag(ax, "(a)")

    # (b) per-model delta ---------------------------------------------------------------
    ax = axes[1]
    rows = []
    for v, g in sim[sim.setting == "P+FT"].groupby("variant"):
        m = g.groupby("num_tasks")["SR"].mean()
        rows.append(dict(name=v, d=m.get(45, np.nan) - m.get(15, np.nan),
                         fam=g.family.iloc[0], dom="sim"))
    for v, g in rd[rd.setting == "P+FT"].groupby("variant"):
        m = g.groupby("scale")["SR"].mean()
        rows.append(dict(name=f"{v} (real)", d=m.get(45, np.nan) - m.get(15, np.nan),
                         fam=g.family.iloc[0], dom="real"))
    d = pd.DataFrame(rows).sort_values("d")
    y = np.arange(len(d))
    ax.barh(y, d.d, height=0.7, color=[C_FAMILY[f] for f in d.fam],
            hatch=["///" if x == "real" else "" for x in d.dom],
            edgecolor="white", linewidth=0.7)
    ax.axvline(0, color="black", lw=0.9)
    ax.set_yticks(y); ax.set_yticklabels(d.name, fontsize=11.5)
    ax.set_xlabel(r"$\Delta$SR  (45-task P+FT $-$ 15-task P+FT)" + "\nsim: automated   |   real: Arena")
    ax.set_title("Per-model gain from a 3$\\times$ larger corpus", pad=6)
    for yy, val in zip(y, d.d):
        ax.text(val + (0.006 if val >= 0 else -0.006), yy, f"{val:+.2f}",
                va="center", ha="left" if val >= 0 else "right", fontsize=11)
    ax.set_xlim(min(-0.14, d.d.min() - 0.05), d.d.max() + 0.06)
    ax.legend(handles=[Patch(facecolor=C_GREY, label="simulation (automated)"),
                       Patch(facecolor=C_GREY, hatch="///", label="real world (Arena)")],
              loc="lower right", borderpad=0.2)
    ygrid(ax, "x"); panel_tag(ax, "(b)", dx=-0.30)

    # (c) the zero-shot floor is paradigm-specific ---------------------------------------
    ax = axes[2]
    for v in REPS:
        g = rd[(rd.setting == "ZS") & (rd.variant == v)].groupby("scale")["SR"].mean()
        ax.plot(SCALES, g.reindex(SCALES).values, "-o", color=C_MODEL[v], label=v,
                lw=lw("scaling_c", 1.6), ms=ms("scaling_c", 4.5))
    ax.set_xticks(SCALES); ax.set_xlim(12, 48); ax.set_ylim(0, 0.42)
    ax.set_xlabel("Pre-training tasks"); ax.set_ylabel("zero-shot SR (real world, Arena)")
    ax.set_title("Zero-shot: video scales, caption does not", pad=6)
    ax.annotate(r"$\pi_{0.5}$"+" pinned to the floor", xy=(45, 0.045),
                xytext=(28, 0.135), fontsize=16.8, color=C_MODEL[PI], ha="center",
                arrowprops=dict(arrowstyle="->", color=C_MODEL[PI], lw=0.9))
    ax.legend(loc="upper left", fontsize=11.3, handlelength=hl("scaling_c", 4.5), borderpad=0.2)
    ygrid(ax); panel_tag(ax, "(c)", dx=-0.26)

    fig.savefig(os.path.join(out, "figC3_scaling.pdf"))
    fig.savefig(os.path.join(out, "figC3_scaling.png"))
    plt.close(fig)
    print("  positive delta:", int((d.d > 0).sum()), "/", len(d))
    print(f"  Scr mean: sim={scr_sim:.3f}  real={scr_real:.3f}")


# ======================================================================================
# Q2-b : figC4 -- scaling resolved by hierarchy level
# ======================================================================================
def fig_level_scale(sim, real, out):
    rd = dino_only(real)
    cells = [("Simulation, zero-shot (automated)", sim[sim.setting == "ZS"], "num_tasks", (0, 0.32)),
             ("Simulation, P+FT (automated)", sim[sim.setting == "P+FT"], "num_tasks", (0, 0.75)),
             ("Real world, zero-shot (Arena)", rd[rd.setting == "ZS"], "scale", (0, 0.32)),
             ("Real world, P+FT (Arena)", rd[rd.setting == "P+FT"], "scale", (0, 0.75))]

    fig, axes = plt.subplots(1, 4, figsize=(15.7, 4.2), constrained_layout=True)
    # 四个子图各自的缩放 key：(a) sim ZS, (b) sim P+FT, (c) real ZS, (d) real P+FT
    panel_keys = ["level_scale_a", "level_scale_b", "level_scale_c", "level_scale_d"]
    for ax, (title, df, xcol, ylim), key in zip(axes, cells, panel_keys):
        for lv in LEVELS:
            m = df[df.level == lv].groupby(xcol)["SR"].mean().reindex(SCALES)
            ax.plot(SCALES, m.values, "-o", color=C_LEVEL[lv], label=lv,
                    lw=lw(key, 1.6), ms=ms(key, 4.5))
        ax.set_xticks(SCALES); ax.set_xlim(12, 48); ax.set_ylim(*ylim)
        ax.set_title(title, pad=10)
        ax.set_xlabel("Pre-training tasks")
        ygrid(ax)
    axes[0].set_ylabel("SR (automated)")
    axes[2].set_ylabel("SR (Arena)")
    # 底部共享图例的 swatch 大小取四个子图 key 的平均缩放倍数（图例本身不属于单一子图）；
    # 线段长度用 hl_from_ms 从这个平均 marker 尺寸反推，避免像直接乘倍数那样越放越长
    _avg_scale = sum(sc(k) for k in panel_keys) / len(panel_keys)
    _legend_ms = 4.5 * _avg_scale
    _legend_hl = hl_from_ms(_legend_ms)
    handles = [Line2D([], [], color=C_LEVEL[lv], marker="o", ms=_legend_ms, label=lv) for lv in LEVELS]
    # extra vertical clearance between the panels and the L0-L3 legend strip below them
    fig.legend(handles=handles, ncols=4, loc="lower center", columnspacing=1.6,
               handlelength=_legend_hl, handletextpad=0.4, bbox_to_anchor=(0.5, -0.17))
    fig.get_layout_engine().set(h_pad=0.06, hspace=0.02)
    for ax, t in zip(axes, ["(a)", "(b)", "(c)", "(d)"]):
        panel_tag(ax, t, dx=-0.22)
    # mark the floor in simulation zero-shot
    axes[0].axhspan(0, 0.16, color=C_GREY, alpha=0.10, zorder=0)
    axes[0].text(30, 0.295, "at floor: no interpretable trend", ha="center",
                 fontsize=13.8, color=C_GREY, style="italic")
    fig.savefig(os.path.join(out, "figC4_level_scale.pdf"))
    fig.savefig(os.path.join(out, "figC4_level_scale.png"))
    plt.close(fig)


# ======================================================================================
# Q3-a : figC5 -- where the hierarchy becomes hard
# ======================================================================================
def fig_perlevel(sim, real, arena, out):
    # NOTE: the third panel of the old 3-panel figure (automated vs. human on the
    # identical simulation rollouts, per level) now lives in fig_validity() as panel
    # (b), next to the automated-vs-Arena scatter it supports. This figure keeps the
    # panels that are genuinely about *where the hierarchy is hard*, laid out as a
    # single row: real world (Seen, P+FT) then simulation (Seen, P+FT).
    rd = dino_only(real)
    fig, axes = plt.subplots(1, 4, figsize=(21.6, 4.9), constrained_layout=True)
    x = np.arange(4)

    def real_panel(ax, setting, key, sr_ylim, title, tag):
        for v in REPS:
            g = rd[(rd.setting == setting) & (rd.variant == v)].groupby("level")["SR"].mean()
            ax.plot(x, g.reindex(LEVELS).values, "-o", color=C_MODEL[v], label=v,
                    lw=lw(key, 1.6), ms=ms(key, 4.5))
        avg = rd[rd.setting == setting].groupby("level")["SR"].mean().reindex(LEVELS)
        ax.fill_between([2.5, 3.5], 0, 1, color=C_LEVEL["L3"], alpha=0.10, zorder=0)
        ax.set_xticks(x); ax.set_xticklabels(LEVELS); ax.set_xlim(-0.3, 3.3); ax.set_ylim(*sr_ylim)
        ax.set_ylabel("SR (Arena)", color="#4C72B0"); ax.tick_params(axis="y", colors="#4C72B0")
        ax.set_title(title, pad=6)

        q_avg = rd[rd.setting == setting].groupby("level")["Q"].mean().reindex(LEVELS)
        ax2 = ax.twinx()
        for v in REPS:
            g = rd[(rd.setting == setting) & (rd.variant == v)].groupby("level")["Q"].mean()
            ax2.plot(x, g.reindex(LEVELS).values, "--v", color=C_MODEL[v], mfc="white",
                     lw=lw(key, 1.6), ms=ms(key, 4.2), alpha=0.9)
        # Twin-axis convention kept from the original Figure 8: SR spans 0.2-0.8 on the left
        # and Qbar spans 5-8 on the right, i.e. the two axes are locked by Qbar = 5*SR + 4.
        # A dashed curve lying on top of its solid partner therefore means exactly that
        # relation holds; the near-overlap is a real property of the data, not a coincidence
        # of the axis limits.
        ax2.set_ylim(5.0, 8.0); ax2.set_ylabel(r"$\overline{Q}$ (Arena)")
        ax2.spines["right"].set_visible(True)
        h_model = [Line2D([], [], color=C_MODEL[v], marker="o", label=v, ms=ms(key, 4.5)) for v in REPS]
        h_style = [Line2D([], [], color=C_GREY, ls="-", marker="o", label="SR (Arena)",
                          ms=ms(key, 4.5)),
                  Line2D([], [], color=C_GREY, ls="--", marker="v", mfc="white",
                         label=r"$\overline{Q}$ (Arena)", ms=ms(key, 4.2))]
        ax.legend(handles=h_model + h_style, loc="lower left", ncols=2, fontsize=8.3,
                  handlelength=hl(key, 4.5), columnspacing=0.4, borderpad=0.2)
        ygrid(ax); panel_tag(ax, tag)
        return avg, q_avg

    def sim_panel(ax, setting, key, sr_ylim, title, tag):
        for fam in C_FAMILY:
            g = sim[(sim.setting == setting) & (sim.family == fam)].groupby("level")["SR"].mean()
            ax.plot(x, g.reindex(LEVELS).values, "-o", color=C_FAMILY[fam], label=fam,
                    lw=lw(key, 1.6), ms=ms(key, 4.5))
        allm = sim[sim.setting == setting].groupby("level")["SR"].mean().reindex(LEVELS)
        ax.fill_between([2.5, 3.5], 0, 1, color=C_LEVEL["L3"], alpha=0.10, zorder=0)
        ax.set_xticks(x); ax.set_xticklabels(LEVELS); ax.set_xlim(-0.3, 3.3); ax.set_ylim(*sr_ylim)
        ax.set_ylabel("SR (automated)", color="#4C72B0"); ax.tick_params(axis="y", colors="#4C72B0")
        ax.set_title(title, pad=6)

        subsr_avg = sim[sim.setting == setting].groupby("level")["SubSR"].mean().reindex(LEVELS)
        ax2 = ax.twinx()
        for fam in C_FAMILY:
            g = sim[(sim.setting == setting) & (sim.family == fam)].groupby("level")["SubSR"].mean()
            ax2.plot(x, g.reindex(LEVELS).values * 10, "--v", color=C_FAMILY[fam], mfc="white",
                     lw=lw(key, 1.6), ms=ms(key, 4.2), alpha=0.9)
        ax2.set_ylim(4, 10); ax2.set_ylabel(r"Sub-SR $\times$10 (automated)")
        ax2.spines["right"].set_visible(True)
        h_fam = [Line2D([], [], color=C_FAMILY[f], marker="o", label=f, ms=ms(key, 4.5)) for f in C_FAMILY]
        h_style = [Line2D([], [], color=C_GREY, ls="-", marker="o", label="SR (automated)",
                          ms=ms(key, 4.5)),
                  Line2D([], [], color=C_GREY, ls="--", marker="v", mfc="white",
                         label="Sub-SR"+r"$\times$10 (automated)", ms=ms(key, 4.2))]
        ax.legend(handles=h_fam + h_style, loc="lower left", ncols=2, fontsize=8.3,
                  handlelength=hl(key, 4.5), columnspacing=0.4, borderpad=0.2)
        ygrid(ax); panel_tag(ax, tag)
        return allm, subsr_avg

    # (a) real world, seen tasks, per model ------------------------------------------------
    avg_seen, q_seen = real_panel(axes[0], "Seen", "perlevel_a", (0.2, 0.8),
                                  "Real world, seen tasks (Arena)", "(a)")

    # (b) real world, P+FT, per model -- main-body result -----------------------------------
    avg_pft, q_pft = real_panel(axes[1], "P+FT", "perlevel_b", (0.2, 0.8),
                                "Real world, P+FT (Arena)", "(b)")

    # (c) simulation, seen tasks, per paradigm -----------------------------------------------
    allm_seen, subsr_seen = sim_panel(axes[2], "Seen", "perlevel_c", (0.25, 1.0),
                                      "Simulation, seen tasks (automated)", "(c)")

    # (d) simulation, unseen tasks P+FT, per paradigm ----------------------------------------
    allm_pft, subsr_pft = sim_panel(axes[3], "P+FT", "perlevel_d", (0.2, 0.85),
                                    "Simulation, unseen tasks, P+FT (automated)", "(d)")

    fig.savefig(os.path.join(out, "figC5_perlevel.pdf"))
    fig.savefig(os.path.join(out, "figC5_perlevel.png"))
    plt.close(fig)
    print("  real seen per level :", avg_seen.round(3).to_dict(), " Q:", q_seen.round(2).to_dict())
    print("  real P+FT per level :", avg_pft.round(3).to_dict(), " Q:", q_pft.round(2).to_dict())
    print("  sim seen per level  :", allm_seen.round(3).to_dict(), " SubSR:", subsr_seen.round(3).to_dict())
    print("  sim P+FT per level  :", allm_pft.round(3).to_dict(), " SubSR:", subsr_pft.round(3).to_dict())


# ======================================================================================
# Q3-b : figC6 -- demonstration-swap sanity check
# ======================================================================================
DEMO_SWAP = {   # Appendix Table 12, simulation, seen tasks, 45-task checkpoints
    "ACT/DINOv2": dict(original=[0.87, 0.77, 0.72, 0.88],
                       similar=[0.32, 0.29, 0.32, 0.32],
                       unrelated=[0.34, 0.28, 0.39, 0.19]),
    "DP/DINOv2":  dict(original=[0.72, 0.66, 0.59, 0.71],
                       similar=[0.02, 0.05, 0.01, 0.04],
                       unrelated=[0.00, 0.00, 0.00, 0.00]),
    PI:           dict(original=[0.85, 0.67, 0.70, 0.69],
                       similar=[0.09, 0.18, 0.09, 0.23],
                       unrelated=[0.01, 0.00, 0.00, 0.02]),
    "XSkill":     dict(original=[0.87, 0.85, 0.77, 0.68],
                       similar=[0.47, 0.41, 0.05, 0.29],
                       unrelated=[0.39, 0.23, 0.03, 0.27]),
}


def fig_demoswap(out):
    order = [PI, "XSkill", "ACT/DINOv2", "DP/DINOv2"]
    fig, axes = plt.subplots(1, 2, figsize=(14.0, 4.9),
                             gridspec_kw=dict(width_ratios=[1.15, 1.0]))

    # (a) per level, per model ----------------------------------------------------------
    ax = axes[0]
    regimes = ["original", "similar", "unrelated"]
    styles = {"original": dict(ls="-", marker="o", alpha=1.0),
              "similar": dict(ls="--", marker="s", alpha=0.9),
              "unrelated": dict(ls=":", marker="v", alpha=0.9)}
    x = np.arange(4)
    for m in order:
        for reg in regimes:
            ax.plot(x, DEMO_SWAP[m][reg], color=C_MODEL[m],
                    lw=lw("demoswap_a", 1.6), ms=ms("demoswap_a", 4),
                    mfc="white" if reg != "original" else C_MODEL[m], **styles[reg])
    ax.axhspan(0.55, 1.0, color=C_FAMILY["Video-Skill"], alpha=0.06, zorder=0)
    ax.axhspan(-0.03, 0.50, color=C_GREY, alpha=0.06, zorder=0)
    ax.set_xticks(x); ax.set_xticklabels(LEVELS); ax.set_xlim(-0.25, 3.25); ax.set_ylim(-0.03, 1.0)
    ax.text(3.18, 0.94, "correct demonstration", ha="right", fontsize=10.8, color="#8A6A4F")
    ax.text(3.18, 0.46, "wrong demonstration", ha="right", fontsize=10.8, color=C_GREY)
    ax.set_ylabel("SR"); ax.set_title("Conditioning video swapped at inference", pad=6)
    h1 = [Line2D([], [], color=C_MODEL[m], label=m) for m in order]
    h2 = [Line2D([], [], color=C_GREY, label=r, ms=ms("demoswap_a", 4), **styles[r]) for r in regimes]
    fig.legend(handles=h1 + h2, ncols=7, loc="lower center", fontsize=11.5,
               handlelength=hl("demoswap_a", 4), columnspacing=1.2, bbox_to_anchor=(0.5, -0.07))
    ygrid(ax); panel_tag(ax, "(a)")

    # (b) retained fraction --------------------------------------------------------------
    ax = axes[1]
    xs = np.arange(len(order)); w = 0.38
    for k, reg in enumerate(["similar", "unrelated"]):
        vals = [np.mean(DEMO_SWAP[m][reg]) / np.mean(DEMO_SWAP[m]["original"]) for m in order]
        b = ax.bar(xs + (k - 0.5) * w, vals, w,
                   color=[C_MODEL[m] for m in order],
                   alpha=1.0 if reg == "similar" else 0.5,
                   hatch="" if reg == "similar" else "///",
                   edgecolor="white", linewidth=0.7)
        ax.bar_label(b, fmt="%.2f", fontsize=11, padding=1.5)
    ax.set_xticks(xs); ax.set_xticklabels(order, fontsize=12)
    ax.set_ylim(0, 0.55); ax.set_ylabel("SR retained / original SR")
    ax.set_title("How much survives the wrong demonstration", pad=6)
    ax.legend(handles=[Patch(facecolor=C_GREY, label="similar task"),
                       Patch(facecolor=C_GREY, alpha=0.5, hatch="///", label="unrelated task")],
              loc="upper right", borderpad=0.2, fontsize=11.5)
    ygrid(ax); panel_tag(ax, "(b)")

    fig.tight_layout(w_pad=2.0)
    fig.savefig(os.path.join(out, "figC6_demoswap.pdf"))
    fig.savefig(os.path.join(out, "figC6_demoswap.png"))
    plt.close(fig)


# ======================================================================================
# figC7 -- metric / domain validity
# ======================================================================================
def fig_validity(sim, arena, out):
    # NOTE: panel (b) here is the per-level automated-vs-human comparison that used to be
    # figC5's panel (c) -- it belongs with the channel-agreement story more than with the
    # "where is the hierarchy hard" story. The old panel (b) of this figure (simulation
    # vs. real-world SR) has been dropped as a plot; the r=0.74 / r=0.36 numbers it
    # supported are still reported in the text and in appendix_C_numbers.csv.
    fig, axes = plt.subplots(1, 2, figsize=(13.0, 5.4), constrained_layout=True)

    # (a) automated vs human on identical simulation rollouts ----------------------------
    ax = axes[0]
    key = ["variant", "setting"]        # one cell per trained variant x transfer regime
    s = sim.groupby(key)[["SR", "SubSR"]].mean()
    a = arena.groupby(key)[["SR_human", "Q"]].mean()
    m = s.join(a, how="inner").dropna().reset_index()
    r1 = pearsonr(m.SR, m.SR_human)[0]
    r2 = pearsonr(m.SubSR, m.Q)[0]
    for st, g in m.groupby("setting"):
        ax.scatter(g.SR, g.SR_human, s=sz("validity_a", 26), c=C_SETTING[st], label=st,
                   edgecolor="white", linewidth=0.5, alpha=0.9)
    ax.plot([0, 1], [0, 1], ls=(0, (4, 3)), c=C_LIGHT, lw=1.2, zorder=0)
    ax.set_xlim(-0.02, 1); ax.set_ylim(-0.02, 1)
    ax.set_xlabel("SR (simulation, automated)")
    ax.set_ylabel(r"SR$_{\rm human}$ (simulation, Arena)")
    ax.set_title("Automated and Arena channels agree", pad=6)
    fine = (sim.groupby(key + ["level"])[["SR", "SubSR"]].mean()
            .join(arena.groupby(key + ["level"])[["SR_human", "Q"]].mean(), how="inner").dropna())
    r1f = pearsonr(fine.SR, fine.SR_human)[0]
    r2f = pearsonr(fine.SubSR, fine.Q)[0]
    ax.legend(loc="lower right", ncols=2, handletextpad=0.3, columnspacing=0.8, borderpad=0.2)
    ygrid(ax, "both"); panel_tag(ax, "(a)")

    # (b) automated vs human, per level, on the same rollouts (moved from figC5c) -------
    ax = axes[1]
    x = np.arange(4)
    a_seen = arena[arena.setting == "Seen"].groupby("level")[["SR_human", "Q"]].mean().reindex(LEVELS)
    s_seen = sim[sim.setting == "Seen"].groupby("level")[["SR", "SubSR"]].mean().reindex(LEVELS)
    ax.plot(x, s_seen.SR.values, "-o", color="#4C72B0", label="SR (automated)",
            lw=lw("validity_b", 1.6), ms=ms("validity_b", 4.5))
    ax.plot(x, a_seen.SR_human.values, "--s", color="#4C72B0", mfc="white",
            label=r"SR$_{\rm human}$ (Arena)", lw=lw("validity_b", 1.6), ms=ms("validity_b", 4.5))
    ax2 = ax.twinx()
    ax2.plot(x, s_seen.SubSR.values * 10, "-^", color="#DD8452",
             label=r"Sub-SR $\times$10 (automated)", lw=lw("validity_b", 1.6), ms=ms("validity_b", 4.5))
    ax2.plot(x, a_seen.Q.values, "--v", color="#DD8452", mfc="white",
             label=r"$\overline{Q}$ (Arena)", lw=lw("validity_b", 1.6), ms=ms("validity_b", 4.5))
    ax2.set_ylim(4, 10); ax2.set_ylabel("imitation score (Sub-SR / $\\overline{Q}$)", color="#DD8452")
    ax2.tick_params(axis="y", colors="#DD8452"); ax2.spines["right"].set_visible(True)
    ax2.spines["right"].set_color("#DD8452")
    ax.set_ylim(0.3, 0.85); ax.set_xticks(x); ax.set_xticklabels(LEVELS); ax.set_xlim(-0.3, 3.3)
    ax.set_ylabel("success rate (SR / SR$_{\\rm human}$)", color="#4C72B0"); ax.tick_params(axis="y", colors="#4C72B0")
    ax.fill_between([2.5, 3.5], 0, 1, color=C_LEVEL["L3"], alpha=0.10, zorder=0)
    ax.set_title("Simulation: same rollouts, both channels, by level", pad=6)
    hs = ax.get_legend_handles_labels()[0] + ax2.get_legend_handles_labels()[0]
    ls = ax.get_legend_handles_labels()[1] + ax2.get_legend_handles_labels()[1]
    ax.legend(hs, ls, loc="lower left", ncols=2, fontsize=10.8, handlelength=hl("validity_b", 4.5),
              columnspacing=0.8, borderpad=0.2)
    ygrid(ax); panel_tag(ax, "(b)")

    fig.savefig(os.path.join(out, "figC7_validity.pdf"))
    fig.savefig(os.path.join(out, "figC7_validity.png"))
    plt.close(fig)
    print(f"  r(SR,SRhuman)={r1:.3f}/{r1f:.3f}  r(SubSR,Q)={r2:.3f}/{r2f:.3f}")


# ======================================================================================
# figC8 -- per-task / per-level diagnostics
# ======================================================================================
SHORT = {"TwoRobotStirSpoon": "StirSpoon", "TwoRobotFoldTowel": "FoldTowel",
         "TwoRobotPlaceMugRack": "PlaceMugRack", "TwoRobotPlaceFileFolder": "PlaceFileFolder",
         "TwoRobotPlacePlateRack": "PlacePlateRack", "TwoRobotPickRemoteControl": "PickRemote",
         "TwoRobotScanMilkBox": "ScanMilkBox", "TwoRobotPourKettle": "PourKettle",
         "TwoRobotPickFood": "PickFood", "TwoRobotFoldBox": "FoldBox"}
SEEN_TASKS = ["TwoRobotStirSpoon", "TwoRobotFoldTowel", "TwoRobotPlaceMugRack",
              "TwoRobotPlaceFileFolder", "TwoRobotPlacePlateRack"]


def fig_pertask(sim, out):
    fig, axes = plt.subplots(1, 3, figsize=(15.7, 5.1), constrained_layout=True,
                             gridspec_kw=dict(width_ratios=[1.05, 1.05, 1.0]))

    def heat(ax, df, title):
        piv = df.pivot_table(index="task", columns="level", values="SR").reindex(columns=LEVELS)
        piv = piv.loc[piv.mean(axis=1).sort_values(ascending=False).index]
        im = ax.imshow(piv.values, cmap="RdYlGn", vmin=0, vmax=1, aspect="auto")
        ax.set_xticks(range(4)); ax.set_xticklabels(LEVELS)
        ax.set_yticks(range(len(piv))); ax.set_yticklabels([SHORT[t] for t in piv.index], fontsize=11.5)
        for i in range(piv.shape[0]):
            for j in range(4):
                v = piv.values[i, j]
                ax.text(j, i, f"{v:.2f}", ha="center", va="center", fontsize=11,
                        color="black" if 0.25 < v < 0.8 else "white")
        ax.set_title(title, pad=6)
        for s in ax.spines.values():
            s.set_visible(False)
        ax.tick_params(length=0)
        return im

    heat(axes[0], sim[sim.setting == "Seen"], "Seen tasks (all 15 variants)")
    panel_tag(axes[0], "(a)", dx=-0.42)
    im = heat(axes[1], sim[sim.setting == "P+FT"], "Unseen tasks, P+FT")
    from matplotlib.patches import Rectangle
    axes[1].add_patch(Rectangle((1.5, 2.5), 1.0, 2.0, fill=False,
                                edgecolor="#2B2B2B", lw=1.8, zorder=5))
    panel_tag(axes[1], "(b)", dx=-0.42)
    cb = fig.colorbar(im, ax=axes[1], fraction=0.04, pad=0.02)
    cb.set_label("SR (automated)", fontsize=11.5); cb.ax.tick_params(labelsize=10.5)

    # (c) between-variant spread per task
    ax = axes[2]
    g = (sim[sim.setting.isin(["Seen", "P+FT"])]
         .groupby(["task", "variant"])["SR"].mean().reset_index())
    order = g.groupby("task")["SR"].mean().sort_values().index
    data = [g.loc[g.task == t, "SR"].values for t in order]
    bp = ax.boxplot(data, vert=False, widths=0.55, patch_artist=True,
                    medianprops=dict(color="black", lw=1.2),
                    whiskerprops=dict(color=C_GREY), capprops=dict(color=C_GREY),
                    flierprops=dict(marker="."))
    for p, t in zip(bp["boxes"], order):
        p.set(facecolor=C_FAMILY["Video-VA"] if t in SEEN_TASKS else C_FAMILY["VLA"],
              alpha=0.30, edgecolor=C_GREY, lw=0.9)
    ax.set_yticks(range(1, len(order) + 1))
    ax.set_yticklabels([SHORT[t] for t in order], fontsize=11.5)
    ax.set_xlim(0, 1); ax.set_xlabel("SR (automated) across the 15 trained variants")
    ax.set_title("Task difficulty dominates variant identity", pad=6)
    ax.legend(handles=[Patch(facecolor=C_FAMILY["Video-VA"], alpha=0.3, label="seen task"),
                       Patch(facecolor=C_FAMILY["VLA"], alpha=0.3, label="unseen task")],
              loc="upper center", ncols=2, borderpad=0.2, bbox_to_anchor=(0.5, -0.16))
    ygrid(ax, "x"); panel_tag(ax, "(c)", dx=-0.36)

    fig.savefig(os.path.join(out, "figC8_pertask.pdf"))
    fig.savefig(os.path.join(out, "figC8_pertask.png"))
    plt.close(fig)


# ======================================================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--uploads", default="data")
    ap.add_argument("--out", default="figures")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    set_style()
    sim, real, arena = load_all(args.uploads)

    print("[C1] paradigm comparison");   fig_paradigm(sim, arena, args.out)
    print("[C2] encoder ablation");      fig_encoder(sim, real, args.out)
    print("[C3] P+FT scaling");          fig_scaling(sim, real, args.out)
    print("[C4] level x scale");         fig_level_scale(sim, real, args.out)
    print("[C5] per-level fidelity");    fig_perlevel(sim, real, arena, args.out)
    # print("[C6] demonstration swap");    fig_demoswap(args.out)
    print("[C7] metric/domain validity");fig_validity(sim, arena, args.out)
    # print("[C8] per-task diagnostics");  fig_pertask(sim, args.out)
    print("done ->", os.path.abspath(args.out))


if __name__ == "__main__":
    main()
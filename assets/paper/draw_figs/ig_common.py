"""
ig_common.py -- shared palette / style / data loaders for The Imitator Game appendix figures.

Usage:
    from ig_common import *
    sim, real, arena = load_all(UPLOAD_DIR)

Colour scheme follows the main paper:
  * paradigm families      : blue / orange / green   (Fig. 9, Fig. 10)
  * four representative    : blue / orange / green / purple  (Fig. 8, Fig. 11)
  * imitation levels L0-L3 : green / blue / amber / salmon   (Fig. 2 filmstrip borders)
"""
import os, re, json
import numpy as np
import pandas as pd
import matplotlib as mpl
import matplotlib.pyplot as plt

# --------------------------------------------------------------------------------------
# 0. Per-figure / per-subplot line & marker scale
#    每张图、每个子图都可以单独指定放大倍数——改某个 key 对应的数字，只影响那一张图的
#    那一个子图；不列出的子图（多为柱状图/热力图，没有折线节点或散点节点可缩放）不受影响。
#    "default" 是没有单独列出时的兜底值，也用于 set_style() 里的全局 rcParams 兜底大小
#    （即代码里没有显式传 lw=/ms= 的极少数装饰性线条，例如图例中未出现的默认线）。
#
#    下面列出附录全部 8 张图、每张图的每一个子图，以及是否受本缩放体系影响：
# --------------------------------------------------------------------------------------
SCALE = {
    "default":       2.0,   # 兜底：rcParams 全局线宽/节点 + 任何未单独列出的位置

    # figC1_paradigm.pdf  -- fig_paradigm()
    "paradigm_a":    5.0,   # panel (a) 散点：seen-SR vs P+FT-SR
    "paradigm_b":    5.0,   # panel (b) 散点：within-family jitter
    # panel (c)：横向柱状图（Arena win rate）——无折线/散点节点，不适用本缩放

    # figC2_encoder.pdf   -- fig_encoder()
    # panel (a)/(b)/(c)：全部是分组柱状图——无折线/散点节点，不适用本缩放

    # figC3_scaling.pdf   -- fig_scaling()
    "scaling_a":     3.0,   # panel (a) 折线：family 曲线（仿真实线 + 真实世界虚线，共用一个 key）
    # panel (b)：横向柱状图（per-model Δ）——无折线/散点节点，不适用本缩放
    "scaling_c":     3.0,   # panel (c) 折线：zero-shot floor（4 个代表模型）

    # figC4_level_scale.pdf -- fig_level_scale()，四个子图可分别独立控制
    "level_scale_a": 3.0,   # panel (a) Simulation, zero-shot（L0-L3 四条线）
    "level_scale_b": 3.0,   # panel (b) Simulation, P+FT（L0-L3 四条线）
    "level_scale_c": 3.0,   # panel (c) Real world, zero-shot（L0-L3 四条线）
    "level_scale_d": 3.0,   # panel (d) Real world, P+FT（L0-L3 四条线）

    # figC5_perlevel.pdf  -- fig_perlevel()，四个子图，一排 = {real, sim} x {Seen, P+FT}
    "perlevel_a":    3.0,   # panel (a) 折线：真实世界 Seen（主轴 SR 实线 + 副轴 Q 虚线，同一 key）
    "perlevel_b":    3.0,   # panel (b) 折线：真实世界 P+FT（主轴 SR 实线 + 副轴 Q 虚线，同一 key）
    "perlevel_c":    3.0,   # panel (c) 折线：仿真 Seen（主轴 SR 实线 + 副轴 Sub-SR 虚线，同一 key）
    "perlevel_d":    3.0,   # panel (d) 折线：仿真 P+FT（主轴 SR 实线 + 副轴 Sub-SR 虚线，同一 key）

    # figC6_demoswap.pdf  -- fig_demoswap()
    "demoswap_a":    3.0,   # panel (a) 折线：original / similar / unrelated 三种线型
    # panel (b)：柱状图（retained fraction）——无折线/散点节点，不适用本缩放

    # figC7_validity.pdf  -- fig_validity()
    "validity_a":    7.0,   # panel (a) 散点：automated vs human
    "validity_b":    3.0,   # panel (b) 折线：四条曲线（SR / SR_human / Sub-SR / Q，同一 key）

    # figC8_pertask.pdf   -- fig_pertask()
    # panel (a)/(b)：热力图；panel (c)：横向箱线图——均无折线/散点节点，不适用本缩放
}


def sc(key):
    """取某个子图的缩放倍数；key 没在 SCALE 里单独列出时退回 SCALE['default']。"""
    return SCALE.get(key, SCALE["default"])
 
 
def lw(key, base):
    """折线线宽 = base（原论文数值）* 该子图的缩放倍数。"""
    return base * sc(key)
 
 
def ms(key, base):
    """折线节点大小（plt.plot 的 markersize/ms）= base * 该子图的缩放倍数。"""
    return base * sc(key)
 
 
def sz(key, base):
    """散点图节点大小（ax.scatter 的 s=）= base * 该子图的缩放倍数。"""
    return base * sc(key)
 
 
def hl_from_ms(marker_pt, margin_pt=6.0, fontsize_pt=11.0):
    """由 marker 实际渲染的点数(pt)反推图例线段长度(单位=legend字号的倍数)。
    只要 marker 两侧各留出 margin_pt 的线头就够看出线型了，margin 不随缩放倍数变化，
    所以线段长度不会随 marker 越放越大而失控变长——这是下面 hl() 的底层实现。"""
    return (marker_pt + 2 * margin_pt) / fontsize_pt


def hl(key, marker_base, margin_pt=6.0, fontsize_pt=11.0):
    """图例里线段的长度（legend 的 handlelength）。
    注意这里的第二个参数 marker_base 指的是这条线在 ms(key, marker_base) 里用的同一个
    marker 基准值（不是旧版本里那个"handlelength 基准值"）——用它反推 marker 实际渲染出
    的点数，再算出刚好能露出线头、不会随缩放倍数线性暴涨的图例线段长度。
    如果一个图例里同时有几种 marker 大小（比如主轴/副轴），传其中最大的 marker_base，
    这样图例线段能容纳下最大的那个 marker。"""
    return hl_from_ms(ms(key, marker_base), margin_pt, fontsize_pt)
 
 
# --------------------------------------------------------------------------------------
# 1. Palette (paper-consistent)
# --------------------------------------------------------------------------------------
C_FAMILY = {
    "VLA":         "#4C72B0",   # blue
    "Video-Skill": "#DD8452",   # orange
    "Video-VA":    "#55A868",   # green
}
C_MODEL = {                      # the four real-world representative models
    r"$\pi_{0.5}$": "#4C72B0",
    "XSkill":     "#DD8452",
    "ACT/DINOv2": "#55A868",
    "DP/DINOv2":  "#8172B3",     # purple
}
C_LEVEL = {                      # matches the L0-L3 filmstrip borders of Fig. 2
    "L0": "#6FA86F",             # green
    "L1": "#5B8FC9",             # blue
    "L2": "#E0B44A",             # amber
    "L3": "#E28A5A",             # salmon
}
C_ENCODER = {
    "DINOv2":   "#DD8452",
    "SigLIP2":  "#55A868",
    "VideoMAE": "#4C72B0",
}
C_SETTING = {
    "Seen": "#4C72B0", "ZS": "#C44E52", "Scr": "#937860", "P+FT": "#55A868",
}
C_GREY   = "#7F7F7F"
C_LIGHT  = "#D9D9D9"
 
MARKER_FAMILY = {"VLA": "o", "Video-Skill": "s", "Video-VA": "^"}
 
FAMILY_OF_POLICY = {
    "gr00t": "VLA", "openvla": "VLA", "pi": "VLA", "rdt": "VLA",
    "uniskill": "Video-Skill", "xskill": "Video-Skill",
    "act": "Video-VA", "dp": "Video-VA", "vqbet": "Video-VA",
}
PRETTY_POLICY = {
    "act": "ACT", "dp": "DP", "vqbet": "VQ-BeT", "pi": r"$\pi_{0.5}$",
    "gr00t": "GR00T", "rdt": "RDT-1B", "openvla": "OpenVLA",
    "xskill": "XSkill", "uniskill": "UniSkill",
}
PRETTY_ENCODER = {"dinov2_vitl14": "DINOv2", "siglip2_so400m": "SigLIP2",
                  "videomae_large": "VideoMAE", "base": "", "unknown": ""}
LEVELS = ["L0", "L1", "L2", "L3"]
SCALES = [15, 30, 45]
 
 
# --------------------------------------------------------------------------------------
# 2. Global style
# --------------------------------------------------------------------------------------
def set_style(base=13):
    mpl.rcParams.update({
        "font.family": "serif",
        "font.serif": ["Times New Roman", "Times", "Liberation Serif", "Nimbus Roman", "DejaVu Serif"],
        "mathtext.fontset": "stix",     # serif math glyphs that pair with Times New Roman
        "mathtext.rm": "serif",
        "font.size": base,
        "font.weight": "bold",
        "axes.titlesize": base + 1,
        "axes.titleweight": "bold",
        "axes.labelsize": base,
        "axes.labelweight": "bold",
        "xtick.labelsize": base - 1,
        "ytick.labelsize": base - 1,
        "legend.fontsize": base - 1,
        "legend.frameon": False,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.linewidth": 0.8,
        "xtick.major.width": 0.8,
        "ytick.major.width": 0.8,
        "lines.linewidth": lw("default", 1.6),     # 原 1.6，随 SCALE["default"] 缩放
        "lines.markersize": ms("default", 5),      # 原 5，随 SCALE["default"] 缩放
        "grid.color": "#E6E6E6",
        "grid.linewidth": 0.7,
        "figure.dpi": 130,
        "savefig.dpi": 300,
        "savefig.bbox": "tight",
        "pdf.fonttype": 42,      # editable text in the PDF
        "ps.fonttype": 42,
    })
 
 
def ygrid(ax, axis="y"):
    ax.set_axisbelow(True)
    ax.grid(True, axis=axis, alpha=0.7)
 
 
def panel_tag(ax, tag, dx=-0.14, dy=1.06):
    ax.text(dx, dy, tag, transform=ax.transAxes, fontweight="bold",
            fontsize=mpl.rcParams["font.size"] + 1, va="top", ha="left")
 
 
# --------------------------------------------------------------------------------------
# 3. Loaders
# --------------------------------------------------------------------------------------
def load_sim(upload_dir):
    """Simulation rollouts: 15 variants x 3 corpus scales x 4 settings x 10 tasks x 4 levels."""
    df = pd.read_csv(os.path.join(upload_dir, "all_master_records.csv"))
    df["family"] = df["policy"].map(FAMILY_OF_POLICY)
    df["encoder"] = df["backbone"].map(PRETTY_ENCODER).replace("", np.nan)
    df["variant"] = [
        PRETTY_POLICY[p] + ("/" + e if isinstance(e, str) and e else "")
        for p, e in zip(df["policy"], df["encoder"])
    ]
    df["setting"] = df["split"].map({"seen": "Seen", "unseen": "ZS",
                                     "unseen_finetune": "P+FT", "unseen_scratch": "Scr"})
    return df
 
 
def load_real(upload_dir):
    """Real-world trials: 5 trials per (model, task, level); Q is the human imitation score."""
    files = {"act": "act测试记录.xlsx", "dp": "dp测试记录.xlsx",
             "pi": "pi测试记录.xlsx", "xskill": "xskill测试记录.xlsx"}
    rows = []
    for pol, fn in files.items():
        d = pd.read_excel(os.path.join(upload_dir, fn), sheet_name="数据表")
        d.columns = ["model", "task_level", "succ", "score", "note"]
        for _, r in d.iterrows():
            m = str(r["model"])
            enc = ("DINOv2" if "dino" in m else "SigLIP2" if "siglip" in m
                   else "VideoMAE" if "vmae" in m else np.nan)
            sc = re.search(r"_(15|30|45)", m)
            if "scratch" in m:      setting = "Scr"
            elif "finetune" in m:   setting = "P+FT"
            elif "unseen" in m:     setting = "ZS"
            else:                   setting = "Seen"
            tid, lvl = str(r["task_level"]).rsplit("_", 1)
            k, n = str(r["succ"]).split("/")
            rows.append(dict(policy=pol, encoder=enc,
                             scale=int(sc.group(1)) if sc else np.nan,
                             setting=setting, task=tid, level=lvl,
                             n_succ=int(k), n_trials=int(n), SR=int(k) / int(n),
                             Q=float(r["score"]),
                             note=r["note"] if isinstance(r["note"], str) else ""))
    real = pd.DataFrame(rows)
    real["variant"] = [
        {"act": "ACT/", "dp": "DP/", "pi": PRETTY_POLICY["pi"], "xskill": "XSkill"}[p]
        + (e if p in ("act", "dp") and isinstance(e, str) else "")
        for p, e in zip(real["policy"], real["encoder"])
    ]
    real["family"] = real["policy"].map(FAMILY_OF_POLICY)
    return real
 
 
def load_arena(upload_dir):
    """Imitator Arena A/B screens -> one row per judged rollout."""
    raw = json.load(open(os.path.join(upload_dir, "results.json")))["results"]
    ar = pd.DataFrame(list(raw.values()))
    out = []
    for _, r in ar.iterrows():
        for side in ("A", "B"):
            pref = r["preference"]
            win = 1.0 if pref == side.lower() else (0.0 if pref in ("a", "b") else 0.5)
            out.append(dict(arena=r["arena"], task=r["task"], level=r["level"],
                            episode=r["episode"], model=r[f"{side}_model"],
                            Q=r[f"score_{side}"], verdict=r[f"success_{side}"], win=win))
    al = pd.DataFrame(out)
 
    stems = [("act_dinov2_vitl14", "ACT/DINOv2"), ("act_siglip2_so400m", "ACT/SigLIP2"),
             ("act_videomae_large", "ACT/VideoMAE"), ("dp_dinov2_vitl14", "DP/DINOv2"),
             ("dp_siglip2_so400m", "DP/SigLIP2"), ("dp_videomae_large", "DP/VideoMAE"),
             ("vqbet_dinov2_vitl14", "VQ-BeT/DINOv2"), ("vqbet_siglip2_so400m", "VQ-BeT/SigLIP2"),
             ("vqbet_videomae_large", "VQ-BeT/VideoMAE"), ("gr00t", "GR00T"),
             ("openvla", "OpenVLA"), ("rdt", "RDT-1B"), ("pi", PRETTY_POLICY["pi"]),
             ("xskill", "XSkill"), ("uniskill", "UniSkill")]
 
    def parse(m):
        for stem, name in stems:
            if m.startswith(stem):
                rest = m[len(stem):]
                sc = re.search(r"_(15|30|45)_", rest)
                return name, (int(sc.group(1)) if sc else np.nan), rest.split("_")[-1]
        return np.nan, np.nan, np.nan
 
    al[["variant", "scale", "setting"]] = al["model"].apply(lambda m: pd.Series(parse(m)))
    al["setting"] = al["setting"].map({"seen": "Seen", "zeroshot": "ZS",
                                       "finetune": "P+FT", "scratch": "Scr"})
    fam = {"ACT": "Video-VA", "DP": "Video-VA", "VQ-BeT": "Video-VA",
           "XSkill": "Video-Skill", "UniSkill": "Video-Skill"}
    al["family"] = al["variant"].str.split("/").str[0].map(lambda x: fam.get(x, "VLA"))
    al["SR_human"] = (al["verdict"] == "success").astype(float)
    return al
 
 
def load_all(upload_dir):
    return load_sim(upload_dir), load_real(upload_dir), load_arena(upload_dir)
 
 
def dino_only(real):
    """The four representative real-world models (ACT and DP at their DINOv2 backbone)."""
    return real[real["encoder"].isna() | (real["encoder"] == "DINOv2")].copy()
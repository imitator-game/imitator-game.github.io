"""Dump every number quoted in the revised Appendix C, for verification."""
import pandas as pd, numpy as np
from scipy.stats import pearsonr
from ig_common import load_all, dino_only, PRETTY_POLICY
PI = PRETTY_POLICY["pi"]
sim, real, ar = load_all('/mnt/user-data/uploads')
rd = dino_only(real)
out = []
def rec(sec, k, v): out.append(dict(section=sec, quantity=k, value=v))

t = sim[sim.setting=="Seen"].groupby(["variant","family"])["SR"].mean().reset_index()
for f,g in t.groupby("family"):
    rec("C1", f"sim seen-SR mean [{f}]", round(g.SR.mean(),3))
    rec("C1", f"sim seen-SR range [{f}]", f"{g.SR.min():.2f}-{g.SR.max():.2f}")
for f,g in ar.groupby("family"): rec("C1", f"arena WR [{f}]", round(g.win.mean(),3))
w = ar.groupby("variant")[["win","Q"]].mean().sort_values("win",ascending=False)
for v,r in w.head(3).iterrows(): rec("C1", f"arena WR/Q [{v}]", f"{r.win:.2f} / {r.Q:.1f}")
rec("C1", f"arena WR [{PI}]", round(ar[ar.variant==PI].win.mean(),3))

va = sim[sim.family=="Video-VA"]
for s in ["Seen","P+FT"]:
    p = va[va.setting==s].pivot_table(index="policy",columns="encoder",values="SR")
    for h in p.index: rec("C2", f"sim {s} [{h}] D/S/V", "/".join(f"{p.loc[h,e]:.2f}" for e in ["DINOv2","SigLIP2","VideoMAE"]))
a = real[real.policy=="act"]; a45 = a[(a.scale==45)|(a.setting=="Scr")]
p = a45.pivot_table(index="setting",columns="encoder",values="SR")
for s in ["Seen","ZS","Scr","P+FT"]: rec("C2", f"real ACT-45 {s} D/S/V", "/".join(f"{p.loc[s,e]:.2f}" for e in ["DINOv2","SigLIP2","VideoMAE"]))

d=[]
for v,g in sim[sim.setting=="P+FT"].groupby("variant"):
    m=g.groupby("num_tasks")["SR"].mean(); d.append((v, m.get(45)-m.get(15)))
for v,g in rd[rd.setting=="P+FT"].groupby("variant"):
    m=g.groupby("scale")["SR"].mean(); d.append((v+" (real)", m.get(45)-m.get(15)))
d=pd.DataFrame(d,columns=["v","d"])
rec("C3","delta>0 count", f"{int((d.d>0).sum())}/{len(d)}")
for v,x in d.values: rec("C3", f"deltaSR [{v}]", round(float(x),3))
for v in [PI,"XSkill","ACT/DINOv2","DP/DINOv2"]:
    m=rd[(rd.setting=="ZS")&(rd.variant==v)].groupby("scale")["SR"].mean()
    rec("C3", f"real ZS 15->45 [{v}]", f"{m.get(15):.2f}->{m.get(45):.2f}")

for dom,df,xc in [("sim",sim,"num_tasks"),("real",rd,"scale")]:
    for s in ["ZS","P+FT"]:
        for lv in ["L0","L1","L2","L3"]:
            m=df[(df.setting==s)&(df.level==lv)].groupby(xc)["SR"].mean()
            rec("C4", f"{dom} {s} {lv} 15/30/45", "/".join(f"{m.get(k):.2f}" for k in [15,30,45]))

avg_seen=rd[rd.setting=="Seen"].groupby("level")["SR"].mean()
rec("C5","real Seen per level L0-L3", "/".join(f"{avg_seen[l]:.2f}" for l in ["L0","L1","L2","L3"]))
q_seen=rd[rd.setting=="Seen"].groupby("level")["Q"].mean()
rec("C5","real Seen Qbar L0-L3", "/".join(f"{q_seen[l]:.2f}" for l in ["L0","L1","L2","L3"]))
avg=rd[rd.setting=="P+FT"].groupby("level")["SR"].mean()
rec("C5","real P+FT per level L0-L3", "/".join(f"{avg[l]:.2f}" for l in ["L0","L1","L2","L3"]))
q_pft=rd[rd.setting=="P+FT"].groupby("level")["Q"].mean()
rec("C5","real P+FT Qbar L0-L3", "/".join(f"{q_pft[l]:.2f}" for l in ["L0","L1","L2","L3"]))
for v in [PI,"XSkill","ACT/DINOv2","DP/DINOv2"]:
    for s,tag in [("Seen","real Seen"),("P+FT","real P+FT")]:
        m=rd[(rd.setting==s)&(rd.variant==v)].groupby("level")["SR"].mean()
        rec("C5", f"{tag} [{v}] per level", "/".join(f"{m[l]:.2f}" for l in ["L0","L1","L2","L3"]))
        q=rd[(rd.setting==s)&(rd.variant==v)].groupby("level")["Q"].mean()
        rec("C5", f"{tag} [{v}] Qbar", "/".join(f"{q[l]:.2f}" for l in ["L0","L1","L2","L3"]))

allm=sim[sim.setting=="Seen"].groupby("level")["SR"].mean()
rec("C5","sim seen per level L0-L3", "/".join(f"{allm[l]:.2f}" for l in ["L0","L1","L2","L3"]))
for f,g in sim[sim.setting=="Seen"].groupby("family"):
    m=g.groupby("level")["SR"].mean(); rec("C5", f"sim seen per level [{f}]", "/".join(f"{m[l]:.2f}" for l in ["L0","L1","L2","L3"]))
subsr=sim[sim.setting=="Seen"].groupby("level")["SubSR"].mean()
rec("C5","sim seen SubSR L0-L3", "/".join(f"{subsr[l]:.2f}" for l in ["L0","L1","L2","L3"]))
for f,g in sim[sim.setting=="Seen"].groupby("family"):
    m=g.groupby("level")["SubSR"].mean(); rec("C5", f"sim seen SubSR [{f}]", "/".join(f"{m[l]:.2f}" for l in ["L0","L1","L2","L3"]))

allm_pft=sim[sim.setting=="P+FT"].groupby("level")["SR"].mean()
rec("C5","sim P+FT per level L0-L3", "/".join(f"{allm_pft[l]:.2f}" for l in ["L0","L1","L2","L3"]))
for f,g in sim[sim.setting=="P+FT"].groupby("family"):
    m=g.groupby("level")["SR"].mean(); rec("C5", f"sim P+FT per level [{f}]", "/".join(f"{m[l]:.2f}" for l in ["L0","L1","L2","L3"]))
subsr_pft=sim[sim.setting=="P+FT"].groupby("level")["SubSR"].mean()
rec("C5","sim P+FT SubSR L0-L3", "/".join(f"{subsr_pft[l]:.2f}" for l in ["L0","L1","L2","L3"]))
for f,g in sim[sim.setting=="P+FT"].groupby("family"):
    m=g.groupby("level")["SubSR"].mean(); rec("C5", f"sim P+FT SubSR [{f}]", "/".join(f"{m[l]:.2f}" for l in ["L0","L1","L2","L3"]))

for key,tag in [(["variant","setting"],"variant x regime"),(["variant","setting","level"],"+ level")]:
    m=sim.groupby(key)[["SR","SubSR"]].mean().join(ar.groupby(key)[["SR_human","Q"]].mean(),how="inner").dropna()
    rec("C7", f"r(SR,SRhuman) [{tag}]", round(pearsonr(m.SR,m.SR_human)[0],3))
    rec("C7", f"r(SubSR,Q) [{tag}]", round(pearsonr(m.SubSR,m.Q)[0],3))
sg=(sim[sim.variant.isin([PI,"XSkill","ACT/DINOv2","DP/DINOv2"])]
     .groupby(["variant","setting","num_tasks"])["SR"].mean().rename("sim").reset_index()
     .rename(columns={"num_tasks":"scale"}))
rg=rd.groupby(["variant","setting","scale"])["SR"].mean().rename("real").reset_index()
mg=sg.merge(rg,on=["variant","setting","scale"]).dropna()
rec("C7","r(sim,real) all regimes", round(pearsonr(mg.sim,mg.real)[0],3))
mm=mg[mg.setting!="ZS"]; rec("C7","r(sim,real) within Seen/P+FT", round(pearsonr(mm.sim,mm.real)[0],3))

for s,tag in [("Seen","seen"),("P+FT","unseen P+FT")]:
    p=sim[sim.setting==s].pivot_table(index="task",columns="level",values="SR")
    for t in p.index: rec("C8", f"{tag} [{t}] L0-L3", "/".join(f"{p.loc[t,l]:.2f}" for l in ["L0","L1","L2","L3"]))

df=pd.DataFrame(out)
df.to_csv("appendix_C_numbers.csv", index=False)
print(df.to_string())

/* ============================================================
   charts.js — the paper's appendix figures, rebuilt as live SVG.

   Replaces the static PNG exports of make_appendix_figs.py with
   inline SVG that uses the *same* palette (ig_common.C_FAMILY /
   C_LEVEL / C_ENCODER, exposed as --fig-* custom properties), so
   the figures follow the site theme instead of being baked at
   300 dpi in one colour scheme.

   Usage:  <div class="ig-chart" data-chart="paradigm"></div>
   Charts draw themselves the first time they scroll into view.

   Chart ids
     paradigm    ← figC1_paradigm      C1
     encoder     ← figC2_encoder       C2
     scaling     ← figC3_scaling       C3
     levelscale  ← figC4_level_scale   C4
     perlevel    ← figC5_perlevel      C5
     validity    ← figC7_validity      C7
   ============================================================ */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LEVELS = ["L0", "L1", "L2", "L3"];
  var LEVEL_VAR = { L0: "--fig-l0", L1: "--fig-l1", L2: "--fig-l2", L3: "--fig-l3" };

  /* ── tiny SVG helpers ──────────────────────────────────────── */
  function el(tag, attrs, style) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (style) n.setAttribute("style", style);
    return n;
  }
  function svg(w, h) {
    var s = el("svg", { viewBox: "0 0 " + w + " " + h, preserveAspectRatio: "xMidYMid meet",
                        role: "img", width: "100%" });
    s.classList.add("ig-svg");
    return s;
  }
  function text(x, y, str, cls, extra) {
    var t = el("text", Object.assign({ x: x, y: y }, extra || {}));
    t.setAttribute("class", "ig-t " + (cls || ""));
    t.textContent = str;
    return t;
  }
  function lin(d0, d1, r0, r1) {
    return function (v) { return d1 === d0 ? r0 : r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
  }
  function fam(f) { return "var(" + ({ VLA: "--fig-vla", Skill: "--fig-skill", VideoVA: "--fig-videova" }[f] || "--fig-grey") + ")"; }

  /* Axis frame: bottom + left rule, horizontal gridlines, y ticks */
  function frame(g, box, yTicks, fmtY) {
    yTicks.forEach(function (t) {
      var y = box.y(t);
      g.appendChild(el("line", { x1: box.l, x2: box.r, y1: y, y2: y }, "stroke:var(--fig-grid);stroke-width:1"));
      g.appendChild(text(box.l - 8, y + 4, fmtY ? fmtY(t) : t, "ig-t-tick", { "text-anchor": "end" }));
    });
    g.appendChild(el("line", { x1: box.l, x2: box.r, y1: box.b, y2: box.b }, "stroke:var(--fig-axis);stroke-width:1.2"));
  }

  /* Shared hover tooltip */
  var tip = null;
  function tipOn(host, e, html) {
    if (!tip) { tip = document.createElement("div"); tip.className = "ig-tip"; document.body.appendChild(tip); }
    tip.innerHTML = html;
    tip.style.opacity = "1";
    var pad = 14;
    var r = tip.getBoundingClientRect();
    var x = Math.min(window.innerWidth - r.width - 8, Math.max(8, e.clientX - r.width / 2));
    var y = e.clientY - r.height - pad;
    if (y < 8) y = e.clientY + pad;
    tip.style.transform = "translate(" + x + "px," + y + "px)";
  }
  function tipOff() { if (tip) tip.style.opacity = "0"; }
  function hoverable(node, host, html) {
    node.style.cursor = "crosshair";
    node.addEventListener("pointermove", function (e) { tipOn(host, e, html); });
    node.addEventListener("pointerleave", tipOff);
  }

  function pct(v) { return Math.round(v * 100) + "%"; }

  /* Marker path for a family (matches ig_common.MARKER_FAMILY) */
  function marker(f, cx, cy, r, style) {
    if (f === "Skill") return el("rect", { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, rx: 1.5 }, style);
    if (f === "VideoVA") {
      var p = [[cx, cy - r * 1.15], [cx + r * 1.1, cy + r * .8], [cx - r * 1.1, cy + r * .8]];
      return el("polygon", { points: p.map(function (a) { return a.join(","); }).join(" ") }, style);
    }
    return el("circle", { cx: cx, cy: cy, r: r }, style);
  }

  /* Legend row (HTML, so it wraps nicely on phones) */
  function legend(items) {
    var d = document.createElement("div");
    d.className = "ig-legend";
    d.innerHTML = items.map(function (i) {
      return '<span class="ig-legend-item"><span class="ig-legend-swatch ig-legend-' +
             (i.shape || "dot") + '" style="background:' + i.color + ';border-color:' + i.color +
             '"></span>' + i.label + "</span>";
    }).join("");
    return d;
  }

  /* Animation: reveal drawn elements once, staggered */
  function animateIn(root) {
    if (REDUCED) { root.querySelectorAll(".ig-anim").forEach(function (n) { n.classList.add("is-drawn"); }); return; }
    var nodes = Array.prototype.slice.call(root.querySelectorAll(".ig-anim"));
    nodes.forEach(function (n, i) {
      var d = parseFloat(n.dataset.delay || (i * 26));
      setTimeout(function () { n.classList.add("is-drawn"); }, d);
    });
  }

  /* Draw-in for a polyline. getTotalLength() is unreliable on a node
     that is not in the document yet, so measure the points directly. */
  function polyLength(pointsAttr) {
    var pts = pointsAttr.trim().split(/\s+/).map(function (p) { return p.split(",").map(Number); });
    var L = 0;
    for (var i = 1; i < pts.length; i++) {
      L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    return L || 1;
  }
  function drawLine(path, delay) {
    path.classList.add("ig-anim", "ig-line");
    var L = Math.ceil(polyLength(path.getAttribute("points") || "0,0"));
    path.style.strokeDasharray = L;
    path.style.strokeDashoffset = L;
    path.dataset.delay = delay || 0;
    return path;
  }

  /* Vertical bar that grows from the baseline */
  function growBar(rect, delay) {
    rect.classList.add("ig-anim", "ig-bar");
    rect.dataset.delay = delay || 0;
    return rect;
  }

  /* ============================================================
     C1 · Paradigm landscape
     ============================================================ */
  function paradigm(host) {
    var W = 720, H = 430, box = { l: 62, r: W - 18, t: 22, b: H - 92 };
    var s = svg(W, H), g = el("g");
    var x = lin(0, .9, box.l, box.r), y = lin(0, .9, box.b, box.t);
    box.y = y;

    frame(g, box, [0, .2, .4, .6, .8], pct);
    [0, .2, .4, .6, .8].forEach(function (t) {
      g.appendChild(text(x(t), box.b + 20, pct(t), "ig-t-tick", { "text-anchor": "middle" }));
      g.appendChild(el("line", { x1: x(t), x2: x(t), y1: box.t, y2: box.b }, "stroke:var(--fig-grid);stroke-width:1"));
    });
    g.appendChild(text((box.l + box.r) / 2, box.b + 44, "Success rate on seen tasks", "ig-t-axis", { "text-anchor": "middle" }));
    g.appendChild(text(-((box.t + box.b) / 2), 16, "Success rate after pretrain + fine-tune", "ig-t-axis",
      { "text-anchor": "middle", transform: "rotate(-90)", x: -((box.t + box.b) / 2), y: 16 }));

    // y = x reference: above it, fine-tuning on 10 demos beat the seen-task ceiling
    g.appendChild(el("line", { x1: x(0), y1: y(0), x2: x(.9), y2: y(.9) },
      "stroke:var(--fig-axis);stroke-width:1;stroke-dasharray:5 5;opacity:.5"));
    // g.appendChild(text(x(.80), y(.86), "P+FT = Seen", "ig-t-note", { "text-anchor": "end" }));

    IG.sim.forEach(function (r, i) {
      var c = fam(r.fam);
      var m = marker(r.fam, x(r.seen), y(r.pft), 7.5, "fill:" + c + ";fill-opacity:.85;stroke:var(--on-bg);stroke-width:1.5");
      m.classList.add("ig-anim", "ig-dot");
      m.dataset.delay = 120 + i * 45;
      hoverable(m, host,
        "<b>" + r.model + "</b><span class='ig-tip-fam' style='color:" + c + "'>" + IG.famShort(r.fam) + "</span>" +
        "<i>Seen</i> " + pct(r.seen) + " · Sub " + pct(r.seenSub) + "<br>" +
        "<i>P+FT</i> " + pct(r.pft) + " · Sub " + pct(r.pftSub) + "<br>" +
        "<i>Zero-shot</i> " + pct(r.zs));
      g.appendChild(m);
    });

    // The two leaders get a name, the rest stay clean
    // [["ACT/DINOv2", 10, -12], ["π₀.₅", 10, 16]].forEach(function (a) {
    //   var r = IG.sim.filter(function (d) { return d.model === a[0]; })[0];
    //   var t = text(x(r.seen) + a[1], y(r.pft) + a[2], r.model, "ig-t-note");
    //   t.classList.add("ig-anim"); t.dataset.delay = 900;
    //   g.appendChild(t);
    // });

    // Family win-rate strip
    var by = H - 46;
    g.appendChild(text(box.l, by - 14, "Arena win rate by paradigm", "ig-t-axis"));
    var bw = (box.r - box.l - 24) / 3;
    IG.figC1.familyStats.forEach(function (f, i) {
      var bx = box.l + i * (bw + 12);
      g.appendChild(el("rect", { x: bx, y: by, width: bw, height: 12, rx: 6 }, "fill:var(--fig-grid)"));
      var fill = el("rect", { x: bx, y: by, width: bw * f.arenaWR, height: 12, rx: 6 },
        "fill:" + fam(f.fam) + ";transform-box:fill-box;transform-origin:left center");
      fill.classList.add("ig-anim", "ig-bar-x"); fill.dataset.delay = 700 + i * 110;
      hoverable(fill, host, "<b>" + IG.famShort(f.fam) + "</b><i>Arena win rate</i> " + pct(f.arenaWR) +
        "<br><i>Seen SR</i> " + f.mean.toFixed(2) + " (" + f.lo.toFixed(2) + "-" + f.hi.toFixed(2) + ")");
      g.appendChild(fill);
      g.appendChild(text(bx, by + 30, IG.famShort(f.fam) + " · " + pct(f.arenaWR), "ig-t-tick"));
    });

    s.appendChild(g);
    host.appendChild(s);
    host.appendChild(legend([
      { label: "Language-conditioned VLA", color: "var(--fig-vla)" },
      { label: "Cross-embodiment skill", color: "var(--fig-skill)", shape: "square" },
      { label: "Video-conditioned VA", color: "var(--fig-videova)", shape: "tri" }
    ]));
  }

  /* ============================================================
     C2 · Encoder ablation
     ============================================================ */
  function encoder(host) {
    var tabs = ["Simulation · Seen", "Simulation · P+FT", "Real world · ACT-45"];
    var bar = document.createElement("div");
    bar.className = "ig-chart-tabs";
    bar.innerHTML = tabs.map(function (t, i) {
      return '<button type="button" class="ig-chart-tab' + (i ? "" : " is-active") + '" data-i="' + i + '">' + t + "</button>";
    }).join("");
    host.appendChild(bar);
    var plot = document.createElement("div");
    host.appendChild(plot);

    var ENC_VAR = { DINOv2: "--fig-skill", SigLIP2: "--fig-videova", VideoMAE: "--fig-vla" };

    function draw(idx) {
      plot.innerHTML = "";
      var groups, title;
      if (idx === 0) { groups = IG.figC2.sim.Seen;   title = "Seen-task SR in simulation"; }
      else if (idx === 1) { groups = IG.figC2.sim["P+FT"]; title = "Pretrain + fine-tune SR in simulation"; }
      else {
        groups = { Seen: IG.figC2.real.Seen, "Zero-shot": IG.figC2.real.ZS,
                   "Scratch": IG.figC2.real.Scr, "P+FT": IG.figC2.real["P+FT"] };
        title = "Real-world ACT, 45-task corpus";
      }
      var keys = Object.keys(groups);
      var W = 720, H = 330, box = { l: 58, r: W - 18, t: 34, b: H - 54 };
      var s = svg(W, H), g = el("g");
      var yMax = idx === 2 ? .6 : .9;
      var y = lin(0, yMax, box.b, box.t); box.y = y;
      var ticks = idx === 2 ? [0, .2, .4, .6] : [0, .3, .6, .9];
      frame(g, box, ticks, pct);
      g.appendChild(text(box.l, 18, title, "ig-t-axis"));

      var gw = (box.r - box.l) / keys.length;
      keys.forEach(function (k, gi) {
        var vals = groups[k];
        var bw = Math.min(38, (gw - 26) / 3);
        vals.forEach(function (v, ei) {
          var cx = box.l + gi * gw + gw / 2 + (ei - 1) * (bw + 6);
          var c = "var(" + ENC_VAR[IG.figC2.encoders[ei]] + ")";
          var r = el("rect", { x: cx - bw / 2, y: y(v), width: bw, height: Math.max(1, box.b - y(v)), rx: 3 },
            "fill:" + c + ";transform-box:fill-box;transform-origin:center bottom");
          g.appendChild(growBar(r, gi * 90 + ei * 45));
          hoverable(r, host, "<b>" + k + " · " + IG.figC2.encoders[ei] + "</b><i>SR</i> " + v.toFixed(2));
          var lbl = text(cx, y(v) - 7, v.toFixed(2), "ig-t-val", { "text-anchor": "middle" });
          lbl.classList.add("ig-anim"); lbl.dataset.delay = 380 + gi * 90 + ei * 45;
          g.appendChild(lbl);
        });
        g.appendChild(text(box.l + gi * gw + gw / 2, box.b + 20, k, "ig-t-tick", { "text-anchor": "middle" }));
      });
      s.appendChild(g); plot.appendChild(s);
      plot.appendChild(legend(IG.figC2.encoders.map(function (e) {
        return { label: e, color: "var(" + ENC_VAR[e] + ")", shape: "square" };
      })));
      animateIn(plot);
    }

    bar.addEventListener("click", function (e) {
      var b = e.target.closest(".ig-chart-tab"); if (!b) return;
      bar.querySelectorAll(".ig-chart-tab").forEach(function (x) { x.classList.remove("is-active"); });
      b.classList.add("is-active");
      draw(+b.dataset.i);
    });
    draw(0);
  }

  /* ============================================================
     C3 · Corpus scaling
     ============================================================ */
  function scaling(host) {
    var d = IG.figC3.deltaSim;
    var W = 720, H = 500;
    var s = svg(W, H), g = el("g");
    var box = { l: 132, r: W - 20, t: 30, b: 320 };
    var lo = -.12, hi = .24;
    var x = lin(lo, hi, box.l, box.r);
    var zero = x(0);

    g.appendChild(text(20, 18, "Change in P+FT success from a 15-task to a 45-task pretraining corpus", "ig-t-axis"));
    [-.1, 0, .1, .2].forEach(function (t) {
      g.appendChild(el("line", { x1: x(t), x2: x(t), y1: box.t, y2: box.b }, "stroke:var(--fig-grid);stroke-width:1"));
      g.appendChild(text(x(t), box.b + 18, (t > 0 ? "+" : "") + t.toFixed(2), "ig-t-tick", { "text-anchor": "middle" }));
    });
    g.appendChild(el("line", { x1: zero, x2: zero, y1: box.t, y2: box.b }, "stroke:var(--fig-axis);stroke-width:1.2"));

    var rowH = (box.b - box.t) / d.length;
    d.forEach(function (r, i) {
      var cy = box.t + i * rowH + rowH / 2;
      var w = Math.abs(x(r.d) - zero);
      var rect = el("rect", {
        x: r.d >= 0 ? zero : zero - w, y: cy - rowH * .32,
        width: Math.max(1.5, w), height: rowH * .64, rx: 3
      }, "fill:" + fam(r.fam) + ";fill-opacity:" + (r.d >= 0 ? ".9" : ".55") +
         ";transform-box:fill-box;transform-origin:" + (r.d >= 0 ? "left" : "right") + " center");
      rect.classList.add("ig-anim", "ig-bar-x"); rect.dataset.delay = i * 55;
      hoverable(rect, host, "<b>" + r.model + "</b><span class='ig-tip-fam' style='color:" + fam(r.fam) + "'>" +
        IG.famShort(r.fam) + "</span><i>ΔSR (15→45)</i> " + (r.d >= 0 ? "+" : "") + r.d.toFixed(3));
      g.appendChild(rect);
      g.appendChild(text(box.l - 12, cy + 4, r.model, "ig-t-tick", { "text-anchor": "end" }));
      var v = text((r.d >= 0 ? zero + w + 7 : zero - w - 7), cy + 4,
        (r.d >= 0 ? "+" : "") + r.d.toFixed(2), "ig-t-val", { "text-anchor": r.d >= 0 ? "start" : "end" });
      v.classList.add("ig-anim"); v.dataset.delay = 400 + i * 55;
      g.appendChild(v);
    });

    // Lower panel: the real-world zero-shot floor
    var p2 = { l: 132, r: W - 20, t: 384, b: H - 34 };
    var zx = lin(0, 2, p2.l + 20, p2.r - 40), zy = lin(0, .36, p2.b, p2.t);
    p2.y = zy;
    g.appendChild(text(20, 366, "Zero-shot success in the real world as the corpus grows", "ig-t-axis"));
    frame(g, p2, [0, .1, .2, .3], pct);
    IG.figC3.zsFloor.scales.forEach(function (sc, i) {
      g.appendChild(text(zx(i), p2.b + 18, sc + " tasks", "ig-t-tick", { "text-anchor": "middle" }));
    });
    IG.figC3.zsFloor.series.forEach(function (ser, si) {
      var pts = ser.v.map(function (v, i) { return [zx(i), zy(v)]; });
      var path = el("polyline", { points: pts.map(function (p) { return p.join(","); }).join(" ") },
        "fill:none;stroke:" + fam(ser.fam) + ";stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round");
      g.appendChild(drawLine(path, 500 + si * 130));
      pts.forEach(function (p, i) {
        var c = marker(ser.fam, p[0], p[1], 5, "fill:" + fam(ser.fam) + ";stroke:var(--on-bg);stroke-width:1.4");
        c.classList.add("ig-anim", "ig-dot"); c.dataset.delay = 760 + si * 130 + i * 60;
        hoverable(c, host, "<b>" + ser.model + "</b><i>" + IG.figC3.zsFloor.scales[i] + "-task corpus</i> " + pct(ser.v[i]));
        g.appendChild(c);
      });
      var lab = text(pts[2][0] + 10, pts[2][1] + 4, ser.model, "ig-t-note");
      lab.setAttribute("style", "fill:" + fam(ser.fam));
      lab.classList.add("ig-anim"); lab.dataset.delay = 1100;
      g.appendChild(lab);
    });

    s.appendChild(g); host.appendChild(s);
    var note = document.createElement("p");
    note.className = "ig-chart-note";
    host.appendChild(note);
  }

  /* ============================================================
     C4 · Level × corpus scale (2×2 small multiples)
     ============================================================ */
  function levelscale(host) {
    var W = 720, H = 420;
    var s = svg(W, H), g = el("g");
    var pw = (W - 70) / 2, ph = (H - 96) / 2;

    IG.figC4.panels.forEach(function (p, pi) {
      var ox = 56 + (pi % 2) * (pw + 14);
      var oy = 34 + Math.floor(pi / 2) * (ph + 46);
      var box = { l: ox, r: ox + pw - 26, t: oy, b: oy + ph - 26 };
      var isZS = p.regime === "Zero-shot";
      var yMax = isZS ? .3 : .7;
      var y = lin(0, yMax, box.b, box.t); box.y = y;
      var x = lin(0, 2, box.l + 16, box.r - 16);

      g.appendChild(text(ox, oy - 10, p.domain + " · " + p.regime, "ig-t-panel"));
      frame(g, box, isZS ? [0, .1, .2, .3] : [0, .2, .4, .6], pct);
      IG.figC4.scales.forEach(function (sc, i) {
        g.appendChild(text(x(i), box.b + 17, sc, "ig-t-tick", { "text-anchor": "middle" }));
      });

      LEVELS.forEach(function (lv, li) {
        var vals = p.series[lv];
        var col = "var(" + LEVEL_VAR[lv] + ")";
        var pts = vals.map(function (v, i) { return [x(i), y(v)]; });
        var path = el("polyline", { points: pts.map(function (q) { return q.join(","); }).join(" ") },
          "fill:none;stroke:" + col + ";stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round");
        g.appendChild(drawLine(path, pi * 160 + li * 90));
        pts.forEach(function (q, i) {
          var c = el("circle", { cx: q[0], cy: q[1], r: 4.2 }, "fill:" + col + ";stroke:var(--on-bg);stroke-width:1.4");
          c.classList.add("ig-anim", "ig-dot"); c.dataset.delay = pi * 160 + li * 90 + 300 + i * 50;
          hoverable(c, host, "<b>" + lv + " · " + p.domain + "</b><i>" + p.regime + ", " +
            IG.figC4.scales[i] + " tasks</i> " + pct(vals[i]));
          g.appendChild(c);
        });
      });
    });
    g.appendChild(text(W / 2, H - 8, "Pretraining corpus size (tasks)", "ig-t-axis", { "text-anchor": "middle" }));
    s.appendChild(g); host.appendChild(s);
    host.appendChild(legend(LEVELS.map(function (lv, i) {
      return { label: lv + " · " + IG.levelMeta[i].name, color: "var(" + LEVEL_VAR[lv] + ")" };
    })));
  }

  /* ============================================================
     C5 · The level profile — where imitation breaks
     ============================================================ */
  function perlevel(host) {
    var W = 720, H = 400;
    var s = svg(W, H), g = el("g");
    var box = { l: 60, r: W - 66, t: 40, b: H - 74 };
    var x = lin(0, 3, box.l + 34, box.r - 34);
    var y = lin(0, .7, box.b, box.t); box.y = y;
    var yq = lin(4.5, 8, box.b, box.t);

    g.appendChild(text(box.l - 44, 20, "Real-world pretrain + fine-tune, resolved by hierarchy level", "ig-t-axis"));
    frame(g, box, [0, .2, .4, .6], pct);
    [5, 6, 7, 8].forEach(function (q) {
      g.appendChild(text(box.r + 10, yq(q) + 4, q.toFixed(1), "ig-t-tick ig-t-right"));
    });
    g.appendChild(text(box.r + 44, (box.t + box.b) / 2, "Human imitation score Q", "ig-t-axis",
      { "text-anchor": "middle", transform: "rotate(90)", x: (box.t + box.b) / 2, y: -(box.r + 44) }));

    // L3 band — the finding the whole figure exists to show
    var bandX = x(2.5);
    g.appendChild(el("rect", { x: bandX, y: box.t, width: box.r - bandX, height: box.b - box.t },
      "fill:var(--fig-l3);opacity:.09"));
    var bl = text(x(3), box.t - 8, "functional substitution", "ig-t-note", { "text-anchor": "middle" });
    bl.setAttribute("style", "fill:var(--fig-l3)");
    bl.classList.add("ig-anim"); bl.dataset.delay = 1200;
    g.appendChild(bl);

    LEVELS.forEach(function (lv, i) {
      g.appendChild(text(x(i), box.b + 22, lv, "ig-t-tick ig-t-strong", { "text-anchor": "middle" }));
      g.appendChild(text(x(i), box.b + 38, IG.levelMeta[i].name.split(" ")[0], "ig-t-note", { "text-anchor": "middle" }));
    });

    IG.perLevel.rows.forEach(function (r, ri) {
      var col = fam(r.fam);
      var pts = r.sr.map(function (v, i) { return [x(i), y(v)]; });
      var path = el("polyline", { points: pts.map(function (q) { return q.join(","); }).join(" ") },
        "fill:none;stroke:" + col + ";stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;opacity:.85");
      g.appendChild(drawLine(path, ri * 120));
      pts.forEach(function (q, i) {
        var c = marker(r.fam, q[0], q[1], 5.5, "fill:" + col + ";stroke:var(--on-bg);stroke-width:1.5");
        c.classList.add("ig-anim", "ig-dot"); c.dataset.delay = 300 + ri * 120 + i * 55;
        hoverable(c, host, "<b>" + r.model + " · " + LEVELS[i] + "</b><i>SR</i> " + r.sr[i].toFixed(2) +
          "<br><i>Q</i> " + r.q[i].toFixed(2));
        g.appendChild(c);
      });
    });

    // Average SR, heavier
    var avg = IG.perLevel.average.sr.map(function (v, i) { return [x(i), y(v)]; });
    var ap = el("polyline", { points: avg.map(function (q) { return q.join(","); }).join(" ") },
      "fill:none;stroke:var(--fig-ink);stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round");
    g.appendChild(drawLine(ap, 620));
    avg.forEach(function (q, i) {
      var c = el("circle", { cx: q[0], cy: q[1], r: 6 }, "fill:var(--on-bg);stroke:var(--fig-ink);stroke-width:2.6");
      c.classList.add("ig-anim", "ig-dot"); c.dataset.delay = 900 + i * 60;
      hoverable(c, host, "<b>Average · " + LEVELS[i] + "</b><i>SR</i> " +
        IG.perLevel.average.sr[i].toFixed(2) + "<br><i>Q</i> " + IG.perLevel.average.q[i].toFixed(2));
      g.appendChild(c);
    });

    // Mean Q, dashed on the right axis
    var qp = IG.perLevel.average.q.map(function (v, i) { return [x(i), yq(v)]; });
    var qpath = el("polyline", { points: qp.map(function (q) { return q.join(","); }).join(" ") },
      "fill:none;stroke:var(--fig-grey);stroke-width:2;stroke-dasharray:6 5;stroke-linecap:round");
    g.appendChild(drawLine(qpath, 1000));

    s.appendChild(g); host.appendChild(s);
    host.appendChild(legend(
      IG.perLevel.rows.map(function (r) { return { label: r.model, color: fam(r.fam),
        shape: r.fam === "Skill" ? "square" : r.fam === "VideoVA" ? "tri" : "dot" }; })
      .concat([{ label: "Average SR", color: "var(--fig-ink)" },
               { label: "Mean Q (right axis)", color: "var(--fig-grey)", shape: "dash" }])
    ));
  }

  /* ============================================================
     C7 · Does the automated metric agree with the humans?
     ============================================================ */
  /* Panel (b) needs its own dashed/hollow marker family — the matplotlib
     figure marks the Arena (human) series with white-filled markers of the
     same shape as their automated counterpart, so the eye reads "same
     quantity, other channel" without a second legend. */
  function hollowMarker(shape, cx, cy, r, stroke) {
    var style = "fill:var(--on-bg);stroke:" + stroke + ";stroke-width:2";
    if (shape === "square") return el("rect", { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, rx: 1.5 }, style);
    if (shape === "triangleDown") {
      var p = [[cx, cy + r * 1.15], [cx + r * 1.1, cy - r * .8], [cx - r * 1.1, cy - r * .8]];
      return el("polygon", { points: p.map(function (a) { return a.join(","); }).join(" ") }, style);
    }
    return el("circle", { cx: cx, cy: cy, r: r }, style);
  }

  var SETTING_COLOR = { Seen: "var(--fig-seen)", ZS: "var(--fig-zs)", Scr: "var(--fig-scr)", "P+FT": "var(--fig-pft)" };
  var SETTING_ORDER = ["Seen", "ZS", "Scr", "P+FT"];

  function validity(host) {
    var W = 940, H = 460;
    var s = svg(W, H), g = el("g");
    var gap = 56;
    var boxA = { l: 56, r: W / 2 - gap / 2, t: 46, b: H - 96 };
    var xa = lin(0, .9, boxA.l + 10, boxA.r - 6), ya = lin(0, .95, boxA.b, boxA.t);
    boxA.y = ya;

    // ── panel (a): automated vs. human, EVERY trained variant × regime ──
    // (matches fig_validity()'s sim.groupby(["variant","setting"]) joined
    // to arena.groupby(["variant","setting"]) — 15 variants × 4 regimes.)
    g.appendChild(text(boxA.l, 20, "(a)  Automated and Arena channels agree", "ig-t-panel"));
    frame(g, boxA, [0, .2, .4, .6, .8], pct);
    [0, .2, .4, .6, .8].forEach(function (t) {
      g.appendChild(text(xa(t), boxA.b + 18, pct(t), "ig-t-tick", { "text-anchor": "middle" }));
    });
    g.appendChild(el("line", { x1: xa(0), y1: ya(0), x2: xa(.9), y2: ya(.9) },
      "stroke:var(--fig-axis);stroke-width:1;stroke-dasharray:5 5;opacity:.55"));
    g.appendChild(text((boxA.l + boxA.r) / 2, boxA.b + 40, "SR (simulation, automated)", "ig-t-axis", { "text-anchor": "middle" }));
    g.appendChild(text(boxA.l - 40, (boxA.t + boxA.b) / 2, "SR_human (simulation, Arena)", "ig-t-axis",
      { "text-anchor": "middle", transform: "rotate(-90)", x: -(boxA.t + boxA.b) / 2, y: boxA.l - 40 }));

    IG.figC7.agreement.forEach(function (p, i) {
      var col = SETTING_COLOR[p.setting] || "var(--fig-grey)";
      var c = el("circle", { cx: xa(p.x), cy: ya(p.y), r: 5.5 }, "fill:" + col + ";fill-opacity:.85;stroke:var(--on-bg);stroke-width:1.2");
      c.classList.add("ig-anim", "ig-dot"); c.dataset.delay = i * 16;
      hoverable(c, host, "<b>" + p.model + " · " + p.setting + "</b><i>Automated SR</i> " + pct(p.x) +
        "<br><i>Human SR</i> " + pct(p.y) + "<br><i>Sub-SR</i> " + pct(p.subx) + " · <i>Q</i> " + p.q.toFixed(2));
      g.appendChild(c);
    });
    // var rl = text(boxA.l + 14, boxA.t + 20, "r = 0.956", "ig-t-strong");
    // rl.classList.add("ig-anim"); rl.dataset.delay = 900; g.appendChild(rl);
    // var nl = text(boxA.l + 14, boxA.t + 36, "n = 60  (15 variants × 4 regimes)", "ig-t-note");
    // nl.classList.add("ig-anim"); nl.dataset.delay = 950; g.appendChild(nl);

    // ── panel (b): same rollouts, both channels, resolved by level ──
    var boxB = { l: W / 2 + gap / 2 + 4, r: W - 66, t: 46, b: H - 96 };
    var xb = lin(0, 3, boxB.l + 26, boxB.r - 26);
    var yb = lin(.3, .85, boxB.b, boxB.t); boxB.y = yb;
    var yq = lin(4, 10, boxB.b, boxB.t);

    g.appendChild(text(boxB.l, 20, "(b)  Simulation: same rollouts, both channels, by level", "ig-t-panel"));
    frame(g, boxB, [.3, .45, .6, .75], pct);
    [4, 6, 8, 10].forEach(function (q) {
      g.appendChild(text(boxB.r + 10, yq(q) + 4, q, "ig-t-tick ig-t-right"));
    });
    g.appendChild(text(boxB.r + 46, (boxB.t + boxB.b) / 2, "imitation score (Sub-SR / Q̄)", "ig-t-axis",
      { "text-anchor": "middle", transform: "rotate(90)", x: (boxB.t + boxB.b) / 2, y: -(boxB.r + 46) }));

    // L3 tint — the same "functional substitution" band used in Fig. C5,
    // so the two figures read as one continuing argument, not two designs.
    var bandX = xb(2.5);
    g.appendChild(el("rect", { x: bandX, y: boxB.t, width: boxB.r - bandX, height: boxB.b - boxB.t },
      "fill:var(--fig-l3);opacity:.09"));

    LEVELS.forEach(function (lv, i) {
      g.appendChild(text(xb(i), boxB.b + 22, lv, "ig-t-tick ig-t-strong", { "text-anchor": "middle" }));
    });

    var SR = IG.figC5.simSeenAll;                 // verified
    var SRh = IG.figC7.arenaSeenByLevel.SRhuman;   // verified
    var SubSR = IG.figC5.simSeenSubAll;            // verified
    var Qbar = IG.figC7.arenaSeenByLevel.Qbar;     // verified

    function seriesLine(vals, scaleFn, color, dashed, delay) {
      var pts = vals.map(function (v, i) { return [xb(i), scaleFn(v)]; });
      var path = el("polyline", { points: pts.map(function (p) { return p.join(","); }).join(" ") },
        "fill:none;stroke:" + color + ";stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round" +
        (dashed ? ";stroke-dasharray:6 5" : ""));
      g.appendChild(drawLine(path, delay));
      return pts;
    }
    function seriesDots(pts, shape, hollow, color, delay, label, vals) {
      pts.forEach(function (p, i) {
        var c = hollow ? hollowMarker(shape, p[0], p[1], 5, color)
                        : (shape === "square" ? el("rect", { x: p[0] - 5, y: p[1] - 5, width: 10, height: 10, rx: 1.5 },
                            "fill:" + color + ";stroke:var(--on-bg);stroke-width:1.4")
                          : shape === "triangle" ? (function () {
                              var tp = [[p[0], p[1] - 6], [p[0] + 5.7, p[1] + 4.2], [p[0] - 5.7, p[1] + 4.2]];
                              return el("polygon", { points: tp.map(function (a) { return a.join(","); }).join(" ") },
                                "fill:" + color + ";stroke:var(--on-bg);stroke-width:1.4");
                            })()
                          : el("circle", { cx: p[0], cy: p[1], r: 5 }, "fill:" + color + ";stroke:var(--on-bg);stroke-width:1.4"));
        c.classList.add("ig-anim", "ig-dot"); c.dataset.delay = delay + i * 55;
        hoverable(c, host, "<b>" + label + " · " + LEVELS[i] + "</b>" + vals[i]);
        g.appendChild(c);
      });
    }

    var pSR = seriesLine(SR, yb, "var(--fig-vla)", false, 200);
    seriesDots(pSR, "dot", false, "var(--fig-vla)", 400, "SR (automated)", SR.map(pct));

    var pSRh = seriesLine(SRh, yb, "var(--fig-vla)", true, 350);
    seriesDots(pSRh, "square", true, "var(--fig-vla)", 550, "SR_human (Arena)", SRh.map(pct));

    var pSub = seriesLine(SubSR, function (v) { return yq(v * 10); }, "var(--fig-skill)", false, 500);
    seriesDots(pSub, "triangle", false, "var(--fig-skill)", 700, "Sub-SR ×10 (automated)", SubSR.map(pct));

    var pQ = seriesLine(Qbar, yq, "var(--fig-skill)", true, 650);
    seriesDots(pQ, "triangleDown", true, "var(--fig-skill)", 850, "Q̄ (Arena)", Qbar.map(function (v) { return v.toFixed(2); }));

    s.appendChild(g); host.appendChild(s);

    host.appendChild(legend(
      SETTING_ORDER.map(function (k) { return { label: k, color: SETTING_COLOR[k] }; })
    ));
    host.appendChild(legend([
      { label: "SR (automated)", color: "var(--fig-vla)" },
      { label: "SR_human (Arena)", color: "var(--fig-vla)", shape: "dash" },
      { label: "Sub-SR ×10 (automated)", color: "var(--fig-skill)" },
      { label: "Q̄ (Arena, right axis)", color: "var(--fig-skill)", shape: "dash" }
    ]));

    var note = document.createElement("p");
    note.className = "ig-chart-note";
    host.appendChild(note);
  }

  /* ── registry + lazy draw ──────────────────────────────────── */
  var CHARTS = { paradigm: paradigm, encoder: encoder, scaling: scaling,
                 levelscale: levelscale, perlevel: perlevel, validity: validity };

  /* Is the host actually laid out? Charts inside an inactive figdeck panel
     are display:none, so a draw-in there animates into nothing. */
  function laidOut(host) {
    return !!(host.offsetParent || host.getClientRects().length);
  }

  /* The figure deck sits inside a [data-reveal] wrapper that starts at
     opacity 0. Drawing the moment the IntersectionObserver fires means the
     whole animation plays behind an invisible container and the reader only
     ever sees the finished chart. Wait for the reveal to land first. */
  function whenRevealed(host, cb) {
    var gate = host.closest("[data-reveal]");
    if (!gate || gate.classList.contains("is-in")) { cb(); return; }
    var mo = new MutationObserver(function () {
      if (!gate.classList.contains("is-in")) return;
      mo.disconnect();
      cb();
    });
    mo.observe(gate, { attributes: true, attributeFilter: ["class"] });
    // Safety net: never leave a chart undrawn if the reveal never fires.
    setTimeout(function () { mo.disconnect(); cb(); }, 2500);
  }

  function draw(host) {
    if (host.dataset.drawn) return true;
    var fn = CHARTS[host.dataset.chart];
    if (!fn) { host.innerHTML = '<p class="ig-chart-note">Unknown chart: ' + host.dataset.chart + "</p>"; return true; }
    host.dataset.drawn = "1";
    fn(host);
    return true;
  }

  /* Re-run the entrance on an already-drawn chart (used when a deck panel
     is brought back into view). */
  function replay(host) {
    var nodes = host.querySelectorAll(".ig-anim");
    if (!nodes.length) return;
    nodes.forEach(function (n) { n.classList.remove("is-drawn"); });
    void host.offsetWidth;                       // force a reflow so the
    requestAnimationFrame(function () {          // transitions restart
      animateIn(host);
    });
  }

  /* Public entry: draw if needed, then animate — but only once the chart is
     both laid out and revealed. A hidden host is left alone; the figdeck
     watcher below picks it up when its panel becomes active. */
  function build(host) {
    if (!laidOut(host)) return;
    var fresh = !host.dataset.drawn;
    draw(host);
    whenRevealed(host, function () {
      if (!laidOut(host)) return;
      var panel = host.closest(".ig-figdeck-panel");
      var panelDelay = panel && !REDUCED ? 420 : 0;
      setTimeout(function () {
        if (fresh) animateIn(host); else replay(host);
      }, panelDelay);
    });
  }

  /* Tab-switched figure deck: charts in inactive panels are never built at
     load time, so build (or replay) them the moment their panel is shown.
     Works with whatever toggles .is-active — no coupling to landing.js. */
  function watchDecks() {
    var panels = document.querySelectorAll(".ig-figdeck-panel");
    if (!panels.length || !("MutationObserver" in window)) return;
    var mo = new MutationObserver(function (records) {
      records.forEach(function (r) {
        var p = r.target;
        if (!p.classList.contains("is-active")) return;
        requestAnimationFrame(function () {
          p.querySelectorAll(".ig-chart[data-chart]").forEach(build);
        });
      });
    });
    panels.forEach(function (p) { mo.observe(p, { attributes: true, attributeFilter: ["class"] }); });
    // The first panel is active in the HTML before landing.js creates the
    // tab rail, so it will not emit a class mutation. Queue it explicitly.
    requestAnimationFrame(function () {
      document.querySelectorAll(".ig-figdeck-panel.is-active .ig-chart[data-chart]").forEach(build);
    });
  }

  function init() {
    var hosts = document.querySelectorAll(".ig-chart[data-chart]");
    watchDecks();
    if (!hosts.length) return;
    if (!("IntersectionObserver" in window)) { hosts.forEach(function (h) { draw(h); animateIn(h); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        build(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.15 });
    hosts.forEach(function (h) { io.observe(h); });
  }

  document.addEventListener("DOMContentLoaded", init);
  window.IGCharts = { build: build, init: init, replay: replay };
})();
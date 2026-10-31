(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  let dev = "gpu";

  function applyDevice(d) {
    dev = d;
    $$("[data-bench-dev]").forEach((b) => b.classList.toggle("active", b.dataset.benchDev === d));
    $$("img[data-gpu]").forEach((im) => { im.src = im.dataset[d]; });
    $$("[data-cap-gpu]").forEach((el) => {
      const t = el.dataset[d === "gpu" ? "capGpu" : "capCpu"];
      if (el.tagName === "IMG") el.alt = (el.dataset.title ? el.dataset.title + ". " : "") + t; else el.textContent = t;
    });
    $$("[data-dev-label]").forEach((el) => { el.textContent = d === "gpu" ? "GPU run \u00b7 RTX 3050 6GB" : "CPU run"; });
    document.dispatchEvent(new CustomEvent("benchdev", { detail: d }));
  }

  
  const NS = [1000, 10000, 100000, 1000000, 10000000, 100000000];
  const ALGOS = [
    { k: 0, name: "SPCMP", cls: "lane--spcmp" },
    { k: 2, name: "numpy quicksort", cls: "" },
    { k: 3, name: "numpy mergesort", cls: "" },
    { k: 1, name: "C++ std::sort", cls: "" }
  ];
  const fmt = (s) => {
    if (s == null) return "n/a";
    if (s < 1e-6) return "<1 \u00b5s";
    if (s < 1e-3) return (s * 1e6).toFixed(s < 1e-4 ? 1 : 0) + " \u00b5s";
    if (s < 1) return (s * 1e3).toFixed(s < 1e-2 ? 2 : 1) + " ms";
    return s.toFixed(3) + " s";
  };
  const nfmt = (n) => n.toLocaleString("en-US");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initSim() {
    const root = $("#sim");
    if (!root || !window.SPEED) return;
    const selT = $("#sim-type"), rng = $("#sim-n"), nOut = $("#sim-n-out"), go = $("#sim-go");
    const lanes = $("#sim-lanes"), verdict = $("#sim-verdict"), ladder = $("#sim-ladder");
    const types = Object.keys(window.SPEED.gpu).sort();
    selT.innerHTML = types.map((t) => `<option value="${t}"${t === "uniform_random" ? " selected" : ""}>${t}</option>`).join("");
    lanes.innerHTML = ALGOS.map((a, i) =>
      `<div class="lane ${a.cls}" data-i="${i}"><span class="lane__name">${a.name}</span>` +
      `<div class="lane__track"><div class="lane__bar"></div></div><span class="lane__t">&nbsp;</span></div>`).join("");
    let token = 0;

    const cur = () => ({ t: selT.value, n: NS[+rng.value] });
    const row = (t, n) => window.SPEED[dev][t][n];

    function drawLadder() {
      const { t, n } = cur();
      ladder.innerHTML = NS.map((nn) => {
        const r = row(t, nn); const sp = r[2] && r[0] != null ? (r[0] < 1e-6 ? null : r[2] / r[0]) : null;
        const txt = sp == null ? "n/a" : (sp >= 10 ? sp.toFixed(1) : sp.toFixed(2)) + "x";
        return `<div class="ladder__cell${nn === n ? " on" : ""}${sp != null && sp < 1 ? " lose" : ""}"><b>${nn >= 1e6 ? nn / 1e6 + "M" : nn / 1e3 + "K"}</b><span>${txt}</span></div>`;
      }).join("");
    }

    function reset() {
      token++;
      const { t, n } = cur();
      nOut.textContent = nfmt(n);
      const r = row(t, n);
      $$(".lane", lanes).forEach((ln, i) => {
        $(".lane__bar", ln).style.width = "0%";
        ln.classList.remove("done", "winner");
        $(".lane__t", ln).textContent = r[ALGOS[i].k] == null ? "n/a" : "\u00a0";
      });
      verdict.innerHTML = "Press <b>Run the race</b>.";
      drawLadder();
    }

    function run() {
      const my = ++token; const { t, n } = cur(); const r = row(t, n);
      const times = ALGOS.map((a) => (r[a.k] == null ? null : Math.max(r[a.k], 5e-7)));
      const slow = Math.max(...times.filter((x) => x != null));
      const DUR = reduce ? 0.01 : 7000;
      const start = performance.now();
      const L = $$(".lane", lanes);
      L.forEach((ln) => ln.classList.remove("done", "winner"));
      const q = r[2], s = r[0];
      function frame(now) {
        if (my !== token) return;
        const el = now - start; let all = true;
        L.forEach((ln, i) => {
          if (times[i] == null) return;
          const fin = (times[i] / slow) * DUR;
          const p = Math.min(1, el / fin);
          $(".lane__bar", ln).style.width = (p * 100).toFixed(2) + "%";
          const simT = Math.min(times[i], (el / DUR) * slow);
          $(".lane__t", ln).textContent = p >= 1 ? fmt(r[ALGOS[i].k]) : fmt(simT);
          if (p >= 1) ln.classList.add("done"); else all = false;
        });
        if (!all) { requestAnimationFrame(frame); return; }
        const best = Math.min(...times.filter((x) => x != null));
        L.forEach((ln, i) => { if (times[i] === best) ln.classList.add("winner"); });
        const sp = q / Math.max(s, 5e-7);
        if (s < 1e-6) verdict.innerHTML = `<span class="ok">SPCMP finished below timer resolution (&lt;1 &micro;s)</span> on ${nfmt(n)} ${t}. numpy quicksort: ${fmt(q)}.`;
        else if (sp >= 1) verdict.innerHTML = `<span class="ok">SPCMP is ${sp >= 10 ? sp.toFixed(1) : sp.toFixed(2)}x faster than numpy quicksort</span> here (${fmt(s)} vs ${fmt(q)}).`;
        else verdict.innerHTML = `<span class="new">SPCMP loses here: ${sp.toFixed(2)}x of numpy quicksort</span> (${fmt(s)} vs ${fmt(q)}). Small and adversarial cases are in the record too.`;
      }
      requestAnimationFrame(frame);
    }
    rng.addEventListener("input", reset); selT.addEventListener("change", reset);
    go.addEventListener("click", () => { reset(); run(); });
    document.addEventListener("benchdev", reset);
    reset();
  }

  function initDeck() {
    const deck = $("#deck"); if (!deck) return;
    const open = () => deck.classList.add("is-open"), shut = () => deck.classList.remove("is-open");
    deck.addEventListener("mouseenter", open);
    deck.addEventListener("mouseleave", shut);
    deck.addEventListener("focusin", open);
    deck.addEventListener("focusout", (e) => { if (!deck.contains(e.relatedTarget)) shut(); });
    deck.addEventListener("click", (e) => { if (!deck.classList.contains("is-open")) { open(); e.stopPropagation(); } });
    deck.addEventListener("keydown", (e) => { if (e.target === deck && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); deck.classList.toggle("is-open"); } });
    new IntersectionObserver((es, o) => es.forEach((e) => {
      if (e.isIntersecting) { setTimeout(() => { if (!deck.matches(":hover")) { open(); setTimeout(() => { if (!deck.matches(":hover") && !deck.contains(document.activeElement)) shut(); }, 1700); } }, 400); o.disconnect(); }
    }), { threshold: 0.6 }).observe(deck);
  }

  function initScale() {
    const root = $("#sr"); if (!root || !window.SPEED) return;
    const ALG = [{ k: 0, name: "SPCMP", c: "#E8553D" }, { k: 2, name: "numpy quicksort", c: "#2a9d8f" }, { k: 3, name: "numpy mergesort", c: "#E9C46A" }, { k: 1, name: "C++ std::sort", c: "#6F8FB5" }];
    const LH = 46, W = 640, H = 250, ML = 50, MR = 14, MT = 14, MB = 30;
    const nOut = $("#sr-n"), head = $("#sr-head"), lanesEl = $("#sr-lanes"), svg = $("#sr-svg"), play = $("#sr-play"), slider = $("#sr-t"), typeSel = $("#sr-type");
    const types = Object.keys(window.SPEED.gpu).sort();
    typeSel.innerHTML = '<option value="all">All dataset types</option>' + types.map((t) => `<option value="${t}">${t}</option>`).join("");
    lanesEl.style.height = ALG.length * LH + "px";
    lanesEl.innerHTML = ALG.map((a) => `<div class="sr-lane" style="--c:${a.c}"><span class="sr-lane__n">${a.name}</span><div class="sr-lane__track"><i></i></div><span class="sr-lane__v"></span><span class="sr-lane__t"></span></div>`).join("");
    const L = $$(".sr-lane", lanesEl);
    const rate = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + " G" : (n / 1e6 >= 100 ? (n / 1e6).toFixed(0) : (n / 1e6).toFixed(1)) + " M");
    let logs = [], lo = 0, hi = 1, p = 0, playing = false, raf = 0, last = 0;

    function compute() {
      const t = typeSel.value, set = window.SPEED[dev];
      logs = ALG.map((a) => NS.map((n) => {
        if (t !== "all") { const r = set[t][n]; return r[a.k] == null ? null : Math.log10(n / Math.max(r[a.k], 5e-7)); }
        let sn = 0, st = 0;
        Object.keys(set).forEach((ty) => { const r = set[ty][n]; if (r[a.k] != null) { sn += n; st += Math.max(r[a.k], 5e-7); } });
        return st ? Math.log10(sn / st) : null;
      }));
      const all = logs.flat().filter((v) => v != null);
      lo = Math.min(...all) - 0.15; hi = Math.max(...all) + 0.15;
    }
    function at(ai, x) {
      const row = logs[ai], i = Math.min(4, Math.max(0, Math.floor(x - 3))), f = Math.min(1, Math.max(0, x - 3 - i));
      if (row[i] == null || row[i + 1] == null) return row[i] != null ? row[i] : row[i + 1];
      return row[i] + (row[i + 1] - row[i]) * f;
    }
    const X = (x) => ML + ((x - 3) / 5) * (W - ML - MR), Y = (v) => MT + (1 - (v - lo) / (hi - lo)) * (H - MT - MB);
    function drawStatic() {
      let g = "";
      for (let e = 3; e <= 8; e++) g += `<line x1="${X(e)}" y1="${MT}" x2="${X(e)}" y2="${H - MB}" class="sr-grid"/><text x="${X(e)}" y="${H - 10}" class="sr-tick" text-anchor="middle">${e === 3 ? "1K" : e === 4 ? "10K" : e === 5 ? "100K" : e === 6 ? "1M" : e === 7 ? "10M" : "100M"}</text>`;
      for (let v = Math.ceil(lo); v <= Math.floor(hi); v++) g += `<line x1="${ML}" y1="${Y(v)}" x2="${W - MR}" y2="${Y(v)}" class="sr-grid"/><text x="${ML - 6}" y="${Y(v) + 3}" class="sr-tick" text-anchor="end">${v >= 9 ? "1G" : "1e" + v}</text>`;
      g += `<text x="12" y="${MT + 4}" class="sr-tick">elements / s</text>`;
      ALG.forEach((a, i) => {
        let d = ""; for (let s = 0; s <= 100; s++) { const x = 3 + (s / 100) * 5, v = at(i, x); if (v == null) continue; d += (d ? "L" : "M") + X(x).toFixed(1) + " " + Y(v).toFixed(1); }
        g += `<path d="${d}" class="sr-ghost" stroke="${a.c}"/><path id="sr-p${i}" class="sr-live" stroke="${a.c}" ${i === 0 ? 'stroke-width="3.2"' : ""}/>`;
        NS.forEach((n, j) => { if (logs[i][j] != null) g += `<circle cx="${X(j + 3)}" cy="${Y(logs[i][j])}" r="2.6" fill="#151210" stroke="${a.c}" stroke-width="1.2"/>`; });
      });
      g += `<line id="sr-cur" y1="${MT}" y2="${H - MB}" class="sr-cur"/>` + ALG.map((a, i) => `<circle id="sr-d${i}" r="4.6" fill="${a.c}" class="sr-dot"/>`).join("");
      svg.innerHTML = g;
    }
    function frame() {
      const x = 3 + p * 5, n = Math.round(Math.pow(10, x));
      nOut.textContent = n >= 1e6 ? (n / 1e6 >= 100 ? (n / 1e6).toFixed(0) : (n / 1e6).toFixed(1)) + " M" : nfmt(n);
      const cur = ALG.map((a, i) => ({ i, v: at(i, x) }));
      const ranked = cur.slice().sort((a, b) => (b.v == null ? -1e9 : b.v) - (a.v == null ? -1e9 : a.v));
      ranked.forEach((r, pos) => {
        const ln = L[r.i], thr = r.v == null ? null : Math.pow(10, r.v);
        ln.style.transform = `translateY(${pos * LH}px)`; ln.classList.toggle("lead", pos === 0);
        $(".sr-lane__track i", ln).style.width = (r.v == null ? 0 : Math.max(2, ((r.v - lo) / (hi - lo)) * 100)) + "%";
        $(".sr-lane__v", ln).textContent = thr == null ? "n/a" : rate(thr) + " /s";
        $(".sr-lane__t", ln).textContent = thr == null ? "" : fmt(n / thr);
      });
      const s = Math.pow(10, cur[0].v), others = cur.slice(1).filter((c) => c.v != null).map((c) => Math.pow(10, c.v)), ratio = s / Math.max(...others);
      head.innerHTML = ratio >= 1 ? `<b>SPCMP leads</b> by ${ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1)}x over the fastest other sort` : `<b class="trail">SPCMP trails</b> at ${ratio.toFixed(2)}x of the fastest other sort`;
      ALG.forEach((a, i) => {
        let d = ""; for (let st = 0; st <= Math.round(p * 100); st++) { const xx = 3 + (st / 100) * 5, v = at(i, xx); if (v == null) continue; d += (d ? "L" : "M") + X(xx).toFixed(1) + " " + Y(v).toFixed(1); }
        const pe = $("#sr-p" + i); if (pe) pe.setAttribute("d", d);
        const dot = $("#sr-d" + i), v = at(i, x); if (dot) { dot.setAttribute("cx", X(x)); dot.setAttribute("cy", v == null ? -10 : Y(v)); }
      });
      const cu = $("#sr-cur"); if (cu) { cu.setAttribute("x1", X(x)); cu.setAttribute("x2", X(x)); }
      slider.value = Math.round(p * 1000);
    }
    function tick(now) {
      if (!playing) return;
      p = Math.min(1, p + (now - last) / 15000); last = now; frame();
      if (p >= 1) { playing = false; play.innerHTML = "&#8635; Replay"; return; }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (p >= 1) p = 0; playing = true; play.innerHTML = "&#10074;&#10074; Pause"; last = performance.now(); raf = requestAnimationFrame(tick); }
    function stop() { playing = false; cancelAnimationFrame(raf); play.innerHTML = p >= 1 ? "&#8635; Replay" : "&#9654; Play"; }
    function rebuild() { compute(); drawStatic(); frame(); }
    play.addEventListener("click", () => (playing ? stop() : start()));
    slider.addEventListener("input", () => { stop(); p = slider.value / 1000; frame(); });
    typeSel.addEventListener("change", rebuild);
    document.addEventListener("benchdev", rebuild);
    rebuild();
    if (reduce) { p = 1; frame(); return; }
    new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { start(); o.disconnect(); } }), { threshold: 0.5 }).observe(root);
  }

  document.addEventListener("DOMContentLoaded", () => {
    $$("[data-bench-dev]").forEach((b) => b.addEventListener("click", () => applyDevice(b.dataset.benchDev)));
    applyDevice("gpu"); initSim(); initDeck(); initScale();
  });
})();

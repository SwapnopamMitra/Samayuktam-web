

(function () {
  "use strict";

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad2 = (n) => String(n).padStart(2, "0");

  function boot() {
    if (!window.gsap || !window.ScrollTrigger) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const root = document.documentElement;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const nav = document.querySelector(".site-nav");
    let vw = root.clientWidth, vh = window.innerHeight;

    const ptr = { x: vw / 2, y: vh / 2, sx: vw / 2, sy: vh / 2, nx: 0, ny: 0 };
    const setPtr = (x, y) => { ptr.x = x; ptr.y = y; };
    window.addEventListener("pointermove", (e) => { setPtr(e.clientX, e.clientY); ambient.classList.add("on"); }, { passive: true });
    document.addEventListener("pointerleave", () => setPtr(vw / 2, vh / 2));
    // phones: tilt the phone to look around (Android allows this without a prompt)
    if (!fine && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== "function") {
      window.addEventListener("deviceorientation", (e) => {
        if (e.gamma == null) return;
        setPtr(vw / 2 + clamp(e.gamma / 28, -1, 1) * vw / 2, vh / 2 + clamp(((e.beta || 50) - 50) / 28, -1, 1) * vh / 2);
      }, { passive: true });
    }

    const ambient = document.createElement("div");
    ambient.className = "film-ambient";
    document.body.prepend(ambient);

    let vel = 0, sv = 0;
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => { vel = self.getVelocity(); } });

    const timeline = document.querySelector(".timeline");
    if (timeline) {
      ScrollTrigger.create({
        trigger: timeline, start: "top 65%", end: "bottom 65%", scrub: true,
        onUpdate: (self) => timeline.style.setProperty("--tl", self.progress.toFixed(4))
      });
      timeline.querySelectorAll(".t-node").forEach((n) =>
        ScrollTrigger.create({ trigger: n, start: "top 65%", toggleClass: { targets: n, className: "is-lit" } }));
    }

    const drifters = [];
    document.querySelectorAll(".section-head h2, .t-node h3, .t-node .t-date").forEach((el) => {
      const depth = el.matches("h2") ? 7 : el.matches("h3") ? 6 : -4;
      const d = { el, depth, vis: false };
      drifters.push(d);
      new IntersectionObserver((en) => { d.vis = en[0].isIntersecting; }, { rootMargin: "10%" }).observe(el);
    });

    const tilters = [];
    document.querySelectorAll(".hero .portrait, .figure.proof, figure.figure:not(.frame), figure.print").forEach((el) => {
      if (el.closest(".reel")) return;
      const cs = getComputedStyle(el);
      const w = document.createElement("div");
      w.className = "gaze";
      if (cs.maxWidth !== "none") w.style.maxWidth = cs.maxWidth;
      if (el.matches(".portrait")) w.style.marginLeft = "auto";
      el.parentNode.insertBefore(w, el);
      w.appendChild(el);
      el.style.maxWidth = "none";
      if (el.matches(".portrait")) el.style.marginLeft = "0";
      const t = { el: w, rx: 0, ry: 0, vis: false };
      tilters.push(t);
      new IntersectionObserver((en) => { t.vis = en[0].isIntersecting; }, { rootMargin: "10%" }).observe(w);
    });

    const dot = document.querySelector(".cursor-dot");
    if (dot) document.querySelectorAll(".frame").forEach((f) => {
      f.addEventListener("mouseenter", () => dot.classList.add("hover"));
      f.addEventListener("mouseleave", () => dot.classList.remove("hover"));
    });

    const reels = [];
    const bleeds = [...document.querySelectorAll(".reel-bleed")];
    const nodeCount = document.querySelectorAll(".timeline .t-node").length;

    bleeds.forEach((bleed) => {
      const reel = bleed.querySelector(".reel");
      const track = bleed.querySelector(".reel__track");
      const viewport = bleed.querySelector(".reel__viewport");
      const cells = [...track.querySelectorAll(".frame")];
      if (!reel || !track || !cells.length) return;

      // which node is this reel illustrating? (the node right before it)
      let prev = bleed.previousElementSibling;
      while (prev && !prev.classList.contains("t-node")) prev = prev.previousElementSibling;
      const nodeIdx = prev ? [...prev.parentNode.querySelectorAll(".t-node")].indexOf(prev) + 1 : 0;

      // layers
      const ghostWrap = document.createElement("div");
      ghostWrap.className = "reel__ghosts"; ghostWrap.setAttribute("aria-hidden", "true");
      const ghosts = cells.slice(0, 4).map((c) => {
        const g = document.createElement("div");
        g.className = "ghost";
        g.style.backgroundImage = `url("${c.querySelector("img").getAttribute("src")}")`;
        ghostWrap.appendChild(g);
        return g;
      });
      const num = document.createElement("div");
      num.className = "reel__num"; num.setAttribute("aria-hidden", "true"); num.textContent = pad2(nodeIdx);
      const vig = Object.assign(document.createElement("div"), { className: "reel__vignette" });
      const grain = Object.assign(document.createElement("div"), { className: "reel__grain" });
      const hud = document.createElement("div");
      hud.className = "reel__hud"; hud.setAttribute("aria-hidden", "true");
      hud.innerHTML = `<span>Node <b>${pad2(nodeIdx)}</b> / ${pad2(nodeCount)}</span><span class="reel__count"></span>`;
      const bar = document.createElement("div");
      bar.className = "reel__bar"; bar.setAttribute("aria-hidden", "true"); bar.innerHTML = "<i></i>";
      const navBox = document.createElement("div");
      navBox.className = "reel__nav";
      navBox.innerHTML = '<button type="button" class="reel__btn" data-dir="-1" aria-label="Previous frame">\u2039</button>' +
        '<button type="button" class="reel__btn" data-dir="1" aria-label="Next frame">\u203A</button>' +
        '<a href="#" class="reel__skip">Skip reel \u2193</a>';
      navBox.querySelector(".reel__skip").addEventListener("click", (e) => {
        e.preventDefault();
        window.scrollTo({ top: bleed.getBoundingClientRect().bottom + window.scrollY - 40, behavior: "smooth" });
      });
      reel.append(navBox);
      reel.prepend(ghostWrap, num);
      reel.append(vig, grain, hud, bar);

      const R = {
        bleed, reel, track, viewport, cells, ghosts, num, count: hud.querySelector(".reel__count"), barFill: bar.firstChild,
        frames: cells.map((el) => ({ el, img: el.querySelector("img"), win: el.querySelector(".frame__img"), left: 0, w: 0, rx: 0, ry: 0, z: 0, s: 1 })),
        dist: 0, pad: 0, p: 0, target: 0, x: 0, idx: -1, revealed: false, st: null, man: 0, manS: 0, u: [0], Lp: 1, span: 0, loop: false, gs: 600
      };
      reels.push(R);
      R.count.textContent = `${pad2(1)} / ${pad2(cells.length)}`;
    });

    function measure() {
      vw = root.clientWidth; vh = window.innerHeight;
      const navH = nav ? nav.offsetHeight : 57;
      root.style.setProperty("--nav-h", navH + "px");
      reels.forEach((R) => {
        R.bleed.style.marginLeft = "0px"; R.bleed.style.width = "auto";
        const left = R.bleed.getBoundingClientRect().left;
        R.bleed.style.marginLeft = (-left) + "px"; R.bleed.style.width = vw + "px";
        R.frames.forEach((f) => {
          const fh = f.win.offsetHeight || 400;
          const ratio = f.img.naturalWidth && f.img.naturalHeight ? f.img.naturalWidth / f.img.naturalHeight : 1.6;
          const w = clamp(fh * ratio, fh * 0.75, Math.min(vw * 0.86, 1100));
          f.win.style.width = Math.round(w) + "px";
        });
        R.frames.forEach((f) => { f.left = f.el.offsetLeft; f.w = f.el.offsetWidth; f.c = f.left + f.w / 2; });
        const gap = parseFloat(getComputedStyle(R.track).columnGap) || 34;
        R.u = R.frames.map((f, i) => (i === 0 ? 0 : 0));
        for (let i = 1; i < R.frames.length; i++) R.u[i] = R.u[i - 1] + R.frames[i - 1].w / 2 + gap + R.frames[i].w / 2;
        const last = R.frames[R.frames.length - 1], first = R.frames[0];
        R.Lp = R.u[R.u.length - 1] + last.w / 2 + gap + first.w / 2;      // one full lap
        R.span = R.u[R.u.length - 1];
        const maxW = Math.max(...R.frames.map((f) => f.w));
        R.loop = R.frames.length > 2 && R.Lp / 2 > vw / 2 + maxW / 2 + 120;  // wrap only if the seam stays off-screen
        R.dist = R.loop ? R.Lp : R.span;
        R.rh = R.reel.offsetHeight;
        R.gs = Math.max(vw * 0.5, (R.dist * 0.42 + vw * 0.6) / R.ghosts.length);
        R.ghosts.forEach((g, i) => { g.dataset.base = String(i * R.gs); });
        R.runway = clamp(R.dist * 0.5, vh * 0.8, vh * 2.2);
        R.bleed.style.height = Math.round(R.rh + R.runway) + "px";
      });
    }

    let armed = false;
    function arm() {
      if (armed) return;
      armed = true;
      root.classList.add("film-on");
      measure();
      reels.forEach((R) => {
        R.st = ScrollTrigger.create({
          trigger: R.bleed, start: () => "top top+=" + (nav ? nav.offsetHeight : 57),
          end: () => "bottom top+=" + ((nav ? nav.offsetHeight : 57) + R.rh), invalidateOnRefresh: true,
          onUpdate: (self) => { R.target = self.progress; }
        });
        R.reel.classList.add("film-armed");
        new IntersectionObserver((en, io) => {
          if (en[0].isIntersecting) { reveal(R); io.disconnect(); }
        }, { rootMargin: "0px 0px -10% 0px" }).observe(R.reel);
        R.frames.forEach((f) => {
          const redo = () => { measure(); ScrollTrigger.refresh(); };
          if (f.img.complete && f.img.naturalWidth) return;
          f.img.addEventListener("load", redo, { once: true });
          f.img.addEventListener("error", () => { f.el.classList.add("is-missing"); redo(); }, { once: true });
        });
      });
      ScrollTrigger.refresh();
    }

    function reveal(R) {
      if (R.revealed) return;
      R.revealed = true;
      gsap.fromTo(R.frames.map((f) => f.win),
        { opacity: 0, filter: "blur(16px) brightness(1.8)" },
        { opacity: 1, filter: "blur(0px) brightness(1)", duration: 1.2, ease: "power3.out", stagger: 0.18, clearProps: "filter,opacity" });
      setTimeout(() => R.frames.forEach((f) => { f.win.style.opacity = 1; f.win.style.filter = "none"; }), 3500);
    }

    ScrollTrigger.addEventListener("refreshInit", () => { if (armed) measure(); });
    window.addEventListener("resize", () => { vw = root.clientWidth; vh = window.innerHeight; });
    window.addEventListener("load", () => { if (armed) { measure(); ScrollTrigger.refresh(); } });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (armed) ScrollTrigger.refresh(); });

    function tick() {
      // smooth pointer
      ptr.sx = lerp(ptr.sx, ptr.x, 0.09);
      ptr.sy = lerp(ptr.sy, ptr.y, 0.09);
      ptr.nx = (ptr.sx - vw / 2) / (vw / 2);
      ptr.ny = (ptr.sy - vh / 2) / (vh / 2);
      root.style.setProperty("--px", ptr.nx.toFixed(3));
      root.style.setProperty("--py", ptr.ny.toFixed(3));

      vel *= 0.88;
      sv = lerp(sv, vel, 0.14);

      gsap.set(ambient, { x: ptr.sx, y: ptr.sy });

      drifters.forEach((d) => {
        if (d.vis) gsap.set(d.el, { x: -ptr.nx * d.depth, y: -ptr.ny * d.depth * 0.6 });
      });

      tilters.forEach((t) => {
        if (!t.vis) return;
        const r = t.el.getBoundingClientRect();
        const dx = clamp((ptr.sx - (r.left + r.width / 2)) / (vw * 0.5), -1, 1);
        const dy = clamp((ptr.sy - (r.top + r.height / 2)) / (vh * 0.5), -1, 1);
        t.ry = lerp(t.ry, dx * 9, 0.12);
        t.rx = lerp(t.rx, -dy * 7, 0.12);
        gsap.set(t.el, { transformPerspective: 1100, rotationY: t.ry, rotationX: t.rx });
      });

      reels.forEach(tickReel);
    }

    const wrapD = (d, L) => ((d + L / 2) % L + L) % L - L / 2;

    function camT(R, target) {
      const q = clamp((R.p - 0.06) / 0.88, 0, 1);
      return { q, t: (R.loop ? q * R.Lp : q * R.span) + (target ? R.man : R.manS) };
    }
    function snap(R, dir) {
      const { t } = camT(R, true);       
      let best = null;
      const cands = [];
      for (let m = -3; m <= 3; m++) R.u.forEach((u) => cands.push(u + (R.loop ? m * R.Lp : 0)));
      if (dir === 0) best = cands.reduce((a, c) => (Math.abs(c - t) < Math.abs(a - t) ? c : a), cands[0]);
      else {
        const ahead = cands.filter((c) => (dir > 0 ? c > t + 4 : c < t - 4));
        if (!ahead.length) return;
        best = ahead.reduce((a, c) => (Math.abs(c - t) < Math.abs(a - t) ? c : a), ahead[0]);
      }
      R.man += best - t;
    }

    function tickReel(R) {
      const rect = R.bleed.getBoundingClientRect();
      if (rect.bottom < -vh * 0.5 || rect.top > vh * 1.5) return;      

      R.p = lerp(R.p, R.target, 0.12);                                 
      R.manS = lerp(R.manS, R.man, 0.1);
      const { q, t } = camT(R);

      gsap.set(R.track, { skewX: clamp(sv * -0.0045, -7, 7) });
      R.track.style.setProperty("--lead", (-(t % 34)).toFixed(1) + "px");

      const reelTop = R.reel.getBoundingClientRect().top;
      const cy = reelTop + R.rh / 2;
      let best = 0, bestAbs = Infinity;

      R.frames.forEach((f, i) => {
        let d = R.u[i] - t;
        if (R.loop) d = wrapD(d, R.Lp);
        const cx = vw / 2 + d;
        const n = d / (vw / 2);
        const nn = clamp(n, -1.3, 1.3), an = Math.abs(nn);
        if (Math.abs(d) < bestAbs) { bestAbs = Math.abs(d); best = i; }

        const dx = clamp((ptr.sx - cx) / (vw * 0.5), -1.2, 1.2);
        const dy = clamp((ptr.sy - cy) / (R.rh * 0.5), -1.2, 1.2);
        const ry = nn * -22 + dx * 9, rx = -dy * 7;
        const z = -Math.pow(an, 1.6) * 240, sc = 1 - Math.min(an, 1.4) * 0.05;
        f.ry = lerp(f.ry, ry, 0.2); f.rx = lerp(f.rx, rx, 0.2); f.z = lerp(f.z, z, 0.2); f.s = lerp(f.s, sc, 0.2);
        gsap.set(f.el, { x: cx - f.c, rotationY: f.ry, rotationX: f.rx, z: f.z, scale: f.s });
        gsap.set(f.img, { xPercent: -nn * 3 + ptr.nx * 1.4, yPercent: ptr.ny * 1.4, scale: 1.07 });
        f.el.style.setProperty("--gx", (50 + dx * 50).toFixed(1) + "%");
        f.el.style.setProperty("--gy", (50 + dy * 50).toFixed(1) + "%");
      });

      const G = R.gs * R.ghosts.length;
      R.ghosts.forEach((g) => {
        const gx = (((parseFloat(g.dataset.base || 0) - t * 0.42) % G) + G) % G - R.gs * 0.6;
        gsap.set(g, { x: gx - ptr.nx * 36, y: -ptr.ny * 24, scale: 1.08 });
      });
      gsap.set(R.num, { x: Math.sin((t / (R.Lp || 1)) * Math.PI * 2) * vw * 0.05 - ptr.nx * 22, y: -ptr.ny * 14 });

      if (best !== R.idx) { R.idx = best; R.count.innerHTML = `<b>${pad2(best + 1)}</b> / ${pad2(R.frames.length)}`; }
      gsap.set(R.barFill, { scaleX: q });
    }

    reels.forEach((R) => {
      R.reel.querySelectorAll(".reel__btn").forEach((b) =>
        b.addEventListener("click", () => snap(R, parseInt(b.dataset.dir, 10))));
      let down = null, idle = 0;
      R.reel.addEventListener("pointerdown", (e) => {
        if (e.target.closest(".reel__nav") || e.button > 0) return;
        down = { x: e.clientX, id: e.pointerId };
        R.reel.classList.add("is-drag");
      });
      window.addEventListener("pointermove", (e) => {
        if (!down || e.pointerId !== down.id) return;
        R.man -= (e.clientX - down.x) * 1.15;
        down.x = e.clientX;
      }, { passive: true });
      const up = () => { if (!down) return; down = null; R.reel.classList.remove("is-drag"); snap(R, 0); };
      window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
      R.reel.addEventListener("wheel", (e) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;           // vertical wheel always scrolls the page
        R.man += e.deltaX; clearTimeout(idle); idle = setTimeout(() => snap(R, 0), 180);
      }, { passive: true });
    });
    window.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (/input|textarea|select/i.test((e.target.tagName || ""))) return;
      const R = reels.find((r) => { const b = r.reel.getBoundingClientRect(); return b.top < vh * 0.5 && b.bottom > vh * 0.5; });
      if (R) snap(R, e.key === "ArrowRight" ? 1 : -1);
    });

    gsap.ticker.add(tick);
    arm();
    window.addEventListener("load", () => setTimeout(() => reels.forEach((R) => {
      if (!R.revealed) R.frames.forEach((f) => { f.win.style.opacity = 1; });
    }), 6000));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

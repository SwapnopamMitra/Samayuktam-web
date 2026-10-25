

document.addEventListener("DOMContentLoaded", () => {

  const forceReveal = () => document.querySelectorAll(".reveal-text, .reveal-image")
    .forEach(el => el.classList.add("is-revealed"));

  if (!window.gsap || !window.ScrollTrigger || !window.Lenis) {
    forceReveal();
    console.warn("Samayuktam: GSAP/Lenis failed to load from CDN — motion disabled, content shown as static.");
    initCursor();
    initTerminal();
    return;
  }

  const lenis = new Lenis({ duration: 1.2, smoothWheel: true, autoRaf: true });

  gsap.registerPlugin(ScrollTrigger);
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  if (document.querySelector(".hero")) {
    gsap.from(".hero h1 .word", { y: 16, opacity: 0, duration: .7, ease: "power3.out", stagger: .07, delay: .15 });
    gsap.from(".hero p.lede", { y: 20, opacity: 0, duration: .9, ease: "power3.out", delay: .5 });
    gsap.from(".hero .cta-row", { y: 20, opacity: 0, duration: .9, ease: "power3.out", delay: .65 });
    gsap.from(".hero .portrait", { scale: .94, opacity: 0, duration: 1.1, ease: "power3.out", delay: .35 });
  }

  document.querySelectorAll(".reveal-text, .reveal-image").forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: "top 88%", once: true,
      onEnter: () => el.classList.add("is-revealed")
    });
  });

  if (document.querySelector(".proof-image")) {
    gsap.fromTo(".proof-image", { y: 40 }, {
      y: -40, ease: "none",
      scrollTrigger: { trigger: ".proof-image", start: "top bottom", end: "bottom top", scrub: true }
    });
  }

  initCursor();
  initTerminal();
});

function initCursor() {
  const dot = document.querySelector(".cursor-dot");
  if (!dot || !matchMedia("(hover: hover)").matches) return;
  window.addEventListener("mousemove", e => { dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px"; });
  document.querySelectorAll("a, button, .figure, .pricing-card").forEach(el => {
    el.addEventListener("mouseenter", () => dot.classList.add("hover"));
    el.addEventListener("mouseleave", () => dot.classList.remove("hover"));
  });
}


function initTerminal() {
  const body = document.getElementById("terminal-body");
  if (!body || !window.TRACES) return;
  const titleEl = document.getElementById("terminal-title");
  const tabs = document.querySelectorAll(".term-tab");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeKey = document.querySelector(".term-tab.active")?.dataset.trace || "cagm";
  let runId = 0;
  let started = false;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function renderFinal(trace) {
    body.innerHTML = "";
    trace.lines.forEach(line => {
      const div = document.createElement("div");
      line.forEach(seg => {
        const span = document.createElement("span");
        if (seg.c) span.className = seg.c;
        span.textContent = seg.t;
        div.appendChild(span);
      });
      body.appendChild(div);
    });
  }

  async function typeLine(line, container, myRun) {
    for (const seg of line) {
      if (myRun !== runId) return;
      const span = document.createElement("span");
      if (seg.c) span.className = seg.c;
      container.appendChild(span);
      for (let i = 0; i < seg.t.length; i++) {
        if (myRun !== runId) return;
        span.textContent += seg.t[i];
        await sleep(seg.c === "term-dim" ? 4 : 9);
      }
    }
  }

  async function runTrace(key) {
    const myRun = ++runId;
    const trace = TRACES[key];
    titleEl.textContent = trace.title;
    body.innerHTML = "";
    const cursor = document.createElement("span");
    cursor.className = "cursor";

    for (let i = 0; i < trace.lines.length; i++) {
      if (myRun !== runId) return;
      const div = document.createElement("div");
      body.appendChild(div);
      div.appendChild(cursor);
      await typeLine(trace.lines[i], div, myRun);
      if (myRun !== runId) return;
      div.removeChild(cursor);
      await sleep(i === 0 ? 220 : 80);
    }
    if (myRun !== runId) return;
    await sleep(5000);
    if (myRun !== runId) return;
    runTrace(key);
  }

  function start(key) {
    activeKey = key;
    if (reduceMotion) { titleEl.textContent = TRACES[key].title; renderFinal(TRACES[key]); }
    else runTrace(key);
  }

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      start(btn.dataset.trace);
    });
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !started) { started = true; start(activeKey); io.unobserve(e.target); }
    });
  }, { threshold: .3 });
  io.observe(body);
}

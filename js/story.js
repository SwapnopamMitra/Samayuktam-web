
(function () {
  "use strict";
  function split(root) {
    const chars = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (!node.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const w = document.createElement("span"); w.className = "w";
        [...part].forEach((c) => { const s = document.createElement("span"); s.className = "ch"; s.textContent = c; w.appendChild(s); chars.push(s); });
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return chars;
  }
  function typer(chars) {
    let shown = 0;
    return (p) => {
      const n = Math.round(Math.min(1, Math.max(0, p)) * chars.length);
      if (n === shown) return;
      if (shown > 0) chars[shown - 1].classList.remove("cur");
      if (n > shown) for (let i = shown; i < n; i++) chars[i].classList.add("on");
      else for (let i = n; i < shown; i++) chars[i].classList.remove("on");
      if (n > 0 && n < chars.length) chars[n - 1].classList.add("cur");
      shown = n;
    };
  }
  function setup(text) {
    const story = text.closest(".story");
    const term = story.querySelector(".terminal-body");
    const merkle = story.querySelector(".merkle");
    const ms = text.closest(".t-node").querySelector(".milestones");
    const items = ms ? [...ms.querySelectorAll("li")] : [];

    text.classList.add("typing-on");
    const typeText = typer(split(text));
    let typeTerm = null;
    if (term) { term.classList.add("typing-on"); typeTerm = typer(split(term)); }

    ScrollTrigger.create({
      trigger: text, start: "top 72%", end: "bottom 58%", scrub: 0.3,
      onUpdate: (self) => {
        const p = self.progress;
        typeText(p);
        if (typeTerm) typeTerm((p - 0.3) / 0.62);
        if (ms) ms.style.setProperty("--ms", Math.min(1, p / 0.9).toFixed(3));
        [0, 0.42, 0.9].forEach((t, i) => items[i] && items[i].classList.toggle("is-lit", p >= t && (i === 0 ? p > 0.005 : true)));
        if (merkle) {
          merkle.classList.toggle("s-leaf", p > 0.12);
          merkle.classList.toggle("s-mid", p > 0.24);
          merkle.classList.toggle("s-root", p > 0.34);
          merkle.classList.toggle("s-broken", p > 0.5 && p < 0.82);   
        }
      }
    });
  }
  function boot() {
    const texts = [...document.querySelectorAll(".story__text")];
    if (!texts.length || !window.gsap || !window.ScrollTrigger) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    texts.forEach(setup);
    ScrollTrigger.refresh();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

(function () {
  "use strict";


  const ENVS = [
    { id: "prime",  label: "Prime \u00b7 WSL2",       cpu: "12th Gen Intel(R) Core(TM) i5-12450HX", py: "3.12.3",  sum: "2190.0",        hex: "00e00845", g: "B" },
    { id: "gdb",    label: "OnlineGDB",              cpu: "Intel(R) Xeon(R) CPU @ 2.80GHz",        py: "3.13.7",  sum: "2190.0",        hex: "00e00845", g: "B" },
    { id: "colab1", label: "Colab \u00b7 Xeon 2.00",  cpu: "Intel(R) Xeon(R) CPU @ 2.00GHz",        py: "3.13.16", sum: "2190.9140625",  hex: "a0ee0845", g: "A" },
    { id: "colab2", label: "Colab \u00b7 Xeon 2.20",  cpu: "Intel(R) Xeon(R) CPU @ 2.20GHz",        py: "3.13.16", sum: "2191.25390625", hex: "10f40845", g: "C" },
    { id: "colab3", label: "Colab \u00b7 EPYC 7B12",  cpu: "AMD EPYC 7B12",                         py: "3.13.16", sum: "2191.25390625", hex: "10f40845", g: "C" }
  ];
  const GROUPS = {
    A: { hex: "a0ee0845", sum: "2190.9140625" },
    B: { hex: "00e00845", sum: "2190.0" },
    C: { hex: "10f40845", sum: "2191.25390625" }
  };
  window.DIVERGENCE_ENVS = ENVS;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  function initCopy() {
    $$("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const text = btn.getAttribute("data-copy");
        try { await navigator.clipboard.writeText(text); }
        catch (e) {
          const ta = document.createElement("textarea");
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); } catch (_) {}
          ta.remove();
        }
        const old = btn.textContent;
        btn.textContent = "Copied"; btn.classList.add("done");
        setTimeout(() => { btn.textContent = old; btn.classList.remove("done"); }, 1400);
      });
    });
  }

  function setGroup(g) {
    $$("[data-g]").forEach((el) => {
      if (el.matches(".env-tab, .checker, .grp, .terminal-body, .term-res")) return;
      const on = g && el.getAttribute("data-g") === g;
      el.classList.toggle("hl", !!on);
      if (el.matches("tr[data-g]")) el.classList.toggle("dim", !!g && !on);
    });
  }
  function initHighlight() {
    const hoverables = $$("tr[data-g], .group-card[data-g], .spread__pt[data-g]");
    hoverables.forEach((el) => {
      el.addEventListener("mouseenter", () => setGroup(el.getAttribute("data-g")));
      el.addEventListener("mouseleave", () => setGroup(null));
    });
  }

  function initStagger() {
    $$(".ledger--stagger").forEach((t) => $$("tr", t).forEach((tr, i) => tr.style.setProperty("--i", i)));
  }

  function lines(env) {
    return [
      [{ t: "$ python3 prove_divergence.py", c: "term-cmd" }],
      [{ t: "=".repeat(60), c: "term-dim" }],
      [{ t: "HARDWARE & MEMORY TELEMETRY", c: "" }],
      [{ t: "=".repeat(60), c: "term-dim" }],
      [{ t: "CPU Model : ", c: "term-dim" }, { t: env.cpu, c: "" }],
      [{ t: "Python    : ", c: "term-dim" }, { t: env.py, c: "" }],
      [{ t: "=".repeat(60), c: "term-dim" }],
      [{ t: "", c: "" }],
      [{ t: "Running Architecture-Sensitive Sorting Divergence Experiment...", c: "term-dim" }],
      [{ t: "Sorted-Sum Result (Sum)   : ", c: "term-dim" }, { t: env.sum, c: "term-warn term-res" }],
      [{ t: "Sorted-Sum Hex View       : ", c: "term-dim" }, { t: env.hex, c: "term-warn term-res" }],
      [{ t: "=".repeat(60), c: "term-dim" }]
    ];
  }

  function initExplorer() {
    const body = $("#div-term-body");
    if (!body) return;
    const tabsBox = $("#env-tabs");
    const title = $("#div-term-title");
    let run = 0, started = false, activeId = ENVS[0].id;

    tabsBox.innerHTML = ENVS.map((e) =>
      `<button type="button" class="env-tab${e.id === activeId ? " active" : ""}" data-env="${e.id}" data-g="${e.g}"><i></i>${e.label}</button>`
    ).join("");

    const render = (env) => {
      body.innerHTML = "";
      lines(env).forEach((ln) => {
        const d = document.createElement("div");
        ln.forEach((s) => { const sp = document.createElement("span"); if (s.c) sp.className = s.c; sp.textContent = s.t; d.appendChild(sp); });
        body.appendChild(d);
      });
    };

    async function play(env) {
      const me = ++run;
      title.textContent = "prove_divergence.py \u00b7 " + env.label;
      body.style.setProperty("--g", `var(--grp${env.g})`);
      body.setAttribute("data-g", env.g);
      setGroup(env.g);
      if (reduce) { render(env); return; }
      body.innerHTML = "";
      const L = lines(env);
      for (let i = 0; i < L.length; i++) {
        if (me !== run) return;
        const div = document.createElement("div");
        body.appendChild(div);
        const cur = document.createElement("span"); cur.className = "cursor"; div.appendChild(cur);
        for (const seg of L[i]) {
          const sp = document.createElement("span"); if (seg.c) sp.className = seg.c;
          div.insertBefore(sp, cur);
          const fast = seg.c === "term-dim" || seg.t.length > 40;
          if (i === 0) { for (const ch of seg.t) { if (me !== run) return; sp.textContent += ch; await sleep(22); } }
          else { sp.textContent = seg.t; await sleep(fast ? 8 : 24); }
        }
        cur.remove();
        if (i === 0) await sleep(380);
        else if (i === 8) await sleep(650);
        else await sleep(55);
      }
      if (me !== run) return;
      $$(".term-res", body).forEach((el) => el.classList.add("flash"));
    }

    function select(id) {
      activeId = id;
      $$(".env-tab", tabsBox).forEach((b) => b.classList.toggle("active", b.dataset.env === id));
      play(ENVS.find((e) => e.id === id));
    }
    tabsBox.addEventListener("click", (e) => {
      const b = e.target.closest(".env-tab"); if (!b) return;
      started = true; select(b.dataset.env);
    });

    let cycle = null;
    const startCycle = () => {
      if (reduce) return;
      cycle = setInterval(() => {
        if (document.hidden) return;
        const i = ENVS.findIndex((e) => e.id === activeId);
        select(ENVS[(i + 1) % ENVS.length].id);
      }, 9000);
    };
    tabsBox.addEventListener("click", () => { clearInterval(cycle); }, true);
    body.addEventListener("pointerdown", () => clearInterval(cycle));

    new IntersectionObserver((en, io) => {
      if (en[0].isIntersecting) { io.disconnect(); select(activeId); startCycle(); }
    }, { threshold: .3 }).observe(body);
  }

  function initChecker() {
    const form = $("#div-check");
    if (!form) return;
    const input = $("input", form), out = $(".checker__out", form);
    const show = (html, cls) => {
      out.innerHTML = html; out.className = "checker__out show" + (cls ? " " + cls : "");
      void out.offsetWidth;
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const raw = input.value.trim().toLowerCase().replace(/^0x/, "").replace(/[^0-9a-f]/g, "");
      if (raw.length !== 8) {
        show("Expected the 8-character hex from <b>Sorted-Sum Hex View</b>.", "shake");
        setGroup(null); return;
      }
      const hit = Object.entries(GROUPS).find(([, v]) => v.hex === raw);
      if (hit) {
        const [g, v] = hit;
        const who = ENVS.filter((x) => x.g === g).map((x) => x.label).join(", ");
        show(`<span class="ok">Match &middot; Result ${g}</span> &mdash; sum <b>${v.sum}</b>. Same as: ${who}.`);
        setGroup(g);
      } else {
        const body = encodeURIComponent(
          "Hex view: " + raw + "\nSum: \nCPU model: \nPython version: \nNumPy version: \nOS / environment: \n");
        show(`<span class="new">No match &mdash; a fourth result.</span> That is new data. ` +
          `<a href="mailto:swapnopam@samayuktam.com?subject=Divergence%20result%20${raw}&body=${body}">Email it with your CPU model and Python/NumPy versions</a>.`);
        setGroup(null);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initCopy(); initStagger(); initHighlight(); initExplorer(); initChecker();
  });
})();

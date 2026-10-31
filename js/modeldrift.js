(function () {
  "use strict";

  const ENVS = [
    { id: "colabcpu", n: "1", label: "Colab CPU", device: "Intel Xeon @ 2.20GHz",
      hash: "67ed1ee52938f57d0c6d563eb84057e8a89aa164caf2186a0e64152dc23692a2",
      pre: null,
      meta: [["seed","42"],["device","\"cpu\""],["pytorch","\"2.11.0+cpu\""],["python","\"3.13.18\""],["os","\"Linux-6.6.159+-x86_64-with-glibc2.39\""],["cpu","{ \"cpu_name\": \"Intel(R) Xeon(R) CPU @ 2.20GHz\" }"],["gpu","null"],["cuda_version","null"],["cpu_threads_used_by_torch","2"],["final_loss","0.69410753"],["weights_sha256","\"67ed1ee52938f57d0c6d563eb84057e8a89aa164caf2186a0e64152dc23692a2\""]] },
    { id: "colabgpu", n: "2", label: "Colab GPU", device: "NVIDIA Tesla T4",
      hash: "0ae59421ab7821874cc8971673cc92743ade3d8b3244620893d17caf90a829d3",
      pre: null,
      meta: [["seed","42"],["device","\"cuda\""],["pytorch","\"2.11.0+cu130\""],["python","\"3.13.16\""],["os","\"Linux-6.6.159+-x86_64-with-glibc2.39\""],["cpu","{ \"cpu_name\": \"Intel(R) Xeon(R) CPU @ 2.00GHz\" }"],["gpu","\"Tesla T4\""],["cuda_version","\"13.0\""],["cpu_threads_used_by_torch","1"],["final_loss","0.69410753"],["weights_sha256","\"0ae59421ab7821874cc8971673cc92743ade3d8b3244620893d17caf90a829d3\""]] },
    { id: "tpu", n: "3", label: "TPU VM (host CPU)", device: "AMD EPYC 7B13",
      hash: "ef84b798c8020f0100c2864bb9956b783ea1da566b66d64ddc92a4dcc2e6aa2d",
      pre: "Successfully renamed PrivateUse1 backend to 'tpu'. Device: device(type='tpu')\nRegistered Python module for 'tpu'.\nDevice type: tpu, Device index: default\nInitializing TPU distributed runtime",
      meta: [["seed","42"],["device","\"cpu\""],["pytorch","\"2.14.1+cpu\""],["python","\"3.13.18\""],["os","\"Linux-6.6.159+-x86_64-with-glibc2.39\""],["cpu","{ \"cpu_name\": \"AMD EPYC 7B13\" }"],["gpu","null"],["cuda_version","null"],["cpu_threads_used_by_torch","12"],["final_loss","0.69410753"],["weights_sha256","\"ef84b798c8020f0100c2864bb9956b783ea1da566b66d64ddc92a4dcc2e6aa2d\""]] },
    { id: "runner", n: "4", label: "Python Runner", device: "Intel Xeon @ 2.80GHz",
      hash: "098cbd36d74178015a5ced2560e0a296b6d57fabbb33a7f3b2be2cabd6c868a4",
      pre: null,
      meta: [["seed","42"],["device","\"cpu\""],["pytorch","\"2.8.0\""],["python","\"3.13.7\""],["os","\"Linux-6.8.0-1070-gcp-x86_64-with-glibc2.40\""],["cpu","{ \"cpu_name\": \"Intel(R) Xeon(R) CPU @ 2.80GHz\" }"],["gpu","null"],["cuda_version","null"],["cpu_threads_used_by_torch","2"],["final_loss","0.69410753"],["weights_sha256","\"098cbd36d74178015a5ced2560e0a296b6d57fabbb33a7f3b2be2cabd6c868a4\""]] }
  ];
  const LOSS = "0.69410753";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  function setEnv(id) {
    $$("tr[data-e], .fp[data-e]").forEach((el) => {
      const on = id && el.dataset.e === id;
      el.classList.toggle("hl", !!on);
      el.classList.toggle("dim", !!id && !on);
    });
  }

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

  function initFingerprints() {
    const host = $("#fp-grid");
    if (!host) return;
    host.innerHTML = ENVS.map((e) => {
      const cells = [...e.hash].map((ch, k) => {
        const v = parseInt(ch, 16);
        return `<i style="--k:${k};--b:${(parseInt(e.n, 10) - 1) * 40};background:hsl(${Math.round(v * 22.5)},40%,${38 + (v % 4) * 6}%)"></i>`;
      }).join("");
      return `<div class="fp" data-e="${e.n}"><div class="fp__cells">${cells}</div>` +
        `<div class="fp__name">${e.label}</div>` +
        `<div class="fp__hash">${e.hash.slice(0, 8)}...</div>` +
        `<div class="fp__loss">loss ${LOSS}</div></div>`;
    }).join("");
    $$(".fp", host).forEach((el) => {
      el.addEventListener("mouseenter", () => setEnv(el.dataset.e));
      el.addEventListener("mouseleave", () => setEnv(null));
    });
  }

  function initTableHover() {
    $$("tr[data-e]").forEach((tr) => {
      tr.addEventListener("mouseenter", () => setEnv(tr.dataset.e));
      tr.addEventListener("mouseleave", () => setEnv(null));
    });
  }

  function initMeta() {
    const body = $("#md-meta-body");
    if (!body) return;
    const tabs = $("#md-env-tabs"), title = $("#md-meta-title");
    let active = ENVS[0].id;
    tabs.innerHTML = ENVS.map((e) =>
      `<button type="button" class="env-tab${e.id === active ? " active" : ""}" data-env="${e.id}" data-e="${e.n}"><i></i>${e.label}</button>`
    ).join("");

    const span = (cls, txt) => { const s = document.createElement("span"); if (cls) s.className = cls; s.textContent = txt; return s; };
    const render = (e) => {
      title.textContent = "run metadata \u00b7 " + e.label;
      body.innerHTML = "";
      body.setAttribute("data-e", e.n);
      if (e.pre) {
        e.pre.split("\n").forEach((l) => { const d = document.createElement("div"); d.appendChild(span("term-dim", l)); body.appendChild(d); });
        body.appendChild(document.createElement("div"));
      }
      const open = document.createElement("div"); open.appendChild(span("term-dim", "{")); body.appendChild(open);
      e.meta.forEach(([k, v], i) => {
        const d = document.createElement("div");
        d.appendChild(span("term-key", "  \"" + k + "\": "));
        const hot = k === "weights_sha256" || k === "final_loss";
        d.appendChild(span(hot ? (k === "final_loss" ? "term-ok" : "term-warn") : "term-str", v));
        if (i < e.meta.length - 1) d.appendChild(span("term-key", ","));
        body.appendChild(d);
      });
      const close = document.createElement("div"); close.appendChild(span("term-dim", "}")); body.appendChild(close);
    };
    const select = (id) => {
      active = id;
      $$(".env-tab", tabs).forEach((b) => b.classList.toggle("active", b.dataset.env === id));
      const e = ENVS.find((x) => x.id === id);
      render(e); setEnv(e.n);
    };
    tabs.addEventListener("click", (ev) => { const b = ev.target.closest(".env-tab"); if (b) select(b.dataset.env); });
    render(ENVS[0]);
  }

  function initChecker() {
    const form = $("#md-check");
    if (!form) return;
    const input = $("input", form), out = $(".checker__out", form);
    const show = (html, cls) => { out.innerHTML = html; out.className = "checker__out show" + (cls ? " " + cls : ""); void out.offsetWidth; };
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const raw = input.value.trim().toLowerCase().replace(/[^0-9a-f]/g, "");
      if (raw.length < 8 || raw.length > 64) {
        show("Paste the <b>weights_sha256</b> value (the full 64 characters, or at least the first 8).", "shake");
        setEnv(null); return;
      }
      const hit = ENVS.find((e) => e.hash.startsWith(raw));
      if (hit) {
        show(`<span class="ok">Match &middot; ${hit.label}</span>: ${hit.device}. Same weights hash as the recorded run.`);
        setEnv(hit.n);
      } else {
        const body = encodeURIComponent("weights_sha256: " + raw + "\nfinal_loss: \npytorch: \npython: \nCPU / GPU: \nOS / environment: \n");
        show(`<span class="new">No match: not one of the four recorded hashes.</span> ` +
          `<a href="mailto:swapnopam@samayuktam.com?subject=prove-model-drift%20result%20${raw.slice(0, 8)}&body=${body}">Email it with your run metadata</a>.`);
        setEnv(null);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initCopy(); initFingerprints(); initTableHover(); initMeta(); initChecker();
  });
})();

(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  
  function demo1() {
    const root = $("#ig1"); if (!root) return;
    const base = [0.42, 1.07, -0.33, 2.91, 0.08, -1.64, 0.75, 3.12, -0.51, 1.88, 0.20, -2.40];
    let vals = base.slice(), busy = false;
    const cells = $("#ig1-cells"), bytes = $("#ig1-bytes"), seal = $("#ig1-seal"), verdict = $("#ig1-verdict");
    cells.innerHTML = base.map((_, i) => `<div class="ig-cell"><b>#${i + 1}</b><span></span></div>`).join("");
    bytes.innerHTML = Array.from({ length: 28 }, () => "<i></i>").join("");
    const C = $$(".ig-cell", cells), B = $$("i", bytes);
    const paint = () => C.forEach((c, i) => { $("span", c).textContent = vals[i].toFixed(2); });
    const setSeal = (ok, t) => { seal.className = "ig-seal " + (ok ? "ok" : "bad"); $("span", seal).textContent = t; };
    const say = (cls, html) => { verdict.className = "ig-verdict show " + cls; verdict.innerHTML = html; };
    function reset() {
      vals = base.slice(); paint(); C.forEach((c) => (c.className = "ig-cell")); B.forEach((b) => (b.className = ""));
      setSeal(true, "commitment matches"); verdict.className = "ig-verdict"; verdict.innerHTML = "Pick an attack. Everything here is an illustration of the measured behaviour.";
    }
    const act = {
      value() { vals[4] = 0.09; paint(); C[4].classList.add("bad"); setSeal(false, "commitment does not match");
        say("rej", "<b>REJECTED.</b> One value changed in the decoded data, so the commitment no longer matches."); },
      swap() { [vals[2], vals[9]] = [vals[9], vals[2]]; paint(); C[2].classList.add("bad"); C[9].classList.add("bad"); setSeal(false, "commitment does not match");
        say("rej", "<b>REJECTED.</b> The values are all still there, but two sit in the wrong places. The original order is part of what is committed."); },
      frame() { B[17].classList.add("flip"); C.forEach((c) => c.classList.add("ok")); setSeal(true, "decoded content identical");
        say("pass", "<b>PASSES, and that is correct.</b> The bit changed inside the compression layer, the decoded data is byte-for-byte identical, so nothing the commitment covers has changed. 10 of the 38,440 flips in our test were this kind. Layer 2 is what catches it."); },
      forge() { vals[7] = 9.99; paint(); C[7].classList.add("forged"); B[3].classList.add("flip"); setSeal(true, "commitment matches (recomputed)");
        say("warn", "<b>PASSES, and that is the weakness.</b> Someone who can rewrite the file can also recompute the commitment stored inside it. Layer 1 detects corruption and edits that leave the commitment alone. It cannot authenticate who made the file. That is Layer 2&rsquo;s job."); },
    };
    $$(".ig-btns button", root).forEach((b) => b.addEventListener("click", () => {
      reset(); const k = b.dataset.act; if (act[k]) act[k]();
    }));
    $("#ig1-reset").addEventListener("click", reset);
    reset();
  }

  
  function demo2() {
    const root = $("#ig2"); if (!root) return;
    const NODES = [["Producer", "hash + sign"], ["Transfer", "file + manifest"], ["Signature", "exact file hash"], ["Content", "Layer 1 check"], ["Release", "version check"], ["Result", ""]];
    const flow = $("#ig2-flow"), verdict = $("#ig2-verdict");
    flow.innerHTML = NODES.map((n) => `<div class="ig-node"><em>&#9679;</em><span>${n[0]}</span><span>${n[1]}</span></div>`).join("");
    const N = $$(".ig-node", flow);
    const S = {
      genuine: { fail: -1, cls: "pass", msg: "<b>ACCEPTED.</b> Signature valid, file bytes match the signed hash, content commitment matches, release is the approved one." },
      forged: { fail: 2, cls: "rej", msg: "<b>QUARANTINED at the signature check.</b> The forger rewrote the file and recomputed its commitment, so Layer 1 alone would have passed it. Without the signing key they cannot produce a valid signature over the new file." },
      frame: { fail: 2, cls: "rej", msg: "<b>QUARANTINED at the exact-bytes check.</b> One bit changed inside the compression layer. The decoded data is identical, so Layer 1 would pass it, but the file&rsquo;s hash no longer matches the signed hash." },
      replay: { fail: 4, cls: "rej", msg: "<b>QUARANTINED at the release check.</b> The old file&rsquo;s signature is genuine and its content is intact, but a signature does not say a file is the newest. The signed manifest carries a release identifier, and the verifier rejects a release that is not the approved one." },
      wrong: { fail: -1, cls: "warn", msg: "<b>ACCEPTED, and every layer was right to.</b> The producer was authorised and the file is intact. Cryptography establishes integrity and provenance, not that the underlying result is correct. That needs business validation and execution evidence." },
    };
    let token = 0;
    async function run(k) {
      const my = ++token, s = S[k];
      N.forEach((n, i) => { n.className = "ig-node"; $("em", n).innerHTML = "&#9679;"; });
      N[5].lastElementChild.textContent = "";
      verdict.className = "ig-verdict"; verdict.innerHTML = "";
      for (let i = 0; i < 5; i++) {
        N[i].classList.add("on"); await sleep(520); if (my !== token) return;
        N[i].classList.remove("on");
        if (i === s.fail) {
          N[i].classList.add("fail"); $("em", N[i]).innerHTML = "&#10005;";
          for (let j = i + 1; j < 5; j++) N[j].classList.add("skip");
          N[5].classList.add("fail"); $("em", N[5]).innerHTML = "&#10005;"; N[5].lastElementChild.textContent = "quarantine + log";
          verdict.className = "ig-verdict show " + s.cls; verdict.innerHTML = s.msg; return;
        }
        N[i].classList.add("done"); $("em", N[i]).innerHTML = "&#10003;";
      }
      N[5].classList.add("done"); $("em", N[5]).innerHTML = "&#10003;"; N[5].lastElementChild.textContent = "accepted + log";
      verdict.className = "ig-verdict show " + s.cls; verdict.innerHTML = s.msg;
    }
    $$(".ig-btns button", root).forEach((b) => b.addEventListener("click", () => run(b.dataset.act)));
    verdict.className = "ig-verdict"; verdict.innerHTML = "Pick a scenario. Each one is checked in the order a real verifier would run it.";
  }

  
  function wall() {
    const cv = $("#ig-wall"); if (!cv) return;
    const COLS = 248, ROWS = 155, TOTAL = COLS * ROWS, HITS = 10, PX = 3;
    cv.width = COLS * PX; cv.height = ROWS * PX;
    const ctx = cv.getContext("2d");
    let seed = 20261031; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const hit = new Set(); while (hit.size < HITS) hit.add(Math.floor(rnd() * TOTAL));
    const tEl = $("#ig-tested"), rEl = $("#ig-rejected"), hEl = $("#ig-hits");
    let raf = 0, running = false;
    const draw = (i, final) => {
      const x = (i % COLS) * PX, y = Math.floor(i / COLS) * PX;
      if (hit.has(i)) { ctx.fillStyle = "#F2B04A"; ctx.fillRect(x - 1, y - 1, PX + 2, PX + 2); }
      else { ctx.fillStyle = final ? "#2f5d43" : "#7fbf92"; ctx.fillRect(x, y, PX - 1, PX - 1); }
    };
    function paintAll() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < TOTAL; i++) draw(i, true);
      tEl.textContent = TOTAL.toLocaleString("en-US"); rEl.textContent = (TOTAL - HITS).toLocaleString("en-US"); hEl.textContent = HITS;
    }
    function play() {
      if (running) return; cancelAnimationFrame(raf);
      if (reduce) { paintAll(); return; }
      running = true; ctx.clearRect(0, 0, cv.width, cv.height);
      let done = 0, h = 0; const per = 520, t0 = performance.now(), dur = 3600;
      const step = (now) => {
        const target = Math.min(TOTAL, Math.floor(((now - t0) / dur) * TOTAL));
        for (; done < target; done++) { draw(done, false); if (hit.has(done)) h++; }
        tEl.textContent = done.toLocaleString("en-US"); rEl.textContent = (done - h).toLocaleString("en-US"); hEl.textContent = h;
        if (done < TOTAL) raf = requestAnimationFrame(step);
        else { running = false; paintAll(); }
      };
      raf = requestAnimationFrame(step);
    }
    $("#ig-replay").addEventListener("click", () => { running = false; play(); });
    paintAll();
    let fired = false;
    new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting && !fired) { fired = true; play(); o.disconnect(); } }), { threshold: 0.35 }).observe(cv);
  }

  function reveal() {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-on"); io.unobserve(e.target);
      if (e.target.classList.contains("ig-time")) $$(".ig-step", e.target).forEach((st, i) => setTimeout(() => st.classList.add("is-lit"), reduce ? 0 : i * 560));
    }), { threshold: 0.2 });
    $$(".ig-time, .ig-table").forEach((el) => io.observe(el));
    $$(".ig-table tr").forEach((tr, i) => tr.style.setProperty("--r", i % 8));
  }

  document.addEventListener("DOMContentLoaded", () => { demo1(); demo2(); wall(); reveal(); });
})();
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  function chain() {
    const root = $("#chain"); if (!root) return;
    const track = $("#ch-track"), pk = $("#ch-pk"), banner = $("#ch-banner"), tabs = $("#ch-profiles"), threats = $("#ch-threats");
    const vals = [7, 2, 11, 4, 9, 1, 12, 5, 3, 10, 6, 8];
    const sorted = vals.slice().sort((a, b) => a - b), rank = vals.map((v) => sorted.indexOf(v));
    const tiles = vals.map((v) => {
      const t = document.createElement("i"); t.className = "ch-tile";
      t.style.background = `hsl(${40 - v * 2.6},${58 + v}%,${30 + v * 2.6}%)`; pk.appendChild(t); return t;
    });
    const scanEl = document.createElement("b"); scanEl.className = "ch-scan"; pk.appendChild(scanEl);
    const PROFILES = {
      core: [["data", "Your float32 data", "input"], ["canon", "Canonicalize", "SPCMP"], ["commit", "Commit", "SPCMP"], ["verify", "Content check", "verifier"], ["result", "Result", ""]],
      auth: [["data", "Your float32 data", "input"], ["canon", "Canonicalize + commit", "SPCMP"], ["sign", "Sign the file", "your key"], ["sigGate", "Signature gate", "verifier"], ["content", "Content check", "verifier"], ["result", "Result", ""]],
    };
    const BOUNDARY_BEFORE = 3;
    let profile = "core", sts = [], docks = [], token = 0, tamperSeed = 1;

    function build() {
      token++;
      const list = PROFILES[profile];
      track.innerHTML = "";
      list.forEach((s, i) => {
        if (i === BOUNDARY_BEFORE) track.insertAdjacentHTML("beforeend", '<div class="ch-bound"><span>trust boundary</span><em>&#9888;</em></div>');
        const gate = s[0] === "verify" || s[0] === "sigGate" || s[0] === "content";
        track.insertAdjacentHTML("beforeend", `<div class="ch-st${gate ? " ch-st--gate" : ""}" data-k="${s[0]}"><div class="ch-st__t"><b>${i + 1}</b><span>${s[1]}</span><small>${s[2]}</small></div><div class="ch-dock"></div>${gate ? '<div class="ch-gate"><u></u><u></u></div>' : ""}</div>`);
      });
      track.appendChild(pk);
      sts = $$(".ch-st", track); docks = $$(".ch-dock", track);
      $$("[data-th=key]", threats).forEach((b) => { b.disabled = profile === "core"; b.title = profile === "core" ? "Core Verification has no signature layer" : ""; });
      resetPk(); banner.className = "ig-verdict"; banner.innerHTML = "Pick a threat. Each run sends the same dataset down the chain.";
    }

    function layout(mode) {
      tiles.forEach((t, k) => {
        const idx = mode === "raw" ? k : rank[k], gap = mode === "sealed" ? 0 : 3;
        t.style.transitionDelay = k * 22 + "ms";
        t.style.transform = `translate(${(idx % 4) * (16 + gap)}px,${Math.floor(idx / 4) * (16 + gap)}px)`;
        t.style.borderRadius = mode === "sealed" ? "0" : "3px";
      });
    }
    function posOf(i) {
      const tr = track.getBoundingClientRect(), r = docks[i].getBoundingClientRect();
      return { x: r.left - tr.left + r.width / 2 - 36, y: r.top - tr.top + r.height / 2 - 27 };
    }
    function moveTo(i) { const p = posOf(i); pk.style.transform = `translate(${p.x}px,${p.y}px)`; }
    function resetPk() {
      pk.className = "ch-pk"; tiles.forEach((t) => { t.className = "ch-tile"; t.style.opacity = ""; });
      $$(".ch-notch", pk).forEach((n) => n.remove());
      pk.style.transition = "none"; layout("raw"); moveTo(0); void pk.offsetWidth; pk.style.transition = "";
      sts.forEach((s) => (s.className = s.className.replace(/\b(on|done|fail|skip|open)\b/g, "").trim()));
      $$(".ch-bound", track).forEach((b) => b.classList.remove("hot"));
    }

    function outcome(th) {
      if (profile === "core") {
        if (th === "value") return { fail: "verify", cls: "rej", msg: "<b>REJECTED at the content check.</b> A changed value no longer matches the commitment." };
        if (th === "bit") return { fail: null, cls: "warn", msg: "<b>ACCEPTED.</b> The decoded content is identical, so the content check passes. Core Verification does not look at the exact file bytes. Authenticated Verification does." };
        if (th === "forge") return { fail: null, cls: "warn", msg: "<b>ACCEPTED, and this is the limit of Core Verification.</b> The forger recomputed the commitment, so the file is self-consistent. Core Verification cannot tell who made it. Authenticated Verification can." };
        return { fail: null, cls: "pass", msg: "<b>ACCEPTED.</b> The commitment matches and the data comes back exactly as it went in." };
      }
      const why = {
        value: "The file bytes no longer match what the key signed. The content check never runs.",
        bit: "Even a change that leaves the decoded data identical is caught, because the exact bytes were signed.",
        forge: "The forger can recompute a commitment but cannot produce a valid signature without the private key.",
        key: "A signature from a different key is not accepted.",
      };
      if (th === "none") return { fail: null, cls: "pass", msg: "<b>ACCEPTED.</b> Signature valid, exact bytes match the signed hash, and the content check passes." };
      return { fail: "sigGate", cls: "rej", msg: "<b>REJECTED at the signature gate.</b> " + why[th] };
    }

    function applyThreat(th) {
      if (th === "value") { tiles[5].classList.add("bad"); }
      if (th === "bit") { const n = document.createElement("s"); n.className = "ch-notch"; pk.appendChild(n); }
      if (th === "forge") { tiles[7].classList.add("forged"); pk.classList.add("shimmer"); }
    }

    async function run(th) {
      const my = ++token; build(); token = my;
      const ok = () => my === token;
      const out = outcome(th), list = PROFILES[profile];
      await sleep(300); if (!ok()) return;
      for (let i = 0; i < list.length; i++) {
        const k = list[i][0];
        if (i > 0) { moveTo(i); await sleep(950); if (!ok()) return; }
        sts[i].classList.add("on");
        if (i === BOUNDARY_BEFORE) {
          if (th !== "none" && th !== "key") { const b = $(".ch-bound", track); b.classList.add("hot"); applyThreat(th); await sleep(900); if (!ok()) return; }
        }
        if (k === "canon") { layout("sorted"); await sleep(1000); if (profile === "auth") { layout("sealed"); pk.classList.add("sealed"); await sleep(800); } }
        if (k === "commit") { layout("sealed"); pk.classList.add("sealed"); await sleep(900); }
        if (k === "sign") { pk.classList.add("signed"); if (th === "key") pk.classList.add("alt"); await sleep(900); }
        if (!ok()) return;
        if (k === "verify" || k === "sigGate" || k === "content") {
          pk.classList.add("scanning"); await sleep(1000); pk.classList.remove("scanning"); if (!ok()) return;
          if (out.fail === k) {
            sts[i].classList.remove("on"); sts[i].classList.add("fail");
            for (let j = i + 1; j < list.length - 1; j++) sts[j].classList.add("skip");
            tiles.forEach((t, n) => { t.classList.add("scatter"); t.style.transitionDelay = n * 15 + "ms"; t.style.transform = `translate(${(n % 4) * 26 - 12 + (tamperSeed * 7 * n) % 14}px,${Math.floor(n / 4) * 18 - 4 + (n * 13) % 10}px) rotate(${(n * 47) % 70 - 35}deg)`; });
            pk.classList.add("broken"); await sleep(900);
            const last = sts[list.length - 1]; last.classList.add("fail"); banner.className = "ig-verdict show " + out.cls; banner.innerHTML = out.msg; return;
          }
          sts[i].classList.remove("on"); sts[i].classList.add("done", "open"); await sleep(450);
        } else { sts[i].classList.remove("on"); sts[i].classList.add("done"); }
      }
      moveTo(list.length - 1); await sleep(950); if (!ok()) return;
      layout("raw"); pk.classList.remove("sealed"); pk.classList.add("restored"); sts[list.length - 1].classList.add("done");
      await sleep(900); banner.className = "ig-verdict show " + out.cls; banner.innerHTML = out.msg;
    }

    tabs.addEventListener("click", (e) => {
      const b = e.target.closest(".env-tab"); if (!b) return;
      profile = b.dataset.p; $$(".env-tab", tabs).forEach((x) => x.classList.toggle("active", x === b)); build();
    });
    threats.addEventListener("click", (e) => { const b = e.target.closest("button[data-th]"); if (b && !b.disabled) run(b.dataset.th); });
    window.addEventListener("resize", () => { if (sts.length) { pk.style.transition = "none"; } });
    build();
  }

  document.addEventListener("DOMContentLoaded", chain);
})();

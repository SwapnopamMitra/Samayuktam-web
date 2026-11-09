(function () {
  var root = document.getElementById("pl");
  if (!root) return;
  var NS = "http://www.w3.org/2000/svg", svg = root.querySelector(".pl-svg");
  var P = [[60, 150], [195, 82], [330, 150], [465, 82], [600, 150], [735, 82], [465, 300], [600, 300]];
  var EX = [
    { t: "ML model release", n: ["Training run", "Signing (KMS)", "Model registry", "Verifier", "Ingestion gate", "Serving cluster"], f: "The verifier is one step in the gate that promotes a model from the registry to serving. Exit code 0 lets the model through. Anything else stops the deploy." },
    { t: "Data lake ingestion", n: ["Partner feed", "Signing (HSM)", "Landing bucket", "Verifier", "Ingestion gate", "Data lake"], f: "The verifier runs on each file in the landing bucket before the ingestion job reads it. Failed files stay in quarantine and the job moves on." },
    { t: "CI/CD release", n: ["Build server", "Signing (KMS)", "Artifact repo", "Verifier", "Deploy gate", "Production"], f: "The verifier runs as a pipeline stage after the artifact is fetched and before deploy. A non-zero exit fails the stage." },
    { t: "Float32 database export", p: 1, n: ["Your database", "SPCMP + signing", "Encrypted store", "Verifier", "Unsort", "Your database"], f: "Export the float32 columns to float32.bin, run spcmp, sign the manifest, then encrypt and store. On retrieval, decrypt, run verify_v2, unsort to restore float32.bin, apart from collapsed signed zeros and NaN payloads, and load it back. Encryption and key management stay with you." },
    { t: "Regulated archive", n: ["Records system", "Signing (HSM)", "Archive store", "Verifier", "Intake gate", "Auditor access"], f: "The verifier runs on retrieval, so an auditor receives data checked against the commitment sealed at write time." }
  ];
  var A = "The company's system produces a float32 file and seals it with a Layer 1 content commitment.";
  var SIGN = "The file is sealed and its manifest is signed as usual.";
  var S = [
    { t: "Valid file", k: 1, steps: [
      { n: 0, s: "", x: A },
      { n: 1, s: "ok", x: "The signing service signs a manifest with the company's private key." },
      { n: 2, s: "", x: "The file and manifest travel to storage or across the network." },
      { n: 3, s: "ok", x: "Layer 2 checks the signature, key ID, SHA-256 digest and size. All match." },
      { n: 3, s: "ok", x: "Layer 1 checks ordering, permutation and the commitment. All pass." },
      { n: 5, s: "ok", m: [7], x: "Accepted. Exit code 0. The gate lets the file through and the decision is logged." } ] },
    { t: "Altered in transit", k: 1, steps: [
      { n: 1, s: "ok", x: SIGN },
      { n: 2, s: "bad", a: 2, x: "An attacker changes bytes in the file and leaves the signed manifest as it was." },
      { n: 3, s: "bad", x: "The manifest signature is still valid, but the file's SHA-256 digest no longer matches it." },
      { n: 6, s: "bad", m: [7], x: "Rejected at Layer 2. Layer 1 never runs. Exit code 1." } ] },
    { t: "Manifest edited", k: 1, steps: [
      { n: 1, s: "ok", x: SIGN },
      { n: 2, s: "bad", a: 2, x: "An attacker edits the manifest, such as the file name, size or key ID, to fit a different file." },
      { n: 3, s: "bad", x: "The signature covers the original manifest, so signature verification fails." },
      { n: 6, s: "bad", m: [7], x: "Rejected at Layer 2. Exit code 1." } ] },
    { t: "Wrong key", k: 1, steps: [
      { n: 1, s: "ok", x: "The company signs with its own key. The verifier trusts only that public key and expects its key ID." },
      { n: 2, s: "bad", a: 2, x: "An attacker signs a manifest with a different key, or the manifest names a different key ID." },
      { n: 3, s: "bad", x: "The signature does not verify against the trusted key, or the key ID does not match. Layer 1 never runs." },
      { n: 6, s: "bad", m: [7], x: "Rejected at Layer 2. Exit code 1." } ] },
    { t: "Broken manifest", k: 1, steps: [
      { n: 1, s: "ok", x: SIGN },
      { n: 2, s: "bad", a: 2, x: "An attacker sends a damaged manifest or signature: invalid Base64, a wrong signature length, or missing, unknown or duplicate fields." },
      { n: 3, s: "bad", x: "The verifier parses the manifest strictly and rejects it before checking anything else." },
      { n: 6, s: "bad", m: [7], x: "Rejected at Layer 2. Exit code 1." } ] },
    { t: "Signed but invalid", k: 1, steps: [
      { n: 1, s: "warn", x: "A correctly signed file is produced, but its stored commitment root is wrong." },
      { n: 3, s: "ok", x: "Layer 2 passes. The signature, digest and size are genuine." },
      { n: 3, s: "bad", x: "Layer 1 recomputes the commitment and finds it differs from the stored root." },
      { n: 6, s: "bad", m: [7], x: "Rejected. Exit code 1. A valid signature alone cannot make a bad file acceptable." } ] },
    { t: "Permutation tampered", k: 1, steps: [
      { n: 1, s: "ok", x: SIGN },
      { n: 2, s: "bad", a: 2, x: "An attacker swaps or duplicates entries in the stored permutation, so unsorting would restore a different original order. Every index still looks valid on its own." },
      { n: 3, s: "bad", x: "Layer 1 recomputes the commitment and it no longer matches. Duplicate entries are also rejected directly." },
      { n: 6, s: "bad", m: [7], x: "Rejected. Exit code 1." } ] },
    { t: "Size bomb", k: 1, steps: [
      { n: 1, s: "ok", x: SIGN },
      { n: 2, s: "bad", a: 2, b: 1, l: "4 KB", x: "An attacker sends a tiny file built to expand into gigabytes when decompressed." },
      { n: 3, s: "bad", b: 1, l: "LIMIT", x: "The verifier hits its size limit and stops decompressing. In testing, oversize float and permutation payloads were rejected at the limit, and a huge declared element count was rejected on the count." },
      { n: 6, s: "bad", m: [7], x: "Rejected. Exit code 1." } ] },
    { t: "Malformed input", k: 1, steps: [
      { n: 1, s: "ok", x: SIGN },
      { n: 2, s: "bad", a: 2, x: "An attacker sends a malformed file: a bad header, a truncated body, or forged chunk metadata." },
      { n: 3, s: "bad", x: "Header, version, reserved bytes, element count and chunk metadata are validated. The tested malformed cases, including a forged 10,000 chunk block, were rejected." },
      { n: 6, s: "bad", m: [7], x: "Rejected. Exit code 1." } ] },
    { t: "Old file replayed", k: 0, steps: [
      { n: 1, s: "ok", x: "The company has signed several releases over time." },
      { n: 2, s: "warn", a: 2, x: "An attacker puts back a valid, signed file from an older release." },
      { n: 3, s: "warn", x: "This is a valid, signed file from an older release. The verifier does not check timestamps or sequence numbers. Replay protection must be handled by your ingestion pipeline checking a release ID." } ] },
    { t: "Stolen signing key", k: 0, steps: [
      { n: 1, s: "warn", a: 1, x: "An attacker gets hold of the company's private signing key." },
      { n: 3, s: "warn", x: "The attacker used the company's actual private key to forge this file. The signature is mathematically valid. Key theft must be prevented by HSM and KMS policies." } ] }
  ];

  function el(t, a, par) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (par) par.appendChild(e); return e; }
  function pts(l) { return l.map(function (q) { return q.join(","); }).join(" "); }
  var defs = el("defs", {}, svg), f = el("filter", { id: "plg", x: "-30%", y: "-30%", width: "160%", height: "160%" }, defs);
  el("feGaussianBlur", { stdDeviation: "3", result: "b" }, f);
  var fm = el("feMerge", {}, f); el("feMergeNode", { "in": "b" }, fm); el("feMergeNode", { "in": "SourceGraphic" }, fm);
  var fl = el("g", { "class": "pl-floor" }, svg), i;
  for (i = -400; i < 900; i += 80) el("line", { x1: i, y1: 0, x2: i + 800, y2: 400 }, fl);
  for (i = 0; i < 1300; i += 80) el("line", { x1: i, y1: 0, x2: i - 800, y2: 400 }, fl);
  function path(a, cls) {
    var l = a.map(function (n) { return P[n].join(","); }).join(" ");
    el("polyline", { points: l, "class": "pl-bed" }, svg);
    el("polyline", { points: l, "class": "pl-flow " + cls, filter: "url(#plg)" }, svg);
  }
  path([0, 1, 2, 3], "o"); path([3, 4, 5], "g"); path([3, 6], "r"); path([4, 7], "a");
  var nodes = [], names = [];
  P.forEach(function (c, n) {
    var x = c[0], y = c[1], w = 46, d = 23, h = n === 3 ? 40 : 26, g = el("g", { "class": "pl-node" }, svg);
    el("polygon", { points: pts([[x - w, y - h], [x, y + d - h], [x, y + d], [x - w, y]]) }, g);
    el("polygon", { points: pts([[x + w, y - h], [x, y + d - h], [x, y + d], [x + w, y]]) }, g);
    el("polygon", { points: pts([[x, y - d - h], [x + w, y - h], [x, y + d - h], [x - w, y - h]]), "class": "top" }, g);
    names[n] = el("text", { x: x, y: y + d + 18 }, g);
    if (n === 1) el("rect", { x: x - 7, y: y - h - 12, width: 14, height: 9, rx: 1.5, "class": "pl-key" }, g);
    if (n === 3) el("path", { d: "M0,-8 L9,-5 L9,3 Q9,10 0,13 Q-9,10 -9,3 L-9,-5Z", transform: "translate(" + x + "," + (y - h - 4) + ")", "class": "pl-shield" }, g);
    if (n === 4) el("polygon", { points: pts([[x - 12, y - h - 2], [x + 12, y - h - 2], [x, y - h - 14]]), "class": "pl-gate" }, g);
    if (n === 6) { el("polygon", { points: pts([[x, y - h - 18], [x + 10, y - h - 1], [x - 10, y - h - 1]]), "class": "pl-warn" }, g); el("text", { x: x, y: y - h - 5, "class": "bang" }, g).textContent = "!"; }
    nodes.push(g);
  });
  names[6].textContent = "Quarantine"; names[7].textContent = "Audit log"; names[3].textContent = "Verifier";
  var atk = el("g", { "class": "pl-atk" }, svg);
  el("circle", { r: 20, cy: 0, "class": "ring" }, atk); el("polygon", { points: "0,-12 11,0 0,12 -11,0" }, atk);
  el("text", { y: -26 }, atk).textContent = "ATTACKER";
  var tok = el("g", { "class": "pl-tok" }, svg), ti = el("g", { "class": "pl-tokin" }, tok);
  el("polygon", { points: "-9,-3 0,2 0,12 -9,7" }, ti); el("polygon", { points: "9,-3 0,2 0,12 9,7" }, ti); el("polygon", { points: "0,-8 9,-3 0,2 -9,-3", "class": "top" }, ti);
  var tl = el("text", { y: -22, "class": "tl" }, tok);

  var tabs = root.querySelector(".pl-tabs"), cap = root.querySelector(".pl-cap"), tag = root.querySelector(".pl-tag"), fit = root.querySelector(".pl-fit"), exb = root.querySelector(".pl-exb"), pipe = root.querySelector(".pl-pipe");
  var cnt = root.querySelector(".pl-count"), play = root.querySelector(".pl-play"), prev = root.querySelector(".pl-prev"), next = root.querySelector(".pl-next");
  var si = 0, st = 0, ei = 0, timer = null;
  S.forEach(function (sc, j) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = (j + 1) + ". " + sc.t;
    b.addEventListener("click", function () { stop(); go(j, 0); }); tabs.appendChild(b);
  });
  EX.forEach(function (e, j) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = e.t;
    b.addEventListener("click", function () { stop(); pick(j); go(si, st); }); exb.appendChild(b);
  });
  function pick(j) {
    ei = j; var e = EX[j];
    [0, 1, 2, 3, 4, 5].forEach(function (n) { if (n !== 3) names[n].textContent = e.n[n]; });
    fit.textContent = "Where it fits: " + e.f;
    pipe.hidden = !e.p;
    Array.prototype.forEach.call(exb.children, function (b, k) { b.className = k === j ? "on" : ""; });
  }
  function go(a, k) {
    si = a; st = k;
    var sc = S[si], p = sc.steps[st], c = P[p.n];
    Array.prototype.forEach.call(tabs.children, function (b, j) { b.className = j === si ? "on" : ""; });
    tag.textContent = sc.k ? "Attack I tested" : "Not stopped by the verifier";
    tag.className = "pl-tag " + (sc.k ? "ok" : "warn");
    tok.style.transform = "translate(" + c[0] + "px," + (c[1] - (p.n === 3 ? 52 : 38)) + "px)";
    ti.setAttribute("class", "pl-tokin" + (p.b ? " big" : "")); tl.textContent = p.l || "";
    nodes.forEach(function (g, j) { g.setAttribute("class", "pl-node" + (j === p.n && p.s ? " " + p.s : (j === p.n || (p.m && p.m.indexOf(j) > -1)) ? " cur" : "")); });
    if (p.a !== undefined) { atk.style.transform = "translate(" + P[p.a][0] + "px," + (P[p.a][1] - 78) + "px)"; atk.style.opacity = 1; } else atk.style.opacity = 0;
    cap.textContent = p.x; cap.className = "pl-cap " + p.s;
    cnt.textContent = "Step " + (st + 1) + " of " + sc.steps.length;
    prev.disabled = st === 0; next.disabled = st === sc.steps.length - 1;
  }
  function step(d) { var n = st + d; if (n >= 0 && n < S[si].steps.length) go(si, n); else stop(); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } play.textContent = "Play"; }
  play.addEventListener("click", function () {
    if (timer) { stop(); return; }
    if (st === S[si].steps.length - 1) go(si, 0);
    play.textContent = "Pause";
    timer = setInterval(function () { if (st >= S[si].steps.length - 1) stop(); else step(1); }, 2800);
  });
  prev.addEventListener("click", function () { stop(); step(-1); });
  next.addEventListener("click", function () { stop(); step(1); });
  root.className += " pl--js";
  pick(0); go(0, 0);
})();

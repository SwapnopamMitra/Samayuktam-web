(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BX = 0.8;

  const canvas = document.createElement("canvas");
  canvas.className = "beam-light";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);

  const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uFloor;
uniform float uFlick;
uniform float uSway;
uniform float uScale;
uniform float uFade;

float h21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vn(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x),
             mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  float asp = uRes.x / uRes.y;
  vec2 q = vec2(gl_FragCoord.x / uRes.y, 1.0 - gl_FragCoord.y / uRes.y);
  float t = uTime;
  float y = q.y;
  float fl = uFloor;
  float ff = mix(1.5, clamp(fl, 0.5, 1.5), uFade);
  float onScreen = 1.0 - smoothstep(1.1, 1.5, fl);

  float sway = 0.012 * sin(t * 0.5 + y * 3.0) + 0.006 * sin(t * 1.3 + y * 7.0) + uSway * 0.02 * y;
  float dx = q.x - asp * ${BX.toFixed(2)} - sway;
  if (abs(dx) > 0.6) { gl_FragColor = vec4(0.0); return; }

  float wb = mix(0.042, 0.018, smoothstep(0.0, ff, y)) * (1.0 + 0.06 * sin(t * 0.8));
  float u = dx / wb;
  float prof = exp(-u * u * 1.5);

  float rib = 0.6 + 0.8 * (0.6 * vn(vec2(u * 5.0 + 2.0, y * 0.7 - t * 0.3)) + 0.4 * vn(vec2(u * 12.0 + 9.0, y * 1.3 - t * 0.5)));
  float cut = 1.0 - 0.9 * uFade * smoothstep(fl - 0.01, fl + 0.05, y);
  float inten = mix(0.65, 1.0, smoothstep(0.0, ff, y));
  float beam = prof * rib * inten * cut * 0.85;
  float veil = exp(-u * u * 0.08) * 0.07 * cut * (0.5 + 0.5 * inten);

  float dyf = fl - y;
  float dy2 = dyf > 0.0 ? dyf : -dyf * 7.0;
  float bloom = exp(-dx * dx / 0.07) * exp(-dy2 * dy2 / 0.0045) * onScreen * uFade * (0.8 + 0.2 * sin(t * 1.7));
  float flare = exp(-dx * dx / 0.0025) * exp(-dy2 * dy2 / 0.0018) * onScreen * uFade * 1.1;

  float I = (beam + veil + bloom * 0.55 + flare) * uFlick;

  vec2 cell = floor(gl_FragCoord.xy / (2.0 * uScale)) + vec2(0.0, floor(t * 8.0));
  float density = prof * 0.55 + bloom * 0.5;
  float speck = step(0.94, h21(cell)) * density * cut * 1.2;

  vec3 warm = mix(vec3(0.95, 0.3, 0.05), vec3(1.0, 0.62, 0.16), clamp(I, 0.0, 1.0));
  vec3 light = warm * I + vec3(1.0, 0.85, 0.5) * smoothstep(0.9, 1.8, I) * 0.6 + vec3(1.0, 0.7, 0.3) * speck * 0.7 * uFlick;
  vec3 col = vec3(1.0) - exp(-light * 1.25);

  float m = max(col.r, max(col.g, col.b));
  col += (h21(gl_FragCoord.xy) - 0.5) * (1.0 / 200.0) * smoothstep(0.0, 0.03, m);
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}
`;

  let gl = null;
  let uni = {};

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }

  function initGL() {
    gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return false;
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    uni = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      floor: gl.getUniformLocation(prog, "uFloor"),
      flick: gl.getUniformLocation(prog, "uFlick"),
      sway: gl.getUniformLocation(prog, "uSway"),
      scale: gl.getUniformLocation(prog, "uScale"),
      fade: gl.getUniformLocation(prog, "uFade")
    };
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    return true;
  }

  function resize() {
    const cw = canvas.clientWidth || innerWidth;
    const ch = canvas.clientHeight || innerHeight;
    const scale = Math.min(devicePixelRatio || 1, 2) * scaleCur;
    const w = Math.max(2, Math.round(cw * scale));
    const h = Math.max(2, Math.round(ch * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (gl) gl.viewport(0, 0, w, h);
  }

  function flicker(t) {
    return 0.9 + 0.05 * Math.sin(t * 5.2) + 0.03 * Math.sin(t * 9.1 + 1.3) + 0.03 * Math.sin(t * 2.3 + 0.4);
  }

  function draw(t, floor, flk, sway, fade) {
    if (!gl) return;
    gl.uniform2f(uni.res, canvas.width, canvas.height);
    gl.uniform1f(uni.time, t);
    gl.uniform1f(uni.floor, floor);
    gl.uniform1f(uni.flick, flk);
    gl.uniform1f(uni.sway, sway);
    gl.uniform1f(uni.scale, canvas.width / innerWidth);
    gl.uniform1f(uni.fade, fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const panels = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) panels.add(e.target);
      else {
        panels.delete(e.target);
        e.target.style.removeProperty("--lit");
        e.target.style.removeProperty("--lx");
        e.target.__lit = null;
        e.target.__lx = null;
      }
    });
  });
  document.querySelectorAll(".glass").forEach((el) => io.observe(el));

  const nav = document.querySelector(".site-nav");

  function findFloor() {
    const bx = innerWidth * BX;
    const minTop = nav ? nav.offsetHeight : 60;
    let hit = null;
    let hitTop = Infinity;
    panels.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.left <= bx && r.right >= bx && r.top > minTop && r.top < innerHeight && r.top < hitTop) {
        hit = el;
        hitTop = r.top;
      }
    });
    return { hit, top: hit ? hitTop : null };
  }

  function updatePanels(flk, hit, hitTop) {
    const vh = innerHeight;
    const bx = innerWidth * BX;
    panels.forEach((el) => {
      const r = el.getBoundingClientRect();
      let lit = 0;
      if (el === hit) lit = 1;
      else if (hit) {
        const gx = Math.max(r.left - bx, 0, bx - r.right);
        const dy = r.top - hitTop;
        lit = 0.6 * Math.exp(-(gx * gx) / (260 * 260)) * Math.exp(-(dy * dy) / ((vh * 0.15) * (vh * 0.15)));
      }
      const litV = (lit * flk).toFixed(2);
      const lxV = Math.min(r.width, Math.max(0, bx - r.left)).toFixed(0) + "px";
      if (el.__lit !== litV) { el.__lit = litV; el.style.setProperty("--lit", litV); }
      if (el.__lx !== lxV) { el.__lx = lxV; el.style.setProperty("--lx", lxV); }
    });
  }

  let floor = 3;
  let pointerX = 0;
  let sway = 0;
  let scaleCur = 1;

  addEventListener("pointermove", (e) => { pointerX = (e.clientX / innerWidth - 0.5) * 2; }, { passive: true });

  const webgl = initGL();
  root.classList.add("beam-on");
  if (!webgl) root.classList.add("beam-css");

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    gl = null;
    root.classList.add("beam-css");
  });

  resize();

  if (reduceMotion) {
    const still = () => {
      const f = findFloor();
      floor = f.top === null ? 3 : f.top / innerHeight;
      draw(3.0, floor, flicker(3.0), 0, 1);
      updatePanels(flicker(3.0), f.hit, f.top);
    };
    addEventListener("resize", () => { resize(); still(); });
    addEventListener("scroll", still, { passive: true });
    still();
    return;
  }

  addEventListener("resize", resize);

  const t0 = performance.now();
  let found = { hit: null, top: null };
  let lastHit = null;
  let fade = 1;
  let switching = false;
  let lastScan = -1000;
  let lastPanel = -1000;
  let lastNow = performance.now();
  let slow = 0;
  let dirty = true;

  addEventListener("scroll", () => { dirty = true; }, { passive: true });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastNow) / 1000);
    lastNow = now;
    const t = (now - t0) / 1000;

    if (dirty || now - lastScan > 120) {
      found = findFloor();
      lastScan = now;
      dirty = false;
      if (found.hit !== lastHit) {
        lastHit = found.hit;
        switching = true;
      }
    }

    const target = found.top === null ? 3 : found.top / innerHeight;
    if (switching) {
      fade -= dt / 0.22;
      if (fade <= 0) {
        fade = 0;
        floor = target;
        switching = false;
      }
    } else {
      fade = Math.min(1, fade + dt / 0.45);
      floor += (target - floor) * (1 - Math.exp(-dt * 16));
    }
    sway += (pointerX - sway) * (1 - Math.exp(-dt * 2.5));

    const flk = flicker(t);
    draw(t, floor, flk, sway, fade * fade * (3 - 2 * fade));

    if (now - lastPanel > 90) {
      lastPanel = now;
      updatePanels(flk, found.hit, found.top);
    }

    if (dt > 0.024) slow++;
    else slow = Math.max(0, slow - 1);
    if (slow > 40 && scaleCur > 0.6) {
      slow = 0;
      scaleCur -= 0.2;
      resize();
    }
  }
  requestAnimationFrame(frame);
})();

(function () {
  "use strict";
  var lb, img, cap, fullBtn, last, group = [], gi = 0;
  function build() {
    lb = document.createElement("div");
    lb.className = "lb";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Image viewer");
    lb.setAttribute("data-lenis-prevent", "");
    lb.innerHTML = '<div class="lb__bar"><span class="lb__cap"></span>' +
      '<button type="button" class="lb__btn lb__nav" data-act="prev">Prev</button>' +
      '<button type="button" class="lb__btn lb__nav" data-act="next">Next</button>' +
      '<button type="button" class="lb__btn" data-act="zoom">Actual size</button>' +
      '<button type="button" class="lb__btn" data-act="close">Close (Esc)</button></div>' +
      '<div class="lb__stage"><img class="lb__img" alt=""></div>';
    document.body.appendChild(lb);
    img = lb.querySelector(".lb__img");
    cap = lb.querySelector(".lb__cap");
    fullBtn = lb.querySelector('[data-act="zoom"]');
    lb.addEventListener("click", function (e) {
      var act = e.target.getAttribute && e.target.getAttribute("data-act");
      if (act === "close" || e.target.classList.contains("lb__stage")) close();
      else if (act === "prev") step(-1);
      else if (act === "next") step(1);
      else if (act === "zoom" || e.target === img) toggle();
    });
  }
  function toggle() {
    var full = lb.classList.toggle("is-full");
    fullBtn.textContent = full ? "Fit to screen" : "Actual size";
  }
  function show(el) {
    img.src = el.currentSrc || el.src; img.alt = el.alt || ""; cap.textContent = el.alt || "";
    lb.classList.remove("is-full"); fullBtn.textContent = "Actual size";
  }
  function step(d) {
    if (!group.length) return;
    gi = (gi + d + group.length) % group.length; last = group[gi]; show(last);
  }
  function open(src, alt, trigger) {
    if (!lb) build();
    last = trigger;
    var g = trigger && trigger.getAttribute && trigger.getAttribute("data-group");
    group = g ? Array.prototype.slice.call(document.querySelectorAll('img[data-group="' + g + '"]')) : [];
    gi = Math.max(0, group.indexOf(trigger));
    lb.classList.toggle("has-group", group.length > 1);
    img.src = src; img.alt = alt || ""; cap.textContent = alt || "";
    lb.classList.remove("is-full"); fullBtn.textContent = "Actual size";
    lb.classList.add("is-open");
    document.documentElement.style.overflow = "hidden";
    lb.querySelector('[data-act="close"]').focus();
  }
  function close() {
    lb.classList.remove("is-open", "is-full");
    document.documentElement.style.overflow = "";
    if (last && last.focus) last.focus();
  }
  function wire(el) {
    el.setAttribute("data-zoom", "");
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Inspect image: " + (el.alt || "enlarge"));
    el.addEventListener("click", function () { open(el.currentSrc || el.src, el.alt, el); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(el.currentSrc || el.src, el.alt, el); }
    });
  }
  document.addEventListener("keydown", function (e) {
    if (!lb || !lb.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "z" || e.key === "Z") toggle();
  });
  function boot() { document.querySelectorAll(".print img, img[data-zoom]").forEach(wire); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

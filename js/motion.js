

document.addEventListener("DOMContentLoaded", () => {
  if (window.Lenis) {
    new Lenis({ duration: 1.1, smoothWheel: true, autoRaf: true });
  }

  const revealEls = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));

  document.querySelectorAll(".hero h1 .word").forEach((w, i) => {
    w.style.animationDelay = (i * 0.07) + "s";
  });

  const dot = document.querySelector(".cursor-dot");
  if (dot && matchMedia("(hover: hover)").matches) {
    window.addEventListener("mousemove", e => {
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
    });
    document.querySelectorAll("a, button, .figure, .pricing-card").forEach(el => {
      el.addEventListener("mouseenter", () => dot.classList.add("hover"));
      el.addEventListener("mouseleave", () => dot.classList.remove("hover"));
    });
  }
});

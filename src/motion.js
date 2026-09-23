// Each app's phone rises out of its panel as you scroll to it: tucked 62% below the panel's edge when
// its slot reaches the bottom of the screen, fully up once the slot is 40% of a screen higher.
// Scrolling back lowers it again. Nothing moves for anyone with Reduce Motion on.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const slots = [...document.querySelectorAll(".panel .rise")];
  if (!slots.length) return;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  let queued = false;
  function place() {
    queued = false;
    const vh = innerHeight;
    for (const slot of slots) {
      const t = Math.min(1, Math.max(0, (vh - slot.getBoundingClientRect().top) / (vh * 0.4)));
      slot.closest(".panel").style.setProperty("--drop", ((1 - ease(t)) * 62).toFixed(2));
    }
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(place); } };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  place();
})();

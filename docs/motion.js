// Each app's phone rises into place as you scroll to it: 90px low when its stage reaches the bottom
// of the screen, settled once the stage is 40% of a screen higher. Scrolling back lowers it again.
// Nothing moves for anyone with Reduce Motion on.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const phones = [...document.querySelectorAll(".showcase .device")];
  if (!phones.length) return;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  let queued = false;
  function place() {
    queued = false;
    const vh = innerHeight;
    for (const phone of phones) {
      const top = phone.closest(".stage").getBoundingClientRect().top;
      const t = Math.min(1, Math.max(0, (vh - top) / (vh * 0.4)));
      phone.style.setProperty("--lift", `${((1 - ease(t)) * 90).toFixed(1)}px`);
    }
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(place); } };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  place();
})();

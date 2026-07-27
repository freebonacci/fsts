/* ============================================================================
   From Seed to Shelter — sticky header

   The only JavaScript on the site, and it is pure progressive enhancement.
   `position: sticky` and the Slate background are in the stylesheet, so with
   this file blocked or JS off the header is a normal bar pinned to the top of
   the viewport — nothing is hidden and nothing is broken.

   All this adds is one class: .site-header--hidden, on scroll down, removed on
   scroll up. No dependencies, no build step, no polyfills.
   ========================================================================== */

(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  if (!header) return;

  /* prefers-reduced-motion: the bar stays put. No sliding, no class, no
     listeners at all — the stylesheet neutralises the transform as well. */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce && reduce.matches) return;

  var HIDDEN = "site-header--hidden";

  /* Scroll is noisy — trackpads and momentum scrolling emit sub-pixel jitter in
     both directions. Ignore anything under this so the bar does not flicker. */
  var THRESHOLD = 6;

  var last = window.pageYOffset;
  var queued = false;

  function update() {
    queued = false;

    var y = window.pageYOffset;
    var delta = y - last;

    /* Always visible at the top of the page, including the rubber-band
       overscroll above it where y can go negative. */
    if (y <= header.offsetHeight) {
      header.classList.remove(HIDDEN);
    } else if (delta > THRESHOLD) {
      header.classList.add(HIDDEN);
    } else if (delta < -THRESHOLD) {
      header.classList.remove(HIDDEN);
    } else {
      return;   /* below the threshold: leave `last` alone so small moves
                   accumulate rather than being swallowed one frame at a time */
    }

    last = y;
  }

  window.addEventListener("scroll", function () {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }, { passive: true });

  /* Never leave a focused link off-screen: tabbing into the nav from the skip
     link, or back to it, must bring the bar with it. */
  header.addEventListener("focusin", function () {
    header.classList.remove(HIDDEN);
    last = window.pageYOffset;
  });
})();

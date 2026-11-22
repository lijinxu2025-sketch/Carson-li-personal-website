/* Scroll-to-play website rolls on case-study pages: wheel over the video frame
   scrubs the page-scroll video; playback resumes after a moment of stillness.
   The listener sits on the whole showcase because its hover caption overlays the
   frame — a hit-test keeps scrubbing limited to the frame area so the page still
   scrolls normally over the aurora background. */
(function () {
  document.querySelectorAll('video[data-scrub]').forEach(function (v) {
    var frame = v.closest('.cs-showcase-frame') || v.parentElement;
    var zone = v.closest('.cs-showcase') || frame;
    var target = 0, raf = null, idle = null, scrubbing = false;
    function loop() {
      var d = target - v.currentTime;
      if (Math.abs(d) > 0.02) {
        v.currentTime = v.currentTime + d * 0.28;
        raf = requestAnimationFrame(loop);
      } else { raf = null; }
    }
    zone.addEventListener('wheel', function (e) {
      if (!v.duration) return;
      var r = frame.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      e.preventDefault();
      if (!scrubbing) {
        scrubbing = true;
        v.pause();
        target = v.currentTime;
        var hint = zone.querySelector('.lb-scrub-hint');
        if (hint) hint.classList.add('is-hidden');
      }
      target = Math.max(0, Math.min(v.duration - 0.05, target + e.deltaY * (v.duration / 3500)));
      if (!raf) raf = requestAnimationFrame(loop);
      clearTimeout(idle);
      idle = setTimeout(function () { scrubbing = false; v.play().catch(function () {}); }, 2200);
    }, { passive: false });
  });
})();

const wrapper = document.querySelector('.hero-wrapper');
const heroSticky = document.querySelector('.hero-sticky');

// The original scroll-scrub video hero has been replaced by a static,
// resume-led editorial cover. Keep the element stable and let the shared
// post-hero behavior below handle navigation and section reveals.
if (heroSticky) {
  heroSticky.style.willChange = 'auto';
  heroSticky.style.transform = 'none';
  heroSticky.style.opacity = '1';
}

/* ============================================================
   POST-HERO BEHAVIOR (does not touch the hero animation above)
   - Reveal the nav once the hero is scrolled past
   - Fade content sections in on scroll
   - Highlight the active nav link
   ============================================================ */
(function () {
  const nav = document.querySelector('[data-nav]');
  const heroWrapper = document.querySelector('.hero-wrapper');

  // Show nav once we're near the end of the hero scroll zone. The bottom
  // progressive-blur is hidden while the hero fills the screen, then revealed.
  const scrollBlur = document.querySelector('.scroll-blur');
  if (nav && heroWrapper) {
    const onScroll = () => {
      const trigger = Math.max(0, heroWrapper.offsetHeight - window.innerHeight * 0.2);
      const past = window.scrollY > trigger;
      nav.classList.toggle('show', past);
      if (scrollBlur) scrollBlur.classList.toggle('hide', !past);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Reveal-on-scroll for content blocks.
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // Video thumbnails and flagship covers: load and play only while on screen (saves bandwidth for visitors who never scroll there).
  const indieVids = document.querySelectorAll('video.indie-bg, video.flag-cover-bg');
  if ('IntersectionObserver' in window && indieVids.length) {
    const vidSpy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.play().catch(() => {});
        else e.target.pause();
      });
    }, { rootMargin: '200px 0px' });
    indieVids.forEach((v) => vidSpy.observe(v));
  } else {
    indieVids.forEach((v) => { v.autoplay = true; v.play().catch(() => {}); });
  }

  // Sticky flagship menu: highlight the project currently in view.
  const flagLinks = Array.from(document.querySelectorAll('.flag-menu a'));
  const flagMap = new Map();
  flagLinks.forEach((a) => {
    const sec = document.getElementById(a.dataset.flag);
    if (sec) flagMap.set(sec, a);
  });
  if ('IntersectionObserver' in window && flagMap.size) {
    const flagSpy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          flagLinks.forEach((a) => a.classList.remove('active'));
          const link = flagMap.get(e.target);
          if (link) link.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    flagMap.forEach((_, sec) => flagSpy.observe(sec));
  }


  /* Flagship covers fill their frame and scroll normally with the page
     (the Mugen-style parallax cutout was removed). */

  /* Each flagship cover is clickable, same target as its "View case study"
     button — the page-zoom view transition fires on the resulting navigation. */
  document.querySelectorAll('.flag').forEach((flag) => {
    const cover = flag.querySelector('.flag-cover');
    const cta = flag.querySelector('.cta');
    if (!cover || !cta) return;
    cover.addEventListener('click', () => {
      window.location.href = cta.getAttribute('href');
    });
  });

  /* ----------------------------------------------------------
     Approach "process" — pinned horizontal scroll.
     The section is taller than the viewport; while it's pinned
     (sticky child stuck at top), vertical scroll progress drives
     the track sideways. On touch / reduced-motion the CSS falls
     back to a native horizontal swipe, so JS stays idle there.
  ---------------------------------------------------------- */
  const pin = document.querySelector('[data-approach-pin]');
  if (pin) {
    const track = pin.querySelector('.approach-track');
    const mq = window.matchMedia(
      '(min-width: 760px) and (prefers-reduced-motion: no-preference)'
    );
    // how much vertical scroll the sideways travel is spread over: higher =
    // slower horizontal movement per scroll (1 = 1:1, 2.4 ≈ 2.4× slower).
    const SCROLL_SLOWNESS = 2.4;
    let dist = 0, pinTop = 0, pinMax = 1;
    // where supported, the slide runs as a CSS scroll-driven animation on the
    // compositor (in lockstep with the scroll); JS only supplies the distance
    const sdt = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
    // positions are cached in measurePin, so a scroll frame only reads scrollY
    // (reading layout here would force a full reflow behind the animated cards)
    const paintPin = () => {
      if (!mq.matches || dist <= 0 || sdt) return;
      let p = (window.scrollY - pinTop) / pinMax;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      track.style.transform = 'translateX(' + (-p * dist).toFixed(1) + 'px)';
    };
    const measurePin = () => {
      if (!mq.matches) {
        pin.style.height = '';
        track.style.transform = '';
        pin.classList.remove('is-sdt');
        dist = 0;
        return;
      }
      dist = Math.max(0, track.scrollWidth - window.innerWidth);
      pin.style.height = window.innerHeight + dist * SCROLL_SLOWNESS + 'px';
      if (sdt) {
        track.style.transform = '';
        track.style.setProperty('--approach-dist', -dist + 'px');
        pin.classList.add('is-sdt');
      }
      pinTop = pin.getBoundingClientRect().top + window.scrollY;
      pinMax = Math.max(1, pin.offsetHeight - window.innerHeight);
      paintPin();
    };
    let pinTick = false;
    const onPin = () => {
      if (!pinTick) {
        pinTick = true;
        requestAnimationFrame(() => {
          pinTick = false;
          paintPin();
        });
      }
    };
    measurePin();
    if (!sdt) window.addEventListener('scroll', onPin, { passive: true });
    window.addEventListener('resize', measurePin);
    window.addEventListener('load', measurePin);   // late fonts/images above can shift the pin
    if (mq.addEventListener) mq.addEventListener('change', measurePin);
  }

  // Active nav link based on the section in view.
  const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
  const linkMap = new Map();
  navLinks.forEach((a) => {
    const id = a.getAttribute('href').replace('#', '');
    const sec = document.getElementById(id);
    if (sec) linkMap.set(sec, a);
  });
  if ('IntersectionObserver' in window && linkMap.size) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          navLinks.forEach((a) => a.classList.remove('active'));
          const link = linkMap.get(e.target);
          if (link) link.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    linkMap.forEach((_, sec) => spy.observe(sec));
  }

})();

/* Background videos marked data-start begin at that offset (seconds) and
   loop back to it, so the skipped intro never plays. */
(function () {
  document.querySelectorAll('video[data-start]').forEach(function (v) {
    var t = parseFloat(v.dataset.start) || 0;
    var seek = function () { if (v.currentTime < t) v.currentTime = t; };
    if (v.readyState >= 1) seek();
    v.addEventListener('loadedmetadata', seek);
    v.addEventListener('timeupdate', seek);
  });
})();

/* Intro signature: draw once it scrolls into view */
(function () {
  var sigs = [].slice.call(document.querySelectorAll('.hand-sig'));
  if (!sigs.length) return;
  if (!('IntersectionObserver' in window)) { sigs.forEach(function (s) { s.classList.add('is-drawn'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-drawn'); io.unobserve(e.target); } });
  }, { threshold: 0.4 });
  sigs.forEach(function (s) { io.observe(s); });
})();

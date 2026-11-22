/* ============================================================
   Mugen-style rolling link buttons (shared site-wide).
   The label rolls as two stacked copies clipped in a grid cell,
   while the trailing icon morphs in place: the arrow spins/scales
   out as a plus spins in. The underline (on the <a>) stays put.
   Each button keeps its own resting arrow glyph (↗ or →).
   Progressive enhancement — links stay plain text if JS is off.
   ============================================================ */
(function () {
  function rollify(link) {
    if (link.dataset.rolled) return;

    var full = link.textContent.replace(/\s+/g, ' ').trim();
    // preserve the button's own resting arrow, default to ↗ (always emitted
    // with U+FE0E so iOS renders the text glyph, not the emoji)
    var match = full.match(/([↗→])︎?\s*$/);
    var arrowGlyph = (match ? match[1] : '↗') + '︎';
    // label is everything minus any trailing icon glyph (↗ / → / +)
    var raw = full.replace(/[↗→+︎]+$/, '').trim();
    if (!raw) return;

    link.dataset.rolled = '1';
    link.setAttribute('aria-label', raw);
    link.textContent = '';

    // two identical copies of the label, stacked, for the roll
    var clip = document.createElement('span');
    clip.className = 'rl-clip';
    for (var i = 0; i < 2; i++) {
      var line = document.createElement('span');
      line.className = 'rl-line';
      line.setAttribute('aria-hidden', 'true');
      line.textContent = raw;
      clip.appendChild(line);
    }

    // morphing icon: arrow ⇄ plus
    var ico = document.createElement('span');
    ico.className = 'rl-ico';
    ico.setAttribute('aria-hidden', 'true');
    var arrow = document.createElement('span');
    arrow.className = 'rl-arrow';
    arrow.textContent = arrowGlyph;
    var plus = document.createElement('span');
    plus.className = 'rl-plus';
    plus.textContent = '+';
    ico.appendChild(arrow);
    ico.appendChild(plus);

    link.appendChild(clip);
    link.appendChild(ico);
  }

  function init() {
    document
      .querySelectorAll('.cs-hero-links a, .cs-live-link, .cta')
      .forEach(rollify);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* Boot loader: fade the cover once the page has loaded (with a
   hard 4s cap so a stalled asset never traps the visitor). */
(function () {
  var loader = document.querySelector('.site-loader');
  if (!loader) return;
  var hidden = false;
  function hide() {
    if (hidden) return;
    hidden = true;
    loader.classList.add('done');
    setTimeout(function () { loader.remove(); }, 600);
  }
  if (document.readyState === 'complete') hide();
  else window.addEventListener('load', hide);
  setTimeout(hide, 4000);
})();

/* Mobile burger menu */
(function () {
  var nav = document.querySelector('.site-nav');
  var burger = document.querySelector('.nav-burger');
  if (!nav || !burger) return;
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('nav-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
})();

/* Videos marked data-rate play at that speed (e.g. 0.5 = half speed). */
(function () {
  document.querySelectorAll('video[data-rate]').forEach(function (v) {
    var rate = parseFloat(v.dataset.rate);
    if (!rate) return;
    var apply = function () { v.playbackRate = rate; };
    apply();
    v.addEventListener('loadedmetadata', apply);
    v.addEventListener('play', apply);
  });
})();

/* On phones, showcase captions move OUT of the aurora card and read below
   it on the plain page background; restored inside on wider screens. */
(function () {
  var mq = window.matchMedia('(max-width: 720px)');
  var pairs = [];
  document.querySelectorAll('.cs-showcase, .cs-figure').forEach(function (box) {
    var cap = box.querySelector('.cs-fig-cap');
    if (cap) pairs.push({ box: box, cap: cap });
  });
  if (!pairs.length) return;
  function place() {
    pairs.forEach(function (p) {
      if (mq.matches) {
        if (p.cap.parentElement === p.box) p.box.insertAdjacentElement('afterend', p.cap);
      } else if (p.cap.parentElement !== p.box) {
        p.box.appendChild(p.cap);
      }
    });
  }
  place();
  if (mq.addEventListener) mq.addEventListener('change', place);
  else if (mq.addListener) mq.addListener(place);
})();

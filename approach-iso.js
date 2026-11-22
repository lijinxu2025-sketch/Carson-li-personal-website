/* Approach cards: animated isometric hairline figures (iso-glow style) behind
   each step. Monochrome line drawing; one accent per card (--glow), only on
   what is live. Projection kernel after iso-figure by Tolga Cohce (MIT). */
(function () {
  const hosts = document.querySelectorAll('[data-iso-fig]');
  if (!hosts.length) return;

  /* ---- kernel ---- */
  const C = Math.cos(Math.PI / 6), S = 0.5;
  const P = (x, y, z) => [(x - y) * C, (x + y) * S - z];
  const f1 = (n) => (+n).toFixed(2);
  const pt = (q) => { const p = P(q[0], q[1], q[2]); return f1(p[0]) + ',' + f1(p[1]); };
  const poly = (list, cls) => `<polygon class="${cls}" points="${list.map(pt).join(' ')}"/>`;
  const line3 = (list, cls, extra = '') => `<path class="${cls}" d="M${list.map(pt).join('L')}" ${extra}/>`;
  const plane = (o, u, v) => {
    const a = P(...o), U = P(...u), V = P(...v);
    return `matrix(${[U[0], U[1], V[0], V[1], a[0], a[1]].map(f1).join(' ')})`;
  };
  const TOP = (x, y, z) => plane([x, y, z], [1, 0, 0], [0, 1, 0]);
  const FRONT = (x, y, z) => plane([x, y, z], [1, 0, 0], [0, 0, -1]);   // y = max face
  const SIDE = (x, y, z) => plane([x, y, z], [0, -1, 0], [0, 0, -1]);   // x = max face
  const box = (x, y, z, w, d, h, cls = '') =>
    `<g${cls ? ` class="${cls}"` : ''}>` +
    poly([[x + w, y, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x + w, y, z]], 'f side') +
    poly([[x, y + d, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x, y + d, z]], 'f front') +
    poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], 'f top') +
    '</g>';
  const viewBox = (pts, pad = 14) => {
    const xs = [], ys = [];
    pts.forEach((q) => { const p = P(...q); xs.push(p[0]); ys.push(p[1]); });
    const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
    return [x0, y0, Math.max(...xs) + pad - x0, Math.max(...ys) + pad - y0].map(f1).join(' ');
  };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // a light dash travelling a pathLength=1000 path; prog 0→1 moves it start→end
  const PULSE = 90;
  const pulseAt = (el, prog) => { el.style.strokeDashoffset = PULSE - prog * (1000 + PULSE); };
  const trailAt = (el, prog) => { el.style.strokeDashoffset = 1000 - clamp(prog * (1000 + PULSE), 0, 1000); };
  const PL = 'pathLength="1000"';
  const pulse3 = (list, cls, id) => {
    const d = `M${list.map(pt).join('L')}`;
    return `<g class="${cls}" id="${id}"><path class="ph" d="${d}" ${PL}/><path class="pc" d="${d}" ${PL}/></g>`;
  };

  /* ---- 01 · Product strategy & direction: candidate routes, one chosen, beacon lights ---- */
  function strategy(svg) {
    const Z = 8;
    let s = box(0, 0, 0, 240, 240, Z);
    s += `<g transform="${TOP(0, 0, Z)}"><rect class="dt" x="8" y="8" width="224" height="224" rx="6"/>`;
    for (let i = 32; i < 232; i += 24) s += `<line class="dt grid" x1="${i}" y1="8" x2="${i}" y2="232"/><line class="dt grid" x1="8" y1="${i}" x2="232" y2="${i}"/>`;
    s += '</g>';
    const deadEnds = [
      [[206, 206], [160, 206], [160, 160], [96, 160], [96, 100]],
      [[206, 206], [80, 206], [80, 150], [36, 150]],
      [[206, 206], [206, 80], [176, 80], [176, 24]],
    ];
    const chosen = [[206, 206], [206, 124], [112, 124], [112, 36], [50, 36]];
    const z3 = (l) => l.map((q) => [q[0], q[1], Z]);
    deadEnds.forEach((r, i) => {
      s += line3(z3(r), 'wire cand');
      s += pulse3(z3(r), 'pulse dim', `s1-c${i}`);
      const e = r[r.length - 1];
      s += `<g transform="${TOP(e[0], e[1], Z)}"><circle class="end" id="s1-e${i}" r="4"/></g>`;
    });
    s += line3(z3(chosen), 'wire');
    s += line3(z3(chosen), 'trail', `id="s1-trail" ${PL}`);
    s += pulse3(z3(chosen), 'pulse', 's1-pulse');
    // raised things, back to front
    const posts = [[112, 36], [112, 124], [206, 124]];
    const items = [
      { k: 44, svg: box(22, 22, Z, 26, 26, 84) + box(25, 25, Z + 84, 20, 20, 16, 'glass" id="s1-lamp') + box(23, 23, Z + 100, 24, 24, 4) },
      ...posts.map((p, i) => ({ k: p[0] + p[1], svg: box(p[0] - 4, p[1] - 4, Z, 8, 8, 14) + box(p[0] - 3, p[1] - 3, Z + 14, 6, 6, 4, `glass" id="s1-p${i}`) })),
      { k: 400, svg: box(190, 190, Z, 32, 32, 3) + `<g transform="${TOP(190, 190, Z + 3)}"><circle class="ring" id="s1-start" cx="16" cy="16" r="8"/></g>` },
    ].sort((a, b) => a.k - b.k);
    const lamp = P(35, 35, Z + 92);
    s += `<defs><radialGradient id="s1-hg"><stop offset="0" class="hg0"/><stop offset="1" class="hg1"/></radialGradient></defs>`;
    s += `<circle class="halo" id="s1-halo" fill="url(#s1-hg)" cx="${f1(lamp[0])}" cy="${f1(lamp[1])}" r="40"/>`;
    s += items.map((i) => i.svg).join('');
    svg.setAttribute('viewBox', viewBox([[0, 0, 0], [240, 0, 0], [0, 240, 0], [240, 240, 0], [22, 22, Z + 104]]));
    svg.innerHTML = s;
    const $ = (id) => svg.querySelector('#' + id);
    const cand = [0, 1, 2].map((i) => $('s1-c' + i)), ends = [0, 1, 2].map((i) => $('s1-e' + i));
    const trail = $('s1-trail'), pulse = $('s1-pulse'), lampEl = $('s1-lamp'), halo = $('s1-halo'), start = $('s1-start');
    const postEls = [0, 1, 2].map((i) => $('s1-p' + i));
    // chosen path: fraction of its length at which each post sits
    const segs = chosen.slice(1).map((q, i) => Math.abs(q[0] - chosen[i][0]) + Math.abs(q[1] - chosen[i][1]));
    const total = segs.reduce((a, b) => a + b, 0);
    const postAt = [segs[0] + segs[1] + segs[2], segs[0] + segs[1], segs[0]].map((d) => d / total);
    const T = 7.4;
    return (t) => {
      const u = t % T;
      cand.forEach((el, i) => { const a = 0.25 + i * 0.55; pulseAt(el, clamp((u - a) / 0.9)); ends[i].classList.toggle('hot', u > a + 0.85 && u < a + 1.5); });
      const prog = clamp((u - 2.2) / 2.2);
      pulseAt(pulse, prog);
      const fade = u > 6.6;
      trailAt(trail, fade ? 0 : prog);
      start.classList.toggle('hot', u > 2.0 && !fade);
      postEls.forEach((el, i) => el.classList.toggle('hot', prog >= postAt[i] && !fade));
      const lit = prog >= 1 && !fade;
      lampEl.classList.toggle('hot', lit);
      halo.classList.toggle('hot', lit);
    };
  }

  /* ---- 02 · Experience architecture: a flow of screens, signal branching through ---- */
  function architecture(svg) {
    const Z = 8, W = 46, Dp = 36, H = 5;
    let s = box(0, 0, 0, 270, 210, Z);
    s += `<g transform="${TOP(0, 0, Z)}"><rect class="dt" x="7" y="7" width="256" height="196" rx="6"/></g>`;
    const N = [[14, 87], [84, 34], [84, 140], [154, 10], [154, 87], [154, 164], [220, 87]];
    const level = [0, 1, 1, 2, 2, 2, 3];
    const E = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [5, 6]];
    E.forEach(([a, b], i) => {
      const A = N[a], B = N[b], ya = A[1] + Dp / 2, yb = B[1] + Dp / 2, xm = (A[0] + W + B[0]) / 2;
      const pts = [[A[0] + W, ya, Z], [xm, ya, Z], [xm, yb, Z], [B[0], yb, Z]];
      s += line3(pts, 'wire', `id="s2-w${i}"`) + pulse3(pts, 'pulse', `s2-p${i}`);
    });
    N.map((n, i) => ({ n, i })).sort((a, b) => (a.n[0] + a.n[1]) - (b.n[0] + b.n[1])).forEach(({ n, i }) => {
      s += box(n[0], n[1], Z, W, Dp, H);
      s += `<g transform="${TOP(n[0], n[1], Z + H)}"><rect class="glass" id="s2-n${i}" x="3" y="3" width="${W - 6}" height="${Dp - 6}" rx="2"/>` +
        `<line class="scr" x1="7" y1="9" x2="${W - 7}" y2="9"/><line class="scr" x1="7" y1="16" x2="${W - 18}" y2="16"/><line class="scr" x1="7" y1="22" x2="${W - 24}" y2="22"/></g>`;
    });
    svg.setAttribute('viewBox', viewBox([[0, 0, 0], [270, 0, 0], [0, 210, 0], [270, 210, 0], [0, 0, 20]]));
    svg.innerHTML = s;
    const nodes = N.map((_, i) => svg.querySelector('#s2-n' + i));
    const pulses = E.map((_, i) => svg.querySelector('#s2-p' + i));
    const wires = E.map((_, i) => svg.querySelector('#s2-w' + i));
    const STEP = 1.05, T = 6.2;
    return (t) => {
      const u = t % T, fade = u > 5.4;
      nodes.forEach((el, i) => el.classList.toggle('hot', !fade && u >= 0.2 + level[i] * STEP));
      E.forEach(([a], i) => {
        const prog = clamp((u - (0.3 + level[a] * STEP)) / (STEP - 0.15));
        pulseAt(pulses[i], prog);
        wires[i].classList.toggle('hot', !fade && prog >= 1);
      });
    };
  }

  /* ---- 03 · Brand & interface systems: an exploded stack, identity → interface ---- */
  function systems(svg) {
    const X = 40, Y = 40, W = 150, Hs = 5, BASE = 16;
    const content = [
      // identity: mark on its construction grid, wordmark, clear-space corners
      `<circle class="ink dim" cx="90" cy="88" r="38"/><circle class="ink dim" cx="90" cy="88" r="22"/><line class="ink dim" x1="52" y1="88" x2="128" y2="88"/><line class="ink dim" x1="90" y1="50" x2="90" y2="126"/>` +
        `<path class="ink fillable" d="M90 62 L111 88 L90 114 L69 88 Z"/><circle class="ink" cx="90" cy="88" r="6"/>` +
        `<rect class="ink fillable" x="14" y="122" width="44" height="9" rx="2"/><rect class="ink" x="14" y="110" width="30" height="5" rx="2"/>` +
        `<path class="ink dim" d="M14 26 v-12 h12 M120 14 h12 v12"/><text class="glyph" x="16" y="70">Aa</text><rect class="ink" x="16" y="80" width="22" height="3" rx="1"/><rect class="ink" x="16" y="88" width="16" height="3" rx="1"/>`,
      // tokens: primary swatches, tint ramp, type scale, spacing
      [0, 1, 2, 3].map((i) => `<rect class="ink fillable" x="${14 + i * 31}" y="16" width="25" height="25" rx="3"/>`).join('') +
        [0, 1, 2, 3, 4, 5, 6].map((i) => `<rect class="ink${i < 3 ? ' fillable' : ''}" x="${14 + i * 17.5}" y="48" width="13" height="10" rx="2"/>`).join('') +
        `<text class="glyph" x="14" y="84">Aa</text><text class="glyph sm" x="44" y="84">Aa</text><text class="glyph xs" x="66" y="84">Aa</text>` +
        `<rect class="ink" x="14" y="94" width="96" height="6" rx="2"/><rect class="ink" x="14" y="106" width="64" height="5" rx="2"/>` +
        [0, 1, 2, 3, 4].map((i) => `<rect class="ink dim" x="${14 + i * 18}" y="${124 - i * 3}" width="${6 + i * 2}" height="${6 + i * 3}"/>`).join(''),
      // components: button, toggle, input, checkbox, radio, slider, tabs, chips
      `<rect class="ink fillable" x="14" y="14" width="56" height="18" rx="9"/><rect class="ink" x="78" y="14" width="44" height="18" rx="9"/>` +
        `<rect class="ink" x="96" y="44" width="36" height="16" rx="8"/><circle class="ink fillable" cx="124" cy="52" r="5"/>` +
        `<rect class="ink" x="14" y="44" width="72" height="16" rx="3"/><line class="ink dim" x1="20" y1="52" x2="52" y2="52"/>` +
        `<rect class="ink fillable" x="14" y="70" width="12" height="12" rx="2"/><rect class="ink" x="32" y="74" width="40" height="4" rx="2"/>` +
        `<circle class="ink" cx="88" cy="76" r="6"/><circle class="ink fillable" cx="88" cy="76" r="2.5"/><rect class="ink" x="98" y="74" width="34" height="4" rx="2"/>` +
        `<line class="ink" x1="14" y1="98" x2="132" y2="98"/><line class="ink fillable-line" x1="14" y1="98" x2="78" y2="98"/><circle class="ink fillable" cx="78" cy="98" r="5"/>` +
        `<rect class="ink fillable" x="14" y="114" width="30" height="12" rx="6"/><rect class="ink" x="50" y="114" width="30" height="12" rx="6"/><rect class="ink" x="86" y="114" width="30" height="12" rx="6"/>`,
      // interface: nav, sidebar, chart card, button, list
      `<rect class="ink fillable" x="10" y="10" width="130" height="14" rx="2"/><circle class="ink" cx="130" cy="17" r="3.5"/>` +
        `<rect class="ink" x="10" y="32" width="34" height="108" rx="2"/>` + [0, 1, 2, 3].map((i) => `<rect class="ink${i === 0 ? ' fillable' : ' dim'}" x="15" y="${40 + i * 12}" width="24" height="5" rx="2"/>`).join('') +
        `<rect class="ink" x="52" y="32" width="88" height="62" rx="3"/>` + [10, 18, 13, 26, 20, 32, 28].map((h, i) => `<rect class="ink${i === 5 ? ' fillable' : ''}" x="${60 + i * 11}" y="${84 - h}" width="6" height="${h}" rx="1"/>`).join('') +
        `<rect class="ink fillable" x="52" y="102" width="36" height="12" rx="6"/><rect class="ink" x="52" y="122" width="88" height="6" rx="2"/><rect class="ink dim" x="52" y="133" width="60" height="5" rx="2"/>`,
    ];
    let s = box(20, 20, 0, 190, 190, 8);
    s += `<g transform="${TOP(20, 20, 8)}"><rect class="dt" x="7" y="7" width="176" height="176" rx="5"/></g>`;
    s += '<g id="s3-guides"><path class="guide"/><path class="guide"/><path class="guide"/></g>';
    content.forEach((c, i) => {
      s += `<g id="s3-l${i}">${box(X, Y, 0, W, W, Hs)}<g class="layer" transform="${TOP(X, Y, Hs)}"><rect class="dt" x="5" y="5" width="${W - 10}" height="${W - 10}" rx="3"/>${c}</g></g>`;
    });
    s += pulse3([[X + W, Y + W, 8], [X + W, Y + W, 9]], 'pulse up', 's3-pulse');
    svg.setAttribute('viewBox', viewBox([[20, 20, 0], [210, 20, 0], [20, 210, 0], [210, 210, 0], [X, Y, BASE + 3 * 92 + Hs + 6]]));
    svg.innerHTML = s;
    const layers = [0, 1, 2, 3].map((i) => svg.querySelector('#s3-l' + i));
    const guides = [...svg.querySelectorAll('#s3-guides path')], pulse = svg.querySelector('#s3-pulse'), pulsePaths = [...pulse.querySelectorAll('path')];
    const corners = [[X + W, Y], [X, Y + W], [X + W, Y + W]];
    const T = 6.4;
    return (t) => {
      const u = t % T, fade = u > 5.6;
      const gap = 86 + 6 * Math.sin(t * 0.9);
      const top = BASE + 3 * gap + Hs;
      layers.forEach((g, i) => {
        g.setAttribute('transform', `translate(0 ${f1(-(BASE + i * gap))})`);
        g.classList.toggle('hot', !fade && u >= 0.7 + i * 0.95);
      });
      corners.forEach((c, i) => guides[i].setAttribute('d', 'M' + pt([c[0], c[1], 8]) + 'L' + pt([c[0], c[1], top])));
      const pd = 'M' + pt([X + W, Y + W, 8]) + 'L' + pt([X + W, Y + W, top]);
      pulsePaths.forEach((p) => p.setAttribute('d', pd));
      pulseAt(pulse, clamp((u - 0.3) / 3.4));
    };
  }

  /* ---- 04 · Delivery & ownership: packages through a release gate, version ticks up ---- */
  function delivery(svg) {
    const Z = 8, BZ = Z + 6, BY = 52, BD = 44, GX = 200, PK = 26, PH = 20, PY = 61, SPEED = 28, GAPX = 70;
    let s = box(0, 0, 0, 290, 150, Z);
    s += `<g transform="${TOP(0, 0, Z)}"><rect class="dt" x="7" y="7" width="276" height="136" rx="6"/></g>`;
    // release display at the back
    s += box(20, 6, Z, 74, 22, 36);
    s += `<g transform="${FRONT(20, 28, Z + 36)}"><rect class="glass hot" x="6" y="6" width="62" height="22" rx="2"/>` +
      `<text class="scr-t" id="s4-ver" x="37" y="21.5" text-anchor="middle">v2.14</text></g>`;
    // back pillar, belt
    s += box(GX, 40, Z, 8, 8, 64);
    s += box(10, BY, Z, 270, BD, 6);
    s += `<defs><clipPath id="s4-clip"><rect x="10" y="${BY}" width="270" height="${BD}"/></clipPath></defs>`;
    s += `<g transform="${TOP(0, 0, BZ)}"><g clip-path="url(#s4-clip)"><g id="s4-slats">`;
    for (let x = 0; x <= 300; x += 12) s += `<line class="dt" x1="${x}" y1="${BY}" x2="${x}" y2="${BY + BD}"/>`;
    s += '</g></g></g>';
    s += '<g id="s4-pk">';
    for (let k = 0; k < 4; k++) {
      s += `<g class="pkg">${box(0, PY, BZ, PK, PK, PH)}<g transform="${TOP(0, PY, BZ + PH)}"><line class="dt" x1="${PK / 2}" y1="0" x2="${PK / 2}" y2="${PK}"/>` +
        `<rect class="tag" x="4" y="5" width="7" height="16" rx="1"/></g></g>`;
    }
    s += '</g>';
    s += box(GX, 100, Z, 8, 8, 64);
    s += box(GX, 40, Z + 64, 8, 68, 8);
    s += `<g transform="${SIDE(GX + 8, 108, Z + 72)}"><rect class="glass" id="s4-sign" x="6" y="2" width="56" height="4" rx="1"/></g>`;
    s += poly([[GX + 4, 48, BZ], [GX + 4, 100, BZ], [GX + 4, 100, Z + 64], [GX + 4, 48, Z + 64]], 'beam" id="s4-beam');
    svg.setAttribute('viewBox', viewBox([[0, 0, 0], [290, 0, 0], [0, 150, 0], [290, 150, 0], [GX, 40, Z + 72], [20, 6, Z + 36]]));
    svg.innerHTML = s;
    const slats = svg.querySelector('#s4-slats'), pk = svg.querySelector('#s4-pk');
    const pkgs = [...pk.querySelectorAll('.pkg')], sign = svg.querySelector('#s4-sign'), beam = svg.querySelector('#s4-beam'), ver = svg.querySelector('#s4-ver');
    const SPAN = 4 * GAPX, X0 = 12;
    let shipped = 14, lastPass = -1, order = '';
    return (t) => {
      const travel = t * SPEED;
      slats.setAttribute('transform', `translate(${f1(travel % 12)} 0)`);
      const placed = pkgs.map((el, k) => ({ el, x: X0 + ((travel + k * GAPX) % SPAN) })).sort((a, b) => a.x - b.x);
      let under = false;
      const key = placed.map((p) => pkgs.indexOf(p.el)).join('');
      if (key !== order) { order = key; placed.forEach(({ el }) => pk.appendChild(el)); }   // DOM order = draw order (back to front along x)
      placed.forEach(({ el, x }) => {
        const lift = 46 * Math.pow(clamp((X0 + 34 - x) / 34), 2);   // dropped onto the belt
        const d = P(x, 0, lift);
        el.setAttribute('transform', `translate(${f1(d[0])} ${f1(d[1])})`);
        const op = x > X0 + 34 ? f1(clamp((X0 + 254 - x) / 14)) : f1(clamp((x - X0) / 10));
        if (el.style.opacity !== op) el.style.opacity = op;
        el.classList.toggle('done', x + PK / 2 > GX + 4);
        if (x + PK > GX - 2 && x < GX + 10) under = true;
      });
      sign.classList.toggle('hot', under);
      beam.classList.toggle('hot', under);
      const pass = Math.floor((travel + SPAN - (GX + 4 - PK / 2 - X0)) / GAPX);
      if (lastPass >= 0 && pass > lastPass) { shipped++; ver.textContent = 'v2.' + shipped; }
      lastPass = pass;
    };
  }

  const BUILD = { strategy, architecture, systems, delivery };


  const figs = [];
  hosts.forEach((host) => {
    const build = BUILD[host.dataset.isoFig];
    if (!build) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    host.replaceChildren(svg);
    figs.push({ host, update: build(svg), visible: false });
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    // a single lit frame: each figure at the moment its story resolves
    const still = { strategy: 5.2, architecture: 4.4, systems: 4.6, delivery: 7.4 };
    figs.forEach((f) => f.update(still[f.host.dataset.isoFig] || 4));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { const f = figs.find((g) => g.host === e.target); if (f) f.visible = e.isIntersecting; });
  }, { rootMargin: '0px' });
  figs.forEach((f) => { f.update(0); io.observe(f.host); });
  // capped at ~60fps: smooth for these motions, and on 120Hz screens it leaves
  // every other frame free for the scroll
  const t0 = performance.now();
  let last = -1e9;
  const tick = (now) => {
    requestAnimationFrame(tick);
    if (now - last < 15) return;
    last = now;
    const t = (now - t0) / 1000;
    figs.forEach((f) => { if (f.visible) f.update(t); });
  };
  requestAnimationFrame(tick);
})();

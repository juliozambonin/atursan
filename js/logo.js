// Logo ATURSAN redesenhado em SVG: a árvore sananduva é gerada por código
// para que cada galho balance ao vento e as flores soltem pétalas.
(function () {
  const svg = document.getElementById('logo');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rr = (a, b) => a + rnd() * (b - a);
  const rad = d => d * Math.PI / 180;
  const f = n => n.toFixed(1);

  const cx = 320, cy = 306, R = 268;
  const pt = (a, r = R) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
  const P = p => `${f(p[0])},${f(p[1])}`;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const GREEN = '#34452a';
  const PETALS = ['#e3241b', '#ef3b24', '#c81812', '#f25a2c', '#d81f14', '#b8130d'];

  // ---------- defs ----------
  const defs = el('defs', {}, svg);
  const clip = el('clipPath', { id: 'lgClip' }, defs);
  const c1 = pt(171, 262), c2 = pt(9, 262);
  el('path', { d: `M${P(c1)} A262 262 0 1 1 ${P(c2)} L${f(c2[0])},346 L${f(c1[0])},346 Z` }, clip);
  el('path', { id: 'lgTagArc', d: `M${P(pt(145, 300))} A300 300 0 0 0 ${P(pt(35, 300))}` }, defs);
  const trunkGrad = el('linearGradient', { id: 'lgTrunk', x1: 0, x2: 1 }, defs);
  el('stop', { offset: 0, 'stop-color': '#3e2716' }, trunkGrad);
  el('stop', { offset: .45, 'stop-color': '#6b4429' }, trunkGrad);
  el('stop', { offset: 1, 'stop-color': '#3a2414' }, trunkGrad);

  // ---------- anel ----------
  el('path', {
    class: 'lg-ring', fill: 'none', stroke: GREEN, 'stroke-width': 4, 'stroke-linecap': 'round',
    d: `M${P(pt(172))} A${R} ${R} 0 1 1 ${P(pt(368))}`
  }, svg);
  el('path', {
    class: 'lg-ring', fill: 'none', stroke: GREEN, 'stroke-width': 3, 'stroke-linecap': 'round',
    d: `M${P(pt(74))} A${R} ${R} 0 0 1 ${P(pt(106))}`
  }, svg);

  // ---------- paisagem ----------
  const land = el('g', { class: 'lg-land', 'clip-path': 'url(#lgClip)' }, svg);
  el('path', { fill: '#c4c58e', d: 'M40,300 C120,262 200,270 270,292 C330,310 380,298 430,280 C500,256 560,266 610,288 L610,360 L40,360Z' }, land);
  el('path', { fill: '#9da462', d: 'M40,318 C110,286 190,290 262,318 L262,360 L40,360Z' }, land);
  el('path', { fill: '#a9ae6c', d: 'M360,322 C420,292 520,282 610,298 L610,360 L360,360Z' }, land);
  el('path', { fill: '#7d8742', d: 'M40,334 C150,316 250,326 320,329 C400,332 500,314 610,326 L610,360 L40,360Z' }, land);
  el('path', { fill: '#5f6b30', d: 'M40,344 C160,334 260,338 320,340 C420,342 520,332 610,340 L610,360 L40,360Z' }, land);
  // igreja e arvorezinhas no morro da direita
  const ch = el('g', { fill: '#5b6536' }, land);
  el('rect', { x: 472, y: 296, width: 50, height: 20 }, ch);
  el('path', { d: 'M468,297 L497,284 L526,297Z' }, ch);
  el('rect', { x: 458, y: 276, width: 15, height: 40 }, ch);
  el('path', { d: 'M456,277 L465.5,250 L475,277Z' }, ch);
  el('path', { d: 'M465.5,236 v14 M460.5,241 h10', stroke: '#5b6536', 'stroke-width': 2 }, ch);
  for (let i = 0; i < 4; i++) el('rect', { x: 478 + i * 11, y: 301, width: 4, height: 8, rx: 2, fill: '#e9e4c8' }, ch);
  el('rect', { x: 463, y: 282, width: 5, height: 9, rx: 2.5, fill: '#e9e4c8' }, ch);
  [[436, 304, 11], [446, 308, 8], [540, 300, 12], [555, 306, 9], [418, 312, 7]].forEach(([x, y, r]) => {
    el('rect', { x: x - 1.5, y, width: 3, height: 10, fill: '#4b4a2a' }, land);
    el('circle', { cx: x, cy: y - r * .3, r, fill: '#56622f' }, land);
  });

  // ---------- árvore ----------
  const treeWrap = el('g', { class: 'lg-tree' }, svg);
  const tree = el('g', {}, treeWrap);
  const branches = [];
  const tips = [];

  function petalCluster(parent, x, y, size) {
    const g = el('g', {}, parent);
    const n = Math.round(size * 1.05);
    for (let i = 0; i < n; i++) {
      const a = rr(-200, 20);
      const r0 = rr(0, size * 0.35);
      const L = rr(size * 0.55, size * 1.0);
      const W = L * rr(0.18, 0.28);
      const px = x + Math.cos(rad(a)) * r0, py = y + Math.sin(rad(a)) * r0;
      el('path', {
        d: `M0,0 Q${f(L * .45)},${f(-W)} ${f(L)},0 Q${f(L * .45)},${f(W)} 0,0Z`,
        fill: PETALS[(rnd() * PETALS.length) | 0],
        transform: `translate(${f(px)},${f(py)}) rotate(${f(a)})`
      }, g);
    }
    tips.push([x, y]);
    return g;
  }

  function branch(parent, x, y, ang, len, w, depth, maxDepth) {
    const a = rad(ang);
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    const g = el('g', {}, parent);
    branches.push({ g, ox: x, oy: y, depth, phase: rnd() * 6.28, speed: rr(.8, 1.3) });
    const nx = -Math.sin(a), ny = Math.cos(a);
    const w2 = Math.max(w * 0.58, 1.2);
    const bend = rr(-0.14, 0.14) * len;
    const mx = (x + x2) / 2 + nx * bend, my = (y + y2) / 2 + ny * bend;
    const wm = (w + w2) / 4;
    el('path', {
      fill: 'url(#lgTrunk)',
      d: `M${f(x + nx * w / 2)},${f(y + ny * w / 2)} Q${f(mx + nx * wm)},${f(my + ny * wm)} ${f(x2 + nx * w2 / 2)},${f(y2 + ny * w2 / 2)}` +
         ` L${f(x2 - nx * w2 / 2)},${f(y2 - ny * w2 / 2)} Q${f(mx - nx * wm)},${f(my - ny * wm)} ${f(x - nx * w / 2)},${f(y - ny * w / 2)}Z`
    }, g);

    if (depth < maxDepth) {
      const kids = depth === 1 ? 3 : 2;
      for (let i = 0; i < kids; i++) {
        let na = ang + (i - (kids - 1) / 2) * rr(26, 40) + rr(-8, 8);
        na = na * 0.82 + (-90) * 0.18; // leve tendência para cima
        branch(g, x2, y2, na, len * rr(.56, .7), w2, depth + 1, maxDepth);
      }
      if (rnd() < (depth === 1 ? .85 : .8)) petalCluster(g, x2, y2, rr(18, 24));
    } else {
      petalCluster(g, x2, y2, rr(22, 29));
    }
  }

  // raízes
  el('path', { fill: '#4a2f1b', d: 'M282,326 Q302,318 306,292 L336,292 Q338,318 360,326 Q340,330 320,328 Q300,330 282,326Z' }, tree);
  el('path', { fill: 'none', stroke: '#3a2414', 'stroke-width': 2, d: 'M312,300 q-2,14 -14,24 M330,302 q2,13 14,22' }, tree);
  // tronco
  const trunk = el('g', {}, tree);
  branches.push({ g: trunk, ox: 320, oy: 324, depth: 0, phase: 0, speed: 1 });
  el('path', { fill: 'url(#lgTrunk)', d: 'M303,324 C307,292 306,270 309,246 L331,246 C334,270 333,292 337,324Z' }, trunk);
  el('path', { fill: 'none', stroke: '#2f1d10', 'stroke-width': 1.5, opacity: .6, d: 'M314,316 q-3,-30 1,-62 M325,318 q3,-34 -1,-66' }, trunk);

  const limbs = [
    [-170, 100, 13], [-148, 92, 14], [-124, 86, 14], [-98, 80, 15],
    [-74, 86, 14], [-50, 92, 14], [-14, 100, 13]
  ];
  const leftFirst = [0, 6, 1, 5, 2, 4, 3];
  leftFirst.forEach(i => {
    const [ang, len, w] = limbs[i];
    const sx = 320 + (ang < -90 ? -6 : ang > -90 ? 6 : 0);
    branch(trunk, sx, 256, ang, len, w, 1, 3);
  });

  // pétalas que caem (camada à parte, não recortada)
  const fallLayer = el('g', {}, svg);

  // ---------- textos ----------
  const T = el('g', { fill: GREEN }, svg);
  let delay = 1.3;
  function txt(str, attrs) {
    const t = el('text', Object.assign({ x: 320, 'text-anchor': 'middle', class: 'lg-t', style: `animation-delay:${delay}s` }, attrs), T);
    t.textContent = str;
    delay += .18;
    return t;
  }
  function dash(x1, x2, y, color = GREEN, w = 2) {
    el('line', { x1, x2, y1: y, y2: y, stroke: color, 'stroke-width': w, class: 'lg-t', style: `animation-delay:${delay}s` }, T);
  }
  dash(150, 196, 363); dash(444, 490, 363);
  txt('ASSOCIAÇÃO', { y: 372, 'font-family': 'Montserrat, sans-serif', 'font-weight': 500, 'font-size': 25, 'letter-spacing': 5 });
  txt('TURÍSTICA', { y: 436, 'font-family': 'Cinzel, Georgia, serif', 'font-weight': 700, 'font-size': 70, 'letter-spacing': 1 });
  dash(262, 296, 453, GREEN, 1.6); dash(344, 378, 453, GREEN, 1.6);
  txt('DE', { y: 459, 'font-family': 'Montserrat, sans-serif', 'font-weight': 500, 'font-size': 16, 'letter-spacing': 3 });
  txt('SANANDUVA', { y: 501, 'font-family': 'Montserrat, sans-serif', 'font-weight': 500, 'font-size': 38, 'letter-spacing': 9 });
  // linhas vermelhas e ATURSAN
  el('path', { d: 'M110,535 L174,532 L174,536.5Z', fill: '#d7261e', class: 'lg-t', style: `animation-delay:${delay}s` }, T);
  el('path', { d: 'M530,535 L466,532 L466,536.5Z', fill: '#d7261e', class: 'lg-t', style: `animation-delay:${delay}s` }, T);
  const brand = txt('ATURSAN', { y: 553, 'font-family': 'Montserrat, sans-serif', 'font-weight': 800, 'font-size': 50, 'letter-spacing': 1 });
  const swoosh = el('path', { class: 'lg-swoosh', fill: 'none', stroke: '#d7261e', 'stroke-width': 6, 'stroke-linecap': 'round' }, T);
  // slogan curvo
  const tag = el('text', { 'font-family': 'Montserrat, sans-serif', 'font-weight': 600, 'font-size': 13, 'letter-spacing': 4, class: 'lg-t', style: `animation-delay:${delay + .2}s` }, T);
  const tp = el('textPath', { href: '#lgTagArc', startOffset: '50%', 'text-anchor': 'middle' }, tag);
  tp.innerHTML = 'DESCUBRA <tspan fill="#d7261e">•</tspan> VIVA <tspan fill="#d7261e">•</tspan> ENCANTE-SE';

  // traço vermelho no "A" de ATURSAN (posição depende da fonte carregada)
  function placeSwoosh() {
    try {
      const b = brand.getExtentOfChar(0);
      const x = b.x, y = b.y, w = b.width, h = b.height;
      swoosh.setAttribute('d', `M${f(x - 10)},${f(y + h * .74)} Q${f(x + w * .35)},${f(y + h * .58)} ${f(x + w * .95)},${f(y + h * .46)}`);
    } catch (e) { /* sem layout ainda */ }
  }
  placeSwoosh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeSwoosh);

  // ---------- animação do vento ----------
  const AMP = [0.35, 1.4, 2.4, 3.4];
  let gust = 0, gustTarget = 0, nextGust = 3;
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; svg.classList.toggle('paused', !visible); }).observe(svg);

  function wind(t) {
    if (t > nextGust) { gustTarget = rr(.6, 1.4); nextGust = t + rr(4, 9); setTimeout(() => (gustTarget = 0), rr(1200, 2500)); }
    gust += (gustTarget - gust) * 0.02;
    return Math.sin(t * .6) * .55 + Math.sin(t * 1.55 + 1) * .2 + gust;
  }

  function frame(ms) {
    if (visible) {
      const t = ms / 1000;
      const w = wind(t);
      for (const b of branches) {
        const ang = AMP[b.depth] * (0.65 * w + 0.35 * Math.sin(t * (1.2 + b.depth * .5) * b.speed + b.phase));
        b.g.setAttribute('transform', `rotate(${ang.toFixed(2)} ${b.ox.toFixed(1)} ${b.oy.toFixed(1)})`);
      }
    }
    requestAnimationFrame(frame);
  }

  function dropPetal() {
    if (visible && tips.length) {
      const [x, y] = tips[(rnd() * tips.length) | 0];
      const p = el('path', {
        d: 'M0,-5 Q3,0 0,5 Q-3,0 0,-5Z',
        fill: PETALS[(rnd() * 3) | 0]
      }, fallLayer);
      const dx = rr(20, 70) * (rnd() < .3 ? -1 : 1), dy = rr(330, 345) - y;
      const anim = p.animate([
        { transform: `translate(${x}px,${y}px) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${x + dx * .3}px,${y + dy * .3}px) rotate(160deg)`, opacity: 1, offset: .15 },
        { transform: `translate(${x + dx * .7 + 8}px,${y + dy * .7}px) rotate(420deg)`, opacity: 1, offset: .7 },
        { transform: `translate(${x + dx}px,${y + dy}px) rotate(600deg)`, opacity: 0 }
      ], { duration: rr(3800, 6000), easing: 'linear' });
      anim.onfinish = () => p.remove();
    }
    setTimeout(dropPetal, rr(500, 1100));
  }

  if (!reduce) {
    requestAnimationFrame(frame);
    setTimeout(dropPetal, 2500);
  }
})();

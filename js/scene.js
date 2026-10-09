// Micro Sananduva em visão aérea (isométrica, estilo drone).
// Coordenadas do "mundo": x vai para a direita-baixo, y para a esquerda-baixo, z para cima.
// Objetos estáticos são ordenados por profundidade; veículos e pessoas são reinseridos
// na ordem certa a cada quadro para passarem atrás/na frente dos prédios corretamente.
(function () {
  const svg = document.getElementById('scene');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let seed = 2024;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rr = (a, b) => a + rnd() * (b - a);
  const pick = a => a[(rnd() * a.length) | 0];
  const rad = d => d * Math.PI / 180;
  const f = n => (+n).toFixed(1);
  const neg = max => `animation-delay:-${rr(0, max).toFixed(2)}s`;

  // mapa com folga nas bordas: o horizonte fica em ~y 300 e o terreno começa bem abaixo dele
  const W = 2700, H = 1700, CX = 1350, CY = 280;
  // OX/OY/OZ: deslocamento do bloco sendo desenhado (posiciona cada atrativo no mapa; OZ eleva, ex.: morro)
  // MIR: espelha o bloco trocando x↔y (na tela, inverte esquerda/direita em relação à rodovia sul–norte)
  let OX = 0, OY = 0, OZ = 0, MIR = false;
  const origin = (ox = 0, oy = 0, oz = 0, mir = false) => { OX = ox; OY = oy; OZ = oz; MIR = mir; };
  const Wd = (x, y) => MIR ? [y + OY, x + OX] : [x + OX, y + OY]; // coordenada local → mundo
  const P0 = (x, y, z = 0) => [CX + x - y, CY + (x + y) / 2 - z];
  const P = (x, y, z = 0) => { const [a, b] = Wd(x, y); return P0(a, b, z + OZ); };
  const pt = p => f(p[0]) + ',' + f(p[1]);
  const poly = (arr, fill, ex = '') => `<polygon points="${arr.map(pt).join(' ')}" fill="${fill}" ${ex}/>`;
  const quad = (x0, y0, x1, y1, fill, ex = '', z = 0) => poly([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], fill, ex);
  const line = (a, b, stroke, w, ex = '') => `<path d="M${pt(a)} L${pt(b)}" stroke="${stroke}" stroke-width="${w}" ${ex}/>`;
  const at = (x, y, z, inner, s = 1) => { const p = P(x, y, z); return `<g transform="translate(${f(p[0])},${f(p[1])})${s !== 1 ? ` scale(${s})` : ''}">${inner}</g>`; };
  // faces: matriz que leva coordenadas locais (u para a direita, v para baixo) para a parede
  const fl = (x, yF, z) => { const p = P(x, yF, z); return `matrix(${MIR ? -1 : 1},0.5,0,1,${f(p[0])},${f(p[1])})`; };
  const fr = (xF, y, z) => { const p = P(xF, y, z); return `matrix(${MIR ? -1 : 1},-0.5,0,1,${f(p[0])},${f(p[1])})`; };
  const visible = (x, y, m = 80) => { const [sx, sy] = P(x, y); return sx > -m && sx < W + m && sy > 330 && sy < H + m + 60; };

  // cores em HSL, para as paletas dos temas
  function toHsl(hex) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function fromHsl(h, s, l) {
    s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l)); h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
  }
  // chão por tema: no outono tudo mais pálido e os verdes puxando para o amarelo; no inverno, geada nos campos
  function groundColor(c) {
    const [h, s, l] = toHsl(c);
    if (INVERNO && h > 44 && h < 170 && s > .1) return fromHsl(195, .22, .86 + l * .06);
    if (OUTONO) return fromHsl(h > 60 && h < 170 ? h + (50 - h) * .45 : h, s * .6, l + (1 - l) * .1);
    return c;
  }
  const themeGround = str => (OUTONO || INVERNO) ? str.replace(/#[0-9a-fA-F]{6}(?![0-9a-zA-Z])/g, groundColor) : str;
  // cordilheira do Ágape: no inverno fica verde-acinzentada (geada leve), senão some no chão branco
  const hillColor = c => { if (!INVERNO) return groundColor(c); const [h, s, l] = toHsl(c); return fromHsl(h + 15, s * .45, l * .92); };
  const themeHill = str => (OUTONO || INVERNO) ? str.replace(/#[0-9a-fA-F]{6}(?![0-9a-zA-Z])/g, hillColor) : str;
  // copas: amareladas e avermelhadas no outono (em sequência fixa, sem sorteio), um pouco apagadas no inverno
  const AUTUMN = ['#d9a43a', '#c8642d', '#e2b84a', '#b5452a', '#cf8a35', '#a86a2f', '#e0973a'];
  let autumnN = 0;
  function leaf(c) {
    const [h, s, l] = toHsl(c);
    if (h < 70 || h > 170) return c; // copas floridas (rosa, amarelo) ficam como estão
    if (OUTONO) return AUTUMN[autumnN++ % AUTUMN.length];
    if (INVERNO) return fromHsl(h, s * .7, l * .95);
    return c;
  }

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)))));
    return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('');
  }

  const SKINS = ['#f1c7a0', '#e0a97e', '#c68a5e', '#8d5a3b', '#f5d2b3'];
  const HAIRS = ['#2b1d14', '#5a3a22', '#c9a063', '#1a1a1a', '#8a5a2b', '#d9d0c0'];
  const SHIRTS = ['#d94f3d', '#3d7dd9', '#f2b134', '#5aa05a', '#9b59b6', '#e67e22', '#1abc9c', '#f4f1ea', '#34495e', '#e84393'];
  const PANTS = ['#2c3e50', '#34495e', '#5d4037', '#1f3a5f', '#444', '#6d5c4a'];
  const PET = ['#e3241b', '#ef3b24', '#c81812', '#f25a2c'];
  const PS = .5; // escala das pessoas
  const DATA = Object.fromEntries((window.ATRATIVOS || []).map(d => [d.id, d]));

  // tema do site (js/temas.js): estação do ano e datas festivas. Verão é o visual padrão.
  const TEMA = window.TEMA || { id: 'verao', e: id => id === 'verao' };
  const NATAL = TEMA.e('natal'), ANONOVO = TEMA.e('anonovo'), PASCOA = TEMA.e('pascoa'), PRIMAVERA = TEMA.e('primavera'), OUTONO = TEMA.e('outono'), INVERNO = TEMA.e('inverno'), FARRAPOS = TEMA.e('farroupilha');
  // As decorações dos temas sorteiam com outra sequência: assim árvores, casas e cores do mapa
  // ficam no mesmo lugar em todos os temas (o mapa principal continua usando a sequência de sempre).
  let tseed = 4242, altOn = false;
  function alt(fn) {
    if (altOn) return fn();
    const s0 = seed; seed = tseed; altOn = true;
    try { return fn(); } finally { tseed = seed; seed = s0; altOn = false; }
  }

  let defs = '';
  let gid = 0;

  // ==================================================================
  // geometria isométrica
  // ==================================================================
  function box(x, y, w, d, h, c, z0 = 0, o = {}) {
    const top = o.top || shade(c, 1.18), L = o.left || c, R = o.right || shade(c, .8);
    let s = poly([P(x, y + d, z0), P(x + w, y + d, z0), P(x + w, y + d, z0 + h), P(x, y + d, z0 + h)], L);
    s += poly([P(x + w, y, z0), P(x + w, y + d, z0), P(x + w, y + d, z0 + h), P(x + w, y, z0 + h)], R);
    if (!o.noTop) s += poly([P(x, y, z0 + h), P(x + w, y, z0 + h), P(x + w, y + d, z0 + h), P(x, y + d, z0 + h)], top);
    return s;
  }

  function gable(x, y, w, d, zb, rh, roof, along, wall, ov = 3) {
    const X0 = x - ov, X1 = x + w + ov, Y0 = y - ov, Y1 = y + d + ov;
    let s = '';
    if (along === 'x') {
      const ym = y + d / 2;
      s += poly([P(x + w, y, zb), P(x + w, y + d, zb), P(x + w, ym, zb + rh)], shade(wall, .8));
      s += poly([P(X0, Y0, zb), P(X1, Y0, zb), P(X1, ym, zb + rh), P(X0, ym, zb + rh)], shade(roof, .85));
      s += poly([P(X0, ym, zb + rh), P(X1, ym, zb + rh), P(X1, Y1, zb), P(X0, Y1, zb)], roof);
    } else {
      const xm = x + w / 2;
      s += poly([P(x, y + d, zb), P(x + w, y + d, zb), P(xm, y + d, zb + rh)], wall);
      s += poly([P(X0, Y0, zb), P(xm, Y0, zb + rh), P(xm, Y1, zb + rh), P(X0, Y1, zb)], shade(roof, 1.1));
      s += poly([P(xm, Y0, zb + rh), P(X1, Y0, zb), P(X1, Y1, zb), P(xm, Y1, zb + rh)], shade(roof, .82));
    }
    return s;
  }

  function pyramid(x, y, w, d, zb, h, c) {
    const a = P(x + w / 2, y + d / 2, zb + h);
    return poly([P(x, y, zb), P(x + w, y, zb), a], shade(c, .9)) + poly([P(x, y, zb), P(x, y + d, zb), a], shade(c, 1.05)) +
      poly([P(x, y + d, zb), P(x + w, y + d, zb), a], c) + poly([P(x + w, y, zb), P(x + w, y + d, zb), a], shade(c, .78));
  }

  function cyl(x, y, r, h, c, z0 = 0, cone = 0, coneC) {
    const [cx, cy] = P(x, y, z0), rx = r * 1.414, ry = r * .707, id = 'cg' + (gid++);
    defs += `<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${shade(c, 1.15)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, .7)}"/></linearGradient>`;
    let s = `<path d="M${f(cx - rx)},${f(cy)} A${f(rx)},${f(ry)} 0 0 0 ${f(cx + rx)},${f(cy)} L${f(cx + rx)},${f(cy - h)} L${f(cx - rx)},${f(cy - h)}Z" fill="url(#${id})"/>`;
    if (cone) {
      const cc = coneC || shade(c, .85);
      s += `<ellipse cx="${f(cx)}" cy="${f(cy - h)}" rx="${f(rx)}" ry="${f(ry)}" fill="${cc}"/><path d="M${f(cx - rx)},${f(cy - h)} L${f(cx)},${f(cy - h - cone)} L${f(cx + rx)},${f(cy - h)}Z" fill="${cc}"/><path d="M${f(cx)},${f(cy - h - cone)} L${f(cx + rx)},${f(cy - h)} L${f(cx + rx * .2)},${f(cy - h + ry)}Z" fill="#000" opacity=".12"/>`;
    } else s += `<ellipse cx="${f(cx)}" cy="${f(cy - h)}" rx="${f(rx)}" ry="${f(ry)}" fill="${shade(c, 1.2)}"/>`;
    return s;
  }

  function wins(w, h, cols, rows, ww, wh, fill, ex = '') {
    let s = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      s += `<rect x="${f((c + .5) * w / cols - ww / 2)}" y="${f((r + .5) * h / rows - wh / 2)}" width="${ww}" height="${wh}" fill="${fill}" ${ex}/>`;
    }
    return s;
  }

  function blob(cx, cy, rx, ry, n = 16, j = .12, z = 0) {
    const ps = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, k = 1 + rr(-j, j);
      ps.push(P(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, z));
    }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let d = `M${pt(mid(ps[n - 1], ps[0]))}`;
    for (let i = 0; i < n; i++) d += ` Q${pt(ps[i])} ${pt(mid(ps[i], ps[(i + 1) % n]))}`;
    return d + 'Z';
  }

  function strip(pts, w) { // faixa (rio) ao longo de uma linha no chão
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], k = Math.hypot(dx, dy) || 1;
      const nx = -dy / k * w / 2, ny = dx / k * w / 2;
      L.push(P(pts[i][0] + nx, pts[i][1] + ny)); R.push(P(pts[i][0] - nx, pts[i][1] - ny));
    }
    return 'M' + L.map(pt).join(' L') + ' L' + R.reverse().map(pt).join(' L') + 'Z';
  }

  // ==================================================================
  // sprites (desenhados de pé, na tela)
  // ==================================================================
  const shadowE = (rx, ry = rx * .42) => `<ellipse rx="${rx}" ry="${f(ry)}" fill="#1d2b12" opacity=".16"/>`;

  const SPRING = ['#ff4f9a', '#ffffff', '#ffd23f', '#e84393', '#ff8ad8', '#ff9f1a', '#b86bf0'];
  // ipês e cerejeiras: na primavera parte das árvores fica com a copa toda colorida
  const IPE = ['#f7c531', '#f27fb0', '#a95cc4', '#fbe6f0', '#ff9fc6'];
  // flor vista de cima: pétalas numa cor e miolo contrastante
  const bloom = (x, y, r, c) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * .4)}" fill="${c === '#ffd23f' || c === '#f7c531' ? '#e0701a' : '#ffe14d'}"/>`;
  // n flores espalhadas na copa (um disco em volta do centro da copa)
  const crownBlooms = (n, r0, r1, col) => Array.from({ length: n }, () => { const a = rr(0, 6.283), d = Math.sqrt(rnd()) * 17; return bloom(Math.cos(a) * d, -33 + Math.sin(a) * d * .95, rr(r0, r1), col()); }).join('');
  function treeS(s = 1, c = '#5e9a3c', o = {}) {
    c = leaf(c);
    let blossom = o.blossom ? Array.from({ length: 14 }, () => `<circle cx="${f(rr(-15, 15))}" cy="${f(rr(-48, -20))}" r="${f(rr(1.2, 2.4))}" fill="${o.blossom}"/>`).join('') : '';
    // primavera: toda árvore florida, bem carregada; parte delas vira ipê (sorteio à parte, para não mudar o mapa)
    if (PRIMAVERA && !o.blossom) blossom = alt(() => {
      if (o.ipe || rnd() < .38) { c = pick(IPE); const k = c; return crownBlooms(24, 1.6, 2.8, () => pick([shade(k, 1.3), shade(k, .8), '#ffffff'])); }
      const fc = pick(SPRING);
      return crownBlooms(26, 2, 3.2, () => (rnd() < .8 ? fc : '#ffffff'));
    });
    const dk = shade(c, .78), lt = shade(c, 1.15);
    const st = neg(4); // sempre sorteia, para manter o mesmo mapa
    return `<g transform="scale(${s})">${shadowE(15)}<g${o.sway ? ` class="sway" style="${st}"` : ''}>
      <path d="M-2.6,0 L-1.8,-22 L1.8,-22 L2.6,0Z" fill="#6b4a2b"/>
      <circle cx="0" cy="-32" r="16" fill="${c}"/><circle cx="8" cy="-26" r="11" fill="${dk}"/><circle cx="-9" cy="-27" r="11" fill="${c}"/>
      <circle cx="-3" cy="-41" r="10" fill="${lt}"/><circle cx="-7" cy="-37" r="5" fill="#fff" opacity=".14"/>${blossom}</g></g>`;
  }
  function pineS(s = 1, sway = false) {
    const st = neg(3);
    return `<g transform="scale(${s})">${shadowE(11)}<g${sway ? ` class="sway2" style="${st}"` : ''}><path d="M-2,0 V-12 H2 V0Z" fill="#5a3d26"/>
      <path d="M0,-58 L13,-26 L-13,-26Z" fill="#3f7a3a"/><path d="M0,-46 L15,-12 L-15,-12Z" fill="#356c32"/><path d="M0,-58 L13,-26 L5,-26 L0,-50Z" fill="#000" opacity=".1"/></g></g>`;
  }
  function araucariaS(s = 1, sway = false) {
    let t = `<path d="M-2.4,0 L-1.3,-100 L1.3,-100 L2.4,0Z" fill="#5a3d26"/>`;
    for (const [ty, w] of [[-66, 27], [-79, 32], [-91, 29], [-101, 21]]) {
      for (const k of [-1, 1]) {
        t += `<path d="M0,${ty} C${k * w * .4},${ty + 4} ${k * w * .8},${ty} ${k * w},${ty - 12} L${k * (w - 3)},${ty - 15} C${k * w * .7},${ty - 5} ${k * w * .3},${ty - 4} 0,${ty - 3}Z" fill="#2f5a2e"/>`;
        t += `<ellipse cx="${k * w}" cy="${ty - 13}" rx="6.5" ry="4" fill="#3d6e38"/>`;
      }
    }
    t += `<ellipse cx="0" cy="-105" rx="12" ry="4.5" fill="#3d6e38"/>`;
    const st = neg(3);
    return `<g transform="scale(${s})">${shadowE(16)}<g${sway ? ` class="sway2" style="${st}"` : ''}>${t}</g></g>`;
  }
  function angicoS(s = 1) {
    let crown = '';
    const blobs = [[-70, -150, 46, 20], [65, -155, 50, 22], [0, -172, 58, 22], [-30, -140, 40, 17], [35, -138, 42, 16], [-95, -128, 28, 13], [100, -132, 30, 13], [5, -150, 50, 18]];
    for (const [x, y, rx, ry] of blobs) crown += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#6f9f42"/>`;
    for (const [x, y, rx, ry] of blobs) crown += `<ellipse cx="${x - 6}" cy="${y - 6}" rx="${rx * .75}" ry="${ry * .6}" fill="#8dbb57"/>`;
    for (let i = 0; i < 60; i++) crown += `<circle cx="${f(rr(-110, 115))}" cy="${f(rr(-185, -125))}" r="${f(rr(1.5, 3))}" fill="${pick(['#a9d16e', '#5d8c37', '#b7da80'])}"/>`;
    return `<g transform="scale(${s})">${shadowE(85, 26)}<g class="sway" style="animation-duration:6s">
      <path d="M-14,0 C-10,-40 -12,-70 -6,-100 L-40,-138 L-34,-142 L-2,-108 L2,-150 L8,-150 L8,-110 L48,-140 L53,-135 L14,-98 C14,-70 12,-40 16,0Z" fill="#5b4330"/>
      <path d="M-6,-10 C-4,-40 -6,-70 0,-96 M6,-20 C8,-50 6,-70 9,-90" stroke="#3f2d1f" stroke-width="2" fill="none"/>${crown}</g></g>`;
  }
  // árvore de salame: marca registrada da Majestade
  function salameTreeS(s = 1) {
    let crown = '';
    for (const [x, y, rx, ry, c] of [[-20, -52, 22, 15, '#3f7a2c'], [18, -54, 23, 15, '#3f7a2c'], [0, -64, 26, 16, '#4f8a35'], [-6, -58, 18, 10, '#5e9a3c'], [10, -66, 12, 6, '#6aa846']]) crown += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}"/>`;
    let sal = '';
    for (const [x, y] of [[-34, -46], [-24, -42], [-13, -44], [-2, -42], [9, -44], [20, -42], [31, -46], [-7, -50], [14, -51]]) {
      const L = rr(4, 9);
      sal += `<g transform="translate(${x},${y})"><g class="hang" style="${neg(2.6)}"><path d="M0,0 V${f(L)}" stroke="#d9c79c" stroke-width=".8"/>
        <rect x="-2.7" y="${f(L)}" width="5.4" height="14" rx="2.7" fill="#8e2f24"/><path d="M-2.7,${f(L + 2)} h5.4 M-2.7,${f(L + 7)} h5.4" stroke="#d9c79c" stroke-width=".5"/>
        <circle cx="-1" cy="${f(L + 4.5)}" r=".7" fill="#f3d9c9"/><circle cx="1.1" cy="${f(L + 9.5)}" r=".7" fill="#f3d9c9"/><circle cx="-.6" cy="${f(L + 12)}" r=".6" fill="#f3d9c9"/></g></g>`;
    }
    return `<g transform="scale(${s})">${shadowE(30, 10)}<g class="sway" style="animation-duration:5s">
      <path d="M-5,0 Q-3,-22 -3,-40 L-16,-50 M3,0 Q3,-24 3,-42 L18,-52 M0,-30 L0,-56" stroke="#5a3d26" stroke-width="5" fill="none" stroke-linecap="round"/>${crown}${sal}</g></g>`;
  }
  function sananduvaS(s = 1) {
    let br = '', fl2 = '';
    function cl(cx, cy) {
      for (let i = 0; i < 11; i++) {
        const a = rr(-200, 20), r0 = rr(0, 6), L = rr(7, 12);
        fl2 += `<path d="M0,0 Q${f(L * .45)},-2.4 ${f(L)},0 Q${f(L * .45)},2.4 0,0Z" fill="${pick(PET)}" transform="translate(${f(cx + Math.cos(rad(a)) * r0)},${f(cy + Math.sin(rad(a)) * r0)}) rotate(${f(a)})"/>`;
      }
    }
    function b(x1, y1, ang, len, w, d) {
      const a = rad(ang), x2 = x1 + Math.cos(a) * len, y2 = y1 + Math.sin(a) * len;
      br += `<path d="M${f(x1)},${f(y1)} L${f(x2)},${f(y2)}" stroke="#5a3a22" stroke-width="${f(w)}" stroke-linecap="round"/>`;
      if (d < 3) {
        for (const k of [-1, 1]) b(x2, y2, ang + k * rr(20, 34) - (ang + 90) * .12, len * rr(.6, .72), w * .62, d + 1);
        if (rnd() < .6) cl(x2, y2);
      } else cl(x2, y2);
    }
    br += `<path d="M-8,0 Q-5,-25 -4,-50 L4,-50 Q5,-25 8,0Z" fill="#5a3a22"/>`;
    for (const ang of [-165, -138, -112, -68, -42, -15]) b(0, -48, ang, rr(40, 50), 6, 1);
    return `<g transform="scale(${s})">${shadowE(60, 22)}<g class="sway" style="animation-duration:5s">${br}${fl2}</g></g>`;
  }

  // inverno: casaco, cachecol e touca (cores tiradas da cor da camisa, sem sorteio)
  const WARM = ['#c0392b', '#2e6fb5', '#e0b12f', '#7d3c98', '#e67e22', '#1e8449', '#f4f1ea', '#8e2f24'];
  function warmCols(shirt) { const k = (parseInt(shirt.slice(1), 16) || 0) % WARM.length; return [WARM[k], WARM[(k + 3) % WARM.length]]; }
  const coat = (shirt, yt, hh) => `<rect x="-5.4" y="${yt - .5}" width="10.8" height="${hh}" rx="3.2" fill="${shade(shirt, .72)}"/><path d="M0,${yt + 1} V${yt + hh - 2}" stroke="${shade(shirt, .55)}" stroke-width=".7"/>`;
  function scarfCap(shirt, yt, hy, cap) {
    const [sc, tc] = warmCols(shirt);
    let t = `<path d="M-4.6,${yt + 1} Q0,${yt + 3.2} 4.6,${yt + 1}" stroke="${sc}" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M2.6,${yt + 2} l1.4,6" stroke="${sc}" stroke-width="2.2" stroke-linecap="round"/>`;
    if (cap) t += `<path d="M-5.2,${hy - .4} A5.2,5.2 0 0 1 5.2,${hy - .4}Z" fill="${tc}"/><rect x="-5.5" y="${hy - 1.6}" width="11" height="2.2" rx="1.1" fill="${shade(tc, .8)}"/><circle cy="${hy - 5.8}" r="1.7" fill="#fff"/>`;
    return t;
  }

  // Semana Farroupilha: pilcha (sem sorteio, para não mudar o mapa)
  const LENCO = '<path d="M-3.4,-25.6 L3.4,-25.6 L0,-21.2Z" fill="#d7261e"/>';
  const chapeu = hy => `<ellipse cx="0" cy="${hy - 3.6}" rx="8.6" ry="1.9" fill="#1d1d1d"/><path d="M-4.6,${hy - 3.6} Q-4.6,${hy - 9} 0,${hy - 9} Q4.6,${hy - 9} 4.6,${hy - 3.6}Z" fill="#1d1d1d"/><path d="M-4.4,${hy - 4.6} H4.4" stroke="#8a5a2b" stroke-width=".9"/>`;
  const vestidoPrenda = c => `<path d="M-4.2,-17 L4.2,-17 L9.5,0 L-9.5,0Z" fill="${c}"/><path d="M-9.5,0 L9.5,0" stroke="#fff" stroke-width="1.6"/><path d="M-6.5,-8 L6.5,-8" stroke="${shade(c, .8)}" stroke-width=".8"/>`;

  // pessoa de perfil, pés em (0,0), ~34 de altura (use escala PS)
  function person(o = {}) {
    const shirt = o.shirt || pick(SHIRTS), pants = o.pants || pick(PANTS);
    const skin = o.skin || pick(SKINS), hair = o.hair || pick(HAIRS);
    const walk = o.walk !== false, d = neg(1);
    const prenda = FARRAPOS && (o.dress || o.long), peao = FARRAPOS && !prenda;
    const lw = peao ? 5.2 : 3.6, bota = peao ? '<path d="M0,-3.2 L0,0 L2.4,0" stroke="#1d1d1d" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' : '';
    let s = `<ellipse rx="7" ry="2.5" fill="#000" opacity=".15"/>`;
    s += `<g class="${walk ? 'leg-a' : ''}" style="transform-origin:0px -12px;${d}"><path d="M0,-12 L0,0" stroke="${pants}" stroke-width="${lw}" stroke-linecap="round"/>${bota}</g>`;
    s += `<g class="${walk ? 'leg-b' : ''}" style="transform-origin:0px -12px;${d}"><path d="M0,-12 L0,0" stroke="${pants}" stroke-width="${lw}" stroke-linecap="round"/>${bota}</g>`;
    if (prenda) s += vestidoPrenda(shirt);
    s += `<g class="${walk ? 'walk-bob' : ''}" style="${d}">`;
    s += o.dress ? `<path d="M-4,-26 L4,-26 L7.5,-9 L-7.5,-9Z" fill="${shirt}"/>` : `<rect x="-4.5" y="-26" width="9" height="15" rx="3" fill="${shirt}"/>`;
    if (peao) s += LENCO;
    if (INVERNO) s += coat(shirt, -26, o.dress ? 17.5 : 16.5);
    if (o.apron) s += `<rect x="-1" y="-22" width="6" height="12" rx="1" fill="#fff"/>`;
    s += `<circle cx="0" cy="-30.5" r="4.8" fill="${skin}"/>`;
    s += o.long
      ? `<path d="M-5,-31 A5,5 0 0 1 5,-32 Q1,-34 -2,-31 Q-3,-27 -1,-22 L-5.5,-23 Q-6.5,-28 -5,-31Z" fill="${hair}"/>`
      : `<path d="M-5,-30.5 A5,5 0 0 1 5,-32 Q1,-34.5 -3,-32 Q-4.5,-30.5 -3.5,-28.5 L-5.2,-28.5Z" fill="${hair}"/>`;
    if (o.hat) s += `<ellipse cx="0" cy="-34" rx="8" ry="1.6" fill="${o.hat}"/><rect x="-4.5" y="-39" width="9" height="5" rx="2" fill="${o.hat}"/>`;
    if (INVERNO) s += scarfCap(shirt, -26, -30.5, !o.hat && !o.veil);
    if (peao && !o.hat) s += chapeu(-30.5);
    if (o.veil) s += `<path d="M-3,-35 Q-12,-22 -9,-8 L-3,-10Z" fill="#fff" opacity=".85"/>`;
    if (o.carry) {
      s += `<path d="M0,-22 L8,-17" stroke="${skin}" stroke-width="2.6" stroke-linecap="round"/>`;
      if (o.carry === 'xis') s += `<ellipse cx="11" cy="-16.5" rx="8" ry="1.6" fill="#fff"/><ellipse cx="11" cy="-18.5" rx="7" ry="2.6" fill="#e3ad5c"/><path d="M6,-18.5 h10" stroke="#9c6a2c" stroke-width=".8"/>`;
      else if (o.carry === 'tray') s += `<rect x="3" y="-19" width="15" height="1.8" rx=".9" fill="#8a6a4a"/><rect x="5" y="-23.5" width="3.6" height="4.5" rx="1" fill="#fff"/><rect x="12" y="-23.5" width="3.6" height="4.5" rx="1" fill="#fff"/>
        <path class="steam" style="${neg(2)}" d="M7,-25 q-1.5,-3 0,-6 M14,-25 q1.5,-3 0,-6" stroke="#fff" stroke-width="1" fill="none"/>`;
      else if (o.carry === 'cuia') s += `<path d="M7,-20 q0,5 3,5 q3,0 3,-5Z" fill="#4c7a2a"/><path d="M10,-20 l1.5,-5" stroke="#c0c0c0" stroke-width="1"/>`;
      else if (o.carry === 'balloon') s += `<path d="M8,-17 L12,-46" stroke="#777" stroke-width=".6"/><ellipse cx="12" cy="-52" rx="5.5" ry="7" fill="#e84393"/>`;
      else if (o.carry === 'pizza') s += `<path d="M3,-17.5 h14" stroke="#8a6038" stroke-width="1.4"/><ellipse cx="12" cy="-19" rx="7.5" ry="2.6" fill="#e9b25c"/><ellipse cx="12" cy="-19.4" rx="6.2" ry="2" fill="#d9472b"/><circle cx="10" cy="-19.6" r=".8" fill="#fff4c9"/><circle cx="14" cy="-19.2" r=".8" fill="#fff4c9"/><circle cx="12.3" cy="-20" r=".6" fill="#3f7a2c"/>`;
      else if (o.carry === 'burger') s += `<ellipse cx="11" cy="-16.5" rx="7" ry="1.6" fill="#fff"/><path d="M6.5,-18 q4.5,-5 9,0Z" fill="#e3a24c"/><rect x="6.5" y="-18.4" width="9" height="1.4" fill="#5a3320"/><rect x="6.3" y="-19" width="9.4" height=".8" fill="#6aa846"/><rect x="6.8" y="-17.2" width="8.4" height="1" rx=".5" fill="#e3a24c"/>`;
      else if (o.carry === 'basket') s +=`<path d="M5,-19 h12 l-2,7 h-8Z" fill="#b5835a"/><circle cx="8" cy="-19.5" r="1.8" fill="#e3241b"/><circle cx="12" cy="-20" r="1.8" fill="#e3241b"/><circle cx="15" cy="-19.5" r="1.6" fill="#d81f14"/>`;
    } else s += `<path d="M0,-22 L1.5,-13" stroke="${skin}" stroke-width="2.6" stroke-linecap="round"/>`;
    return s + `</g>`;
  }
  function seated(o = {}) {
    const shirt = o.shirt || pick(SHIRTS), pants = o.pants || pick(PANTS);
    const skin = o.skin || pick(SKINS), hair = o.hair || pick(HAIRS);
    return `<path d="M0,-10 L7,-10 L7,0" stroke="${pants}" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="-4.5" y="-24" width="9" height="15" rx="3" fill="${shirt}"/>${INVERNO ? coat(shirt, -24, 15.5) : ''}<path d="M1,-20 L8,-15" stroke="${skin}" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="0" cy="-28.5" r="4.8" fill="${skin}"/>
      ${o.long ? `<path d="M-5,-29 A5,5 0 0 1 5,-30 Q1,-32 -2,-29 Q-3,-25 -1,-20 L-5.5,-21 Q-6.5,-26 -5,-29Z" fill="${hair}"/>` : `<path d="M-5,-28.5 A5,5 0 0 1 5,-30 Q1,-32.5 -3,-30 Q-4.5,-28.5 -3.5,-26.5 L-5.2,-26.5Z" fill="${hair}"/>`}${INVERNO ? scarfCap(shirt, -24, -28.5, true) : ''}${FARRAPOS ? `<path d="M-3.4,-23.6 L3.4,-23.6 L0,-19.2Z" fill="#d7261e"/>${o.long ? '' : chapeu(-28.5)}` : ''}
      ${o.cuia ? `<path d="M7,-19 q0,5 3,5 q3,0 3,-5Z" fill="#4c7a2a"/><path d="M10,-19 l1.5,-5" stroke="#c0c0c0" stroke-width="1"/>` : ''}`;
  }
  function crouch(o = {}) {
    const shirt = o.shirt || pick(SHIRTS), skin = pick(SKINS), hair = pick(HAIRS);
    return `<ellipse rx="8" ry="2.5" fill="#000" opacity=".15"/><path d="M-3,0 L-1,-7 L5,-6 L6,0" stroke="${pick(PANTS)}" stroke-width="3.4" fill="none" stroke-linejoin="round"/>
      <path d="M-3,-8 Q0,-20 4,-19 L8,-12 Q2,-6 -3,-8Z" fill="${shirt}"/><circle cx="7" cy="-20" r="4.5" fill="${skin}"/><path d="M2.5,-21 A4.6,4.6 0 0 1 11,-22 Q8,-25 2.5,-21Z" fill="${hair}"/>
      <ellipse cx="7" cy="-25" rx="7" ry="1.6" fill="#e9d29a"/><rect x="3.5" y="-29" width="7" height="4.5" rx="2" fill="#e9d29a"/>
      <path d="M10,-3 h10 l-2,4 h-6Z" fill="#b5835a"/><circle cx="13" cy="-3.6" r="1.7" fill="#e3241b"/><circle cx="16.5" cy="-3.8" r="1.7" fill="#d81f14"/>`;
  }

  function cow(o = {}) {
    const sp = '#2b2b2b';
    return `${shadowE(28, 7)}
      <rect x="-21" y="-16" width="5" height="16" fill="#efece4"/><rect x="-12" y="-16" width="5" height="16" fill="#e3dfd5"/>
      <rect x="12" y="-16" width="5" height="16" fill="#efece4"/><rect x="20" y="-16" width="5" height="16" fill="#e3dfd5"/>
      <rect x="-21" y="-3" width="5" height="3" fill="${sp}"/><rect x="-12" y="-3" width="5" height="3" fill="${sp}"/><rect x="12" y="-3" width="5" height="3" fill="${sp}"/><rect x="20" y="-3" width="5" height="3" fill="${sp}"/>
      <g class="tail" style="transform-origin:-26px -28px;${neg(1.3)}"><path d="M-26,-28 Q-33,-20 -31,-9" stroke="#d8d3c8" stroke-width="2" fill="none"/><ellipse cx="-31" cy="-8" rx="2.4" ry="3.4" fill="${sp}"/></g>
      <ellipse cx="0" cy="-26" rx="28" ry="14" fill="#fbfaf6"/>
      <path d="M-14,-38 Q-4,-36 -6,-26 Q-12,-20 -20,-26 Q-22,-34 -14,-38Z" fill="${sp}"/><path d="M6,-20 Q14,-24 18,-16 Q10,-12 6,-20Z" fill="${sp}"/><path d="M8,-39 Q16,-38 15,-32 Q10,-30 8,-39Z" fill="${sp}"/>
      <ellipse cx="2" cy="-12.5" rx="6" ry="3" fill="#f5b5c0"/>
      <g class="graze" style="transform-origin:20px -30px;${neg(3.5)}">
        <path d="M18,-34 Q26,-38 30,-30 L30,-22 Q22,-20 18,-26Z" fill="#fbfaf6"/><ellipse cx="34" cy="-28" rx="9" ry="7.5" fill="#fbfaf6"/>
        <ellipse cx="40" cy="-24" rx="5.5" ry="4.5" fill="#f5b5c0"/><circle cx="41.5" cy="-24.5" r=".9" fill="#a05060"/>
        <path d="M33,-30.5 q1.6,-1.6 3.2,0" stroke="${sp}" stroke-width="1.1" fill="none"/>
        <ellipse cx="28" cy="-34" rx="5" ry="2.4" fill="${sp}" transform="rotate(-25 28 -34)"/>
        <path d="M31,-35 q1,-5 4,-6 M36,-35 q2,-4 5,-4" stroke="#d9c79c" stroke-width="2" fill="none" stroke-linecap="round"/></g>
      ${o.moo ? `<g transform="translate(46,-50)"><g class="moo" style="${neg(9)}"><rect x="-4" y="-22" width="44" height="20" rx="10" fill="#fff" stroke="#34452a" stroke-width="1.5"/><path d="M2,-3 L-2,4 L8,-3Z" fill="#fff" stroke="#34452a" stroke-width="1.5" stroke-linejoin="round"/><path d="M2,-3.5 L9,-3.5" stroke="#fff" stroke-width="2.5"/><text x="18" y="-8" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="800" font-size="11" fill="#34452a">Muuu!</text></g></g>` : ''}`;
  }
  function duck(white = true) {
    return white
      ? `<g class="duck-bob" style="${neg(1.4)}"><ellipse cx="0" cy="-4" rx="10" ry="5.5" fill="#fff"/><path d="M-10,-6 L-14,-9 L-9,-3Z" fill="#fff"/><path d="M-4,-7 Q2,-10 4,-5" stroke="#ddd" stroke-width="1.2" fill="none"/><circle cx="7" cy="-11" r="4.2" fill="#fff"/><path d="M10.5,-11.5 L15,-10.5 L10.5,-9.5Z" fill="#f39c12"/><circle cx="8.3" cy="-12" r=".9" fill="#222"/></g>`
      : `<g class="duck-bob" style="${neg(1.4)}"><ellipse cx="0" cy="-4" rx="10" ry="5.5" fill="#8d6e53"/><path d="M-4,-7 Q2,-10 4,-5" stroke="#3d6fb6" stroke-width="1.6" fill="none"/><circle cx="7" cy="-11" r="4.2" fill="#1e7b45"/><path d="M4,-7.5 h6" stroke="#fff" stroke-width="1"/><path d="M10.5,-11.5 L15,-10.5 L10.5,-9.5Z" fill="#f1c40f"/><circle cx="8.3" cy="-12" r=".9" fill="#222"/></g>`;
  }
  const duckling = () => `<g class="duck-bob" style="${neg(1.4)}"><ellipse cx="0" cy="-2.5" rx="5" ry="3" fill="#f7d33c"/><circle cx="3.5" cy="-6" r="2.4" fill="#f7d33c"/><path d="M5.5,-6.3 L8,-5.8 L5.5,-5.2Z" fill="#e67e22"/></g>`;
  const bird = () => `<g class="wing" style="${neg(.35)}"><path d="M-10,0 Q-5,-7 0,0 Q5,-7 10,0" fill="none" stroke="#3b3b3b" stroke-width="2.4" stroke-linecap="round"/></g>`;
  const cloud = (y, s, dur, op = .92) => `<g class="cloud" style="animation-duration:${dur}s;${neg(dur)}"><g transform="translate(0,${y}) scale(${s})" fill="#fff" opacity="${op}">
      <circle cx="0" cy="0" r="26"/><circle cx="30" cy="-14" r="34"/><circle cx="66" cy="-4" r="28"/><circle cx="92" cy="6" r="18"/><rect x="-10" y="0" width="112" height="24" rx="12"/></g></g>`;

  function tableS(umb = '#e74c3c', l = true, r = true, item = 'xis') {
    const food = item === 'xis' ? `<ellipse cx="0" cy="-10.5" rx="5" ry="1.6" fill="#e3ad5c"/>` : item === 'cafe' ? `<rect x="-4" y="-13" width="2.6" height="3" fill="#fff"/><rect x="1.5" y="-13" width="2.6" height="3" fill="#fff"/><path class="steam" style="${neg(2)}" d="M-3,-14 q-1,-2 0,-4 M2.8,-14 q1,-2 0,-4" stroke="#fff" stroke-width=".8" fill="none"/>`
      : item === 'pizza' ? `<ellipse cx="-1" cy="-10" rx="5.4" ry="1.9" fill="#e9b25c"/><ellipse cx="-1" cy="-10.2" rx="4.4" ry="1.4" fill="#d9472b"/><circle cx="-2.4" cy="-10.3" r=".6" fill="#fff4c9"/><circle cx=".6" cy="-10" r=".6" fill="#fff4c9"/><path d="M4,-11.5 q2,-3 4,0Z" fill="#e3a24c"/><rect x="4" y="-11.7" width="4" height=".8" fill="#5a3320"/>` : '';
    return `${shadowE(14)}${l ? `<g transform="translate(-11,2) scale(.5)">${seated({})}</g>` : ''}
      <ellipse cx="0" cy="-9" rx="9" ry="3.6" fill="#fff"/><path d="M0,-9 V0" stroke="#888" stroke-width="1.4"/>${food}
      ${umb ? `<path d="M0,-9 V-32" stroke="#6b4a2b" stroke-width="1.2"/><path d="M-16,-27 Q0,-40 16,-27Z" fill="${umb}"/><path d="M-6,-30 Q0,-38 6,-30" fill="#fff" opacity=".35"/>` : ''}
      ${r ? `<g transform="translate(11,2) scale(-.5,.5)">${seated({})}</g>` : ''}`;
  }
  const benchS = (who = '') => `${shadowE(12, 4)}<rect x="-12" y="-7" width="24" height="3" fill="#7a5232"/><rect x="-12" y="-13" width="24" height="2.5" fill="#8a6038"/><path d="M-10,-4 V0 M10,-4 V0" stroke="#444" stroke-width="2"/>${who}`;
  const lampS = () => `<path d="M0,0 V-34" stroke="#2d3436" stroke-width="2"/><circle cy="-36" r="4" fill="#fff3b0" class="twinkle"/>`;
  function signS(lines, o = {}) {
    const w = o.w || 70, h = o.h || 26, bg = o.bg || '#f7f2e8', fg = o.fg || '#34452a', post = o.post || '#6b4a2b';
    let t = '';
    lines.forEach((ln, i) => (t += `<text x="0" y="${f(-h - 10 + (i + 1) * (h / (lines.length + .3)))}" text-anchor="middle" font-family="${ln[2] || 'Montserrat,sans-serif'}" font-weight="${ln[3] || 800}" font-size="${ln[1]}" fill="${ln[4] || fg}">${ln[0]}</text>`));
    return `${shadowE(w / 2.4, 4)}<path d="M${-w / 2 + 6},0 V-12 M${w / 2 - 6},0 V-12" stroke="${post}" stroke-width="3"/>
      <rect x="${-w / 2}" y="${-h - 10}" width="${w}" height="${h}" rx="4" fill="${bg}" stroke="${post}" stroke-width="2"/>${t}`;
  }
  const cattail = () => `<path d="M0,0 V-16 M3,0 V-12 M-3,0 Q-4,-6 -6,-10" stroke="#557a2c" stroke-width="1.6" fill="none"/><ellipse cx="0" cy="-17" rx="1.8" ry="4" fill="#7a4e2a"/><ellipse cx="3" cy="-13" rx="1.6" ry="3.4" fill="#7a4e2a"/>`;
  const candle = (h = 9) => `<rect x="-2" y="${-h}" width="4" height="${h}" rx="1" fill="#f8efe0"/><circle cy="${-h - 3}" r="5" fill="#ffd27a" opacity=".3" class="twinkle"/><g class="flame" style="transform-origin:0px ${-h}px;${neg(1)}"><path d="M0,${-h - 7} Q2.6,${-h - 2} 0,${-h} Q-2.6,${-h - 2} 0,${-h - 7}Z" fill="#ffb02e"/><circle cy="${-h - 2.5}" r="1" fill="#fff6c9"/></g>`;

  // ==================================================================
  // veículos: montados com caixas giradas, em 8 direções
  // (0 = +x, 2 = +y, 4 = -x, 6 = -y; ímpares = diagonais, ex.: 5 = norte na tela, 1 = sul)
  // ==================================================================
  function prism(cx, cy, hl, hw, z0, z1, ang, c) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const Wc = [[hl, hw], [-hl, hw], [-hl, -hw], [hl, -hw]].map(([u, v]) => [cx + u * ca - v * sa, cy + u * sa + v * ca]);
    let s = '';
    for (let i = 0; i < 4; i++) {
      const a = Wc[i], b = Wc[(i + 1) % 4];
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy, n = Math.hypot(mx, my) || 1, nx = mx / n, ny = my / n;
      if (nx + ny <= .02) continue; // face virada para trás
      s += poly([P0(a[0], a[1], z0), P0(b[0], b[1], z0), P0(b[0], b[1], z1), P0(a[0], a[1], z1)], shade(c, .9 + .1 * (ny - nx)));
    }
    return s + poly(Wc.map(p => P0(p[0], p[1], z1)), shade(c, 1.18));
  }
  function vehicle(parts) {
    const out = [];
    for (let k = 0; k < 8; k++) {
      const ang = k * Math.PI / 4, ca = Math.cos(ang), sa = Math.sin(ang);
      const items = parts.map(([f0, f1, s0, s1, z0, z1, c]) => {
        const fm = (f0 + f1) / 2, sm = (s0 + s1) / 2, hl = (f1 - f0) / 2, hw = (s1 - s0) / 2;
        const cx = fm * ca - sm * sa, cy = fm * sa + sm * ca;
        const ex = Math.abs(hl * ca) + Math.abs(hw * sa), ey = Math.abs(hl * sa) + Math.abs(hw * ca);
        return { cx, cy, hl, hw, z0, z1, c, x0: cx - ex, x1: cx + ex, y0: cy - ey, y1: cy + ey };
      });
      const over = (a, b) => a.x0 < b.x1 - .01 && b.x0 < a.x1 - .01 && a.y0 < b.y1 - .01 && b.y0 < a.y1 - .01;
      const before = (a, b) => over(a, b) ? (a.z0 < b.z0 || (a.z0 === b.z0 && a.cx + a.cy < b.cx + b.cy)) : behind(a, b);
      const left = items.slice(), ord = [];
      while (left.length) {
        const i = left.findIndex(a => !left.some(b => b !== a && before(b, a)));
        ord.push(left.splice(i < 0 ? 0 : i, 1)[0]);
      }
      const sz = Math.max(...items.map(b => Math.max(Math.abs(b.x0), Math.abs(b.x1), Math.abs(b.y0), Math.abs(b.y1))));
      out[k] = `<ellipse cx="${CX}" cy="${CY}" rx="${f(sz * 1.15)}" ry="${f(sz * .55)}" fill="#000" opacity=".14"/>` +
        ord.map(b => prism(b.cx, b.cy, b.hl, b.hw, b.z0, b.z1, ang, b.c)).join('');
    }
    return out;
  }
  // posiciona um veículo parado no bloco atual
  const parked = (v, k, x, y) => `<g transform="translate(${f(x + OX - y - OY)},${f((x + OX + y + OY) / 2 - OZ)})">${v[k]}</g>`;
  const W4 = (fa, fb, w, r, c = '#222') => [[fa, fb, -w - 2, -w + 1, 0, r, c], [fa, fb, w - 1, w + 2, 0, r, c]];
  const BUS = vehicle([...W4(-24, -14, 11, 8), ...W4(14, 24, 11, 8), [-32, 32, -11, 11, 3, 17, '#f5c21b'], [-30, 32, -11, 11, 17, 25, '#bfe3f5'], [-32, 32, -11, 11, 25, 28, '#f5c21b']]);
  const PICKUP = vehicle([...W4(-20, -12, 9, 8), ...W4(13, 21, 9, 8), [-26, 26, -9, 9, 3, 12, '#c0392b'], [-2, 14, -8.5, 8.5, 12, 20, '#bfe3f5'], [-2, 14, -9, 9, 20, 22, '#c0392b'], [-22, -16, -6, 0, 12, 18, '#bdc3c7'], [-22, -16, 1, 7, 12, 18, '#bdc3c7'], [-12, -4, -6, 6, 12, 17, '#e2c26a']]);
  const CAR = c => vehicle([...W4(-15, -8, 8, 7), ...W4(8, 15, 8, 7), [-18, 18, -8, 8, 3, 11, c], [-9, 9, -7.5, 7.5, 11, 17, '#cfe9f7'], [-9, 9, -8, 8, 17, 19, c]]);
  const TRACTOR = c => vehicle([[-14, -2, -12, -7, 0, 18, '#222'], [-14, -2, 7, 12, 0, 18, '#222'], [12, 19, -8, -5, 0, 9, '#222'], [12, 19, 5, 8, 0, 9, '#222'],
    [-14, 0, -6, 6, 5, 11, c], [0, 19, -5, 5, 6, 16, c], [-13, -1, -7, 7, 11, 30, '#d6eef9'], [-15, 1, -9, 9, 30, 33, '#f1c40f'], [14, 16, -1, 1, 16, 28, '#333']]);
  // charrete (carreta de madeira com feno) para engatar no trator
  const CART = vehicle([[-10, -2, -13, -10, 0, 9, '#3a2a1a'], [-10, -2, 10, 13, 0, 9, '#3a2a1a'], [-24, 6, -10, 10, 5, 8, '#8a6038'],
    [-24, 6, -10, -8, 8, 14, '#a8743f'], [-24, 6, 8, 10, 8, 14, '#a8743f'], [-24, -22, -8, 8, 8, 14, '#a8743f'], [4, 6, -8, 8, 8, 14, '#a8743f'],
    [-20, 2, -7, 7, 8, 17, '#e2c26a'], [6, 18, -1, 1, 5, 7, '#5a3d26']]);
  function rabbit(c = '#f4f1ea', extra = '') {
    return `${shadowE(6, 2)}<g class="bunny" style="${neg(.9)}"><ellipse cx="0" cy="-4" rx="6" ry="4.2" fill="${c}"/><circle cx="-5.6" cy="-5" r="2" fill="#fff"/>
      <circle cx="5" cy="-7" r="3.2" fill="${c}"/><ellipse cx="3.6" cy="-12.5" rx="1.2" ry="4" fill="${c}" transform="rotate(-12 3.6 -12.5)"/><ellipse cx="6" cy="-12.5" rx="1.2" ry="4" fill="${c}" transform="rotate(10 6 -12.5)"/>
      <ellipse cx="6" cy="-12.2" rx=".5" ry="2.6" fill="#f5b5c0" transform="rotate(10 6 -12.2)"/><circle cx="6.4" cy="-7.4" r=".7" fill="#222"/><circle cx="8" cy="-6.4" r=".6" fill="#e58a9a"/>${extra}</g>`;
  }
  const MICROBUS = vehicle([...W4(-20, -11, 10, 8), ...W4(12, 21, 10, 8), [-26, 26, -10, 10, 3, 16, '#f4f4f4'], [-26, 26, -10.3, 10.3, 6, 12, '#e0a91f'],
    [-24, 24, -10, 10, 16, 24, '#bfe3f5'], [-26, 26, -10, 10, 24, 27, '#f4f4f4']]);
  const KAYAK = vehicle([[-14, 14, -3.5, 3.5, 0, 3, '#e67e22'], [-3, 3, -2.5, 2.5, 3, 11, '#3d7dd9'], [-1.5, 1.5, -1.5, 1.5, 11, 15, '#f1c7a0']]);

  // ==================================================================
  // listas de objetos
  // ==================================================================
  const statics = [];
  function add(x0, y0, x1, y1, s, spot) {
    const [a, b] = Wd(x0, y0), [c, d] = Wd(x1, y1);
    statics.push({ x0: Math.min(a, c), y0: Math.min(b, d), x1: Math.max(a, c), y1: Math.max(b, d), s, spot });
  }
  function sprite(x, y, inner, r = 8, spot, z = 0, s = 1) { add(x - r, y - r, x + r, y + r, at(x, y, z, inner, s), spot); }
  function behind(a, b) {
    return (a.x1 <= b.x0 && a.y0 < b.y1) || (a.y1 <= b.y0 && a.x0 < b.x1);
  }

  const movers = [];
  // kind: 'veh' (4 direções) | 'sprite' (espelha conforme o sentido)
  function mover(o) {
    const pts = o.path.map(p => Wd(p[0], p[1])), segs = [];
    let L = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ a, b, len, L0: L }); L += len;
    }
    movers.push(Object.assign({ mode: 'loop', phase: rnd(), s: 1, r: 6, slot: -2, dir: null, z: OZ }, o, { segs, L }));
  }
  function ellipsePath(cx, cy, rx, ry, n = 28, rev = false) {
    const a = [];
    for (let i = 0; i <= n; i++) { const t = (rev ? -1 : 1) * i / n * Math.PI * 2; a.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); }
    return a;
  }

  const reserved = [];
  const reserve = (x0, y0, x1, y1) => { const [a, b] = Wd(x0, y0), [c, d] = Wd(x1, y1); reserved.push([Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d)]); };
  const ROADS = []; // [pontos, meia-largura] — para não nascer árvore em cima da estrada
  const distSeg = (x, y, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L));
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
  };
  const nearRoad = (x, y, m = 0) => ROADS.some(([pts, hw]) => pts.some((p, i) => i && distSeg(x, y, pts[i - 1], p) < hw + m));
  const isFree = (x, y, m = 14) => {
    [x, y] = Wd(x, y);
    return !reserved.some(([a, b, c, d]) => x > a - m && x < c + m && y > b - m && y < d + m) && !nearRoad(x, y, m);
  };

  const pins = [];
  const pin = (id, x, y, z) => pins.push({ id, p: P(x, y, z) });
  const pinScreen = (id, sx, sy) => pins.push({ id, p: [sx, sy] });
  const lakes = [];
  const beeCenters = [];
  const flocks = []; // passarinhos voando em círculos sobre um lugar

  // ==================================================================
  // MAPA — o topo da tela é o NORTE (direita = leste).
  // Cidade no centro; rodovias asfaltadas sul–norte e cidade–noroeste.
  // ==================================================================
  let G = '';
  let MIST = ''; // tapete de nuvens a oeste (fica por cima dos objetos)
  G += `<rect x="0" y="290" width="${W}" height="${H - 290}" fill="#7fb257"/>`;

  const CITY = { x0: 472, x1: 1018, y0: 472, y1: 1018 };
  const SX = [490, 660, 830, 1000];
  const BL = [[508, 642], [678, 812], [848, 982]];
  reserve(CITY.x0 - 12, CITY.y0 - 12, CITY.x1 + 12, CITY.y1 + 12);

  // colcha de lavouras em volta
  const FIELD = ['#9ccc6e', '#8fc463', '#a7d277', '#b8d98a', '#d6d38a', '#c9b56e', '#93c766', '#aed67e'];
  for (let gx = -900; gx < 2200; gx += 170) for (let gy = -700; gy < 2300; gy += 170) {
    const cx = gx + 85, cy = gy + 85;
    if (gx + 170 > CITY.x0 - 30 && gx < CITY.x1 + 30 && gy + 170 > CITY.y0 - 30 && gy < CITY.y1 + 30) continue;
    if (!visible(cx, cy, 300)) continue;
    const c = pick(FIELD);
    G += quad(gx + 5, gy + 5, gx + 165, gy + 165, c);
    if (rnd() < .45) {
      const alongX = rnd() < .5;
      for (let k = 18; k < 160; k += 14) {
        G += alongX ? line(P(gx + 8, gy + k), P(gx + 162, gy + k), shade(c, .88), 2.2) : line(P(gx + k, gy + 8), P(gx + k, gy + 162), shade(c, .88), 2.2);
      }
    }
  }

  // ---- estradas ----
  // estradas: desenhadas por último no chão (por cima dos gramados). Primeiro as de chão,
  // depois o asfalto (bordas, pista e faixa central) — assim os entroncamentos ficam limpos.
  const RDL = { dirt: '', edge: '', surf: '', line: '' };
  function road(pts, w, asphalt) {
    ROADS.push([pts, w / 2 + 6]);
    const mid = `M${pts.map(p => pt(P(p[0], p[1]))).join(' L')}`;
    if (asphalt) {
      RDL.edge += `<path d="${strip(pts, w + 6)}" fill="#9a9a8c"/>`;
      RDL.surf += `<path d="${strip(pts, w)}" fill="#686c73"/>`;
      RDL.line += `<path d="${mid}" stroke="#f4efe2" stroke-width="2" fill="none" stroke-dasharray="14 12"/>`;
    } else RDL.dirt += `<path d="${strip(pts, w)}" fill="#c9a46b"/><path d="${mid}" stroke="#b48d55" stroke-width="2" fill="none" stroke-dasharray="22 10 40 8" opacity=".8"/>`;
  }
  const S_HWY = [[1490, 1490], [1018, 1018]];          // rodovia que vem do sul
  const N_HWY = [[472, 472], [58, 58]];              // segue para o norte (some nas nuvens do horizonte)
  const NW_HWY = [[472, 660], [180, 660], [-420, 955]]; // da cidade para o noroeste
  road(S_HWY, 40, true); road(N_HWY, 40, true); road(NW_HWY, 40, true);
  road([[505, 1020], [505, 1070], [580, 1165]], 24);                  // Dallas (oeste)
  road([[250, 682], [250, 860], [335, 965]], 22);                     // subida do Espaço Ágape
  road([[239, 792], [212, 792]], 18);                                 // ramal do Sítio Vicenci
  road([[1060, 1036], [1060, 150], [1016, 150]], 24);    // Fazenda Fracasso e Belusso
  road([[1072, 470], [1102, 470]], 20);
  road([[1262, 1236], [1540, 878]], 24);                              // acesso à Kaskata
  road([[773, 1012], [773, 1208]], 20);                               // da Vicato até a Flora (sudoeste)
  // bocas de asfalto onde as rodovias (diagonais no mapa) encontram as esquinas da cidade:
  // sem os triângulos de grama entre o fim da rodovia e as ruas
  RDL.surf += poly([P(958, 1018), P(1042, 1062), P(1062, 1042), P(1018, 958)], '#686c73');
  RDL.surf += poly([P(472, 532), P(430, 452), P(452, 430), P(532, 472)], '#686c73');

  // ==================================================================
  // CIDADE (centro do mapa)
  // ==================================================================
  G += quad(CITY.x0, CITY.y0, CITY.x1, CITY.y1, '#686c73');
  for (const [a, b] of BL) for (const [c, d] of BL) G += quad(a, c, b, d, '#d9d3c6');
  for (const v of SX) G += line(P(CITY.x0, v), P(CITY.x1, v), '#f4efe2', 2, 'stroke-dasharray="12 10"') + line(P(v, CITY.y0), P(v, CITY.y1), '#f4efe2', 2, 'stroke-dasharray="12 10"');
  for (let k = 0; k < 6; k++) G += quad(728 + k * 6, 646, 731 + k * 6, 674, '#f4efe2'); // faixa de pedestres igreja → praça

  const WALLS = ['#f6c1b4', '#bfe0c7', '#f8e1a1', '#c9d6f2', '#f3c6e0', '#e8d6b8', '#bfe3f5', '#f4f1ea', '#f7d6a8'];
  const ROOFS = ['#b5452f', '#a0522d', '#8e3b2a', '#c0563a', '#6d4c41'];
  // luzes de Natal ao longo de uma linha (pontos já na tela), piscando em cores alternadas.
  // Pisca-pisca sem animação por lâmpada (centenas delas pesavam a cada quadro): cada lâmpada pinta com
  // uma "tinta" compartilhada por cor e grupo (a/b), e um temporizador acende e apaga as tintas.
  const XMAS = ['#ff4d4d', '#ffd23f', '#4dd36b', '#4db8ff', '#ff8ad8', '#ffe27a']; // a última é o brilho da estrela
  const lamp = (k, b) => `url(#lz${k}${b ? 'b' : 'a'})`;
  if (NATAL) XMAS.forEach((c, k) => { for (const g of 'ab') defs += `<linearGradient id="lz${k}${g}"><stop class="lz-${g}" stop-color="${c}"/></linearGradient>`; });
  function bulbs(pts, step = 6, r = 1.5) {
    let t = `<path d="M${pts.map(pt).join(' L')}" stroke="#2c3a21" stroke-width=".5" fill="none" opacity=".7"/>`, n = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let u = 0; u < L; u += step, n++) t += `<circle cx="${f(a[0] + (b[0] - a[0]) * u / L)}" cy="${f(a[1] + (b[1] - a[1]) * u / L)}" r="${r}" fill="${lamp(n % 5, n % 2)}"/>`;
    }
    return t;
  }
  function roofLights(x, y, w, d, h, rh, along, ov = 3) {
    const X0 = x - ov, X1 = x + w + ov, Y0 = y - ov, Y1 = y + d + ov;
    if (along === 'x') return bulbs([P(X0, Y1, h), P(X1, Y1, h), P(X1, y + d / 2, h + rh), P(X1, Y0, h)]);
    return bulbs([P(X0, Y1, h), P(x + w / 2, Y1, h + rh), P(X1, Y1, h), P(X1, Y0, h)]);
  }
  // chaminé no pano de trás do telhado, com a fumaça do fogão a lenha
  let chimN = 0;
  function chimney(x, y, w, d, h, rh, along, ov = 3) {
    let cx, cy, zr;
    if (along === 'x') { cx = x + w * .7; cy = y + d * .22; zr = h + rh * (cy - (y - ov)) / (d / 2 + ov); }
    else { cx = x + w * .22; cy = y + d * .3; zr = h + rh * (cx - (x - ov)) / (w / 2 + ov); }
    let t = box(cx - 2.5, cy - 2.5, 5, 5, 10, '#8e5a44', zr - 3);
    const top = P(cx, cy, zr + 7), n = chimN++;
    for (let i = 0; i < 3; i++) t += `<g transform="translate(${f(top[0])},${f(top[1])})"><circle class="smoke" r="3.4" fill="#eceff1" style="animation-delay:${((n * .7 + i * 1.65) % 5).toFixed(2)}s;--sx:${12 + (n % 4) * 5}px;--sy:-48px;--ss:2"/></g>`;
    return t;
  }
  function house(x, y, w, d, h, wall, roof, along) {
    let s = box(x, y, w, d, h, wall);
    s += `<g transform="${fl(x, y + d, h)}"><rect x="${f(w * .22 - 3.5)}" y="${f(h * .28)}" width="7" height="7" fill="#cfe6f3" stroke="#fff" stroke-width="1"/>
      <rect x="${f(w * .78 - 3.5)}" y="${f(h * .28)}" width="7" height="7" fill="#cfe6f3" stroke="#fff" stroke-width="1"/>
      <rect x="${f(w / 2 - 3.5)}" y="${f(h - 11)}" width="7" height="11" fill="#7a4a2b"/></g>`;
    s += `<g transform="${fr(x + w, y + d, h)}">${wins(d, h, Math.max(1, Math.round(d / 24)), 1, 7, 7, '#bcd6e4', 'stroke="#fff" stroke-width="1"')}</g>`;
    const rh = Math.min(w, d) * .45;
    s += gable(x, y, w, d, h, rh, roof, along, wall);
    if (INVERNO) s += chimney(x, y, w, d, h, rh, along);
    if (NATAL) s += roofLights(x, y, w, d, h, rh, along);
    return s;
  }
  function apartment(x, y, w, d, h, c) {
    const floors = Math.round(h / 16);
    let s = box(x, y, w, d, h, c);
    s += `<g transform="${fl(x, y + d, h)}">${wins(w, h - 4, Math.max(2, Math.round(w / 14)), floors, 6, 7, '#9fbdd1')}</g>`;
    s += `<g transform="${fr(x + w, y + d, h)}">${wins(d, h - 4, Math.max(2, Math.round(d / 14)), floors, 6, 7, '#86a6bb')}</g>`;
    return s + box(x + 3, y + 3, w - 6, d - 6, 2, shade(c, .85), h) + box(x + w * .3, y + d * .3, 10, 10, 8, '#d0d4d9', h);
  }
  function fillBlockC(bx0, by0, bx1, by1) {
    G += quad(bx0 + 6, by0 + 6, bx1 - 6, by1 - 6, '#bcd894');
    const lw = (bx1 - bx0) / 2, lh = (by1 - by0) / 2;
    for (let c = 0; c < 2; c++) for (let r = 0; r < 2; r++) {
      const lx = bx0 + c * lw, ly = by0 + r * lh, k = rnd();
      if (k < .62) {
        const w = rr(34, 44), d = rr(32, 42);
        add(lx + 9, ly + 9, lx + 9 + w, ly + 9 + d, house(lx + 9, ly + 9, w, d, rr(18, 23), pick(WALLS), pick(ROOFS), rnd() < .5 ? 'x' : 'y'));
        if (rnd() < .6) sprite(lx + lw - 7, ly + lh - 7, treeS(rr(.5, .62), pick(['#5e9a3c', '#4f8a35', '#6aa846'])), 5);
      } else if (k < .86) {
        add(lx + 8, ly + 8, lx + lw - 8, ly + lh - 8, apartment(lx + 8, ly + 8, lw - 16, lh - 16, Math.round(rr(2, 3.4)) * 16 + 4, pick(['#e8e2d6', '#d6dbe0', '#f1dcc4', '#d9cbb8', '#cfd8e3'])));
      } else sprite(lx + lw / 2, ly + lh / 2, treeS(rr(.7, .85)), 9);
    }
  }

  // --- Igreja Matriz (ao norte da praça, de frente para ela) ---
  {
    // na Páscoa a igreja adota o roxo da Quaresma
    const CW = PASCOA ? '#c3a9df' : '#f0d27c', CT = PASCOA ? '#c9b1e3' : '#f2d683', CP = PASCOA ? '#f2ebf9' : '#fbf3dc', CB = PASCOA ? '#6c3d8f' : '#d8b75f';
    G += quad(684, 514, 806, 636, '#e2dccd');
    let n = box(708, 514, 70, 92, 46, CW);
    n += `<g transform="${fr(778, 606, 46)}">`;
    for (let i = 0; i < 4; i++) {
      const u = 14 + i * 22;
      n += `<rect x="${u - 11}" y="0" width="3" height="46" fill="${CP}"/>`;
      n += `<path class="vitral" style="animation-delay:${(i * .6).toFixed(1)}s" d="M${u - 5},40 L${u - 5},16 Q${u - 5},8 ${u},4 Q${u + 5},8 ${u + 5},16 L${u + 5},40Z" fill="url(#${i % 2 ? 'glassB' : 'glassA'})" stroke="#fff" stroke-width="1.4"/>`;
    }
    n += `<rect x="0" y="42" width="92" height="4" fill="${CB}"/></g>`;
    n += gable(708, 514, 70, 92, 46, 30, '#dcdad5', 'y', CW);
    add(708, 514, 778, 606, n, 'igreja');
    let t = box(726, 606, 34, 30, 112, CT);
    t += `<g transform="${fl(726, 636, 112)}"><rect width="2.5" height="112" fill="${CP}"/><rect x="31.5" width="2.5" height="112" fill="${CP}"/>
      <path d="M10,34 L10,16 Q10,8 17,6 Q24,8 24,16 L24,34Z" fill="#4a3622"/>
      <g transform="translate(17,10) scale(.75)"><g class="bell"><path d="M0,0 V4" stroke="#5b4a2c" stroke-width="1.5"/><path d="M-7,17 Q-7,6 0,4 Q7,6 7,17 L9,19 L-9,19Z" fill="#e0ad2a"/><circle cy="20.5" r="2" fill="#9c7414"/></g></g>
      <circle class="vitral" style="animation-delay:1.1s" cx="17" cy="54" r="7" fill="url(#glassA)" stroke="#fff" stroke-width="1.4"/>
      <path d="M11,112 L11,96 Q11,88 17,86 Q23,88 23,96 L23,112Z" fill="#6b3a1f"/></g>`;
    t += `<g transform="${fr(760, 636, 112)}"><rect width="2.5" height="112" fill="${CP}"/><rect x="27.5" width="2.5" height="112" fill="${CP}"/>
      <path d="M8,34 L8,16 Q8,8 15,6 Q22,8 22,16 L22,34Z" fill="#4a3622"/>
      <path class="vitral" style="animation-delay:.4s" d="M11,84 L11,56 Q11,48 15,45 Q19,48 19,56 L19,84Z" fill="url(#glassB)" stroke="#fff" stroke-width="1.4"/></g>`;
    t += box(723, 603, 40, 36, 5, CP, 112);
    t += pyramid(726, 606, 34, 30, 117, 70, '#9aa3ab');
    const apex = P(743, 621, 187);
    t += `<path d="M${f(apex[0])},${f(apex[1])} v-18 M${f(apex[0] - 6)},${f(apex[1] - 12)} h12" stroke="#d4af37" stroke-width="2.6" stroke-linecap="round"/>`;
    const bel = P(743, 636, 94);
    t += `<g transform="translate(${f(bel[0])},${f(bel[1])})">${[0, 1.2].map(dl => `<circle class="ding" r="18" fill="none" stroke="#ffd86b" stroke-width="2.2" style="animation-delay:${dl}s"/>`).join('')}
      <text class="note" x="18" y="-6" font-size="15" fill="#c0392b" style="--nx:26px">♪</text><text class="note" x="-30" y="0" font-size="13" fill="#34452a" style="animation-delay:2.4s;--nx:-22px">♫</text></g>`;
    add(726, 606, 760, 636, t, 'igreja');
    for (const [x, y] of [[692, 524], [798, 524], [693, 627], [797, 627]]) sprite(x, y, treeS(.55, '#4f8a35'), 6);
    pin('igreja', 743, 621, 215);
  }

  // --- Praça da Sananduva e Casa do Artesão (centro) ---
  {
    G += quad(684, 684, 806, 806, '#a5cf7a');
    G += quad(684, 739, 806, 751, '#e8d9b5') + quad(739, 684, 751, 806, '#e8d9b5');
    G += `<path d="${blob(745, 745, 26, 26, 18, 0)}" fill="#e8d9b5"/>`;
    for (const [x, y] of [[703, 703], [787, 787], [703, 787]]) {
      G += `<path d="${blob(x, y, 14, 14, 12, .1)}" fill="#86b85a"/>`;
      for (let i = 0; i < 6; i++) { const p = P(x + rr(-9, 9), y + rr(-9, 9)); G += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="2" fill="${pick(['#f39c12', '#e84393', '#fff', '#e74c3c'])}"/>`; }
    }
    sprite(745, 745, sananduvaS(.72), 16, 'praca');
    sprite(708, 722, benchS(`<g transform="translate(-4,-3) scale(.5)">${seated({ cuia: true, shirt: '#f4f1ea', hair: '#d9d0c0' })}</g><g transform="translate(6,-3) scale(.5)">${seated({ shirt: '#c0392b', hair: '#d9d0c0' })}</g>`), 9, 'praca');
    sprite(724, 790, benchS(`<g transform="translate(0,-3) scale(-.5,.5)">${seated({ shirt: '#1abc9c' })}</g>`), 9, 'praca');
    for (const [x, y] of [[689, 689], [801, 801], [689, 801]]) sprite(x, y, lampS(), 3, 'praca');
    mover({ kind: 'sprite', path: [[688, 745], [716, 745]], mode: 'ping', speed: 7, s: PS, inner: person({ long: true, dress: true }), spot: 'praca' });
    mover({ kind: 'sprite', path: [[745, 774], [745, 803]], mode: 'ping', speed: 6, s: PS * .8, inner: person({ carry: 'balloon', shirt: '#f1c40f' }), spot: 'praca' });
    mover({ kind: 'sprite', path: [[774, 745], [803, 745]], mode: 'ping', speed: 8, s: PS * .9, inner: `<g class="walk-bob"><ellipse cx="0" cy="-8" rx="8" ry="4.5" fill="#c68a5e"/><circle cx="8" cy="-12" r="3.6" fill="#c68a5e"/><path d="M-6,-6 V0 M-3,-6 V0 M3,-6 V0 M6,-6 V0" stroke="#8d5a3b" stroke-width="2"/><path d="M-8,-9 l-4,-4" stroke="#c68a5e" stroke-width="2"/></g>`, spot: 'praca' });
    pin('praca', 745, 745, 100);

    // Casa do Artesão: chalé de pinus envernizado, tábuas na horizontal
    const x = 768, y = 684, w = 38, d = 28, h = 20, rh = 24;
    const WOOD = '#d99b52', SEAM = '#b47636', LIGHT = '#ebb46e';
    const planks = (len, hh) => Array.from({ length: Math.floor(hh / 3.4) }, (_, i) => `<path d="M0,${f(i * 3.4 + 3.2)} H${len}" stroke="${i % 2 ? SEAM : '#bf803f'}" stroke-width=".6"/><path d="M0,${f(i * 3.4 + 1.1)} H${len}" stroke="${LIGHT}" stroke-width=".45" opacity=".6"/>`).join('');
    let ca = box(x, y, w, d, h, WOOD, 0, { right: '#c4823f' });
    ca += `<g transform="${fl(x, y + d, h)}">${planks(w, h)}
      <rect x="14" y="6" width="10" height="14" fill="#8a5326" stroke="#6b3d18" stroke-width=".7"/><rect x="15.5" y="7.5" width="7" height="5" fill="#ffe9b0" opacity=".85"/>
      ${[3, 28].map(u => `<rect x="${u - 1.9}" y="5.6" width="1.7" height="7.3" fill="#b8322a"/><rect x="${u + 7.2}" y="5.6" width="1.7" height="7.3" fill="#b8322a"/><rect x="${u}" y="6" width="7" height="6.5" fill="#cfe6f3" stroke="#c0392b" stroke-width="1.1"/><path d="M${u + 3.5},6 V12.5 M${u},9.25 H${u + 7}" stroke="#c0392b" stroke-width=".55"/><rect x="${u - .5}" y="12.5" width="8" height="2" fill="#8a5326"/><circle cx="${u + 1.5}" cy="12.3" r="1.1" fill="#e74c3c"/><circle cx="${u + 5}" cy="12" r="1.1" fill="#f1c40f"/>`).join('')}</g>`;
    ca += `<g transform="${fr(x + w, y + d, h)}">${planks(d, h)}<rect x="8.1" y="5.6" width="1.7" height="7.8" fill="#9e2a23"/><rect x="20.2" y="5.6" width="1.7" height="7.8" fill="#9e2a23"/><rect x="10" y="6" width="10" height="7" fill="#bcd6e4" stroke="#c0392b" stroke-width="1.1"/><path d="M15,6 V13 M10,9.5 H20" stroke="#c0392b" stroke-width=".55"/></g>`;
    let tri = '';
    for (let k = 1.7; k < rh - 2; k += 3.4) { const hw = (w / 2) * (1 - k / rh); tri += `<path d="M${f(w / 2 - hw)},${f(-k)} H${f(w / 2 + hw)}" stroke="${SEAM}" stroke-width=".6"/>`; }
    ca += gable(x, y, w, d, h, rh, '#5b3a29', 'y', WOOD, 4);
    ca += `<g transform="${fl(x, y + d, h)}">${tri}<rect x="5" y="-12" width="28" height="6.5" rx="1.2" fill="#f6efe1" stroke="#6b3d18" stroke-width=".6"/>
      <text x="19" y="-7.4" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="800" font-size="3.3" fill="#6b3d18">CASA DO ARTESÃO</text></g>`;
    ca += box(x - 3, y + d, w + 6, 8, 2, '#b9874f');
    add(x, y, x + w, y + d, ca, 'artesao');
    sprite(790, 727, `${shadowE(13, 4)}<rect x="-12" y="-9" width="24" height="2.5" fill="#8a6038"/><path d="M-10,-7 V0 M10,-7 V0" stroke="#6b4a2b" stroke-width="1.8"/>
      <path d="M-10,-9 q0,-5 3.5,-5 q3.5,0 3.5,5Z" fill="#b5835a"/><path d="M-1,-9 q-1.6,-6 1.6,-7 q3.2,1 1.6,7Z" fill="#c0563a"/><path d="M5,-9 q-1.2,-4 1.6,-5 q2.8,1 1.6,5Z" fill="#d98a5b"/>`, 8, 'artesao');
    sprite(774, 726, `<g transform="scale(${PS})">${seated({ shirt: '#c06c84', long: true, hair: '#d9d0c0' })}</g><path d="M3,-8 l4,2" stroke="#e0b36a" stroke-width="1.4"/><circle cx="7" cy="-6" r="2" fill="#e74c3c"/>`, 3, 'artesao');
    pin('artesao', 787, 698, 58);
  }

  // --- Pipino's Lanches (junto da igreja, região central) ---
  {
    G += quad(514, 514, 636, 636, '#bcd894');
    let s = box(522, 520, 78, 56, 30, '#2f9a52');
    s += `<g transform="${fl(522, 576, 30)}">${Array.from({ length: 13 }, (_, i) => `<rect x="${i * 6}" y="2" width="6" height="6" fill="${i % 2 ? '#fff' : '#f7d33c'}"/>`).join('')}
      <rect x="8" y="12" width="24" height="13" fill="#ffe9a8" stroke="#fff" stroke-width="1.3"/><rect x="46" y="12" width="24" height="13" fill="#ffe9a8" stroke="#fff" stroke-width="1.3"/></g>`;
    s += `<g transform="${fr(600, 576, 30)}">${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 6.2}" y="2" width="6.2" height="6" fill="${i % 2 ? '#fff' : '#f7d33c'}"/>`).join('')}
      <rect x="5" y="12" width="15" height="12" fill="#ffe9a8" stroke="#fff" stroke-width="1.3"/><text class="twinkle" x="12.5" y="21" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="800" font-size="6" fill="#ff4a2c">XIS</text>
      <rect x="25" y="11" width="11" height="19" fill="#1d5530"/><rect x="26.5" y="12.5" width="8" height="8" fill="#ffe9a8" opacity=".8"/><rect x="40" y="12" width="12" height="12" fill="#ffe9a8" stroke="#fff" stroke-width="1.3"/></g>`;
    const r = P(561, 548, 30);
    s += `<path d="M${f(r[0])},${f(r[1])} v-12" stroke="#555" stroke-width="2.2"/><g transform="translate(${f(r[0])},${f(r[1] - 32)}) scale(.85)">
      <circle r="23" fill="#f6f1e2" stroke="#1f6b37" stroke-width="3.5"/><circle cx="-6" cy="-6" r="7" fill="#e3ad5c"/><rect x="-13" y="-6" width="14" height="3" fill="#6aa846"/>
      <circle cx="6" cy="-6" r="6" fill="#f1c7a0"/><path d="M0,-12 Q6,-18 12,-12Z" fill="#1f6b37"/>
      <text x="0" y="10" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="800" font-style="italic" font-size="10" fill="#f2b134" stroke="#1f6b37" stroke-width=".6">Pipino's</text>
      <text x="0" y="17.5" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="700" font-size="5" fill="#1f6b37">lanches</text></g>`;
    add(522, 520, 600, 576, s, 'pipinos');
    sprite(624, 534, tableS('#2f9a52'), 9, 'pipinos');
    sprite(624, 600, tableS('#f2b134'), 9, 'pipinos');
    mover({ kind: 'sprite', path: [[606, 556], [612, 546]], mode: 'ping', speed: 5, s: PS, inner: person({ carry: 'xis', apron: true, shirt: '#1f6b37' }), spot: 'pipinos' });
    mover({ kind: 'sprite', path: [[606, 584], [612, 604]], mode: 'ping', speed: 6, s: PS, inner: person({ carry: 'xis', long: true }), spot: 'pipinos' });
    add(526, 596, 572, 634, house(526, 596, 46, 38, 20, pick(WALLS), pick(ROOFS), 'x'));
    sprite(586, 628, treeS(.6), 5);
    pin('pipinos', 561, 548, 92);
  }

  // --- Escola ---
  {
    G += quad(514, 684, 636, 806, '#bcd894');
    G += quad(520, 742, 632, 804, '#e3cfa6');
    G += `<path d="M${pt(P(540, 756))} L${pt(P(612, 756))} L${pt(P(612, 794))} L${pt(P(540, 794))}Z" fill="none" stroke="#fff" stroke-width="1.6"/>`;
    let s = box(520, 688, 106, 40, 26, '#f4e6c8');
    s += `<g transform="${fl(520, 728, 26)}"><rect x="36" y="2" width="34" height="8" rx="1.5" fill="#2e86de"/><text x="53" y="8.2" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="800" font-size="5.5" fill="#fff">ESCOLA</text>
      ${wins(106, 12, 6, 1, 8, 8, '#bfe3f5', 'transform="translate(0,12)" stroke="#fff"')}<rect x="48" y="14" width="10" height="12" fill="#2e86de"/></g>`;
    s += `<g transform="${fr(626, 728, 26)}">${wins(40, 12, 2, 1, 8, 8, '#a9cfe2', 'transform="translate(0,12)" stroke="#fff"')}</g>`;
    s += gable(520, 688, 106, 40, 26, 18, '#b5452f', 'x', '#f4e6c8');
    add(520, 688, 626, 728, s);
    sprite(634, 736, `<path d="M0,0 V-48" stroke="#888" stroke-width="1.8"/><g transform="translate(1,-46) scale(.8)"><g class="flag"><path d="M0,0 L28,0 L0,18Z" fill="#1e8f3e"/><path d="M28,0 L28,18 L0,18Z" fill="#f1c40f"/><path d="M0,18 L5,18 L28,4 L28,0 L23,0 L0,15Z" fill="#d7261e"/><circle cx="14" cy="9" r="3.4" fill="#fff"/></g></g>`, 3);
    for (const [a, b] of [[[530, 752], [548, 798]], [[566, 752], [586, 798]], [[600, 752], [620, 796]]]) mover({ kind: 'sprite', path: [a, b], mode: 'ping', speed: rr(12, 18), s: PS * .75, inner: person({ shirt: pick(['#f1c40f', '#e74c3c', '#3d7dd9', '#1abc9c']) }) });
    sprite(576, 776, `<ellipse rx="4" ry="1.6" fill="#000" opacity=".15"/><circle class="hop" r="3.2" cy="-3" fill="#e74c3c"/>`, 3);
  }

  // --- Majestade (oeste da cidade, no fim dela) ---
  {
    G += quad(514, 854, 636, 976, '#d0c9b8');
    const BR = 'stroke="#a9442a" stroke-width="1.1"';
    let a = box(516, 856, 70, 40, 40, '#f2c12e');
    a += `<g transform="${fl(516, 896, 40)}"><rect width="70" height="3.5" fill="#a9442a"/>${wins(70, 18, 4, 1, 8, 10, '#9bb4c4', BR)}</g>`;
    a += `<g transform="${fr(586, 896, 40)}"><rect width="40" height="3.5" fill="#a9442a"/><circle cx="20" cy="22" r="9" fill="#b8352a" stroke="#e9b23a" stroke-width="2"/><path d="M15,25 L17,19 L18.5,22.5 L20,17 L21.5,22.5 L23,19 L25,25Z" fill="#f2c12e"/></g>`;
    add(516, 856, 586, 896, a, 'majestade');
    let ch = box(592, 860, 12, 12, 110, '#a5472e');
    ch += `<g transform="${fl(592, 872, 110)}">${Array.from({ length: 14 }, (_, i) => `<path d="M0,${i * 8 + 4} H12" stroke="#7d3220" stroke-width=".8"/>`).join('')}</g>`;
    ch += box(590, 858, 16, 16, 5, '#7d3220', 110);
    const top = P(598, 866, 115);
    for (let i = 0; i < 6; i++) ch += `<g transform="translate(${f(top[0])},${f(top[1])})"><circle class="smoke" r="${f(rr(7, 10))}" fill="#eceff1" style="animation-delay:${(i * .85).toFixed(2)}s;--sx:${f(rr(30, 80))}px;--sy:-110px;--ss:2.1"/></g>`;
    add(592, 860, 604, 872, ch, 'majestade');
    let b = box(516, 906, 96, 60, 30, '#f5c934');
    b += `<g transform="${fl(516, 966, 30)}"><rect width="96" height="3.5" fill="#a9442a"/>
      <rect x="14" y="6" width="68" height="11" rx="1.5" fill="#a9442a"/><text x="48" y="14.4" text-anchor="middle" font-family="Cinzel,serif" font-weight="700" font-size="8" fill="#f7d54e" letter-spacing=".6">MAJESTADE</text>
      ${wins(28, 9, 2, 1, 7, 7, '#9bb4c4', `transform="translate(2,19)" ${BR}`)}${wins(28, 9, 2, 1, 7, 7, '#9bb4c4', `transform="translate(66,19)" ${BR}`)}
      <rect x="41" y="19" width="14" height="11" fill="#4a5560"/><rect y="27" width="96" height="3" fill="#c9a028"/></g>`;
    b += `<g transform="${fr(612, 966, 30)}"><rect width="60" height="3.5" fill="#a9442a"/>${wins(60, 10, 3, 1, 8, 8, '#9bb4c4', `transform="translate(0,10)" ${BR}`)}<rect y="27" width="60" height="3" fill="#c9a028"/></g>`;
    b += box(519, 909, 90, 54, 2, '#e3b52a', 30);
    add(516, 906, 612, 966, b, 'majestade');
    sprite(628, 938, salameTreeS(.9), 11, 'majestade');
    pin('majestade', 560, 930, 62);
  }

  // demais quadras: casas
  fillBlockC(848, 508, 982, 642); fillBlockC(848, 678, 982, 812); fillBlockC(848, 848, 982, 982);

  // --- Vicato (na cidade, ao lado da Majestade) ---
  {
    G += quad(684, 854, 806, 976, '#d0c9b8');
    let sh = box(684, 858, 50, 48, 24, '#eef0f3');
    sh += `<g transform="${fl(684, 906, 24)}">${Array.from({ length: 4 }, (_, i) => `<rect x="${3 + i * 12}" y="3" width="6" height="21" fill="#9db0d6"/>`).join('')}<rect x="18" y="10" width="15" height="14" fill="#d9dde3" stroke="#aab2bd"/></g>`;
    sh += `<g transform="${fr(734, 906, 24)}">${Array.from({ length: 4 }, (_, i) => `<rect x="${3 + i * 12}" y="3" width="6" height="21" fill="#8197c4"/>`).join('')}</g>`;
    add(684, 858, 734, 906, sh, 'vicato');
    let tw = box(744, 858, 58, 58, 72, '#efe3c0');
    const faceV = dark => {
      let t = '';
      for (const v of [22, 41]) t += `<rect x="5" y="${v}" width="48" height="13" fill="${dark ? '#2f3f80' : '#3d4f9a'}"/>${Array.from({ length: 3 }, (_, i) => `<rect x="${9 + i * 14}" y="${v + 2}" width="10" height="9" fill="${dark ? '#6e3a2e' : '#8c4a3b'}"/>`).join('')}`;
      return t + `<rect x="0" y="62" width="58" height="10" fill="${dark ? '#2f3f80' : '#3d4f9a'}"/>`;
    };
    tw += `<g transform="${fl(744, 916, 72)}"><path d="M0,1 Q29,-20 58,1Z" fill="#efe3c0" stroke="#3d4f9a" stroke-width="1.8"/>
      <path d="M26,-4 q-3,-4 0,-5.5 q2,-1.2 2.6,1.3 q.6,-2.5 2.6,-1.3 q3,1.5 0,5.5 l-2.6,2Z" fill="#d6262b"/>
      <text x="29" y="16" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="800" font-size="12.5" fill="#d6262b">vicato</text>${faceV(false)}</g>`;
    tw += `<g transform="${fr(802, 916, 72)}">${faceV(true)}</g>`;
    add(744, 858, 802, 916, tw, 'vicato');
    const a = P(772, 917, 32), b = P(772, 962, 5);
    let cv = `<path d="M${pt(a)} L${pt(b)}" stroke="#3a3a3a" stroke-width="5" stroke-linecap="round"/><path class="belt" d="M${pt(a)} L${pt(b)}" stroke="#9a9a9a" stroke-width="2" stroke-dasharray="6 10"/>`;
    cv += line(P(772, 932, 23), P(772, 932, 0), '#555', 2) + line(P(772, 948, 13), P(772, 948, 0), '#555', 2);
    for (let i = 0; i < 7; i++) cv += `<g transform="translate(${f(a[0])},${f(a[1] - 3)})"><circle class="flour flour-iso" r="${f(rr(1.8, 2.8))}" fill="#fffdf4" style="--fx:${f(b[0] - a[0])}px;--fy:${f(b[1] - a[1])}px;animation-delay:-${(i * .34).toFixed(2)}s"/></g>`;
    add(766, 917, 778, 962, cv, 'vicato');
    sprite(772, 970, `<path d="M-13,2 Q0,-10 13,2Z" fill="#fbf6ea"/>${[0, 1, 2].map(i => `<g transform="translate(${-4 + i * 4},-3)"><circle class="dust" r="3.2" fill="#fff" style="animation-delay:-${(i * .8).toFixed(1)}s"/></g>`).join('')}`, 7, 'vicato');
    let sacks = '';
    for (const [x, y, z] of [[786, 946, 0], [796, 946, 0], [786, 956, 0], [796, 956, 0], [791, 951, 8]]) sacks += box(x, y, 9, 9, 8, '#f3efe4', z);
    add(786, 946, 805, 965, sacks, 'vicato');
    add(690, 922, 726, 938, cyl(698, 930, 8, 46, '#dfe3e8', 0, 10, '#b9c1cb') + cyl(718, 930, 8, 46, '#dfe3e8', 0, 10, '#b9c1cb'), 'vicato');
    pin('vicato', 773, 887, 100);
  }
  // pessoas nas calçadas
  for (const [a, b] of [[[511, 639], [640, 639]], [[681, 681], [810, 681]], [[851, 681], [980, 681]], [[681, 985], [810, 985]], [[851, 851], [980, 851]], [[645, 511], [645, 640]], [[815, 851], [815, 980]], [[985, 681], [985, 810]]]) {
    mover({ kind: 'sprite', path: [a, b], mode: 'ping', speed: rr(6, 10), s: PS, inner: person({ long: rnd() < .45, dress: rnd() < .3 }) });
  }

  // ==================================================================
  // OESTE e NOROESTE
  // ==================================================================
  // --- Dallas Animal (oeste, no fim da estradinha de chão) ---
  origin(-390, 510);
  {
    reserve(790, 660, 1070, 960);
    G += `<path d="${blob(900, 770, 108, 96, 18, .06)}" fill="#6f9e45"/><path d="${blob(900, 770, 98, 86, 18, .05)}" fill="url(#lakeG)"/>`;
    for (const [x, y] of [[850, 720], [960, 830], [930, 700], [840, 820]]) { const p = P(x, y); G += `<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="9" ry="4" fill="#5c9e3c"/>`; }
    for (let i = 0; i < 6; i++) { const p = P(rr(840, 960), rr(720, 820)); G += `<g transform="translate(${f(p[0])},${f(p[1])})"><ellipse class="ripple" rx="14" ry="5" fill="none" stroke="#e6f7ff" stroke-width="1.4" style="${neg(3)}"/></g>`; }
    lakes.push({ cx: 900 + OX, cy: 770 + OY, rx: 70, ry: 60 });
    for (const a of [130, 160, 200, 230, 300, 330]) sprite(900 + Math.cos(rad(a)) * 104, 770 + Math.sin(rad(a)) * 92, cattail(), 4, 'dallas');
    let shop = box(990, 875, 64, 50, 30, '#fafafa', 0, { top: '#2b2b2b' });
    shop += `<g transform="${fl(990, 925, 30)}"><text x="32" y="15" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="800" font-size="13" fill="#111">Dallas</text>
      <text x="32" y="22" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="700" font-size="4.2" fill="#111" letter-spacing="1.6">ANIMAL</text><rect x="44" y="24" width="10" height="6" fill="#bbb"/></g>`;
    shop += `<g transform="${fr(1054, 925, 30)}"><rect x="14" y="10" width="20" height="12" fill="#cfe6f3" stroke="#111" stroke-width="1"/></g>`;
    add(990, 875, 1054, 925, shop, 'dallas');
    add(985, 790, 1030, 800, box(985, 790, 45, 10, 3, '#a87b4f'), 'dallas');
    sprite(985, 950, benchS(), 8, 'dallas');
    const ducks = ellipsePath(900, 770, 62, 52, 30);
    mover({ kind: 'sprite', path: ducks, speed: 9, s: .8, inner: duck(true), phase: .1, spot: 'dallas', r: 3 });
    for (let k = 1; k <= 3; k++) mover({ kind: 'sprite', path: ducks, speed: 9, s: .8, inner: duckling(), phase: .1 - k * .035, spot: 'dallas', r: 3 });
    const ducks2 = ellipsePath(905, 775, 38, 30, 24, true);
    mover({ kind: 'sprite', path: ducks2, speed: 6, s: .8, inner: duck(false), phase: .5, spot: 'dallas', r: 3 });
    mover({ kind: 'sprite', path: ducks2, speed: 6, s: .8, inner: duck(true), phase: .43, spot: 'dallas', r: 3 });
    mover({ kind: 'sprite', path: [[1000, 955], [1060, 955]], mode: 'ping', speed: 18, s: PS * .9, inner: `<g class="walk-bob"><ellipse cx="0" cy="-8" rx="8" ry="4.5" fill="#2b2b2b"/><circle cx="8" cy="-12" r="3.6" fill="#2b2b2b"/><path d="M-6,-6 V0 M-3,-6 V0 M3,-6 V0 M6,-6 V0" stroke="#1a1a1a" stroke-width="2"/><path d="M-8,-9 l-4,-4" stroke="#2b2b2b" stroke-width="2"/></g>`, spot: 'dallas' });
    let hut = box(998, 676, 28, 18, 12, '#c9955a') + gable(998, 676, 28, 18, 12, 8, '#8a3b2a', 'x', '#c9955a', 2);
    hut += `<g transform="${fl(998, 694, 12)}"><path d="M11,12 V7 Q14,3 17,7 V12Z" fill="#3a2a1a"/><path d="M2,3 h6 M2,6 h6 M20,3 h6 M20,6 h6" stroke="#a8743f" stroke-width=".7"/></g>`;
    add(998, 676, 1026, 694, hut, 'dallas');
    mover({ kind: 'sprite', path: [[1022, 726], [1062, 760]], mode: 'ping', speed: 5, s: .8, inner: rabbit('#f4f1ea'), spot: 'dallas', r: 3 });
    mover({ kind: 'sprite', path: [[1020, 800], [1062, 838]], mode: 'ping', speed: 4, s: .8, inner: rabbit('#b88a62'), spot: 'dallas', r: 3, phase: .4 });
    mover({ kind: 'sprite', path: [[1000, 860], [1040, 858]], mode: 'ping', speed: 4.5, s: .75, inner: rabbit('#8d8d8d'), spot: 'dallas', r: 3, phase: .7 });
    for (const [x, y, c, fl2] of [[1066, 788, '#f4f1ea', false], [1048, 792, '#d9c3a5', true], [972, 884, '#f4f1ea', true]]) sprite(x, y, `<g transform="scale(${fl2 ? -.8 : .8},.8)">${rabbit(c)}</g>`, 4, 'dallas');
    flocks.push({ c: P(900, 770, 90), rx: 120, ry: 40, n: 5 });
    pin('dallas', 900, 770, 60);
  }
  origin();

  // --- Cordilheira com o Espaço Ágape no alto (acima do Dallas) ---
  {
    let m = `<path d="M150,880 C170,820 200,760 240,745 C265,738 285,768 305,765 C330,740 350,662 380,654 C395,650 415,650 430,654 C460,665 480,720 505,740 C540,770 580,820 610,870 C560,930 470,962 380,962 C290,962 200,935 150,880Z" fill="url(#mtG)"/>`;
    m += `<path d="M405,651 C415,650 420,651 430,654 C460,665 480,720 505,740 C540,770 580,820 610,870 C560,930 470,962 400,962 C420,860 425,750 405,651Z" fill="#000" opacity=".12"/>`;
    m += `<path d="M240,745 C265,738 285,768 305,765 C300,800 280,850 250,900 C230,860 236,800 240,745Z" fill="#fff" opacity=".06"/>`;
    for (let i = 0; i < 26; i++) { const x = rr(190, 590), y = rr(760, 940); m += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr(4, 9))}" ry="${f(rr(1.5, 3))}" fill="${pick(['#5f8f3f', '#7aa653', '#8a7d6b'])}" opacity=".7"/>`; }
    m += `<path d="M598,866 L505,882 L560,830 L470,815 L520,785 L452,762 L478,722 L430,690 L410,660" stroke="#d9c79c" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    m += `<path d="M598,866 L505,882 L560,830 L470,815 L520,785 L452,762 L478,722 L430,690 L410,660" stroke="#efe2bf" stroke-width="1.5" fill="none" stroke-dasharray="6 8"/>`;
    for (const [x, y, s] of [[205, 850, .36], [232, 806, .32], [268, 800, .3], [330, 770, .3], [462, 796, .32], [530, 832, .34], [574, 868, .3], [292, 880, .36], [356, 905, .36], [440, 912, .34]]) m += `<g transform="translate(${x},${y}) scale(${s})">${araucariaS(1)}</g>`;
    // tapete de nuvens: da metade da colina até a borda oeste do mapa (camada MIST, desenhada por cima dos objetos)
    {
      const ox = CX - 1200, oy = CY - 170, yc = 808; // um pouco acima da metade da colina, sem chegar na Vivaflor (coordenadas do desenho do morro)
      let back = '', front = '';
      for (let x = -ox - 40; x < 550; x += 22) { // mais alto, a colina é mais estreita: a faixa termina antes da encosta leste
        // a oeste da colina o tapete é largo e fofo; sobre a colina vira uma faixa que abraça a encosta
        const k = x < 200 ? 1 : x < 330 ? 1 - (x - 200) / 130 : 0, top = 6 + 22 * k, bot = 6 + 34 * k;
        back += `<circle cx="${f(x + rr(-6, 6))}" cy="${f(yc - top + rr(0, 6))}" r="${f(rr(12, 18) + 8 * k)}"/>`;
        back += `<ellipse cx="${f(x + 11 + rr(-6, 6))}" cy="${f(yc - top * .5)}" rx="${f(rr(26, 40))}" ry="${f(rr(10, 15))}"/>`;
        front += `<ellipse cx="${f(x + rr(-6, 6))}" cy="${f(yc + rr(-2, 6))}" rx="${f(rr(24, 40))}" ry="${f(rr(9, 14))}"/>`;
        if (k > 0) front += `<ellipse cx="${f(x + 11 + rr(-6, 6))}" cy="${f(yc + bot * rr(.55, .8))}" rx="${f(rr(28, 44))}" ry="${f(rr(10, 16) * (.6 + .4 * k))}"/>`;
      }
      MIST += `<g transform="translate(${ox},${oy})"><g fill="#ffffff" opacity=".72">${back}</g><g fill="#ffffff" opacity=".88">${front}</g>
        <path d="M${-ox - 60},${yc - 14} H200 Q265,${yc - 10} 330,${yc - 3} V${yc + 8} Q265,${yc + 22} 200,${yc + 30} H${-ox - 60}Z" fill="#ffffff" opacity=".6"/></g>`;
    }
    // pavilhão no alto e pessoas vendo o sol nascer (a leste)
    m += `<g transform="translate(405,652) scale(.8)"><ellipse cx="0" cy="2" rx="34" ry="9" fill="#c49564"/><ellipse cx="0" cy="0" rx="32" ry="8" fill="#d8ab78"/>
      <path d="M-24,0 V-26 M24,0 V-26 M-10,3 V-24 M10,3 V-24" stroke="#7a5232" stroke-width="2.4"/>
      <path d="M-34,-24 L0,-46 L34,-24 Q0,-16 -34,-24Z" fill="#7a3b2a"/><path d="M0,-46 L34,-24 Q16,-19 2,-19Z" fill="#000" opacity=".15"/>
      <g transform="translate(-14,0) scale(.42)">${seated({ shirt: '#f4f1ea' })}</g><g transform="translate(-2,1) scale(.42)">${seated({ shirt: '#e67e22', long: true })}</g><g transform="translate(12,0) scale(.42)">${seated({ shirt: '#9b59b6' })}</g>
      <g transform="translate(40,4) scale(.44)">${person({ walk: false, shirt: '#1abc9c', long: true })}<g class="wave-arm" style="transform-origin:0px -22px"><path d="M0,-22 L7,-32" stroke="#f1c7a0" stroke-width="2.6" stroke-linecap="round"/></g></g></g>`;
    if (NATAL) m += `<g transform="translate(405,652) scale(.8)">${bulbs([[-34, -24], [0, -46], [34, -24]], 5, 1.7)}</g>`;
    add(110, 920, 398, 1240, `<g transform="translate(${CX - 1200},${CY - 170})">${m}</g>`, 'agape');
    pinScreen('agape', 405 + CX - 1200, 606 + CY - 170);
  }

  // --- Sítio Vicenci: parreiral e o micro-ônibus (um pouco ao norte do Ágape) ---
  {
    reserve(96, 720, 242, 846);
    G += quad(98, 722, 238, 842, '#a9d27c');
    add(112, 728, 156, 760, house(112, 728, 44, 32, 20, '#f4e3c7', '#8b3a2a', 'x'), 'elton');
    const px0 = 106, px1 = 198, py0 = 774, py1 = 828, hz = 16;
    let pr = '';
    for (let x = px0; x <= px1 + .1; x += 23) pr += line(P(x, py0, 0), P(x, py0, hz), '#8a6038', 2);
    for (let y = py0 + 18; y < py1; y += 18) pr += line(P(px0, y, 0), P(px0, y, hz), '#8a6038', 2);
    pr += quad(px0 - 3, py0 - 3, px1 + 3, py1 + 3, '#4f8a35', '', hz);
    for (let i = 0; i < 70; i++) { const p = P(rr(px0 - 2, px1 + 2), rr(py0 - 2, py1 + 2), hz); pr += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(rr(2.5, 4.5))}" fill="${pick(['#3f7a2c', '#5e9a3c', '#6aa846', '#4f8a35'])}"/>`; }
    const cacho = (x, y) => { const p = P(x, y, hz); return `<g transform="translate(${f(p[0])},${f(p[1] + 1)})">${[[0, 0], [-1.6, 1.8], [1.6, 1.8], [0, 3.4], [-.8, 5], [.8, 5]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="1.4" fill="${pick(['#5b2a6e', '#6d3580', '#4a2059'])}"/>`).join('')}</g>`; };
    for (let x = px0 + 5; x < px1; x += 8) pr += cacho(x, py1 + 3);
    for (let y = py0 + 5; y < py1; y += 8) pr += cacho(px1 + 3, y);
    for (let x = px0; x <= px1 + .1; x += 23) pr += line(P(x, py1, 0), P(x, py1, hz), '#8a6038', 2);
    for (let y = py0; y < py1; y += 18) pr += line(P(px1, y, 0), P(px1, y, hz), '#8a6038', 2);
    add(px0 - 3, py0 - 3, px1 + 3, py1 + 3, pr, 'elton');
    // pessoa com um bebê no colo colhendo uvas
    sprite(150, 842, `<g transform="scale(${PS})">${person({ walk: false, shirt: '#e67e22', long: true })}
      <path d="M0,-23 L-3,-38" stroke="#f1c7a0" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="4" cy="-19" rx="5" ry="3.6" fill="#bfe3f5"/><circle cx="7" cy="-22" r="2.6" fill="#f5d2b3"/><path d="M5,-23.5 q2,-2 4,0" stroke="#c9a063" stroke-width=".9" fill="none"/></g>`, 4, 'elton');
    sprite(166, 845, `${shadowE(6, 2)}<path d="M-6,-1 h12 l-2,-6 h-8Z" fill="#b5835a"/>${[[-3, -8], [0, -9], [3, -8], [-1.5, -10], [1.5, -10]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="1.5" fill="#5b2a6e"/>`).join('')}`, 3, 'elton');
    add(216, 724, 240, 780, parked(MICROBUS, 6, 228, 752), 'elton');
    sprite(212, 816, signS([['SÍTIO', 5, 'Montserrat,sans-serif', 700, '#5b2a6e'], ['VICENCI', 8, 'Montserrat,sans-serif', 800, '#5b2a6e'], ['parreiral', 5, 'Georgia,serif', 700, '#3f7a2c']], { w: 48, h: 26, bg: '#f6efe1', post: '#7a4a24' }), 7, 'elton');
    pin('elton', 152, 790, 52);
  }

  // --- Vivaflor (noroeste, à esquerda da rodovia) ---
  {
    const x0 = -170, x1 = 0, y0 = 880, y1 = 1010;
    reserve(x0, y0, x1, y1);
    G += quad(x0, y0, x1, y1, '#b5d98a');
    for (let i = 0; i < 50; i++) { const p = P(rr(x0, x1), rr(y0, y1)); G += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(rr(1.4, 2.6))}" fill="${pick(['#f7d64a', '#fff', '#f4a6c6', '#e84393'])}"/>`; }
    let shop = house(-160, 962, 40, 30, 20, '#fff8e6', '#c8961e', 'x');
    shop += `<g transform="${fl(-160, 992, 20)}"><rect x="5" y="1" width="30" height="8" rx="1.5" fill="#1d1d1d"/><text x="20" y="7" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="800" font-size="5" fill="#f2b134">VIVAFLOR</text></g>`;
    add(-160, 962, -120, 992, shop, 'vivaflor');
    sprite(-105, 1000, `${shadowE(12, 4)}<rect x="-12" y="-10" width="24" height="3" fill="#8a6038"/><path d="M-10,-7 V0 M10,-7 V0" stroke="#6b4a2b" stroke-width="2"/>
      ${[-8, -2, 4, 10].map(x => `<rect x="${x - 2.4}" y="-17" width="5" height="7" rx="1.2" fill="#f2b134" stroke="#c8961e" stroke-width=".6"/><rect x="${x - 2.4}" y="-18.5" width="5" height="2" fill="#1d1d1d"/>`).join('')}
      <g transform="translate(0,-32)"><path d="M0,-9 L8,-4.5 L8,4.5 L0,9 L-8,4.5 L-8,-4.5Z" fill="none" stroke="#1d1d1d" stroke-width="2"/><path d="M0,-4 L4,-2 L4,2 L0,4 L-4,2 L-4,-2Z" fill="#f2b134"/></g>`, 9, 'vivaflor');
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
      const x = -80 + i * 20 + r * 6, y = 900 + r * 28;
      add(x, y, x + 12, y + 10, box(x, y, 12, 10, 12, '#f5f0e1') + box(x - 1, y - 1, 14, 12, 3, pick(['#f2b134', '#3d7dd9', '#e67e22']), 12) + `<g transform="${fl(x, y + 10, 12)}"><rect x="3" y="9" width="6" height="1.5" fill="#333"/></g>`, 'vivaflor');
      beeCenters.push(P(x + 6, y + 5, 15));
    }
    mover({ kind: 'sprite', path: [[-95, 976], [-30, 976]], mode: 'ping', speed: 5, s: PS, inner: person({ shirt: '#f4f1ea', pants: '#f4f1ea', hat: '#f4f1ea' }), spot: 'vivaflor' });
    const blossoms = [['#f4a6c6', '#fff'], ['#f7d64a', '#fff6c9'], ['#fff1f5', '#f4a6c6'], ['#e84393', '#fff'], ['#f7d64a', '#e67e22']];
    for (let i = 0; i < 26; i++) {
      const x = rr(x0 + 8, x1 - 8), y = rr(y0 + 8, y1 - 8);
      if ((x < -112 && y > 950) || (x > -88 && x < -18 && y > 892 && y < 945) || (x > -122 && x < -88 && y > 985)) continue;
      const [c, bl] = pick(blossoms);
      sprite(x, y, treeS(rr(.6, .85), c, { blossom: bl }), 8, 'vivaflor');
      if (rnd() < .35) beeCenters.push(P(x, y, 28));
    }
    pin('vivaflor', -85, 945, 58);
  }

  // --- Sítio Moterle (noroeste, à direita da rodovia) ---
  {
    const cx = -170, cy = 700;
    reserve(cx - 125, cy - 115, cx + 125, cy + 100);
    G += `<path d="${blob(cx, cy, 78, 68, 18, .06)}" fill="#5f9a3d"/><path d="${blob(cx, cy, 70, 60, 18, .05)}" fill="url(#lakeG)"/>`;
    for (let i = 0; i < 4; i++) { const p = P(cx + rr(-40, 40), cy + rr(-34, 34)); G += `<g transform="translate(${f(p[0])},${f(p[1])})"><ellipse class="ripple" rx="12" ry="4.5" fill="none" stroke="#e6f7ff" stroke-width="1.3" style="${neg(3)}"/></g>`; }
    lakes.push({ cx, cy, rx: 45, ry: 38 });
    for (let i = 0; i < 34; i++) {
      const a = rr(130, 400), r = rr(84, 118), ang = ((a % 360) + 360) % 360;
      const x = cx + Math.cos(rad(a)) * r, y = cy + Math.sin(rad(a)) * r * .9;
      if (ang > 290 || ang < 40) {
        // pomar: laranjas, bergamotas e pêssegos, com gente colhendo
        sprite(x, y, treeS(rr(.82, .98), pick(['#4f8a35', '#3f7a2c']), { blossom: pick(['#f39c12', '#f1c40f', '#e8743c']) }), 9, 'moterle');
        if (rnd() < .55) {
          const qx = cx + Math.cos(rad(a)) * (r + 18), qy = cy + Math.sin(rad(a)) * (r + 18) * .9;
          const ladder = rnd() < .4 ? `<path d="M-5,0 L-1,-26 M3,0 L7,-26" stroke="#a8743f" stroke-width="1.4"/>${[5, 11, 17, 23].map(v => `<path d="M${f(-5 + v * .155)},${-v} h8" stroke="#a8743f" stroke-width="1.1"/>`).join('')}` : '';
          sprite(qx, qy, `${ladder}<g transform="scale(${rnd() < .5 ? -PS : PS},${PS})">${person({ walk: false, carry: 'basket', long: rnd() < .5 })}<path d="M-1,-23 L-6,-38" stroke="#f1c7a0" stroke-width="2.6" stroke-linecap="round"/></g>`, 4, 'moterle');
        }
      } else {
        const k = rnd();
        sprite(x, y, k < .35 ? araucariaS(rr(.5, .7)) : k < .5 ? pineS(rr(.75, 1)) : treeS(rr(.8, 1.1), pick(['#4f8a35', '#5e9a3c', '#3f7a2c', '#6aa846'])), 9, 'moterle');
      }
    }
    const pescador = (mir, bx = 48, by = -5) => `<g transform="scale(${mir ? -1 : 1},1)"><rect x="-6" y="-4" width="10" height="4" rx="1.5" fill="#7a5232"/>
      <g transform="scale(${PS})">${seated({ shirt: pick(['#3d7dd9', '#e67e22', '#2f7a3a', '#c0392b']) })}</g>
      <rect x="-12" y="-4" width="5" height="5" rx="1" fill="#9aa0a6"/><path d="M-11,-4 q1.5,-2 3,0" stroke="#f08a24" stroke-width="1.2" fill="none"/>
      <path d="M3,-9 L${f(bx * .6)},${f(by * .6 - 22)}" stroke="#5a3d26" stroke-width="1.2"/><path d="M${f(bx * .6)},${f(by * .6 - 22)} Q${f(bx * .9)},${f(by * .7 - 16)} ${bx},${by - 1}" stroke="#e8e8e8" stroke-width=".5" fill="none"/>
      <g transform="translate(${bx},${by})"><g class="duck-bob" style="${neg(1.4)}"><circle r="1.8" fill="#fff"/><path d="M-1.8,0 A1.8,1.8 0 0 0 1.8,0Z" fill="#e3241b"/></g><ellipse class="ripple" rx="5" ry="1.8" fill="none" stroke="#e6f7ff" stroke-width=".8" style="${neg(3)}"/></g></g>`;
    sprite(-133, 760, pescador(false, 22, -42), 5, 'moterle');
    sprite(-183, 768, pescador(false, 46, -22), 5, 'moterle');
    sprite(-243, 724, pescador(false, 44, 2), 5, 'moterle');
    G += quad(-110, 744, -86, 762, '#e74c3c', 'opacity=".85"');
    sprite(-102, 752, `<g transform="scale(${PS})">${seated({})}</g>`, 3, 'moterle');
    sprite(-92, 756, `<g transform="scale(-${PS},${PS})">${seated({ long: true })}</g>`, 3, 'moterle');
    sprite(-232, 800, signS([['SÍTIO', 6, 'Cinzel,serif', 700], ['MOTERLE', 10, 'Cinzel,serif', 700], ['JM', 6, 'Cinzel,serif', 700]], { w: 60, h: 30, bg: '#f3ecd8', fg: '#2f5a3a', post: '#5a3d26' }), 9, 'moterle');
    mover({ kind: 'veh', path: ellipsePath(cx, cy, 40, 34, 28), speed: 8, v: KAYAK, spot: 'moterle', r: 5 });
    pin('moterle', cx, cy, 52);
  }

  // ==================================================================
  // SUDOESTE — Flora: yoga e velas perfumadas, numa clareira cercada de árvores.
  // Acesso pela estrada de chão que sai da Vicato. O bloco usa as coordenadas
  // locais de antes (quando ficava na cidade), deslocadas para o sudoeste.
  // ==================================================================
  origin(-64, 660);
  {
    const cx = 904, cy = 572;
    reserve(cx - 140, cy - 130, cx + 140, cy + 130);
    G += `<path d="${blob(cx, cy, 108, 96, 18, .06)}" fill="#8fc463"/><path d="${blob(cx, cy, 98, 86, 18, .05)}" fill="#a8d47c"/>`;
    let shop = house(858, 516, 46, 26, 18, '#fdf6f0', '#c06c84', 'x');
    shop += `<g transform="${fl(858, 542, 18)}"><rect x="6" y="1" width="34" height="7.5" rx="1.5" fill="#fff"/><text x="23" y="7" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="5.4" fill="#1d1d1d" letter-spacing=".8">FLORA</text><circle cx="37" cy="3.6" r="1.8" fill="#c0392b"/></g>`;
    add(858, 516, 904, 542, shop, 'flora');
    let dk = box(856, 556, 96, 64, 4, '#c49564');
    const mats = [[872, 590, '#9b59b6'], [896, 590, '#1abc9c'], [920, 590, '#e67e22'], [944, 590, '#3d7dd9']];
    for (const [x, y, c] of mats) dk += quad(x - 9, y - 4, x + 9, y + 4, c, '', 4);
    const sk = '#f1c7a0';
    const yogi = [
      `<path d="M0,-12 L0,0" stroke="#34495e" stroke-width="3.6" stroke-linecap="round"/><path d="M0,-12 L6,-7 L1,-4" stroke="#34495e" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="-4.5" y="-26" width="9" height="15" rx="3" fill="#9b59b6"/><path d="M-2,-24 L-1,-40 M2,-24 L1,-40" stroke="${sk}" stroke-width="2.4" stroke-linecap="round"/><circle cx="0" cy="-30.5" r="4.8" fill="${sk}"/><path d="M-5,-31 A5,5 0 0 1 5,-32 Q1,-34 -2,-31 Q-3,-27 -1,-22 L-5.5,-23Z" fill="#5a3a22"/>`,
      `<path d="M-2,-12 L-3,0 M2,-12 L3,0" stroke="#2c3e50" stroke-width="3.6" stroke-linecap="round"/><rect x="-4.5" y="-26" width="9" height="15" rx="3" fill="#1abc9c"/><g class="arms-up" style="transform-origin:-2px -23px"><path d="M-2,-23 L-4,-13" stroke="${sk}" stroke-width="2.4" stroke-linecap="round"/></g><g class="arms-up-r" style="transform-origin:2px -23px"><path d="M2,-23 L4,-13" stroke="${sk}" stroke-width="2.4" stroke-linecap="round"/></g><circle cx="0" cy="-30.5" r="4.8" fill="${sk}"/><path d="M-5,-30.5 A5,5 0 0 1 5,-32 Q1,-34.5 -3,-32 Q-4.5,-30.5 -3.5,-28.5 L-5.2,-28.5Z" fill="#1a1a1a"/>`,
      `<g class="breathe" style="transform-origin:0px 0px"><path d="M-9,-1 Q0,-6 9,-1" stroke="#7f8c8d" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="-4.5" y="-17" width="9" height="14" rx="3" fill="#e67e22"/><path d="M-3,-14 L-8,-5 M3,-14 L8,-5" stroke="${sk}" stroke-width="2.4" stroke-linecap="round"/><circle cx="0" cy="-21.5" r="4.8" fill="${sk}"/><circle cx="0" cy="-27" r="2.6" fill="#2b1d14"/><path d="M-5,-22 A5,5 0 0 1 5,-22 Q0,-24.5 -5,-22Z" fill="#2b1d14"/></g>`,
      `<path d="M0,-12 L-9,0 M0,-12 L6,-6 L7,0" stroke="#34495e" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="-4.5" y="-26" width="9" height="15" rx="3" fill="#3d7dd9"/><path d="M-13,-22 L13,-22" stroke="${sk}" stroke-width="2.4" stroke-linecap="round"/><circle cx="0" cy="-30.5" r="4.8" fill="${sk}"/><path d="M-5,-30.5 A5,5 0 0 1 5,-32 Q1,-34.5 -3,-32 Q-4.5,-30.5 -3.5,-28.5 L-5.2,-28.5Z" fill="#c9a063"/>`
    ];
    mats.forEach(([x, y], i) => (dk += at(x, y, 4, yogi[i], PS * 1.05)));
    for (const [x, y] of [[862, 616], [888, 616], [914, 616], [940, 616], [948, 566], [948, 596]]) {
      dk += at(x, y, 4, `<g transform="translate(-4,0)">${candle(8)}</g><g transform="translate(3,1)">${candle(11)}</g><g transform="translate(0,3)">${candle(6)}</g>
        <path class="steam" style="${neg(2)}" d="M0,-18 q-3,-5 0,-10 q3,-5 0,-10" stroke="#e8d7f0" stroke-width="1.2" fill="none"/>`, .5);
    }
    add(856, 556, 952, 620, dk, 'flora');
    sprite(930, 528, treeS(.85, '#4f8a35'), 8, 'flora');
    sprite(966, 600, treeS(.8, '#f4a6c6', { blossom: '#fff' }), 8, 'flora');
    // bosque em volta da clareira (na frente, para quem olha o mapa, árvores mais baixas para não esconder o deck)
    for (let i = 0; i < 30; i++) {
      const a = i * 12 + rr(-4, 4), r = rr(112, 128);
      const x = cx + Math.cos(rad(a)) * r, y = cy + Math.sin(rad(a)) * r * .92;
      const [wx, wy] = Wd(x, y);
      if (nearRoad(wx, wy, 10)) continue;
      const k = rnd(), front = a > 15 && a < 75;
      sprite(x, y, front ? treeS(rr(.62, .74), pick(['#4f8a35', '#5e9a3c', '#6aa846']), k < .3 ? { blossom: '#f4a6c6' } : {})
        : k < .3 ? araucariaS(rr(.5, .66)) : k < .42 ? pineS(rr(.8, 1)) : treeS(rr(.85, 1.08), pick(['#3f7a2c', '#4f8a35', '#5e9a3c', '#356f30']), k > .85 ? { blossom: '#f4a6c6' } : {}), 9, 'flora');
    }
    flocks.push({ c: P(cx, cy, 80), rx: 90, ry: 30, n: 4 });
    pin('flora', 904, 588, 62);
  }
  origin();

  // ==================================================================
  // NORTE — Pousada Angico, junto da rodovia
  // ==================================================================
  origin(-820, -70, 0, true); // espelhado: fica à esquerda da rodovia
  {
    reserve(1130, 150, 1360, 420);
    G += quad(1130, 150, 1360, 420, '#9fcf74');
    G += quad(1120, 345, 1166, 360, '#c9a46b');
    G += `<path d="${blob(1262, 318, 46, 34, 14, .1)}" fill="#b5764d"/><path d="${blob(1270, 324, 30, 22, 12, .1)}" fill="#a0623d"/>`;
    // riacho que segue para o norte até o fim do mapa
    const riacho = [[1430, 415], [1390, 350], [1340, 285], [1300, 220], [1250, 165], [1200, 110], [1140, 50], [1080, -10], [1030, -60]];
    G += `<path d="${strip(riacho, 18)}" fill="#7e9a5a"/><path d="${strip(riacho, 12)}" fill="#6fa6bd"/>`;
    G += `<path class="river" d="M${riacho.map(p => pt(P(p[0], p[1]))).join(' L')}" stroke="#e4f4fa" stroke-width="1.4" fill="none" stroke-dasharray="4 16"/>`;
    for (let i = 0; i < 9; i++) {
      const k = (rnd() * (riacho.length - 1)) | 0, t = rnd(), a = riacho[k], b = riacho[k + 1];
      const p = P(a[0] + (b[0] - a[0]) * t + rr(-3, 3), a[1] + (b[1] - a[1]) * t + rr(-6, 6));
      G += `<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="${f(rr(2.5, 4.5))}" ry="${f(rr(1.5, 2.4))}" fill="#8a7a66"/>`;
    }
    ROADS.push([riacho.map(([x, y]) => Wd(x, y)), 12]);
    for (const [x, y] of [[1462, 372], [1428, 262], [1372, 186], [1318, 134], [1408, 420]]) sprite(x, y, rnd() < .3 ? araucariaS(rr(.55, .7)) : treeS(rr(.85, 1.1), pick(['#3f7a2c', '#4f8a35', '#2f6b2a'])), 9, 'angico');

    // o chalé: comprido, metade sobre base de pedra e metade suspensa em pilares, frontão de vidro
    const x = 1185, y = 300, w = 80, d = 36, z0 = 22, h = 26, rh = 26;
    const WOOD = '#d38f45', SEAM = '#b0712f';
    let c = '';
    const post = (px, py) => line(P(px, py, 0), P(px, py, z0 - 2), '#d7b06e', 3);
    c += post(1230, 302) + post(1262, 302);
    c += line(P(1263, 318, 0), P(1263, 303, z0 - 2), '#c9a05e', 2.4) + line(P(1263, 318, 0), P(1263, 333, z0 - 2), '#c9a05e', 2.4);
    c += `<ellipse cx="${f(P(1246, 318, 0)[0])}" cy="${f(P(1246, 318, 0)[1])}" rx="34" ry="12" fill="#ffd27a" opacity=".22" class="twinkle"/>`;
    c += box(1225, 300, 40, 36, 3, '#8a6038', z0 - 3, { noTop: true });
    c += post(1230, 334) + post(1262, 334);
    c += line(P(1246, 335, 0), P(1231, 335, z0 - 2), '#c9a05e', 2.4) + line(P(1246, 335, 0), P(1261, 335, z0 - 2), '#c9a05e', 2.4);
    c += box(1185, 300, 40, 36, z0, '#a3a194');
    c += `<g transform="${fl(1185, 336, z0)}">${Array.from({ length: 4 }, (_, r) => Array.from({ length: 5 }, (_, k) => `<rect x="${f(k * 8 + (r % 2) * 4 - 4)}" y="${f(r * 5.5)}" width="8" height="5.5" fill="none" stroke="#8a887c" stroke-width=".6"/>`).join('')).join('')}</g>`;
    c += box(x, y, w, d, h, WOOD, z0, { right: '#bb7a38' });
    c += `<g transform="${fl(x, y + d, z0 + h)}">${Array.from({ length: 8 }, (_, i) => `<path d="M0,${f(i * 3.3 + 2.8)} H${w}" stroke="${SEAM}" stroke-width=".6"/>`).join('')}
      ${[0, 40, 79].map(u => `<rect x="${u}" y="0" width="1.6" height="${h}" fill="#9a5f28"/>`).join('')}
      <rect x="6" y="8" width="14" height="6" fill="#2b2f33" stroke="#1d1d1d" stroke-width=".8"/>
      ${[30, 52].map(u => `<path d="M${u},10 L${u - 5},2 L${u + 5},2Z M${u},10 L${u - 5},18 L${u + 5},18Z" fill="#ffd27a" opacity=".35" class="twinkle"/><rect x="${u - 1}" y="8.5" width="2" height="3" fill="#ffe7a8"/>`).join('')}
      <rect x="0" y="${h - 2}" width="${w}" height="2" fill="#9a5f28"/></g>`;
    c += gable(x, y, w, d, z0 + h, rh, '#3a3d42', 'x', WOOD, 4);
    const glassTop = u => -rh * .9 * (1 - Math.abs(u - d / 2) / (d / 2));
    let gl = `<path d="M1.5,${h - 1.5} L1.5,0 L${d / 2},${f(-rh * .9)} L${d - 1.5},0 L${d - 1.5},${h - 1.5}Z" fill="url(#glassWarm)" stroke="#2b2b2b" stroke-width="1.3"/>`;
    for (let u = 7.5; u < d - 2; u += 7) gl += `<path d="M${f(u)},${h - 1.5} V${f(glassTop(u) + 1)}" stroke="#2b2b2b" stroke-width=".9"/>`;
    for (const v of [17, 8.5, 0, -8.5, -17]) {
      const half = v >= 0 ? d / 2 - 1.5 : (d / 2) * (1 + v / (rh * .9)) - 1;
      gl += `<path d="M${f(d / 2 - half)},${v} H${f(d / 2 + half)}" stroke="#2b2b2b" stroke-width=".9"/>`;
    }
    c += `<g transform="${fr(x + w, y + d, z0 + h)}">${gl}</g>`;
    add(x, y, x + w, y + d, c, 'angico');
    let dk = box(1160, 300, 25, 36, 3, '#c9955a', z0 - 3) + line(P(1161, 335, 0), P(1161, 335, z0 - 3), '#8a6038', 2);
    for (let i = 0; i < 5; i++) dk += box(1163, 336 + i * 5, 12, 5, z0 - 3 - (i + 1) * 3.8, '#c9955a');
    add(1160, 300, 1185, 362, dk, 'angico');
    sprite(1140, 322, signS([['Pousada', 7, 'Georgia,serif', 700, '#3a2414'], ['Angico', 9, 'Georgia,serif', 700, '#3a2414']], { w: 46, h: 24, bg: '#d9a35c', post: '#7a4a24' }), 7, 'angico');
    // fogueira no firepit, gente em volta, e o grande angico ao lado
    let fp = `<ellipse rx="44" ry="18" fill="#ffb347" opacity=".18" class="twinkle"/><ellipse rx="13" ry="6" fill="#6f6f6f"/><ellipse rx="10" ry="4.4" fill="#2b2b2b"/>
      <g class="flame" style="transform-origin:0px 0px"><path d="M0,-17 Q8,-6 0,0 Q-8,-6 0,-17Z" fill="#ff8a1e"/><path d="M-4,-10 Q0,-2 3,-1 Q4,-8 -4,-10Z" fill="#ff6a1a"/><path d="M0,-10 Q4,-3 0,0 Q-4,-3 0,-10Z" fill="#ffe066"/></g>
      ${[0, 1, 2, 3].map(i => `<circle class="spark" cx="${f(rr(-4, 4))}" cy="-12" r="1" fill="#ffd27a" style="animation-delay:-${(i * .45).toFixed(2)}s;--px:${f(rr(-10, 10))}px"/>`).join('')}
      <g transform="translate(0,-18)"><circle class="smoke" r="4" fill="#ddd" style="--sx:14px;--sy:-46px;--ss:2"/><circle class="smoke" r="4" fill="#ddd" style="animation-delay:2.5s;--sx:8px;--sy:-46px;--ss:2"/></g>`;
    const roda = [[-24, -6, 1, '#e74c3c'], [24, -6, -1, '#3d7dd9'], [-14, -14, 1, '#f1c40f'], [16, -14, -1, '#9b59b6'], [-20, 9, 1, '#1abc9c'], [20, 9, -1, '#e67e22']];
    const seat = ([px, py, k, sh]) => `<g transform="translate(${px},${py}) scale(${k * PS},${PS})"><rect x="-6" y="-4" width="12" height="4" rx="2" fill="#7a5232"/>${seated({ shirt: sh, long: rnd() < .5 })}</g>`;
    sprite(1275, 365, roda.filter(r => r[1] < 0).map(seat).join('') + fp + roda.filter(r => r[1] >= 0).map(seat).join(''), 22, 'angico');
    sprite(1310, 310, angicoS(1), 22, 'angico'); // o grande angico, ao lado da roda de fogo
    pin('angico', 1225, 318, 100);
  }
  origin();

  // ==================================================================
  // LESTE — Fazenda Fracasso (sobre um morrinho) e Belusso
  // ==================================================================
  {
    const HZ = 22;
    reserve(1088, 318, 1372, 584);
    G += `<path d="${blob(1232, 452, 152, 134, 20, .03)}" fill="#6f9e45"/>`;
    origin(0, 0, HZ);
    G += `<path d="${blob(1232, 452, 134, 116, 20, .03)}" fill="#a8d47c"/>`;
    let s = box(1150, 380, 110, 54, 30, '#f7f2e6');
    s += `<g transform="${fl(1150, 434, 30)}"><rect x="0" y="25" width="110" height="5" fill="#7a3f2b"/>
      ${[14, 36, 74, 96].map(u => `<rect x="${u - 5}" y="8" width="10" height="11" fill="#cfe6f3" stroke="#7a3f2b" stroke-width="1.1"/><rect x="${u - 9}" y="8" width="3.5" height="11" fill="#2f6b3a"/><rect x="${u + 5.5}" y="8" width="3.5" height="11" fill="#2f6b3a"/>`).join('')}
      <rect x="49" y="11" width="12" height="19" fill="#7a3f2b"/></g>`;
    s += `<g transform="${fr(1260, 434, 30)}">${wins(54, 12, 2, 1, 9, 10, '#cfe6f3', 'transform="translate(0,8)" stroke="#7a3f2b" stroke-width="1.1"')}<rect x="0" y="25" width="54" height="5" fill="#7a3f2b"/></g>`;
    s += gable(1150, 380, 110, 54, 30, 22, '#8b3a2a', 'x', '#f7f2e6');
    s += box(1234, 392, 9, 9, 20, '#9a4a32', 30);
    const ct = P(1238, 396, 52);
    for (let i = 0; i < 3; i++) s += `<g transform="translate(${f(ct[0])},${f(ct[1])})"><circle class="smoke" r="5" fill="#eceff1" style="animation-delay:${(i * 1.4).toFixed(1)}s;--sx:${f(rr(20, 35))}px;--sy:-60px;--ss:1.8"/></g>`;
    add(1150, 380, 1260, 434, s, 'fracasso');
    sprite(1282, 462, `${shadowE(12, 4)}<path d="M-7,0 V-12 M7,0 V-12" stroke="#5a3d26" stroke-width="2.2"/>
      <path d="M-14,-40 L14,-40 L14,-21 Q14,-12 0,-7 Q-14,-12 -14,-21Z" fill="#fff" stroke="#7a3f2b" stroke-width="2.2"/>
      <text x="0" y="-21" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="11" fill="#2f7a3a">FF</text>
      <rect x="-23" y="-5" width="46" height="10" rx="2" fill="#fff" stroke="#7a3f2b"/><text x="0" y="1.8" text-anchor="middle" font-family="Cinzel,serif" font-weight="700" font-size="4.6" fill="#7a3f2b">FAZENDA FRACASSO</text>`, 8, 'fracasso');
    for (const [x, y, c] of [[1168, 457, '#e74c3c'], [1206, 466, '#f1c40f'], [1244, 457, '#2f7a3a']]) sprite(x, y, tableS(c, true, true, 'cafe'), 9, 'fracasso');
    mover({ kind: 'sprite', path: [[1152, 441], [1258, 441]], mode: 'ping', speed: 10, s: PS, inner: person({ carry: 'tray', apron: true, long: true, dress: true, shirt: '#7a3f2b' }), spot: 'fracasso' });
    mover({ kind: 'sprite', path: [[1152, 443], [1258, 443]], mode: 'ping', speed: 8, s: PS, inner: person({ carry: 'tray', apron: true, shirt: '#2f7a3a' }), spot: 'fracasso', phase: .55 });
    // estufas de morango: bancadas suspensas (altas do chão) dentro de túneis de plástico
    function bancada(x0, x1, yb) {
      let t = '';
      for (let x = x0 + 6; x < x1; x += 30) t += line(P(x, yb, 0), P(x, yb, 10), '#8a8a8a', 1.4);
      t += box(x0, yb - 3, x1 - x0, 6, 3, '#b9874f', 10);
      for (let x = x0 + 4; x < x1 - 2; x += 8) {
        const p = P(x, yb + 1, 13);
        t += `<circle cx="${f(p[0] - 1.5)}" cy="${f(p[1])}" r="2.6" fill="#4e9a3a"/><circle cx="${f(p[0] + 1.6)}" cy="${f(p[1] - .8)}" r="2.2" fill="#62b04a"/>`;
        if (rnd() < .8) t += `<path d="M${f(p[0] + .5)},${f(p[1] + 1)} v3" stroke="#3f7a2c" stroke-width=".6"/><circle cx="${f(p[0] + .5)}" cy="${f(p[1] + 4.6)}" r="1.5" fill="#e3241b"/>`;
      }
      return t;
    }
    function estufa(x0, x1, y0, y1, hh) {
      const yc = (y0 + y1) / 2, ry = (y1 - y0) / 2, N = 10;
      const prof = Array.from({ length: N + 1 }, (_, i) => { const th = Math.PI * (1 - i / N); return [yc + ry * Math.cos(th), hh * Math.sin(th)]; });
      const facet = (i, op) => poly([P(x0, prof[i][0], prof[i][1]), P(x1, prof[i][0], prof[i][1]), P(x1, prof[i + 1][0], prof[i + 1][1]), P(x0, prof[i + 1][0], prof[i + 1][1])], '#f2f8fb', `opacity="${op}"`);
      let t = '';
      for (let i = 0; i < N / 2; i++) t += facet(i, .32);
      t += bancada(x0 + 4, x1 - 4, yc - ry * .45);
      t += at(x0 + rr(25, 70), yc, 0, `<g transform="scale(${PS})">${person({ walk: false, carry: 'basket', hat: '#e9d29a' })}</g>`);
      t += at(x0 + rr(95, 140), yc, 0, `<g transform="scale(-${PS},${PS})">${person({ walk: false, carry: 'basket', long: true })}</g>`);
      t += bancada(x0 + 4, x1 - 4, yc + ry * .45);
      for (let i = N / 2; i < N; i++) t += facet(i, .38);
      t += poly(prof.map(([yy, z]) => P(x1, yy, z)), '#f2f8fb', 'opacity=".42"');
      for (let x = x0; x <= x1; x += 32) t += `<path d="M${prof.map(([yy, z]) => pt(P(x, yy, z))).join(' L')}" stroke="#ffffff" stroke-width="1" fill="none" opacity=".9"/>`;
      return t + `<path d="M${prof.map(([yy, z]) => pt(P(x1, yy, z))).join(' L')}" stroke="#dfe8ee" stroke-width="1.6" fill="none"/>`;
    }
    for (const y0 of [484, 520]) add(1140, y0, 1300, y0 + 26, estufa(1140, 1300, y0, y0 + 26, 22), 'fracasso');
    // trator estacionado com a charrete engatada
    add(1316, 384, 1346, 474, parked(TRACTOR('#2e8b3a'), 6, 1331, 404) + parked(CART, 6, 1331, 440), 'fracasso');
    sprite(1312, 478, `<g transform="scale(-${PS},${PS})">${person({ walk: false, hat: '#e9d29a', shirt: '#3d7dd9' })}</g>`, 4, 'fracasso');
    for (const [x, y] of [[1118, 400], [1122, 520], [1355, 520]]) sprite(x, y, treeS(rr(.75, .9), '#4f8a35'), 8);
    pin('fracasso', 1205, 407, 80);
    origin();
    // ao pé do morro, a leste: lago com quiosque na beira e a trilha que desce da fazenda
    {
      const lx = 1432, ly = 522;
      reserve(lx - 66, ly - 56, lx + 60, ly + 84);
      G += `<path d="${strip([[1318, 548], [1346, 562], [1372, 576]], 8)}" fill="#d9c49a"/>`;
      G += `<path d="${blob(lx, ly, 56, 46, 18, .06)}" fill="#6f9e45"/><path d="${blob(lx, ly, 48, 39, 18, .05)}" fill="url(#lakeG)"/>`;
      for (let i = 0; i < 4; i++) { const p = P(lx + rr(-26, 26), ly + rr(-20, 20)); G += `<g transform="translate(${f(p[0])},${f(p[1])})"><ellipse class="ripple" rx="12" ry="4.5" fill="none" stroke="#e6f7ff" stroke-width="1.3" style="${neg(3)}"/></g>`; }
      lakes.push({ cx: lx, cy: ly, rx: 32, ry: 26 });
      for (const a of [200, 250, 300, 340]) sprite(lx + Math.cos(rad(a)) * 52, ly + Math.sin(rad(a)) * 43, cattail(), 4, 'fracasso');
      // quiosque: deck quadrado, quatro esteios, telhado de quatro águas e uma mesa com gente
      const qx = 1388, qy = 580, q = 15, zt = 27;
      let k = box(qx - q, qy - q, 2 * q, 2 * q, 3, '#c9955a');
      const post = (x, y) => line(P(x, y, 3), P(x, y, zt), '#7a5232', 2.2);
      k += post(qx - q + 2, qy - q + 2) + post(qx + q - 2, qy - q + 2) + post(qx - q + 2, qy + q - 2);
      k += at(qx, qy, 3, `${shadowE(10, 3)}<ellipse cx="0" cy="-8" rx="8" ry="3.2" fill="#fff"/><path d="M0,-8 V0" stroke="#888" stroke-width="1.3"/>
        <rect x="-4" y="-12" width="2.6" height="3" fill="#fff"/><rect x="1.5" y="-12" width="2.6" height="3" fill="#fff"/>
        <g transform="translate(-10,2) scale(.5)">${seated({ shirt: '#e67e22' })}</g><g transform="translate(10,2) scale(-.5,.5)">${seated({ long: true, shirt: '#3d7dd9' })}</g>`);
      k += post(qx + q - 2, qy + q - 2);
      k += pyramid(qx - q - 3, qy - q - 3, 2 * q + 6, 2 * q + 6, zt, 15, '#8b3a2a');
      add(qx - q, qy - q, qx + q, qy + q, k, 'fracasso');
      mover({ kind: 'sprite', path: [[1322, 550], [1366, 572]], mode: 'ping', speed: 4, s: PS, inner: person({ long: true, dress: true, shirt: '#f4a6c6' }), spot: 'fracasso' });
    }
  }

  // --- Belusso Steak House (a leste, mais ao norte; o rio passa perto) ---
  {
    reserve(825, 40, 1022, 270);
    G += quad(828, 44, 1018, 266, '#a8d47c');
    G += quad(890, 186, 985, 194, '#f6dbe4');
    // lago atrás da cancha, com patos
    {
      const lx = 945, ly = -8;
      reserve(lx - 66, ly - 50, lx + 66, ly + 48);
      G += `<path d="${blob(lx, ly, 62, 44, 18, .06)}" fill="#6f9e45"/><path d="${blob(lx, ly, 54, 37, 18, .05)}" fill="url(#lakeG)"/>`;
      for (let i = 0; i < 4; i++) { const p = P(lx + rr(-30, 30), ly + rr(-18, 18)); G += `<g transform="translate(${f(p[0])},${f(p[1])})"><ellipse class="ripple" rx="12" ry="4.5" fill="none" stroke="#e6f7ff" stroke-width="1.3" style="${neg(3)}"/></g>`; }
      lakes.push({ cx: lx, cy: ly, rx: 36, ry: 24 });
      for (const a of [150, 200, 250, 20]) sprite(lx + Math.cos(rad(a)) * 58, ly + Math.sin(rad(a)) * 41, cattail(), 4, 'belusso');
      const pond = ellipsePath(lx, ly, 32, 20, 24);
      mover({ kind: 'sprite', path: pond, speed: 6, s: .7, inner: duck(true), phase: .2, spot: 'belusso', r: 3 });
      mover({ kind: 'sprite', path: pond, speed: 6, s: .7, inner: duck(false), phase: .13, spot: 'belusso', r: 3 });
    }
    // cancha de bocha: comprida e estreita, piso de saibro cercado de tábuas; um jogador arremessa,
    // as bochas param perto do bolim e a turma acompanha do banco, de chimarrão na mão
    {
      const x0 = 846, x1 = 946, y0 = 84, y1 = 108, ym = (y0 + y1) / 2, T = 3, BH = 4;
      const WOOD = '#9a6a3c';
      let cb = quad(x0 - T, y0 - T, x1 + T, y1 + T, '#b98a55');
      cb += quad(x0, y0, x1, y1, '#dcc48e');
      for (let x = x0 + 8; x < x1; x += 9) cb += line(P(x, y0 + 2), P(x + 4, y1 - 2), '#cfb47c', 1, 'opacity=".6"');
      cb += line(P(x0 + 18, y0), P(x0 + 18, y1), '#f6efe1', 1.2) + line(P(x1 - 18, y0), P(x1 - 18, y1), '#f6efe1', 1.2);
      cb += box(x0 - T, y0 - T, x1 - x0 + 2 * T, T, BH, WOOD) + box(x0 - T, y0, T, y1 - y0, BH, WOOD);
      // bochas (vermelhas e verdes) em volta do bolim, no fundo da cancha
      const ball = (x, y, c, r = 2.1) => { const q = P(x, y, 0); return `<circle cx="${f(q[0])}" cy="${f(q[1] - r)}" r="${r}" fill="${c}"/><circle cx="${f(q[0] - r * .35)}" cy="${f(q[1] - r * 1.35)}" r="${f(r * .35)}" fill="#fff" opacity=".55"/>`; };
      const bx = x1 - 24;
      cb += ball(bx, ym, '#f4f1e4', 1.2);
      for (const [dx, dy, c] of [[-7, -4, '#c0392b'], [5, 5, '#2f8f4e'], [-3, 7, '#c0392b'], [9, -6, '#2f8f4e']]) cb += ball(bx + dx, ym + dy, c);
      // jogador arremessando (braço em pêndulo) e a bocha rolando até o bolim
      const a0 = P(x0 + 16, ym, 0), a1 = P(bx - 10, ym, 0);
      cb += at(x0 + 10, ym, 0, `<g transform="scale(${PS})">${person({ walk: false, shirt: '#c0392b', pants: '#2c3e50' })}
        <g class="bocha-arm" style="transform-origin:0px -22px"><path d="M0,-22 L2,-11" stroke="#e0a97e" stroke-width="2.6" stroke-linecap="round"/><circle class="bocha-hand" cx="2.4" cy="-9.6" r="3.4" fill="#c0392b"/></g></g>`);
      cb += `<g transform="translate(${f(a0[0])},${f(a0[1] - 2.1)})"><circle class="bocha-roll" r="2.1" fill="#c0392b" style="--fx:${f(a1[0] - a0[0])}px;--fy:${f(a1[1] - a0[1])}px"/></g>`;
      cb += at(x1 - 8, ym + 6, 0, `<g transform="scale(-${PS},${PS})">${person({ walk: false, shirt: '#2f8f4e' })}</g>`);
      cb += at(x1 - 6, ym - 6, 0, `<g transform="scale(-${PS},${PS})">${person({ walk: false, shirt: '#f4f1ea', hair: '#d9d0c0' })}</g>`);
      cb += box(x0 - T, y1, x1 - x0 + 2 * T, T, BH, shade(WOOD, 1.08)) + box(x1, y0, T, y1 - y0, BH, shade(WOOD, .85));
      add(x0 - T, y0 - T, x1 + T, y1 + T, cb, 'belusso');
      // banco da torcida atrás da cancha e o placar no fundo
      for (const [x, who] of [[868, [{ cuia: true, hair: '#d9d0c0', shirt: '#34495e' }, { shirt: '#e67e22' }]], [900, [{ shirt: '#9b59b6', long: true }, { cuia: true, shirt: '#f4f1ea', hair: '#d9d0c0' }]]]) {
        sprite(x, 72, benchS(`<g transform="translate(-5,-3) scale(.5)">${seated(who[0])}</g><g transform="translate(6,-3) scale(.5)">${seated(who[1])}</g>`), 8, 'belusso');
      }
      sprite(934, 74, `${shadowE(9, 3)}<path d="M-7,0 V-14 M7,0 V-14" stroke="#5a3d26" stroke-width="1.8"/><rect x="-11" y="-26" width="22" height="13" rx="1.5" fill="#2f4a2a" stroke="#5a3d26" stroke-width="1.2"/>
        <text x="0" y="-17" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="800" font-size="6.5" fill="#fff">7 × 5</text>`, 6, 'belusso');
    }
    // churrasqueira de tijolo com chaminé (as carnes na brasa)
    let gr = box(962, 58, 26, 16, 14, '#a5472e');
    gr += `<g transform="${fl(962, 74, 14)}"><rect x="4" y="3" width="18" height="7" fill="#2b1a12"/><path d="M6,8 q3,-3 6,0 q3,-3 6,0" stroke="#ff8a1e" stroke-width="1.4" fill="none" class="twinkle"/></g>`;
    gr += box(970, 62, 9, 8, 26, '#8e3b2a', 14);
    const gt = P(974, 66, 40);
    for (let i = 0; i < 4; i++) gr += `<g transform="translate(${f(gt[0])},${f(gt[1])})"><circle class="smoke" r="${f(rr(5, 8))}" fill="#e6e6e6" style="animation-delay:${(i * 1.2).toFixed(1)}s;--sx:${f(rr(25, 50))}px;--sy:-80px;--ss:2"/></g>`;
    add(962, 58, 988, 74, gr, 'belusso');
    sprite(1002, 136, signS([['BELUSSO', 9, 'Montserrat,sans-serif', 800, '#fff'], ['Steak House', 6, 'Georgia,serif', 700, '#f0a35a']], { w: 58, h: 26, bg: '#2f4a2a', post: '#5a3d26' }), 8, 'belusso');
    let arc = `<path d="M-12,0 L-12,-22 Q0,-38 12,-22 L12,0" stroke="#fff" stroke-width="2.6" fill="none"/>`;
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (1 - i / 10); arc += `<circle cx="${f(Math.cos(a) * 12)}" cy="${f(-22 - Math.sin(a) * 12)}" r="2.6" fill="${i % 2 ? '#f8a5c2' : '#fff'}"/>`; }
    arc += `<g transform="translate(-4,0) scale(${PS})">${person({ walk: false, dress: true, shirt: '#fff', pants: '#fff', long: true, veil: true })}</g>`;
    arc += `<g transform="translate(4,0) scale(-${PS},${PS})">${person({ walk: false, shirt: '#2c3e50', pants: '#2c3e50' })}</g>`;
    for (let i = 0; i < 5; i++) arc += `<g transform="translate(0,-30)"><text class="heart" font-size="${f(rr(8, 12))}" fill="#e84393" text-anchor="middle" style="animation-delay:${(i * .8).toFixed(1)}s;--hx:${f(rr(-24, 24))}px">♥</text></g>`;
    sprite(994, 190, arc, 9, 'belusso');
    for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
      const x = 902 + i * 19, y = 190 + side * (12 + row * 11);
      sprite(x, y, `<rect x="-4" y="-8" width="8" height="8" fill="#fff"/><g transform="scale(${PS})">${seated({ shirt: pick(['#f8a5c2', '#9b59b6', '#3d7dd9', '#2c3e50', '#1abc9c', '#f1c40f']), long: rnd() < .5 })}</g>`, 4, 'belusso');
    }
    const L1 = P(866, 160, 40), L2 = P(992, 160, 40);
    let lights = `<path d="M${pt(L1)} Q${f((L1[0] + L2[0]) / 2)},${f((L1[1] + L2[1]) / 2 + 26)} ${pt(L2)}" stroke="#5a4a3a" stroke-width="1" fill="none"/>`;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, x = (1 - t) * (1 - t) * L1[0] + 2 * (1 - t) * t * (L1[0] + L2[0]) / 2 + t * t * L2[0];
      const y = (1 - t) * (1 - t) * L1[1] + 2 * (1 - t) * t * ((L1[1] + L2[1]) / 2 + 26) + t * t * L2[1];
      lights += `<circle class="twinkle" cx="${f(x)}" cy="${f(y + 2)}" r="2.4" fill="#ffe27a" style="${neg(1.6)}"/>`;
    }
    add(864, 158, 994, 162, lights, 'belusso');
    // quiosque de pizza e hambúrguer, com forno a lenha
    let pz = box(846, 206, 40, 32, 20, '#f3e3c4');
    pz += `<g transform="${fl(846, 238, 20)}">${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 5}" y="1" width="5" height="3.6" fill="${i % 2 ? '#fff' : '#d7261e'}"/>`).join('')}
      <rect x="4" y="5.5" width="32" height="8" fill="#5a3a22"/><rect x="6" y="6.5" width="28" height="4.5" fill="#ffd98a"/>
      <rect x="3" y="14.5" width="34" height="4.6" rx="1" fill="#2f4a2a"/><text x="20" y="18" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="800" font-size="3.2" fill="#fff">PIZZA &amp; BURGER</text></g>`;
    pz += `<g transform="${fr(886, 238, 20)}"><rect x="8" y="4" width="16" height="10" rx="1" fill="#2d3436"/><path d="M10,7 h12 M10,10 h8" stroke="#fff" stroke-width=".7"/></g>`;
    pz += gable(846, 206, 40, 32, 20, 14, '#2f4a2a', 'x', '#f3e3c4');
    add(846, 206, 886, 238, pz, 'belusso');
    sprite(897, 236, `${shadowE(12, 4)}<path d="M-11,0 Q-12,-14 0,-16 Q12,-14 11,0Z" fill="#b5523a"/><path d="M-11,0 Q-12,-14 0,-16 Q-4,-9 -3,0Z" fill="#c9684c"/>
      <path d="M-4.5,0 Q-4.5,-6.5 0,-6.5 Q4.5,-6.5 4.5,0Z" fill="#2b1a12"/><path d="M-3,0 Q0,-5.5 3,0Z" fill="#ff8a1e" class="flame" style="transform-origin:0px 0px"/>
      <rect x="4" y="-22" width="3" height="8" fill="#8a3b2a"/><g transform="translate(5.5,-23)"><circle class="smoke" r="3" fill="#e6e6e6" style="--sx:12px;--sy:-36px;--ss:2"/><circle class="smoke" r="3" fill="#e6e6e6" style="animation-delay:2.5s;--sx:8px;--sy:-36px;--ss:2"/></g>`, 8, 'belusso');
    for (const [x, y, c] of [[862, 255, '#d7261e'], [908, 256, '#2f8f4e']]) sprite(x, y, tableS(c, true, true, 'pizza'), 9, 'belusso');
    mover({ kind: 'sprite', path: [[884, 244], [872, 248]], mode: 'ping', speed: 4, s: PS, inner: person({ carry: 'pizza', apron: true, shirt: '#2f4a2a' }), spot: 'belusso' });
    mover({ kind: 'sprite', path: [[888, 246], [900, 249]], mode: 'ping', speed: 3.5, s: PS, inner: person({ carry: 'burger', apron: true, long: true, shirt: '#d7261e' }), spot: 'belusso', phase: .5 });
    for (const [x, y, t] of [[836, 54, 'a'], [1014, 84, 't'], [836, 150, 't'], [1010, 238, 'a'], [962, 250, 't']]) {
      sprite(x, y, t === 'a' ? araucariaS(rr(.6, .72)) : treeS(rr(.85, 1), pick(['#4f8a35', '#5e9a3c', '#6aa846'])), 9, 'belusso');
    }
    pin('belusso', 896, 96, 46);
  }

  // ==================================================================
  // SUDESTE — Camping Kaskata; o rio segue para nordeste e sai do mapa
  // ==================================================================
  {
    const rio = [[1800, 945], [1700, 780], [1615, 655], [1515, 465], [1380, 280], [1215, 125], [1085, -25], [980, -200], [900, -330], [780, -520], [690, -650]];
    const larg = [56, 62, 58, 44, 40, 36, 34, 32, 30, 28, 28];
    // o rio entra pela borda de baixo do mapa (trecho só desenhado; cachoeiras e margens usam rio/larg)
    const rioV = [[1990, 1265], [1890, 1100], ...rio], largV = [56, 56, ...larg];
    reserve(1462, 660, 1600, 900);
    G += quad(1462, 660, 1600, 900, '#a3d175');
    function taper(pts, ws, k = 1) {
      const L = [], R = [];
      pts.forEach((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, hw = ws[i] * k / 2;
        L.push(P(p[0] - dy / n * hw, p[1] + dx / n * hw)); R.push(P(p[0] + dy / n * hw, p[1] - dx / n * hw));
      });
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const smooth = arr => arr.slice(1).reduce((d, p, i) => d + ` Q${pt(arr[i])} ${pt(mid(arr[i], p))}`, `L${pt(arr[0])}`) + ` L${pt(arr[arr.length - 1])}`;
      return `M${pt(L[0])} ${smooth(L)} ${smooth(R.reverse())}Z`;
    }
    G += `<path d="${taper(rioV, largV, 1.3)}" fill="#8f8a5c"/><path d="${taper(rioV, largV)}" fill="#6fa6bd"/><path d="${taper(rioV, largV, .55)}" fill="#7fb6cb" opacity=".7"/>`;
    ROADS.push([rioV, 40]);
    for (const off of [-.3, 0, .3]) {
      const lane = rioV.map((p, i) => {
        const a = rioV[Math.max(0, i - 1)], b = rioV[Math.min(rioV.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy);
        return P(p[0] - dy / n * largV[i] * off, p[1] + dx / n * largV[i] * off);
      });
      G += `<path class="river" d="M${lane.map(pt).join(' L')}" stroke="#e4f4fa" stroke-width="1.8" fill="none" stroke-dasharray="5 22" style="${neg(1.6)}"/>`;
    }
    const pedra = (x, y, s) => { const p = P(x, y); return `<g transform="translate(${f(p[0])},${f(p[1])}) scale(${f(s)})"><ellipse cx="0" cy="0" rx="9" ry="4.6" fill="#5e4a3a"/><ellipse cx="-1.5" cy="-1.6" rx="7" ry="3.2" fill="#8a6a4e"/><ellipse cx="-3" cy="-2.4" rx="3" ry="1.2" fill="#b08a66" opacity=".7"/></g>`; };
    for (const [i, t] of [[0, .55], [1, .3], [1, .72], [2, .4]]) {
      const a = rio[i], b = rio[i + 1], c = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy), nx = -dy / n, ny = dx / n;
      const hw = (larg[i] + (larg[i + 1] - larg[i]) * t) / 2 * .95;
      const A = [c[0] + nx * hw, c[1] + ny * hw], B = [c[0] - nx * hw, c[1] - ny * hw];
      // a água corre de sul para norte: a queda fica virada para o observador
      G += poly([P(A[0], A[1], 6), P(B[0], B[1], 6), P(B[0], B[1], 0), P(A[0], A[1], 0)], '#e9f6fb');
      for (let k = 0; k <= 12; k++) {
        const q = [A[0] + (B[0] - A[0]) * k / 12, A[1] + (B[1] - A[1]) * k / 12];
        G += line(P(q[0], q[1], 6), P(q[0] + dx / n * 6, q[1] + dy / n * 6, 0), '#fff', 1.6, `class="fall" stroke-dasharray="4 3" style="${neg(.7)}"`);
      }
      for (let k = 0; k < 7; k++) {
        const q = [A[0] + (B[0] - A[0]) * rr(0, 1), A[1] + (B[1] - A[1]) * rr(0, 1)];
        const p = P(q[0] + dx / n * rr(8, 22), q[1] + dy / n * rr(8, 22));
        G += `<g transform="translate(${f(p[0])},${f(p[1])})"><ellipse class="ripple" rx="${f(rr(8, 14))}" ry="${f(rr(3, 5))}" fill="#fff" opacity=".8" style="${neg(3)}"/></g>`;
        G += `<ellipse cx="${f(p[0] + rr(-6, 6))}" cy="${f(p[1] + rr(-2, 2))}" rx="${f(rr(5, 10))}" ry="${f(rr(1.6, 3))}" fill="#f4fbfd" opacity=".85"/>`;
      }
      for (let k = 0; k < 4; k++) { const u = rr(0, 1); G += pedra(A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, rr(.7, 1.3)); }
    }
    for (let k = 0; k < 16; k++) {
      const i = (rnd() * 4) | 0, a = rio[i], b = rio[i + 1], t = rnd(), side = rnd() < .5 ? -1 : 1;
      const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy), hw = larg[i] / 2 * rr(.6, 1.15);
      G += pedra(a[0] + dx * t - dy / n * hw * side, a[1] + dy * t + dx / n * hw * side, rr(.6, 1.2));
    }
    function tent(x, y, w, d, h, c) {
      const ym = y + d / 2;
      let t = poly([P(x, y), P(x + w, y), P(x + w, ym, h), P(x, ym, h)], shade(c, .82));
      t += poly([P(x + w, y), P(x + w, y + d), P(x + w, ym, h)], shade(c, .7));
      t += poly([P(x + w, ym - 3, 0), P(x + w, ym + 4, 0), P(x + w, ym, h * .65)], '#3a2a1a');
      return t + poly([P(x, ym, h), P(x + w, ym, h), P(x + w, y + d), P(x, y + d)], c);
    }
    const tendas = [[1498, 690, '#e67e22'], [1536, 748, '#3d7dd9'], [1500, 790, '#2ecc71'], [1552, 830, '#e74c3c'], [1468, 846, '#f1c40f']];
    for (const [x, y, c] of tendas) add(x, y, x + 32, y + 24, tent(x, y, 32, 24, 20, c), 'kaskata');
    // mata ciliar nas duas margens
    for (let i = 0; i < 7; i++) {
      const a = rioV[i], b = rioV[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy);
      for (let t = 0; t < 1; t += .3) for (const side of [-1, 1]) {
        const hw = largV[i] / 2 + rr(14, 32);
        const x = a[0] + dx * t - dy / n * hw * side, y = a[1] + dy * t + dx / n * hw * side;
        if (!visible(x, y, 30) || tendas.some(([tx, ty]) => x > tx - 14 && x < tx + 46 && y > ty - 14 && y < ty + 38)) continue;
        if (x > 1460 && x < 1602 && y > 658 && y < 902 && side < 0) continue;
        if (lakes.some(l => Math.hypot((x - l.cx) / (l.rx + 40), (y - l.cy) / (l.ry + 36)) < 1)) continue; // não invade lagos
        sprite(x, y, rnd() < .25 ? araucariaS(rr(.5, .65)) : treeS(rr(.85, 1.1), pick(['#2f6b2a', '#3f7a2c', '#4f8a35', '#356f30'])), 9, 'kaskata');
      }
    }
    sprite(1478, 772, `<ellipse rx="10" ry="4" fill="#5a4a3a"/><g class="flame" style="transform-origin:0px 0px"><path d="M0,-16 Q7,-6 0,0 Q-7,-6 0,-16Z" fill="#ff8a1e"/><path d="M0,-9 Q3.5,-3 0,0 Q-3.5,-3 0,-9Z" fill="#ffe066"/></g>
      <g transform="translate(0,-16)"><circle class="smoke" r="4" fill="#ddd" style="--sx:16px;--sy:-50px;--ss:2"/><circle class="smoke" r="4" fill="#ddd" style="animation-delay:2.5s;--sx:10px;--sy:-50px;--ss:2"/></g>`, 8, 'kaskata');
    sprite(1466, 762, `<g transform="scale(${PS})">${seated({})}</g>`, 3, 'kaskata');
    sprite(1490, 784, `<g transform="scale(-${PS},${PS})">${seated({ long: true })}</g>`, 3, 'kaskata');
    sprite(1470, 786, `<g transform="scale(${PS})">${seated({})}</g>`, 3, 'kaskata');
    sprite(1522, 866, signS([['CAMPING', 7], ['KASKATA', 9.5, 'Montserrat,sans-serif', 800, '#1f6fb5']], { w: 64, h: 26, bg: '#e9f6ff', post: '#2e7d32' }), 9, 'kaskata');
    mover({ kind: 'sprite', path: [[1474, 720], [1520, 880]], mode: 'ping', speed: 7, s: PS, inner: person({}), spot: 'kaskata' });
    pin('kaskata', 1650, 712, 40);
  }

  // ==================================================================
  // LAVOURAS, PASTOS, VACAS E ÁRVORES
  // ==================================================================
  // lavoura a sudoeste, com trator arando
  {
    reserve(800, 1380, 975, 1495);
    G += quad(800, 1380, 975, 1495, '#8a6a43');
    for (let y = 1386; y < 1492; y += 10) G += quad(806, y, 969, y + 5, y < 1430 ? '#a3c25a' : '#76552f');
    mover({ kind: 'veh', path: [[820, 1436], [955, 1436]], mode: 'ping', speed: 12, v: TRACTOR('#c0392b'), r: 14 });
    if (INVERNO) movers.pop(); // no inverno, com geada, ninguém está arando
    add(950, 1478, 972, 1492, cyl(958, 1485, 6, 9, '#e2c26a') + cyl(968, 1485, 6, 9, '#e2c26a'));
  }
  // trigal a sudeste
  {
    reserve(1180, 830, 1330, 990);
    G += quad(1180, 830, 1330, 990, '#d9c27a');
    for (let x = 1186; x < 1326; x += 8) G += line(P(x, 836), P(x, 984), '#c8ad63', 2);
  }
  function fenceX(x0, x1, y) {
    let s = '';
    for (let x = x0; x <= x1; x += 20) s += line(P(x, y), P(x, y, 12), '#7a5232', 2.4);
    s += line(P(x0, y, 10), P(x1, y, 10), '#8a6038', 1.8) + line(P(x0, y, 5), P(x1, y, 5), '#8a6038', 1.8);
    add(x0, y - 1, x1, y + 1, s);
  }
  // pasto ao norte
  fenceX(620, 770, 60); fenceX(620, 770, 205);
  reserve(615, 55, 775, 210);
  for (const [x, y, s, flip, moo] of [[650, 110, .45, false, true], [710, 150, .5, true, false], [745, 100, .45, false, false]]) sprite(x, y, `<g transform="scale(${flip ? -s : s},${s})">${cow({ moo: moo && !flip })}</g>`, 10);
  mover({ kind: 'sprite', path: [[640, 185], [760, 185]], mode: 'ping', speed: 3, s: .42, inner: cow(), r: 10 });
  // pasto a sudoeste
  fenceX(520, 660, 1515); fenceX(520, 660, 1610);
  reserve(515, 1510, 665, 1615);
  for (const [x, y, s, flip, moo] of [[560, 1560, .45, true, false], [625, 1585, .48, false, true]]) sprite(x, y, `<g transform="scale(${flip ? -s : s},${s})">${cow({ moo: moo && !flip })}</g>`, 10);
  // vacas perto do morro da fazenda
  for (const [x, y, s, flip] of [[1352, 690, .45, false], [1418, 660, .42, true]]) { sprite(x, y, `<g transform="scale(${flip ? -s : s},${s})">${cow()}</g>`, 10); reserve(x - 12, y - 12, x + 12, y + 12); }

  // ==================================================================
  // PÓRTICO DE SANANDUVA — na rodovia sul, logo depois da entrada da Kaskata
  // Várias lâminas brancas curvas, em fileira dos dois lados da pista — inspiradas nas
  // pétalas da flor da sananduva —, o letreiro "BEM-VINDO / SANANDUVA" e a bandeira tremulando.
  // ==================================================================
  {
    const cx = 1170; // ponto da rodovia (x = y)
    // uma lâmina: pétala alta e fina que se curva para a pista
    const blade = (h, mir) => `<g transform="scale(${mir ? -.9 : .9},.9)">${shadowE(9, 3)}<rect x="-8" y="-2" width="15" height="3.5" rx="1" fill="#c3c9d0"/>
      <path d="M-6,0 C-9,${f(-30 * h)} -5,${f(-66 * h)} ${f(24 * h)},${f(-98 * h)} C${f(7 * h)},${f(-70 * h)} 3,${f(-34 * h)} 6,0Z" fill="#f4f6f8" stroke="#c4cad2" stroke-width=".9"/>
      <path d="M1.5,0 C0,${f(-32 * h)} 4,${f(-68 * h)} ${f(24 * h)},${f(-98 * h)} C${f(7 * h)},${f(-70 * h)} 3,${f(-34 * h)} 6,0Z" fill="#d6dbe1"/></g>`;
    // fileiras ao longo da pista (de sul para norte as lâminas vão ficando mais altas)
    const alturas = [.5, .64, .78, .9, 1];
    alturas.forEach((h, i) => {
      const k = 44 - i * 22; // passo ao longo da rodovia
      sprite(cx + k - 28, cx + k + 28, blade(h, false), 4);  // lado esquerdo, curvando para a direita
      if (i >= 1) sprite(cx + k + 28, cx + k - 28, blade(h * .98, true), 4); // lado direito, curvando para a esquerda
    });
    // letreiro: "BEM-VINDO" na vertical e SA / NAN / DUVA em letras grandes cinza, na estrutura de metal
    G += quad(cx + 46, cx - 34, cx + 96, cx + 14, '#d9d3c6');
    const L3 = (t, y) => `<text x="-15" y="${y + 1.4}" font-family="Montserrat,sans-serif" font-weight="800" font-size="12" fill="#8a929c">${t}</text><text x="-16.2" y="${y}" font-family="Montserrat,sans-serif" font-weight="800" font-size="12" fill="#e9ecef" stroke="#a7afb9" stroke-width=".5">${t}</text>`;
    sprite(cx + 72, cx - 12, `${shadowE(28, 6)}<path d="M-20,0 V-46 M-14,-44 H26 M-14,-31 H34 M-14,-18 H38 M30,0 V-44" stroke="#4a4f55" stroke-width="1.4"/>
      <g transform="translate(-21,-4) rotate(-90)"><text x="0" y="3" font-family="Montserrat,sans-serif" font-weight="800" font-size="5" fill="#e9ecef" stroke="#8a929c" stroke-width=".35" letter-spacing=".6">BEM-VINDO</text></g>
      ${L3('SA', -33)}${L3('NAN', -20)}${L3('DUVA', -7)}`, 12);
    // bandeira de Sananduva tremulando: diagonal vermelha e azul, brasão no círculo amarelo
    const brasao = `<circle cx="19" cy="12.5" r="7.6" fill="#f7e04a" stroke="#e8c92e" stroke-width=".6"/>
      <path d="M15.6,8.4 l.9,-2 l1.2,1.2 l1.3,-1.8 l1.3,1.8 l1.2,-1.2 l.9,2Z" fill="#9a7b3a"/><circle cx="19" cy="5.6" r=".5" fill="#c0392b"/>
      <path d="M15.8,8.8 H22.2 V13.6 Q22.2,17 19,18.2 Q15.8,17 15.8,13.6Z" fill="#2f8f4e"/><path d="M15.8,8.8 H19 V12.6 H15.8Z" fill="#d7261e"/><path d="M19,8.8 H22.2 V12.6 H19Z" fill="#f2d16b"/>
      <path d="M19,17 V13.6 M17.4,15 L19,13.8 L20.6,15" stroke="#1f5a2e" stroke-width=".6" fill="none"/>
      <path d="M14.2,16.4 Q12.8,12 14.4,8.4 M23.8,16.4 Q25.2,12 23.6,8.4" stroke="#6aa846" stroke-width=".9" fill="none"/>
      <path d="M15.2,18.6 Q19,20.2 22.8,18.6" stroke="#2a4fa0" stroke-width=".9" fill="none"/>`;
    sprite(cx - 74, cx + 2, `${shadowE(6, 2)}<path d="M0,0 V-80" stroke="#cfd4da" stroke-width="2.4"/><circle cy="-81" r="2.2" fill="#d4af37"/>
      <g transform="translate(1,-78)"><g class="flag"><rect width="38" height="25" fill="#2a4fa0"/><path d="M0,0 H38 L0,25Z" fill="#e3241b"/>${brasao}</g></g>`, 4);
    // meio-fio amarelo nas bordas da pista, junto ao pórtico
    for (const d of [-23, 23]) RDL.line += line(P(cx - 40 + (d < 0 ? 0 : d), cx - 40 - (d < 0 ? d : 0)), P(cx + 40 + (d < 0 ? 0 : d), cx + 40 - (d < 0 ? d : 0)), '#f1c40f', 3);
    reserve(cx - 100, cx - 70, cx + 110, cx + 100);
  }

  // araucárias ao longo das rodovias
  for (let t = .1; t < 1; t += .16) {
    const [ax, ay] = [1490 + (1018 - 1490) * t, 1490 + (1018 - 1490) * t];
    if (isFree(ax + 42, ay - 42, 4)) sprite(ax + 42, ay - 42, araucariaS(rr(.55, .7)), 8);
    if (isFree(ax - 42, ay + 42, 4)) sprite(ax - 42, ay + 42, araucariaS(rr(.55, .7)), 8);
  }
  // árvores espalhadas pelo campo
  for (let i = 0; i < 240; i++) {
    const x = rr(-760, 2160), y = rr(-660, 2160);
    if (!visible(x, y, 40) || x + y < 480 || !isFree(x, y, 22)) continue;
    const [sx, sy] = P(x, y);
    if (((sx - 530) / 245) ** 2 + ((sy - 940) / 190) ** 2 < 1) continue; // colina do Espaço Ágape (tem as araucárias dela)
    const k = rnd();
    sprite(x, y, k < .3 ? araucariaS(rr(.5, .72)) : k < .45 ? pineS(rr(.7, 1)) : treeS(rr(.7, 1.02), pick(['#4f8a35', '#5e9a3c', '#6aa846', '#3f7a2c'])), 9);
    reserve(x - 6, y - 6, x + 6, y + 6);
  }

  // ==================================================================
  // DECORAÇÕES DOS TEMAS — sorteiam à parte (alt), então o resto do mapa não muda
  // ==================================================================
  const freeSpot = (x, y, m = 5) => { const [a, b] = Wd(x, y); return !statics.some(o => a > o.x0 - m && a < o.x1 + m && b > o.y0 - m && b < o.y1 + m); };
  const star = (cy, r = 1) => `<path transform="translate(0,${cy}) scale(${r})" d="M0,-6.5 L1.8,-2 L6.6,-1.9 L2.9,1.2 L4.1,5.8 L0,3.2 L-4.1,5.8 L-2.9,1.2 L-6.6,-1.9 L-1.8,-2Z" fill="#ffd23f" stroke="#e0a800" stroke-width=".6"/>`;
  const flatLights = (x0, y0, x1, y1, z) => bulbs([P(x0, y1, z), P(x1, y1, z), P(x1, y0, z)]);

  // um ponto livre junto de cada estabelecimento da associação (árvore de Natal, bandeira...)
  const ESTAB = [[628, 568, 'pipinos'], [626, 880, 'majestade'], [738, 960, 'vicato'], [758, 692, 'artesao'], [588, 1400, 'dallas'], [176, 748, 'elton'],
    [-142, 1003, 'vivaflor'], [-200, 815, 'moterle'], [230, 318, 'angico'], [1508, 905, 'kaskata'], [985, 120, 'belusso'], [1300, 452, 'fracasso', 22], [848, 1172, 'flora']];
  // espalha até n enfeites em pontos livres em volta de (x, y): fora de prédios, ruas, rios e lagos
  const inLake = (x, y) => lakes.some(l => ((x - l.cx) / (l.rx + 10)) ** 2 + ((y - l.cy) / (l.ry + 10)) ** 2 < 1);
  function scatter(x, y, R, n, fn, m = 4) {
    for (let i = 0, k = 0; i < n * 14 && k < n; i++) {
      const a = rr(0, 6.283), d = rr(9, R), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (!freeSpot(px, py, m) || nearRoad(px, py, 2) || inLake(px, py) || !visible(px, py, 0)) continue;
      fn(px, py, k++);
    }
  }
  // em volta de cada estabelecimento (no morro da Fracasso, perto do ponto, para não flutuar)
  const aroundEstab = (n, fn, R = 46) => { for (const [x, y, spot, z] of ESTAB) scatter(x, y, z ? 24 : R, n, (px, py, k) => fn(px, py, spot, z || 0, k)); };

  // --- Natal --------------------------------------------------------
  const GIFT = [['#d7261e', '#ffd23f'], ['#2f8f4e', '#ffffff'], ['#3d7dd9', '#ffd23f'], ['#ffd23f', '#d7261e'], ['#9b59b6', '#ffffff'], ['#ffffff', '#d7261e'], ['#e67e22', '#2f8f4e']];
  function giftS(k = 0, w = 8, h = 7) {
    // caixa de presente com fita e laço (vista de frente, com a tampa em perspectiva)
    const [c, r] = GIFT[k % GIFT.length], hw = w / 2;
    return `<path d="M${-hw},${-h} L${-hw + 3},${-h - 2.5} L${hw + 3},${-h - 2.5} L${hw},${-h}Z" fill="${shade(c, 1.15)}"/><path d="M${hw},0 L${hw + 3},-2.5 L${hw + 3},${-h - 2.5} L${hw},${-h}Z" fill="${shade(c, .78)}"/>
      <rect x="${-hw}" y="${-h}" width="${w}" height="${h}" fill="${c}"/><rect x="-.9" y="${-h}" width="1.8" height="${h}" fill="${r}"/><path d="M${hw},${-h * .55} l3,-2.5" stroke="${r}" stroke-width="1.6"/>
      <ellipse cx="-1.6" cy="${-h - 2}" rx="2" ry="1.3" fill="${r}"/><ellipse cx="1.8" cy="${-h - 2}" rx="2" ry="1.3" fill="${r}"/>`;
  }
  const giftPile = k => `${shadowE(11, 3)}<g transform="translate(-5,0)">${giftS(k, 9, 8)}</g><g transform="translate(5,1)">${giftS(k + 2, 7, 5)}</g><g transform="translate(-1,-7)">${giftS(k + 4, 6, 5)}</g>`;
  function xmasTreeS(s = 1) {
    let t = `${shadowE(13, 4)}<rect x="-2.2" y="-8" width="4.4" height="8" fill="#6b4a2b"/><rect x="-6" y="-5" width="12" height="5" rx="1" fill="#c0392b"/>
      <path d="M0,-50 L11,-30 L6,-30 L15,-16 L9,-16 L18,-6 L-18,-6 L-9,-16 L-15,-16 L-6,-30 L-11,-30Z" fill="#2f7a3a"/><path d="M0,-50 L11,-30 L6,-30 L15,-16 L9,-16 L18,-6 L4,-6Z" fill="#000" opacity=".12"/>`;
    [[-6, -33], [3, -38], [7, -29], [-10, -22], [0, -24], [10, -19], [-13, -11], [-4, -13], [6, -10], [14, -9]]
      .forEach(([x, y], i) => (t += `<circle cx="${x}" cy="${y}" r="1.8" fill="${lamp(i % 5, i % 2)}"/>`));
    t += `<circle cy="-51" r="9" fill="${lamp(5, 0)}" fill-opacity=".3"/>${star(-51)}`;
    // presentes ao pé da árvore
    t += `<g transform="translate(-12,4)">${giftS(0, 8, 7)}</g><g transform="translate(11,5)">${giftS(2, 7, 6)}</g><g transform="translate(-1,7)">${giftS(4, 9, 5)}</g>`;
    return `<g transform="scale(${s})">${t}</g>`;
  }
  function presepioS() {
    // lapinha de madeira aberta para a rua, com a Sagrada Família, a estrela e luz quente
    const sk = '#f1c7a0';
    return `<g opacity=".2"><ellipse cx="0" cy="-14" rx="42" ry="26" fill="#ffd27a" class="twinkle"/></g>${shadowE(30, 7)}
      <ellipse cx="0" cy="-1" rx="28" ry="6" fill="#d9b36a"/><rect x="-24" y="-34" width="48" height="33" fill="#4a3322"/>
      <g opacity=".5"><ellipse cx="0" cy="-14" rx="18" ry="14" fill="#ffcf6b" class="twinkle"/></g>
      <path d="M-24,0 V-34 M24,0 V-34" stroke="#7a5232" stroke-width="3.4"/>
      <path d="M-31,-32 L0,-52 L31,-32 L27,-29 L0,-46 L-27,-29Z" fill="#b5884a"/>
      <path d="M-24,-33 L-20,-38 M-14,-37 L-10,-42 M-4,-41 L0,-46 M6,-41 L10,-45 M16,-37 L19,-40" stroke="#8a6232" stroke-width=".9"/>
      ${bulbs([[-31, -32], [0, -52], [31, -32]], 5, 1.4)}
      <path d="M-7,-2 L-9,-9 H9 L7,-2Z" fill="#8a5a2b"/><path d="M-9,-9 Q0,-12 9,-9" stroke="#e8c66a" stroke-width="2.4" fill="none"/>
      <ellipse cx="0" cy="-11" rx="4.2" ry="2" fill="#fff"/><circle cx="3.6" cy="-11.6" r="1.8" fill="${sk}"/>
      <path d="M-19,-1 Q-20,-12 -15,-17 Q-11,-19 -10,-13 L-9,-1Z" fill="#3d6fb6"/><circle cx="-13.5" cy="-19.5" r="3.4" fill="${sk}"/>
      <path d="M-17.6,-18.6 Q-14,-25.5 -9.4,-19.6 L-9.8,-14 Q-13,-18 -17.4,-14.6Z" fill="#2c5aa0"/>
      <path d="M11,-1 L12.5,-22 Q15,-25 17.5,-22 L19,-1Z" fill="#8a5a2b"/><circle cx="15" cy="-25.5" r="3.3" fill="${sk}"/>
      <path d="M11.8,-26 Q15,-30.5 18.2,-26 L18.2,-23 Q15,-25.5 11.8,-23Z" fill="#6b4a2b"/><path d="M21,-1 V-30 q0,-3 -2.5,-3" stroke="#6b4a2b" stroke-width="1.3" fill="none"/>
      <g opacity=".3"><circle cy="-61" r="11" fill="#ffe27a" class="twinkle"/></g>${star(-61)}<path d="M0,-55 V-50" stroke="#ffd23f" stroke-width=".8"/>`;
  }
  function sananduvaLightsS(s) {
    // varais de pisca-pisca na copa e o tronco enrolado (balança junto com a árvore)
    const swag = (x0, x1, y, sag) => bulbs(Array.from({ length: 13 }, (_, i) => [x0 + (x1 - x0) * i / 12, y + Math.sin(i / 12 * Math.PI) * sag]), 7, 2.1);
    let t = swag(-80, 80, -72, 16) + swag(-68, 68, -94, 14) + swag(-50, 52, -114, 12);
    t += bulbs(Array.from({ length: 15 }, (_, i) => [(i % 2 ? 7 : -7) * (1 - i / 30), -2 - i * 3.2]), 4, 1.9);
    return `<g transform="scale(${s})"><g class="sway" style="animation-duration:5s">${t}</g></g>`;
  }
  if (NATAL) alt(() => {
    // árvore de Natal iluminada em cada propriedade
    for (const [x, y, spot, z] of ESTAB) {
      sprite(x, y, xmasTreeS(.8), 6, spot, z || 0);
    }
    // pisca-pisca nos telhados dos atrativos (as casas já ganham luzes em house())
    add(523, 521, 600, 576, flatLights(522, 520, 600, 576, 30), 'pipinos');
    add(517, 857, 586, 896, flatLights(516, 856, 586, 896, 40), 'majestade');
    add(517, 907, 612, 966, flatLights(516, 906, 612, 966, 30), 'majestade');
    add(745, 859, 802, 916, flatLights(744, 858, 802, 916, 72), 'vicato');
    add(769, 685, 806, 712, roofLights(768, 684, 38, 28, 20, 24, 'y', 4), 'artesao');
    add(847, 207, 886, 238, roofLights(846, 206, 40, 32, 20, 14, 'x'), 'belusso');
    origin(-390, 510); add(991, 876, 1054, 925, flatLights(990, 875, 1054, 925, 30), 'dallas');
    origin(0, 0, 22); add(1151, 381, 1260, 434, roofLights(1150, 380, 110, 54, 30, 22, 'x'), 'fracasso');
    origin();
    // presépio iluminado junto à igreja e luzes na sananduva da praça
    sprite(792, 574, `<g transform="scale(.8)">${presepioS()}</g>`, 10, 'igreja');
    sprite(746, 746, sananduvaLightsS(.72), 16, 'praca');
    // presentes (grandes, para aparecer bem) espalhados pelas quadras da cidade e pelas propriedades
    const gift = () => `<g transform="scale(${f(rr(1.35, 1.6))})">${rnd() < .4 ? giftPile((rnd() * 7) | 0) : `${shadowE(6, 2)}${giftS((rnd() * 7) | 0, rr(6, 9), rr(5, 8))}`}</g>`;
    for (let i = 0, n = 0; i < 900 && n < 70; i++) {
      const [a, b] = pick(BL), [c, d] = pick(BL), x = rr(a + 3, b - 3), y = rr(c + 3, d - 3);
      if (!freeSpot(x, y, 5)) continue;
      sprite(x, y, gift(), 4); n++;
    }
    aroundEstab(6, (x, y, spot, z) => sprite(x, y, gift(), 5, spot, z));
  });

  // --- Páscoa -------------------------------------------------------
  const EGG = ['#e84393', '#3d7dd9', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#ff8ad8', '#4db8ff'];
  const eggS = (c1, c2, sh = true) => `${sh ? '<ellipse rx="3.6" ry="1.3" fill="#000" opacity=".15"/>' : ''}<path d="M0,-9 C3.2,-9 4,-4.5 4,-3 C4,-.6 2.2,.6 0,.6 C-2.2,.6 -4,-.6 -4,-3 C-4,-4.5 -3.2,-9 0,-9Z" fill="${c1}" stroke="#fff" stroke-width=".6"/>
    <path d="M-3.9,-4.2 Q0,-2.4 3.9,-4.2 L3.7,-2.6 Q0,-.9 -3.7,-2.6Z" fill="${c2}"/><circle cx="-1.4" cy="-6.6" r=".8" fill="#fff" opacity=".7"/>`;
  function crossS() {
    // cruz de madeira com o manto roxo da Quaresma; no domingo e na segunda de Páscoa o manto fica branco
    const [m1, m2, m3] = TEMA.ressurreicao ? ['#f4f1ea', '#ffffff', '#d9d3c6'] : ['#6c2d91', '#8e44ad', '#4e1f6b'];
    return `${shadowE(16, 5)}<path d="M-12,0 Q-10,-6 0,-6 Q10,-6 12,0Z" fill="#9a8f84"/>
      <rect x="-3" y="-86" width="6" height="82" fill="#6b4a2b"/><rect x="-3" y="-86" width="2" height="82" fill="#82603d"/>
      <rect x="-24" y="-68" width="48" height="6" fill="#6b4a2b"/><rect x="-24" y="-68" width="48" height="2" fill="#82603d"/>
      <path d="M-20,-69 Q0,-61 20,-69 L18,-38 Q16,-34 13,-38 L9,-60 Q0,-57 -9,-60 L-13,-38 Q-16,-34 -18,-38Z" fill="${m1}"/>
      <path d="M-20,-69 Q0,-61 20,-69 L19.4,-64 Q0,-57 -19.4,-64Z" fill="${m2}"/><path d="M-15,-58 L-16,-40 M15,-58 L16,-40" stroke="${m3}" stroke-width="1"/>`;
  }
  function chocolateS() {
    // oficina dos coelhos: panela de chocolate derretido, ovos na mesa e coelhos de touca de cozinheiro
    const toque = `<g transform="translate(5,-10.5)"><rect x="-2.4" y="-2.5" width="4.8" height="3" fill="#fff" stroke="#ddd" stroke-width=".3"/><circle cx="-1.6" cy="-3.6" r="1.8" fill="#fff"/><circle cx="1.6" cy="-3.6" r="1.8" fill="#fff"/><circle cy="-4.6" r="2" fill="#fff"/></g>`;
    const choc = (x, y, c, k = .7) => `<g transform="translate(${x},${y}) scale(${k})">${eggS(c, c === '#6b3a1f' || c === '#7a4424' ? '#f1c40f' : '#ffffff')}</g>`;
    return `${shadowE(32, 7)}
      <rect x="-20" y="-11" width="40" height="3" rx="1" fill="#a8743f"/><path d="M-17,-8 V0 M17,-8 V0" stroke="#7a5232" stroke-width="2"/>
      <path d="M-15,-11 L-14,-20 H-2 L-1,-11Z" fill="#4a4a4a"/><ellipse cx="-8" cy="-20" rx="6.4" ry="1.8" fill="#5a3220"/>
      <g class="steam" style="animation-delay:-.6s"><path d="M-10,-23 q-1.5,-3 0,-6 M-6,-23 q1.5,-3 0,-6" stroke="#fff" stroke-width=".9" fill="none"/></g>
      <g class="wave-arm" style="transform-origin:-6px -19px"><path d="M-6,-19 L-1,-30" stroke="#c9a06a" stroke-width="1.4" stroke-linecap="round"/></g>
      ${choc(4, -11, '#6b3a1f')}${choc(9, -11, '#7a4424')}${choc(14, -11, '#6b3a1f')}${choc(9, -14.5, '#e84393')}
      <g transform="translate(-27,0)">${rabbit('#f4f1ea', toque)}</g>
      <g transform="translate(27,0) scale(-1,1)">${rabbit('#d9c3a5', toque + `<g transform="translate(10,-4) scale(.6)">${eggS('#6b3a1f', '#f1c40f')}</g>`)}</g>
      <g transform="translate(-2,2)"><path d="M-7,0 h14 l-1.5,-5 h-11Z" fill="#b5835a"/>${choc(-3.5, -4, '#e84393')}${choc(.5, -4.5, '#3d7dd9')}${choc(4, -4, '#f1c40f')}</g>`;
  }
  // ovo grande no chão, para aparecer bem no mapa
  const bigEgg = (s = 1.6) => `<g transform="scale(${f(s)})">${eggS(pick(EGG), pick(EGG))}</g>`;
  function eggBasketS() {
    // cesta de vime cheia de ovos, com alça e laço
    const ovo = (x, y, r = 0) => `<g transform="translate(${x},${y}) rotate(${r})">${eggS(pick(EGG), pick(EGG), false)}</g>`;
    return `${shadowE(14, 4)}<path d="M-12,-9 Q0,-34 12,-9" stroke="#8a5a2b" stroke-width="2.2" fill="none"/>
      ${ovo(-7, -8, -14)}${ovo(0, -10)}${ovo(7, -8, 14)}${ovo(-3.5, -6, -6)}${ovo(4, -6, 8)}
      <path d="M-13,-9 H13 L10,0 H-10Z" fill="#c08a4e"/><path d="M-12,-6 H12 M-11,-3 H11" stroke="#8a5a2b" stroke-width=".8"/>
      <path d="M-13,-9 H13" stroke="#8a5a2b" stroke-width="1.6"/><path d="M-6,-1 V-9 M0,-1 V-9 M6,-1 V-9" stroke="#a8743f" stroke-width=".7"/>
      <path d="M-4,-24 l-4,-3 v6Z M4,-24 l4,-3 v6Z" fill="#e84393"/><circle cy="-24" r="1.6" fill="#c2185b"/>`;
  }
  if (PASCOA) alt(() => {
    sprite(792, 574, crossS(), 10, 'igreja');
    // ovos coloridos espalhados pelas quadras da cidade
    for (let i = 0, n = 0; i < 900 && n < 110; i++) {
      const [a, b] = pick(BL), [c, d] = pick(BL), x = rr(a + 2, b - 2), y = rr(c + 2, d - 2);
      if (!freeSpot(x, y, 4)) continue;
      sprite(x, y, bigEgg(rr(1.4, 1.8)), 3); n++;
    }
    // em cada propriedade da associação: uma cesta cheia de ovos e ovos grandes pelo pátio
    for (const [x, y, spot, z] of ESTAB) sprite(x, y, `<g transform="scale(1.3)">${eggBasketS()}</g>`, 7, spot, z || 0);
    aroundEstab(8, (x, y, spot, z) => sprite(x, y, bigEgg(rr(1.6, 2)), 3, spot, z));
    // Dallas: coelhos fabricando ovos de chocolate
    sprite(470, 1160, chocolateS(), 14, 'dallas');
    // coelhos pulando pela cidade e pelo campo, com um ovo de Páscoa nas costas
    for (const [path, c] of [[[[852, 809], [978, 809]], '#f4f1ea'], [[[515, 811], [636, 811]], '#d9c3a5'], [[[809, 852], [809, 978]], '#b88a62'],
      [[[688, 760], [688, 800]], '#f4f1ea'], [[[600, 1060], [700, 1100]], '#8d8d8d'], [[[880, 1080], [960, 1060]], '#f4f1ea'], [[[1000, 700], [1000, 790]], '#d9c3a5']]) {
      const egg = `<g transform="translate(-1.5,-8.6) rotate(-18) scale(.62)">${eggS(pick(EGG), pick(EGG), false)}</g>`;
      mover({ kind: 'sprite', path, mode: 'ping', speed: rr(9, 13), s: .9, inner: rabbit(c, egg), r: 3 });
    }
  });

  // --- Semana Farroupilha ---------------------------------------------
  const RS_FLAG = `<path d="M0,0 L28,0 L0,18Z" fill="#1e8f3e"/><path d="M28,0 L28,18 L0,18Z" fill="#f1c40f"/><path d="M0,18 L5,18 L28,4 L28,0 L23,0 L0,15Z" fill="#d7261e"/><circle cx="14" cy="9" r="3.4" fill="#fff"/><circle cx="14" cy="9" r="1.8" fill="#2f8f4e"/>`;
  const flagPoleS = (h = 56) => `${shadowE(6, 2)}<path d="M0,0 V-${h}" stroke="#cfd4da" stroke-width="2"/><circle cy="-${h + 1}" r="1.8" fill="#d4af37"/><g transform="translate(1,-${h - 2})"><g class="flag" style="${neg(1.4)}">${RS_FLAG}</g></g>`;
  // bandeirolas verde, vermelho e amarelo penduradas entre dois pontos (já na tela), com barriga
  function bandeirolas(a, b, sag = 10) {
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 7)), C = ['#1e8f3e', '#d7261e', '#f1c40f'];
    const pts = Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n + Math.sin(i / n * Math.PI) * sag]);
    let t = `<path d="M${pts.map(pt).join(' L')}" stroke="#5a4a3a" stroke-width=".6" fill="none"/>`;
    pts.slice(1, -1).forEach(([x, y], i) => (t += `<path d="M${f(x - 2.6)},${f(y)} L${f(x + 2.6)},${f(y)} L${f(x)},${f(y + 5.5)}Z" fill="${C[i % 3]}"/>`));
    return t;
  }
  // cavalo de perfil (virado para a direita), com ou sem cavaleiro pilchado; a pé ou parado
  function horseS(o = {}) {
    const c = o.c || '#8a5a3a', dk = shade(c, .7), mv = o.walk !== false;
    const leg = (x, i) => `<g class="${mv ? 'deer-leg' : ''}" style="transform-origin:${x}px -11px${i % 2 ? ';animation-direction:alternate-reverse' : ''}"><path d="M${x},-11 L${x},0" stroke="${i < 2 ? dk : c}" stroke-width="2.4" stroke-linecap="round"/><path d="M${x - .6},0 h2" stroke="#2b2b2b" stroke-width="1.6"/></g>`;
    let t = `${shadowE(14, 3.5)}${leg(-7, 0)}${leg(6, 1)}`;
    t += `<path d="M-12,-17 Q-17,-12 -15,-4" stroke="#3a2a1a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    t += `<ellipse cx="0" cy="-15" rx="12" ry="5.6" fill="${c}"/><path d="M8,-17 L13,-27 L17,-25 L12,-14Z" fill="${c}"/><ellipse cx="17" cy="-26" rx="5" ry="2.8" fill="${c}" transform="rotate(25 17 -26)"/>`;
    t += `<path d="M12,-27 Q9,-22 8,-17" stroke="#3a2a1a" stroke-width="2" fill="none"/><path d="M13.6,-29 l.8,-3 l1.4,2.6Z" fill="${c}"/><circle cx="16.4" cy="-26.6" r=".7" fill="#111"/>`;
    t += `${leg(-4, 2)}${leg(9, 3)}`;
    if (o.rider) {
      t += `<path d="M-6,-20 h10 l-1,4 h-8Z" fill="#5a3d26"/><rect x="-5" y="-20.5" width="8" height="2" fill="#c0392b"/>`; // arreio e pelego
      t += `<g transform="translate(-2,-18) scale(${PS})">${seated({ shirt: o.rider, long: o.prenda })}</g>`;
      if (o.flag) t += `<path d="M2,-27 V-62" stroke="#cfd4da" stroke-width="1.4"/><g transform="translate(2.6,-61) scale(.72)"><g class="flag" style="${neg(1.4)}">${RS_FLAG}</g></g>`;
    }
    return t;
  }
  // galpão crioulo do piquete
  function galpao(x, y, w, d, h) {
    let t = box(x, y, w, d, h, '#8a6038', 0, { right: '#74512f' });
    t += `<g transform="${fl(x, y + d, h)}">${Array.from({ length: Math.floor(w / 4) }, (_, i) => `<path d="M${i * 4 + 2},0 V${h}" stroke="#6b4a2b" stroke-width=".6"/>`).join('')}
      <rect x="${f(w / 2 - 9)}" y="${f(h - 14)}" width="18" height="14" fill="#2b1d14"/><rect x="${f(w / 2 - 9)}" y="${f(h - 14)}" width="18" height="2" fill="#5a3d26"/>
      <rect x="${f(w / 2 - 14)}" y="2" width="28" height="7" rx="1" fill="#f3e3c4" stroke="#5a3d26" stroke-width=".6"/>
      <text x="${f(w / 2)}" y="7.4" text-anchor="middle" font-family="Cinzel,serif" font-weight="700" font-size="4.6" fill="#5a3d26">PIQUETE</text></g>`;
    t += `<g transform="${fr(x + w, y + d, h)}">${Array.from({ length: Math.floor(d / 4) }, (_, i) => `<path d="M${i * 4 + 2},0 V${h}" stroke="#5a3d26" stroke-width=".6"/>`).join('')}</g>`;
    return t + gable(x, y, w, d, h, 14, '#6b5a3a', 'x', '#8a6038', 4);
  }
  function fogoDeChaoS() {
    // fogo de chão com costela nos espetos e a roda de chimarrão
    const roda = [[-26, -4, 1], [26, -4, -1], [-18, 8, 1], [18, 8, -1], [-8, -12, 1], [10, -12, -1]];
    const sit = ([x, y, k], i) => `<g transform="translate(${x},${y}) scale(${k * PS},${PS})"><rect x="-6" y="-4" width="12" height="4" rx="1.5" fill="#7a5232"/>${seated({ cuia: i % 2 === 0, long: i === 3 })}</g>`;
    const espeto = (x, k) => `<path d="M${x},2 L${x + k * 11},-24" stroke="#9aa0a6" stroke-width="1.1"/><path d="M${x + k * 5},-11 l${k * 4},-9 l${k * 3},1.5 l${-k * 4},9Z" fill="#a0442a"/><path d="M${x + k * 5.6},-12.5 l${k * 3},-6.6" stroke="#f0d9b5" stroke-width=".7"/>`;
    return roda.filter(r => r[1] < 0).map(sit).join('') + `<g opacity=".15"><ellipse rx="40" ry="16" fill="#ffb347" class="twinkle"/></g>
      <ellipse rx="13" ry="5" fill="#5a4a3a"/><path d="M-9,1 L9,-2 M-8,-2 L8,1" stroke="#6b4a2b" stroke-width="2.4"/>
      <g class="flame" style="transform-origin:0px 0px"><path d="M0,-15 Q7,-5 0,0 Q-7,-5 0,-15Z" fill="#ff8a1e"/><path d="M0,-9 Q3.5,-3 0,0 Q-3.5,-3 0,-9Z" fill="#ffe066"/></g>
      ${espeto(-12, 1)}${espeto(12, -1)}${espeto(-4, .4)}
      <g transform="translate(0,-16)"><circle class="smoke" r="3.6" fill="#ddd" style="--sx:14px;--sy:-44px;--ss:2"/><circle class="smoke" r="3.6" fill="#ddd" style="animation-delay:2.5s;--sx:8px;--sy:-44px;--ss:2"/></g>`
      + roda.filter(r => r[1] >= 0).map(sit).join('');
  }
  if (FARRAPOS) alt(() => {
    // bandeira do RS junto de cada estabelecimento da associação
    for (const [x, y, spot, z] of ESTAB) sprite(x, y, flagPoleS(), 4, spot, z || 0);
    // bandeirolas na praça, presas nos postes de luz
    const pA = P(689, 689, 32), pB = P(689, 801, 32), pC = P(801, 801, 32), pD = P(760, 689, 26);
    add(688, 689, 690, 801, bandeirolas(pA, pB), 'praca');
    add(689, 800, 801, 802, bandeirolas(pB, pC), 'praca');
    add(689, 688, 760, 690, bandeirolas(pA, pD, 6), 'praca');
    // piquete: galpão crioulo, fogo de chão, palanque com cavalo e bandeira (sai do lugar o que estiver no campo)
    const [gx, gy] = [590, 378];
    for (let i = statics.length - 1; i >= 0; i--) { const o = statics[i]; if (!o.spot && o.x1 > gx - 34 && o.x0 < gx + 96 && o.y1 > gy - 22 && o.y0 < gy + 82) statics.splice(i, 1); }
    G += `<path d="${blob(gx + 30, gy + 30, 70, 54, 16, .08)}" fill="#c9b07a" opacity=".55"/>`;
    add(gx, gy, gx + 56, gy + 30, galpao(gx, gy, 56, 30, 18), null);
    sprite(gx + 8, gy + 62, fogoDeChaoS(), 18);
    sprite(gx + 72, gy + 40, `<path d="M-10,0 V-14 M10,0 V-14 M-12,-12 H12" stroke="#6b4a2b" stroke-width="2"/>`, 4);
    sprite(gx + 70, gy + 52, horseS({ walk: false, c: '#6b4a32' }), 8);
    sprite(gx - 14, gy + 44, flagPoleS(64), 4);
    // cavalgada pelas ruas da cidade, com bandeiras do RS
    const desfile = [[482, 838], [1008, 838], [1008, 652], [482, 652], [482, 838]];
    const cores = ['#f4f1ea', '#1d1d1d', '#7a3b2a', '#f4f1ea', '#2c3e50', '#c0392b', '#f4f1ea'];
    const pelos = ['#8a5a3a', '#3a2a1a', '#b07a4a', '#f2ede4', '#6b4a32', '#8a5a3a', '#2b2b2b'];
    cores.forEach((c, i) => mover({ kind: 'sprite', path: desfile, speed: 11, phase: .5 - i * .017, s: .9, r: 9, inner: horseS({ rider: c, prenda: i === 3, flag: i === 0 || i === 4, c: pelos[i] }) }));
  });

  // --- Primavera ----------------------------------------------------
  const BED = ['#ff2d87', '#ffd23f', '#ffffff', '#ff3b30', '#b86bf0', '#ff9f1a', '#ff8ad8'];
  function bed(x0, y0, x1, y1) {
    let t = quad(x0, y0, x1, y1, '#7a5a3a');
    for (let i = 0; i < 6; i++) { const q = P(rr(x0 + 1, x1 - 1), rr(y0 + 1, y1 - 1)); t += `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="2.2" fill="#4f8a35"/>`; }
    for (let i = 0; i < 13; i++) { const q = P(rr(x0 + 1, x1 - 1), rr(y0 + 1, y1 - 1)); t += bloom(q[0], q[1] - .8, rr(1.5, 2.3), pick(BED)); }
    return t;
  }
  const bushS = (c, s = 1) => `<g transform="scale(${s})">${shadowE(10, 3.4)}<circle cx="-5" cy="-5.5" r="5.8" fill="#4f8a35"/><circle cx="5" cy="-5.5" r="6.2" fill="#5e9a3c"/><circle cx="0" cy="-10.5" r="6" fill="#6aa846"/>`
    + Array.from({ length: 15 }, () => bloom(rr(-9.5, 9.5), rr(-15.5, -2.5), rr(1.6, 2.5), rnd() < .85 ? c : '#ffffff')).join('') + '</g>';
  // touceira de flores de jardim: hastes com flores grandes
  function flowersS(c) {
    let t = `${shadowE(9, 3)}<ellipse cx="0" cy="-1" rx="9.5" ry="3.6" fill="#4f8a35"/><path d="M-8,-1 q2,-6 4,-2 M3,-1 q3,-6 5,-1" stroke="#5e9a3c" stroke-width="2" fill="none"/>`;
    for (let i = 0; i < 8; i++) {
      const x = rr(-8, 8), h = rr(5, 12);
      t += `<path d="M${f(x)},-1 V${f(-h)}" stroke="#3f7a2c" stroke-width=".9"/>${bloom(x, -h, rr(2, 2.9), rnd() < .7 ? c : pick(BED))}`;
    }
    return t;
  }
  if (PRIMAVERA) alt(() => {
    // propriedades da associação: um ipê florido, arbustos floridos e touceiras de flores em volta
    for (const [x, y, spot, z] of ESTAB) scatter(x, y, z ? 24 : 40, 1, (px, py) => sprite(px, py, treeS(.85, '#5e9a3c', { ipe: true }), 8, spot, z || 0));
    aroundEstab(7, (x, y, spot, z, k) => sprite(x, y, k % 2 ? bushS(pick(BED), 1.15) : flowersS(pick(BED)), 6, spot, z));
    // canteiros nas calçadas das quadras (no chão: prédios e casas ficam por cima)
    for (const [a, b] of BL) for (const [c, d] of BL) {
      for (let u = a + 10; u < b - 22; u += 30) G += bed(u, c + 1, u + 16, c + 5) + bed(u, d - 5, u + 16, d - 1);
      for (let v = c + 10; v < d - 22; v += 30) G += bed(a + 1, v, a + 5, v + 16) + bed(b - 5, v, b - 1, v + 16);
    }
    // arbustos floridos nas esquinas das quadras e em volta da cidade
    const spots = [];
    for (const [a, b] of BL) for (const [c, d] of BL) spots.push([a + 4, c + 4], [b - 4, c + 4], [a + 4, d - 4], [b - 4, d - 4]);
    for (let t = CITY.x0 + 20; t < CITY.x1 - 10; t += 36) spots.push([t, CITY.y1 + 24], [CITY.x1 + 24, t], [t, CITY.y0 - 24], [CITY.x0 - 24, t]);
    for (const [x, y] of spots) if (freeSpot(x, y, 6) && !nearRoad(x, y, 4)) sprite(x, y, bushS(pick(BED)), 5);
  });

  G += RDL.dirt + RDL.edge + RDL.surf + RDL.line;

  // ==================================================================
  // VEÍCULOS — rodovias (com mão e contramão), ruas e estradas de chão
  // ==================================================================
  const lane = (pts, d) => pts.map(([x, y]) => [x + d, y - d]);
  const C_SN = [[1500, 1500], [1000, 1000], [830, 1000], [830, 660], [660, 660], [660, 490], [490, 490], [40, 40]];
  const C_NW = [[1500, 1500], [1000, 1000], [830, 1000], [830, 660], [490, 660], [180, 660], [-440, 965]];
  mover({ kind: 'veh', path: lane(C_SN, 8), speed: 58, v: BUS, phase: .05, r: 24 });
  mover({ kind: 'veh', path: lane([...C_SN].reverse(), -8), speed: 58, v: PICKUP, phase: .45, r: 20 });
  mover({ kind: 'veh', path: lane(C_NW, 8), speed: 52, v: CAR('#2e86de'), phase: .62, r: 16 });
  mover({ kind: 'veh', path: lane([...C_NW].reverse(), -8), speed: 52, v: CAR('#16a085'), phase: .2, r: 16 });
  mover({ kind: 'veh', path: lane(C_SN, 8), speed: 58, v: CAR('#e74c3c'), phase: .55, r: 16 });
  mover({ kind: 'veh', path: [[1060, 1030], [1060, 160]], mode: 'ping', speed: 20, v: CAR('#f1f1f1'), r: 16 });
  mover({ kind: 'veh', path: [[1268, 1228], [1530, 888]], mode: 'ping', speed: 18, v: PICKUP, r: 20 });
  mover({ kind: 'veh', path: [[500, 822], [990, 822]], mode: 'ping', speed: 26, v: CAR('#f39c12'), r: 16 });

  // ==================================================================
  // FUNDO: céu, sol (nascendo a leste) e tapete de nuvens no horizonte
  // ==================================================================
  let BG = `<rect width="${W}" height="${H}" fill="url(#skyG)"/>`;
  BG += `<circle cx="2560" cy="236" r="260" fill="url(#sunHalo)" class="sun-glow"/>`;
  BG += `<g transform="translate(2560,236)"><g class="sun-rays">${Array.from({ length: 16 }, (_, i) => `<path d="M0,-58 L5,-84 L-5,-84Z" fill="#ffd36b" opacity=".7" transform="rotate(${i * 22.5})"/>`).join('')}</g></g>`;
  BG += `<circle cx="2560" cy="236" r="44" fill="#ffc94d"/><circle cx="2560" cy="236" r="36" fill="#ffdc73"/>`;
  BG += cloud(70, 1, 170) + cloud(140, .75, 140) + cloud(50, .65, 200) + cloud(180, 1.1, 230, .85) + cloud(110, .85, 185);
  BG += `<path d="M0,300 L0,250 C120,225 220,240 330,222 C460,200 560,236 700,230 C840,224 930,190 1060,205 C1180,218 1300,240 1420,236 C1600,232 1800,250 2100,240 C2300,232 2500,246 2760,236 L2760,330 L0,330Z" fill="#a9c2d6"/>`;
  BG += `<path d="M0,320 L0,275 C150,258 300,270 450,258 C600,246 760,272 900,262 C1050,252 1200,268 1400,262 C1700,256 2000,270 2400,262 C2550,258 2650,266 2760,262 L2760,340 L0,340Z" fill="#98b9a6"/>`;

  let CL = '';
  {
    let a = '', c = '';
    for (let x = -20; x < W + 40; x += 46) a += `<circle cx="${f(x + rr(-10, 10))}" cy="${f(rr(300, 322))}" r="${f(rr(24, 40))}"/>`;
    for (let x = -20; x < W + 40; x += 34) c += `<ellipse cx="${f(x + rr(-6, 6))}" cy="${f(rr(334, 346))}" rx="${f(rr(22, 34))}" ry="${f(rr(8, 13))}"/>`;
    CL += `<g fill="#ffffff" opacity=".96">${a}<rect x="-20" y="290" width="${W + 60}" height="42"/></g>`;
    CL += `<g fill="#ffffff" opacity=".8">${c}</g>`;
  }

  // ==================================================================
  // montagem
  // ==================================================================
  const sorted = (function topo(items) {
    const n = items.length, prev = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && behind(items[i], items[j])) prev[j].push(i);
    const out = [], st = new Uint8Array(n);
    const visit = i => { if (st[i]) return; st[i] = 1; for (const k of prev[i]) visit(k); out.push(items[i]); };
    [...Array(n).keys()].sort((a, b) => (items[a].x0 + items[a].y0) - (items[b].x0 + items[b].y0)).forEach(visit);
    return out;
  })(statics);

  defs += `<linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb4e4"/><stop offset=".14" stop-color="#b3dbf1"/><stop offset=".22" stop-color="#fde8c6"/><stop offset="1" stop-color="#fde8c6"/></linearGradient>
    <radialGradient id="sunHalo"><stop offset="0" stop-color="#ffd28a" stop-opacity=".95"/><stop offset=".35" stop-color="#ffd9a0" stop-opacity=".45"/><stop offset="1" stop-color="#ffe2b0" stop-opacity="0"/></radialGradient>
    <linearGradient id="mtG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7aa653"/><stop offset="1" stop-color="#4f7a36"/></linearGradient>
    <linearGradient id="lakeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd2ec"/><stop offset="1" stop-color="#4d9fc6"/></linearGradient>
    <linearGradient id="fallG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe8f8"/><stop offset="1" stop-color="#e9f8ff"/></linearGradient>
    <linearGradient id="glassWarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfdbe2"/><stop offset=".45" stop-color="#f3d9a6"/><stop offset="1" stop-color="#e9b86c"/></linearGradient>
    <linearGradient id="glassA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3c27e"/><stop offset=".45" stop-color="#c0914a"/><stop offset="1" stop-color="#8a5f34"/></linearGradient>
    <linearGradient id="glassB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b876"/><stop offset=".4" stop-color="#9a7448"/><stop offset="1" stop-color="#3e5674"/></linearGradient>`;

  const ICONS = {
    salame: `<g transform="translate(-1,-31)"><g transform="rotate(-35)"><rect x="-10" y="-4.2" width="17" height="8.4" rx="4.2" fill="#8e2f24"/>
      <path d="M-10,0 l-3,-2 M-10,0 l-3,2" stroke="#c9a46b" stroke-width="1.1" stroke-linecap="round"/><path d="M-5,-4 v8 M1,-4 v8" stroke="#d9c79c" stroke-width=".7"/>
      ${[[-7, -1.5], [-3, 1.6], [2, -1.8], [4.5, 1.6], [-1, -.2]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r=".85" fill="#f3d9c9"/>`).join('')}</g>
      <circle cx="6" cy="3.6" r="4.8" fill="#c8483a" stroke="#7a2219" stroke-width="1.1"/>${[[4.6, 2.4], [7.4, 3.6], [5.4, 5.6], [7, 1.6]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r=".85" fill="#f6dfd2"/>`).join('')}</g>`
  };
  let pinsSVG = '';
  for (const { id, p } of pins) {
    const d = DATA[id] || { title: id, emoji: '📍' }, w = d.title.length * 9.4 + 30;
    pinsSVG += `<g class="pin-g" data-spot="${id}" tabindex="0" role="button" aria-label="${d.title}" transform="translate(${f(p[0])},${f(p[1])})"><g class="pin" style="${neg(2.2)}">
      <g class="pin-label"><rect x="${f(-w / 2)}" y="-96" width="${f(w)}" height="32" rx="16" fill="#fff" stroke="#d7261e" stroke-width="2.5"/>
        <text y="-74" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="700" font-size="16" fill="#34452a">${d.title}</text></g>
      <g class="pin-head"><path d="M0,0 C-5,-9 -17,-17 -17,-31 A17,17 0 1 1 17,-31 C17,-17 5,-9 0,0Z" fill="#d7261e" stroke="#fff" stroke-width="3"/>
        <circle cy="-31" r="12" fill="#fff"/>${d.icon && ICONS[d.icon] ? ICONS[d.icon] : `<text y="-25.5" text-anchor="middle" font-size="15">${d.emoji}</text>`}</g></g></g>`;
  }

  svg.innerHTML = `<defs>${defs.replace(/<linearGradient id="mtG".*?<\/linearGradient>/, themeHill)}</defs>${BG}<g>${themeGround(G)}</g>${CL}<g id="objs">${sorted.map(o => `<g${o.spot ? ` data-spot="${o.spot}"` : ''}>${o.s}</g>`).join('')}</g><g id="mist" pointer-events="none">${MIST}</g><g id="fx"></g><g id="pins">${pinsSVG}</g>`;

  // ==================================================================
  // animação por JS
  // ==================================================================
  const objs = document.getElementById('objs');
  const fx = document.getElementById('fx');
  const SE = Array.from(objs.children);
  sorted.forEach((o, i) => (o.el = SE[i]));
  const wrap = document.getElementById('sceneWrap');
  const view = { x: 0, y: 0, w: W, h: H, z: 1 };
  let aspect = 1.6;

  for (const m of movers) {
    const g = document.createElementNS(NS, 'g');
    if (m.spot) g.setAttribute('data-spot', m.spot);
    if (m.kind === 'veh') {
      g.innerHTML = m.v.map(v => `<g display="none">${v}</g>`).join('');
      m.dirs = Array.from(g.children);
    } else g.innerHTML = m.inner;
    objs.appendChild(g);
    m.el = g;
  }

  function posAt(m, t) {
    let d, rev = false;
    if (m.mode === 'ping') {
      const u = (t * m.speed + m.phase * 2 * m.L) % (2 * m.L);
      if (u < m.L) d = u; else { d = 2 * m.L - u; rev = true; }
    } else d = (t * m.speed + m.phase * m.L) % m.L;
    let sg = m.segs[m.segs.length - 1];
    for (const s of m.segs) if (d < s.L0 + s.len) { sg = s; break; }
    const k = sg.len ? (d - sg.L0) / sg.len : 0;
    let dx = sg.b[0] - sg.a[0], dy = sg.b[1] - sg.a[1];
    if (rev) { dx = -dx; dy = -dy; }
    return [sg.a[0] + (sg.b[0] - sg.a[0]) * k, sg.a[1] + (sg.b[1] - sg.a[1]) * k, dx, dy];
  }

  // para cada movimentador, só os objetos perto do seu trajeto podem cobri-lo
  for (const m of movers) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of m.segs) for (const p of [s.a, s.b]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    x0 -= 170; y0 -= 170; x1 += 170; y1 += 170;
    m.near = [];
    sorted.forEach((o, i) => { if (o.x1 > x0 && o.x0 < x1 && o.y1 > y0 && o.y0 < y1) m.near.push(i); });
  }

  function place(t, all) {
    const vx0 = view.x - 140, vx1 = view.x + view.w + 140, vy0 = view.y - 90, vy1 = view.y + view.h + 180;
    for (const m of movers) {
      const [x, y, dx, dy] = posAt(m, t);
      const qx = CX + x - y, qy = CY + (x + y) / 2 - m.z;
      if (!all && (qx < vx0 || qx > vx1 || qy < vy0 || qy > vy1)) continue; // fora da tela: não gasta nada
      const gone = qy < 348; // além do horizonte: some atrás das nuvens
      if (gone !== m.gone) { m.gone = gone; m.el.setAttribute('display', gone ? 'none' : 'inline'); }
      if (m.kind === 'veh') {
        const dir = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
        if (dir !== m.dir) {
          if (m.dir !== null) m.dirs[m.dir].setAttribute('display', 'none');
          m.dirs[dir].setAttribute('display', 'inline');
          m.dir = dir;
        }
        m.el.setAttribute('transform', `translate(${f(x - y)},${f((x + y) / 2 - m.z)})`);
      } else {
        const p = P0(x, y, m.z), flip = (dx - dy) < 0;
        m.el.setAttribute('transform', `translate(${f(p[0])},${f(p[1])}) scale(${flip ? -m.s : m.s},${m.s})`);
      }
      // profundidade: depois do último objeto que fica atrás
      const me = { x0: x - m.r, x1: x + m.r, y0: y - m.r, y1: y + m.r };
      let slot = -1;
      for (const i of m.near) if (behind(sorted[i], me)) slot = i;
      if (slot !== m.slot) {
        m.slot = slot;
        objs.insertBefore(m.el, slot + 1 < SE.length ? SE[slot + 1] : null);
      }
    }
  }

  // efeitos soltos: pássaros, abelhas, carpas
  const birds = [];
  for (let i = 0; i < 7; i++) {
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = bird();
    fx.appendChild(g);
    birds.push({ g, y: i < 5 ? 120 + i * 14 : 520 + i * 30, sp: i < 5 ? -55 : 40, ph: i < 5 ? i * 22 : rr(0, 2600), s: i < 5 ? 1 : .8 });
  }
  const circlers = [];
  for (const fk of flocks) for (let i = 0; i < fk.n; i++) {
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = `<g class="wing" style="${neg(.35)}"><path d="M-6,0 Q-3,-4 0,0 Q3,-4 6,0" fill="none" stroke="${pick(['#5a4636', '#3b3b3b', '#7a5a3a'])}" stroke-width="1.8" stroke-linecap="round"/></g>`;
    fx.appendChild(g);
    circlers.push({ g, c: fk.c, rx: fk.rx * rr(.6, 1.1), ry: fk.ry * rr(.6, 1.2), sp: rr(.35, .6) * (i % 2 ? 1 : -1), ph: rr(0, 6.28), dz: rr(-20, 20) });
  }
  const bees = (INVERNO ? [] : beeCenters.slice(0, 16)).map(c => { // no inverno as abelhas ficam recolhidas nas colmeias
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = `<ellipse rx="2.6" ry="1.8" fill="#f7c81e"/><path d="M-.6,-1.8 V1.8 M1,-1.6 V1.6" stroke="#222" stroke-width=".7"/><g class="bee-wing"><ellipse cx="-.4" cy="-2.6" rx="1.8" ry="1.1" fill="#fff" opacity=".9"/></g>`;
    fx.appendChild(g);
    return { g, c, rx: rr(8, 22), ry: rr(5, 12), sp: rr(1.5, 3) * (rnd() < .5 ? -1 : 1), ph: rr(0, 6.28) };
  });

  const FISH = `<path d="M-14,0 Q-4,-7 8,-2 Q12,0 8,2 Q-4,7 -14,0Z" fill="#f08a24"/><path d="M-13,0 L-21,-6 L-19,0 L-21,6Z" fill="#e0701a"/><path d="M-4,-4 Q0,-1 -3,3" fill="#fff" opacity=".75"/><circle cx="5" cy="-1" r="1.2" fill="#222"/>`;
  function splash(x, y) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${f(x)},${f(y)})`);
    g.innerHTML = `<ellipse rx="10" ry="3.5" fill="none" stroke="#fff" stroke-width="1.6"/>` + [-1, 0, 1].map(k => `<circle r="1.6" fill="#e6f7ff" data-k="${k}"/>`).join('');
    fx.appendChild(g);
    g.firstChild.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.8)', opacity: 0 }], { duration: 900, easing: 'ease-out' });
    g.querySelectorAll('circle').forEach(c => {
      const k = +c.dataset.k;
      c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${k * 6}px,-9px)`, offset: .5 }, { transform: `translate(${k * 10}px,2px)`, opacity: 0 }], { duration: 600 });
    });
    setTimeout(() => g.remove(), 950);
  }
  function jumpFish() {
    const lk = pick(lakes), a = rr(0, 6.28), r = Math.sqrt(rnd());
    const [x0, y0] = P0(lk.cx + Math.cos(a) * lk.rx * r, lk.cy + Math.sin(a) * lk.ry * r);
    const dir = rnd() < .5 ? 1 : -1, dx = rr(16, 26) * dir, h = rr(22, 34), dur = rr(850, 1150);
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = FISH;
    fx.appendChild(g);
    splash(x0, y0);
    const start = performance.now();
    (function step(now) {
      const p = (now - start) / dur;
      if (p >= 1) { g.remove(); splash(x0 + dx, y0); return; }
      const ang = Math.atan2(-h * 4 * (1 - 2 * p), Math.abs(dx)) * 180 / Math.PI;
      g.setAttribute('transform', `translate(${f(x0 + dx * p)},${f(y0 - h * 4 * p * (1 - p))}) scale(${dir * .6},.6) rotate(${f(ang)})`);
      requestAnimationFrame(step);
    })(start);
  }

  // Natal: Papai Noel e as renas sobrevoam a cidade de tempos em tempos
  const reindeer = (x, lead) => `<g transform="translate(${x},-12)">
    <g class="deer-leg" style="transform-origin:-5px 2px"><path d="M-5,2 L-7,9" stroke="#6b4a2b" stroke-width="1.6" stroke-linecap="round"/></g>
    <g class="deer-leg" style="transform-origin:5px 2px;animation-direction:alternate-reverse"><path d="M5,2 L7,9" stroke="#6b4a2b" stroke-width="1.6" stroke-linecap="round"/></g>
    <ellipse rx="9" ry="4.2" fill="#8a5a3a"/><path d="M6,-2 L10,-8" stroke="#8a5a3a" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="12" cy="-9" rx="3.6" ry="2.6" fill="#8a5a3a"/>
    <path d="M10,-11 L8,-16 M8.6,-14 L6.4,-15 M12,-11 L13,-16 M12.8,-14 L15,-15" stroke="#5a3d26" stroke-width=".9"/>
    ${lead ? '<g opacity=".3"><circle cx="15.6" cy="-8.6" r="3.4" fill="#ff4d4d" class="twinkle"/></g>' : ''}<circle cx="15.4" cy="-8.6" r="${lead ? 1.6 : 1}" fill="${lead ? '#e3241b' : '#3a2a1a'}"/>
    <circle cx="12.5" cy="-9.8" r=".6" fill="#111"/><path d="M-9,-1 l-3,-1.5" stroke="#f4f1ea" stroke-width="1.6" stroke-linecap="round"/></g>`;
  const SANTA = `<g class="santa-bob">
    ${[0, 1, 2, 3, 4].map(i => `<circle class="twinkle" cx="${-38 - i * 14}" cy="${2 + (i % 2) * 5}" r="${f(1.9 - i * .25)}" fill="#ffe27a" style="animation-delay:-${(i * .3).toFixed(1)}s"/>`).join('')}
    <path d="M-32,6 H8 Q14,6 14,0" stroke="#c9a400" stroke-width="2" fill="none"/><path d="M-26,2 V6 M2,2 V6" stroke="#c9a400" stroke-width="1.4"/>
    <path d="M-28,-22 Q-31,-30 -23,-31 Q-17,-29 -19,-21Z" fill="#8a5a2b"/><rect x="-26" y="-25" width="5" height="4" fill="#3d7dd9"/><rect x="-22" y="-27" width="4" height="5" fill="#2ecc71"/>
    <rect x="-14" y="-22" width="10" height="13" rx="3" fill="#d7261e"/><circle cx="-8" cy="-26" r="4" fill="#f1c7a0"/>
    <path d="M-12,-25 Q-8,-16 -4,-25 Q-8,-22 -12,-25Z" fill="#fff"/><path d="M-12.5,-27 L-8,-34 L-3.5,-27Z" fill="#d7261e"/><circle cx="-8" cy="-34" r="1.4" fill="#fff"/><rect x="-13" y="-28" width="10" height="2" rx="1" fill="#fff"/>
    <path d="M-30,-10 H4 L8,2 H-26 Q-32,2 -30,-10Z" fill="#c0392b"/><path d="M-30,-10 H4" stroke="#f1c40f" stroke-width="1.4"/>
    <path d="M-6,-17 L5,-13" stroke="#d7261e" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M5,-13 Q20,-20 36,-20 M5,-13 Q36,-26 64,-20" stroke="#7a4a24" stroke-width=".7" fill="none"/>
    ${reindeer(28, false)}${reindeer(56, true)}</g>`;
  function flySanta() {
    // atravessa o mapa de um lado ao outro baixando sobre a cidade (no meio do caminho fica em cima dela)
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = `<ellipse cx="-4" cy="-10" rx="62" ry="26" fill="#fffbe6" fill-opacity=".35"/>${SANTA}`;
    fx.appendChild(g);
    const dir = rnd() < .5 ? 1 : -1, y0 = rr(580, 720), dip = rr(220, 320), dur = rr(17000, 21000), start = performance.now();
    (function step(now) {
      const p = (now - start) / dur;
      if (p >= 1) { g.remove(); return; }
      const x = dir > 0 ? -260 + (W + 520) * p : W + 260 - (W + 520) * p;
      g.setAttribute('transform', `translate(${f(x)},${f(y0 + Math.sin(p * Math.PI) * dip + Math.sin(p * Math.PI * 5) * 10)}) scale(${dir * 2.3},2.3)`);
      requestAnimationFrame(step);
    })(start);
  }

  // Final de ano: fogos de artifício subindo e estourando pelo mapa
  const FOGO = ['#ff4d4d', '#ffd23f', '#4dd36b', '#4db8ff', '#ff8ad8', '#ffffff', '#ffa94d', '#b48cff'];
  function firework() {
    const x = rr(160, W - 160), y = rr(160, H - 420), c1 = pick(FOGO), c2 = pick(FOGO), n = 28 + ((rnd() * 10) | 0), R = rr(85, 135);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${f(x)},${f(y)})`);
    g.innerHTML = `<path d="M0,0 V180" stroke="${c1}" stroke-width="4" stroke-linecap="round" opacity=".9"/><circle r="9" fill="#fff"/>`
      + Array.from({ length: n }, (_, i) => `<circle r="${f(rr(4, 6))}" fill="${i % 3 ? c1 : c2}" data-a="${f(i / n * 6.283 + rr(-.1, .1))}" data-r="${f(R * rr(.75, 1.1))}" opacity="0"/>`).join('');
    fx.appendChild(g);
    const [trail, flash, ...sparks] = g.children;
    // o rojão sobe (rastro encurtando) e estoura: clarão e faíscas que se abrem e caem
    trail.animate([{ transform: 'translateY(180px) scaleY(.2)', opacity: 0 }, { transform: 'translateY(30px) scaleY(.6)', opacity: 1, offset: .7 }, { transform: 'translateY(0) scaleY(0)', opacity: 0 }], { duration: 650, easing: 'ease-out', fill: 'forwards' });
    flash.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(0)', opacity: 0, offset: .45 }, { transform: 'scale(3)', opacity: .9, offset: .55 }, { transform: 'scale(5)', opacity: 0 }], { duration: 1200, fill: 'forwards' });
    for (const sp of sparks) {
      const a = +sp.dataset.a, r = +sp.dataset.r, dx = Math.cos(a) * r, dy = Math.sin(a) * r;
      sp.animate([{ transform: 'translate(0,0)', opacity: 0 }, { transform: 'translate(0,0)', opacity: 1, offset: .32 },
        { transform: `translate(${f(dx * .8)}px,${f(dy * .8)}px)`, opacity: 1, offset: .62 }, { transform: `translate(${f(dx)}px,${f(dy + 40)}px) scale(.4)`, opacity: 0 }],
        { duration: 2000, delay: 450, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
    }
    setTimeout(() => g.remove(), 2700);
  }

  function fxFrame(t) {
    for (const b of birds) {
      const span = W + 300, x = ((b.ph * 10 + t * Math.abs(b.sp)) % span);
      const sx = b.sp < 0 ? W + 150 - x : x - 150;
      b.g.setAttribute('transform', `translate(${f(sx)},${f(b.y + Math.sin(t * 1.3 + b.ph) * 8)}) scale(${b.s})`);
    }
    for (const b of circlers) {
      const a = t * b.sp + b.ph;
      b.g.setAttribute('transform', `translate(${f(b.c[0] + Math.cos(a) * b.rx)},${f(b.c[1] + b.dz + Math.sin(a) * b.ry + Math.sin(t * 2 + b.ph) * 4)})`);
    }
    for (const b of bees) {
      const a = t * b.sp + b.ph;
      b.g.setAttribute('transform', `translate(${f(b.c[0] + Math.cos(a) * b.rx + Math.sin(a * 3.1) * 2)},${f(b.c[1] + Math.sin(a) * b.ry + Math.cos(a * 2.3) * 2)}) scale(${Math.cos(a) * b.sp > 0 ? -1 : 1},1)`);
    }
  }

  let visibleNow = false;
  new IntersectionObserver(es => {
    visibleNow = es[0].isIntersecting;
    svg.classList.toggle('paused', !visibleNow);
  }, { rootMargin: '100px' }).observe(wrap);

  let simT = 30, last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, .1);
    last = now;
    if (visibleNow) { simT += dt; place(simT); fxFrame(simT); }
    requestAnimationFrame(frame);
  }
  place(simT, true); fxFrame(simT);
  if (!reduce) {
    requestAnimationFrame(frame);
    (function fishLoop() {
      if (visibleNow && document.visibilityState === 'visible') jumpFish();
      setTimeout(fishLoop, rr(1200, 2600));
    })();
    if (ANONOVO) (function fogos() {
      if (visibleNow && document.visibilityState === 'visible') { firework(); if (rnd() < .35) setTimeout(firework, rr(150, 450)); }
      setTimeout(fogos, rr(700, 1800));
    })();
    // pisca-pisca de Natal: alterna os dois grupos de lâmpadas a cada 0,6 s (só troca as tintas compartilhadas)
    if (NATAL) {
      const A = svg.querySelectorAll('.lz-a'), B = svg.querySelectorAll('.lz-b');
      let on = true;
      const blink = () => { A.forEach(s => s.setAttribute('stop-opacity', on ? 1 : .3)); B.forEach(s => s.setAttribute('stop-opacity', on ? .3 : 1)); };
      blink();
      setInterval(() => { if (visibleNow && document.visibilityState === 'visible') { on = !on; blink(); } }, 600);
    }
    // espera o mapa aparecer na tela para soltar o trenó; depois volta a cada meio minuto, mais ou menos
    if (NATAL) setTimeout(function santaLoop() {
      if (visibleNow && document.visibilityState === 'visible') { flySanta(); setTimeout(santaLoop, rr(24000, 32000)); }
      else setTimeout(santaLoop, 1500);
    }, 1500);
  }

  // ==================================================================
  // câmera: arrastar, zoom e foco em um atrativo
  // O SVG é desenhado uma vez no tamanho do zoom atual; arrastar só desloca
  // a camada (transform na GPU). Durante o zoom a camada é escalada e, quando
  // o gesto termina, é redesenhada nítida no novo tamanho.
  // ==================================================================
  function baseW() { return Math.min(W, H * aspect); }
  function clampView() {
    view.w = baseW() / view.z; view.h = view.w / aspect;
    view.x = Math.max(0, Math.min(W - view.w, view.x));
    view.y = Math.max(0, Math.min(H - view.h, view.y));
  }
  let k = 1, kc = 0, commitT = null, wrapW = 1;
  function apply(commit) {
    k = wrapW / view.w;
    if (commit || !kc) { kc = k; svg.style.width = (W * k).toFixed(1) + 'px'; svg.style.height = (H * k).toFixed(1) + 'px'; }
    const s = k / kc, scaled = Math.abs(s - 1) > 1e-4;
    svg.style.transform = `translate3d(${(-view.x * k).toFixed(2)}px,${(-view.y * k).toFixed(2)}px,0)${scaled ? ` scale(${s.toFixed(5)})` : ''}`;
    wrap.classList.toggle('zoomed', view.z > 1.01);
    if (scaled) { clearTimeout(commitT); commitT = setTimeout(() => apply(true), 220); }
  }
  let rafCam = 0;
  const requestApply = () => { if (!rafCam) rafCam = requestAnimationFrame(() => { rafCam = 0; clampView(); apply(); }); };
  function resize() {
    const r = wrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cx = view.x + view.w / 2, cy = view.y + view.h / 2, first = !resize.done;
    wrapW = r.width; aspect = r.width / r.height;
    clampView();
    if (first) { view.x = (W - view.w) / 2; view.y = H - view.h; resize.done = true; }
    else { view.x = cx - view.w / 2; view.y = cy - view.h / 2; }
    clampView(); apply(true);
  }
  window.addEventListener('resize', resize);
  resize();

  function zoomAt(k, sx, sy) { // sx,sy: ponto da cena que fica parado
    const nz = Math.max(1, Math.min(4.5, view.z * k));
    const fxp = (sx - view.x) / view.w, fyp = (sy - view.y) / view.h;
    view.z = nz; clampView();
    view.x = sx - fxp * view.w; view.y = sy - fyp * view.h;
    clampView(); apply();
  }
  function toScene(cx, cy) {
    const r = wrap.getBoundingClientRect();
    return [view.x + (cx - r.left) / k, view.y + (cy - r.top) / k];
  }
  let anim = null;
  function flyTo(tx, ty, tz) {
    const s = { x: view.x, y: view.y, z: view.z }, t0 = performance.now();
    cancelAnimationFrame(anim);
    (function step(now) {
      const k = Math.min(1, (now - t0) / 900), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      view.z = s.z + (tz - s.z) * e; clampView();
      const ex = tx - view.w / 2, ey = ty - view.h / 2;
      view.x = s.x + (ex - s.x) * e; view.y = s.y + (ey - s.y) * e;
      clampView(); apply();
      if (k < 1) anim = requestAnimationFrame(step);
    })(t0);
  }
  window.focusSpot = function (id) {
    const p = pins.find(q => q.id === id);
    if (!p) return;
    flyTo(p.p[0], p.p[1] + 40, 2.4);
    const el = svg.querySelector(`.pin-g[data-spot="${id}"]`);
    if (el) { el.classList.add('show-label'); setTimeout(() => el.classList.remove('show-label'), 3500); }
  };

  document.getElementById('zoomIn').addEventListener('click', () => zoomAt(1.5, view.x + view.w / 2, view.y + view.h / 2));
  document.getElementById('zoomOut').addEventListener('click', () => zoomAt(1 / 1.5, view.x + view.w / 2, view.y + view.h / 2));
  document.getElementById('zoomReset').addEventListener('click', () => flyTo(W / 2, H - baseW() / aspect / 2, 1));
  svg.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const [sx, sy] = toScene(e.clientX, e.clientY);
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, sx, sy);
  }, { passive: false });
  svg.addEventListener('dblclick', e => { const [sx, sy] = toScene(e.clientX, e.clientY); zoomAt(1.8, sx, sy); });

  const ptrs = new Map();
  let drag = null, moved = false, pinch = null;
  svg.addEventListener('pointerdown', e => {
    if (e.isPrimary) { ptrs.clear(); pinch = null; } // descarta toques "presos"
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; moved = false; }
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: view.z, c: toScene((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) };
      drag = null;
    }
  });
  svg.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt(pinch.z * d / pinch.d / view.z, pinch.c[0], pinch.c[1]);
      moved = true;
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) > 6) { moved = true; svg.setPointerCapture(e.pointerId); wrap.classList.add('dragging'); }
    if (moved) {
      view.x = drag.vx - dx / k; view.y = drag.vy - dy / k;
      requestApply();
    }
  });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { drag = null; wrap.classList.remove('dragging'); } };
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);

  // clique / teclado / destaque ao passar o mouse
  svg.addEventListener('click', e => {
    if (moved) { moved = false; return; }
    const s = e.target.closest('[data-spot]');
    if (s && window.openSpot) window.openSpot(s.dataset.spot);
  });
  svg.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('pin-g')) {
      e.preventDefault();
      window.openSpot && window.openSpot(e.target.dataset.spot);
    }
  });
  let hl = null;
  svg.addEventListener('mouseover', e => {
    const s = e.target.closest('[data-spot]'), id = s ? s.dataset.spot : null;
    if (id === hl) return;
    if (hl) svg.querySelectorAll(`[data-spot="${hl}"]`).forEach(n => n.classList.remove('hl'));
    hl = id;
    if (hl) svg.querySelectorAll(`[data-spot="${hl}"]`).forEach(n => n.classList.add('hl'));
  });
})();

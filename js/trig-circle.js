import {
  degToRad, normalizeDeg, symmetricAngles,
  formatDegrees, formatRadians, formatNumber, formatExact
} from './geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const R        = 108;
const LABEL_R  = R + 22;
const TAN_X    = R;
const TAN_CLIP = 125;

const COLORS = ['var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)'];

export function createTrigCircle(svg, { initialAngle = 30 } = {}) {
  svg.innerHTML = '';
  const callbacks = [];
  let angle    = normalizeDeg(initialAngle);
  let showSym  = true;
  let showProj = true;
  let showTan  = false;
  let locked   = false;

  // ── defs ───────────────────────────────────────────────────────────────
  const defs = el('defs');
  defs.innerHTML = `
    <filter id="tf" x="-25%" y="-35%" width="150%" height="170%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
      <feFlood flood-color="#060f1e" flood-opacity="0.97" result="fc"/>
      <feComposite in="fc" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="vp"><rect x="-150" y="-150" width="300" height="300"/></clipPath>`;
  svg.appendChild(defs);

  // ── static layer ────────────────────────────────────────────────────────
  const staticG = el('g');
  svg.appendChild(staticG);

  staticG.appendChild(line(-142, 0, 142, 0, 'axis'));
  staticG.appendChild(line(0, -142, 0, 142, 'axis'));
  staticG.appendChild(poly('142,0 136,-3 136,3',    { class:'axis', fill:'var(--axis)' }));
  staticG.appendChild(poly('0,-142 -3,-136 3,-136', { class:'axis', fill:'var(--axis)' }));
  staticG.appendChild(el('circle', { cx:0, cy:0, r:R, class:'circle' }));

  const CARDS = [
    { a:0,   sx:R,  sy:0,  anchor:'start',  dx:10,  dy:4,   rdy:11 },
    { a:90,  sx:0,  sy:-R, anchor:'middle', dx:0,   dy:-22, rdy:11 },
    { a:180, sx:-R, sy:0,  anchor:'end',    dx:-10, dy:4,   rdy:11 },
    { a:270, sx:0,  sy:R,  anchor:'middle', dx:0,   dy:22,  rdy:11 },
  ];
  for (const c of CARDS) {
    staticG.appendChild(el('circle', { cx:c.sx, cy:c.sy, r:3, class:'fixed-pt' }));
    const tx = c.sx + c.dx, ty = c.sy + c.dy;
    const t = txt(tx, ty, c.anchor, 'fixed-label');
    t.appendChild(tspan(tx, 0, `${c.a}°`));
    const r2 = tspan(tx, c.rdy, formatRadians(c.a));
    r2.style.fontSize = '9px'; r2.style.opacity = '.85';
    t.appendChild(r2);
    staticG.appendChild(t);
  }

  // ── dynamic layer ──────────────────────────────────────────────────────
  const dynG = el('g');
  svg.appendChild(dynG);

  const tanG  = el('g'); dynG.appendChild(tanG);
  const projG = el('g'); dynG.appendChild(projG);

  const radiusLine = el('line', { class:'radius-line', x1:0, y1:0 });
  dynG.appendChild(radiusLine);

  const symRect = el('polygon', { class:'rect-sym dashed' });
  symRect.style.stroke = 'var(--dash)';
  dynG.appendChild(symRect);

  // 4 symmetric point circles + labels
  const pts = Array.from({ length:4 }, (_, i) => {
    const isMain = i === 0;
    const c = el('circle', { class: isMain ? 'sym-pt main' : 'sym-pt', r: isMain ? 7 : 5 });
    c.style.fill = COLORS[i];
    dynG.appendChild(c);

    const lb = txt(0, 0, 'middle', 'sym-label');
    lb.style.fill = COLORS[i];
    lb.setAttribute('filter', 'url(#tf)');
    const t1 = tspan(0, 0, '');
    const t2 = tspan(0, 11, '');
    t2.style.fontSize = '9px'; t2.style.opacity = '.85';
    lb.appendChild(t1); lb.appendChild(t2);
    dynG.appendChild(lb);

    return { circle:c, label:lb, t1, t2 };
  });

  // ── 4 axis mark groups (2 lines each: exact + decimal) ─────────────────
  // Order: [xPos, xNeg, yTop, yBot]
  const axMarks = Array.from({ length:4 }, () => {
    const g = el('g');
    // line 1: exact value (or decimal if no exact) — bold, colored
    const t1 = txt(0, 0, 'middle', 'axis-mark');
    t1.setAttribute('filter', 'url(#tf)');
    t1.style.fill = 'var(--p1)';
    // line 2: decimal below exact (dimmer, smaller) — only when exact differs
    const t2 = txt(0, 0, 'middle', 'axis-mark-dec');
    t2.setAttribute('filter', 'url(#tf)');
    t2.style.fill = 'var(--p1)';
    g.appendChild(t1);
    g.appendChild(t2);
    dynG.appendChild(g);
    return { g, t1, t2 };
  });

  // ── interaction ─────────────────────────────────────────────────────────
  let dragging = false;
  function svgPoint(ev) {
    const rc = svg.getBoundingClientRect();
    return {
      x: ((ev.clientX - rc.left) / rc.width)  * 300 - 150,
      y: ((ev.clientY - rc.top)  / rc.height) * 300 - 150,
    };
  }
  function angleFrom({ x, y }) { return normalizeDeg(Math.atan2(-y, x) * 180 / Math.PI); }

  svg.addEventListener('pointerdown', e => {
    if (locked) return;
    dragging = true; svg.setPointerCapture(e.pointerId);
    setAngle(angleFrom(svgPoint(e)));
  });
  svg.addEventListener('pointermove', e => { if (dragging && !locked) setAngle(angleFrom(svgPoint(e))); });
  const stop = e => { dragging = false; try { svg.releasePointerCapture(e.pointerId); } catch {} };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);

  svg.tabIndex = 0;
  svg.setAttribute('role', 'slider');
  svg.setAttribute('aria-valuemin', '0');
  svg.setAttribute('aria-valuemax', '360');
  svg.addEventListener('keydown', e => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp')   { setAngle(angle + step); e.preventDefault(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown') { setAngle(angle - step); e.preventDefault(); }
  });

  // ── render ──────────────────────────────────────────────────────────────
  function update() {
    const angles = symmetricAngles(angle);
    const C = angles.map(a => {
      const r = degToRad(a);
      const s = Math.sin(r), co = Math.cos(r);
      return { a, sx: R*co, sy: -R*s, sin:s, cos:co };
    });

    radiusLine.setAttribute('x2', C[0].sx);
    radiusLine.setAttribute('y2', C[0].sy);

    if (showSym) {
      symRect.setAttribute('points', C.map(c => `${c.sx},${c.sy}`).join(' '));
      symRect.style.display = '';
    } else symRect.style.display = 'none';

    // projections ──────────────────────────────────────────────────────────
    projG.innerHTML = '';
    if (showProj) {
      for (let i = 0; i < 4; i++) {
        if (!showSym && i !== 0) continue;
        const c = C[i];
        projG.appendChild(line(c.sx, c.sy, c.sx, 0, 'dashed proj', COLORS[i]));
        projG.appendChild(line(c.sx, c.sy, 0, c.sy, 'dashed proj', COLORS[i]));
        projG.appendChild(el('circle', { cx:c.sx, cy:0,    r:2.5, fill:COLORS[i] }));
        projG.appendChild(el('circle', { cx:0,    cy:c.sy, r:2.5, fill:COLORS[i] }));
      }

      // x-axis marks (cos): 2 unique — positive and negative
      if (Math.abs(C[0].cos) > 0.01) {
        setAxisMark(axMarks[0],  C[0].sx, 0, C[0].cos,  'middle', -8,  0);
        setAxisMark(axMarks[1], -C[0].sx, 0, -C[0].cos, 'middle', -8,  0);
      } else {
        axMarks[0].g.style.display = 'none';
        axMarks[1].g.style.display = 'none';
      }

      // y-axis marks (sin): 2 unique — top (positive sin) and bottom (negative sin)
      if (Math.abs(C[0].sin) > 0.01) {
        // C[0].sy = -R*sinθ  → sinθ>0 means sy<0 (top half)
        setAxisMark(axMarks[2], 0,  C[0].sy, C[0].sin,  'start', 0,  7);
        setAxisMark(axMarks[3], 0, -C[0].sy, -C[0].sin, 'start', 0,  7);
      } else {
        axMarks[2].g.style.display = 'none';
        axMarks[3].g.style.display = 'none';
      }
    } else {
      axMarks.forEach(m => m.g.style.display = 'none');
    }

    // point circles + labels ───────────────────────────────────────────────
    for (let i = 0; i < 4; i++) {
      const c = C[i];
      const vis = i === 0 || showSym;
      pts[i].circle.style.display = vis ? '' : 'none';
      pts[i].label.style.display  = vis ? '' : 'none';
      pts[i].circle.setAttribute('cx', c.sx);
      pts[i].circle.setAttribute('cy', c.sy);
      const lr = degToRad(c.a);
      const lx = LABEL_R * Math.cos(lr);
      const ly = -LABEL_R * Math.sin(lr);
      pts[i].label.setAttribute('x', lx); pts[i].t1.setAttribute('x', lx); pts[i].t2.setAttribute('x', lx);
      pts[i].label.setAttribute('y', ly);
      pts[i].t1.textContent = formatDegrees(c.a);
      pts[i].t2.textContent = formatRadians(c.a);
    }

    // tangent ──────────────────────────────────────────────────────────────
    tanG.innerHTML = '';
    if (showTan) {
      const r0   = degToRad(angle);
      const cosA = Math.cos(r0);
      const tanA = Math.tan(r0);
      const hideTan = Math.abs(cosA) < 0.04;

      const tanLine = line(TAN_X, -TAN_CLIP, TAN_X, TAN_CLIP, 'dashed tan-axis');
      tanLine.style.stroke = 'var(--tan-color)';
      tanLine.setAttribute('clip-path', 'url(#vp)');
      tanG.appendChild(tanLine);

      const tanLbl = txt(TAN_X + 5, TAN_CLIP - 2, 'start', 'tan-line-label');
      tanLbl.textContent = 'tg';
      tanG.appendChild(tanLbl);

      if (!hideTan) {
        // Use ACTUAL (unclipped) tangent y — SVG clips naturally at viewBox
        const tyTop = -R * tanA;
        const tyBot =  R * tanA;
        // Only show dot+label when point is inside the visible area
        const inView = y => Math.abs(y) <= TAN_CLIP;

        const tanPairs = [
          { ci:0, ty:tyTop }, { ci:3, ty:tyBot },
          ...(showSym ? [{ ci:1, ty:tyBot }, { ci:2, ty:tyTop }] : []),
        ];
        for (const { ci, ty } of tanPairs) {
          const c = C[ci];
          const tl = line(c.sx, c.sy, TAN_X, ty, 'dashed tan-proj');
          tl.style.stroke = COLORS[ci];
          // clip-path ensures the line doesn't visually exit the SVG area
          tl.setAttribute('clip-path', 'url(#vp)');
          tanG.appendChild(tl);
        }

        if (inView(tyTop)) {
          tanG.appendChild(el('circle', { cx:TAN_X, cy:tyTop, r:4, fill:'var(--tan-color)', stroke:'#060f1e', 'stroke-width':1 }));
          tanG.appendChild(makeTanLabel(TAN_X + 7, tyTop, tanA));
        }
        if (inView(tyBot) && Math.abs(tyTop - tyBot) > 8) {
          tanG.appendChild(el('circle', { cx:TAN_X, cy:tyBot, r:4, fill:'var(--p4)', stroke:'#060f1e', 'stroke-width':1 }));
          tanG.appendChild(makeTanLabel(TAN_X + 7, tyBot, -tanA));
        }
      }
    }

    svg.setAttribute('aria-valuenow', String(Math.round(angle)));
    callbacks.forEach(fn => fn(angle));
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  /**
   * Updates an axis mark group (exact value line + decimal line below).
   * numVal  — the actual numeric value (e.g. 0.866…)
   * anchor  — SVG text-anchor
   * dy      — vertical offset from (x, y)
   * dx      — horizontal offset from (x, y)
   */
  function setAxisMark({ g, t1, t2 }, x, y, numVal, anchor, dy, dx = 0) {
    g.style.display = '';
    const tx = x + dx;
    const ty = y + dy;
    const exact = formatExact(numVal);
    const dec   = formatNumber(numVal, 2);

    t1.setAttribute('x', tx); t1.setAttribute('y', ty);
    t1.setAttribute('text-anchor', anchor);
    t1.textContent = exact ?? dec;

    if (exact !== null && exact !== dec) {
      // show decimal as smaller, dimmer second line
      t2.style.display = '';
      t2.setAttribute('x', tx); t2.setAttribute('y', ty + 11);
      t2.setAttribute('text-anchor', anchor);
      t2.textContent = dec;
    } else {
      t2.style.display = 'none';
    }
  }

  /** Creates a two-line tangent value label (exact + decimal when applicable). */
  function makeTanLabel(x, y, val) {
    const exact = formatExact(val);
    const dec   = formatNumber(val, 2);
    const g = el('g');

    const t1 = txt(x, y + 4, 'start', 'tan-val');
    t1.setAttribute('filter', 'url(#tf)');
    t1.textContent = exact ?? dec;
    g.appendChild(t1);

    if (exact !== null && exact !== dec) {
      const t2 = txt(x, y + 15, 'start', 'tan-val-dec');
      t2.setAttribute('filter', 'url(#tf)');
      t2.textContent = dec;
      g.appendChild(t2);
    }
    return g;
  }

  function setAngle(a)    { if (locked) return; angle = normalizeDeg(a); update(); }
  function setShowSym(v)  { showSym  = !!v; update(); }
  function setShowProj(v) { showProj = !!v; update(); }
  function setShowTan(v)  { showTan  = !!v; update(); }
  function setLocked(v)   { locked = !!v; svg.style.cursor = locked ? 'default' : 'crosshair'; }
  function onAngleChange(fn) { callbacks.push(fn); fn(angle); }

  update();
  return { setAngle, setShowSym, setShowProj, setShowTan, setLocked, onAngleChange, getAngle: () => angle };
}

// ── SVG element helpers ────────────────────────────────────────────────────
function el(name, attrs = {}) {
  const n = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}
function line(x1, y1, x2, y2, cls, stroke) {
  const n = el('line', { x1, y1, x2, y2 });
  if (cls)    n.setAttribute('class', cls);
  if (stroke) n.style.stroke = stroke;
  return n;
}
function poly(points, attrs) { return el('polygon', { points, ...attrs }); }
function txt(x, y, anchor, cls) {
  const n = el('text', { x, y, 'text-anchor': anchor });
  if (cls) n.setAttribute('class', cls);
  return n;
}
function tspan(x, dy, content) {
  const n = el('tspan', { x, dy });
  n.textContent = content;
  return n;
}
function clip(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

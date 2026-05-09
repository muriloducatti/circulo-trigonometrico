import { createTrigCircle } from './trig-circle.js';
import { createGraph } from './graph.js';
import { formatDegrees, formatRadians, formatNumber, degToRad, tanSafe } from './geometry.js';
import './pwa.js';

const svg      = document.getElementById('trig');
const range    = document.getElementById('angle-range');
const numInput = document.getElementById('angle-num');
const tSym     = document.getElementById('t-sym');
const tProj    = document.getElementById('t-proj');
const tTan     = document.getElementById('t-tan');
const quick    = document.getElementById('quick');

const rDeg = document.getElementById('r-deg');
const rRad = document.getElementById('r-rad');
const rSin = document.getElementById('r-sin');
const rCos = document.getElementById('r-cos');
const rTan = document.getElementById('r-tan');

const tGSin    = document.getElementById('tg-sin');
const tGCos    = document.getElementById('tg-cos');
const tGTan    = document.getElementById('tg-tan');
const gSinCont = document.getElementById('g-sin');
const gCosCont = document.getElementById('g-cos');
const gTanCont = document.getElementById('g-tan');

const stored  = Number(localStorage.getItem('trig:angle'));
const initial = Number.isFinite(stored) ? stored : 30;

const tc = createTrigCircle(svg, { initialAngle: initial });

// ── graph instances ────────────────────────────────────────────────────
const graphs = { sin: null, cos: null, tg: null };

function syncGraph(type, enabled, container) {
  if (enabled && !graphs[type]) {
    // Make row visible BEFORE creating SVG so dimensions are available
    container.style.display = 'block';
    graphs[type] = createGraph(container, type);
    graphs[type].update(tc.getAngle());
  } else if (!enabled && graphs[type]) {
    graphs[type].destroy();
    graphs[type] = null;
    container.style.display = 'none';
  }
}

// ── angle change ───────────────────────────────────────────────────────
tc.onAngleChange(a => {
  const r = degToRad(a);
  rDeg.textContent = formatDegrees(a);
  rRad.textContent = formatRadians(a);
  rSin.textContent = formatNumber(Math.sin(r), 3);
  rCos.textContent = formatNumber(Math.cos(r), 3);
  const t = tanSafe(r);
  rTan.textContent = isFinite(t) ? formatNumber(t, 3) : '∞';

  if (document.activeElement !== range)    range.value    = String(Math.round(a));
  if (document.activeElement !== numInput) numInput.value = String(Math.round(a));

  if (graphs.sin) graphs.sin.update(a);
  if (graphs.cos) graphs.cos.update(a);
  if (graphs.tg)  graphs.tg.update(a);

  localStorage.setItem('trig:angle', String(a));
});

// ── controls ────────────────────────────────────────────────────────────
range.addEventListener('input',  e => tc.setAngle(Number(e.target.value)));
numInput.addEventListener('input', e => {
  const v = Number(e.target.value);
  if (Number.isFinite(v)) tc.setAngle(v);
});
tSym.addEventListener('change',  e => tc.setShowSym(e.target.checked));
tProj.addEventListener('change', e => tc.setShowProj(e.target.checked));
tTan.addEventListener('change',  e => tc.setShowTan(e.target.checked));
quick.addEventListener('click', e => {
  const btn = e.target.closest('button[data-a]');
  if (btn) tc.setAngle(Number(btn.dataset.a));
});

// ── graph toggles ────────────────────────────────────────────────────────
tGSin.addEventListener('change', () => syncGraph('sin', tGSin.checked, gSinCont));
tGCos.addEventListener('change', () => syncGraph('cos', tGCos.checked, gCosCont));
tGTan.addEventListener('change', () => syncGraph('tg',  tGTan.checked, gTanCont));

// ── lock button ───────────────────────────────────────────────────────────
const btnLock = document.getElementById('btn-lock');
let locked = false;
btnLock.addEventListener('click', e => {
  e.stopPropagation();
  locked = !locked;
  tc.setLocked(locked);
  btnLock.classList.toggle('locked', locked);
  btnLock.setAttribute('aria-pressed', String(locked));
  btnLock.innerHTML = locked ? '🔒 trava' : '🔓 trava';
});

// reset slider thumb visually when locked (tc.setAngle is a no-op when locked)
range.addEventListener('input', e => { if (locked) e.target.value = String(Math.round(tc.getAngle())); });

// ── init ─────────────────────────────────────────────────────────────────
range.value    = String(Math.round(initial));
numInput.value = String(Math.round(initial));

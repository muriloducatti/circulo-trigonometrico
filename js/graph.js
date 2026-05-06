import { degToRad, formatRadians } from './geometry.js';

// ── Configuration per graph type ──────────────────────────────────────
const CONFIGS = {
  sin: { label: 'sen θ', color: '#a78bfa', yMin: -1.2, yMax: 1.2, ticks: [-1, 0, 1] },
  cos: { label: 'cos θ', color: '#34d399', yMin: -1.2, yMax: 1.2, ticks: [-1, 0, 1] },
  tg:  { label: 'tg θ',  color: '#f97316', yMin: -3.5, yMax: 3.5, ticks: [-3, -1, 0, 1, 3] },
};

// ── Visual constants ──────────────────────────────────────────────────
const BG    = '#08101f';
const AXIS  = '#2a3a5c';
const GRID  = '#15243d';
const MUTED = '#4a6285';

const W = 400;
const H = 120;
const PAD = { l: 36, r: 12, t: 8, b: 36 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

/**
 * Creates a canvas-based graph that draws sen/cos/tg from 0° to the
 * current angle. Returns { update(angleDeg), destroy() }.
 */
export function createGraph(container, type) {
  const cfg = CONFIGS[type];
  if (!cfg) throw new Error(`Unknown graph type: ${type}`);

  // Hi-DPI canvas for sharp rendering on phones
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.className = 'graph-canvas';
  // Inline aspect-ratio guarantees the height even before CSS loads
  canvas.style.aspectRatio = `${W} / ${H}`;

  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // ── Coordinate helpers ──
  const toX = deg => PAD.l + (deg / 360) * PW;
  const toY = v   => PAD.t + (1 - (v - cfg.yMin) / (cfg.yMax - cfg.yMin)) * PH;
  const clamp = v => Math.max(cfg.yMin, Math.min(cfg.yMax, v));

  const getVal = deg => {
    const r = degToRad(deg);
    if (type === 'sin') return Math.sin(r);
    if (type === 'cos') return Math.cos(r);
    return Math.tan(r);
  };

  /** Draws text with a dark stroke "shadow" for readability */
  function txt(text, x, y, color, size, weight = 'normal', align = 'left') {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = BG;
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function update(angleDeg) {
    const a = Math.max(0, Math.min(360, angleDeg));

    // ── Background ──
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // ── Vertical grid (cardinal angles) ──
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (const v of [0, 90, 180, 270, 360]) {
      const x = toX(v);
      ctx.beginPath();
      ctx.moveTo(x, PAD.t);
      ctx.lineTo(x, H - PAD.b);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── Zero horizontal line ──
    ctx.strokeStyle = AXIS;
    ctx.beginPath();
    ctx.moveTo(PAD.l,    toY(0));
    ctx.lineTo(W - PAD.r, toY(0));
    ctx.stroke();

    // ── Axes ──
    ctx.beginPath();
    ctx.moveTo(PAD.l, PAD.t);
    ctx.lineTo(PAD.l, H - PAD.b);
    ctx.lineTo(W - PAD.r, H - PAD.b);
    ctx.stroke();

    // ── Static x-axis tick labels ──
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.font = `9px ${FONT}`;
    for (const v of [0, 90, 180, 270, 360]) {
      ctx.fillText(`${v}°`, toX(v), H - PAD.b + 12);
    }

    // ── Static y-axis tick labels ──
    ctx.textAlign = 'right';
    ctx.font = `8.5px ${FONT}`;
    for (const v of cfg.ticks) {
      const y = toY(v);
      if (y < PAD.t || y > H - PAD.b) continue;
      ctx.fillText(v.toString(), PAD.l - 5, y + 3);
    }

    // ── Function name (top-left) ──
    txt(cfg.label, PAD.l + 4, PAD.t + 10, cfg.color, 10.5, '700', 'left');

    // ── The traced curve (from 0° to current angle) ──
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let pen = false;
    const steps = Math.round(a);
    for (let i = 0; i <= steps; i++) {
      const v = getVal(i);
      if (!isFinite(v) || Math.abs(v) > Math.abs(cfg.yMax) * 1.08) {
        pen = false;
        continue;
      }
      const x = toX(i);
      const y = toY(clamp(v));
      if (pen) ctx.lineTo(x, y);
      else     ctx.moveTo(x, y);
      pen = true;
    }
    ctx.stroke();

    // ── Cursor (vertical line at current angle) ──
    const cx = toX(a);
    ctx.strokeStyle = cfg.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, PAD.t);
    ctx.lineTo(cx, H - PAD.b);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ── Current point + dynamic labels ──
    const val = getVal(a);
    const valShown = isFinite(val) && Math.abs(val) <= Math.abs(cfg.yMax) * 1.05;

    if (valShown) {
      const cy = toY(clamp(val));

      // Dashed projection lines from the dot to both axes
      ctx.strokeStyle = cfg.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(PAD.l, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, H - PAD.b);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Y-axis dot
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.arc(PAD.l, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // X-axis dot
      ctx.beginPath();
      ctx.arc(cx, H - PAD.b, 3, 0, Math.PI * 2);
      ctx.fill();

      // Main dot on the curve
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = BG;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Floating value label near the curve dot
      const labelRight = cx < W - 55;
      const valStr = val.toFixed(2);
      txt(
        valStr,
        cx + (labelRight ? 7 : -7),
        cy > PAD.t + 12 ? cy - 6 : cy + 13,
        cfg.color, 10, '700',
        labelRight ? 'left' : 'right'
      );

      // Y-axis dynamic value
      txt(valStr, PAD.l - 6, cy + 3, cfg.color, 9, '700', 'right');

      // X-axis dynamic angle label (degrees + radians) — skip near static ticks
      const nearStatic = [0, 90, 180, 270, 360].some(t => Math.abs(a - t) < 10);
      if (!nearStatic) {
        const xAlign = cx > W - 40 ? 'right' : cx < PAD.l + 22 ? 'left' : 'center';
        txt(`${Math.round(a)}°`,    cx, H - PAD.b + 13, cfg.color, 9.5, '700', xAlign);
        txt(formatRadians(a),       cx, H - PAD.b + 23, cfg.color, 8.5, '500', xAlign);
      }
    }
  }

  function destroy() {
    if (canvas.parentNode === container) container.removeChild(canvas);
  }

  return { update, destroy };
}

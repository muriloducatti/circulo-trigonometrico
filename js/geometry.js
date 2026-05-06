export const TAU = Math.PI * 2;
export const degToRad = d => d * Math.PI / 180;
export const radToDeg = r => r * 180 / Math.PI;

export function normalizeDeg(d) {
  let x = d % 360;
  if (x < 0) x += 360;
  return x;
}

export function symmetricAngles(theta) {
  return [theta, 180 - theta, 180 + theta, 360 - theta].map(normalizeDeg);
}

function gcd(a, b) { return b ? gcd(b, a % b) : a; }

// Format radians as fraction of π for "nice" angles, else decimal.
export function formatRadians(deg) {
  const d = normalizeDeg(deg);
  if (d === 0) return '0';
  let p = Math.round(d);
  let q = 180;
  const g = gcd(p, q);
  p /= g; q /= g;
  if ([1, 2, 3, 4, 6, 8, 12].includes(q)) {
    const num = p === 1 ? '' : p;
    const den = q === 1 ? '' : `/${q}`;
    return `${num}π${den}`;
  }
  return `${(degToRad(d)).toFixed(2)}`;
}

export function formatDegrees(deg) {
  const d = normalizeDeg(deg);
  return Number.isInteger(d) ? `${d}°` : `${d.toFixed(1)}°`;
}

export function formatNumber(x, digits = 3) {
  if (!isFinite(x)) return '∞';
  if (Math.abs(x) < 1e-10) return '0';
  const r = Number(x.toFixed(digits));
  return r.toString();
}

export function tanSafe(rad) {
  const c = Math.cos(rad);
  if (Math.abs(c) < 1e-12) return Infinity;
  return Math.tan(rad);
}

// ── Exact values (radicais) ────────────────────────────────────────────
const S2 = Math.sqrt(2);
const S3 = Math.sqrt(3);
const TOL = 1e-9;

// Maps known trig values → exact string with roots
const EXACT_MAP = [
  [ 0,        '0'      ],
  [ 1,        '1'      ],
  [-1,        '-1'     ],
  [ 0.5,      '1/2'    ],
  [-0.5,      '-1/2'   ],
  [ S2 / 2,   '√2/2'   ],   // ≈  0.7071
  [-S2 / 2,   '-√2/2'  ],
  [ S3 / 2,   '√3/2'   ],   // ≈  0.8660
  [-S3 / 2,   '-√3/2'  ],
  [ S3 / 3,   '√3/3'   ],   // ≈  0.5774  (tg 30°)
  [-S3 / 3,   '-√3/3'  ],
  [ S3,       '√3'     ],   // ≈  1.7321  (tg 60°)
  [-S3,       '-√3'    ],
];

/**
 * Returns the exact symbolic string if the value matches a known trig value,
 * otherwise returns null.
 */
export function formatExact(val) {
  if (!isFinite(val)) return null;
  for (const [v, s] of EXACT_MAP) {
    if (Math.abs(val - v) < TOL) return s;
  }
  return null;
}

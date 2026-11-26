// Small shared helpers: vectors as [x, y, z] arrays, easing, seeded random.
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
// 0 before a, 1 after b, smooth S-curve in between
export const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// even smoother S-curve on 0..1 (used for camera moves)
export const smoother = (x: number) => { const t = clamp01(x); return t * t * t * (t * (6 * t - 15) + 10); };

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpV = (a: V3, b: V3, t: number): V3 => [lerpN(a[0], b[0], t), lerpN(a[1], b[1], t), lerpN(a[2], b[2], t)];
export const bez = (a: V3, c: V3, b: V3, t: number): V3 => lerpV(lerpV(a, c, t), lerpV(c, b, t), t);

// the same "random" numbers every render (so frames never flicker between renders)
export const rand = (k: number, seed = 0) => { const x = Math.sin(k * 91.37 + seed * 17.13) * 43758.5453; return x - Math.floor(x); };
export const shuffled = (n: number, seed: number) => {
  const o = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand(i, seed) * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return o;
};
export const easeOutBounce = (x: number) => {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};

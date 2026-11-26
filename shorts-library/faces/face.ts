// face.ts - drawn faces that MORPH between expressions (no picture swapping).
//
// Every expression is the same set of curves (eye top/bottom, brow, mouth top/bottom) with the same number of points,
// so going from one expression to another just slides every point to its new place (with a small overshoot, so the
// face moves "on purpose"), and the head does a short squash-and-bounce wobble.
//
// Coordinates: head-local, head radius = 1, +x right (viewer), +y DOWN. The character's face.json says where the
// eyes and mouth sit on his head picture (see FaceRig).

export const N = 25;                       // points per curve

export type Pt = [number, number];
// clip 1 = pupil stays inside the eye shape (wide eyes); clip 0 = free dot under a lid line (the normal relaxed eye)
export type Eye = { up: Pt[]; lo: Pt[]; fill: number; pupil: number; px: number; py: number; clip: number };
export type Brow = { pts: Pt[]; a: number };
// solid 1 = the mouth is a solid ink shape (the neutral dash), 0 = an open mouth (dark inside)
export type Mouth = { up: Pt[]; lo: Pt[]; teeth: number; grid: number; tongue: number; solid: number };
// look: -1 = looks to the viewer's left, 0 = straight forward, +1 = right (pupils slide, face leans a little)
export type FaceState = { eyeL: Eye; eyeR: Eye; browL: Brow; browR: Brow; mouth: Mouth; dx: number; dy: number; look: number };

// Where the parts sit on a character's head (head radius = 1). Saved per character as face.json.
export type FaceRig = {
  eyeX: number; eyeY: number; eyeW: number; eyeH: number;   // eye centre offset from head centre, eye half size
  browY: number;                                            // extra brow lift (negative = up); brows sit a fixed gap above each eye's top
  mouthX: number; mouthY: number; mouthW: number; mouthH: number;
  line: number;                                             // face line width (head radius units)
  ink: string; skin: string; mouthInk: string; tongue: string; teeth: string;
  brows: boolean;                                           // false = brows only appear when an expression needs them
};

export const DEFAULT_RIG: FaceRig = {
  eyeX: 0.31, eyeY: -0.04, eyeW: 0.145, eyeH: 0.145, browY: 0,
  mouthX: 0, mouthY: 0.38, mouthW: 0.34, mouthH: 0.26,
  line: 0.042,
  ink: "#2B1C1A", skin: "#FCF2EA", mouthInk: "#4A2226", tongue: "#E2767A", teeth: "#FFFDF8",
  brows: true,
};

// ---------- curve makers (eye: half width 1, half height 1) ----------
const xs = (i: number) => -1 + (2 * i) / (N - 1);
const curve = (f: (x: number) => number, sx = 1): Pt[] => Array.from({ length: N }, (_, i) => [xs(i) * sx, f(xs(i))] as Pt);
const ell = (x: number) => Math.sqrt(Math.max(0, 1 - x * x));

function eye(up: (x: number) => number, lo: (x: number) => number, o: Partial<Eye> = {}): Eye {
  return { up: curve(up), lo: curve(lo), fill: 1, pupil: 0, px: 0, py: 0, clip: 1, ...o };
}
// filled oval (normal open eye)
const oval = (h = 1, w = 0.62): Eye =>
  ({ up: curve((x) => -h * ell(x), w), lo: curve((x) => h * ell(x), w), fill: 1, pupil: 0, px: 0, py: 0, clip: 1 });
// the NORMAL eye (his reference): a soft arched lid line with a round dot right under it. The dot slides to look around.
const lidEye = (arch = 0.26, pupil = 0.5, w = 1.0): Eye => { const f = (x: number) => -arch * (1 - x * x) - 0.05; return { up: curve(f, w), lo: curve(f, w), fill: 0, pupil, px: 0, py: 0.3, clip: 0 }; };
// closed happy arc  ^
const arcUp = (h = 0.55, y = 0) => { const f = (x: number) => y - h * (1 - x * x) + h * 0.5; return eye(f, f, { fill: 0 }); };
// closed sad / tired arc (droops down)
const arcDown = (h = 0.4, y = 0) => { const f = (x: number) => y + h * (1 - x * x) - h * 0.5; return eye(f, f, { fill: 0 }); };
// squeezed  >  (LEFT eye, tip points to the nose; the right eye is mirrored to  < )
const chev = (h = 0.75) => eye((x) => -h * (1 - (x + 1) / 2), (x) => h * (1 - (x + 1) / 2), { fill: 0 });
// wide open white eye with a pupil
const wide = (h = 1.25, w = 1.0, pupil = 0.45, py = 0) =>
  ({ up: curve((x) => -h * ell(x), w), lo: curve((x) => h * ell(x), w), fill: 0, pupil, px: 0, py, clip: 1 });
// angry: oval with a slanted lid cut (lid low at the nose side)
const angryEye = (h = 0.95) => {
  const lid = (x: number) => -h * 0.15 + (x + 1) * 0.28;            // nose side (x=+1) lower
  return { up: curve((x) => Math.max(-h * ell(x * 1), Math.min(h * ell(x), lid(x))), 0.62), lo: curve((x) => h * ell(x), 0.62),
    fill: 1, pupil: 0, px: 0, py: 0, clip: 1 };
};
// sad: oval with a lid drooping at the outer side
const sadEye = (h = 0.85) => {
  const lid = (x: number) => -h * 0.1 - (x + 1) * 0.22 + 0.15;       // outer side (x=-1) lower
  return { up: curve((x) => Math.max(-h * ell(x), Math.min(h * ell(x), lid(-x) )), 0.6), lo: curve((x) => h * ell(x), 0.6),
    fill: 1, pupil: 0, px: 0, py: 0, clip: 1 };
};

// ---------- brows (LEFT brow, x from outer -1 to inner +1, around browY) ----------
const brow = (outer: number, mid: number, inner: number, a = 1, len = 1.2): Brow =>
  ({ pts: [[-len, outer], [0, mid], [len, inner]].map(([x, y]) => [x, y] as Pt) as Pt[], a });
// spread the 3 brow points to N points (quadratic) so brows morph like everything else
function browN(b: Brow): Brow {
  const [p0, p1, p2] = b.pts;
  const pts: Pt[] = Array.from({ length: N }, (_, i) => {
    const s = i / (N - 1), u = 1 - s;
    return [u * u * p0[0] + 2 * u * s * p1[0] + s * s * p2[0], u * u * p0[1] + 2 * u * s * p1[1] + s * s * p2[1]];
  });
  return { pts, a: b.a };
}

// ---------- mouth (half width 1) ----------
function mouth(up: (x: number) => number, lo: (x: number) => number, o: Partial<Mouth> = {}): Mouth {
  return { up: curve(up), lo: curve(lo), teeth: 0, grid: 0, tongue: 0, solid: 0, ...o };
}
// a closed mouth is a crescent: thick in the middle, pointed at both ends
const line = (f: (x: number) => number, w = 1, t = 0.11) => ({ ...mouth(f, f), up: curve((x) => f(x) - t * Math.pow(ell(x), 0.8), w), lo: curve((x) => f(x) + t * Math.pow(ell(x), 0.8), w), solid: 1 });

// ---------- the expressions ----------
type Def = { eyeL: Eye; eyeR?: Eye; browL: Brow; browR?: Brow; mouth: Mouth; dx?: number; dy?: number };
const mirrorEye = (e: Eye): Eye => ({ ...e, up: e.up.map(([x, y]) => [-x, y] as Pt), lo: e.lo.map(([x, y]) => [-x, y] as Pt), px: -e.px });
const mirrorBrow = (b: Brow): Brow => ({ ...b, pts: b.pts.map(([x, y]) => [-x, y] as Pt) });
// THE main brow (his reference): thick, gently arched, tapering to a thin outer tip, close above the eye. Expressions flex it.
const BASE = () => brow(0.1, -0.42, 0.1);
const hidden = (_y = 0) => BASE();

const DEFS: Record<string, Def> = {
  // neutral mouth (his reference): short thick dash, tapered at both ends, a slight arch
  neutral: { eyeL: lidEye(), browL: BASE(), mouth: { ...mouth((x) => 0, (x) => 0), up: curve((x) => -0.06 * (1 - x * x) - 0.095 * Math.pow(ell(x), 0.85), 0.34), lo: curve((x) => -0.06 * (1 - x * x) + 0.095 * Math.pow(ell(x), 0.85), 0.34), solid: 1 } },
  // ^ ^ eyes, soft smile (the shop guy)
  content: { eyeL: arcUp(0.55), browL: brow(-0.08, -0.55, -0.06), mouth: line((x) => 0.32 * (1 - x * x) - 0.12, 0.6), dy: -0.01 },
  // big happy: squished open eyes, open smile with tongue
  happy: { eyeL: oval(0.95, 0.66), browL: brow(-0.25, -0.7, -0.2),
    mouth: mouth((x) => 0.18 * (1 - x * x) - 0.22 - 0.1 * x * x, (x) => 0.95 * ell(x) * (1 - 0.2 * x * x) - 0.2, { tongue: 1, teeth: 0.35 }), dy: -0.02 },
  // satisfied: closed ^ eyes and a smug closed grin, chin up
  satisfied: { eyeL: arcDown(0.45, 0.1), browL: brow(0.12, -0.27, 0.18), mouth: line((x) => 0.26 * (1 - x * x) - 0.1 - 0.16 * x, 0.66), dy: -0.03 },
  // > < with gritted teeth grin (the hammer guy)
  strain: { eyeL: chev(0.85), browL: brow(-0.15, -0.25, 0.42),
    mouth: mouth((x) => 0.12 * (1 - x * x) - 0.3 * x * x - 0.02, (x) => 0.7 * ell(x) * (1 - 0.25 * x * x) - 0.3 * x * x, { teeth: 1, grid: 1 }) },
  angry: { eyeL: angryEye(0.95), browL: brow(-0.4, -0.37, 0.62),
    mouth: mouth((x) => -0.28 * (1 - x * x) + 0.12, (x) => -0.02 * (1 - x * x) + 0.36, { teeth: 1, grid: 1 }) },
  // stressed: wide eyes, small pupils, worried brows, wavy tight mouth
  stressed: { eyeL: wide(1.1, 0.9, 0.32), browL: brow(0.25, -0.55, -0.6),
    mouth: line((x) => 0.06 * Math.sin(x * Math.PI * 2.5) + 0.05, 0.72) },
  sad: { eyeL: sadEye(0.85), browL: brow(0.38, -0.25, -0.45),
    mouth: line((x) => 0.24 * (1 - x * x) * -1 + 0.24 + 0.05 - 0.24 * (1 - (1 - x * x)) * 0, 0.5), dy: 0.02 },
  scared: { eyeL: wide(1.35, 1.0, 0.22, 0.05), browL: brow(0.05, -0.8, -0.85),
    mouth: mouth((x) => -0.15 + 0.07 * Math.sin(x * Math.PI * 3), (x) => 0.3 * ell(x) + 0.07 * Math.sin(x * Math.PI * 3) , { teeth: 0.55, grid: 0.6 }), dy: 0.02 },
  surprised: { eyeL: wide(1.3, 1.0, 0.45), browL: brow(-0.7, -1.25, -0.75),
    mouth: { ...mouth((x) => -0.55 * ell(x), (x) => 0.55 * ell(x)), up: curve((x) => -0.55 * ell(x) + 0.1, 0.36), lo: curve((x) => 0.55 * ell(x) + 0.1, 0.36), tongue: 0.4 }, dy: -0.02 },
  // confused: one brow up, one down, eyes different, mouth slanted squiggle
  confused: { eyeL: lidEye(0.38, 0.44, 1.05), eyeR: mirrorEye(lidEye(0.12, 0.34, 0.85)), browL: brow(-0.6, -1.15, -0.55), browR: mirrorBrow(brow(0.12, -0.23, 0.28)),
    mouth: line((x) => 0.12 * x + 0.05 * Math.sin(x * Math.PI * 2), 0.5), dx: 0.03 },
};

export const EXPRESSION_NAMES = Object.keys(DEFS);

function build(name: string): FaceState {
  const d = DEFS[name] || DEFS.neutral;
  const eL = d.eyeL, eR = d.eyeR ?? mirrorEye(d.eyeL);
  // brow gap: same distance above every eye shape (lid, oval, wide, closed)
  const lift = (b: Brow, e: Eye): Brow => { const top = Math.min(...e.up.map((p) => p[1])); return { ...b, pts: b.pts.map(([x, y]) => [x, y + Math.min(top, -0.25) - 1.05] as Pt) }; };
  return {
    eyeL: eL, eyeR: eR,
    browL: browN(lift(d.browL, eL)), browR: browN(lift(d.browR ?? mirrorBrow(d.browL), eR)),
    mouth: d.mouth, dx: d.dx ?? 0, dy: d.dy ?? 0, look: 0,
  };
}
const CACHE: Record<string, FaceState> = {};
export const shapeOf = (name: string) => (CACHE[name] ??= build(name));

// ---------- morphing ----------
function lerpAny(a: any, b: any, s: number): any {
  if (typeof a === "number") return a + (b - a) * s;
  if (Array.isArray(a)) return a.map((v, i) => lerpAny(v, b[i], s));
  const o: any = {};
  for (const k in a) o[k] = lerpAny(a[k], b[k], s);
  return o;
}
// ease with a small overshoot: the parts move with intent and settle
const backOut = (s: number, k = 1.35) => { const u = s - 1; return 1 + (k + 1) * u * u * u + k * u * u; };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export type FaceKey = { t: number; e: string; look?: number };  // at time t switch to expression e (and eye direction look)
export type FaceOpts = { dur?: number; blinks?: number[]; talk?: (t: number) => number };

export const MORPH = 0.3;     // seconds for a change
const WOB_F = 4.2, WOB_K = 6.5, WOB_A = 0.055;

export type FaceFrame = { face: FaceState; sx: number; sy: number; rot: number };

/** Face at time t from a track (sorted by t). Returns the morphed face + head squash/rotation for the wobble. */
export function faceAt(track: FaceKey[], t: number, o: FaceOpts = {}): FaceFrame {
  const dur = o.dur ?? MORPH;
  let i = -1;
  for (let k = 0; k < track.length; k++) if (track[k].t <= t) i = k;
  const cur = i < 0 ? track[0]?.e ?? "neutral" : track[i].e;
  const prev = i <= 0 ? cur : track[i - 1].e;
  const t0 = i < 0 ? -1e9 : track[i].t;
  const tau = t - t0;
  const lookOf = (k: number) => (k < 0 ? 0 : track[k].look ?? 0);
  const A = { ...shapeOf(prev), look: lookOf(i - 1) }, B = { ...shapeOf(cur), look: lookOf(i) };
  let face: FaceState;
  if ((prev === cur && A.look === B.look) || tau >= dur + 0.08) face = B;
  else {
    // parts start a little apart: brows first, eyes, then the mouth (feels deliberate)
    const part = (delay: number) => { const s = clamp01((tau - delay) / dur); return backOut(s); };
    const sb = part(0), se = part(0.02), sm = part(0.06);
    face = {
      browL: lerpAny(A.browL, B.browL, sb), browR: lerpAny(A.browR, B.browR, sb),
      eyeL: lerpAny(A.eyeL, B.eyeL, se), eyeR: lerpAny(A.eyeR, B.eyeR, se),
      mouth: lerpAny(A.mouth, B.mouth, sm),
      dx: lerpAny(A.dx, B.dx, se), dy: lerpAny(A.dy, B.dy, se), look: lerpAny(A.look, B.look, se),
    };
  }
  // blink: squash the eyes shut for 0.13 s
  let blink = 0;
  for (const b of o.blinks ?? []) { const d = Math.abs(t - b) / 0.065; if (d < 1) blink = Math.max(blink, 1 - d); }
  if (blink > 0) {
    const sq = (e: Eye): Eye => ({ ...e, up: e.up.map(([x, y]) => [x, y * (1 - 0.92 * blink)] as Pt), lo: e.lo.map(([x, y]) => [x, y * (1 - 0.92 * blink)] as Pt) });
    face = { ...face, eyeL: sq(face.eyeL), eyeR: sq(face.eyeR) };
  }
  // talking: open the mouth a little (0..1 from the voice)
  const open = o.talk ? clamp01(o.talk(t)) : 0;
  if (open > 0) {
    const m = face.mouth;
    face = { ...face, mouth: { ...m, lo: m.lo.map(([x, y], k) => [x, y + 0.45 * open * ell(xs(k))] as Pt), up: m.up.map(([x, y], k) => [x, y - 0.08 * open * ell(xs(k))] as Pt) } };
  }
  // wobble: damped squash and stretch after every change
  let sx = 1, sy = 1, rot = 0;
  if (i > 0 && prev !== cur && tau >= 0) {
    const w = WOB_A * Math.exp(-WOB_K * tau) * Math.sin(2 * Math.PI * WOB_F * tau);
    sx = 1 + w; sy = 1 - w; rot = 0.5 * w * (track[i].e.length % 2 ? 1 : -1);
  }
  return { face, sx, sy, rot };
}

// ---------- drawing ----------
/** Draw the face parts (not the head) on a 2D canvas. Head centre (cx, cy), head radius R in pixels. */
export function drawFace(ctx: CanvasRenderingContext2D, f: FaceState, cx: number, cy: number, R: number, rig: FaceRig = DEFAULT_RIG) {
  const lw = rig.line * R;
  ctx.save();
  ctx.translate(cx + (f.dx + 0.04 * f.look) * R, cy + f.dy * R);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const path = (up: Pt[], lo: Pt[], ox: number, oy: number, sx: number, sy: number) => {
    ctx.beginPath();
    up.forEach(([x, y], k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, (ox + x * sx) * R, (oy + y * sy) * R));
    for (let k = lo.length - 1; k >= 0; k--) ctx.lineTo((ox + lo[k][0] * sx) * R, (oy + lo[k][1] * sy) * R);
  };
  const thick = (up: Pt[], lo: Pt[]) => up.reduce((m, p, k) => Math.max(m, Math.abs(lo[k][1] - p[1])), 0);

  // eyes
  for (const [e, side] of [[f.eyeL, -1], [f.eyeR, 1]] as [Eye, number][]) {
    const ox = side * rig.eyeX, oy = rig.eyeY, sx = rig.eyeW, sy = rig.eyeH;
    const open = thick(e.up, e.lo) * sy;
    path(e.up, e.lo, ox, oy, sx, sy);
    if (open * R > lw * 0.6) {
      // white of the eye (for wide eyes) blended into a solid ink eye by `fill`
      ctx.fillStyle = rig.skin; ctx.fill();
      if (e.fill > 0.01) { ctx.globalAlpha = Math.min(1, e.fill); ctx.fillStyle = rig.ink; ctx.fill(); ctx.globalAlpha = 1; }
    }
    if (e.pupil > 0.01 && e.fill < 0.99) {
      const lx = f.look * (e.clip >= 0.5 ? 0.42 : 0.62);
      ctx.save();
      if (e.clip >= 0.5 && open * R > lw * 0.6) { path(e.up, e.lo, ox, oy, sx, sy); ctx.clip(); }
      else if (e.clip < 0.5) {
        // lid eye: the dot hangs under the lid line (the lid cuts its top)
        ctx.beginPath();
        e.up.forEach(([x, y], k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, (ox + x * sx * 1.6) * R, (oy + y * sy) * R));
        ctx.lineTo((ox + sx * 1.6) * R, (oy + 3 * sy) * R); ctx.lineTo((ox - sx * 1.6) * R, (oy + 3 * sy) * R); ctx.closePath(); ctx.clip();
      }
      const pr = e.pupil * sx * R;
      ctx.beginPath(); ctx.ellipse((ox + (e.px + lx) * sx) * R, (oy + e.py * sy) * R, pr, pr * (1 + 0.3 * (1 - e.clip)), 0, 0, Math.PI * 2);
      ctx.fillStyle = rig.ink; ctx.fill(); ctx.restore();
    }
    // outline only when the eye is not solid (solid eyes are their own shape)
    ctx.strokeStyle = rig.ink; ctx.lineWidth = lw;
    path(e.up, e.lo, ox, oy, sx, sy);
    ctx.stroke();
  }

  // brows
  for (const [b, side] of [[f.browL, -1], [f.browR, 1]] as [Brow, number][]) {
    const a = clamp01(b.a);
    if (a < 0.02 || !rig.brows) continue;
    ctx.globalAlpha = a; ctx.fillStyle = rig.ink; ctx.strokeStyle = rig.ink;
    // a brush stroke: thin at the outer tip, thickest past the middle, rounded at the inner end
    const P = b.pts.map(([x, y]) => [(side * rig.eyeX + x * (0.35 + 0.65 * a) * rig.eyeW) * R, (rig.eyeY + rig.browY + y * rig.eyeH) * R]);
    const T = rig.line * 1.7 * R, top: number[][] = [], bot: number[][] = [];
    P.forEach((p, k) => {
      const q = P[Math.min(N - 1, k + 1)], o = P[Math.max(0, k - 1)];
      let nx = -(q[1] - o[1]), ny = q[0] - o[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const u = k / (N - 1), s = side < 0 ? u : 1 - u;          // s: 0 = outer tip, 1 = inner end
      const w = 0.5 * T * Math.pow(Math.sin(Math.PI * (0.02 + 0.96 * s)), 0.6);   // pointed at both ends, full in the middle
      top.push([p[0] + nx * w, p[1] + ny * w]); bot.push([p[0] - nx * w, p[1] - ny * w]);
    });
    ctx.beginPath(); top.forEach(([x, y], k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, x, y));
    for (let k = N - 1; k >= 0; k--) ctx.lineTo(bot[k][0], bot[k][1]);
    ctx.closePath(); ctx.fill(); ctx.lineWidth = lw * 0.25; ctx.stroke(); ctx.globalAlpha = 1;
  }

  // mouth
  const m = f.mouth, ox = rig.mouthX, oy = rig.mouthY, sx = rig.mouthW, sy = rig.mouthH;
  const open = thick(m.up, m.lo) * sy;
  if (open * R > lw * 0.5) {
    path(m.up, m.lo, ox, oy, sx, sy); ctx.closePath();
    ctx.fillStyle = rig.mouthInk; ctx.fill();
    if (m.solid > 0.01) { ctx.globalAlpha = clamp01(m.solid); ctx.fillStyle = rig.ink; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.save(); path(m.up, m.lo, ox, oy, sx, sy); ctx.closePath(); ctx.clip();
    // tongue: a round blob at the bottom
    if (m.tongue > 0.01) {
      const bot = m.lo.reduce((v, p) => Math.max(v, p[1]), -9);
      ctx.globalAlpha = clamp01(m.tongue); ctx.fillStyle = rig.tongue;
      ctx.beginPath(); ctx.ellipse(ox * R, (oy + bot * sy) * R, sx * 0.55 * R, open * 0.55 * R, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // teeth: a white band under the top lip; at teeth = 1 it fills the mouth (gritted)
    if (m.teeth > 0.01) {
      ctx.fillStyle = rig.teeth;
      ctx.beginPath();
      m.up.forEach(([x, y], k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, (ox + x * sx) * R, (oy + y * sy) * R));
      for (let k = N - 1; k >= 0; k--) {
        const [x, y] = m.up[k], ly = m.lo[k][1];
        ctx.lineTo((ox + x * sx) * R, (oy + (y + (ly - y) * Math.min(1, m.teeth * 0.45 + (m.grid > 0.5 ? m.teeth * 0.6 : 0))) * sy) * R);
      }
      ctx.fill();
      // gritted teeth: tooth gaps + middle line
      if (m.grid > 0.01) {
        ctx.globalAlpha = clamp01(m.grid); ctx.strokeStyle = rig.ink; ctx.lineWidth = lw * 0.45;
        const L = m.up[0][0], Rr = m.up[N - 1][0];
        for (let g = 1; g < 7; g++) { const x = L + ((Rr - L) * g) / 7; ctx.beginPath(); ctx.moveTo((ox + x * sx) * R, (oy - 2) * R); ctx.lineTo((ox + x * sx) * R, (oy + 2) * R); ctx.stroke(); }
        ctx.beginPath();
        m.up.forEach(([x, y], k) => { const my = (y + m.lo[k][1]) / 2; (k ? ctx.lineTo : ctx.moveTo).call(ctx, (ox + x * sx) * R, (oy + my * sy) * R); });
        ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }
  ctx.strokeStyle = rig.ink; ctx.lineWidth = lw;
  path(m.up, m.lo, ox, oy, sx, sy); ctx.closePath(); ctx.stroke();
  ctx.restore();
}

/** Plain head for previews: skin disc + ink outline (real videos use the character's own head picture). */
export function drawHead(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, rig: FaceRig = DEFAULT_RIG, outline = 0.055) {
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = rig.skin; ctx.fill();
  ctx.lineWidth = outline * R; ctx.strokeStyle = rig.ink; ctx.stroke();
}

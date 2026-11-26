// Walking along straight pieces of floor. Each piece: from -> to between t0 and t1 (ease in and out, constant speed between).
// at(t) gives the floor point, the walking direction, the step phase and how much the person is walking (0..1):
//   const w = PATH.at(t); p.setPos(...w.pos); p.setWalk(w.phase, w.k, w.dx, w.dz);
import { V3, smooth } from "../core/util";

export type Piece = { t0: number; t1: number; from: V3; to: V3 };
export type WalkState = { pos: V3; dx: number; dz: number; phase: number; k: number; moving: boolean };
const STEP = 0.42;                      // metres per step (one foot); the legs make one full cycle every two steps
const ease = (u: number, a = 0.18) => (u <= 0 ? 0 : u >= 1 ? 1 : u < a ? (u * u) / (2 * a * (1 - a)) : u > 1 - a ? 1 - ((1 - u) * (1 - u)) / (2 * a * (1 - a)) : (u - a / 2) / (1 - a));

export function makePath(pieces: Piece[], start?: V3) {
  const len = pieces.map((p) => Math.hypot(p.to[0] - p.from[0], p.to[2] - p.from[2]));
  const before: number[] = []; let acc = 0; len.forEach((l, i) => { before[i] = acc; acc += l; });
  const at = (t: number): WalkState => {
    if (!pieces.length || t < pieces[0].t0) { const p = start ?? pieces[0]?.from ?? [0, 0, 0]; return { pos: p, dx: 0, dz: 1, phase: 0, k: 0, moving: false }; }
    let i = 0; while (i + 1 < pieces.length && t >= pieces[i + 1].t0) i++;
    const p = pieces[i], e = ease((t - p.t0) / (p.t1 - p.t0)), L = len[i] || 1e-6;
    const pos: V3 = [p.from[0] + (p.to[0] - p.from[0]) * e, p.from[1] + (p.to[1] - p.from[1]) * e, p.from[2] + (p.to[2] - p.from[2]) * e];
    const k = smooth(p.t0, p.t0 + 0.12, t) * (1 - smooth(p.t1 - 0.12, p.t1, t));
    return { pos, dx: (p.to[0] - p.from[0]) / L, dz: (p.to[2] - p.from[2]) / L, phase: ((before[i] + L * e) * Math.PI) / STEP, k, moving: t < p.t1 };
  };
  return { at };
}

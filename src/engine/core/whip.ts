// WHIP PANS (his rule, 2026-11-15, first used in vietnam3: "it made the video so much more engaging").
// Every shot that has `dissolve` becomes a whip pan instead of a blend: the old shot swings sideways, speeding up; at the
// cut the new shot swings in from the other side, slowing down; a sideways motion blur hides the cut. No blending, no ghosts.
// Object transitions (shot.collapse) and white flashes are not touched. Turn it off for one video: makeWhips(shots, camAt, { on: false }).
//
//   story.ts:   const CAM = makeCamera(shots, DURATION);
//               const WH = makeWhips(shots, CAM.camAt);           // (wrap your own camAt first if you change poses, e.g. a drone circle)
//               export const camAt = WH.camAt; export const dissolveAt = WH.dissolveAt; export const whipBlur = WH.blur;
//   video.ts:   overlay: whipBlur,                                  (or call whipBlur(ctx, t) inside your own overlay)
//   The numbers live in src/house/look.ts (HOUSE.whip).
import { HOUSE } from "../../house/look";
import type { Shot } from "./camera";

type V3 = [number, number, number];
type Opts = { on: boolean; deg: number; minHalf: number; blur: number; copies: number };

export function makeWhips<C extends { pos: V3; look: V3 }>(shots: Shot[], camAt: (t: number) => C, o: Partial<Opts> = {}) {
  const O: Opts = { ...HOUSE.whip, ...o };
  const W = O.on ? shots.flatMap((s, i) => (i > 0 && s.dissolve ? [{ t: s.t, h: Math.max(O.minHalf, s.dissolve / 2) }] : [])) : [];
  /** null, or { a: how far the look is swung (deg), speed: 0..1 (1 = at the cut) } */
  const whipAt = (t: number) => {
    for (const w of W) {
      if (t >= w.t - w.h && t < w.t) { const u = (t - (w.t - w.h)) / w.h; return { a: O.deg * u * u, speed: u }; }
      if (t >= w.t && t < w.t + w.h) { const u = (t - w.t) / w.h; return { a: -O.deg * (1 - u) * (1 - u), speed: 1 - u }; }
    }
    return null;
  };
  // swing the look sideways (around the camera's own up), so it also works for shots looking steeply down
  const pan = (c: C, deg: number): C => {
    const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], L = Math.hypot(...d);
    let rx = -d[2], rz = d[0]; const rl = Math.hypot(rx, rz); if (rl < 1e-4) { rx = 1; rz = 0; } else { rx /= rl; rz /= rl; }
    const a = (deg * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
    return { ...c, look: [c.pos[0] + d[0] * cs + rx * L * sn, c.pos[1] + d[1] * cs, c.pos[2] + d[2] * cs + rz * L * sn] as V3 };
  };
  let bc: HTMLCanvasElement | null = null;
  /** the sideways motion blur (strongest at the cut); captions are drawn after it, so they stay sharp */
  const blur = (ctx: CanvasRenderingContext2D, t: number) => {
    const w = whipAt(t); if (!w || w.speed < 0.04) return;
    const cv = ctx.canvas, Wd = cv.width, Ht = cv.height;
    if (!bc) { bc = document.createElement("canvas"); bc.width = Wd; bc.height = Ht; }
    const g = bc.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, Wd, Ht); g.drawImage(cv, 0, 0);
    const len = Math.pow(w.speed, 1.3) * Wd * O.blur, N = O.copies;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < N; i++) { ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(bc, -len / 2 + (len * i) / (N - 1), 0); }
    ctx.restore();
  };
  return {
    whipAt, blur,
    camAt: (t: number): C => { const c = camAt(t), w = whipAt(t); return w ? pan(c, w.a) : c; },
    dissolveAt: (_t: number) => null,   // whips replace blends (a video that wants real blends: use CAM.dissolveAt instead)
  };
}

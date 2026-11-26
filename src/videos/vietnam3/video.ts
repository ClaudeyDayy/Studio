// vietnam3 (house look) of "North Vietnam won the war" (Vietnam tunnels, R3KNRF, THE 3D LOOK) for the shared engine.
// 2 object transitions: the lookout picture shrinks into a photo on the war-room map (20.75 s); the kitchen picture shrinks
// into a photo on the general's board (57.65 s). Each keeps playing while it goes in, then stays there as a photo.
import { defineVideo } from "../../engine/video";
import { HOUSE } from "../../house/look";
import { VietWorld, load, SNAP } from "./world";
import { TOTAL, FPS, CAPS, LIGHT, camAt, dissolveAt, whiteAt, collapseAt, PHOTO1_CORNERS, PHOTO2_CORNERS, whipAt } from "./story";
// WHIP PANS (his note 2026-11-15): sideways motion blur while the camera swings (strongest at the cut). Captions stay sharp.
let blurC: HTMLCanvasElement | null = null;
function whipBlur(ctx: CanvasRenderingContext2D, t: number) {
  const w = whipAt(t); if (!w || w.speed < 0.04) return;
  const cv = ctx.canvas, W = cv.width, H = cv.height;
  if (!blurC) { blurC = document.createElement("canvas"); blurC.width = W; blurC.height = H; }
  const g = blurC.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, W, H); g.drawImage(cv, 0, 0);
  const L = Math.pow(w.speed, 1.3) * W * 0.42, N = 16;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < N; i++) { ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(blurC, -L / 2 + (L * i) / (N - 1), 0); }
  ctx.restore();
}
import { smooth } from "../../engine/core/util";

export default defineVideo({
  fps: FPS, total: TOTAL,
  background: "#1B1020",
  ink: true, inkOptions: HOUSE.line,   // HOUSE: indoors everything outlined; outdoors only the small details
  env: 0.5,
  bloom: HOUSE.bloom,
  near: 0.2, far: 900,               // Fable5.2: big outdoor places (no ground flicker)
  gradeAt: LIGHT.gradeAt,
  camAt, dissolveAt, whiteAt, caps: CAPS,
  overlay: whipBlur,
  collapseAt: (t) => {
    const c = collapseAt(t);
    if (!c) return null;
    return { ...c, corners: t < 40 ? PHOTO1_CORNERS : PHOTO2_CORNERS, alpha: 1 - smooth(0.75, 1.0, c.k), snapTo: (cv: HTMLCanvasElement) => { SNAP.canvas = cv; SNAP.t = t; } };
  },
  load,
  makeWorld: (A) => new VietWorld(A),
});

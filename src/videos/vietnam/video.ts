// "North Vietnam won the war" (Vietnam tunnels, R3KNRF, THE 3D LOOK) for the shared engine.
// 2 object transitions: the lookout picture shrinks into a photo on the war-room map (20.75 s); the kitchen picture shrinks
// into a photo on the general's board (57.65 s). Each keeps playing while it goes in, then stays there as a photo.
import { defineVideo } from "../../engine/video";
import { VietWorld, load, SNAP } from "./world";
import { TOTAL, FPS, CAPS, LIGHT, camAt, dissolveAt, whiteAt, collapseAt, PHOTO1_CORNERS, PHOTO2_CORNERS } from "./story";
import { smooth } from "../../engine/core/util";

export default defineVideo({
  fps: FPS, total: TOTAL,
  background: "#1B1020",
  ink: false,                       // the 3D look: no outlines on the world
  env: 0.5,
  bloom: 0.5,
  gradeAt: LIGHT.gradeAt,
  camAt, dissolveAt, whiteAt, caps: CAPS,
  collapseAt: (t) => {
    const c = collapseAt(t);
    if (!c) return null;
    return { ...c, corners: t < 40 ? PHOTO1_CORNERS : PHOTO2_CORNERS, alpha: 1 - smooth(0.75, 1.0, c.k), snapTo: (cv: HTMLCanvasElement) => { SNAP.canvas = cv; SNAP.t = t; } };
  },
  load,
  makeWorld: (A) => new VietWorld(A),
});

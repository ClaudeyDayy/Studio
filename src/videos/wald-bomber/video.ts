// WALD BOMBER (2026-11-20). Joins are TRUE matched dissolves here, no whip pans (his choice for this video).
// One object transition: S03 shrinks into a photo pinned on the hangar board (S04). White flashes into / out of the fantasy.
import { defineVideo } from "../../engine/video";
import { HOUSE } from "../../house/look";
import { smooth } from "../../engine/core/util";
import { BomberWorld, load, snapPhoto } from "./world";
import { TOTAL, FPS, LIGHT, camAt, dissolveAt, collapseAt, whiteAt, PHOTO_CORNERS } from "./story";

export default defineVideo({
  fps: FPS, total: TOTAL,
  background: "#1B1020",
  ink: true, inkOptions: HOUSE.line,
  env: 0.55,
  bloom: HOUSE.bloom,
  near: 0.2, far: 900,
  gradeAt: LIGHT.gradeAt,
  camAt, dissolveAt, whiteAt, caps: [],
  collapseAt: (t) => {
    const c = collapseAt(t);
    if (!c) return null;
    return { ...c, corners: PHOTO_CORNERS, alpha: 1 - smooth(0.75, 0.9, c.u), snapTo: (cv) => snapPhoto(cv) };   // the 3D photo keeps the picture after the fade
  },
  load,
  makeWorld: (A) => new BomberWorld(A as any),
});

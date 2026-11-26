// NEEDLE AT LIGHT SPEED: the real video. Outdoor look: outlines only on small details (the world parts call noInk on big surfaces).
import { defineVideo } from "../../engine/video";
import { load, makeWorld } from "./world";
import { HOUSE } from "../../house/look";
import { TOTAL, FPS, CAPS, LIGHT, camAt, dissolveAt, whiteAt, collapseAt } from "./story";
import { GUN_CORNERS } from "./moon";

export default defineVideo({
  fps: FPS, total: TOTAL,
  background: "#000000",
  ink: true, inkOptions: HOUSE.line,
  env: 0.55,
  bloom: HOUSE.bloom,
  // near / far: every part sets its own, every frame (the hit places go from 800 km to a few metres)
  gradeAt: LIGHT.gradeAt,
  camAt, dissolveAt, whiteAt, caps: CAPS,
  // the explainer's picture shrinks into the corners of the gun's small screen (the corner list is filled by the moon part every frame)
  collapseAt: (t) => { const c = collapseAt(t); return c ? { k: c.k, u: c.u, out: c.out, corners: GUN_CORNERS, alpha: 1 } : null; },
  load,
  makeWorld: (A) => makeWorld(A),
});

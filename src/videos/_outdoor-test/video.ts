// OUTDOOR TEST: one street shown as sunny day, sunset (backlit, shafts), night (stars), storm (rain).
// It is the example of the outdoor kit (engine/outdoor.ts) and the house look (src/house/look.ts).
import { defineVideo } from "../../engine/video";
import { HOUSE } from "../../house/look";
import { StreetWorld, load } from "./world";
import { TOTAL, FPS, LIGHT, camAt, dissolveAt } from "./story";

export default defineVideo({
  fps: FPS, total: TOTAL,
  background: "#1B1020",
  ink: true, inkOptions: HOUSE.line,   // outlines on the small details only; walls, roofs and ground are noInk + textured
  env: 0.55,
  bloom: HOUSE.bloom,
  near: 0.2, far: 900,              // a big outdoor place
  gradeAt: LIGHT.gradeAt,
  camAt, dissolveAt, caps: [],
  load,
  makeWorld: (A) => new StreetWorld(A),
});

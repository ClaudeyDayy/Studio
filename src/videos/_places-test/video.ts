// PLACES TEST: shows the place library (src/engine/places.ts). Stills:  node render.mjs 30,90,150,210,285
import { defineVideo } from "../../engine/video";
import { HOUSE } from "../../house/look";
import { PlacesWorld, load } from "./world";
import { TOTAL, FPS, LIGHT, camAt } from "./story";

export default defineVideo({
  fps: FPS, total: TOTAL,
  background: "#1B1020",
  ink: true, inkOptions: HOUSE.line,
  env: 0.55,
  bloom: HOUSE.bloom,
  near: 0.2, far: 900,
  gradeAt: LIGHT.gradeAt,
  camAt, caps: [],
  load,
  makeWorld: () => new PlacesWorld(),
});

// This folder's video for the shared engine (src/engine). THE 3D LOOK: no outlines on the world, soft all-round light.
import { defineVideo } from "../../engine/video";
import { SimpleWorld, load } from "./world";
import { HOUSE } from "../../house/look";   // his standing look choices: read src/house/look.ts before building
import { TOTAL, FPS, CAPS, LIGHT, camAt, dissolveAt, whiteAt, whipBlur } from "./story";

export default defineVideo({
  fps: FPS, total: TOTAL,
  background: "#000000",            // colour behind everything
  ink: true, inkOptions: HOUSE.line,   // HOUSE: indoors everything has thin outlines; outdoors only small details (noInk(mesh) on walls, ground, roads)
  env: 0.55,                        // soft light from all around on the real materials
  bloom: HOUSE.bloom,
  near: 0.2, far: 900,              // how near / far the camera draws (m). Big outdoor place: near 0.2, far 300-900
                                    // flat things lying on the ground (road, dirt pad, water, rug): wrap them in onGround(mesh, level) from kit.ts
                                    // before any stills:  node render.mjs check   (camera through / too close to things, flickering ground)
  gradeAt: LIGHT.gradeAt,           // the colour grade follows the light preset
  camAt, dissolveAt, whiteAt, caps: CAPS,
  overlay: whipBlur,                // HOUSE: the motion blur of the whip pans
  load,
  makeWorld: (A) => new SimpleWorld(A),
});

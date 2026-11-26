// This folder's video for the shared engine (src/engine). THE 3D LOOK: no outlines on the world, soft all-round light.
import { defineVideo } from "../../engine/video";
import { SimpleWorld, load } from "./world";
import { HOUSE } from "../../house/look";   // his standing look choices: read src/house/look.ts before building
import { TOTAL, FPS, CAPS, LIGHT, camAt, dissolveAt, whiteAt, whipBlur } from "./story";

export default defineVideo({
  fps: FPS, total: TOTAL,
  background: "#B6CCE2",            // colour behind everything
  ink: true, inkOptions: HOUSE.line,   // HOUSE: indoors everything has thin outlines; outdoors only small details (noInk(mesh) on walls, ground, roads)
  env: 0.55,                        // soft light from all around on the real materials
  bloom: HOUSE.bloom,
  // near / far: set by world.ts every frame (the camera goes from 30 km up to 5 m behind the needle)
  gradeAt: LIGHT.gradeAt,           // the colour grade follows the light preset
  camAt, dissolveAt, whiteAt, caps: CAPS,
  overlay: whipBlur,                // HOUSE: the motion blur of the whip pans
  load,
  makeWorld: (A) => new SimpleWorld(A),
});

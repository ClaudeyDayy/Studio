// This folder's video for the shared engine (src/engine). Usually you do not need to change this file.
import { defineVideo } from "../../engine/video";
import { SimpleWorld, loadImages } from "./world";
import { TOTAL, FPS, CAPS, camAt, dissolveAt, whiteAt } from "./story";

export default defineVideo({
  fps: FPS, total: TOTAL,
  background: "#1B1020",            // colour behind everything
  // grade: GRADES.golden, bloom: 0.5,   (import GRADES from "../../engine/post/grade" for a warmer look)
  camAt, dissolveAt, whiteAt, caps: CAPS,
  load: loadImages,
  makeWorld: (imgs) => new SimpleWorld(imgs),
});

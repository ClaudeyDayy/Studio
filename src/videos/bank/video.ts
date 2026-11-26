// "The pants bet" for the shared engine (src/engine). The engine draws; this folder says WHAT to draw.
import { defineVideo } from "../../engine/video";
import { BankWorld, loadImages, buildAll } from "./world";
import { TOTAL, FPS, CAPS, camAt, dissolveAt, whiteAt } from "./story";
import { GRADES } from "../../engine/post/grade";

export default defineVideo({
  fps: FPS, total: TOTAL, background: "#1B1020",
  grade: { ...GRADES.day, sat: [1.12, 1.3, 1.22] }, bloom: 0.62,          // richer, more vivid colour than the plain day look
  camAt, dissolveAt, whiteAt, caps: CAPS,
  load: async () => { const imgs = await loadImages(); buildAll(imgs); return imgs; },
  makeWorld: (imgs) => new BankWorld(imgs),
});

// "The pants bet" REMAKE (bank2, R3KNRF) for the shared engine.
// New here: the fantasy wipes (a soft circle from Arian's head) and ONE object transition (the security camera picture
// shrinks into the monitor on the CEO's desk and keeps playing there).
import { defineVideo } from "../../engine/video";
import { BankWorld, loadImages, buildAll, SNAP } from "./world";
import { TOTAL, FPS, CAPS, camAt, dissolveAt, whiteAt, collapseAt, MON_CORNERS } from "./story";
import { GRADES } from "../../engine/post/grade";
import { smooth } from "../../engine/core/util";

// the security camera look on the old picture while it goes into the monitor: scanlines, a dark edge, REC and the camera name
const cctv = (g: CanvasRenderingContext2D, w: number, h: number, k: number, t: number) => {
  const a = smooth(0, 0.45, k);
  if (a <= 0) return;
  g.globalAlpha = 0.22 * a; g.fillStyle = "#0A1420"; for (let y = 0; y < h; y += 12) g.fillRect(0, y, w, 5);
  const v = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.62); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(5,10,25,0.55)");
  g.globalAlpha = a; g.fillStyle = v; g.fillRect(0, 0, w, h);
  g.font = '900 92px "Arial Black", Impact, sans-serif'; g.textBaseline = "middle"; g.textAlign = "left";
  if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = "#FF3B3B"; g.beginPath(); g.arc(110, 150, 34, 0, 7); g.fill(); }
  g.lineWidth = 10; g.strokeStyle = "rgba(10,12,20,0.8)"; g.strokeText("REC", 165, 152); g.fillStyle = "#FFFFFF"; g.fillText("REC", 165, 152);
  g.textAlign = "right"; g.strokeText("CAM 2", w - 80, h - 140); g.fillText("CAM 2", w - 80, h - 140);
};

export default defineVideo({
  fps: FPS, total: TOTAL, background: "#1B1020",
  grade: { ...GRADES.day, sat: [1.12, 1.3, 1.22] }, bloom: 0.62,
  camAt, dissolveAt, whiteAt, caps: CAPS,
  collapseAt: (t) => {
    const c = collapseAt(t);
    if (!c) return null;
    return { ...c, corners: MON_CORNERS, alpha: 1 - smooth(0.72, 1.0, c.k), style: cctv, snapTo: (cv) => { SNAP.canvas = cv; SNAP.t = t; } };
  },
  load: async () => { const imgs = await loadImages(); buildAll(imgs); return imgs; },
  makeWorld: (imgs) => new BankWorld(imgs),
});

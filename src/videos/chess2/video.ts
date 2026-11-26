// "Infinite chess" v4 for the shared engine (src/engine). The engine draws; this folder says WHAT to draw.
import { defineVideo } from "../../engine/video";
import { buildCast } from "../../engine/cast/player";
import { ChessWorld, loadImages } from "./world";
import { TOTAL, FPS, CAPS, camAt, dissolveAt, whiteAt, STOPWATCH, smooth } from "./story";

// ---------- the stopwatch: a flat drawing on the screen (not in the 3D room) ----------
// pops in big at the centre, flies to the top left and keeps ticking while they play in time-lapse,
// stops on "lose", flies back and grows until its white face fills the whole screen (-> white -> the moon)
const INK = "#241726";
function drawWatch(g: CanvasRenderingContext2D, cx: number, cy: number, d: number, hand: number, tick: number) {
  const r = d / 2, lw = Math.max(3, d * 0.04);
  g.save(); g.translate(cx, cy);
  g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = INK;
  // shadow
  g.fillStyle = "rgba(26,16,32,0.35)"; g.beginPath(); g.arc(d * 0.025, d * 0.04, r, 0, 7); g.fill();
  // crown button + side button (the crown dips on every tick)
  const dip = d * 0.02 * tick;
  g.fillStyle = "#C9CED8"; g.lineWidth = lw;
  g.beginPath(); g.roundRect(-d * 0.07, -r - d * 0.15 + dip, d * 0.14, d * 0.12, d * 0.02); g.fill(); g.stroke();
  g.beginPath(); g.roundRect(-d * 0.035, -r - d * 0.05, d * 0.07, d * 0.07, 2); g.fill(); g.stroke();
  g.save(); g.rotate(0.75); g.beginPath(); g.roundRect(-d * 0.04, -r - d * 0.08, d * 0.08, d * 0.08, d * 0.015); g.fill(); g.stroke(); g.restore();
  // metal rim + white face
  const rim = g.createLinearGradient(-r, -r, r, r); rim.addColorStop(0, "#F4F6FA"); rim.addColorStop(1, "#8E95A6");
  g.fillStyle = rim; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.lineWidth = lw; g.stroke();
  g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(0, 0, r * 0.86, 0, 7); g.fill(); g.lineWidth = lw * 0.5; g.stroke();
  // ticks
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
    g.lineWidth = big ? lw * 0.6 : lw * 0.25;
    g.beginPath(); g.moveTo(Math.sin(a) * r * (big ? 0.64 : 0.72), -Math.cos(a) * r * (big ? 0.64 : 0.72)); g.lineTo(Math.sin(a) * r * 0.79, -Math.cos(a) * r * 0.79); g.stroke();
  }
  // hand + centre
  g.strokeStyle = "#E83A2E"; g.lineWidth = lw * 0.9;
  g.beginPath(); g.moveTo(-Math.sin(hand) * r * 0.14, Math.cos(hand) * r * 0.14); g.lineTo(Math.sin(hand) * r * 0.7, -Math.cos(hand) * r * 0.7); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(0, 0, r * 0.08, 0, 7); g.fill();
  // glass shine
  g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = lw * 0.5; g.beginPath(); g.arc(0, 0, r * 0.76, -2.6, -1.9); g.stroke();
  g.restore();
}
const S = STOPWATCH, BIG = 820, SMALL = 250, CORNER = [175, 235], CENTRE = [540, 860], FILL = 2700;
function overlay(g: CanvasRenderingContext2D, t: number) {
  if (t < S.a || t >= S.fill + 0.1) return;           // gone when the white flash peaks (27.3)
  const pop = Math.min(1, (t - S.a) / 0.2), popS = (pop < 1 ? 1 + 0.18 * Math.sin(pop * Math.PI) : 1) * smooth(0, 1, pop);
  const go = smooth(S.toCorner, S.corner, t), come = smooth(S.back, S.fill, t);
  const comeE = come * come;                                                     // grows slowly first, then fast
  let x = CENTRE[0] + (CORNER[0] - CENTRE[0]) * go, y = CENTRE[1] + (CORNER[1] - CENTRE[1]) * go;
  let d = (BIG + (SMALL - BIG) * go) * popS;
  x += (540 - x) * come; y += (960 - y) * come; d += (FILL - d) * comeE;
  const run = Math.min(t, S.stop) - S.a;
  const hand = run * S.spin, tick = t < S.stop ? Math.max(0, 1 - ((run * 4) % 1) * 3) : 0;
  const bump = t >= S.stop ? 1 + 0.12 * Math.sin(Math.PI * Math.min(1, (t - S.stop) / 0.2)) : 1;   // little jolt when it stops
  drawWatch(g, x, y, d * bump, hand, tick);
}

export default defineVideo({
  fps: FPS, total: TOTAL, background: "#1B1020",
  camAt, dissolveAt, whiteAt, caps: CAPS, overlay,
  load: async () => { const imgs = await loadImages(); buildCast(imgs, "arian"); buildCast(imgs, "max"); return imgs; },
  makeWorld: (imgs) => new ChessWorld(imgs),
});

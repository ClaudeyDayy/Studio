// Painted textures for the bank video (flat colour fields, dark seams, a little detail). All drawn in code.
import * as THREE from "three";
import { mkCanvas, canvasTex } from "../../engine/kit";

const INK = "#241726";
const rr = (k: number) => { const x = Math.sin(k * 127.1) * 43758.5453; return x - Math.floor(x); };
const rep = (t: THREE.Texture, x: number, y: number) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
const SANS = '"Arial Black", Impact, "DejaVu Sans", sans-serif';
const HAND = '"Segoe Print", "Comic Sans MS", "Ink Free", "DejaVu Sans", cursive';

export const tileFloor = () => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    g.fillStyle = (i + j) % 2 ? "#F4BE62" : "#DC8436"; g.fillRect(i * 128, j * 128, 128, 128);
    g.fillStyle = "rgba(255,255,255,.10)"; g.fillRect(i * 128 + 6, j * 128 + 6, 116, 10);
  }
  g.strokeStyle = "rgba(110,60,20,.55)"; g.lineWidth = 4; g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128); g.strokeRect(128, 0, 128, 128); g.strokeRect(0, 128, 128, 128);
  return c;
};
export const floorTex = (rx: number, ry: number) => rep(canvasTex(tileFloor()), rx, ry);
export const runnerTex = () => {
  const c = mkCanvas(256, 128), g = c.getContext("2d")!;
  g.fillStyle = "#C2232B"; g.fillRect(0, 0, 256, 128); g.fillStyle = "#E7B13A"; g.fillRect(0, 8, 256, 8); g.fillRect(0, 112, 256, 8);
  g.fillStyle = "#A81A24"; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(32 + i * 64, 40); g.lineTo(56 + i * 64, 64); g.lineTo(32 + i * 64, 88); g.lineTo(8 + i * 64, 64); g.closePath(); g.fill(); }
  return rep(canvasTex(c), 6, 1);
};
export const carpetTex = () => {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  g.fillStyle = "#8E1F3C"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#A52A48";
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { g.beginPath(); g.arc(i * 32 + 16, j * 32 + 16, 7, 0, 7); g.fill(); }
  return rep(canvasTex(c), 5, 5);
};
export const wallTex = (base: string, stripe: string) => {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, 128, 128); g.fillStyle = stripe; for (let i = 0; i < 4; i++) g.fillRect(i * 32 + 12, 0, 8, 128);
  return canvasTex(c);
};
export const woodTex = (a = "#9A5A2A", b = "#8A4E22") => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 64, 0, 64, 256); g.fillStyle = "rgba(50,24,8,.45)"; g.fillRect(i * 64, 0, 3, 256);
    g.strokeStyle = "rgba(60,30,10,.25)"; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(i * 64 + 14 + k * 16, 0); g.quadraticCurveTo(i * 64 + 22 + k * 16, 128, i * 64 + 12 + k * 16, 256); g.stroke(); } }
  return rep(canvasTex(c), 1, 1);
};
export const marbleTex = () => {
  const c = mkCanvas(256, 64), g = c.getContext("2d")!;
  g.fillStyle = "#1F8466"; g.fillRect(0, 0, 256, 64); g.strokeStyle = "rgba(220,255,240,.35)"; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(rr(i) * 256, 0); g.bezierCurveTo(rr(i + 9) * 256, 20, rr(i + 19) * 256, 40, rr(i + 29) * 256, 64); g.stroke(); }
  return rep(canvasTex(c), 3, 1);
};
// a window with a city outside (day)
export const cityTex = (seed = 0) => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#6FB4F2"); gr.addColorStop(0.7, "#BFE2FA"); gr.addColorStop(1, "#FFE9C0");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#FFFFFF"; for (const [x, y, r] of [[60, 60, 22], [84, 54, 28], [112, 62, 20], [190, 96, 18], [210, 90, 24]]) { g.beginPath(); g.arc(x + seed * 17, y, r, 0, 7); g.fill(); }
  const cols = ["#5E7FB8", "#7A93C8", "#4C6AA6", "#8AA4D6"];
  for (let i = 0; i < 7; i++) { const w = 30 + rr(i + seed) * 22, h = 70 + rr(i + 7 + seed) * 90, x = i * 38 - 6; g.fillStyle = cols[i % 4]; g.fillRect(x, 256 - h, w, h);
    g.fillStyle = "rgba(255,245,200,.75)"; for (let k = 0; k < 12; k++) if (rr(i * 13 + k + seed) > 0.45) g.fillRect(x + 5 + (k % 3) * 9, 256 - h + 8 + Math.floor(k / 3) * 14, 5, 7); }
  return canvasTex(c);
};
export const streetTex = () => {
  const c = mkCanvas(256, 384), g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#7DBDF5"); gr.addColorStop(0.55, "#D6EEFF"); gr.addColorStop(0.56, "#9AA6B8"); gr.addColorStop(1, "#7C8798");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 384);
  g.fillStyle = "#6C86BC"; g.fillRect(0, 90, 70, 126); g.fillStyle = "#8AA4D6"; g.fillRect(84, 50, 60, 166); g.fillStyle = "#5E7FB8"; g.fillRect(160, 110, 96, 106);
  g.fillStyle = "#3FA75A"; g.beginPath(); g.arc(120, 200, 34, 0, 7); g.fill(); g.fillStyle = "#6B3F22"; g.fillRect(114, 210, 12, 40);
  g.fillStyle = "#F4F0E6"; for (let i = 0; i < 4; i++) g.fillRect(20 + i * 64, 300, 36, 8);
  return canvasTex(c);
};
export const glowTex = (col = "255,230,170", edge = "255,200,120") => {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(1, `rgba(${edge},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return canvasTex(c);
};
export const sparkTex = () => {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 40); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,240,200,.6)"); gr.addColorStop(1, "rgba(255,220,160,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = "rgba(255,250,230,.95)";
  for (const r of [0, Math.PI / 2]) { g.save(); g.translate(64, 64); g.rotate(r); g.beginPath(); g.moveTo(-62, 0); g.quadraticCurveTo(0, 5, 62, 0); g.quadraticCurveTo(0, -5, -62, 0); g.fill(); g.restore(); }
  return canvasTex(c);
};
export const beamTex = () => {
  const c = mkCanvas(64, 256), g = c.getContext("2d")!;
  const v = g.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = v; g.fillRect(0, 0, 64, 256); g.globalCompositeOperation = "destination-in";
  const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, "rgba(0,0,0,0)"); h.addColorStop(0.3, "rgba(0,0,0,1)"); h.addColorStop(0.7, "rgba(0,0,0,1)"); h.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = h; g.fillRect(0, 0, 64, 256); return canvasTex(c);
};
export const puffTex = () => {                           // a soft cartoon dust cloud
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  g.fillStyle = "#D9D2DC"; for (const [x, y, r] of [[128, 140, 78], [70, 150, 52], [186, 150, 54], [98, 96, 50], [160, 92, 54], [128, 70, 40]]) { g.beginPath(); g.arc(x, y + 6, r, 0, 7); g.fill(); }
  g.fillStyle = "#FFFFFF"; for (const [x, y, r] of [[128, 136, 76], [70, 146, 50], [186, 146, 52], [98, 92, 48], [160, 88, 52], [128, 66, 38]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  return canvasTex(c);
};
export const shadowTex = () => {
  const c = mkCanvas(64, 64), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(40,20,30,.55)"); gr.addColorStop(0.6, "rgba(40,20,30,.3)"); gr.addColorStop(1, "rgba(40,20,30,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return canvasTex(c);
};
// queue ticket with a big number
export const ticketTex = (num: string) => {
  const c = mkCanvas(240, 312), g = c.getContext("2d")!;
  g.fillStyle = "#FFFDF4"; g.beginPath(); g.roundRect(6, 6, 228, 300, 14); g.fill(); g.lineWidth = 10; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#16969F"; g.fillRect(11, 11, 218, 56); g.fillStyle = "#FFFFFF"; g.font = `900 30px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("YOUR TURN", 120, 41);
  g.fillStyle = INK; g.font = `900 170px ${SANS}`; g.fillText(num, 120, 178);
  g.strokeStyle = "rgba(36,23,38,.5)"; g.lineWidth = 4; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(24, 272); g.lineTo(216, 272); g.stroke();
  return canvasTex(c);
};
// the hanging "now serving" board
export const boardTex = (num: string, lit: boolean) => {
  const c = mkCanvas(512, 240), g = c.getContext("2d")!;
  g.fillStyle = "#1A1430"; g.fillRect(0, 0, 512, 240); g.strokeStyle = "#E7B13A"; g.lineWidth = 12; g.strokeRect(6, 6, 500, 228);
  g.fillStyle = "#FFE9B0"; g.font = `900 40px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NOW SERVING", 256, 48);
  g.shadowColor = lit ? "#FFB020" : "#FF7A20"; g.shadowBlur = lit ? 34 : 14; g.fillStyle = lit ? "#FFF2B0" : "#FFA230"; g.font = `900 150px ${SANS}`; g.fillText(num, 256, 150);
  return canvasTex(c);
};
export const plaqueTex = (text: string) => {
  const c = mkCanvas(256, 96), g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 256, 96); gr.addColorStop(0, "#FFE9A0"); gr.addColorStop(0.5, "#E7B13A"); gr.addColorStop(1, "#B97E0C");
  g.fillStyle = gr; g.beginPath(); g.roundRect(4, 4, 248, 88, 12); g.fill(); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
  g.fillStyle = INK; g.font = `900 62px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 128, 52);
  return canvasTex(c);
};
export const signTex = () => {                          // the bank's name on the back wall (invented)
  const c = mkCanvas(1024, 160), g = c.getContext("2d")!;
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = `900 104px ${SANS}`; g.lineJoin = "round";
  g.strokeStyle = INK; g.lineWidth = 18; g.strokeText("OAK & COIN BANK", 512, 84);
  const gr = g.createLinearGradient(0, 30, 0, 140); gr.addColorStop(0, "#FFF0B0"); gr.addColorStop(1, "#E7A91A"); g.fillStyle = gr; g.fillText("OAK & COIN BANK", 512, 84);
  return canvasTex(c);
};
export const posterTex = (kind: number) => {
  const c = mkCanvas(192, 256), g = c.getContext("2d")!;
  g.fillStyle = "#5B3A1E"; g.fillRect(0, 0, 192, 256);
  const bg = ["#FFD86B", "#7FD3E8", "#F7A6C4", "#B9E08A"][kind % 4]; g.fillStyle = bg; g.fillRect(12, 12, 168, 232);
  g.lineWidth = 7; g.strokeStyle = INK; g.lineJoin = "round"; g.lineCap = "round";
  if (kind === 0) {                                     // piggy bank
    g.fillStyle = "#F28AB8"; g.beginPath(); g.ellipse(96, 140, 56, 42, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(146, 132, 16, 13, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(112, 124, 5, 0, 7); g.fill();
    g.beginPath(); g.moveTo(70, 176); g.lineTo(70, 198); g.moveTo(118, 178); g.lineTo(118, 198); g.stroke(); g.beginPath(); g.moveTo(84, 100); g.lineTo(108, 100); g.stroke();
    g.fillStyle = "#F2B921"; g.beginPath(); g.arc(96, 70, 17, 0, 7); g.fill(); g.stroke();
  } else if (kind === 1) {                              // rising chart
    g.beginPath(); g.moveTo(34, 210); g.lineTo(34, 60); g.moveTo(34, 210); g.lineTo(164, 210); g.stroke();
    g.strokeStyle = "#E0283F"; g.lineWidth = 10; g.beginPath(); g.moveTo(46, 190); g.lineTo(80, 150); g.lineTo(106, 168); g.lineTo(152, 84); g.stroke();
    g.fillStyle = "#E0283F"; g.beginPath(); g.moveTo(160, 70); g.lineTo(158, 104); g.lineTo(134, 84); g.closePath(); g.fill();
  } else if (kind === 2) {                              // big percent sign
    g.fillStyle = INK; g.font = `900 150px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("%", 96, 136);
  } else {                                              // stack of coins
    for (let i = 0; i < 5; i++) { g.fillStyle = "#F2B921"; g.beginPath(); g.ellipse(96, 196 - i * 26, 46, 16, 0, 0, 7); g.fill(); g.stroke(); }
    g.fillStyle = "#FFF6D0"; g.beginPath(); g.ellipse(84, 88, 14, 5, 0, 0, 7); g.fill();
  }
  return canvasTex(c);
};
export const bannerTex = () => {
  const c = mkCanvas(128, 336), g = c.getContext("2d")!;
  g.fillStyle = "#6A2BD0"; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 0); g.lineTo(128, 290); g.lineTo(64, 336); g.lineTo(0, 290); g.closePath(); g.fill();
  g.fillStyle = "#F2B41E"; g.fillRect(0, 0, 128, 14); g.fillRect(10, 24, 6, 250); g.fillRect(112, 24, 6, 250);
  g.beginPath(); g.arc(64, 130, 38, 0, 7); g.fill(); g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#7A4F06"; g.font = `900 52px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 64, 134);
  return canvasTex(c);
};
export const clockTex = () => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!; g.lineCap = "round";
  g.fillStyle = "#E7B13A"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.fillStyle = "#FFF6DC"; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 7; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.sin(a) * 84, 128 - Math.cos(a) * 84); g.lineTo(128 + Math.sin(a) * 98, 128 - Math.cos(a) * 98); g.stroke(); }
  g.lineWidth = 10; g.beginPath(); g.moveTo(128, 128); g.lineTo(88, 94); g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(184, 90); g.stroke();
  return canvasTex(c);
};
export const cashTex = () => {
  const c = mkCanvas(256, 128), g = c.getContext("2d")!;
  g.fillStyle = "#4FB86A"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#1F7A3C"; g.lineWidth = 8; g.strokeRect(10, 10, 236, 108);
  g.fillStyle = "#DFF5D6"; g.beginPath(); g.ellipse(128, 64, 34, 40, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#1F7A3C"; g.font = `900 64px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 128, 68);
  g.fillStyle = "#FFF6DC"; g.fillRect(96, 0, 64, 128); g.strokeStyle = "#C9B98A"; g.lineWidth = 4; g.strokeRect(96, -4, 64, 136);
  g.fillStyle = "#1F7A3C"; g.font = `900 40px ${SANS}`; g.fillText("$", 128, 66);
  return canvasTex(c);
};
export const coinTex = () => {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  g.fillStyle = "#F2B921"; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
  g.strokeStyle = "#B97E0C"; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 44, 0, 7); g.stroke();
  g.fillStyle = "#7A4F06"; g.font = `900 70px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 64, 68);
  g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); g.arc(64, 64, 50, -2.5, -1.8); g.stroke();
  return canvasTex(c);
};
export const qmarkTex = (col = "#FF5A3C") => {
  const c = mkCanvas(128, 160), g = c.getContext("2d")!;
  g.font = `900 150px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.strokeStyle = INK; g.lineWidth = 20; g.strokeText("?", 64, 86); g.fillStyle = col; g.fillText("?", 64, 86);
  return canvasTex(c);
};
// small note on the counter (scribbled lines)
export const scribbleTex = (k = 1) => {
  const c = mkCanvas(192, 256), g = c.getContext("2d")!;
  g.fillStyle = "#FFF3D0"; g.fillRect(0, 0, 192, 256); g.lineWidth = 8; g.strokeStyle = INK; g.strokeRect(4, 4, 184, 248);
  g.lineWidth = 6; g.lineCap = "round"; g.strokeStyle = "#2B3F9A";
  const n = Math.round(6 * k);
  for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(24, 40 + i * 34); for (let x = 24; x < (i === n - 1 ? 110 : 168); x += 12) g.lineTo(x + 6, 40 + i * 34 + (x % 24 ? -5 : 5)); g.stroke(); }
  return canvasTex(c);
};
// the note: the text exactly as it is spoken. n = how many of its 6 lines are written (0 = only the paper)
export const noteTex = (n: number) => {
  const W = 768, H = 1024, c = mkCanvas(W, H), g = c.getContext("2d")!;
  g.fillStyle = "#FFF3D0"; g.fillRect(0, 0, W, H); g.lineWidth = 18; g.strokeStyle = INK; g.strokeRect(9, 9, W - 18, H - 18);
  g.strokeStyle = "rgba(60,90,170,.22)"; g.lineWidth = 4; for (let y = 150; y < H - 60; y += 132) { g.beginPath(); g.moveTo(50, y + 44); g.lineTo(W - 50, y + 44); g.stroke(); }
  const lines = ["Take your", "pants off in", "the waiting", "area, and", "this money", "is yours."];
  g.fillStyle = "#22308A"; g.textAlign = "center"; g.textBaseline = "alphabetic";
  lines.forEach((ln, i) => {
    if (i >= n) return;
    let fs = 96; g.font = `700 ${fs}px ${HAND}`; const w = g.measureText(ln).width; if (w > W - 120) { fs = Math.floor((fs * (W - 120)) / w); g.font = `700 ${fs}px ${HAND}`; }
    const y = 180 + i * 132; g.fillText(ln, W / 2, y);
    const under = (i === 1 && n >= 3) || (i === 5 && n >= 6);
    if (under) { const ww = Math.min(W - 120, g.measureText(ln).width); g.strokeStyle = "#E0283F"; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); g.moveTo(W / 2 - ww / 2, y + 26); g.quadraticCurveTo(W / 2, y + 40, W / 2 + ww / 2, y + 22); g.stroke(); }
  });
  if (n >= 6) { g.fillStyle = "#E0283F"; g.font = `900 70px ${SANS}`; g.fillText("$", W - 90, H - 60); }
  return canvasTex(c);
};
export const diceTex = (n: number) => {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 128, 128); g.lineWidth = 10; g.strokeStyle = INK; g.strokeRect(5, 5, 118, 118);
  const P: Record<number, [number, number][]> = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  g.fillStyle = "#E0283F"; for (const [x, y] of P[n]) { g.beginPath(); g.arc(64 + x * 32, 64 + y * 32, 12, 0, 7); g.fill(); }
  return canvasTex(c);
};
export const screenTex = (col: string) => {
  const c = mkCanvas(128, 96), g = c.getContext("2d")!;
  g.fillStyle = col; g.fillRect(0, 0, 128, 96); g.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 4; i++) g.fillRect(14, 16 + i * 18, 60 + (i % 2) * 34, 8);
  return canvasTex(c);
};
// ---------- fantasy sky pieces (same recipe as "Infinite chess") ----------
export const skyTex = () => {
  const c = mkCanvas(4, 512), g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#2A1088"); gr.addColorStop(0.24, "#5226C4"); gr.addColorStop(0.42, "#C445D6"); gr.addColorStop(0.495, "#F07AC8"); gr.addColorStop(0.505, "#2F5FE0"); gr.addColorStop(1, "#1E3FB0");
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512); return canvasTex(c);
};
export const waterTex = () => {
  const c = mkCanvas(512, 512), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256); gr.addColorStop(0, "#3A6BF0"); gr.addColorStop(0.5, "#2F5FE0"); gr.addColorStop(1, "#1E3FB0");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512); g.strokeStyle = "rgba(255,160,230,0.25)"; g.lineWidth = 2;
  for (let r = 40; r < 256; r += 26) { g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); }
  return canvasTex(c);
};
export const moonTex = () => {
  const c = mkCanvas(512, 512), g = c.getContext("2d")!;
  const base = g.createRadialGradient(220, 210, 20, 256, 256, 256); base.addColorStop(0, "#FFF8FC"); base.addColorStop(0.7, "#FBE3F4"); base.addColorStop(1, "#F2C2E8");
  g.fillStyle = base; g.beginPath(); g.arc(256, 256, 254, 0, 7); g.fill();
  for (let i = 0; i < 16; i++) { const x = 90 + rr(i * 0.61) * 330, y = 90 + rr(i * 0.61 + 40) * 330, r = 14 + rr(i * 0.61 + 80) * 46;
    const cg = g.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r); cg.addColorStop(0, "rgba(226,170,214,0)"); cg.addColorStop(0.7, "rgba(226,170,214,.45)"); cg.addColorStop(1, "rgba(255,240,250,0)");
    g.fillStyle = cg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  return canvasTex(c);
};
export const cloudTex = (seed: number) => {
  const c = mkCanvas(1024, 256), g = c.getContext("2d")!;
  g.fillStyle = "#E070D2"; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(60 + i * 66 + rr(i + seed * 13) * 30, 170 - rr(i + 20 + seed * 13) * 70, 50 + rr(i + 40 + seed * 13) * 60, 0, 7); g.fill(); }
  g.fillRect(40, 170, 944, 86); g.globalCompositeOperation = "source-atop";
  const sh = g.createLinearGradient(0, 60, 0, 256); sh.addColorStop(0, "rgba(255,200,240,.55)"); sh.addColorStop(0.45, "rgba(214,90,214,0)"); sh.addColorStop(1, "rgba(90,40,180,.85)");
  g.fillStyle = sh; g.fillRect(0, 0, 1024, 256); g.globalCompositeOperation = "destination-in";
  const fade = g.createLinearGradient(0, 0, 1024, 0); fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(0.12, "rgba(0,0,0,1)"); fade.addColorStop(0.88, "rgba(0,0,0,1)"); fade.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = fade; g.fillRect(0, 0, 1024, 256); return canvasTex(c);
};

// ---------------- outside the bank: pavement, road, shop fronts, bank stone front, sign, sky ----------------
export const pavingTex = (rx: number, ry: number) => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  g.fillStyle = "#E9DCC6"; g.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = rr(i * 7 + j * 3) > 0.5 ? "#F2E6D1" : "#E2D3BB"; g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58); }
  g.strokeStyle = "rgba(120,90,70,.45)"; g.lineWidth = 3; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, 256); g.moveTo(0, k * 64); g.lineTo(256, k * 64); g.stroke(); }
  return rep(canvasTex(c), rx, ry);
};
export const asphaltTex = (rx: number, ry: number) => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  g.fillStyle = "#4E5470"; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 500; k++) { g.fillStyle = rr(k) > 0.5 ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.08)"; g.fillRect(rr(k + 1) * 256, rr(k + 2) * 256, 3, 3); }
  return rep(canvasTex(c), rx, ry);
};
const SHOPS: [string, string, string, string][] = [   // wall, awning, sign text, trim
  ["#FF8A7A", "#FFFFFF", "CAFE", "#C2413A"], ["#7ED9C3", "#FFD23F", "BOOKS", "#1F8C7A"], ["#FFD45C", "#E8283C", "BAKERY", "#B5781B"],
  ["#B79CFF", "#FFFFFF", "FLOWERS", "#6A3FC9"], ["#7CC4FF", "#FF8A3D", "SHOES", "#2F6FBF"], ["#FF9FCB", "#FFFFFF", "SWEETS", "#C2457F"],
];
export const shopTex = (i: number, floors: number) => {
  const [wall, awn, name, trim] = SHOPS[i % SHOPS.length];
  const W = 256, H = 128 * floors + 64, c = mkCanvas(W, H), g = c.getContext("2d")!;
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  g.fillStyle = trim; g.fillRect(0, 0, W, 14);                                           // cornice
  for (let f = 0; f < floors - 1; f++) for (let k = 0; k < 3; k++) {                   // upper windows
    const x = 26 + k * 76, y = 34 + f * 128;
    g.fillStyle = trim; g.fillRect(x - 5, y - 5, 54, 82); g.fillStyle = "#BFE6FF"; g.fillRect(x, y, 44, 72);
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.moveTo(x + 6, y + 60); g.lineTo(x + 30, y + 6); g.lineTo(x + 38, y + 6); g.lineTo(x + 14, y + 60); g.fill();
    g.fillStyle = INK; g.fillRect(x + 20, y, 4, 72); g.fillRect(x - 8, y + 74, 60, 7);
  }
  const by = H - 192;                                                                    // ground floor: sign, awning, shop window, door
  g.fillStyle = trim; g.fillRect(8, by, W - 16, 40); g.fillStyle = "#FFFFFF"; g.font = `900 28px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(name, W / 2, by + 21);
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? awn : trim; g.beginPath(); g.moveTo(8 + k * 30, by + 44); g.lineTo(38 + k * 30, by + 44); g.lineTo(38 + k * 30, by + 70); g.arc(23 + k * 30, by + 70, 15, 0, Math.PI); g.fill(); }
  g.fillStyle = trim; g.fillRect(14, by + 88, 150, 104); g.fillStyle = "#FFE7A8"; g.fillRect(22, by + 96, 134, 96);
  g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.moveTo(30, by + 180); g.lineTo(90, by + 100); g.lineTo(104, by + 100); g.lineTo(44, by + 180); g.fill();
  g.fillStyle = trim; g.fillRect(176, by + 88, 66, 104); g.fillStyle = "#6B3F22"; g.fillRect(184, by + 96, 50, 96); g.fillStyle = "#FFD23F"; g.beginPath(); g.arc(224, by + 146, 5, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
  return canvasTex(c);
};
export const stoneTex = (rx: number, ry: number) => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  g.fillStyle = "#F4E7CC"; g.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { const x = i * 64 + (j % 2) * 32; g.fillStyle = rr(i + j * 5) > 0.5 ? "#F8EDD6" : "#EEDDBC"; g.fillRect(x + 2, j * 32 + 2, 60, 28); if (x + 64 > 256) g.fillRect(x - 256 + 2, j * 32 + 2, 60, 28); }
  g.strokeStyle = "rgba(150,110,70,.4)"; g.lineWidth = 2;
  for (let j = 0; j <= 8; j++) { g.beginPath(); g.moveTo(0, j * 32); g.lineTo(256, j * 32); g.stroke(); }
  return rep(canvasTex(c), rx, ry);
};
export const bankSignTex = () => {
  const c = mkCanvas(512, 128), g = c.getContext("2d")!;
  g.fillStyle = "#5B21B6"; g.beginPath(); g.roundRect(4, 4, 504, 120, 18); g.fill(); g.lineWidth = 8; g.strokeStyle = "#F2B41E"; g.stroke();
  g.fillStyle = "#FFD23F"; g.font = `900 78px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BANK", 256, 68);
  g.beginPath(); g.arc(60, 64, 30, 0, 7); g.arc(452, 64, 30, 0, 7); g.fill(); g.fillStyle = "#5B21B6"; g.font = `900 40px ${SANS}`; g.fillText("$", 60, 66); g.fillText("$", 452, 66);
  return canvasTex(c);
};
export const daySkyTex = () => {                                   // wraps round a big sphere: blue top, pale warm horizon, a few clouds
  const c = mkCanvas(1024, 512), g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#3F8FF0"); gr.addColorStop(0.42, "#8CC8FF"); gr.addColorStop(0.5, "#FFE6B8"); gr.addColorStop(1, "#FFE6B8");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#FFFFFF";
  for (let k = 0; k < 9; k++) { const x = rr(k + 3) * 1024, y = 120 + rr(k + 9) * 90, s = 0.7 + rr(k + 5) * 0.8;
    for (const [dx, dy, r] of [[0, 0, 26], [28, -10, 32], [58, 2, 24], [30, 10, 26]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); g.fill(); } }
  return canvasTex(c);
};

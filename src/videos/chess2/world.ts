// The coffee shop, the chess table, the two seated players, cups, stopwatch, confetti,
// and the fantasy space far away at x = FX. update(t, camera, scene) poses everything for time t (pure function of t).
// v3.1: glass dome / object transition removed (the fantasy now ends by pulling back out of Max's head, see story.ts);
// front-wall decor re-spaced so no two pictures overlap or share a depth (that flickered).
import * as THREE from "three";
import { TONE, twoTone } from "../../engine/post/shade";
import { NOINK } from "../../engine/post/ink";
import { castPaths, loadImages as loadAll, Imgs } from "../../engine/cast/assets";
import { ATTACK, SIGN, CUPS, CONFETTI, V3, Who, Space, camAt, LIFE, SEED, nightAt, duskAt, pieceShow, smooth } from "./story";
import { M, MT, canvasTex, mkCanvas, noInk, lerp, popScale, boardTex, makePiece, HOMES, kindAt, pieceId } from "./kit";
import { Player, buildCast, CastTex } from "../../engine/cast/player";
import { Choreo, makeCafe } from "./choreo";
import { Fantasy } from "./fantasy";

// ---------------- assets from public/library (filled by tools/pick-assets.mjs from cast-sheet.json) ----------------
export const CAST = { arian: { outfit: "casual" }, max: { outfit: "office", hat: "cowboy" } };   // library/wardrobe/<outfit>, library/hats/<hat>
export const ASSET_PATHS = castPaths(CAST);
export type { Imgs };
export const loadImages = () => loadAll(ASSET_PATHS);

const INK = "#241726";

// ---------------- painted textures ----------------
const woodFloor = () => {
  const c = mkCanvas(512, 512), g = c.getContext("2d")!;
  const cols = ["#C0793F", "#B26C34", "#CC8847", "#A9632E"];
  for (let i = 0; i < 8; i++) {
    g.fillStyle = cols[i % 4]; g.fillRect(0, i * 64, 512, 64);
    g.fillStyle = "rgba(60,30,10,.35)"; g.fillRect(0, i * 64, 512, 3);
    for (let k = 0; k < 4; k++) { g.fillRect(((i * 97 + k * 131) % 512), i * 64, 3, 64); }
  }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 3); return t;
};
const rugTex = () => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  g.fillStyle = "#D6453A"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#F6C84C"; g.lineWidth = 10; g.strokeRect(18, 18, 220, 220);
  g.strokeStyle = "#1F7A8C"; g.lineWidth = 6; g.strokeRect(40, 40, 176, 176);
  return canvasTex(c);
};
const glowTex = () => {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,230,170,1)"); gr.addColorStop(1, "rgba(255,200,120,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return canvasTex(c);
};
const sparkTex = () => {                     // soft 4-point sparkle
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 40); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,240,200,.6)"); gr.addColorStop(1, "rgba(255,220,160,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "rgba(255,250,230,.9)";
  for (const r of [0, Math.PI / 2]) { g.save(); g.translate(64, 64); g.rotate(r); g.beginPath(); g.moveTo(-62, 0); g.quadraticCurveTo(0, 4, 62, 0); g.quadraticCurveTo(0, -4, -62, 0); g.fill(); g.restore(); }
  return canvasTex(c);
};
const flameTex = () => {                     // candle flame: white-yellow core, orange edge, teardrop
  const c = mkCanvas(64, 128), g = c.getContext("2d")!;
  const path = () => { g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(46, 40, 56, 78, 44, 104); g.bezierCurveTo(38, 120, 26, 120, 20, 104); g.bezierCurveTo(8, 78, 18, 40, 32, 4); };
  path(); g.fillStyle = "#FF9A2E"; g.fill();
  g.save(); g.translate(32, 84); g.scale(0.62, 0.62); g.translate(-32, -84); path(); g.fillStyle = "#FFE27A"; g.fill(); g.restore();
  g.save(); g.translate(32, 96); g.scale(0.32, 0.32); g.translate(-32, -96); path(); g.fillStyle = "#FFFFFF"; g.fill(); g.restore();
  return canvasTex(c);
};
const brickTex = () => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  g.fillStyle = "#5A241C"; g.fillRect(0, 0, 256, 256);
  const cols = ["#B5503A", "#A8452F", "#C45C42", "#9C3F2E", "#BE5640"];
  for (let r = 0; r < 16; r++) for (let k = -1; k < 9; k++) {
    const x = k * 32 + (r % 2) * 16;
    g.fillStyle = cols[(r * 7 + k * 3 + 20) % 5]; g.fillRect(x + 1.5, r * 16 + 1.5, 29, 13);
    g.fillStyle = "rgba(255,225,190,.14)"; g.fillRect(x + 1.5, r * 16 + 1.5, 29, 3);
  }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
const paperTex = (base: string, mark: string, kind: "diamond" | "dots") => {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, 128, 128); g.fillStyle = mark; g.strokeStyle = mark; g.lineWidth = 3;
  if (kind === "diamond") {
    for (const [x, y] of [[32, 32], [96, 96]]) { g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + 14, y); g.lineTo(x, y + 22); g.lineTo(x - 14, y); g.closePath(); g.fill(); }
    for (const [x, y] of [[96, 32], [32, 96]]) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); }
  } else {
    for (const [x, y, r] of [[20, 20, 9], [84, 52, 9], [52, 100, 9], [116, 116, 6], [8, 84, 5]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
const sunsetWinTex = () => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#5A3AA8"); gr.addColorStop(0.45, "#E8683A"); gr.addColorStop(0.8, "#FFC46A"); gr.addColorStop(1, "#FFE2A8");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const sg = g.createRadialGradient(150, 175, 0, 150, 175, 70); sg.addColorStop(0, "rgba(255,250,220,1)"); sg.addColorStop(0.3, "rgba(255,210,120,.9)"); sg.addColorStop(1, "rgba(255,160,80,0)");
  g.fillStyle = sg; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#3C2F5E";
  for (const [x, w, h] of [[0, 40, 90], [44, 30, 130], [78, 44, 100], [126, 28, 150], [158, 46, 84], [208, 48, 120]]) g.fillRect(x, 256 - h, w, h);
  g.fillStyle = "#FFD27A";
  for (let i = 0; i < 40; i++) { const x = 6 + (i % 10) * 25, y = 130 + Math.floor(i / 10) * 28; if (Math.sin(i * 12.9) > 0.3) g.fillRect(x, y, 6, 8); }
  return canvasTex(c);
};
const windowTex = (night: boolean) => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  if (night) { gr.addColorStop(0, "#070B26"); gr.addColorStop(1, "#2B2F6E"); } else { gr.addColorStop(0, "#8FCBFF"); gr.addColorStop(1, "#FFE2A8"); }
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  if (night) {
    g.fillStyle = "#FFFFFF"; for (let i = 0; i < 40; i++) { const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * 256, y = (Math.sin(i * 33.1) * 0.5 + 0.5) * 150; g.fillRect(x, y, 2, 2); }
    g.fillStyle = "#FFF6D0"; g.beginPath(); g.arc(190, 60, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#2B2F6E"; g.beginPath(); g.arc(198, 54, 18, 0, Math.PI * 2); g.fill();
  } else {
    const sg = g.createRadialGradient(190, 70, 0, 190, 70, 90); sg.addColorStop(0, "rgba(255,250,210,1)"); sg.addColorStop(1, "rgba(255,250,210,0)");
    g.fillStyle = sg; g.fillRect(0, 0, 256, 256);
  }
  g.fillStyle = night ? "#10133A" : "#4A5E8A";
  for (const [x, w, h] of [[0, 40, 90], [44, 30, 130], [78, 44, 100], [126, 28, 150], [158, 46, 84], [208, 48, 120]]) g.fillRect(x, 256 - h, w, h);
  g.fillStyle = night ? "#FFD27A" : "#DCE6FF";
  for (let i = 0; i < 40; i++) { const x = 6 + (i % 10) * 25, y = 130 + Math.floor(i / 10) * 28; if (Math.sin(i * 12.9) > (night ? -0.2 : 0.55)) g.fillRect(x, y, 6, 8); }
  return canvasTex(c);
};
const menuTex = () => {
  const c = mkCanvas(256, 384), g = c.getContext("2d")!;
  g.fillStyle = "#23342E"; g.fillRect(0, 0, 256, 384);
  g.strokeStyle = "#7A4A22"; g.lineWidth = 16; g.strokeRect(8, 8, 240, 368);
  g.fillStyle = "#F4F0DC"; g.strokeStyle = "#F4F0DC"; g.textAlign = "center"; g.font = "bold 40px Arial"; g.fillText("MENU", 128, 66);
  g.lineWidth = 3; g.beginPath(); g.moveTo(50, 80); g.lineTo(206, 80); g.stroke();
  g.font = "bold 24px Arial"; g.textAlign = "left";
  ["COFFEE", "TEA", "CAKE", "JUICE"].forEach((t, i) => { g.fillText(t, 34, 124 + i * 44); g.textAlign = "right"; g.fillText(String(3 + (i % 2)), 222, 124 + i * 44); g.textAlign = "left"; });
  g.lineWidth = 4; g.beginPath(); g.moveTo(98, 330); g.lineTo(98, 350); g.lineTo(150, 350); g.lineTo(150, 330); g.closePath(); g.stroke();
  g.beginPath(); g.arc(158, 340, 9, -1.5, 1.5); g.stroke();
  g.beginPath(); g.moveTo(112, 322); g.quadraticCurveTo(104, 310, 114, 300); g.moveTo(130, 322); g.quadraticCurveTo(122, 308, 132, 296); g.stroke();
  return canvasTex(c);
};
const neonTex = (text: string, col: string) => {
  const c = mkCanvas(512, 160), g = c.getContext("2d")!;
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = "bold 112px Arial Black, Impact, sans-serif"; g.lineJoin = "round";
  g.shadowColor = col; g.shadowBlur = 26; g.strokeStyle = col; g.lineWidth = 14; g.strokeText(text, 256, 82);
  g.shadowBlur = 0; g.fillStyle = "#FFFFFF"; g.fillText(text, 256, 82);
  return canvasTex(c);
};
const clockTex = () => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!; g.lineCap = "round";
  g.fillStyle = "#7A4A22"; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#FFF6DC"; g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.fill();
  g.strokeStyle = INK; g.lineWidth = 7;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.sin(a) * 84, 128 - Math.cos(a) * 84); g.lineTo(128 + Math.sin(a) * 98, 128 - Math.cos(a) * 98); g.stroke(); }
  g.lineWidth = 10; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 - 40, 128 - 34); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 56, 128 - 38); g.stroke();
  return canvasTex(c);
};
const artTex = (kind: number) => {
  const c = mkCanvas(128, 160), g = c.getContext("2d")!;
  g.fillStyle = "#5B3A1E"; g.fillRect(0, 0, 128, 160); g.fillStyle = "#FFF1D2"; g.fillRect(10, 10, 108, 140);
  if (kind === 0) {
    const gr = g.createLinearGradient(0, 10, 0, 150); gr.addColorStop(0, "#F7B05A"); gr.addColorStop(1, "#E8683A"); g.fillStyle = gr; g.fillRect(10, 10, 108, 140);
    g.fillStyle = "#FFE9A8"; g.beginPath(); g.arc(80, 70, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3C2F5E"; g.beginPath(); g.moveTo(10, 150); g.lineTo(46, 90); g.lineTo(70, 125); g.lineTo(96, 80); g.lineTo(118, 150); g.closePath(); g.fill();
  } else if (kind === 1) {
    g.fillStyle = "#8ED1C4"; g.fillRect(10, 10, 108, 140);
    g.fillStyle = "#FFFFFF"; g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(34, 70); g.lineTo(40, 118); g.lineTo(84, 118); g.lineTo(90, 70); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(96, 90, 13, -1.5, 1.5); g.stroke();
    g.beginPath(); g.moveTo(50, 60); g.quadraticCurveTo(42, 46, 52, 34); g.moveTo(70, 60); g.quadraticCurveTo(62, 44, 72, 30); g.stroke();
  } else {
    g.fillStyle = "#F2C94C"; g.fillRect(10, 10, 108, 140);
    g.fillStyle = INK; g.beginPath(); g.moveTo(40, 130); g.lineTo(44, 100); g.quadraticCurveTo(34, 78, 56, 56); g.lineTo(52, 40); g.lineTo(66, 48); g.quadraticCurveTo(100, 54, 92, 100); g.lineTo(88, 130); g.closePath(); g.fill();
    g.fillRect(34, 130, 62, 10);
  }
  return canvasTex(c);
};
const beamTex = () => {
  const c = mkCanvas(64, 256), g = c.getContext("2d")!;
  const v = g.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = v; g.fillRect(0, 0, 64, 256);
  g.globalCompositeOperation = "destination-in";
  const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, "rgba(0,0,0,0)"); h.addColorStop(0.3, "rgba(0,0,0,1)"); h.addColorStop(0.7, "rgba(0,0,0,1)"); h.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = h; g.fillRect(0, 0, 64, 256);
  return canvasTex(c);
};
const signTex = () => {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!;
  g.fillStyle = "#F6C84C"; g.strokeStyle = INK; g.lineWidth = 12;
  g.beginPath(); g.roundRect(10, 40, 236, 176, 28); g.fill(); g.stroke();
  g.fillStyle = INK; g.font = "bold 170px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("∞", 128, 132);
  return canvasTex(c);
};

type PieceObj = { g: THREE.Group; id: string; n: number; spark: THREE.Mesh };

export class ChessWorld {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.6);
  private hemi = new THREE.HemisphereLight("#ffe9c8", "#857a72", 0.6);
  private pieces: PieceObj[] = [];
  private players: Player[] = [];
  private choreo: Choreo;
  private fantasy: Fantasy;
  private cups: { m: THREE.Mesh; i: number }[] = [];
  private confetti: { m: THREE.Mesh; x: number; z: number; ph: number; sp: number; spin: number }[] = [];
  private bulbs: { m: THREE.Mesh; halo: THREE.Mesh }[] = [];
  private windowMat: THREE.MeshBasicMaterial; private nightWin: THREE.MeshBasicMaterial; private duskWin: THREE.MeshBasicMaterial;
  private candles: { flame: THREE.Mesh; glow: THREE.Mesh; pool: THREE.Mesh; ph: number }[] = [];
  private beams: THREE.Mesh[] = []; private pools: THREE.Mesh[] = [];
  private strings: { bulb: THREE.Mesh; halo: THREE.Mesh; ph: number }[] = [];
  private motes: { m: THREE.Mesh; x: number; y: number; z: number; ph: number; sz: number }[] = [];
  private arrow!: { tube: THREE.Mesh; head: THREE.Mesh; curve: THREE.CatmullRomCurve3; segs: number; uB: number; hit: THREE.Vector3 };
  private burst: { m: THREE.Mesh; dir: THREE.Vector3 }[] = []; private ring!: THREE.Mesh; private flash!: THREE.Mesh;
  private sign: THREE.Mesh;
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3();

  constructor(imgs: Imgs) {
    const R = this.root;
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = R) => {
      const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
    };
    const box = (w: number, h: number, d: number, col: string, x: number, yb: number, z: number) => add(new THREE.BoxGeometry(w, h, d), M(col), x, yb + h / 2, z);
    const cyl = (r0: number, r1: number, h: number, col: string, x: number, yb: number, z: number, seg = 18) => add(new THREE.CylinderGeometry(r0, r1, h, seg), M(col), x, yb + h / 2, z);

    R.add(this.hemi, this.sun, this.sun.target);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);

    // ---- room (8 x 6.4 x 3.2 m) ----
    const plane = (w: number, h: number, m: THREE.Material, x: number, y: number, z: number, ry = 0) => {
      const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.y = ry; o.receiveShadow = true; R.add(o); return o;
    };
    const basicCut = (map: THREE.Texture, col = new THREE.Color(1, 1, 1)) => new THREE.MeshBasicMaterial({ map, color: col, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide });
    const floor = add(new THREE.PlaneGeometry(8, 6.4), MT(woodFloor()), 0, 0, 0); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
    const ceil = add(new THREE.PlaneGeometry(8, 6.4), M("#F3E9D8"), 0, 3.2, 0); ceil.rotation.x = Math.PI / 2; ceil.castShadow = false;
    const brick = brickTex();
    const brickMat = (w: number, h: number) => { const t = brick.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 2, h / 2); return MT(t); };
    const wallBox = (w: number, h: number, x: number, yb: number) => add(new THREE.BoxGeometry(w, h, 0.2), brickMat(w, h), x, yb + h / 2, -3.3);
    wallBox(2.3, 3.2, -2.85, 0); wallBox(2.3, 3.2, 2.85, 0); wallBox(3.4, 0.95, 0, 0); wallBox(3.4, 0.6, 0, 2.6);
    const sideMat = (len: number) => { const t = paperTex("#2B8F7B", "#49B39C", "diamond"); t.repeat.set(len / 1.0, 3.2 / 1.0); return MT(t); };
    const wl = add(new THREE.PlaneGeometry(6.4, 3.2), sideMat(6.4), -4, 1.6, 0); wl.rotation.y = Math.PI / 2; wl.castShadow = false;
    const wr = add(new THREE.PlaneGeometry(6.4, 3.2), sideMat(6.4), 4, 1.6, 0); wr.rotation.y = -Math.PI / 2; wr.castShadow = false;
    const frontT = paperTex("#E8A33D", "#F5C46A", "dots"); frontT.repeat.set(8 / 1.0, 3.2 / 1.0);
    const wf = add(new THREE.PlaneGeometry(8, 3.2), MT(frontT), 0, 1.6, 3.2); wf.rotation.y = Math.PI; wf.castShadow = false;
    box(8, 0.9, 0.06, "#8A4B24", 0, 0, -3.17); box(8, 0.9, 0.06, "#7A3F1E", 0, 0, 3.17);
    box(0.06, 0.9, 6.4, "#8A4B24", -3.97, 0, 0); box(0.06, 0.9, 6.4, "#8A4B24", 3.97, 0, 0);
    box(8, 0.05, 0.09, "#5B3A1E", 0, 0.9, -3.15); box(8, 0.05, 0.09, "#5B3A1E", 0, 0.9, 3.15);
    box(0.09, 0.05, 6.4, "#5B3A1E", -3.95, 0.9, 0); box(0.09, 0.05, 6.4, "#5B3A1E", 3.95, 0.9, 0);
    for (const bz of [-1.7, 1.7]) box(8, 0.14, 0.2, "#6B3F22", 0, 3.06, bz);       // no beam above the table: the top-down camera needs the room
    // window: day sky and a night sky that fades in over it
    this.windowMat = new THREE.MeshBasicMaterial({ map: windowTex(false), color: new THREE.Color(1.5, 1.4, 1.2) });
    const win = add(new THREE.PlaneGeometry(3.2, 1.6), this.windowMat, 0, 1.8, -3.15); win.castShadow = false; noInk(win);
    this.nightWin = new THREE.MeshBasicMaterial({ map: windowTex(true), transparent: true, opacity: 0, depthWrite: false });
    const nwin = add(new THREE.PlaneGeometry(3.2, 1.6), this.nightWin, 0, 1.8, -3.14); nwin.castShadow = false; noInk(nwin);
    this.duskWin = new THREE.MeshBasicMaterial({ map: sunsetWinTex(), transparent: true, opacity: 0, depthWrite: false, color: new THREE.Color(1.4, 1.25, 1.15) });
    const dwin = add(new THREE.PlaneGeometry(3.2, 1.6), this.duskWin, 0, 1.8, -3.135); dwin.castShadow = false; noInk(dwin);
    box(3.4, 0.1, 0.12, "#5B3A1E", 0, 2.6, -3.12); box(3.4, 0.1, 0.12, "#5B3A1E", 0, 0.95, -3.12);
    box(0.1, 1.75, 0.12, "#5B3A1E", -1.65, 0.9, -3.12); box(0.1, 1.75, 0.12, "#5B3A1E", 1.65, 0.9, -3.12);
    box(0.06, 1.65, 0.1, "#5B3A1E", 0, 0.95, -3.1); box(3.2, 0.05, 0.1, "#5B3A1E", 0, 1.8, -3.1);
    box(3.8, 0.06, 0.3, "#6B3F22", 0, 0.92, -3.0);
    for (const [px, c] of [[-1.2, "#C8503A"], [-0.7, "#E8A33D"], [1.0, "#C8503A"]] as const) { cyl(0.08, 0.06, 0.12, c, px, 0.98, -3.0); add(new THREE.SphereGeometry(0.1, 12, 9), M("#2FA84F"), px, 1.18, -3.0); }
    for (const cx of [-2.0, 2.0]) { box(0.55, 2.05, 0.1, "#D6453A", cx, 0.75, -3.0); box(0.5, 0.08, 0.14, "#5B3A1E", cx, 2.8, -3.0); }
    for (const sx of [-2.8, 2.8]) {
      box(1.5, 0.06, 0.3, "#6B3F22", sx, 1.55, -3.0); box(1.5, 0.06, 0.3, "#6B3F22", sx, 2.15, -3.0);
      ["#E83A2E", "#F6C84C", "#3A7BE8", "#FFFFFF", "#7A3FD0", "#E8683A"].forEach((c, i) => { cyl(0.07, 0.055, 0.12, c, sx - 0.6 + i * 0.24, 1.58, -3.0); cyl(0.07, 0.055, 0.12, c, sx - 0.55 + i * 0.22, 2.18, -3.0); });
      ["#2F6FD0", "#E8683A", "#2FA84F", "#F6C84C", "#7A3FD0"].forEach((c, i) => box(0.07, 0.24 + (i % 2) * 0.05, 0.2, c, sx - 0.5 + i * 0.1, 2.21, -3.0));
    }
    plane(0.5, 0.62, MT(artTex(0)), -2.8, 2.72, -3.09); plane(0.5, 0.62, MT(artTex(2)), 2.8, 2.72, -3.09);
    // front wall (behind Arian): counter with cakes, chalk menu, clock, paintings, neon.
    // Each item has its own space (no overlaps) and its own depth (no flicker):
    //   neon x -2.35..-0.85 y 2.07..2.53 | paintings x -0.8..0.9 y 1.44..2.06 | clock x -0.06..0.56 y 2.19..2.81 | menu x 1.4..2.4
    box(3.2, 1.05, 0.7, "#6B3F22", -1.6, 0, 2.8); box(3.3, 0.06, 0.8, "#D8A15E", -1.6, 1.05, 2.8);
    box(0.7, 0.45, 0.4, "#C7CBD6", -2.4, 1.11, 2.85); box(0.5, 0.12, 0.3, "#E83A2E", -2.4, 1.56, 2.85); cyl(0.04, 0.04, 0.18, "#C7CBD6", -2.4, 1.38, 2.7, 8);
    cyl(0.14, 0.14, 0.3, "#3A7BE8", -1.2, 1.11, 2.85); cyl(0.12, 0.12, 0.26, "#F6C84C", -0.8, 1.11, 2.8);
    cyl(0.2, 0.2, 0.03, "#FFFFFF", -1.7, 1.11, 2.55); cyl(0.17, 0.17, 0.1, "#F28AB8", -1.7, 1.14, 2.55); add(new THREE.SphereGeometry(0.03, 8, 6), M("#E83A2E"), -1.7, 1.27, 2.55);
    plane(1.0, 1.5, MT(menuTex()), 1.9, 1.9, 3.14, Math.PI);
    plane(0.62, 0.62, MT(clockTex()), 0.25, 2.5, 3.125, Math.PI);
    plane(0.5, 0.62, MT(artTex(0)), -0.55, 1.75, 3.135, Math.PI); plane(0.5, 0.62, MT(artTex(1)), 0.05, 1.75, 3.135, Math.PI); plane(0.5, 0.62, MT(artTex(2)), 0.65, 1.75, 3.135, Math.PI);
    const mkNeon = (text: string, col: string, hdr: THREE.Color, w: number, x: number, y: number, z: number, ry: number) => {
      const o = plane(w, w * 160 / 512, basicCut(neonTex(text, col), hdr), x, y, z, ry); o.castShadow = false; return o;
    };
    mkNeon("COFFEE", "#FF3D8B", new THREE.Color(2.6, 1.9, 2.2), 1.5, -1.6, 2.3, 3.115, Math.PI);
    mkNeon("OPEN", "#3DE0FF", new THREE.Color(1.8, 2.4, 2.6), 0.9, -3.91, 1.9, -0.5, Math.PI / 2);
    // pendant lamps (not above the table)
    const glow = glowTex();
    for (const lx of [-1.5, 1.5]) {
      cyl(0.01, 0.01, 0.8, INK, lx, 2.4, 0.0, 6);
      add(new THREE.ConeGeometry(0.34, 0.26, 20, 1, true), twoTone(new THREE.MeshLambertMaterial({ color: "#E8683A", side: THREE.DoubleSide })), lx, 2.35, 0.0);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1.8) }));
      bulb.position.set(lx, 2.24, 0); noInk(bulb); R.add(bulb);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
      halo.position.set(lx, 2.24, 0.02); noInk(halo); R.add(halo);
      this.bulbs.push({ m: bulb, halo });
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4, color: new THREE.Color(1.2, 0.75, 0.35) }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(lx, 0.03, 0); noInk(pool); R.add(pool); this.pools.push(pool);
    }
    // string lights
    const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1.6) });
    for (const zz of [-3.02, 3.02]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) {
        const u = i / 16, x = -3.9 + u * 7.8, y = 3.0 - 0.28 * Math.sin(u * Math.PI);
        pts.push(new THREE.Vector3(x, y, zz));
        if (i < 16) {
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bulbMat.clone()); bulb.position.set(x + 0.2, y - 0.05, zz); noInk(bulb); R.add(bulb);
          const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6, color: new THREE.Color(1.0, 0.8, 0.5) }));
          halo.position.copy(bulb.position); noInk(halo); R.add(halo); this.strings.push({ bulb, halo, ph: i * 1.7 + zz });
        }
      }
      R.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: INK })));
    }
    // bunting
    const flagCols = ["#E83A2E", "#F6C84C", "#3A7BE8", "#2FA84F", "#7A3FD0", "#FF7AB6"];
    for (let i = 0; i < 18; i++) {
      const u = (i + 0.5) / 18, x = -3.8 + u * 7.6, y = 2.95 - 0.22 * Math.sin(u * Math.PI);
      const f = add(new THREE.ConeGeometry(0.09, 0.2, 3), M(flagCols[i % 6]), x, y - 0.1, 2.2); f.rotation.z = Math.PI; f.castShadow = false;
    }
    // hanging plants, floor lamp, bookshelf, other tables, corner plants
    for (const [hx, hz] of [[-2.2, -2.3], [2.5, 2.2]] as const) {
      cyl(0.008, 0.008, 0.9, INK, hx, 2.3, hz, 6); cyl(0.14, 0.1, 0.16, "#C8503A", hx, 2.15, hz);
      add(new THREE.SphereGeometry(0.22, 12, 9), M("#2FA84F"), hx, 2.3, hz);
      for (const k of [-1, 0, 1]) cyl(0.012, 0.012, 0.5 + 0.12 * k * k, "#2FA84F", hx + 0.1 * k, 1.65, hz + 0.08 * k, 6);
    }
    cyl(0.025, 0.025, 1.5, "#3A2A20", 3.5, 0, -2.1, 8); cyl(0.2, 0.2, 0.04, "#3A2A20", 3.5, 0, -2.1);
    add(new THREE.ConeGeometry(0.26, 0.3, 18, 1, true), twoTone(new THREE.MeshLambertMaterial({ color: "#F6C84C", side: THREE.DoubleSide })), 3.5, 1.65, -2.1);
    {
      const fb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1.8) })); fb.position.set(3.5, 1.58, -2.1); noInk(fb); R.add(fb);
      const h = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 })); h.position.set(3.5, 1.58, -2.0); noInk(h); R.add(h);
      this.bulbs.push({ m: fb, halo: h });
    }
    box(0.35, 1.9, 1.6, "#6B3F22", 3.8, 0, 1.0);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 9; k++) box(0.22, 0.28 + ((k * 7 + r) % 3) * 0.04, 0.05, ["#2F6FD0", "#E8683A", "#2FA84F", "#F6C84C", "#7A3FD0", "#D6453A"][(k + r * 2) % 6], 3.70, 0.1 + r * 0.45, 0.35 + k * 0.145);
    for (let r = 0; r < 5; r++) box(0.4, 0.03, 1.6, "#4A2B14", 3.78, 0.07 + r * 0.45, 1.0);
    for (const [tx, tz] of [[-2.7, -1.7], [2.8, 1.4], [-2.9, 0.9]] as const) {
      cyl(0.4, 0.4, 0.05, "#D8A15E", tx, 0.72, tz); cyl(0.05, 0.05, 0.72, "#3A2A20", tx, 0, tz); cyl(0.22, 0.22, 0.04, "#3A2A20", tx, 0, tz);
      cyl(0.05, 0.05, 0.09, "#FFFFFF", tx + 0.1, 0.77, tz); cyl(0.02, 0.02, 0.12, "#2FA84F", tx - 0.12, 0.77, tz, 6); add(new THREE.SphereGeometry(0.05, 8, 6), M("#FF7AB6"), tx - 0.12, 0.92, tz);
      for (const sx of [-0.62, 0.62]) { cyl(0.2, 0.2, 0.06, "#E83A2E", tx + sx, 0.42, tz); cyl(0.04, 0.04, 0.42, "#3A2A20", tx + sx, 0, tz, 8); }
    }
    // candles (reference 16.4): wax stick on a gold saucer, flame sprite, glow 3-4x the flame, warm pool, short warm point light
    {
      const fl = flameTex();
      const candle = (x: number, y: number, z: number, h = 0.09, ph = 0) => {
        cyl(0.045, 0.05, 0.012, "#E1BB1B", x, y, z, 20);
        cyl(0.018, 0.019, h, "#FFF4DC", x, y + 0.012, z, 14);
        const top = y + 0.012 + h;
        const flame = new THREE.Mesh(new THREE.PlaneGeometry(0.032, 0.064), new THREE.MeshBasicMaterial({ map: fl, transparent: true, depthWrite: false, color: new THREE.Color(1.7, 1.35, 0.95) }));
        flame.position.set(x, top + 0.024, z); flame.frustumCulled = false; noInk(flame); R.add(flame);
        const glowM = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85, color: new THREE.Color(1.6, 1.0, 0.5) }));
        glowM.position.set(x, top + 0.024, z); glowM.frustumCulled = false; noInk(glowM); R.add(glowM);
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35, color: new THREE.Color(1.2, 0.7, 0.3) }));
        pool.rotation.x = -Math.PI / 2; pool.position.set(x, y + 0.004, z); noInk(pool); R.add(pool);
        this.candles.push({ flame, glow: glowM, pool, ph });
      };
      for (const [tx, tz] of [[-2.7, -1.7], [2.8, 1.4], [-2.9, 0.9]] as const) candle(tx + 0.02, 0.77, tz + 0.16, 0.09, tx * 3.1);
      candle(0.5, 0.78, 0.5, 0.085, 1.3);                      // on the chess table, Arian's right corner
      candle(-1.0, 1.11, 2.62, 0.12, 2.2);                     // on the counter
    }
    for (const [px, pz] of [[3.5, -2.7], [-3.5, 2.6], [-3.5, -2.8]] as const) {
      cyl(0.28, 0.2, 0.4, "#C8503A", px, 0, pz); add(new THREE.SphereGeometry(0.42, 14, 10), M("#2FA84F"), px, 0.85, pz); add(new THREE.SphereGeometry(0.26, 12, 9), M("#3FC25F"), px + 0.18, 1.25, pz);
    }
    // light shafts + dust motes
    const bt = beamTex(), sunDir = new THREE.Vector3(-1.2, -2.9, 7).normalize();
    const topY = 2.45, botY = 0.03, tt = (topY - botY) / -sunDir.y, off = sunDir.clone().multiplyScalar(tt);
    for (const [x0, x1] of [[-1.55, -0.85], [-0.75, -0.08], [0.08, 0.75], [0.85, 1.55]] as const) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute([x0, topY, -3.1, x1, topY, -3.1, x1 + off.x, botY, -3.1 + off.z, x0 + off.x, botY, -3.1 + off.z], 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: bt, color: new THREE.Color(1.5, 1.15, 0.65), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.2 }));
      m.frustumCulled = false; noInk(m); R.add(m); this.beams.push(m);
    }
    const rr = (k: number) => { const x = Math.sin(k * 127.1) * 43758.5453; return x - Math.floor(x); };
    // floating dust sparkles (reference 16.3): soft white-gold dots, slow drift, a few bigger 4-point twinkles; day and night
    const spk = sparkTex(), glowS = glowTex();
    for (let i = 0; i < 110; i++) {
      const big = i % 9 === 0, sz = big ? 0.05 : 0.018 + rr(i + 333) * 0.014;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: big ? spk : glowS, color: new THREE.Color(1.6, 1.35, 0.95), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.frustumCulled = false; noInk(m); R.add(m);
      this.motes.push({ m, x: (rr(i + 1) - 0.5) * 3.6, y: 0.3 + rr(i + 60) * 2.3, z: -2.6 + rr(i + 120) * 5.2, ph: rr(i + 200) * 6.28, sz });
    }

    // ---- main table: rug, cloth to the floor, wooden top, board, pieces ----
    const rug = add(new THREE.PlaneGeometry(3.2, 3.2), MT(rugTex()), 0, 0.01, 0); rug.rotation.x = -Math.PI / 2; rug.castShadow = false;
    box(1.1, 0.74, 1.1, "#3A7BE8", 0, 0, 0); box(1.24, 0.05, 1.24, "#7A4A22", 0, 0.73, 0);
    const bd = add(new THREE.PlaneGeometry(0.8, 0.8), MT(boardTex()), 0, 0.783, 0); bd.rotation.x = -Math.PI / 2; bd.castShadow = false;
    for (const e of [-0.42, 0.42]) { box(0.88, 0.012, 0.04, "#3A2A20", 0, 0.78, e); box(0.04, 0.012, 0.8, "#3A2A20", e, 0.78, 0); }
    const spk2 = sparkTex();
    HOMES.forEach(([i, j], n) => {
      const side = j >= 6 ? 1 : -1;
      const g = makePiece(kindAt(i, j), side === 1 ? "#FFF6E0" : "#2B2233", side, false);
      const spark = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: spk2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.8, 1.5, 1.0) }));
      spark.visible = false; spark.frustumCulled = false; noInk(spark); R.add(spark);
      R.add(g); this.pieces.push({ g, id: pieceId(i, j), n, spark });
    });
    const cupCols = ["#E83A2E", "#F6C84C", "#7A3FD0", "#FFFFFF", "#3A7BE8", "#E8683A", "#2FA84F"];
    const cupPos: [number, number][] = [[-0.5, -0.44], [0.5, -0.44], [-0.52, 0.3], [0.56, 0.22], [-0.3, 0.55], [0.27, -0.55], [0.54, -0.05]];
    for (let i = 0; i < CUPS.count; i++) {
      const m = add(new THREE.CylinderGeometry(0.04, 0.03, 0.07, 14), M(cupCols[i]), cupPos[i][0], 0.815, cupPos[i][1]);
      m.visible = false; this.cups.push({ m, i });
    }

    // ---- players: seated layered cards on stools, stick legs bent under the table (no pants) ----
    const SEAT = 0.47;
    const cast: Record<Who, CastTex> = { arian: buildCast(imgs, "arian"), max: buildCast(imgs, "max") };
    const limb = (a: V3, b: V3, r: number) => {
      const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), new THREE.MeshBasicMaterial({ color: "#2A1A1E" }));
      m.position.copy(va).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      noInk(m); R.add(m);
    };
    for (const [who, z, facing] of [["arian", 0.95, -1], ["max", -0.95, 1]] as const) {
      this.players.push(new Player(R, cast[who], who, [0, SEAT, z], facing, true, { life: LIFE[who], seed: SEED[who] }));
      for (const lx of [-0.08, 0.08]) {                                  // bare ink-stroke legs (same width as the arms)
        const hip: V3 = [lx, SEAT, z], knee: V3 = [lx * 1.2, SEAT + 0.02, z + facing * 0.34], ank: V3 = [lx * 1.2, 0.05, z + facing * 0.36];
        limb(hip, knee, 0.012); limb(knee, ank, 0.012);
        const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 4, 8), new THREE.MeshBasicMaterial({ color: "#2A1A1E" }));
        foot.rotation.x = Math.PI / 2; foot.position.set(lx * 1.2, 0.02, z + facing * 0.39); noInk(foot); R.add(foot);
      }
      cyl(0.26, 0.26, 0.07, "#E83A2E", 0, SEAT - 0.07, z);
      for (const [dx, dz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) cyl(0.022, 0.028, SEAT - 0.07, "#3A2A20", dx, 0, z + dz, 8);
    }
    const rest: Record<string, V3> = {};
    for (const p of this.players) for (const h of ["L", "R"] as const) rest[`${p.who}:${h}`] = p.restHand(h);
    this.choreo = makeCafe(rest);

    // ---- attack arrow (Max's planned attack, queen -> Arian's king), lying just above the board; Arian's pawn breaks it ----
    {
      const Y = 0.8, B = new THREE.Vector3(-0.05, Y, 0.15);               // square [3,5]: where the blocking pawn lands
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.05, Y, -0.27), new THREE.Vector3(-0.075, Y, -0.06), B, new THREE.Vector3(0.035, Y, 0.29)]);
      const segs = 120;
      const dash = mkCanvas(256, 8), dg = dash.getContext("2d")!;
      for (let k = 0; k < 8; k++) { dg.fillStyle = "#fff"; dg.fillRect(k * 32, 0, 22, 8); }
      const dt = canvasTex(dash); dt.wrapS = THREE.RepeatWrapping; dt.repeat.set(3, 1);
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 0.06, 0.05), map: dt, alphaTest: 0.5, transparent: true, depthWrite: true });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.012, 8, false), mat);
      tube.frustumCulled = false; noInk(tube); tube.visible = false; R.add(tube);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.075, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 0.06, 0.05), transparent: true, depthWrite: true }));
      noInk(head); head.visible = false; R.add(head);
      let uB = 0, best = 9;
      for (let k = 0; k <= 400; k++) { const d = curve.getPoint(k / 400).distanceTo(B); if (d < best) { best = d; uB = k / 400; } }
      this.arrow = { tube, head, curve, segs, uB, hit: B.clone().setY(Y + 0.035) };
      const spk = sparkTex(), gl = glowTex();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + 0.3 * Math.sin(i * 7.1);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: i % 3 ? gl : spk, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: i % 2 ? new THREE.Color(2.4, 0.6, 0.4) : new THREE.Color(2.2, 1.9, 1.4) }));
        m.visible = false; m.frustumCulled = false; noInk(m); R.add(m);
        this.burst.push({ m, dir: new THREE.Vector3(Math.cos(a), 0.6 + 0.5 * ((i * 0.37) % 1), Math.sin(a)) });
      }
      this.ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 1.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false; noInk(this.ring); R.add(this.ring);
      this.flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: spk, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(2.5, 2.2, 1.8) }));
      this.flash.visible = false; noInk(this.flash); R.add(this.flash);
    }
    // ---- sign ----
    this.sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: signTex(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }));
    this.sign.rotation.x = -Math.PI / 2; this.sign.rotation.z = 0.35; noInk(this.sign); this.sign.visible = false; R.add(this.sign);
    // ---- confetti ----
    const ccols = ["#E83A2E", "#F6C84C", "#3A7BE8", "#2FA84F", "#7A3FD0", "#FF7AB6"].map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.06), ccols[i % 6]); noInk(m); m.visible = false; R.add(m);
      this.confetti.push({ m, x: (rr(i + 1) - 0.5) * 1.1, z: (rr(i + 50) - 0.5) * 1.1, ph: rr(i + 99) * 1.2, sp: 0.5 + rr(i + 7) * 0.5, spin: 4 + rr(i + 3) * 8 });
    }
    // ---- fantasy space ----
    this.fantasy = new Fantasy(cast);
    R.add(this.fantasy.root);
  }

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, pose?: ReturnType<typeof camAt> | { pos: V3; look: V3; fov: number; blur: number; space: Space; shot: number }) {
    // ---- camera (pose override = the outgoing shot underneath a dissolve) ----
    const c = pose ?? camAt(t);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 80; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    cam.getWorldDirection(this.fwd);
    const night = nightAt(t), dusk = duskAt(t);
    scene.background = new THREE.Color("#1B1020");

    // ---- light rig. Shade = a darker, slightly cooler copy of the surface colour (no purple tint) ----
    TONE.uLitCol.value.set(lerp(lerp(1.7, 0.6, night), 1.95, dusk * 0.7), lerp(lerp(1.52, 0.7, night), 1.2, dusk * 0.7), lerp(lerp(1.12, 1.25, night), 0.72, dusk * 0.7));
    TONE.uShadeCol.value.set(lerp(0.62, 0.32, night), lerp(0.6, 0.34, night), lerp(0.64, 0.5, night));
    TONE.uShadeLift.value.set(lerp(0.035, 0.03, night), lerp(0.03, 0.035, night), lerp(0.04, 0.06, night));
    TONE.uLambert.value = 0.4; TONE.uSideK.value = 0.84; TONE.uTerm.value = 0.25; TONE.uBounce.value.set(0.04, 0.025, 0.0); TONE.uSat.value = 1.3;
    this.sun.color.setRGB(lerp(1.0, 0.55, night), lerp(0.9, 0.65, night), lerp(0.72, 1.0, night)); this.sun.intensity = lerp(2.8, 1.2, night);
    this.sun.position.set(1.2, 3.4, -7.0); this.sun.target.position.set(0, 0.5, 0);
    const sc = this.sun.shadow.camera; sc.left = -4.5; sc.right = 4.5; sc.top = 4.5; sc.bottom = -4.5; sc.near = 1; sc.far = 18; sc.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.03;
    this.windowMat.color.setRGB(lerp(1.5, 0.12, night), lerp(1.4, 0.17, night), lerp(1.2, 0.45, night));
    this.nightWin.opacity = night; this.duskWin.opacity = dusk;
    for (const bm of this.beams) { const m = bm.material as THREE.MeshBasicMaterial; m.opacity = lerp(lerp(0.2, 0.05, night), 0.32, dusk); m.color.setRGB(lerp(lerp(1.5, 0.5, night), 1.9, dusk), lerp(lerp(1.15, 0.65, night), 0.9, dusk), lerp(lerp(0.65, 1.2, night), 0.4, dusk)); }
    for (const pl of this.pools) (pl.material as THREE.MeshBasicMaterial).opacity = lerp(0.4, 0.8, night);
    for (const b of this.bulbs) {
      (b.m.material as THREE.MeshBasicMaterial).color.setRGB(lerp(4, 6, night), lerp(3, 4.4, night), lerp(1.8, 2.4, night));
      (b.halo.material as THREE.MeshBasicMaterial).opacity = lerp(0.5, 0.95, night);
      b.halo.quaternion.copy(cam.quaternion);
    }
    for (const sl of this.strings) {
      const k = (0.75 + 0.25 * Math.sin(t * 2.2 + sl.ph)) * lerp(1, 1.5, night);
      (sl.bulb.material as THREE.MeshBasicMaterial).color.setRGB(4 * k, 3 * k, 1.6 * k);
      (sl.halo.material as THREE.MeshBasicMaterial).opacity = 0.5 * k; sl.halo.quaternion.copy(cam.quaternion);
    }
    for (const mo of this.motes) {
      mo.m.position.set(mo.x + 0.15 * Math.sin(t * 0.4 + mo.ph), mo.y + 0.1 * Math.sin(t * 0.3 + mo.ph * 2), mo.z + 0.15 * Math.cos(t * 0.35 + mo.ph));
      const tw = 0.55 + 0.45 * Math.sin(t * 2.1 + mo.ph * 3);
      mo.m.quaternion.copy(cam.quaternion); mo.m.scale.setScalar(mo.sz * (0.8 + 0.3 * tw));
      (mo.m.material as THREE.MeshBasicMaterial).opacity = lerp(0.75, 0.5, night) * tw;
    }
    for (const cd of this.candles) {
      const fk = 0.88 + 0.08 * Math.sin(t * 11 + cd.ph) + 0.05 * Math.sin(t * 23.7 + cd.ph * 2);
      cd.flame.quaternion.copy(cam.quaternion); cd.flame.scale.set(1 + 0.05 * Math.sin(t * 9 + cd.ph), fk, 1);
      cd.glow.quaternion.copy(cam.quaternion); (cd.glow.material as THREE.MeshBasicMaterial).opacity = (0.6 + 0.3 * night + 0.15 * dusk) * fk;
      (cd.pool.material as THREE.MeshBasicMaterial).opacity = (0.3 + 0.35 * night) * fk;
    }

    // ---- players, hands and pieces (café) ----
    const hands = this.choreo.hands(t);
    const ds = this.players.map((p) => cam.position.distanceTo(new THREE.Vector3(...p.restHand("R"))));
    this.players.forEach((p, i) => {
      p.hand.L = hands[`${p.who}:L`]; p.hand.R = hands[`${p.who}:R`];
      p.update(t, cam, night, ds[i] > ds[1 - i] ? 100 : 110);       // the farther card draws first
    });
    for (const p of this.pieces) {
      const pos = this.choreo.pieceAt(p.id, t), sh = pieceShow(p.n, t);
      p.g.visible = sh.s > 0.003; p.g.position.set(pos[0], pos[1] + sh.lift, pos[2]);
      p.g.scale.setScalar(Math.max(sh.s, 0.001)); p.g.rotation.y = sh.spin;
      p.spark.visible = sh.spark > 0.01;
      if (p.spark.visible) {
        p.spark.position.set(pos[0], pos[1] + 0.04, pos[2]); p.spark.quaternion.copy(cam.quaternion);
        p.spark.scale.setScalar(0.03 + 0.12 * sh.spark); (p.spark.material as THREE.MeshBasicMaterial).opacity = sh.spark;
      }
    }

    // ---- cups (hours pass) ----
    for (const cu of this.cups) {
      const a = CUPS.a + cu.i * ((CUPS.b - CUPS.a) / CUPS.count);
      const s = t < a ? 0 : smooth(0, 1, Math.min(1, (t - a) / 0.25)) * (1 - smooth(CUPS.b, CUPS.fadeEnd, t));
      cu.m.visible = s > 0.02; cu.m.scale.setScalar(Math.max(s, 0.001));
    }
    // ---- attack arrow: draws from the queen toward Arian's king, breaks where the pawn lands, the rest pulls back and fades ----
    {
      const A = this.arrow, draw = smooth(ATTACK.draw, ATTACK.drawEnd, t);
      const broken = t >= ATTACK.block, back = smooth(ATTACK.block + 0.25, ATTACK.gone, t);
      const u = broken ? A.uB * 0.93 * (1 - back) : draw;
      const on = t >= ATTACK.draw && u > 0.01 && t < ATTACK.gone;
      A.tube.visible = on;
      if (on) {
        A.tube.geometry.setDrawRange(0, Math.floor(u * A.segs) * 8 * 6);
        const flick = broken ? 0.75 + 0.25 * Math.sin(t * 60) : 1;
        (A.tube.material as THREE.MeshBasicMaterial).color.setRGB(1.25 * flick, 0.06 * flick, 0.05 * flick);
        ((A.tube.material as THREE.MeshBasicMaterial).map as THREE.Texture).offset.x = -t * 1.6;    // dashes run toward the king
      }
      A.head.visible = on && !broken;
      if (A.head.visible) {
        const p = A.curve.getPoint(Math.max(u, 0.02)), d = A.curve.getTangent(Math.max(u, 0.02));
        A.head.position.copy(p).addScaledVector(d, 0.02); A.head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      }
      const k = (t - ATTACK.block) / 0.5, bon = k >= 0 && k < 1;
      for (const b of this.burst) {
        b.m.visible = bon;
        if (!bon) continue;
        const r = 0.16 * (1 - (1 - k) * (1 - k));
        b.m.position.copy(A.hit).add(new THREE.Vector3(b.dir.x * r, b.dir.y * r * 0.7 - 0.1 * k * k, b.dir.z * r));
        b.m.quaternion.copy(cam.quaternion); b.m.scale.setScalar(0.045 * (1 - k * 0.6)); (b.m.material as THREE.MeshBasicMaterial).opacity = 1 - k;
      }
      this.ring.visible = bon; this.flash.visible = k >= 0 && k < 0.45;
      if (bon) { this.ring.position.copy(A.hit).setY(0.79); this.ring.scale.setScalar(0.02 + 0.16 * Math.sqrt(k)); (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k); }
      if (this.flash.visible) { const f = k / 0.45; this.flash.position.copy(A.hit); this.flash.quaternion.copy(cam.quaternion); this.flash.scale.setScalar(0.08 + 0.22 * Math.sin(Math.PI * Math.min(1, f * 1.4))); (this.flash.material as THREE.MeshBasicMaterial).opacity = 1 - f; }
    }
    const ss = popScale(t, SIGN.a, SIGN.b);
    this.sign.visible = ss > 0.02; this.sign.position.set(...SIGN.pos); this.sign.scale.set(SIGN.size * ss, SIGN.size * ss, 1);
    const on = t >= CONFETTI.a && t < CONFETTI.b;
    for (const cf of this.confetti) {
      cf.m.visible = on;
      if (!on) continue;
      const u = ((t - CONFETTI.a) * cf.sp * 0.5 + cf.ph) % 1.4;
      cf.m.position.set(cf.x + 0.05 * Math.sin(t * 3 + cf.ph * 9), 1.9 - u * 1.1, cf.z);
      cf.m.rotation.set(t * cf.spin, t * cf.spin * 0.7, 0);
      cf.m.scale.setScalar(u > 1.15 ? 0.001 : 1);
    }

    // ---- fantasy space ----
    this.fantasy.update(t, cam);

    // ---- focus distance + blur strength (blur grows with distance from the focus plane, handled by the lens pass) ----
    const focus = Math.max(0.3, this.v.set(...c.look).sub(cam.position).dot(this.fwd));
    return { focus, cInf: c.blur };
  }
}

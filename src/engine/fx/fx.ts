// Effects kit (R3KNRF, 2026-11-11): flat 2D cartoon effects placed in the 3D scene, like the reference (sparkles on
// impact, dust puffs, speed lines, dizzy stars, music notes, splashes, impact bursts). Drawn once on canvases in our
// style (ink #2B1C1A outline, flat colours), shown as camera-facing cards. They write depth, so the lens blur keeps them
// as sharp as the thing they sit on. They move on ones (a new pose every frame), no line boil.
//
//   world.ts constructor:  this.fx = new Fx(this.root, FX);          update():  this.fx.update(t, cam);
//   story.ts:  export const FX: FxEvent[] = [
//     { kind: "burst",   t: 12.4, at: [0, 1.1, 0.3] },                        // a hit lands (pair with a camera kick)
//     { kind: "sparkle", t: 20.1, at: () => max.headWorld().toArray() as V3 },  // follow a person / prop with a function
//     { kind: "dust",    t: 31.0, at: [1, 0, 2], size: 0.25 },                  // small: a big puff hides the person
//     { kind: "speed",   t: 5.0, dur: 1.2, at: [0, 1, 0], dir: 0 },             // dir = screen angle of the MOVE (0 = right, 90 = up)
//     { kind: "stars",   t: 40, dur: 2, at: [0, 1.6, 0] }, { kind: "notes", t: 8, dur: 2, at: [0, 1.5, 0] },
//     { kind: "splash",  t: 50, at: [0, 0, 0], color: "#7FD3F0" } ];
// size = metres across (default per kind), dur = seconds (default per kind), color = main fill, seed = a different layout.
// at: a fixed point or a function (t) => [x, y, z] (follows something).
import * as THREE from "three";
import { NOINK } from "../post/ink";
import { V3 } from "../core/util";

export type FxKind = "sparkle" | "burst" | "dust" | "speed" | "stars" | "notes" | "splash";
export type FxEvent = { kind: FxKind; t: number; at: V3 | ((t: number) => V3); size?: number; dur?: number; color?: string; dir?: number; seed?: number };

const INK = "#2B1C1A";
const DEF: Record<FxKind, { size: number; dur: number; color: string; n: number }> = {
  sparkle: { size: 0.32, dur: 0.6, color: "#FFE58A", n: 4 },
  burst: { size: 0.28, dur: 0.17, color: "#FFF6D8", n: 9 },
  dust: { size: 0.32, dur: 0.6, color: "#EADFCF", n: 6 },
  speed: { size: 0.6, dur: 0.6, color: "#FFFFFF", n: 6 },
  stars: { size: 0.22, dur: 1.6, color: "#FFD23F", n: 3 },
  notes: { size: 0.26, dur: 1.6, color: INK, n: 4 },
  splash: { size: 0.45, dur: 0.6, color: "#7FD3F0", n: 9 },
};

// ---------- the pictures (256 x 256 canvases, drawn once per colour) ----------
const mk = (draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!; g.lineJoin = "round"; g.lineCap = "round"; draw(g);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};
const star = (g: CanvasRenderingContext2D, n: number, R: number, r: number, rot = -Math.PI / 2, wob = 0) => {
  g.beginPath();
  for (let i = 0; i < 2 * n; i++) {
    const a = rot + (i * Math.PI) / n, rr = i % 2 ? r : R * (1 + wob * Math.sin(i * 7.3));
    (i ? g.lineTo : g.moveTo).call(g, 128 + rr * Math.cos(a), 128 + rr * Math.sin(a));
  }
  g.closePath();
};
const fillInk = (g: CanvasRenderingContext2D, fill: string, lw = 14) => { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill(); };
const PICS: Record<string, (col: string) => THREE.Texture> = {
  glint: (col) => mk((g) => { star(g, 4, 118, 26); fillInk(g, col, 12); g.beginPath(); g.arc(128, 128, 14, 0, 7); g.fillStyle = "#FFFFFF"; g.fill(); }),
  burst: (col) => mk((g) => { star(g, 10, 120, 62, -Math.PI / 2, 0.12); fillInk(g, col, 12); star(g, 10, 74, 40, -Math.PI / 2 + 0.3, 0.1); g.fillStyle = "#FFE066"; g.fill(); }),
  puff: (col) => mk((g) => {
    g.beginPath();
    for (const [x, y, r] of [[128, 150, 70], [80, 140, 50], [176, 140, 52], [110, 96, 52], [156, 100, 46]]) { g.moveTo(x + r, y); g.arc(x, y, r, 0, 7); }
    g.lineWidth = 18; g.strokeStyle = INK; g.stroke(); g.fillStyle = col; g.fill();
    g.beginPath(); g.arc(104, 92, 22, 0, 7); g.fillStyle = "rgba(255,255,255,0.55)"; g.fill();
  }),
  streak: (col) => mk((g) => {
    g.beginPath(); g.moveTo(10, 128); g.quadraticCurveTo(120, 92, 226, 98); g.quadraticCurveTo(252, 128, 226, 158); g.quadraticCurveTo(120, 164, 10, 128); g.closePath();
    g.lineWidth = 12; g.strokeStyle = INK; g.stroke(); g.fillStyle = col; g.fill();
  }),
  star5: (col) => mk((g) => { star(g, 5, 112, 50); g.lineWidth = 16; g.strokeStyle = INK; g.stroke(); g.fillStyle = col; g.fill(); g.beginPath(); g.arc(104, 100, 14, 0, 7); g.fillStyle = "rgba(255,255,255,0.7)"; g.fill(); }),
  note: (col) => mk((g) => {
    const draw = () => { g.beginPath(); g.ellipse(92, 186, 44, 32, -0.45, 0, 7); g.moveTo(130, 178); g.lineTo(130, 40); g.quadraticCurveTo(196, 70, 196, 132); g.quadraticCurveTo(178, 92, 130, 88); };
    draw(); g.lineWidth = 30; g.strokeStyle = "#FFFFFF"; g.stroke(); g.fillStyle = "#FFFFFF"; g.fill();
    draw(); g.lineWidth = 14; g.strokeStyle = col; g.stroke(); g.fillStyle = col; g.fill();
  }),
  drop: (col) => mk((g) => {
    g.beginPath(); g.moveTo(128, 20); g.bezierCurveTo(150, 80, 196, 120, 196, 168); g.arc(128, 168, 68, 0, Math.PI); g.bezierCurveTo(60, 120, 106, 80, 128, 20); g.closePath();
    fillInk(g, col, 14); g.beginPath(); g.ellipse(104, 160, 14, 24, 0.3, 0, 7); g.fillStyle = "rgba(255,255,255,0.75)"; g.fill();
  }),
};
const texCache = new Map<string, THREE.Texture>();
const pic = (name: string, col: string) => { const k = name + col; let t = texCache.get(k); if (!t) { t = PICS[name](col); texCache.set(k, t); } return t; };

// ---------- particles ----------
const r1 = (k: number, s: number) => { const x = Math.sin(k * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const geo = new THREE.PlaneGeometry(1, 1);
type Part = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial };
// what one particle does at life u (0..1): offset in screen metres (x right, y up), scale (m), rotation (rad), opacity
type Pose = { x: number; y: number; s: number; rot: number; a: number; sx?: number } | null;

const easeOut = (u: number) => 1 - (1 - u) ** 3;
const popIn = (u: number, inT = 0.25) => (u < inT ? easeOut(u / inT) * (1 + 0.15 * Math.sin((u / inT) * Math.PI)) : 1);

function poseOf(e: FxEvent, i: number, n: number, tau: number, size: number, dur: number, seed: number): Pose {
  const u = tau / dur, R = (k: number) => r1(i * 13 + k, seed);
  switch (e.kind) {
    case "sparkle": {                                      // glints pop in one after another, twinkle, shrink away
      const d = 0.22 * (i / n) * dur, v = (tau - d) / (dur * 0.75);
      if (v < 0 || v >= 1) return null;
      const ang = R(1) * 6.283, rad = size * (0.15 + 0.4 * R(2));
      const s = size * (0.35 + 0.35 * R(3)) * popIn(v, 0.3) * (v > 0.6 ? 1 - (v - 0.6) / 0.4 : 1);
      return { x: rad * Math.cos(ang), y: rad * Math.sin(ang), s, rot: 0.6 * v + R(4), a: 1 };
    }
    case "burst": {                                        // 1 star + short lines flying out; 5 frames, the reference ring is 4-5 f
      if (u >= 1) return null;
      if (i === 0) return { x: 0, y: 0, s: size * (0.7 + 0.5 * easeOut(u)), rot: 0.2 * R(1), a: u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1 };
      const ang = ((i - 1) / (n - 1)) * 6.283 + 0.3 * R(2), rad = size * (0.45 + 0.5 * easeOut(u));
      return { x: rad * Math.cos(ang), y: rad * Math.sin(ang), s: size * 0.42, rot: ang, a: 1 - u, sx: 1 };
    }
    case "dust": {                                         // puffs roll outward along the ground, grow, fade
      if (u >= 1) return null;
      const side = i % 2 ? 1 : -1, sp = size * (0.5 + 0.6 * R(1));
      const w = easeOut(u);
      return { x: side * sp * w + (R(2) - 0.5) * 0.1 * size, y: size * (0.05 + 0.25 * R(3)) * w, s: size * (0.35 + 0.35 * R(4)) * (0.5 + 0.7 * w), rot: R(5) * 6, a: u > 0.55 ? 1 - (u - 0.55) / 0.45 : 1 };
    }
    case "speed": {                                        // streaks behind the move, re-placed every frame (on ones)
      if (u >= 1) return null;
      const f = Math.floor(tau * 30), a = ((e.dir ?? 0) * Math.PI) / 180;
      const along = -size * (0.35 + 0.5 * r1(i * 7 + f, seed)), across = size * ((i / (n - 1)) - 0.5) * 0.9 + 0.04 * size * (r1(i + f * 3, seed) - 0.5);
      const fade = Math.min(1, u / 0.12, (1 - u) / 0.2);
      return { x: along * Math.cos(a) - across * Math.sin(a), y: along * Math.sin(a) + across * Math.cos(a), s: size * (0.5 + 0.4 * R(1)), rot: a, a: fade, sx: 1 };
    }
    case "stars": {                                        // dizzy stars circling over a head
      if (u >= 1) return null;
      const ang = tau * 5 + (i / n) * 6.283;
      const k = Math.min(1, u / 0.1, (1 - u) / 0.12);
      return { x: Math.cos(ang) * size * 1.4, y: Math.sin(ang) * size * 0.35, s: size * (0.7 + 0.15 * Math.sin(ang * 2)) * k, rot: 0.3 * Math.sin(ang), a: 1 };
    }
    case "notes": {                                        // notes rise and sway, one after another
      const life = 0.9, d = (i / n) * Math.max(0, dur - life), v = (tau - d) / life;
      if (v < 0 || v >= 1) return null;
      const side = i % 2 ? 1 : -1;
      return { x: side * size * (0.3 + 0.25 * Math.sin(v * 6 + i)), y: size * (0.2 + 2.2 * v), s: size * popIn(v, 0.2), rot: 0.35 * Math.sin(v * 5 + i) * side, a: v > 0.7 ? 1 - (v - 0.7) / 0.3 : 1 };
    }
    case "splash": {                                       // drops fly up and out, fall back
      if (u >= 1) return null;
      const ang = Math.PI / 2 + (R(1) - 0.5) * 2.2, v0 = size * (2.2 + 1.6 * R(2)), g = size * 9;
      const x = Math.cos(ang) * v0 * tau, y = Math.sin(ang) * v0 * tau - 0.5 * g * tau * tau;
      const vx = Math.cos(ang) * v0, vy = Math.sin(ang) * v0 - g * tau;
      return { x, y, s: size * (0.18 + 0.12 * R(3)), rot: Math.atan2(vy, vx) - Math.PI / 2 + Math.PI, a: u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1 };
    }
  }
}

export class Fx {
  root = new THREE.Group();
  private items: { e: FxEvent; parts: Part[]; size: number; dur: number; seed: number }[] = [];
  private right = new THREE.Vector3(); private up = new THREE.Vector3(); private p = new THREE.Vector3();
  constructor(parent: THREE.Object3D, events: FxEvent[], renderOrder = 900) {
    parent.add(this.root);
    events.forEach((e, k) => {
      const d = DEF[e.kind], col = e.color ?? d.color;
      const name = { sparkle: "glint", burst: "burst", dust: "puff", speed: "streak", stars: "star5", notes: "note", splash: "drop" }[e.kind];
      const parts: Part[] = [];
      for (let i = 0; i < d.n; i++) {
        const tex = e.kind === "burst" && i > 0 ? pic("streak", "#FFFFFF") : pic(name, col);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.08, depthWrite: true, side: THREE.DoubleSide, fog: false });
        if (e.kind === "sparkle") mat.color.setScalar(1.35);            // a touch over white: the bloom gives it a small glow
        const mesh = new THREE.Mesh(geo, mat); mesh.layers.set(NOINK); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = renderOrder + i;
        this.root.add(mesh); parts.push({ mesh, mat });
      }
      this.items.push({ e, parts, size: e.size ?? d.size, dur: e.dur ?? d.dur, seed: e.seed ?? k + 1 });
    });
  }
  update(t: number, cam: THREE.Camera) {
    this.right.set(1, 0, 0).applyQuaternion(cam.quaternion); this.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    for (const it of this.items) {
      const tau = t - it.e.t, on = tau >= 0 && tau < it.dur;
      if (!on) { for (const p of it.parts) p.mesh.visible = false; continue; }
      const at = typeof it.e.at === "function" ? it.e.at(t) : it.e.at;
      it.parts.forEach((p, i) => {
        const q = poseOf(it.e, i, it.parts.length, tau, it.size, it.dur, it.seed);
        if (!q || q.s <= 0.001 || q.a <= 0.01) { p.mesh.visible = false; return; }
        p.mesh.visible = true;
        this.p.set(at[0], at[1], at[2]).addScaledVector(this.right, q.x).addScaledVector(this.up, q.y);
        p.mesh.position.copy(this.p);
        p.mesh.quaternion.copy(cam.quaternion); p.mesh.rotateZ(q.rot);
        const sx = q.sx ? q.s * 1.0 : q.s, sy = q.sx ? q.s * 0.28 : q.s;     // streaks are long and thin
        p.mesh.scale.set(sx, sy, 1);
        p.mat.opacity = q.a;
      });
    }
  }
}

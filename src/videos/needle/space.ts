// THE SPACE PARTS (sp1 needle, sp2 phone, sp3 whale, sp4 mountain): the fired object flies toward the Earth in slow motion, the camera
// follows it VERY close, and a glowing techy label flies next to it. Whale and mountain come out small and grow while they fly.
import * as THREE from "three";
import { NOINK } from "../../engine/post/ink";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { houseLight } from "../../engine/outdoor";
import { mkCanvas, canvasTex, noInk, MR } from "../../engine/kit";
import { Cast3DAssets } from "../../engine/cast/player3d";
import { LIGHT, EARTH, SUN } from "./story";
import { stars, earth, sun, galaxies, phone } from "./props";
import { whale } from "./parts/whalehit/world";

const SPACE = new THREE.Color("#000000");
// the needle: polished steel, sharp tip, an eye at the back (0.6 units long, pointing along +x)
export function needleModel() {
  const G = new THREE.Group(); G.name = "needle";
  const STEEL = new THREE.MeshStandardMaterial({ color: "#DCE3EC", roughness: 0.18, metalness: 1 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 24), STEEL); shaft.rotation.z = Math.PI / 2; shaft.name = "needle shaft";
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.12, 24), STEEL); tip.rotation.z = -Math.PI / 2; tip.position.x = 0.29; tip.name = "needle tip";
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 8, 16), STEEL); head.rotation.z = Math.PI / 2; head.position.x = -0.25; head.scale.set(1, 1, 0.75); head.name = "needle head";
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.005, 10, 24), STEEL); eye.scale.set(1.8, 0.55, 1); eye.position.x = -0.255; eye.rotation.x = Math.PI / 2; eye.name = "needle eye";
  G.add(shaft, tip, head, eye);
  return G;
}
// a mountain: a rough grey rock with a snow cap, about 1 unit across, tip toward +x
export function mountainModel() {
  const geo = new THREE.IcosahedronGeometry(0.5, 4), p = geo.attributes.position, col: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = Math.sin(x * 9.1 + y * 5.3) * Math.cos(z * 8.3 - x * 3.7) * 0.07 + Math.sin(y * 17 + z * 13) * 0.03;
    const k = 1 + n, sx = x > 0 ? 1.35 - 0.6 * (x / 0.5) * 0.4 : 1.0;   // pointier toward +x
    p.setXYZ(i, x * k * sx, y * k * (x > 0 ? 0.8 : 1), z * k * (x > 0 ? 0.8 : 1));
    const h = y * k; const snow = h > 0.18 + n ? 1 : 0;
    col.push(snow ? 0.62 : 0.26 + n, snow ? 0.64 : 0.23 + n, snow ? 0.68 : 0.2 + n);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, color: "#8A8A8A" })); m.name = "mountain"; m.castShadow = true;
  const G = new THREE.Group(); G.add(m); G.name = "mountain"; return G;
}

type Line2 = { text: string; tag: string; at: number; dur: number };
type Kind = { lines: Line2[]; frame: [number, number]; out: [number, number]; spin: number; grow?: [number, number] };
const KINDS: Record<string, Kind> = {
  sp1: { lines: [{ text: "299,792 km/s", tag: "SPEED", at: 0.5, dur: 0.75 }, { text: "0.5 g", tag: "MASS", at: 1.35, dur: 0.35 }], frame: [0.2, 0.45], out: [2.2, 2.6], spin: 0.5 },
  sp2: { lines: [{ text: "x400", tag: "HEAVIER", at: 0.5, dur: 0.4 }], frame: [0.15, 0.4], out: [1.25, 1.5], spin: 0.9 },
  sp3: { lines: [{ text: "x1,000,000", tag: "HEAVIER", at: 0.35, dur: 0.6 }], frame: [0.1, 0.3], out: [1.15, 1.4], spin: 0.25, grow: [0.0, 1.2] },
  sp4: { lines: [{ text: "x2,000,000,000", tag: "HEAVIER", at: 0.4, dur: 0.8 }], frame: [0.15, 0.4], out: [1.85, 2.1], spin: 0.2, grow: [0.0, 1.8] },
};
const W = 1024, H = 520;
function drawLabel(g: CanvasRenderingContext2D, t: number, K: Kind) {
  g.clearRect(0, 0, W, H);
  const k = (a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const f = k(K.frame[0], K.frame[1]), out = k(K.out[0], K.out[1]);
  if (f <= 0 || out >= 1) return;
  const flick = (t < K.frame[0] + 0.12 || out > 0) ? (Math.sin(t * 90) > -0.2 ? 1 : 0.35) : 1;
  g.globalAlpha = (1 - out) * flick;
  const CY = "#4FE6FF", HOT = "#E8FDFF";
  g.shadowColor = CY; g.shadowBlur = 22; g.strokeStyle = CY; g.fillStyle = CY; g.lineCap = "round";
  const lx0 = 24, ly0 = 500, lx1 = 140, ly1 = 384, lx2 = 210;
  g.lineWidth = 5; g.beginPath(); g.arc(lx0, ly0, 10, 0, 7); g.fill();
  const l1 = Math.min(1, f * 2), l2 = Math.max(0, f * 2 - 1);
  g.beginPath(); g.moveTo(lx0, ly0); g.lineTo(lx0 + (lx1 - lx0) * l1, ly0 + (ly1 - ly0) * l1); if (l2 > 0) g.lineTo(lx1 + (lx2 - lx1) * l2, ly1); g.stroke();
  if (l2 <= 0) { g.globalAlpha = 1; return; }
  const x0 = 210, y0 = 40, x1 = 210 + 780 * l2, y1 = 400;
  g.shadowBlur = 0; g.fillStyle = "rgba(4,20,40,0.55)"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.shadowBlur = 18; g.lineWidth = 2.5; g.strokeStyle = "rgba(79,230,255,0.6)"; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  g.lineWidth = 7; g.strokeStyle = CY; const c = 46;
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) { g.beginPath(); g.moveTo(x + sx * c, y); g.lineTo(x, y); g.lineTo(x, y + sy * c); g.stroke(); }
  const two = K.lines.length > 1;
  g.lineWidth = 2; g.strokeStyle = "rgba(79,230,255,0.45)";
  if (two) { g.beginPath(); g.moveTo(x0 + 30, 222); g.lineTo(x0 + (x1 - x0 - 30), 222); g.stroke(); }
  for (let x = x0 + 30; x < x1 - 30; x += 22) { g.beginPath(); g.moveTo(x, y1 - 14); g.lineTo(x, y1 - (x % 110 < 22 ? 30 : 22)); g.stroke(); }
  if (l2 < 1) { g.globalAlpha = 1; return; }
  K.lines.forEach((L, i) => {
    const y = two ? (i === 0 ? 70 : 250) : 130, n = Math.floor(L.text.length * k(L.at, L.at + L.dur) + 0.0001);
    if (t < L.at) return;
    const size = Math.min(92, Math.floor(700 / (L.text.length * 0.62)));
    g.shadowBlur = 10; g.fillStyle = "rgba(120,230,255,0.85)"; g.font = "700 34px Consolas, 'Courier New', monospace"; g.textBaseline = "top"; g.textAlign = "left";
    g.fillText(L.tag, x0 + 40, y);
    g.shadowBlur = 26; g.shadowColor = CY; g.fillStyle = HOT; g.font = `700 ${size}px Consolas, 'Courier New', monospace`;
    const s = L.text.slice(0, n); g.fillText(s, x0 + 40, y + 46);
    const typing = n < L.text.length || (i === K.lines.length - 1 && Math.floor(t * 3) % 2 === 0);
    if (typing) { const w = g.measureText(s).width; g.fillStyle = CY; g.fillRect(x0 + 46 + w, y + 54, size * 0.48, size * 0.87); }
  });
  g.globalAlpha = 1;
}

export class SpaceWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#cfd8ff", "#262838", 0.6);
  private obj: THREE.Object3D; private K: Kind; private base = 0.6;
  private label: THREE.Mesh; private lg: CanvasRenderingContext2D; private ltex: THREE.CanvasTexture;
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3();

  constructor(private kind: string, A: Cast3DAssets) {
    const R = this.root; this.K = KINDS[kind];
    R.add(this.sky, this.sun, this.sun.target);
    const s1 = stars(), s2 = stars(); s2.rotation.x = Math.PI; s2.rotation.y = 1.3; R.add(s1, s2);
    R.add(galaxies()); R.add(earth(EARTH)); R.add(sun(SUN.az, SUN.el));
    if (kind === "sp1") this.obj = needleModel();
    else if (kind === "sp2") { const p = phone(A.imgs.logo as HTMLImageElement), w = new THREE.Group(); p.rotation.z = -Math.PI / 2; p.scale.setScalar(4.2); w.add(p); this.obj = w; }
    else if (kind === "sp3") { const w = new THREE.Group(), b = whale(); b.scale.setScalar(0.9 / 25); w.add(b); this.obj = w; }
    else this.obj = mountainModel();
    R.add(this.obj);
    const c = mkCanvas(W, H); this.lg = c.getContext("2d")!; this.ltex = canvasTex(c) as THREE.CanvasTexture;
    this.label = new THREE.Mesh(new THREE.PlaneGeometry(1, H / W), new THREE.MeshBasicMaterial({ map: this.ltex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
    (this.label.material as THREE.MeshBasicMaterial).color.setScalar(1.35);
    this.label.name = "label"; this.label.layers.set(NOINK); this.label.renderOrder = 999; this.label.frustumCulled = false; this.label.userData.camFree = true; noInk(this.label);
    R.add(this.label);
  }

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    const K = this.K, dir = new THREE.Vector3(...EARTH).normalize();
    const np = dir.clone().multiplyScalar(0.12 * t);
    // whale and mountain: tiny when they leave the gun, growing while they fly; the camera backs off with them
    const g = K.grow ? Math.min(1, Math.max(0, (t - K.grow[0]) / (K.grow[1] - K.grow[0]))) : 1, gs = K.grow ? 0.12 + 0.88 * g * g * (3 - 2 * g) : 1;
    const size = this.kind === "sp4" ? 3.4 : this.kind === "sp3" ? 2.4 : 1;   // how many "needles" long it ends up
    const k = K.grow ? gs * size : 1, back = 0.7 * Math.max(1, k * 5.5);
    this.obj.position.copy(np); this.obj.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir); this.obj.rotateX(t * K.spin); this.obj.scale.setScalar(k);
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(side, dir);
    const sx = (0.05 + 0.006 * t) * Math.max(1, k), sy = (0.25 - 0.01 * t) * Math.max(1, k);
    cam.near = 0.05; cam.far = 900;
    cam.position.copy(np).addScaledVector(dir, -back).addScaledVector(side, sx).addScaledVector(up, sy); cam.up.copy(up);
    cam.lookAt(new THREE.Vector3(...EARTH).addScaledVector(up, -12).addScaledVector(side, 4));
    cam.fov = 46; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK); cam.getWorldDirection(this.fwd);
    this.sun.target.position.copy(np); this.sun.target.updateMatrixWorld();
    houseLight(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t }, 7);
    scene.background = SPACE; this.sky.intensity = 0.4;
    drawLabel(this.lg, t, K); this.ltex.needsUpdate = true;
    const d = cam.position.distanceTo(np), sz = d * 0.33;
    this.label.quaternion.copy(cam.quaternion); this.label.scale.setScalar(sz);
    const camR = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), camU = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const anchor = np.clone().addScaledVector(camU, 0.03 * k * sz / 0.6);
    this.label.position.copy(anchor).addScaledVector(camR, sz * (0.5 - 24 / W)).addScaledVector(camU, sz * (H / W) * (0.5 - (H - 500) / H));
    const focus = Math.max(0.3, this.v.copy(np).sub(cam.position).dot(this.fwd));
    return { focus, cInf: 0 };
  }
}

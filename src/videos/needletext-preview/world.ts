// NEEDLE TEXT PREVIEW world: black space, stars, the Earth ahead, the needle with its light trail, and the flying label.
import * as THREE from "three";
import { NOINK } from "../../engine/post/ink";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { houseLight } from "../../engine/outdoor";
import { mkCanvas, canvasTex, noInk } from "../../engine/kit";
import { loadCast3d, Cast3DAssets } from "../../engine/cast/player3d";
import { LIGHT, EARTH, SUN, LABEL } from "./story";
import { stars, earth, sun, galaxies } from "./props";

export const load = () => loadCast3d({}, {});
const SPACE = new THREE.Color("#000000");

// the needle: polished steel, sharp tip, an eye at the back (0.6 units long, pointing along +x)
function needle() {
  const G = new THREE.Group(); G.name = "needle";
  const STEEL = new THREE.MeshStandardMaterial({ color: "#DCE3EC", roughness: 0.18, metalness: 1 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 24), STEEL); shaft.rotation.z = Math.PI / 2; shaft.name = "needle shaft";
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.12, 24), STEEL); tip.rotation.z = -Math.PI / 2; tip.position.x = 0.29; tip.name = "needle tip";
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 8, 16), STEEL); head.rotation.z = Math.PI / 2; head.position.x = -0.25; head.scale.set(1, 1, 0.75); head.name = "needle head";
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.005, 10, 24), STEEL); eye.scale.set(1.8, 0.55, 1); eye.position.x = -0.255; eye.rotation.x = Math.PI / 2; eye.name = "needle eye";
  G.add(shaft, tip, head, eye);
  return G;
}

// the label: one canvas (a leader line from the needle up to a framed panel with corner brackets, typed text)
const W = 1024, H = 520;
function drawLabel(g: CanvasRenderingContext2D, t: number) {
  g.clearRect(0, 0, W, H);
  const k = (a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const f = k(LABEL.frame[0], LABEL.frame[1]);
  const out = k(LABEL.out[0], LABEL.out[1]);
  if (f <= 0 || out >= 1) return;
  const flick = (t < LABEL.frame[0] + 0.12 || out > 0) ? (Math.sin(t * 90) > -0.2 ? 1 : 0.35) : 1;
  g.globalAlpha = (1 - out) * flick;
  const CY = "#4FE6FF", HOT = "#E8FDFF";
  g.shadowColor = CY; g.shadowBlur = 22; g.strokeStyle = CY; g.fillStyle = CY; g.lineCap = "round";
  // leader line: dot at the needle, a short diagonal, then a short flat run under the panel
  const lx0 = 24, ly0 = 500, lx1 = 140, ly1 = 384, lx2 = 210;
  g.lineWidth = 5; g.beginPath(); g.arc(lx0, ly0, 10, 0, 7); g.fill();
  const l1 = Math.min(1, f * 2), l2 = Math.max(0, f * 2 - 1);
  g.beginPath(); g.moveTo(lx0, ly0); g.lineTo(lx0 + (lx1 - lx0) * l1, ly0 + (ly1 - ly0) * l1); if (l2 > 0) g.lineTo(lx1 + (lx2 - lx1) * l2, ly1); g.stroke();
  if (l2 <= 0) { g.globalAlpha = 1; return; }
  // the panel: dark see-through glass, thin frame, bright corner brackets
  const x0 = 210, y0 = 40, x1 = 210 + 780 * l2, y1 = 400;
  g.shadowBlur = 0; g.fillStyle = "rgba(4,20,40,0.55)"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.shadowBlur = 18; g.lineWidth = 2.5; g.strokeStyle = "rgba(79,230,255,0.6)"; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  g.lineWidth = 7; g.strokeStyle = CY; const c = 46;
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) { g.beginPath(); g.moveTo(x + sx * c, y); g.lineTo(x, y); g.lineTo(x, y + sy * c); g.stroke(); }
  // a thin divider between the two lines, and small tick marks along the bottom
  g.lineWidth = 2; g.strokeStyle = "rgba(79,230,255,0.45)"; g.beginPath(); g.moveTo(x0 + 30, 222); g.lineTo(x0 + (x1 - x0 - 30), 222); g.stroke();
  for (let x = x0 + 30; x < x1 - 30; x += 22) { g.beginPath(); g.moveTo(x, y1 - 14); g.lineTo(x, y1 - (x % 110 < 22 ? 30 : 22)); g.stroke(); }
  if (l2 < 1) { g.globalAlpha = 1; return; }
  // the two lines: a small tag above, the value typed letter by letter with a block cursor
  LABEL.lines.forEach((L, i) => {
    const y = i === 0 ? 70 : 250, n = Math.floor(L.text.length * k(L.at, L.at + L.dur) + 0.0001);
    if (t < L.at) return;
    g.shadowBlur = 10; g.fillStyle = "rgba(120,230,255,0.85)"; g.font = "700 34px Consolas, 'Courier New', monospace"; g.textBaseline = "top"; g.textAlign = "left";
    g.fillText(L.tag, x0 + 40, y);
    g.shadowBlur = 26; g.shadowColor = CY; g.fillStyle = HOT; g.font = "700 92px Consolas, 'Courier New', monospace";
    const s = L.text.slice(0, n); g.fillText(s, x0 + 40, y + 46);
    const typing = n < L.text.length || (i === LABEL.lines.length - 1 && Math.floor(t * 3) % 2 === 0);
    if (typing) { const w = g.measureText(s).width; g.fillStyle = CY; g.fillRect(x0 + 46 + w, y + 54, 44, 80); }
  });
  g.globalAlpha = 1;
}

export class SimpleWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#cfd8ff", "#262838", 0.6);
  private needle = needle();
  private label: THREE.Mesh; private lg: CanvasRenderingContext2D; private ltex: THREE.CanvasTexture;
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3();

  constructor(_A: Cast3DAssets) {
    const R = this.root;
    R.add(this.sky, this.sun, this.sun.target);
    const s1 = stars(), s2 = stars(); s2.rotation.x = Math.PI; s2.rotation.y = 1.3; R.add(s1, s2);   // space: stars all round
    R.add(galaxies()); R.add(earth(EARTH)); R.add(sun(SUN.az, SUN.el)); R.add(this.needle);
    const c = mkCanvas(W, H); this.lg = c.getContext("2d")!; this.ltex = canvasTex(c) as THREE.CanvasTexture;
    this.label = new THREE.Mesh(new THREE.PlaneGeometry(1, H / W), new THREE.MeshBasicMaterial({ map: this.ltex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
    (this.label.material as THREE.MeshBasicMaterial).color.setScalar(1.35);   // a little brighter than white, so the bloom makes it glow
    this.label.name = "needle label"; this.label.layers.set(NOINK); this.label.renderOrder = 999; this.label.frustumCulled = false; this.label.userData.camFree = true; noInk(this.label);
    R.add(this.label);
  }

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    // slow motion: the needle creeps toward the Earth (it is really at light speed)
    const dir = new THREE.Vector3(...EARTH).normalize();
    const np = dir.clone().multiplyScalar(0.12 * t);
    this.needle.position.copy(np); this.needle.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    this.needle.rotateX(t * 0.5);                                   // it spins slowly around itself
    // the camera follows VERY close, beside and a little behind, swinging slowly round it (the Earth stays ahead in view)
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(side, dir);
    // camera just behind the needle and a bit above it, looking a little below the Earth: the needle sits low in the picture
    // pointing at the Earth, which stands in the upper part. A slow drift sideways keeps it alive.
    const sx = 0.05 + 0.006 * t, sy = 0.25 - 0.01 * t;
    cam.position.copy(np).addScaledVector(dir, -0.7).addScaledVector(side, sx).addScaledVector(up, sy); cam.up.copy(up);
    cam.lookAt(new THREE.Vector3(...EARTH).addScaledVector(up, -12).addScaledVector(side, 4));
    cam.fov = 46; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK); cam.getWorldDirection(this.fwd);
    this.sun.target.position.copy(np); this.sun.target.updateMatrixWorld();
    houseLight(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t }, 7);
    scene.background = SPACE; this.sky.intensity = 0.4;
    // the label: faces the camera; its leader-line dot sits on the needle; same size on screen whatever the distance
    drawLabel(this.lg, t); this.ltex.needsUpdate = true;
    const d = cam.position.distanceTo(np), sz = d * 0.33;
    this.label.quaternion.copy(cam.quaternion); this.label.scale.setScalar(sz);
    const camR = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), camU = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const anchor = np.clone().addScaledVector(camU, 0.03 * sz / 0.6);
    this.label.position.copy(anchor).addScaledVector(camR, sz * (0.5 - 24 / W)).addScaledVector(camU, sz * (H / W) * (0.5 - (H - 500) / H));
    const focus = Math.max(0.3, this.v.copy(np).sub(cam.position).dot(this.fwd));
    return { focus, cInf: 0 };
  }
}

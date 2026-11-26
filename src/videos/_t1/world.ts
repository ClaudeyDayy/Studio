// THE WORLD (3D look) for the Vietnam tunnels video: places, light, people, props. update() places everything for time t.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { NOINK } from "../../engine/post/ink";
import { Player3D, buildCast3d, loadCast3d, Cast3DSpec, Cast3DAssets } from "../../engine/cast/player3d";
import { MR, MTR, mkCanvas, canvasTex, INK_BROWN, onGround } from "../../engine/kit";
import { PXM, HIP, STAND_HIP } from "../../engine/cast/player";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { applyLight, mixLight } from "../../engine/core/lights";
import { Fx } from "../../engine/fx/fx";
import { makeLife } from "../../engine/cast/life";
import type { V3 } from "../../engine/core/util";
import * as PR from "./props";
import * as S from "./story";

const VENTS = [6.4, 7.3, 8.2], PIT_X = 9.6;
const tallGrassGeo = () => { const tall: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 11; k++) { const h = 0.42 + 0.3 * ((k * 37) % 11) / 11, c = new THREE.ConeGeometry(0.016, h, 3); c.translate(0, h / 2, 0); c.rotateZ((k - 5) * 0.07); c.rotateY(k * 1.9); c.translate(((k * 13) % 7 - 3) * 0.012, 0, ((k * 5) % 7 - 3) * 0.012); tall.push(c); }
  return merge(tall); };
/** A soldier's rifle held with BOTH hands at low ready: grip by his right hip, muzzle forward-down and a little to his left.
 *  Returns the grip (right hand), the handguard (left hand) and the rifle direction, in world space. */
const riflePose = (pos: V3, look: [number, number], aim = 0) => {
  const L = Math.hypot(look[0], look[1]) || 1, fx = look[0] / L, fz = look[1] / L, rx = -fz, rz = fx;
  const G: V3 = [pos[0] + rx * 0.1 + fx * 0.13, pos[1] + 0.4, pos[2] + rz * 0.1 + fz * 0.13];
  let d: V3 = [fx * 0.82 - rx * 0.32, -0.32 + aim, fz * 0.82 - rz * 0.32]; const n = Math.hypot(...d); d = [d[0] / n, d[1] / n, d[2] / n];
  return { G, Lh: [G[0] + d[0] * 0.34, G[1] + d[1] * 0.34, G[2] + d[2] * 0.34] as V3, d };
};
/** S8: Minh's x along the cut while he digs (local metres) */
const digMinhX = (t: number) => (t < 32.4 ? 1.9 : Math.max(1.9, S.digX(t) - 0.55));
/** S8 shovel cycle (4.2 a second): thrust into the face, lift, throw the dirt back past his shoulder, return */
const DIG_HZ = 4.2, DIG_T0 = 32.45, DIG_T1 = 34.95;
const digPose = (t: number) => {
  const ph = (((t - DIG_T0) * DIG_HZ) % 1 + 1) % 1, e = (x: number) => x * x * (3 - 2 * x);
  if (ph < 0.35) { const k = ph / 0.35; return { th: 166, hx: 0.2 + 0.18 * Math.sin(k * Math.PI), hy: 0.45, lean: 0.28 }; }
  if (ph < 0.72) { const k = e((ph - 0.35) / 0.37); return { th: 166 + 164 * k, hx: 0.2 - 0.24 * k, hy: 0.45 + 0.1 * k, lean: 0.28 - 0.3 * k }; }
  const k = e((ph - 0.72) / 0.28); return { th: 330 - 164 * k, hx: -0.04 + 0.24 * k, hy: 0.55 - 0.1 * k, lean: -0.02 + 0.3 * k };
};                 // S10: the team's spider holes and the leaf-covered pit on the path
const { M0, TD, LK, LKD, LKP, CAMP, CAL, PAD, WT, TABLE, CUT_X, CUT_H, CUT_W, CUT_D, cx, F1, F2, HOME, sm } = S;

// ---------------------------------------------------------------- cast
export const CAST: Cast3DSpec = {
  minh: { outfit: "farmer", hat: "nonla" }, minhT: { base: "minh", outfit: "farmer", hat: "nonla" },
  team2: { base: "minh2", outfit: "farmer", hat: "nonla" }, team3: { base: "minh3", outfit: "farmer", hat: "nonla" },
  arian: { outfit: "army", hat: "helmet" }, max: { outfit: "army", hat: "helmet" },
  general: { base: "arian", outfit: "army", hat: "officer" }, maxHome: { base: "max", outfit: "casual" },
};
export const load = () => loadCast3d(CAST);
export const SNAP = { canvas: null as HTMLCanvasElement | null, t: -1 };
// RICH LIGHT ON THE PEOPLE (his request): the 3D bodies get a satin sheen and a rim of light on the side the sun comes
// from (warm by day, orange at sunset, blue at night), on top of the normal real shading.
const RIM = { col: { value: new THREE.Color(1, 0.9, 0.7) }, dir: { value: new THREE.Vector3(0, 0, 1) }, k: { value: 0.85 } };
function richBody(p: Player3D) {
  p.body.traverse((o) => {
    const m = (o as THREE.Mesh).material; const list = Array.isArray(m) ? m : m ? [m] : [];
    for (const mt of list) if (mt instanceof THREE.MeshStandardMaterial) {
      mt.roughness = 0.46; mt.envMapIntensity = 1.45;
      mt.onBeforeCompile = (sh) => {
        sh.uniforms.uRimCol = RIM.col; sh.uniforms.uRimDir = RIM.dir; sh.uniforms.uRimK = RIM.k;
        sh.fragmentShader = sh.fragmentShader.replace("void main() {", "uniform vec3 uRimCol; uniform vec3 uRimDir; uniform float uRimK;\nvoid main() {")
          .replace("#include <opaque_fragment>", "{ vec3 vd = normalize(vViewPosition); float fr = pow(1.0 - clamp(dot(normal, vd), 0.0, 1.0), 2.6);\n  float side = 0.3 + 0.7 * max(dot(normal, uRimDir), 0.0); outgoingLight += uRimCol * fr * side * uRimK; }\n#include <opaque_fragment>");
      };
      mt.customProgramCacheKey = () => "richBody"; mt.needsUpdate = true;
    }
  });
}
const blobTex = (() => { let t: THREE.Texture | null = null; return () => (t ??= (() => { const c = mkCanvas(128, 128), g = c.getContext("2d")!; const r = g.createRadialGradient(64, 64, 4, 64, 64, 62); r.addColorStop(0, "rgba(0,0,0,0.85)"); r.addColorStop(0.5, "rgba(0,0,0,0.45)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return canvasTex(c); })()); })();

// ---------------------------------------------------------------- small helpers
const v3 = (a: V3) => new THREE.Vector3(...a);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const L3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const cl = (x: number) => Math.min(1, Math.max(0, x));
/** piecewise path: keys [t, value]; eased between keys */
const track = (keys: [number, V3][]) => (t: number): V3 => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const k = sm(keys[i - 1][0], keys[i][0], t); return L3(keys[i - 1][1], keys[i][1], k); }
  return keys[keys.length - 1][1];
};
const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
/** a hand target on his own right (R) or left (L) side: side = m out, fwd = m ahead, y = height above his floor */
const sidePt = (pos: V3, look: [number, number], h: "R" | "L", side: number, fwd: number, y: number): V3 => {
  const l = Math.hypot(look[0], look[1]) || 1, lx = look[0] / l, lz = look[1] / l, s = h === "R" ? 1 : -1;
  return [pos[0] - lz * side * s + lx * fwd, pos[1] + y, pos[2] + lx * side * s + lz * fwd];
};
/** both hands up and out to the sides (surprise / ambush): along his own right vector, slightly behind his body */
const armsUp = (pos: V3, look: [number, number], spread = 0.44, h = 1.12): { R: V3; L: V3 } => {
  const l = Math.hypot(look[0], look[1]) || 1, lx = look[0] / l, lz = look[1] / l, rx = -lz, rz = lx;
  return { R: [pos[0] + rx * spread - lx * 0.06, pos[1] + h, pos[2] + rz * spread - lz * 0.06], L: [pos[0] - rx * spread - lx * 0.06, pos[1] + h, pos[2] - rz * spread - lz * 0.06] };
};
/** put an object so its local +y (or axis) points along dir and the point `along` units up its axis sits at `at` */
const hold = (o: THREE.Object3D, at: V3, dir: V3, along = 0, axis = UP) => {
  const d = v3(dir).normalize(); o.quaternion.setFromUnitVectors(axis, d); o.position.copy(v3(at)).addScaledVector(d, -along);
};
let SEED = 3; const rnd = () => ((SEED = (SEED * 16807) % 2147483647) / 2147483647);
const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, rep?: [number, number]) => {
  const c = mkCanvas(w, h); draw(c.getContext("2d")!); const t = canvasTex(c);
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t;
};
const speck = (g: CanvasRenderingContext2D, w: number, h: number, n: number, cols: string[]) => {
  for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.06 + 0.12 * rnd(); g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + 5 * rnd(), 0, 7); g.fill(); } g.globalAlpha = 1;
};
const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => PR.mesh(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z);

// ---------------------------------------------------------------- vegetation (instanced)
type Inst = { geo: THREE.BufferGeometry; mat: THREE.Material }[];
const merge = (list: THREE.BufferGeometry[]) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)));
function palmParts(): Inst {
  // one smooth curved trunk (a tapered tube with soft ring bulges), the fronds sit exactly on its top
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, 1.9, 0), new THREE.Vector3(0.5, 3.6, 0));
  const SEG = 18, RAD = 8, tube = new THREE.TubeGeometry(curve, SEG, 0.11, RAD, false), tp = tube.attributes.position, c0 = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < tp.count; i++) {
    const ring = Math.floor(i / (RAD + 1)), u = ring / SEG; curve.getPoint(u, c0); v.fromBufferAttribute(tp, i).sub(c0);
    const k = (1 - 0.38 * u) * (1 + 0.07 * Math.abs(Math.sin(u * Math.PI * 10))) * (u < 0.06 ? 1 + 0.5 * (1 - u / 0.06) : 1);
    v.multiplyScalar(k).add(c0); tp.setXYZ(i, v.x, v.y, v.z);
  }
  tube.computeVertexNormals();
  const top = curve.getPoint(1), cap = new THREE.SphereGeometry(0.11, 10, 8); cap.translate(top.x, top.y, top.z);
  const fr: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.3 * Math.sin(k * 2.3), len = 1.5 + 0.25 * Math.sin(k * 1.7), leaf = new THREE.PlaneGeometry(len, 0.34, 8, 1), p = leaf.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + len / 2) / len; p.setY(i, p.getY(i) * (1 - u * 0.85)); p.setZ(i, -0.6 * u * u); }
    leaf.rotateX(-Math.PI / 2); leaf.translate(len / 2 - 0.05, 0, 0); leaf.rotateZ(k % 2 ? -0.15 : -0.45); leaf.rotateY(a); leaf.translate(top.x, top.y, top.z); fr.push(leaf);
  }
  return [{ geo: merge([tube, cap]), mat: MR("#7A5A3A", 0.9) }, { geo: merge(fr), mat: Object.assign(MR("#3E7A2E", 0.75).clone(), { side: THREE.DoubleSide }) }];
}
function broadParts(): Inst {
  const t = new THREE.CylinderGeometry(0.12, 0.18, 2.4, 8); t.translate(0, 1.2, 0);
  const crown: THREE.BufferGeometry[] = [];
  for (const [x, y, z, r] of [[0, 2.7, 0, 1.0], [0.7, 2.4, 0.2, 0.75], [-0.6, 2.5, -0.3, 0.8], [0.1, 3.3, -0.2, 0.75], [-0.2, 2.3, 0.6, 0.7]]) { const s = new THREE.IcosahedronGeometry(r, 1); s.translate(x, y, z); crown.push(s); }
  return [{ geo: t, mat: MR("#6A4A30", 0.9) }, { geo: merge(crown), mat: MR("#2F6A2A", 0.8) }];
}
function bushParts(): Inst {
  const c: THREE.BufferGeometry[] = [];
  for (const [x, y, z, r] of [[0, 0.25, 0, 0.42], [0.35, 0.2, 0.1, 0.32], [-0.32, 0.2, -0.1, 0.34], [0.05, 0.42, -0.15, 0.3]]) { const s = new THREE.IcosahedronGeometry(r, 1); s.translate(x, y, z); c.push(s); }
  return [{ geo: merge(c), mat: MR("#3F7E30", 0.8) }];
}
function bananaParts(): Inst {
  const l: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) { const leaf = new THREE.PlaneGeometry(0.42, 1.3, 1, 5), p = leaf.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = (p.getY(i) + 0.65) / 1.3; p.setZ(i, 0.35 * u * u); }
    leaf.translate(0, 0.65, 0); leaf.rotateX(0.5); leaf.rotateY((k / 6) * Math.PI * 2); l.push(leaf); }
  return [{ geo: merge(l), mat: Object.assign(MR("#5C9A36", 0.7).clone(), { side: THREE.DoubleSide }) }];
}
function riceParts(): Inst {
  const c: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) { const s = new THREE.ConeGeometry(0.018, 0.42, 3); s.translate(0, 0.21, 0); s.rotateZ((rnd() - 0.5) * 0.5); s.rotateX((rnd() - 0.5) * 0.5); s.translate((rnd() - 0.5) * 0.06, 0, (rnd() - 0.5) * 0.06); c.push(s); }
  return [{ geo: merge(c), mat: MR("#7DB548", 0.7) }];
}
/** instanced copies of a plant: places = [x, y, z, scale, rotY] */
function plant(root: THREE.Object3D, parts: Inst, places: number[][], shadow = true) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), out: THREE.InstancedMesh[] = [];
  for (const { geo, mat } of parts) {
    const im = new THREE.InstancedMesh(geo, mat, places.length);
    places.forEach(([x, y, z, s, r], i) => { q.setFromAxisAngle(UP, r); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m4); });
    im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false; root.add(im); out.push(im);
  }
  return out;
}

// ---------------------------------------------------------------- the world
type P3 = Player3D;
export class VietWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#dfeeff", "#6a6a50", 0.8);
  private dome: THREE.Mesh; private domeU: { top: { value: THREE.Color }; hor: { value: THREE.Color } };
  private clouds: THREE.Sprite[] = [];
  private fwd = new THREE.Vector3(); private v = new THREE.Vector3();
  private fx: Fx;
  private P: Record<string, P3> = {};
  private crowd: P3[] = []; private patrol: P3[] = []; private search: P3[] = []; private sleepers: P3[] = []; private lookCopies: P3[] = [];
  private O: Record<string, THREE.Object3D> = {};
  private air: { o: THREE.Group; kind: string; path: (t: number) => { p: V3; yaw: number; bank?: number; show: boolean } }[] = [];
  private cutLights: THREE.Light[] = []; private tentLights: THREE.Light[] = []; private homeLights: THREE.Light[] = [];
  private plugs: { o: THREE.Object3D; x: number }[] = [];
  private lamps: { o: THREE.Object3D; x: number }[] = [];
  private jungleTop: THREE.Object3D[] = []; private baseTop = new THREE.Group();
  private photo1: { mat: THREE.MeshBasicMaterial; c: HTMLCanvasElement; tex: THREE.CanvasTexture };
  private photo2: { mat: THREE.MeshBasicMaterial; c: HTMLCanvasElement; tex: THREE.CanvasTexture };
  private bombs: { o: THREE.Group; t0: number; t1: number; from: V3; to: V3 }[] = [];
  private smoke: { s: THREE.Sprite; te: number; life: number; at: (t: number) => V3; s0: number; s1: number; o0: number }[] = [];
  private toys: { o: THREE.Object3D; from: V3; to: V3; a: number; b: number; show?: [number, number] }[] = [];
  private blobs = new Map<Player3D, THREE.Mesh>();
  private grassMat!: THREE.Material;
  // the huge crowd in the camp (his note: 385,000 soldiers): instanced bodies, legs, arms and camera-facing heads
  private horde: { meshes: THREE.InstancedMesh[]; heads: { im: THREE.InstancedMesh; pts: [number, number][] }[] } | null = null;
  private guns: THREE.Group[] = []; private gunI = 0;
  /** every soldier holds his rifle with both hands (his note): call inside show()'s extra */
  private gun(p: P3, pos: V3, look: [number, number], aim = 0) {
    const r = this.guns[this.gunI++]; if (!r) return; r.visible = true;
    const { G, Lh, d } = riflePose(pos, look, aim); hold(r, G, d, -0.0625, FWD); p.hand.R = G; p.hand.L = Lh;
  }
  private everyone = () => [...Object.values(this.P), ...this.crowd, ...this.lookCopies, ...this.patrol, ...this.search, ...this.sleepers];

  constructor(A: Cast3DAssets) {
    const R = this.root;
    R.add(this.sky, this.sun, this.sun.target);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096); this.sun.shadow.radius = 4;
    // ---------- sky dome (gradient, follows the camera) + clouds ----------
    this.domeU = { top: { value: new THREE.Color("#5FA8D8") }, hor: { value: new THREE.Color("#CDE9F2") } };
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.domeU,
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ float h = clamp(vP.y, -0.1, 1.0); vec3 c = mix(hor, top, pow(max(h,0.0), 0.55)); gl_FragColor = vec4(c, 1.0); }",
    }));
    this.dome.renderOrder = -10; this.dome.frustumCulled = false; R.add(this.dome);
    const cloudTex = tex(256, 128, (g) => { for (let i = 0; i < 14; i++) { const x = 40 + rnd() * 176, y = 60 + rnd() * 30, r = 22 + rnd() * 26; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.7, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
    for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false })); const a = rnd() * Math.PI * 2, r = 220 + rnd() * 90; s.position.set(Math.cos(a) * r, 45 + rnd() * 70, Math.sin(a) * r); s.scale.set(90 + rnd() * 60, 40 + rnd() * 20, 1); s.renderOrder = -9; this.clouds.push(s); R.add(s); }
    // ---------- the ground everywhere ----------
    const grass = MTR(tex(1024, 1024, (g) => {
      g.fillStyle = "#5E8E3A"; g.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 40; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(60,100,40,0.35)" : "rgba(130,150,70,0.3)"; g.beginPath(); g.ellipse(rnd() * 1024, rnd() * 1024, 60 + rnd() * 120, 40 + rnd() * 80, rnd() * 3, 0, 7); g.fill(); }
      speck(g, 1024, 1024, 5000, ["#3E6E2A", "#86B04E", "#4E7E32", "#6E5A3A"]);
      for (let i = 0; i < 9000; i++) { const x = rnd() * 1024, y = rnd() * 1024; g.strokeStyle = rnd() < 0.5 ? "rgba(40,80,25,0.5)" : "rgba(150,190,90,0.45)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 5, y - 4 - rnd() * 6); g.stroke(); }
    }, [140, 140]), 0.95);
    this.grassMat = grass;
    const gShape = new THREE.Shape([new THREE.Vector2(-700, -700), new THREE.Vector2(700, -700), new THREE.Vector2(700, 700), new THREE.Vector2(-700, 700)]);
    gShape.holes.push(new THREE.Path([new THREE.Vector2(TD[0] - 0.35, -TD[2] - 0.35), new THREE.Vector2(TD[0] - 0.35, -TD[2] + 0.35), new THREE.Vector2(TD[0] + 0.35, -TD[2] + 0.35), new THREE.Vector2(TD[0] + 0.35, -TD[2] - 0.35)]));
    const gm0 = (grass as THREE.MeshStandardMaterial).clone(); gm0.map = (grass as THREE.MeshStandardMaterial).map!.clone(); gm0.map.repeat.set(0.1, 0.1); gm0.map.needsUpdate = true;
    const ground = new THREE.Mesh(new THREE.ShapeGeometry(gShape), gm0); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; ground.receiveShadow = true; R.add(ground);
    this.buildPaddy(R);
    this.buildCamp(R);
    this.buildTent(R);
    this.buildCut(R);
    this.buildHome(R);
    this.buildJungle(R);
    this.buildAir(R);
    this.buildPeople(R, A);
    this.buildDetail(R);
    for (const p of this.everyone()) { richBody(p); const b = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.46), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, opacity: 0.55, depthWrite: false, color: "#1a1208" })); b.rotation.x = -Math.PI / 2; b.renderOrder = 1; R.add(b); this.blobs.set(p, b); }
    this.fx = new Fx(R, S.FX);
  }

  // ================================================================ PADDY (+ jungle edge, trapdoor, lookout)
  private buildPaddy(R: THREE.Group) {
    const wTex = tex(1024, 1024, (g) => {
      const gr = g.createLinearGradient(0, 0, 1024, 1024); gr.addColorStop(0, "#56D0CF"); gr.addColorStop(0.5, "#3FB9C4"); gr.addColorStop(1, "#5ED6CB"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 160; i++) { const x = rnd() * 1024, y = rnd() * 1024, r = 30 + rnd() * 120; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, rnd() < 0.5 ? "rgba(140,240,230,0.25)" : "rgba(20,110,130,0.2)"); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      g.lineCap = "round";
      for (let i = 0; i < 900; i++) { const x = rnd() * 1024, y = rnd() * 1024, w = 10 + rnd() * 40; g.strokeStyle = `rgba(235,255,250,${0.18 + rnd() * 0.35})`; g.lineWidth = 1 + rnd() * 2.2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 3 - rnd() * 4, x + w, y); g.stroke(); }
      for (let i = 0; i < 260; i++) { g.fillStyle = "rgba(255,255,255,0.85)"; const x = rnd() * 1024, y = rnd() * 1024; g.fillRect(x, y, 2 + rnd() * 3, 1.5); }
    }, [9, 6]);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(90, 56), new THREE.MeshStandardMaterial({ map: wTex, color: "#FFFFFF", emissive: "#0C4A50", emissiveIntensity: 0.35, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85 }));
    this.O.waterTex = wTex as any;
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.0, 24.5); water.receiveShadow = true; water.name = "paddyWater"; R.add(onGround(water, 1));
    const mud = MR("#6E5434", 0.95);
    const muddy = new THREE.Mesh(new THREE.PlaneGeometry(90, 56), mud); muddy.rotation.x = -Math.PI / 2; muddy.position.set(0, -0.08, 24.5); R.add(muddy);
    const dikeM = MTR(tex(256, 64, (g) => { g.fillStyle = "#6F8A3C"; g.fillRect(0, 0, 256, 64); speck(g, 256, 64, 400, ["#4E6A2A", "#8E7A4A", "#9AB45A"]); }, [20, 1]), 0.95);
    for (const z of [12, 26, 40]) R.add(box(90, 0.14, 1.0, dikeM, 0, -0.02, z));
    for (const x of [-22, 22]) R.add(box(1.0, 0.14, 56, dikeM, x, -0.02, 24.5));
    // the dry bank at the jungle edge, with an opening for the trapdoor hole
    { const hx0 = TD[0] - 0.35, hx1 = TD[0] + 0.35, hz0 = TD[2] - 0.35, hz1 = TD[2] + 0.35, z0 = -6.35, z1 = -2.85;
      R.add(box(hx0 + 45, 0.1, 3.5, dikeM, (-45 + hx0) / 2, -0.05, -4.6)); R.add(box(45 - hx1, 0.1, 3.5, dikeM, (hx1 + 45) / 2, -0.05, -4.6));
      R.add(box(0.7, 0.1, z1 - hz1, dikeM, TD[0], -0.05, (hz1 + z1) / 2)); R.add(box(0.7, 0.1, hz0 - z0, dikeM, TD[0], -0.05, (z0 + hz0) / 2));
      const shaftM = MTR(tex(128, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#6A4528"); gr.addColorStop(0.35, "#3A2416"); gr.addColorStop(1, "#070403"); g.fillStyle = gr; g.fillRect(0, 0, 128, 512); speck(g, 128, 512, 700, ["#2A160C", "#8A6040", "#4A3020"]); for (let i = 0; i < 14; i++) { g.strokeStyle = "rgba(40,24,12,0.6)"; g.lineWidth = 2; g.beginPath(); const x = rnd() * 128, y = rnd() * 200; g.moveTo(x, y); g.bezierCurveTo(x + 10, y + 20, x - 8, y + 40, x + 4, y + 70); g.stroke(); } }), 0.97);
      const D = 1.75;
      for (const [x, z, ry] of [[TD[0], hz0, 0], [TD[0], hz1, Math.PI], [hx0, TD[2], Math.PI / 2], [hx1, TD[2], -Math.PI / 2]] as const) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, D), shaftM); w.position.set(x, 0.05 - D / 2, z); w.rotation.y = ry; w.receiveShadow = true; R.add(w);
      }
      const bot = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), MR("#050302", 1)); bot.rotation.x = -Math.PI / 2; bot.position.set(TD[0], 0.05 - D, TD[2]); R.add(bot); }
    // rice: tufts in rows (not where Minh stands, not on the dikes)
    const pl: number[][] = [];
    for (let x = -26; x <= 26; x += 0.62) for (let z = -2.4; z <= 38; z += 0.62) {
      if (Math.hypot(x - M0[0], z - M0[2]) < 1.6 || [12, 26, 40].some((d) => Math.abs(z - d) < 0.75) || [-22, 22].some((d) => Math.abs(x - d) < 0.75)) continue;
      if (Math.hypot(x - LK[0], z - LK[2]) < 3) continue;
      pl.push([x + (rnd() - 0.5) * 0.12, -0.05, z + (rnd() - 0.5) * 0.12, 0.85 + 0.35 * rnd(), rnd() * 6]);
    }
    { const keep = pl.filter((q) => !(q[0] > -0.4 && q[0] < 0.85 && q[2] > 0.95 && q[2] < 3.3)); pl.length = 0; pl.push(...keep); }   // Fable5.2: the opening camera lane
    plant(R, riceParts(), pl, false);
    // far paddies: green rice fields as flat terraces with a sheen
    for (const [x, z, w, d] of [[-60, 20, 40, 50], [60, 30, 30, 40], [0, 70, 90, 30]]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MR("#86B84E", 0.6)); f.rotation.x = -Math.PI / 2; f.position.set(x, 0.01, z); f.name = "farPaddy"; R.add(onGround(f, 1)); }
    // the trapdoor at the jungle edge
    const td = PR.trapdoor(); td.position.set(...TD); td.children[0].visible = false; R.add(td); this.O.trapdoor = td.getObjectByName("door")!;
    // the lookout: a sandbag wall facing Minh, rifles leaning on it
    const sb = PR.sandbags(3.0, 4); const wl = S.LK; sb.position.set(wl[0] + LKD[0] * 0.55, 0.05, wl[2] + LKD[2] * 0.55); sb.rotation.y = Math.atan2(LKP[0], LKP[2]) - Math.PI / 2; R.add(sb);
    for (const a of [-1.3, 1.3]) { const r = PR.rifle(); r.position.set(wl[0] + LKD[0] * 0.38 + LKP[0] * a, 0.3, wl[2] + LKD[2] * 0.38 + LKP[2] * a); r.rotation.set(-1.25, Math.atan2(LKD[0], LKD[2]), 0); R.add(r); }
    const orn = PR.ornament(); R.add(orn); this.O.ornament = orn;
    // shovels and Minh's sandals
    const sh = PR.shovel(0.9); R.add(sh); this.O.shovel = sh;
    const big = PR.shovel(2.4); for (const k of [0, 1]) (big.children[k] as THREE.Mesh).material = PR.MAT.bamboo(); R.add(big); this.O.bigShovel = big;
    const sole = MR("#7A5530", 0.8), strap = MR("#3A2A1E", 0.7);
    for (const s of [-1, 1]) { const g = new THREE.Group(); g.add(PR.mesh(new THREE.BoxGeometry(0.075, 0.014, 0.15), sole, 0, 0.007, 0.02)); g.add(PR.mesh(new THREE.BoxGeometry(0.08, 0.012, 0.018), strap, 0, 0.022, 0.03)); g.position.set(M0[0] + s * 0.085, -0.007, M0[2] + 0.02); R.add(g); this.O["sandal" + s] = g; }
    { const rm = (o: number) => new THREE.MeshBasicMaterial({ color: "#EFFFFC", transparent: true, opacity: o, depthWrite: false });
      const rings = new THREE.Group(); R.add(rings); this.O.ripples = rings;
      for (const s2 of [-1, 1]) { const r = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.092, 32), rm(0.75)); r.rotation.x = -Math.PI / 2; r.scale.set(1, 1.6, 1); r.position.set(M0[0] + s2 * 0.085, 0.003, M0[2] + 0.02); rings.add(onGround(r, 2)); }
      for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.96, 1.0, 64), rm(0)); r.rotation.x = -Math.PI / 2; r.position.set(M0[0], 0.003, M0[2] + 0.02); r.name = "w" + i; rings.add(onGround(r, 2)); } }
  }

  // ================================================================ DETAIL: pebbles, grass tufts, puddles (his request: more detail in the dirt)
  private buildDetail(R: THREE.Group) {
    const peb: number[][] = [], tuft: number[][] = [];
    const scatter = (x0: number, x1: number, z0: number, z1: number, y: number, nP: number, nT: number, skip?: (x: number, z: number) => boolean) => {
      for (let i = 0; i < nP; i++) { const x = lerp(x0, x1, rnd()), z = lerp(z0, z1, rnd()); if (skip?.(x, z)) continue; peb.push([x, y, z, 0.5 + rnd() * 1.4, rnd() * 6]); }
      for (let i = 0; i < nT; i++) { const x = lerp(x0, x1, rnd()), z = lerp(z0, z1, rnd()); if (skip?.(x, z)) continue; tuft.push([x, y, z, 0.6 + rnd() * 0.8, rnd() * 6]); }
    };
    scatter(CAMP[0] - 28, CAMP[0] + 32, -76, 24, 0, 2400, 800, (x, z) => Math.hypot(x - PAD[0], z - PAD[2]) < 3.4 || (x > 78 && x < 84 && z > -4.5 && z < 1.2));
    scatter(-30, 30, -6.2, -3.0, 0.02, 500, 900, (x, z) => Math.abs(x - TD[0]) < 0.7 && Math.abs(z - TD[2]) < 0.7);
    scatter(cx(-10), cx(CUT_W + 10), -3.0, -0.05, CUT_H, 900, 1400, (x, z) => (x > cx(27.4) - 1 && x < cx(27.4) + 1) || (z > -1.9 && z < -0.6 && x > cx(1) && x < cx(16)) || (x > cx(41.5) && x < cx(44.5) && z > -1.4));
    scatter(cx(1), cx(16), -1.9, -0.6, CUT_H, 260, 0);                 // the path: pebbles only
    const tallL: number[][] = [];
    const floor = (x0: number, x1: number, z0: number, z1: number, y: number, nS: number, nT: number, skip: (x: number, z: number) => boolean) => {
      for (let i = 0; i < nS; i++) { const x = lerp(x0, x1, rnd()), z = lerp(z0, z1, rnd()); if (!skip(x, z)) tuft.push([x, y, z, 0.8 + rnd() * 1.1, rnd() * 6]); }
      for (let i = 0; i < nT; i++) { const x = lerp(x0, x1, rnd()), z = lerp(z0, z1, rnd()); if (!skip(x, z)) tallL.push([x, y, z, 0.7 + rnd() * 0.8, rnd() * 6]); }
    };
    floor(38, 126, -105, 42, 0, 14000, 4000, (x, z) => x > 53.5 && x < 108.5 && z > -82.5 && z < 26.5);
    floor(-48, 48, -48, -3.0, 0.02, 7000, 2200, (x, z) => Math.hypot(x - TD[0], z - TD[2]) < 2.3);   // keep the trapdoor clear (the camera dives in there)
    floor(cx(-25), cx(CUT_W + 25), -45, -3.0, CUT_H, 9000, 2400, () => false);
    const pg = new THREE.DodecahedronGeometry(0.03, 0); pg.scale(1, 0.55, 0.8);
    plant(R, [{ geo: pg, mat: MR("#8E8476", 0.85) }], peb, true);
    const tg: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 7; k++) { const c = new THREE.ConeGeometry(0.012, 0.16 + 0.06 * (k % 3), 3); c.translate(0, 0.09, 0); c.rotateZ((k - 3) * 0.16); c.rotateY(k * 0.9); tg.push(c); }
    plant(R, [{ geo: merge(tg), mat: MR("#4E8A30", 0.8) }], tuft, false);
    plant(R, [{ geo: tallGrassGeo(), mat: MR("#5E9A34", 0.8) }], tallL, false);
    // puddles in the camp (they reflect the sky)
    const pm = new THREE.MeshStandardMaterial({ color: "#5E6A72", roughness: 0.04, metalness: 0.4 });
    for (const [x, z, w, d] of [[76.5, 3.5, 1.6, 0.9], [86.5, 9, 1.2, 0.7], [71.5, 10.5, 2.0, 1.1], [90, 4, 1.0, 0.6]]) { const p = new THREE.Mesh(new THREE.CircleGeometry(1, 28), pm); p.scale.set(w / 2, d / 2, 1); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.016, z); p.receiveShadow = true; p.name = "puddle"; R.add(onGround(p, 2)); }
  }

  // ================================================================ CAMP
  private buildCamp(R: THREE.Group) {
    const dirt = MTR(tex(1024, 1024, (g) => {
      g.fillStyle = "#A6875E"; g.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 30; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(110,80,50,0.3)" : "rgba(200,170,120,0.3)"; g.beginPath(); g.ellipse(rnd() * 1024, rnd() * 1024, 80 + rnd() * 140, 50 + rnd() * 90, rnd() * 3, 0, 7); g.fill(); }
      speck(g, 1024, 1024, 6000, ["#7A603E", "#C8A878", "#8E7048", "#5E4A30"]);
      for (const y0 of [300, 700]) for (const off of [0, 70]) { g.strokeStyle = "rgba(80,58,34,0.45)"; g.lineWidth = 16; g.setLineDash([10, 7]); g.beginPath(); g.moveTo(0, y0 + off); g.bezierCurveTo(300, y0 + off - 60, 700, y0 + off + 60, 1024, y0 + off); g.stroke(); } g.setLineDash([]);
      for (let i = 0; i < 160; i++) { const x = rnd() * 1024, y = rnd() * 1024, a = rnd() * 6; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = "rgba(90,66,40,0.4)"; g.beginPath(); g.ellipse(0, 0, 5, 11, 0, 0, 7); g.fill(); g.restore(); }
      for (let i = 0; i < 500; i++) { const x = rnd() * 1024, y = rnd() * 1024, r = 2 + rnd() * 4; g.fillStyle = "rgba(60,46,30,0.5)"; g.beginPath(); g.arc(x + 1.5, y + 1.5, r, 0, 7); g.fill(); g.fillStyle = rnd() < 0.5 ? "#B8A488" : "#8E8272"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    }, [7, 11]), 0.97);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(64, 104), dirt); pad.rotation.x = -Math.PI / 2; pad.position.set(CAMP[0] + 2, 0.012, CAMP[2] - 26); pad.receiveShadow = true; pad.name = "campDirt"; R.add(onGround(pad, 1));   // Fable5.2: never flickers with the grass under it
    for (let i = 0; i < 7; i++) { const t = PR.tent(); t.position.set(CAMP[0] - 12 + i * 4.2, 0, -64); R.add(t); }
    for (let i = 0; i < 4; i++) { const t = PR.tent(); t.position.set(CAMP[0] + 14, 0, -0.6 + i * 5.2); t.rotation.y = -Math.PI / 2; R.add(t); }   // clear of the helipad (his note)
    for (let i = 0; i < 3; i++) { const t = PR.tent(); t.position.set(CAMP[0] - 15, 0, -6 + i * 5.2); t.rotation.y = Math.PI / 2; R.add(t); }
    const t0 = PR.tent(); t0.position.set(CAL[0] - 1.4, 0, CAL[2] - 2.6); R.add(t0);
    const sbw = (x: number, z: number, len: number, ry: number) => { const s = PR.sandbags(len, 3); s.position.set(x, 0, z); s.rotation.y = ry; R.add(s); };
    sbw(CAMP[0] - 22, -25, 80, Math.PI / 2); sbw(CAMP[0] + 24, -27, 80, Math.PI / 2); sbw(CAMP[0], -72, 48, 0);
    // the calendar pole
    const pole = new THREE.Group(); pole.position.set(...CAL); pole.add(PR.mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 10), PR.MAT.wood(), 0, 1.0, 0));
    const cal = PR.calendar(); cal.position.set(0, 1.05, 0.06); pole.add(cal); R.add(pole); this.O.calPage = cal.getObjectByName("page")!;
    // helipad
    const hp = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), MTR(tex(256, 256, (g) => { g.fillStyle = "#8E8C86"; g.fillRect(0, 0, 256, 256); speck(g, 256, 256, 500, ["#6E6C66", "#B0AEA6"]); g.fillStyle = "#F0EDE2"; g.fillRect(80, 60, 24, 136); g.fillRect(152, 60, 24, 136); g.fillRect(100, 116, 56, 24); g.strokeStyle = "#F0EDE2"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke(); }), 0.9));
    hp.rotation.x = -Math.PI / 2; hp.position.set(PAD[0], 0.016, PAD[2]); hp.receiveShadow = true; hp.name = "helipad"; R.add(onGround(hp, 2));
    // crates, a watchtower, barrels
    const crate = MR("#7A6A3A", 0.85);
    for (const [x, z] of [[73, 4], [73.6, 4.4], [73.2, 3.3], [88, 6], [88.6, 6.2]]) R.add(box(0.55, 0.45, 0.55, crate, x, 0, z));
    for (const [x, z] of [[70.5, 7], [71, 7.4], [70.7, 6.5]]) R.add(PR.mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 16), MR("#3E5A2A", 0.6, 0.3), x, 0.3, z));
    const tw = new THREE.Group(); tw.position.set(CAMP[0] - 18, 0, -18);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) tw.add(PR.mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8), PR.MAT.wood(), sx * 0.8, 1.8, sz * 0.8));
    tw.add(box(2.0, 0.12, 2.0, PR.MAT.wood(), 0, 3.4, 0)); tw.add(box(2.0, 0.6, 0.06, PR.MAT.wood(), 0, 3.5, 1.0)); tw.add(PR.mesh(new THREE.ConeGeometry(1.6, 0.8, 4), PR.MAT.canvas(), 0, 4.6, 0)); R.add(tw);
  }

  // ================================================================ WAR-ROOM TENT (inside the camp)
  private buildTent(R: THREE.Group) {
    const t = PR.tent(5.0, 6.0, 1.7, 1.1, true); t.position.set(...WT); R.add(t);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 5.9), MTR(tex(256, 256, (g) => { g.fillStyle = "#8A6E48"; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) { g.fillStyle = "rgba(60,40,20,0.4)"; g.fillRect(0, y, 256, 2); } speck(g, 256, 256, 300, ["#5E4A2E", "#A88A5E"]); }, [3, 4]), 0.9));
    floor.rotation.x = -Math.PI / 2; floor.position.set(WT[0], 0.016, WT[2]); floor.receiveShadow = true; floor.name = "tentFloor"; R.add(onGround(floor, 2));
    const tb = PR.mapTable(1.6, 1.1); tb.position.set(...TABLE); R.add(tb);
    // the open-field battle plan (S13) lying over the jungle map
    const plan = PR.mesh(new THREE.PlaneGeometry(1.2, 0.8), MTR(tex(512, 340, (g) => { g.fillStyle = "#D9E6B0"; g.fillRect(0, 0, 512, 340); g.fillStyle = "#9CC46A"; for (let i = 0; i < 6; i++) g.fillRect(0, i * 60 + 10, 512, 26); g.strokeStyle = "#2A3A6A"; g.lineWidth = 4; g.strokeRect(14, 14, 484, 312); g.fillStyle = "#2A3A6A"; g.font = "bold 28px Arial"; g.fillText("OPEN FIELD PLAN", 150, 52); }), 0.9), TABLE[0] + 0.1, 0.506, TABLE[2] + 0.02);
    plan.rotation.x = -Math.PI / 2; R.add(plan); this.O.plan = plan;
    // the cork board on the back wall, with papers and PHOTO 2
    const bd = PR.mesh(new THREE.BoxGeometry(1.3, 0.85, 0.04), MTR(tex(256, 160, (g) => { g.fillStyle = "#B88A52"; g.fillRect(0, 0, 256, 160); speck(g, 256, 160, 900, ["#8A5E30", "#D8AE76"]); g.strokeStyle = "#5E3E1E"; g.lineWidth = 8; g.strokeRect(0, 0, 256, 160); }), 0.95), WT[0] - 0.4, 0.95, WT[2] - 2.92);
    R.add(bd);
    for (const [x, y, w, h, c] of [[-0.85, 1.1, 0.24, 0.3, "#F4F0E2"], [-0.05, 1.12, 0.26, 0.2, "#F6E9A8"], [0.05, 0.75, 0.22, 0.26, "#F4F0E2"]] as const) R.add(PR.mesh(new THREE.PlaneGeometry(w, h), MR(c, 0.9), WT[0] + x, y, WT[2] - 2.895));
    const mkPhoto = (w: number, h: number) => {
      const c = mkCanvas(270, 480), g = c.getContext("2d")!; g.fillStyle = "#3A4A5A"; g.fillRect(0, 0, 270, 480);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const mat = new THREE.MeshBasicMaterial({ map: tx, color: new THREE.Color(0.95, 0.93, 0.9) });
      const grp = new THREE.Group(); grp.add(PR.mesh(new THREE.PlaneGeometry(w + 0.03, h + 0.05), MR("#F7F5EE", 0.8), 0, -0.008, -0.001));
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); grp.add(pic);
      grp.add(PR.mesh(new THREE.SphereGeometry(0.012, 12, 10), MR("#D0302A", 0.3), 0, h / 2 + 0.005, 0.01));
      return { grp, mat, c, tex: tx };
    };
    const p1 = mkPhoto(S.PHOTO1.w, S.PHOTO1.h); p1.grp.position.set(...S.PHOTO1.c); p1.grp.rotation.x = -Math.PI / 2; R.add(p1.grp); this.photo1 = p1;
    const p2 = mkPhoto(S.PHOTO2.w, S.PHOTO2.h); p2.grp.position.set(...S.PHOTO2.c); R.add(p2.grp); this.photo2 = p2;
    // a hanging lamp (warm), crates, a radio, a chair
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.2) })); bulb.position.set(WT[0], 1.95, WT[2] - 0.6); R.add(bulb);
    R.add(PR.mesh(new THREE.ConeGeometry(0.2, 0.12, 20, 1, true), MR("#3E4A2A", 0.6, 0.3), WT[0], 2.03, WT[2] - 0.6));
    R.add(PR.mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.75, 4), MAT_BLACK(), WT[0], 2.45, WT[2] - 0.6));
    const L = new THREE.PointLight("#FFC27A", 3.0, 7, 1.5); L.position.set(WT[0], 1.9, WT[2] - 0.6); R.add(L); this.tentLights.push(L);
    const crate = MR("#7A6A3A", 0.85);
    R.add(box(0.6, 0.5, 0.5, crate, WT[0] + 1.6, 0, WT[2] - 2.3)); R.add(box(0.5, 0.4, 0.45, crate, WT[0] + 1.6, 0.5, WT[2] - 2.3));
    R.add(box(0.36, 0.2, 0.22, MR("#3E4A2E", 0.6, 0.3), WT[0] + 1.6, 0.9, WT[2] - 2.3));
    R.add(PR.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 4), MAT_BLACK(), WT[0] + 1.7, 1.33, WT[2] - 2.3));
    R.add(box(0.4, 0.42, 0.4, PR.MAT.wood(), WT[0] - 1.6, 0, WT[2] + 0.3));
    // toys for S5 and S13 (pushed by the general's hands)
    const T = TABLE, top = 0.505;
    const g = this.toys, gs = (x: number, z: number): V3 => [T[0] + x, top, T[2] + z];
    for (let i = 0; i < 3; i++) { const b = PR.bomb(); b.scale.setScalar(0.08); b.rotation.z = Math.PI / 2; R.add(b); g.push({ o: b, from: gs(-0.15 + i * 0.07, -0.6), to: gs(-0.25 + i * 0.09, -0.1), a: 21.9, b: 22.45 }); }
    for (let i = 0; i < 2; i++) { const j = PR.jet(); j.scale.setScalar(0.024); j.rotation.y = 2.6; R.add(j); g.push({ o: j, from: gs(0.25 + i * 0.12, -0.6), to: gs(0.1 + i * 0.18, -0.25), a: 22.9, b: 23.45 }); }
    for (let i = 0; i < 12; i++) { const s = PR.toySoldier(); R.add(s); g.push({ o: s, from: gs(-0.35 + (i % 6) * 0.07, -0.62 + Math.floor(i / 6) * 0.07), to: gs(-0.35 + (i % 6) * 0.07, 0.1 + Math.floor(i / 6) * 0.07), a: 24.0, b: 24.55 }); }
    const fr = PR.toyFarmer(); R.add(fr); g.push({ o: fr, from: gs(0.55, 0.25), to: gs(0.55, 0.25), a: 0, b: 0 });
    // S13: big arrows and tank tokens slapped onto the plan ("open battle")
    for (let i = 0; i < 3; i++) { const a = PR.arrow(0.36); a.rotation.y = Math.PI; R.add(a); g.push({ o: a, from: gs(-0.3 + i * 0.3, -0.3), to: gs(-0.3 + i * 0.3, 0.05), a: 59.2, b: 59.55, show: [59.1, 63] }); }
    for (let i = 0; i < 2; i++) { const k = PR.tank(); k.scale.setScalar(0.03); k.rotation.y = Math.PI; R.add(k); g.push({ o: k, from: gs(-0.15 + i * 0.3, -0.5), to: gs(-0.15 + i * 0.3, -0.2), a: 59.25, b: 59.55, show: [59.1, 63] }); }
    const fl = PR.flashlight(); R.add(fl); this.O.flashlight = fl;
  }

  // ================================================================ THE CUT-OPEN GROUND (+ the surface: jungle, later the base)
  private buildCut(R: THREE.Group) {
    const cut = PR.cutaway(S.CUT_ROWS, S.CELL, CUT_D); cut.position.set(CUT_X, 0, 0); R.add(cut);
    const top = MR("#4E8A32", 0.9);
    // the land around it: plateau behind (z < -3), solid blocks left and right, all at the surface height
    R.add(box(CUT_W + 160, CUT_H, 120, PR.soilMat(CUT_W + 160, CUT_H), CUT_X + CUT_W / 2, 0, -CUT_D - 60));
    const sideM = PR.soilMat(80, CUT_H); R.add(box(80, CUT_H, CUT_D, sideM, CUT_X - 40, 0, -CUT_D / 2)); R.add(box(80, CUT_H, CUT_D, sideM, CUT_X + CUT_W + 40, 0, -CUT_D / 2));
    const gm = (this.grassMat as THREE.MeshStandardMaterial).clone(); gm.map = (this.grassMat as THREE.MeshStandardMaterial).map!.clone(); gm.map.repeat.set(20, 14); gm.map.needsUpdate = true;
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(CUT_W + 160, 123), gm); gr.rotation.x = -Math.PI / 2; gr.position.set(CUT_X + CUT_W / 2, CUT_H + 0.003, -61.5); gr.receiveShadow = true; gr.name = "cutGrass"; R.add(onGround(gr, 1));
    // the ground in front of the cut (a dug pit floor)
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(CUT_W + 160, 60), PR.soilMat(CUT_W + 160, 60, "#9A7E70")); pit.rotation.x = -Math.PI / 2; pit.position.set(CUT_X + CUT_W / 2, 0.003, 30); pit.receiveShadow = true; pit.name = "pitFloor"; R.add(onGround(pit, 1));
    // plugs: the tunnel Minh digs in S8 is filled with soil until he digs it (0.5 m pieces)
    const plugM = PR.soilMat(0.5, 1.4);
    for (let x = 2.3; x < 13.2; x += 0.5) { const p = PR.mesh(new THREE.BoxGeometry(0.5, 1.4, CUT_D - 0.02), plugM, cx(x + 0.25), F1 + 0.7, -CUT_D / 2); R.add(p); this.plugs.push({ o: p, x }); }
    // lamps: glow everywhere, a few real lights in the rooms (light comes on along the tunnels as he digs)
    const lampAt = (x: number, y: number, light: boolean) => { const l = PR.oilLamp(light); l.position.set(cx(x), y, -0.75); R.add(l); this.lamps.push({ o: l, x }); if (light) this.cutLights.push(l.getObjectByName("light") as THREE.Light); return l; };
    this.O.digLamp = lampAt(1.6, F1, true);                       // his own lamp: he moves it along as he digs (his note)
    lampAt(15.0, F1, true); lampAt(20.0, F1, true); lampAt(24.0, F1, true); lampAt(30.6, F1, true); lampAt(28.2, F2, true); lampAt(36.8, F1, true); lampAt(42.0, F1, true);
    for (const x of [5, 12, 18, 24, 34, 40, 44]) lampAt(x, F2, false);
    for (const x of [33.0]) lampAt(x, 0.25, false);
    // rooms: kitchen (pot), hospital (cots), beds (hammocks), the ladder, the hammock room under Max, stores
    const at = (o: THREE.Object3D, x: number, y: number, z: number, ry = 0) => { o.position.set(cx(x), y, z); o.rotation.y = ry; R.add(o); return o; };
    at(PR.cookingPot(), 15.4, F1, -1.4);
    const shelf = at(new THREE.Group(), 16.9, F1, -2.6); shelf.add(box(0.8, 0.05, 0.3, PR.MAT.bamboo(), 0, 0.6, 0)); for (let i = 0; i < 4; i++) shelf.add(PR.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), MR(["#C8A060", "#8A5A30", "#E8E0C8", "#5A7A3A"][i], 0.7), -0.3 + i * 0.2, 0.71, 0));
    at(PR.cot(), 20.4, F1, -1.6); at(PR.cot(), 21.6, F1, -2.4, 0.2);
    at(PR.hammock(1.4), 24.8, F1, -1.5); at(PR.hammock(1.3), 24.9, F1, -2.6);
    at(PR.ladder(2.5), 29.85, F2, -0.9);
    at(PR.ladder(1.9), 27.0, F1 + 0.6, -1.0);
    at(PR.hammock(1.6), 43.0, F1, -1.2);
    for (let i = 0; i < 5; i++) at(PR.mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), MR("#7A6A3A", 0.85)), 31.6 + i * 0.5, 0.25 + 0.15, -1.6);
    // S8: clods of dirt he throws back (instanced; positions worked out from time, so every frame is the same on every render)
    { const N = 60, im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), MR("#6A3820", 0.95), N); im.castShadow = true; im.frustumCulled = false; im.visible = false; R.add(im); this.O.clods = im;
      const seeds: number[][] = []; for (let i = 0; i < N; i++) seeds.push([rnd(), rnd(), rnd(), rnd()]); (im as any).seeds = seeds; }
    // a tea cup (Minh carries it in S11 and S17)
    const cup = new THREE.Group(); cup.add(PR.mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.06, 16), MR("#F2EEE4", 0.4), 0, 0.03, 0)); cup.add(PR.mesh(new THREE.TorusGeometry(0.018, 0.005, 8, 12), MR("#F2EEE4", 0.4), 0.04, 0.03, 0)); R.add(cup); this.O.cup = cup;
    // surface: trapdoors (S10 holes), the termite mound, bushes along the front edge, jungle trees on top
    const holeM = MTR(tex(128, 128, (g) => { const r = g.createRadialGradient(64, 58, 6, 64, 64, 70); r.addColorStop(0, "#020101"); r.addColorStop(0.55, "#0A0503"); r.addColorStop(0.8, "#3A2212"); r.addColorStop(1, "#6A4228"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }), 1);
    for (const x of VENTS) { const d = at(PR.trapdoor(), x, CUT_H + 0.045, -1.7); (d.children[0] as THREE.Mesh).material = holeM; this.O["hole" + x] = d.getObjectByName("door")!; }
    // his note: the vents hide in tall grass, ferns and low bushes (a ring around each hole, the eyes peek out between the blades)
    { const tall: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 11; k++) { const h = 0.42 + 0.3 * ((k * 37) % 11) / 11, c = new THREE.ConeGeometry(0.016, h, 3); c.translate(0, h / 2, 0); c.rotateZ((k - 5) * 0.07); c.rotateY(k * 1.9); c.translate(((k * 13) % 7 - 3) * 0.012, 0, ((k * 5) % 7 - 3) * 0.012); tall.push(c); }
      const tallParts: Inst = [{ geo: merge(tall), mat: MR("#5E9A34", 0.8) }], clumps: number[][] = [], ferns: number[][] = [], low: number[][] = [];
      for (const x of VENTS) {
        for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2 + rnd() * 0.4, r = 0.46 + rnd() * 0.16; clumps.push([cx(x) + Math.cos(a) * r, CUT_H + 0.03, -1.7 + Math.sin(a) * r * 0.9, 0.9 + 0.5 * rnd(), rnd() * 6]); }
        ferns.push([cx(x) - 0.15, CUT_H + 0.02, -2.25, 0.5 + 0.15 * rnd(), rnd() * 6], [cx(x) + 0.35, CUT_H + 0.02, -2.15, 0.45, rnd() * 6]);
        low.push([cx(x) + 0.05, CUT_H, -2.6, 0.55, rnd() * 6]);
      }
      for (let i = 0; i < 220; i++) { const x = cx(3.5 + rnd() * 10), z = -3.0 + rnd() * 2.9; const lx = x - cx(0);
        if (z > -1.35 && z < -0.55) continue; if (VENTS.some((v) => Math.hypot(lx - v, (z + 1.7) / 0.9) < 0.42)) continue; if (Math.abs(lx - PIT_X) < 0.8 && z > -1.5) continue;
        clumps.push([x, CUT_H + 0.03, z, 0.7 + 0.7 * rnd(), rnd() * 6]); }
      for (let i = 0; i < 26; i++) { const x = cx(3.5 + rnd() * 10), z = -3.0 + rnd() * 1.5; ferns.push([x, CUT_H + 0.02, z, 0.4 + 0.25 * rnd(), rnd() * 6]); }
      plant(R, tallParts, clumps, false); plant(R, bananaParts(), ferns, true); plant(R, bushParts(), low, true); }
    at(PR.trapdoor(), 1.9, CUT_H + 0.005, -1.2);
    const mound = at(PR.termiteMound(), 27.0, CUT_H, -0.95); this.O.lid = mound.getObjectByName("lid")!;
    // the pit and tripwire the team sets (S10)
    const pitCover = at(new THREE.Group(), PIT_X, CUT_H + 0.062, -0.95);
    for (let i = 0; i < 9; i++) pitCover.add(PR.mesh(new THREE.BoxGeometry(0.03, 0.025, 0.95).rotateY((rnd() - 0.5) * 0.3), PR.MAT.bamboo(), -0.6 + i * 0.15, 0.0, 0));
    for (let i = 0; i < 46; i++) { const l = PR.mesh(new THREE.CircleGeometry(0.07 + 0.05 * rnd(), 6).scale(1.8, 1, 1), MR(["#4E7A2C", "#6E9A3A", "#8A6A2C"][i % 3], 0.85), (rnd() - 0.5) * 1.25, 0.015 + i * 0.0005, (rnd() - 0.5) * 0.85); l.rotation.set(-Math.PI / 2, 0, rnd() * 6); pitCover.add(l); }
    this.O.pitCover = pitCover;
    const pitHole = PR.mesh(new THREE.BoxGeometry(1.25, 0.02, 0.9), holeM, cx(PIT_X), CUT_H + 0.04, -0.95); R.add(pitHole); this.O.pitHole = pitHole;
    // the land in front of the cut (only for the shots on the surface: S10, S16), so the jungle path never ends at an edge
    const FL = new THREE.Group(); FL.visible = false; R.add(FL); this.O.frontLand = FL;
    FL.add(box(CUT_W + 160, CUT_H, 60, PR.soilMat(CUT_W + 160, CUT_H), CUT_X + CUT_W / 2, 0, 30.001));
    const fg = gm.clone(); fg.map = gm.map!.clone(); fg.map.repeat.set(20, 6); fg.map.needsUpdate = true;
    const flg = new THREE.Mesh(new THREE.PlaneGeometry(CUT_W + 160, 60), fg); flg.rotation.x = -Math.PI / 2; flg.position.set(CUT_X + CUT_W / 2, CUT_H + 0.003, 30); flg.receiveShadow = true; flg.name = "frontGrass"; FL.add(onGround(flg, 1));
    const fT: number[][] = [], fP: number[][] = [], fB: number[][] = [];
    for (let x = -40; x < CUT_W + 40; x += 1.9) for (let z = 6; z < 50; z += 2.4) { if (rnd() < 0.3) continue; (rnd() < 0.5 ? fT : fP).push([cx(x + rnd() * 1.4), CUT_H, z + rnd() * 1.5, 0.8 + 0.6 * rnd(), rnd() * 6]); }
    for (let x = -30; x < CUT_W + 30; x += 1.2) { if (rnd() < 0.4) continue; fB.push([cx(x + rnd()), CUT_H, 1.6 + rnd() * 4, 0.5 + 0.4 * rnd(), rnd() * 6]); }
    for (const A of [fT, fP, fB]) { const keep = A.filter((q) => !(q[0] > cx(33) && q[0] < cx(48) && q[2] < 15.5)); A.length = 0; A.push(...keep); }   // Fable5.2: S16 camera rises here
    FL.userData.camFree = true;   // the camera comes up through this land at 70.3 s while it is still hidden
    plant(FL, broadParts(), fT); plant(FL, palmParts(), fP); plant(FL, bushParts(), fB);
    // jungle on top (hidden once the base is built)
    const tops: number[][] = [], bushes: number[][] = [], palms: number[][] = [];
    for (let x = -30; x < CUT_W + 30; x += 2.2) for (let z = -4; z > -60; z -= 2.6) { if (rnd() < 0.35) continue; const p = [cx(x + rnd() * 1.5), CUT_H, z - rnd() * 1.5, 0.8 + 0.6 * rnd(), rnd() * 6]; (rnd() < 0.5 ? tops : palms).push(p); }
    for (let x = 0.4; x < CUT_W; x += 1.3 + rnd()) { if (Math.abs(x - 27) < 1.2 || (x > 1 && x < 16) || (x > 41 && x < 45.5)) continue; bushes.push([cx(x), CUT_H, -0.25 - rnd() * 0.3, 0.55 + 0.3 * rnd(), rnd() * 6]); }
    for (let x = 1; x < CUT_W; x += 3.2) if (rnd() < 0.6 && Math.abs(x - 27) > 2 && (x < 3 || x > 13)) tops.push([cx(x), CUT_H, -2.4 - rnd() * 0.4, 0.55 + 0.25 * rnd(), rnd() * 6]);
    const baseZone = (p: number[]) => p[0] > cx(28) && p[0] < cx(41) && p[2] > -16;
    plant(R, broadParts(), tops.filter((p) => !baseZone(p))); plant(R, palmParts(), palms.filter((p) => !baseZone(p)));
    plant(R, bushParts(), bushes, true);
    // the US base built on top (visible from 60 s): tents, sandbags, a helipad with a helicopter, a watchtower, a flag-less pole
    const B = this.baseTop; B.visible = false; R.add(B);
    for (let i = 0; i < 3; i++) { const t = PR.tent(2.6, 2.2, 0.9, 0.8); t.position.set(cx(29.5 + i * 3.4), CUT_H, -1.55); B.add(t); }
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const t = PR.tent(); t.position.set(cx(28.5 + i * 3.6), CUT_H, -7 - r * 6); B.add(t); }
    const sbw = PR.sandbags(13, 3); sbw.position.set(cx(34.5), CUT_H, -0.15); B.add(sbw);
    const heli = PR.helicopter(); heli.position.set(cx(38), CUT_H, -16); heli.rotation.y = 0.6; B.add(heli);
    const tw = new THREE.Group(); tw.position.set(cx(29), CUT_H, -13);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) tw.add(PR.mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8), PR.MAT.wood(), sx * 0.8, 1.8, sz * 0.8));
    tw.add(box(2.0, 0.12, 2.0, PR.MAT.wood(), 0, 3.4, 0)); tw.add(PR.mesh(new THREE.ConeGeometry(1.6, 0.8, 4), PR.MAT.canvas(), 0, 4.6, 0)); B.add(tw);
    const tankB = PR.tank(); tankB.position.set(cx(40), CUT_H, -9); tankB.rotation.y = -0.4; B.add(tankB);
    const dirtTop = new THREE.Mesh(new THREE.PlaneGeometry(14, 22), MR("#A6875E", 0.97)); dirtTop.rotation.x = -Math.PI / 2; dirtTop.position.set(cx(34.5), CUT_H + 0.006, -10.5); dirtTop.receiveShadow = true; B.add(onGround(dirtTop, 2));
  }

  // ================================================================ HOME KITCHEN (night) + the backyard outside the window
  private buildHome(R: THREE.Group) {
    const H = HOME, wall = MR("#E8C86A", 0.9), wood = PR.MAT.wood();
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), MTR(tex(256, 256, (g) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#E8E2D2" : "#4A6A9A"; g.fillRect(x * 32, y * 32, 32, 32); } }, [4, 3]), 0.6));
    fl.rotation.x = -Math.PI / 2; fl.position.set(H[0], 0.004, -0.0); fl.receiveShadow = true; fl.name = "kitchenFloor"; R.add(onGround(fl, 2));
    // back wall with a window (x 0.5..1.3, y 0.75..1.45)
    const wz = -1.6, wx0 = H[0] + 0.5, wx1 = H[0] + 1.3, wy0 = 0.75, wy1 = 1.45;
    R.add(box(wx0 - (H[0] - 2.3), 2.3, 0.1, wall, (H[0] - 2.3 + wx0) / 2, 0, wz)); R.add(box(H[0] + 2.3 - wx1, 2.3, 0.1, wall, (wx1 + H[0] + 2.3) / 2, 0, wz));
    R.add(box(wx1 - wx0, wy0, 0.1, wall, (wx0 + wx1) / 2, 0, wz)); R.add(box(wx1 - wx0, 2.3 - wy1, 0.1, wall, (wx0 + wx1) / 2, wy1, wz));
    for (const [w, h, x, y] of [[wx1 - wx0 + 0.08, 0.05, (wx0 + wx1) / 2, wy0 - 0.03], [wx1 - wx0 + 0.08, 0.05, (wx0 + wx1) / 2, wy1 - 0.02], [0.05, wy1 - wy0, wx0, wy0], [0.05, wy1 - wy0, wx1, wy0], [0.03, wy1 - wy0, (wx0 + wx1) / 2, wy0]]) R.add(box(w, h, 0.12, MR("#F6F2E8", 0.6), x, y, wz));
    R.add(box(0.1, 2.3, 3.4, wall, H[0] - 2.3, 0, 0.1)); R.add(box(0.1, 2.3, 3.4, wall, H[0] + 2.3, 0, 0.1));
    R.add(box(4.7, 0.08, 3.4, MR("#F4EEDF", 0.9), H[0], 2.3, 0.1));
    // counter along the back wall (left of the window), fridge, table with plates
    R.add(box(1.8, 0.5, 0.5, MR("#4A7AB8", 0.6), H[0] - 1.3, 0, wz + 0.3)); R.add(box(1.84, 0.04, 0.54, MR("#EDEAE2", 0.4), H[0] - 1.3, 0.5, wz + 0.3));
    R.add(box(0.6, 1.3, 0.55, MR("#F2F2EE", 0.35, 0.1), H[0] + 1.9, 0, wz + 0.35));
    R.add(box(1.2, 0.05, 0.7, wood, H[0] - 0.1, 0.45, 0)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) R.add(box(0.05, 0.45, 0.05, wood, H[0] - 0.1 + sx * 0.52, 0, sz * 0.28));
    const plates: THREE.Object3D[] = [];
    for (const [x, z] of [[-0.45, 0.12], [0.25, 0.15], [-0.05, -0.18]]) { const p = PR.mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.02, 24), MR("#F7F7F2", 0.3), H[0] + x, 0.51, z); R.add(p); plates.push(p); }
    this.O.plates = new THREE.Group(); (this.O.plates as any).list = plates;
    R.add(PR.mesh(new THREE.SphereGeometry(0.05, 16, 12), MR("#D8402A", 0.5), H[0] + 0.32, 0.53, -0.2)); R.add(PR.mesh(new THREE.SphereGeometry(0.045, 16, 12), MR("#E8C030", 0.5), H[0] + 0.4, 0.53, -0.16));
    // the round kitchen lamp (the match from the tunnel lamp)
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.85, 1.3) })); globe.position.set(H[0], 1.95, -0.25); R.add(globe);
    R.add(PR.mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4), MAT_BLACK(), H[0], 2.2, -0.25));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: PR.glowTex(), color: new THREE.Color(1.6, 1.2, 0.7), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(1.1, 1.1, 1); glow.position.copy(globe.position); R.add(glow);
    const L = new THREE.PointLight("#FFD08A", 3.2, 6, 1.4); L.position.set(H[0], 1.85, -0.25); R.add(L); this.homeLights.push(L);
    // the hammer and the fly
    const hm = PR.hammer(0.8); R.add(hm); this.O.hammer = hm;
    const fly = PR.fly(); fly.scale.setScalar(1.6); R.add(fly); this.O.fly = fly;
    // outside: a night backyard (grass, fence, a tree, a neighbour's house with lit windows, the moon)
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), MR("#3E6A3A", 0.95)); yard.rotation.x = -Math.PI / 2; yard.position.set(H[0], 0.002, wz - 15); yard.name = "yard"; R.add(onGround(yard, 1));
    for (let i = 0; i < 24; i++) R.add(box(0.12, 0.9, 0.04, MR("#D8CBB0", 0.8), H[0] - 6 + i * 0.5, 0, wz - 5));
    R.add(box(12, 0.06, 0.03, MR("#D8CBB0", 0.8), H[0], 0.7, wz - 5.03));
    const house = new THREE.Group(); house.position.set(H[0] + 1.5, 0, wz - 11);
    house.add(box(6, 3.2, 4, MR("#B86A4A", 0.9), 0, 0, 0)); house.add(PR.mesh(new THREE.ConeGeometry(4.6, 1.6, 4).rotateY(Math.PI / 4), MR("#5A3A3A", 0.8), 0, 4.0, 0));
    for (const x of [-1.6, 0, 1.6]) house.add(PR.mesh(new THREE.PlaneGeometry(0.7, 0.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.4, 0.7) }), x, 1.8, 2.01));
    R.add(house);
    const tr = broadParts(); plant(R, tr, [[H[0] - 2.5, 0, wz - 7.5, 1.2, 0.5], [H[0] + 5.5, 0, wz - 8.0, 1.0, 1.2]]);
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: PR.glowTex(), color: new THREE.Color(2.0, 2.0, 1.8), fog: false })); moon.scale.set(5, 5, 1); moon.position.set(H[0] - 6, 14, wz - 40); R.add(moon);
  }

  // ================================================================ JUNGLE around everything (instanced)
  private buildJungle(R: THREE.Group) {
    const palms: number[][] = [], broad: number[][] = [], bushes: number[][] = [], bananas: number[][] = [];
    const free = (x: number, z: number) => {
      if (x > -32 && x < 32 && z > -3.6 && z < 45) return false;                          // paddy
      if (x > 54 && x < 108 && z > -82 && z < 26) return false;                           // camp (with the big parade ground)
      if (x > CUT_X - 70 && x < CUT_X + CUT_W + 70 && z > -70 && z < 40) return false;   // the cut (has its own)
      if (x > HOME[0] - 30) return false;
      if (x > TD[0] - 6 && x < TD[0] + 6 && z > TD[2] - 8) return false;                    // a clearing behind the trapdoor
      return true;
    };
    for (let i = 0; i < 2600; i++) {
      const x = -40 + rnd() * 180, z = -90 + rnd() * 160;
      if (!free(x, z)) continue;
      const p = [x, 0, z, 0.8 + 0.7 * rnd(), rnd() * 6], r = rnd();
      (r < 0.35 ? palms : r < 0.75 ? broad : r < 0.9 ? bananas : bushes).push(p);
    }
    // a dense edge right behind Minh (the jungle edge with the trapdoor)
    for (let x = -30; x < 30; x += 1.6) { const z = -11 - rnd() * 3.0; if (Math.abs(x - TD[0]) < 1.3) continue; ((rnd() < 0.5) ? broad : palms).push([x + rnd(), 0, z, 0.9 + 0.5 * rnd(), rnd() * 6]); }
    for (let x = -30; x < 30; x += 1.1) { if (Math.abs(x - TD[0]) < 2.0) continue; (rnd() < 0.5 ? bushes : bananas).push([x + rnd() * 0.5, 0, -3.9 - rnd() * 1.2, 0.7 + 0.4 * rnd(), rnd() * 6]); }
    plant(R, palmParts(), palms); plant(R, broadParts(), broad); plant(R, bushParts(), bushes); plant(R, bananaParts(), bananas);
    // far hills
    const hill = MR("#3E6E3A", 0.95);
    for (let i = 0; i < 14; i++) { const a = -0.4 + (i / 13) * 3.9, r = 200 + rnd() * 60; R.add(PR.mesh(new THREE.SphereGeometry(40 + rnd() * 30, 16, 10).scale(1.6, 0.55, 1), hill, Math.cos(a) * r + 40, -6, -Math.sin(a) * r)); }
  }

  // ================================================================ AIRCRAFT and VEHICLES with their paths
  private buildAir(R: THREE.Group) {
    const add = (o: THREE.Group, kind: string, path: (t: number) => { p: V3; yaw: number; bank?: number; show: boolean }) => { R.add(o); this.air.push({ o, kind, path }); };
    // S1: helicopters and jets cross the sky behind Minh; at "won" (1.8) they turn away
    for (let i = 0; i < 3; i++) add(PR.helicopter(), "heli", (t) => {
      const x0 = -22 + i * 9, k = t * 6.5, turn = sm(1.8, 3.6, t);
      return { p: [x0 + k * (1 - 0.6 * turn) + 6 * i, 14 + i * 2.5 + 4 * turn, -26 - i * 4 - 50 * turn * turn], yaw: Math.PI / 2 - 1.6 * turn, bank: -0.25 * Math.sin(turn * Math.PI), show: t < 4.5 };
    });
    for (let i = 0; i < 2; i++) add(PR.jet(), "jet", (t) => ({ p: [-60 + t * 32 + i * 10, 24 + i * 4, -46 - i * 8 - 30 * sm(1.8, 3.4, t)], yaw: Math.PI / 2 - 0.5 * sm(1.8, 3.4, t), bank: -0.4 * sm(1.8, 2.6, t), show: t < 4.5 }));
    add(PR.helicopter(), "heli", (t) => ({ p: [-14 + (t - 2.2) * 14, 8.5 + (t - 2.2) * 0.45, -16], yaw: Math.PI / 2, bank: -0.08, show: t > 2.0 && t < 4.6 }));
    // S2: the helicopter the camera follows into the camp, then lands on the pad ("helicopters"); a jet ("jets"); the tank ("tanks")
    add(PR.helicopter(), "heli", (t) => {
      if (t < 9.6) { const k = sm(3.8, 5.5, t); return { p: [84 + 14 * k, 7 + 4 * k, -14 - 6 * k], yaw: Math.PI / 2 + 0.3, show: t > 3.6 && t < 6 }; }
      const k = sm(9.8, 11.2, t); return { p: L3([PAD[0] - 14, 9, PAD[2] + 6], [PAD[0], 0, PAD[2]], k), yaw: -2.2 + 0.4 * k, bank: 0.1 * (1 - k), show: t > 9.6 && t < 12.5 };
    });
    add(PR.jet(), "jet", (t) => ({ p: [62 + (t - 9.5) * 45, 4.6, -1.5], yaw: Math.PI / 2, bank: -0.15, show: t > 9.4 && t < 11.2 }));
    add(PR.tank(), "tank", (t) => ({ p: [lerp(101, 89.5, sm(11.0, 12.2, t)), 0, 3.0], yaw: -Math.PI / 2, show: t > 10.8 && t < 12.6 }));
    // S11: bombers over the cut (sunset), dropping bombs
    // his note: the jets pass ONE BY ONE (same line, 0.42 s apart), each drops a bomb with a smoke trail; big smoke on impact
    const JV = 28, FALL = 0.9, LAND = [26.5, 30, 33];
    S.BOMB_HIT.forEach((hit, i) => {
      const tc = hit - FALL + 0.05, jy = CUT_H + 15, jz = -5 - 0.5 * i;
      const j = PR.jet(); j.scale.setScalar(0.8);
      add(j, "jet", (t) => ({ p: [cx(28 + (t - tc) * JV), jy, jz], yaw: Math.PI / 2, bank: 0.05 * Math.sin(t * 3 + i), show: t > 46.5 && t < 49.2 && Math.abs(t - tc) < 1.4 }));
      const t0 = hit - FALL, from: V3 = [cx(28 + (t0 - tc) * JV), jy - 0.7, jz], to: V3 = [cx(LAND[i]), CUT_H + 0.25, -1.5];
      const b = PR.bomb(); b.scale.setScalar(1.6); R.add(b); this.bombs.push({ o: b, t0, t1: hit, from, to });
      const bombAt = (tt: number): V3 => { const u = Math.min(1, Math.max(0, (tt - t0) / FALL)); return [lerp(from[0], to[0], u), from[1] + (to[1] - from[1]) * u * u, lerp(from[2], to[2], u)]; };
      for (let k = 0; k < 18; k++) { const te = t0 + (k / 18) * FALL; const p0 = bombAt(te); this.addSmoke(te, 1.1, () => [p0[0], p0[1] + 0.5, p0[2]], 0.5, 2.2, 0.6, "#E6DCD0"); }
      for (let k = 0; k < 4; k++) this.addSmoke(t0 + k * 0.03, 1.3, (tt) => [from[0] - 1.2 - (tt - t0) * 4, from[1] + 0.2, from[2] + (k - 1.5) * 0.4], 0.8, 3.0, 0.55, "#EEE6DA");
      for (let k = 0; k < 16; k++) { const ang = rnd() * 6.28, sp = 0.6 + rnd() * 1.4, up = 1.2 + rnd() * 2.2, te = hit + k * 0.05;
        this.addSmoke(te, 2.8, (tt) => { const a = tt - te; return [to[0] + Math.cos(ang) * sp * a, to[1] + up * a * (1 - 0.12 * a), to[2] + Math.sin(ang) * sp * a * 0.6]; }, 1.0, 3.6, 0.85, k % 3 ? "#4E443E" : "#7A6A5E"); }
      const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: PR.glowTex(), color: new THREE.Color(2.2, 1.15, 0.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); fire.visible = false; R.add(fire);
      this.smoke.push({ s: fire, te: hit, life: 0.45, at: () => [to[0], to[1] + 0.6, to[2]], s0: 2.5, s1: 5.5, o0: 1 });
    });
    // S14: the tank rolling over the tunnels
    add(PR.tank(), "tank", (t) => ({ p: [cx(lerp(29, 43, sm(62.0, 65.6, t))), CUT_H, -1.5], yaw: Math.PI / 2, show: t > 61.9 && t < 66 }));
    // S16: a helicopter hovering over the jungle with its searchlight
    const h = PR.helicopter(); const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 32, 1, true).translate(0, -3.5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.95, 0.75), transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(0, 0.5, 1.9); beam.name = "beam"; h.add(beam);
    add(h, "heli", (t) => ({ p: [cx(41 + 1.2 * Math.sin(t * 0.7)), CUT_H + 6.0, -7.0], yaw: 0.6, bank: 0.05 * Math.sin(t), show: t > 69.6 }));
  }

  private addSmoke(te: number, life: number, at: (t: number) => V3, s0: number, s1: number, o0: number, col: string) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), color: col, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; this.root.add(s);
    this.smoke.push({ s, te, life, at, s0, s1, o0 });
  }

  // ================================================================ PEOPLE
  private buildPeople(R: THREE.Group, A: Cast3DAssets) {
    const F = S.FACE, LF = S.LIFE;
    const mk = (castName: string, faceKey: string, seed: number, legs: { pants: string; shoes: string }, life = LF.def, talk?: (t: number) => number) =>
      new Player3D(R, buildCast3d(A, castName), castName, [0, 0, 0], 1, false, { face: F[faceKey], blinks: "auto", seed, legs, life, talk });
    const army = { pants: "#4A5230", shoes: "#17140F" }, farm = { pants: "#262A40", shoes: "#7A5530" };
    this.P.minh = mk("minh", "minh", 0.9, farm);
    this.P.minhT = mk("minhT", "minhT", 1.3, farm);
    this.P.team2 = mk("team2", "team2", 2.1, farm); this.P.team3 = mk("team3", "team3", 2.7, farm);
    this.P.max = mk("max", "max", 1.7, army, LF.max, (t) => S.talkAt("max", t));
    this.P.arian = mk("arian", "arian", 0.4, army, LF.def, (t) => S.talkAt("arian", t));
    this.P.general = mk("general", "general", 3.3, army, LF.general);
    this.P.maxHome = mk("maxHome", "maxHome", 1.9, { pants: "#2E3A5A", shoes: "#202020" }, LF.maxHome);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) this.crowd.push(mk((r + c) % 2 ? "max" : "arian", "extra", 0.3 + r * 1.7 + c * 0.9, army));
    for (let i = 0; i < 2; i++) this.lookCopies.push(mk(i ? "max" : "arian", "extra", 4.1 + i, army));
    for (let i = 0; i < 2; i++) this.patrol.push(mk(i ? "arian" : "max", "max", 5.3 + i, army, LF.def));
    for (let i = 0; i < 2; i++) this.search.push(mk(i ? "arian" : "max", "max", 6.2 + i, army));
    this.sleepers.push(mk("team2", "team2", 7.7, farm));
    // rifles for the patrols and the search
    for (let i = 0; i < 6; i++) { const r = PR.rifle(); r.scale.setScalar(1.25); R.add(r); this.O["rifle" + i] = r; }
    for (let i = 0; i < 40; i++) { const r = PR.rifle(); r.scale.setScalar(1.25); r.visible = false; R.add(r); this.guns.push(r); }
    const bin = PR.binoculars(); R.add(bin); this.O.binoculars = bin;
  }

  // ================================================================ every frame
  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.updateProjectionMatrix();   // Fable5.2: near / far are set in video.ts cam.updateMatrixWorld(); cam.layers.enable(NOINK);
    cam.getWorldDirection(this.fwd);
    const space = c.space;
    // ---- light ----
    let L = S.LIGHT.at(t);
    if (space === "tent") L = t < 40 ? S.TENT_DAY : S.TENT_NIGHT;
    this.sun.target.position.set(c.look[0], 0.5, c.look[2]); this.sun.target.updateMatrixWorld();
    applyLight(L, { sun: this.sun, scene, cam, dist: 30 });
    const sc = this.sun.shadow.camera, ext = space === "camp" || (space === "cut" && t > 65 && t < 70) ? 22 : 12;
    sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 80; sc.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03;
    const night = space === "home" || (space === "tent" && t > 40) ? 1 : 0;
    this.sky.intensity = night ? 0.3 : 0.55;
    { const sd = this.v.copy(this.sun.position).sub(this.sun.target.position).normalize(); RIM.dir.value.copy(sd).transformDirection(cam.matrixWorldInverse);
      RIM.col.value.setRGB(...(L.sun as [number, number, number])).multiplyScalar(night ? 0.7 : 0.75); if (space === "cut" && t > 31 && t < 41.8) RIM.col.value.setRGB(1.0, 0.62, 0.3);
      RIM.k.value = night ? 0.95 : 0.85; }
    const skyC = new THREE.Color(L.sky);
    this.domeU.hor.value.copy(skyC).lerp(new THREE.Color("#FFFFFF"), night ? 0.05 : 0.25);
    this.domeU.top.value.copy(skyC).multiplyScalar(night ? 0.55 : 0.62).lerp(new THREE.Color(night ? "#0A0F2A" : "#2E7AC8"), 0.35);
    this.dome.position.copy(cam.position);
    for (const cl2 of this.clouds) { (cl2.material as THREE.SpriteMaterial).color.setRGB(...(L.lit.map((v) => Math.min(1, v * 0.62)) as [number, number, number])); cl2.visible = !night; }
    scene.fog = new THREE.Fog(this.domeU.hor.value.getHex(), space === "home" ? 30 : 60, space === "home" ? 120 : 420);
    // point lights only where they matter (each one costs on every surface)
    for (const l of this.cutLights) l.visible = space === "cut";
    for (const l of this.tentLights) l.visible = space === "tent";
    for (const l of this.homeLights) l.visible = space === "home";

    // ---- props over time ----
    this.O.calPage.rotation.x = -sm(4.62, 5.05, t) * 2.7;
    this.O.trapdoor.rotation.x = -1.7 * sm(29.6, 30.15, t);   // stays open (closing in front of the camera looked like a green glitch)
    this.O.lid.rotation.x = -1.1 * sm(40.6, 41.0, t);
    for (const x of VENTS) this.O["hole" + x].rotation.x = -1.6 * sm(43.1, 43.28, t) * (1 - sm(45.85, 46.05, t));
    { const dx = S.digX(t); for (const p of this.plugs) {             // the dig face moves smoothly (no 0.5 m jumps)
      const w = t < 31.0 || dx <= p.x ? 0.5 : p.x + 0.5 - dx; p.o.visible = w > 0.005;
      if (p.o.visible) { p.o.scale.x = w / 0.5; p.o.position.x = cx(p.x + 0.5 - w / 2); } } }
    { const dl = this.O.digLamp; const mx = t < 31 ? 1.6 : t < 36 ? Math.max(1.6, digMinhX(t) - 0.75) : digMinhX(35.99) - 0.75; dl.position.set(cx(mx), F1, -2.3); }
    { const im = this.O.clods as THREE.InstancedMesh, seeds = (im as any).seeds as number[][], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      im.visible = space === "cut" && t > DIG_T0 && t < 41.8;
      if (im.visible) seeds.forEach(([r1, r2, r3, r4], i) => {
        const cyc = Math.floor(i / 5), tb = DIG_T0 + (cyc + 0.66) / DIG_HZ + (i % 5) * 0.012, sz = 0.025 + 0.04 * r4;
        if (t < tb || tb > DIG_T1) { m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); return; }
        const ox = cx(digMinhX(tb)) - 0.43, oy = F1 + 0.78, oz = -1.05 + (r3 - 0.5) * 0.3, vx = -(1.4 + 1.6 * r1), vy = 0.4 + 1.3 * r2, vz = (r3 - 0.5) * 0.9;
        const tl = (vy + Math.sqrt(vy * vy + 2 * 9.8 * (oy - F1 - sz))) / 9.8, d = Math.min(t - tb, tl);
        const y = oy + vy * d - 4.9 * d * d, z = Math.max(-2.75, Math.min(-0.25, oz + vz * d));
        e.set(r1 * 6 + d * 9, r2 * 6 + d * 7, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(ox + vx * d, y, z), q, new THREE.Vector3(sz * 1.3, sz, sz)); im.setMatrixAt(i, m4);
      });
      im.instanceMatrix.needsUpdate = true; }
    this.O.frontLand.visible = space === "cut" && cam.position.y > CUT_H + 0.05 && ((t > 41.7 && t < 46.7) || (t > 69.9 && t < 72.25));
    const lampOn = (x: number) => (t < 31 || t > 35.6 ? 1 : x < S.digX(t) + 0.6 ? 1 : sm(33.0 + x * 0.06, 33.4 + x * 0.06, t));
    for (const lp of this.lamps) { const k = lampOn(lp.x), fl = 0.9 + 0.08 * Math.sin(t * 11 + lp.x) + 0.04 * Math.sin(t * 23 + lp.x * 3);
      lp.o.getObjectByName("flame")!.visible = k > 0.05; const gl = lp.o.getObjectByName("glow") as THREE.Sprite; (gl.material as THREE.SpriteMaterial).opacity = 0.7 * k * fl;
      const dive = lp.x === S.LAMP_X && lp.o.position.y < F1 ? sm(50.45, 51.0, t) * (1 - sm(51.4, 51.5, t)) : 0;
      gl.scale.setScalar(0.42 + 0.5 * dive); if (dive) (gl.material as THREE.SpriteMaterial).opacity = Math.min(1, 0.7 * fl + 0.6 * dive);
      const li = lp.o.getObjectByName("light") as THREE.PointLight | undefined; if (li) li.intensity = 2.2 * k * fl; }
    this.O.pitCover.visible = t > 42.15 && t < 44.32; this.O.pitCover.scale.set(Math.max(0.01, sm(42.15, 42.75, t)), 1, Math.max(0.01, sm(42.15, 42.75, t)));
    this.O.pitHole.visible = t > 42.1 && t < 47; this.O.pitHole.scale.setScalar(Math.max(0.01, sm(42.1, 42.4, t)));
    this.baseTop.visible = t > 64.1;
    this.O.plan.visible = t > 50;
    // toys pushed across the table
    for (const ty of this.toys) {
      const k = ty.b > ty.a ? sm(ty.a, ty.b, t) : 1; const p = L3(ty.from, ty.to, k);
      ty.o.position.set(p[0], p[1] + (ty.o.scale.x < 0.05 && ty.o.scale.x > 0.02 ? 0.02 : 0), p[2]);
      ty.o.visible = ty.show ? t > ty.show[0] && t < ty.show[1] : t < 40;
      if (ty.show) { const drop = 1 - sm(ty.a, ty.b, t); ty.o.position.y += 0.15 * drop; }
    }
    // aircraft and vehicles
    for (const a of this.air) { const s = a.path(t); a.o.visible = s.show; if (!s.show) continue; a.o.position.set(...s.p); a.o.rotation.set(0, s.yaw, s.bank ?? 0, "YXZ");
      const r = a.o.getObjectByName("rotor"); if (r) r.rotation.y = t * 11; const tr = a.o.getObjectByName("tailRotor"); if (tr) tr.rotation.x = t * 34;
      const bm = a.o.getObjectByName("beam"); if (bm) bm.rotation.set(0.35 * Math.sin(t * 1.3) + 0.2, 0, 0.3 * Math.sin(t * 0.9)); }
    for (const b of this.bombs) { const k = (t - b.t0) / (b.t1 - b.t0); b.o.visible = k > 0 && k < 1 && space === "cut"; if (b.o.visible) b.o.position.set(lerp(b.from[0], b.to[0], k), b.from[1] + (b.to[1] - b.from[1]) * k * k, lerp(b.from[2], b.to[2], k)); }
    for (const sm2 of this.smoke) { const a = t - sm2.te; sm2.s.visible = space === "cut" && a >= 0 && a < sm2.life; if (!sm2.s.visible) continue;
      const u = a / sm2.life, sc = sm2.s0 + (sm2.s1 - sm2.s0) * Math.sqrt(u); sm2.s.position.set(...sm2.at(t)); sm2.s.scale.set(sc, sc, 1); (sm2.s.material as THREE.SpriteMaterial).opacity = sm2.o0 * (1 - u) * Math.min(1, a * 12); }

    // ---- people ----
    this.people(t, cam, space);
    this.fx.update(t, cam);

    // ---- the photos (object transitions): live picture while it shrinks in, then it stays as a photo ----
    if (SNAP.canvas && Math.abs(SNAP.t - t) < 1e-6) {
      const ph = t < 40 ? this.photo1 : this.photo2;
      const g = ph.c.getContext("2d")!; g.drawImage(SNAP.canvas, 0, 0, ph.c.width, ph.c.height); ph.tex.needsUpdate = true;
    }
    let focus = Math.max(0.3, this.v.set(...c.look).sub(cam.position).dot(this.fwd)), cInf = c.blur;
    // S1 (his note): Minh is sharp first, then the focus pulls to the aircraft in the sky (rack focus on "won")
    if (t < S.S.s2 && space === "paddy") {
      const dM = Math.max(0.3, this.v.set(M0[0], 0.75, M0[2]).sub(cam.position).dot(this.fwd)), dJ = 40, k = sm(1.9, 2.55, t);
      focus = 1 / (1 / dM + (1 / dJ - 1 / dM) * k); cInf = Math.max(c.blur, 7);
    }
    return { focus, cInf };
  }

  // ================================================================ THE HUGE CROWD (instanced copies behind the real front rows)
  private buildHorde() {
    const R = this.root, refs = [this.crowd[0], this.crowd[1]];                // arian, max (army + helmet)
    const NECK_ROW = 460, neckY = STAND_HIP + (HIP - NECK_ROW) * PXM, cy = (NECK_ROW - 500) * PXM;
    // the grid: the whole parade ground, skipping the real rows in front and the helipad
    const cells: [number, number, number][] = [];
    let sd = 11; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let r = 0; r < 56; r++) for (let c = 0; c < 25; c++) {
      const x = 68.6 + c * 0.78 + (r % 2) * 0.2 + (rr() - 0.5) * 0.1, z = 0.1 - r * 0.95 + (rr() - 0.5) * 0.1;
      if (x > 78.3 && x < 83.3 && z > -3.2) continue;
      cells.push([x, z, (r * 7 + c * 3) % 4]);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    const inst = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], list: [number, number, number][], y: number, shadow: boolean, mask: number) => {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach(([x, z], i) => { m4.compose(new THREE.Vector3(x, y, z), q, one); im.setMatrixAt(i, m4); });
      im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false; im.layers.mask = mask; im.visible = false; R.add(im); return im;
    };
    const meshes: THREE.InstancedMesh[] = [], heads: { im: THREE.InstancedMesh; pts: [number, number][] }[] = [];
    const headGeo = new THREE.PlaneGeometry(600 * PXM, 1000 * PXM); headGeo.translate(0, cy, 0);
    refs.forEach((ref, v) => {
      const list = cells.filter((c) => c[2] % 2 === v);
      const bodyMesh = ref.body.children[0] as THREE.Mesh, hull = ref.body.children[1] as THREE.Mesh;
      meshes.push(inst(bodyMesh.geometry, bodyMesh.material, list, STAND_HIP, true, bodyMesh.layers.mask));
      meshes.push(inst(hull.geometry, hull.material, list, STAND_HIP, false, hull.layers.mask));
      // arms (ink strokes from the shoulders down to resting hands) and legs (trousers + boots)
      ref.setPos(0, 0, 0); ref.setLook(0, 1); ref.body.position.set(0, STAND_HIP, 0); ref.body.rotation.set(0, 0, 0); ref.body.scale.set(1, 1, 1); ref.body.updateMatrixWorld(true);
      const arms: THREE.BufferGeometry[] = [];
      for (const s2 of [-1, 1]) {
        const S0 = ref.bodyPoint(HIP - 92, s2 * 1.05, 0), rp = riflePose([0, 0, 0], [0, 1]), hv = S0.x < 0 ? rp.G : rp.Lh, H = new THREE.Vector3(...hv), d = H.clone().sub(S0);
        const a = new THREE.CylinderGeometry(0.0085, 0.0085, d.length(), 6); a.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); a.translate((S0.x + H.x) / 2, (S0.y + H.y) / 2, (S0.z + H.z) / 2);
        const hd = new THREE.SphereGeometry(0.03, 10, 8); hd.translate(H.x, H.y, H.z); arms.push(a, hd);
      }
      meshes.push(inst(merge(arms), new THREE.MeshBasicMaterial({ color: INK_BROWN }), list, 0, false, hull.layers.mask));
      { const rg = PR.rifle(); rg.scale.setScalar(1.25); const rp = riflePose([0, 0, 0], [0, 1]); hold(rg, rp.G, rp.d, -0.0625, FWD); rg.updateMatrixWorld(true);
        const parts: THREE.BufferGeometry[] = []; rg.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) { const g2 = me.geometry.clone(); g2.applyMatrix4(me.matrixWorld); for (const k of Object.keys(g2.attributes)) if (k !== "position" && k !== "normal") g2.deleteAttribute(k); parts.push(g2.index ? g2.toNonIndexed() : g2); } });
        meshes.push(inst(merge(parts), MR("#1E1E22", 0.6), list, 0, false, bodyMesh.layers.mask)); }
      const legs: THREE.BufferGeometry[] = [], boots: THREE.BufferGeometry[] = [];
      for (const s2 of [-1, 1]) { const l = new THREE.BoxGeometry(0.034, STAND_HIP, 0.034); l.translate(s2 * 0.062, STAND_HIP / 2 + 0.02, 0); legs.push(l); const b = new THREE.BoxGeometry(0.05, 0.04, 0.09); b.translate(s2 * 0.068, 0.02, 0.02); boots.push(b); }
      meshes.push(inst(merge(legs), MR("#4A5230", 0.85), list, 0, true, bodyMesh.layers.mask));
      meshes.push(inst(merge(boots), MR("#17140F", 0.7), list, 0, false, bodyMesh.layers.mask));
      // heads: the drawn head picture + the helmet, two faces each
      const cast = (ref as any).cast;
      for (const [f, face] of [[0, "smug"], [1, "neutral"]] as const) {
        const hl = list.filter((c) => (c[2] >> 1) === f);
        const cv = mkCanvas(600, 1000), g = cv.getContext("2d")!; g.drawImage(cast.heads[face].image, 0, 0, 600, 1000); if (cast.hatF) g.drawImage(cast.hatF.image, 0, 0, 600, 1000);
        const mat = new THREE.MeshBasicMaterial({ map: canvasTex(cv), alphaTest: 0.5, side: THREE.DoubleSide, color: new THREE.Color(0.97, 0.95, 0.92) });
        const im = new THREE.InstancedMesh(headGeo, mat, hl.length); im.frustumCulled = false; im.layers.mask = hull.layers.mask; im.visible = false; R.add(im);
        heads.push({ im, pts: hl.map((c) => [c[0], c[1]]) });
      }
    });
    (this as any).hordeNeck = neckY;
    this.horde = { meshes, heads };
  }
  private updateHorde(cam: THREE.PerspectiveCamera, show: boolean) {
    if (!this.horde) { if (!show) return; this.buildHorde(); }
    const H = this.horde!; for (const m of H.meshes) m.visible = show; for (const h of H.heads) h.im.visible = show;
    if (!show) return;
    const neckY = (this as any).hordeNeck as number, m4 = new THREE.Matrix4(), n = new THREE.Vector3(), tc = new THREE.Vector3(), s3 = new THREE.Vector3();
    for (const h of H.heads) {
      h.pts.forEach(([x, z], i) => {
        n.set(x, neckY, z); tc.copy(cam.position).sub(n); const dist = tc.length(), push = Math.min(0.13, dist * 0.4); tc.normalize();
        n.addScaledVector(tc, push); const k = (dist - push) / dist; s3.set(k, k, k);
        m4.compose(n, cam.quaternion, s3); h.im.setMatrixAt(i, m4);
      });
      h.im.instanceMatrix.needsUpdate = true;
    }
  }

  private people(t: number, cam: THREE.PerspectiveCamera, space: string) {
    const all = this.everyone();
    for (const p of all) { p.setVisible(false); this.blobs.get(p)!.visible = false; }
    if (space !== "camp") this.updateHorde(cam, false);
    const order = (i: number) => 100 + i * 14;
    let n = 0;
    const show = (p: P3, pos: V3, look: [number, number], hands?: { L?: V3; R?: V3 }, extra?: (p: P3) => void) => {
      p.setVisible(true); p.setPos(...pos); p.setLook(look[0], look[1]); p.sit = 0; p.lean = 0; p.squash = 1; p.setWalk(0, 0, look[0], look[1]);
      p.hand.L = p.restHand("L"); p.hand.R = p.restHand("R");
      if (extra) extra(p);
      if (hands?.L) p.hand.L = hands.L; if (hands?.R) p.hand.R = hands.R;
      p.update(t, cam, 0, order(n++));
      const b = this.blobs.get(p)!; b.visible = true; const lk = new THREE.Vector2(look[0], look[1]).normalize();
      b.position.set(pos[0] + lk.x * 0.02, pos[1] + 0.008 + (p.sit > 0.5 ? 0.0 : 0), pos[2] + lk.y * 0.02); b.rotation.z = -Math.atan2(lk.x, lk.y);
      (b.material as THREE.MeshBasicMaterial).opacity = p.sit > 0.5 ? 0.0 : 0.55;
    };
    const walkTo = (p: P3, from: V3, to: V3, a: number, b: number) => { const k = sm(a, b, t), moving = t > a && t < b; const pos = L3(from, to, k); return { pos, moving, dir: [to[0] - from[0], to[2] - from[2]] as [number, number] }; };
    // hide all props that people carry, then show what this moment needs
    for (const k of ["shovel", "bigShovel", "cup", "flashlight", "binoculars", "rifle0", "rifle1", "rifle2", "rifle3", "rifle4", "rifle5", "hammer", "fly"]) this.O[k].visible = false;
    for (const g of this.guns) g.visible = false; this.gunI = 0;
    for (const s of [-1, 1]) this.O["sandal" + s].visible = space === "paddy" && t < 16.2;
    { const rg = this.O.ripples; rg.visible = space === "paddy" && t < 27.3;
      for (let i = 0; i < 4; i++) { const r = rg.getObjectByName("w" + i) as THREE.Mesh, u = ((t / 1.6 + i / 4) % 1); r.scale.setScalar(0.15 + 0.75 * u); (r.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - u); }
      const wt = this.O.waterTex as any as THREE.Texture; wt.offset.set(t * 0.004, t * 0.002); }
    this.O.ornament.visible = false;

    if (space === "paddy") {
      const m = this.P.minh;
      if (t < 27.3) {
        // S1 / S3 / S4 / S6: Minh at his spot facing the camera side (+z)
        show(m, M0, [0, 1], undefined, (p) => {
          if (t < 4.5) {                                   // S1: shovel upright in his right hand; at "won" he lifts and plants it
            const lift = Math.sin(Math.PI * sm(1.35, 1.85, t)) * 0.18;
            const h: V3 = [M0[0] - 0.24, 0.62 + lift, M0[2] + 0.06]; p.hand.R = h;
            this.O.shovel.visible = true; hold(this.O.shovel, h, [0, 1, 0], 0.56); this.O.shovel.position.y += lift * 0.5 - (t > 1.85 ? 0.05 : 0);
          } else if (t < 24) {                             // S3 / S4: shovel on his right shoulder, blade up behind
            const h: V3 = [M0[0] - 0.2, 0.55, M0[2] + 0.12]; p.hand.R = h;
            this.O.shovel.visible = true; hold(this.O.shovel, h, [0.25, -0.75, 0.6], 0.62);
          } else {                                          // S6: the giant shovel rises from behind his back
            const k = sm(25.5, 26.3, t), h: V3 = [M0[0] - 0.53, 0.55 + 0.2 * k, M0[2] + 0.03]; p.hand.R = h;
            this.O.bigShovel.visible = true; hold(this.O.bigShovel, [M0[0] - 0.58, -1.6 * (1 - k) + 0.02, M0[2] - 0.02], [0, 1, 0], 0);
          }
        });
      } else {
        // S7: walk to the trapdoor (big shovel on the shoulder), look both ways, lift the door, drop in
        const goal: V3 = [TD[0] + 0.55, 0.02, TD[2] + 0.45];
        const w = walkTo(m, M0, goal, 27.35, 28.6);
        let look: [number, number] = w.moving ? w.dir : [0, 1];
        if (t > 28.65 && t < 29.1) look = [-1, 0.25]; else if (t > 29.1 && t < 29.55) look = [1, 0.25]; else if (t >= 29.55) look = [-0.8, -0.6];
        let pos = w.pos;
        if (t > 30.55) { const k = sm(30.55, 30.8, t), d = sm(30.85, 31.15, t); pos = [lerp(goal[0], TD[0], k), goal[1] - 1.35 * d, lerp(goal[2], TD[2], k)]; }
        const wl = Math.hypot(w.dir[0], w.dir[1]) || 1, wd: [number, number] = [w.dir[0] / wl, w.dir[1] / wl], base = t < 28.6 ? w.pos : goal;
        const blade: V3 = [base[0] - wd[0] * 1.9 - wd[1] * 0.25, 0.06, base[2] - wd[1] * 1.9 + wd[0] * 0.25];
        show(m, pos, look, undefined, (p) => {
          if (w.moving) p.setWalk(t * 9, 1, w.dir[0], w.dir[1]);
          const h: V3 = sidePt(pos, look, "R", 0.2, 0.05, 0.5); p.hand.R = h;
          if (t > 29.55 && t < 30.4) { const k = sm(29.6, 30.1, t); p.hand.L = [TD[0] + 0.1, 0.1 + 0.5 * k, TD[2] + 0.36 - 0.3 * k]; }
          this.O.bigShovel.visible = t < 30.95; hold(this.O.bigShovel, blade, [h[0] - blade[0], h[1] - blade[1], h[2] - blade[2]], 0);
        });
      }
      // S4: the lookout (Max, Arian and two copies behind the sandbags, facing Minh)
      if (t > 15.5 && t < 22.0) {
        const lk = (a: number, b: number): V3 => [LK[0] + LKP[0] * a + LKD[0] * b, 0.07, LK[2] + LKP[2] * a + LKD[2] * b];
        const look: [number, number] = [LKD[0], LKD[2]], laugh = (t > 16.7 && t < 17.6) ? Math.sin(t * 28) : 0;
        show(this.P.max, lk(0.36, -0.1), look, undefined, (p) => { p.lean = 0.08 * laugh; this.gun(p, lk(0.36, -0.1), look); });
        show(this.P.arian, lk(-0.36, -0.12), look, undefined, (p) => {
          p.lean = 0.08 * laugh - 0.12 * sm(19.4, 19.8, t) * (1 - sm(20.3, 20.7, t));
          const o = this.O.ornament; o.visible = t > 19.3;
          const top: V3 = [LK[0] + LKD[0] * 0.5 - LKP[0] * 0.5, 0.56, LK[2] + LKD[2] * 0.5 - LKP[2] * 0.5];
          if (t < 19.3 || t > 20.2) this.gun(p, lk(-0.36, -0.12), look);
          if (t > 19.3 && t < 20.15) { const k = sm(19.45, 20.05, t), h = L3(p.restHand("R"), [top[0], top[1] + 0.14, top[2]], k); p.hand.R = h; o.position.set(h[0], h[1] - 0.15, h[2]); }
          else if (t >= 20.15) o.position.set(top[0], top[1], top[2]);
        });
        show(this.lookCopies[0], lk(-1.1, -0.2), look, undefined, (p) => { p.lean = 0.07 * laugh; this.gun(p, lk(-1.1, -0.2), look); });
        show(this.lookCopies[1], lk(1.1, -0.18), look, undefined, (p) => { p.lean = -0.07 * laugh; this.gun(p, lk(1.1, -0.18), look); });
      }
      return;
    }

    if (space === "camp") {
      // S2: rows of soldiers (copies) facing the camera side, then the huge instanced crowd behind and beside them
      this.updateHorde(cam, true);
      this.crowd.forEach((p, i) => { const r = Math.floor(i / 6), c2 = i % 6, ps: V3 = [80.2 + (c2 - 2) * 0.78 + (r % 2) * 0.2, 0, 0.1 - r * 0.95]; show(p, ps, [0, 1], undefined, (q) => this.gun(q, ps, [0, 1])); });
      return;
    }

    if (space === "tent") {
      const g = this.P.general, gp: V3 = [TABLE[0] - 0.05, 0, TABLE[2] - 0.82];
      show(g, gp, [0, 1], undefined, (p) => {
        if (t < 40) {
          // S5: his right hand pushes the toys in (bombs, planes, soldiers), then rests
          const seg = (a: number, b: number, from: V3, to: V3) => (t > a - 0.25 && t < b + 0.2 ? L3(from, to, sm(a, b, t)) : null);
          const T = TABLE, y = 0.56;
          const h = seg(21.9, 22.45, [T[0] - 0.12, y, T[2] - 0.66], [T[0] - 0.15, y, T[2] - 0.18]) ?? seg(24.0, 24.55, [T[0] - 0.14, y, T[2] - 0.7], [T[0] - 0.14, y, T[2] + 0.02]);
          if (h) p.hand.R = h;
          const hl = seg(22.9, 23.45, [T[0] + 0.3, y, T[2] - 0.66], [T[0] + 0.22, y, T[2] - 0.32]);
          if (hl) p.hand.L = hl;
          p.lean = 0.12;
        } else {
          // S13: both hands slap down the arrows and tanks ("open battle"); then he crouches and shines a flashlight under the table
          const slap = sm(59.1, 59.5, t) * (1 - sm(60.0, 60.4, t));
          if (slap > 0) { p.hand.R = [TABLE[0] - 0.32, 0.9 - 0.36 * sm(59.3, 59.52, t), TABLE[2] - 0.35]; p.hand.L = [TABLE[0] + 0.24, 0.9 - 0.36 * sm(59.3, 59.52, t), TABLE[2] - 0.35]; }
          const crouch = sm(60.5, 61.1, t); p.sit = crouch; p.seatY = 0.02;
          p.lean = 0.1 + 0.3 * crouch;
          if (crouch > 0.3) { const f = this.O.flashlight; f.visible = true; const h: V3 = [TABLE[0] - 0.24, 0.32, TABLE[2] - 0.45]; p.hand.R = h; hold(f, h, [0.15, -0.15, 1], 0, FWD); }
        }
      });
      return;
    }

    if (space === "cut") {
      const m = this.P.minhT;
      const Z = -1.15;
      if (t < 36.0) {
        // S8: lands at the bottom of the shaft, then digs to the right very fast (shovel stabbing forward)
        const land = sm(31.45, 31.8, t), x = digMinhX(t);
        const pos: V3 = [cx(x), F1 + 1.2 * (1 - land), Z];
        show(m, pos, [1, 0.15], undefined, (p) => {
          let th = 166, hx = 0.3, hy = 0.48, lean = 0.2;
          if (t > DIG_T0 && t < DIG_T1) ({ th, hx, hy, lean } = digPose(t));
          const a = (th * Math.PI) / 180, dir: V3 = [Math.cos(a), Math.sin(a), 0], h: V3 = [pos[0] + hx, F1 + hy, Z + 0.1];
          p.lean = lean; p.hand.R = h; p.hand.L = [h[0] - dir[0] * 0.22, h[1] - dir[1] * 0.22, Z - 0.04];
          this.O.shovel.visible = true; hold(this.O.shovel, h, dir, 0.45); if (t > 32.4 && t < 35) p.setWalk(t * 12, 0.6, 1, 0); });
      } else if (t < 41.8) {
        // S9: team in the rooms; Minh walks through the beds, climbs the shaft, the mound lid lifts, he peeks out
        show(this.P.team3, [cx(15.75), F1, -1.05], [-0.4, 1], undefined, (p) => { p.hand.R = [cx(15.45), F1 + 0.42 + 0.03 * Math.sin(t * 9), -1.38]; });
        show(this.P.team2, [cx(20.4), F1, -1.45], [0.2, 1], undefined, (p) => { p.sit = 1; p.seatY = 0.4; });
        show(this.sleepers[0], [cx(24.8), F1, -1.35], [0, 1], undefined, (p) => { p.sit = 1; p.seatY = 0.4; p.lean = -0.25; });
        let pos: V3 = [cx(lerp(23.0, 26.95, sm(38.4, 39.45, t))), F1, -1.0];
        if (t > 39.45) pos = [cx(26.95), F1 + (CUT_H + 0.24 - F1) * sm(39.5, 40.85, t), -0.95];
        show(m, pos, t < 39.45 ? [1, 0.2] : [0, 1], undefined, (p) => { if (t > 38.4 && t < 39.45) p.setWalk(t * 9, 1, 1, 0);
          if (t > 39.45 && t < 40.85) { const c2 = Math.sin(t * 14) * 0.08; p.hand.R = [pos[0] - 0.12, pos[1] + 0.85 + c2, -0.92]; p.hand.L = [pos[0] + 0.12, pos[1] + 0.85 - c2, -0.92]; } });
      } else if (t < 46.7) {
        // S10 (his note): the team lays leaves over a pit on the path, then drops into their spider holes: only hats and eyes
        // show. The patrol marches in from behind the camera and falls into the pit one by one. Then the eyes sink, lids close.
        const team = [this.P.team2, m, this.P.team3];
        team.forEach((who, i) => {
          const hx = VENTS[i], wx = PIT_X - 0.35 + i * 0.45, wz = -1.55;
          let x = hx, y = CUT_H - 1.5, z = -1.7, look: [number, number] = [0.3, 1], walk = false, work = 0;
          if (t < 42.9) { const k = sm(41.75, 42.1, t); x = lerp(hx, wx, k); z = lerp(-1.7, wz, k); y = CUT_H; look = k < 1 ? [1, 0.2] : [0.15, 1]; walk = k > 0 && k < 1; work = k >= 1 ? 1 : 0; }
          else if (t < 43.25) { const k = sm(42.9, 43.25, t); x = lerp(wx, hx, k); z = lerp(wz, -1.7, k); y = CUT_H; look = [-1, -0.2]; walk = true; }
          else if (t < 45.55) y = CUT_H + 0.04 - 0.82 * sm(43.25, 43.5, t);                       // down to the eyes
          else y = CUT_H + 0.04 - 0.82 - 0.7 * sm(45.55, 45.85, t);                                  // and gone
          if (y < CUT_H - 1.45) return;
          show(who, [cx(x), y, z], look, undefined, (p) => {
            if (walk) p.setWalk(t * 12, 1, look[0], look[1]);
            if (work) { p.lean = 0.3 + 0.08 * Math.sin(t * 9 + i); p.hand.R = sidePt([cx(x), y, z], look, "R", 0.16, 0.32, 0.2 + 0.06 * Math.sin(t * 11 + i)); p.hand.L = sidePt([cx(x), y, z], look, "L", 0.16, 0.32, 0.2 - 0.06 * Math.sin(t * 11 + i)); }
          });
          const b = this.blobs.get(who); if (b && y < CUT_H - 0.05) b.visible = false;
        });
        const pat = [this.P.max, this.P.arian, ...this.patrol];
        pat.forEach((p, i) => {
          if (t < 43.3) return;
          const x0 = 12.9 + 0.8 * i, v = 3.3, tf = 43.3 + (x0 - PIT_X) / v, d = t - tf;
          let x = x0 - v * (t - 43.3), y = CUT_H; const z = -0.95 + (i % 2 ? 0.07 : -0.07), look: [number, number] = [-1, 0.1];
          if (d > 0) { x = PIT_X - 0.6 * Math.min(d, 0.25); y = CUT_H - 7 * d * d; }
          if (y < CUT_H - 1.5) return;
          show(p, [cx(x), y, z], look, undefined, (q) => {
            if (d <= 0) { q.setWalk(t * 11, 1, look[0], look[1]); this.gun(q, [cx(x), y, z], look, 0.12); }
            else { const a = armsUp([cx(x), y, z], look); q.hand.R = a.R; q.hand.L = a.L; }
          });
          if (d > 0) this.blobs.get(p)!.visible = false;
        });
      } else if (t < 51.2) {
        // S11: Minh with his tea climbs down the ladder one floor ("one floor deeper")
        const k = sm(49.1, 50.45, t), pos: V3 = [cx(lerp(30.35, 29.85, sm(48.8, 49.1, t))), lerp(F1, F2, k), -0.75];
        show(m, pos, k > 0 && k < 1 ? [0, -1] : [0, 1], undefined, (p) => {
          const cup = this.O.cup; cup.visible = true; const h: V3 = sidePt(pos, k > 0 && k < 1 ? [0, -1] : [0, 1], "R", 0.22, 0.2, 0.55); p.hand.R = h; cup.position.set(h[0], h[1] - 0.02, h[2]);
          if (k > 0 && k < 1) p.hand.L = sidePt(pos, [0, -1], "L", 0.15, -0.1, 0.8 + 0.06 * Math.sin(t * 12));
        });
      } else if (t < 66) {
        // S14: Minh below the tank: taps his head ("smarter"), grins ("not bigger")
        const pos: V3 = [cx(36.1), F1, -0.95];
        show(m, pos, [0, 1], undefined, (p) => { const tap = sm(64.2, 64.4, t) * (1 - sm(64.9, 65.2, t)); if (tap > 0) p.hand.R = L3(p.restHand("R"), [pos[0] - 0.24, F1 + 1.0 + 0.03 * Math.sin(t * 30), -0.85], tap); });
      } else {
        // S15-S17: the base / the jungle search on top; Max right above Minh's hammock; Minh with tea in the hammock
        if (t > 69.5) {
          show(this.P.max, [cx(43.0), CUT_H, -0.42], t < 72.3 ? [Math.sin(t * 1.4), -0.8] : [0, 1], undefined, (p) => {
            this.gun(p, [cx(43.0), CUT_H, -0.42], t < 72.3 ? [Math.sin(t * 1.4), -0.8] : [0, 1], -0.1 + 0.1 * Math.sin(t * 6));
          });
          show(this.search[0], [cx(41.2), CUT_H, -1.3], [0.3, -1], undefined, (p) => this.gun(p, [cx(41.2), CUT_H, -1.3], [0.3, -1], 0.05 * Math.sin(t * 7)));
          show(this.search[1], [cx(44.9), CUT_H, -1.5], [Math.sin(t * 1.1) * 0.8, 0.6], undefined, (p) => {
            const bn = this.O.binoculars; bn.visible = true; const r = p.restHand("R"), l = p.restHand("L");
            const at: V3 = [(r[0] + l[0]) / 2, r[1] + 0.2, (r[2] + l[2]) / 2 + 0.04]; bn.position.set(...at); bn.rotation.set(0, Math.atan2(Math.sin(t * 1.1) * 0.8, 0.6), 0);
            p.hand.R = [at[0] + 0.06, at[1], at[2]]; p.hand.L = [at[0] - 0.06, at[1], at[2]];
          });
        }
        if (t > 72.0) {
          const pos: V3 = [cx(43.0), F1, -1.2];
          show(m, pos, [0, 1], undefined, (p) => { p.sit = 1; p.seatY = 0.42; p.lean = -0.15;
            const cup = this.O.cup; cup.visible = true; const h: V3 = [pos[0] - 0.2, F1 + 0.62, -1.0]; p.hand.R = h; cup.position.set(h[0], h[1] - 0.02, h[2]); });
        }
      }
      return;
    }

    if (space === "home") {
      // S12: Max chases the fly with the giant hammer; slam ("hammer?"); swing and miss; the fly lands on the hammer ("lands")
      const H = HOME, mp: V3 = [H[0] - 0.05, 0, -0.78];
      const hm = this.O.hammer, fly = this.O.fly; hm.visible = true; fly.visible = true;
      // hammer angle: 0 = head up, 1.62 = head down on the table
      const up = (a: number, b: number) => sm(a, b, t);
      let ang = 0.3 + 0.5 * Math.sin(t * 3) * (t < 52.9 ? 1 : 0);
      if (t >= 52.9) ang = lerp(-0.5, 1.62, up(53.25, 53.46));
      if (t >= 53.46) ang = 1.62;
      if (t >= 55.4) ang = lerp(1.62, -0.6, up(55.4, 55.9));
      if (t >= 55.9) ang = lerp(-0.6, 1.62, up(56.15, 56.35));
      const hands: V3 = [mp[0] - 0.38, 0.6, mp[2] + 0.22];       // at HIS RIGHT side: the handle never crosses his face
      hm.position.set(...hands); hm.rotation.set(ang, 0, 0);
      show(this.P.maxHome, mp, [0, 1], undefined, (p) => { p.hand.R = [hands[0] - 0.05, hands[1], hands[2]]; p.hand.L = [hands[0] + 0.05, hands[1] + 0.08 * Math.cos(ang), hands[2] + 0.08 * Math.sin(ang)]; p.lean = 0.1 * Math.sin(ang); });
      // plates jump on the slams
      const jump = Math.max(Math.sin(Math.PI * cl((t - 53.46) / 0.3)), Math.sin(Math.PI * cl((t - 56.35) / 0.3)));
      for (const pl of (this.O.plates as any).list as THREE.Object3D[]) pl.position.y = 0.51 + 0.07 * jump;
      // the fly: buzzes around, escapes the slams, lands on the hammer head on "lands"
      const head = new THREE.Vector3(0, 0.75, 0).applyEuler(hm.rotation).add(hm.position);
      let fp = new THREE.Vector3(H[0] + 0.25 * Math.sin(t * 5.1), 0.95 + 0.18 * Math.sin(t * 7.3), 0.15 * Math.cos(t * 4.4));
      if (t > 56.9) { const k = sm(56.9, 57.14, t); fp.lerp(head.clone().add(new THREE.Vector3(0, 0.09, 0)), k); }
      fly.position.copy(fp); fly.rotation.y = t * 3;
      const flap = Math.sin(t * 120) * 0.7 * (t > 57.14 ? 0.1 : 1);
      fly.getObjectByName("wingL")!.rotation.z = flap; fly.getObjectByName("wingR")!.rotation.z = -flap;
      return;
    }
  }
}
const MAT_BLACK = () => MR("#1E1E22", 0.6);
const smokeTex = (() => { let t: THREE.Texture | null = null; return () => (t ??= tex(128, 128, (g) => { for (let i = 0; i < 9; i++) { const x = 40 + rnd() * 48, y = 40 + rnd() * 48, r = 22 + rnd() * 20; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } })); })();
const PLUG_M = (() => { let m: THREE.Material | null = null; return () => (m ??= (() => { const t = soilTex().clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.25, 0.7); t.needsUpdate = true; return MTR(t, 0.95); })()); })();
const soilTex = (() => { let t: THREE.Texture | null = null; return () => (t ??= tex(128, 128, (g) => { g.fillStyle = "#94553A"; g.fillRect(0, 0, 128, 128); speck(g, 128, 128, 600, ["#5A2E1A", "#C88A5A"]); })); })();
void mixLight; void makeLife;

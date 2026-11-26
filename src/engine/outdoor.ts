// OUTDOOR KIT + HOUSE LIGHT (2026-11-14). The outside world in one call, with the numbers from src/house/look.ts.
// Before this, every video built its own sky, clouds, haze and sun rules inside its world.ts (vietnam2), so a look he
// approved in one video never reached the next one.
//
//   world.ts constructor:   this.out = new Outdoor(this.root);                       // sky, clouds, far hills, stars, shafts
//   world.ts update():      const L = this.out.light(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t });
//                           this.out.weather("rain", 1);                             // "clear" | "rain" | "snow", amount 0..1
//   an INDOOR place:        houseLight(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t });
//   a street lamp:          this.out.lamp(x, z)      (switches on by itself when it gets dark, lights the street, HOUSE.lamps)
//   wall / floor pictures:  brickTex(colour)  plankTex(colour)  plasterTex(colour)   (big surfaces: noInk(mesh), textured)
//   once, after building:   castAll(scene)  (every solid thing casts and receives shadows)   headShadows(people)
//
// What the reference outdoors look like (20 shorts studied, reference/outdoor.md in the skill):
//   sky = smooth gradient, lighter at the horizon; few puffy clouds with a clean edge and a flat lavender underside, no
//   outline; strong sun with hard-edged, cool shadows; far things pale and hazy, never outlined; at sunset the sun is in
//   front of the camera (backlit, long shadows, a soft warm glow, wide soft rays); night is saturated indigo with stars.
import * as THREE from "three";
import { HOUSE } from "../house/look";
import { Light, LIGHTS, applyLight } from "./core/lights";
import { NOINK } from "./post/ink";
import { mkCanvas, canvasTex } from "./kit";
import { smooth } from "./core/util";

type V3 = [number, number, number];
type Rig = { sun: THREE.DirectionalLight; hemi?: THREE.HemisphereLight; scene: THREE.Scene; cam: THREE.PerspectiveCamera; pose: { pos: V3; look: V3 }; t?: number };
const envBase = new WeakMap<THREE.Scene, number>();
const C = (h: THREE.ColorRepresentation) => new THREE.Color(h);
const lum = (c: THREE.Color) => 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
const tmp = new THREE.Vector3();

/** how "night" (0..1) and how "low sun" (0..1: dawn / sunset) a light is */
export const lightMood = (L: Light) => {
  const night = 1 - smooth(0.05, 0.16, lum(C(L.sky)));
  return { night, low: (1 - night) * (1 - smooth(10, 24, L.el)) };
};

function shadowBox(sun: THREE.DirectionalLight, half: number, soft: number) {
  const sc = sun.shadow.camera;
  sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 1; sc.far = 80; sc.updateProjectionMatrix();
  sun.shadow.radius = soft; sun.shadow.bias = HOUSE.shadow.bias; sun.shadow.normalBias = HOUSE.shadow.normalBias;
  if (sun.shadow.mapSize.x !== HOUSE.shadow.map) sun.shadow.mapSize.set(HOUSE.shadow.map, HOUSE.shadow.map);
}
function setEnv(scene: THREE.Scene, k: number) {
  if (!envBase.has(scene)) envBase.set(scene, scene.environmentIntensity);
  scene.environmentIntensity = envBase.get(scene)! * k;
}

/** INDOOR light with the house numbers. half = half-size of the shadow area in metres (a room: 4, one table: 2). */
export function houseLight(L: Light, rig: Rig, half = 4): Light {
  rig.sun.target.updateMatrixWorld();
  applyLight(L, { sun: rig.sun, scene: rig.scene, cam: rig.cam, dist: 8 });
  rig.sun.intensity *= HOUSE.sunGain;
  shadowBox(rig.sun, half, HOUSE.indoor.shadowSoft);
  setEnv(rig.scene, HOUSE.indoor.env);
  if (rig.hemi) rig.hemi.intensity = HOUSE.indoor.skyLight;
  return L;
}

/** every solid thing casts and receives shadows (glows, glass, sky and anything marked camFree are left out). Call once. */
export function castAll(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.camFree || q.userData.noShadow) return;
    const mt = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material & { alphaTest?: number };
    if (!mt || (mt as any).isShaderMaterial || mt.side === THREE.BackSide || mt.blending === THREE.AdditiveBlending || (mt.transparent && !(mt.alphaTest && mt.alphaTest > 0))) return;
    m.castShadow = true; m.receiveShadow = true;
  });
}
/** heads and hats cast the shape of the drawing, not a square card (call every frame: the face picture changes) */
export function headShadows(people: Iterable<any>) {
  for (const q of people) for (const [mesh, mat] of [[q.head, q.headMat], [q.hat, q.hatMat]] as [THREE.Mesh, THREE.MeshBasicMaterial][]) {
    if (!mesh || !mat) continue;
    let dm = mesh.customDepthMaterial as THREE.MeshDepthMaterial | undefined;
    if (!dm || !dm.userData.mine) { dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 }); dm.userData.mine = true; mesh.customDepthMaterial = dm; }
    if (dm.map !== mat.map) { dm.map = mat.map; dm.needsUpdate = true; }
    mesh.castShadow = !!mat.map;
  }
}

// ---------- pictures made once ----------
let seed = 9173; const rr = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
// a puffy cloud: flat base, round bumps on top, clean edge, white top, flat lavender underside (no outline)
function cloudTex(shade: string) {
  const W = 512, H = 256, c = mkCanvas(W, H), g = c.getContext("2d")!, base = 196;
  g.fillStyle = "#FFFFFF"; g.beginPath();
  const n = 5 + Math.floor(rr() * 3);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = 70 + u * (W - 140) + (rr() - 0.5) * 24, mid = 1 - Math.abs(u - 0.5 + (rr() - 0.5) * 0.2) * 1.5;
    const r = 34 + 58 * Math.max(0.15, mid) * (0.75 + 0.5 * rr());
    g.moveTo(x + r, base - r * 0.55); g.arc(x, base - r * 0.55, r, 0, Math.PI * 2);
  }
  g.rect(60, base - 44, W - 120, 44); g.fill();
  g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.fillRect(0, base, W, H - base);      // flat bottom
  g.globalCompositeOperation = "source-atop";
  const gr = g.createLinearGradient(0, base - 120, 0, base);
  gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.72, "rgba(255,255,255,0)"); gr.addColorStop(0.9, shade); gr.addColorStop(1, shade);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const t = canvasTex(c); t.generateMipmaps = true; return t;
}
// one light shaft: soft across (bright in the middle), fading in near the sun and out at the far end
function shaftTex() {
  const W = 64, H = 256, c = mkCanvas(W, H), g = c.getContext("2d")!, im = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / (W - 1), v = y / (H - 1), a = Math.pow(Math.sin(Math.PI * u), 1.6) * smooth(0, 0.12, v) * (1 - smooth(0.45, 1, v));
    const i = (y * W + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255 * a; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return canvasTex(c);
}

// ---------- wall and floor textures (houses must not look like plain coloured boxes) ----------
// All three: one clear base colour, soft darker lines, a little variation per brick / plank. Never fine noise.
// m = metres the picture covers; set tex.repeat to (wall width / m, wall height / m).
const shadeHex = (hex: string, k: number) => "#" + C(hex).multiplyScalar(k).getHexString();
/** brick wall: rows of bricks with mortar lines. Covers about 2 x 2 m. */
export function brickTex(color: string, mortar = "#E6D8C4") {
  const W = 512, c = mkCanvas(W, W), g = c.getContext("2d")!, rows = 10, bh = W / rows, bw = W / 5;
  g.fillStyle = mortar; g.fillRect(0, 0, W, W);
  for (let j = 0; j < rows; j++) for (let i = -1; i < 6; i++) {
    g.fillStyle = shadeHex(color, 0.86 + 0.26 * rr());
    g.fillRect(i * bw + (j % 2 ? bw / 2 : 0) + 3, j * bh + 3, bw - 6, bh - 6);
  }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
/** wooden planks (walkways, plank walls, doors): long boards with dark gaps, a few grain strokes and nail dots. About 2 x 2 m. */
export function plankTex(color: string, boards = 6) {
  const W = 512, c = mkCanvas(W, W), g = c.getContext("2d")!, bw = W / boards;
  for (let i = 0; i < boards; i++) {
    g.fillStyle = shadeHex(color, 0.84 + 0.3 * rr()); g.fillRect(i * bw, 0, bw, W);
    g.strokeStyle = shadeHex(color, 0.62); g.globalAlpha = 0.35; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const x = i * bw + bw * (0.2 + 0.6 * rr()); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, W * 0.3, x - 8, W * 0.7, x, W); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = shadeHex(color, 0.42); g.fillRect(i * bw - 2, 0, 4, W);
    const cut = rr() * W; g.fillRect(i * bw, cut, bw, 4);
    g.beginPath(); g.arc(i * bw + bw * 0.3, cut + 14, 3, 0, 7); g.arc(i * bw + bw * 0.7, cut + 14, 3, 0, 7); g.fill();
  }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
/** painted plaster: soft big blotches and a few hairline cracks. About 3 x 3 m. */
export function plasterTex(color: string) {
  const W = 512, c = mkCanvas(W, W), g = c.getContext("2d")!;
  g.fillStyle = color; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 40; i++) { g.fillStyle = shadeHex(color, rr() < 0.5 ? 0.8 : 1.15); g.globalAlpha = 0.1 + 0.1 * rr(); g.beginPath(); g.ellipse(rr() * W, rr() * W, 30 + 80 * rr(), 14 + 30 * rr(), rr() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 0.3; g.strokeStyle = shadeHex(color, 0.55); g.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) { let x = rr() * W, y = rr() * W; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rr() - 0.5) * 50; y += 14 + 24 * rr(); g.lineTo(x, y); } g.stroke(); }
  g.globalAlpha = 1; const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/** THE OUTDOOR OUTLINE RULE, ENFORCED (his rule, 2026-11-14). Outdoor.light() runs this by itself on the first frame, so a
 *  video cannot get it wrong: under `root`, every BIG surface (at least `big` metres in two directions: walls, roofs, ground,
 *  roads) loses its outline, and if it is a plain colour it gets a plaster texture of that colour (never a plain coloured box).
 *  Small things keep their outlines. Left alone: anything under a group with userData.indoor = true (an indoor place in the
 *  same video keeps all its outlines), userData.keepInk = true, camFree things, glowing and see-through things.
 *  Returns what it changed (also printed once). Call it again after adding big things later. */
export function outdoorSurfaces(root: THREE.Object3D, big = HOUSE.outdoorRule.big) {
  const box = new THREE.Box3(), sz = new THREE.Vector3(), done = { noInk: 0, textured: 0 };
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh || !m.geometry) return;
    for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.indoor || q.userData.keepInk || q.userData.camFree) return;
    const mt = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    if (!mt || !(mt as any).isMeshStandardMaterial || mt.transparent || mt.blending === THREE.AdditiveBlending) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    box.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld).getSize(sz);
    const d = [sz.x, sz.y, sz.z].sort((a, b) => b - a);
    if (d[1] < big) return;                                               // not big in two directions: a detail, keeps its outline
    if (m.layers.mask !== 1 << NOINK) { m.layers.set(NOINK); done.noInk++; }
    if (!mt.map && HOUSE.outdoorRule.autoTexture && d[0] < 200) {         // a plain coloured wall: paint it
      const t = plasterTex("#" + mt.color.getHexString()); t.repeat.set(Math.max(1, d[0] / 3), Math.max(1, d[1] / 3));
      const c = mt.clone(); c.map = t; c.color.set("#FFFFFF"); m.material = c; done.textured++;
    }
  });
  if (done.noInk || done.textured) console.log(`outdoor rule: ${done.noInk} big surface(s) set to no outline, ${done.textured} plain wall(s) textured`);
  return done;
}

const SKY_VS = "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const SKY_FS = `
uniform vec3 top; uniform vec3 hor; uniform vec3 sunCol; uniform vec3 sunDir; uniform float glow; uniform float disc; uniform float stars; uniform float time;
varying vec3 vP;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec3 d = normalize(vP);
  vec3 c = mix(hor, top, pow(clamp(d.y * 2.4, 0.0, 1.0), 0.6));   // the deep top colour is reached about 25 deg up, so a level camera still sees it
  float s = max(dot(d, normalize(sunDir)), 0.0);
  c += sunCol * (glow * (0.35 * pow(s, 5.0) + 0.9 * pow(s, 48.0)) + disc * 5.0 * smoothstep(0.99925, 0.99965, s));   // soft glow + a small disc, no flare shapes
  if (stars > 0.0 && d.y > 0.02) {
    vec2 q = vec2(atan(d.z, d.x) * 46.0, d.y * 70.0), i = floor(q), f = fract(q) - 0.5;
    float r = h21(i), tw = 0.75 + 0.25 * sin(time * 2.0 + r * 40.0);
    c += vec3(0.9, 0.93, 1.0) * stars * step(0.93, r) * tw * smoothstep(0.16, 0.03, length(f)) * smoothstep(0.02, 0.2, d.y);
  }
  gl_FragColor = vec4(c, 1.0);
}`;

export type OutdoorOpts = { clouds?: number; far?: "hills" | "mesas" | "peaks" | "none"; farColors?: string[]; hazeTint?: string };

export class Outdoor {
  group = new THREE.Group();
  private H = HOUSE.outdoor;
  private U = { top: { value: C("#2E7FE0") }, hor: { value: C("#CDE9F2") }, sunCol: { value: C("#FFDCA0") }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, glow: { value: 0 }, disc: { value: 0 }, stars: { value: 0 }, time: { value: 0 } };
  private dome: THREE.Mesh;
  private cloudG = new THREE.Group(); private clouds: THREE.Sprite[] = [];
  private farG = new THREE.Group(); private farU: Record<string, { value: any }>[] = [];
  private shaftG = new THREE.Group(); private shafts: THREE.Mesh[] = [];
  private rain: THREE.LineSegments | null = null; private snow: THREE.Points | null = null;
  private wKind: "clear" | "rain" | "snow" = "clear"; private wAmt = 0;
  private fog = new THREE.Fog(0xffffff, 60, 420);
  private opt: OutdoorOpts; private place: THREE.Object3D;
  private q = new THREE.Quaternion(); private sd = new THREE.Vector3();

  constructor(root: THREE.Object3D, opt: OutdoorOpts = {}) {
    this.opt = opt; this.place = root; const H = this.H, G = this.group;
    G.name = "outdoor"; G.userData.camFree = true; root.add(G);
    // ---- sky dome: follows the camera, drawn behind everything ----
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, uniforms: this.U, vertexShader: SKY_VS, fragmentShader: SKY_FS }));
    this.dome.renderOrder = -10; this.dome.frustumCulled = false; this.dome.name = "sky"; G.add(this.dome);
    // ---- clouds: a few, on a wide ring, slow drift ----
    const texs = [0, 1, 2].map(() => cloudTex(H.clouds.shade)), n = opt.clouds ?? H.clouds.count;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texs[i % 3], transparent: true, depthWrite: false, fog: false }));
      const a = (i / n) * Math.PI * 2 + rr() * 0.6, r = 230 + rr() * 80, w = (70 + rr() * 70) * H.clouds.size;
      s.position.set(Math.cos(a) * r, H.clouds.low + rr() * (H.clouds.high - H.clouds.low), Math.sin(a) * r); s.scale.set(w, w * 0.5, 1);
      s.renderOrder = -9; s.userData.a = a; s.userData.r = r; this.clouds.push(s); this.cloudG.add(s);
    }
    G.add(this.cloudG);
    // ---- far layers (hills / mesas / peaks): pale, hazy, no detail, no outline ----
    const style = opt.far ?? H.far.style;
    if (style !== "none") this.buildFar(style, opt.farColors ?? H.far.colors);
    G.add(this.farG);
    // ---- light shafts: wide soft rays in the air, a few metres in front of the camera ----
    const st = shaftTex();
    for (let i = 0; i < H.shafts.count; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(9), 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute([0.5, 0, 0, 1, 1, 1], 2));
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: st, color: new THREE.Color(...H.shafts.color), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0, side: THREE.DoubleSide, fog: false, toneMapped: false }));
      m.frustumCulled = false; m.renderOrder = 20; this.shafts.push(m); this.shaftG.add(m);
    }
    this.shaftG.name = "sunShafts"; this.shaftG.visible = false; G.add(this.shaftG);
    G.traverse((o) => o.layers.set(NOINK));     // never outlined
  }

  // 3 ridge layers in a ring far out, all the way round; they follow the camera like the sky (no parallax that far away)
  private buildFar(style: "hills" | "mesas" | "peaks", colors: string[]) {
    const SEG = 720, ROWS = 8, FOOT = -25;
    const VS = "varying vec3 vN; varying vec3 vL; void main(){ vN = normalize(mat3(modelMatrix) * normal); vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
    const FS = "uniform vec3 uAlb; uniform vec3 uAmb; uniform vec3 uSun; uniform vec3 uSunDir; uniform vec3 uHaze; uniform float uHz; uniform float uFog; varying vec3 vN; varying vec3 vL;" +
      "void main(){ float dif = max(dot(normalize(vN), normalize(uSunDir)), 0.0); vec3 c = uAlb * (uAmb + uSun * dif); float foot = 1.0 - smoothstep(-5.0, uFog, vL.y);" +
      " gl_FragColor = vec4(mix(c, uHaze, clamp(uHz + (1.0 - uHz) * foot, 0.0, 1.0)), 1.0); }";
    const tall = style === "peaks" ? 1.7 : style === "mesas" ? 0.8 : 1;
    [{ r: 660, dep: 80, H: 115, hz: 0.72 }, { r: 560, dep: 70, H: 80, hz: 0.55 }, { r: 470, dep: 60, H: 50, hz: 0.38 }].forEach((Ly, li) => {
      const F = [3, 5, 8, 13, 21, 34, 55].map((f, i) => ({ f, a: Math.pow(style === "peaks" ? 0.7 : 0.62, i), ph: rr() * 6.283 }));
      const prof: number[] = [];
      for (let i = 0; i <= SEG; i++) { const th = (i / SEG) * Math.PI * 2; let h = 0; for (const o of F) { const q = 1 - Math.abs(Math.sin(o.f * th * 0.5 + o.ph)); h += o.a * (style === "peaks" ? q * q * q : q * q); } prof.push(h); }
      const mn = Math.min(...prof), mx = Math.max(...prof), pos: number[] = [], idx: number[] = [];
      for (let i = 0; i <= SEG; i++) {
        let k01 = (prof[i] - mn) / (mx - mn);
        if (style === "mesas") k01 = 0.5 * smooth(0.3, 0.38, k01) + 0.5 * smooth(0.6, 0.66, k01);      // flat tops with steep sides
        const th = (i / SEG) * Math.PI * 2, hc = Ly.H * tall * (0.18 + 0.82 * k01);
        for (let k = 0; k <= ROWS; k++) { const v = k / ROWS, rad = Ly.r + Ly.dep * v * (0.6 + 0.4 * hc / (Ly.H * tall)), y = FOOT + (hc - FOOT) * Math.pow(Math.sin(v * Math.PI / 2), style === "mesas" ? 0.6 : 1.4); pos.push(Math.cos(th) * rad, y, Math.sin(th) * rad); }
      }
      for (let i = 0; i < SEG; i++) for (let k = 0; k < ROWS; k++) { const a = i * (ROWS + 1) + k, b = a + ROWS + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const nm = g.attributes.normal as THREE.BufferAttribute, k0 = ROWS >> 1;
      if (nm.getX(k0) * -pos[k0 * 3] + nm.getY(k0) * 0.5 + nm.getZ(k0) * -pos[k0 * 3 + 2] < 0) { for (let i = 0; i < nm.count; i++) nm.setXYZ(i, -nm.getX(i), -nm.getY(i), -nm.getZ(i)); nm.needsUpdate = true; }
      const U = { uAlb: { value: C(colors[li] ?? colors[colors.length - 1]) }, uAmb: { value: C(0) }, uSun: { value: C(0) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uHaze: { value: C(0) }, uHz: { value: Ly.hz }, uFog: { value: Ly.H * 0.5 } };
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, fog: false, side: THREE.DoubleSide, vertexShader: VS, fragmentShader: FS }));
      m.name = "far" + li; m.frustumCulled = false; this.farG.add(m); this.farU.push(U);
    });
  }

  /** how dark it is right now, 0 (day) .. 1 (night); set by light() */
  night = 0;
  private lamps: { bulb: THREE.Mesh; light: THREE.PointLight; pool: THREE.Mesh; halo: THREE.Sprite }[] = [];
  private glowT: THREE.Texture | null = null;
  /** A street lamp at ground point (x, z) (HOUSE.lamps). It is outlined (a small detail), switches on by itself when it gets
   *  dark and lights the street around it: a real warm light + a pool of light on the ground + a soft glow round the bulb.
   *  Keep to about 6 lit lamps in view (each real light costs on every surface); far ones: lamp(x, z, { real: false }). */
  lamp(x: number, z: number, o: { real?: boolean; groundY?: number } = {}) {
    const Lm = HOUSE.lamps, y0 = o.groundY ?? 0, h = Lm.height, g = new THREE.Group(); g.name = "streetLamp"; g.position.set(x, y0, z); this.place.add(g);
    const dark = new THREE.MeshStandardMaterial({ color: "#2E2A30", roughness: 0.5 });
    const part = (geo: THREE.BufferGeometry, y: number) => { const m = new THREE.Mesh(geo, dark); m.position.y = y; m.castShadow = true; g.add(m); return m; };
    part(new THREE.CylinderGeometry(0.035, 0.05, h - 0.1, 10), (h - 0.1) / 2); part(new THREE.CylinderGeometry(0.09, 0.11, 0.12, 12), 0.06);
    part(new THREE.ConeGeometry(0.22, 0.12, 12), h + 0.2); part(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), h - 0.08);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: "#FFE9C4" })); bulb.position.y = h + 0.04; bulb.name = "bulb"; bulb.userData.noShadow = true; g.add(bulb);
    if (!this.glowT) { const c = mkCanvas(128, 128), q = c.getContext("2d")!, gr = q.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(0.6, "rgba(255,255,255,0.16)"); gr.addColorStop(1, "rgba(255,255,255,0)"); q.fillStyle = gr; q.fillRect(0, 0, 128, 128); this.glowT = canvasTex(c); }
    const add = { map: this.glowT, color: new THREE.Color(Lm.color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false };
    const pool = new THREE.Mesh(new THREE.CircleGeometry(Lm.pool, 40), new THREE.MeshBasicMaterial(add)); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.035; pool.renderOrder = 5; pool.layers.set(NOINK); pool.userData.camFree = true; g.add(pool);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial(add)); halo.scale.set(Lm.halo, Lm.halo, 1); halo.position.y = h + 0.04; halo.layers.set(NOINK); halo.userData.camFree = true; g.add(halo);
    const light = new THREE.PointLight(Lm.color, 0, Lm.reach, 1.5); light.position.y = h - 0.15; light.visible = o.real !== false; g.add(light);
    this.lamps.push({ bulb, light, pool, halo });
    return g;
  }
  private updateLamps(low: number) {
    const Lm = HOUSE.lamps, on = Math.min(1, Math.max(this.night, 0.55 * low)), c = new THREE.Color(Lm.color);
    for (const l of this.lamps) {
      l.light.intensity = Lm.power * on;
      (l.bulb.material as THREE.MeshBasicMaterial).color.setRGB(1 + 3.2 * on * c.r, 0.9 + 2.4 * on * c.g, 0.75 + 1.2 * on * c.b);   // bright enough for the bloom
      (l.pool.material as THREE.MeshBasicMaterial).opacity = Lm.poolStrength * on; (l.halo.material as THREE.SpriteMaterial).opacity = Lm.haloStrength * on;
    }
  }

  /** "clear" | "rain" | "snow", amount 0..1. Pair rain with the "storm" light, snow with "night" or a pale day. */
  weather(kind: "clear" | "rain" | "snow", amount = 1) { this.wKind = kind; this.wAmt = kind === "clear" ? 0 : amount; }

  /** The outdoor light for this frame + sky, clouds, haze, far layers, shafts, weather. Returns the light it used. */
  private ruled = false;
  light(L0: Light, rig: Rig): Light {
    if (!this.ruled) { this.ruled = true; outdoorSurfaces(this.place); }   // the outline rule, applied by the engine itself
    const H = this.H, { sun, scene, cam, pose } = rig, t = rig.t ?? 0;
    const { night, low } = lightMood(L0);
    // ---- where the sun is: day = behind the camera (people glow); low sun = in front of the camera (backlit) ----
    const camAz = Math.atan2(pose.pos[0] - pose.look[0], pose.pos[2] - pose.look[2]) * 180 / Math.PI;
    const want = camAz + H.frontSun + (H.lowSunBack - H.frontSun) * low, dAz = ((want - L0.az + 540) % 360) - 180;
    const L: Light = { ...L0, az: L0.az + dAz * (1 - night), el: L0.el + (H.dayElevation - L0.el) * (1 - night) * (1 - low) };
    sun.target.position.set(pose.look[0], pose.look[1], pose.look[2]); sun.target.updateMatrixWorld();
    applyLight(L, { sun, scene, cam, dist: 30 });
    sun.intensity *= HOUSE.sunGain * (1 + (H.sunGain - 1) * (1 - night));
    const shotD = Math.hypot(pose.pos[0] - pose.look[0], pose.pos[1] - pose.look[1], pose.pos[2] - pose.look[2]);
    shadowBox(sun, Math.min(H.shadowBox[1], Math.max(H.shadowBox[0], shotD * 0.9 + 1.5)), H.shadowSoft);
    setEnv(scene, H.env * (1 + (H.lowSunFill - 1) * low));
    if (rig.hemi) rig.hemi.intensity = H.skyLight * (1 - 0.45 * night) * (1 + (H.lowSunFill - 1) * low);
    const sd = this.sd.copy(sun.position).sub(sun.target.position).normalize();
    // ---- sky ----
    const S = H.sky, day = C(L.sky), U = this.U;
    U.hor.value.copy(day).lerp(C("#FFFFFF"), S.dayHorizonWhite).lerp(C(S.sunsetHorizon), low).lerp(C(S.nightHorizon), night);
    U.top.value.copy(C(S.dayTop)).lerp(C(S.sunsetTop), low).lerp(C(S.nightTop), night);
    U.sunDir.value.copy(sd); U.sunCol.value.setRGB(...H.sun.color).lerp(C("#FFFFFF"), 0.5 * (1 - low));
    U.glow.value = H.sun.glow * (0.35 + 0.9 * low) * (1 - night) + 0.25 * night; U.disc.value = H.sun.disc * (1 - 0.6 * night);
    U.stars.value = S.stars * night * (this.wKind === "clear" ? 1 : 0);   // no stars through rain or snow clouds U.time.value = t;
    if (night > 0.5) U.sunCol.value.set("#DDE6FF");                                   // at night the same disc is the moon
    const far = cam.far;
    this.dome.scale.setScalar(far * 0.95); this.dome.position.copy(cam.position);
    // ---- clouds ----
    const cc = C("#FFFFFF").lerp(C(H.clouds.sunset), 0.55 * low).lerp(C(H.clouds.night), night), ck = Math.min(1, (far * 0.8) / 310);
    this.cloudG.position.set(cam.position.x, 0, cam.position.z); this.cloudG.scale.setScalar(ck);
    for (const s of this.clouds) { const a = s.userData.a + t * 0.002 * H.clouds.drift; s.position.x = Math.cos(a) * s.userData.r; s.position.z = Math.sin(a) * s.userData.r; (s.material as THREE.SpriteMaterial).color.copy(cc); (s.material as THREE.SpriteMaterial).opacity = 1 - 0.35 * night; }
    // ---- haze: the far world fades into the horizon colour ----
    const haze = U.hor.value.clone(), tint = this.opt.hazeTint ?? H.haze.tint;
    if (tint) haze.lerp(C(tint).multiplyScalar(lum(haze) / 0.6), 0.55);
    this.fog.color.copy(haze); this.fog.near = H.haze.from * (1 - 0.4 * night); this.fog.far = H.haze.to * (1 - 0.4 * night) * (this.wKind === "clear" ? 1 : 1 - 0.5 * this.wAmt);
    scene.fog = this.fog;
    // ---- far layers ----
    const fk = Math.min(1, (far * 0.9) / 740);
    this.farG.visible = far >= 300; this.farG.position.set(cam.position.x, 0, cam.position.z); this.farG.scale.setScalar(fk);
    for (const u of this.farU) { u.uHaze.value.copy(haze); u.uAmb.value.copy(U.hor.value).multiplyScalar(0.55); u.uSun.value.setRGB(...L.sun).multiplyScalar(night ? 0.25 : 0.9); u.uSunDir.value.copy(sd); }
    // ---- light shafts: a fan of wide soft rays from the sun, in the air behind the people ----
    const Sh = H.shafts, sc = tmp.copy(sd).applyQuaternion(this.q.copy(cam.quaternion).invert());      // sun direction as the camera sees it
    const facing = smooth(0.15, 0.55, -sc.z), kS = (Sh.when === "always" ? 1 - night : Sh.when === "low-sun" ? low : 0) * facing;
    this.shaftG.visible = kS > 0.01;
    if (this.shaftG.visible) {
      const D = Sh.distance, hh = Math.tan((cam.fov * Math.PI) / 360) * D, hw = hh * cam.aspect;
      const sx = (sc.x / -sc.z) * D, sy = Math.min((sc.y / -sc.z) * D, hh * 1.6), base = Math.atan2(-hh * 0.4 - sy, -sx), n = this.shafts.length, len = hh * 5;
      this.shaftG.position.copy(cam.position); this.shaftG.quaternion.copy(cam.quaternion);
      this.shafts.forEach((m, i) => {
        const a = base + ((i + 0.5) / n - 0.5) * 1.5 + 0.05 * Math.sin(i * 2.3), w = ((Sh.width * 2 * hw) / Math.max(hh, Math.hypot(sx, sy))) * (0.7 + 0.6 * ((i * 7) % 3) / 2);   // each ray is about `width` of the frame wide at mid frame
        const p = m.geometry.attributes.position as THREE.BufferAttribute;
        p.setXYZ(0, sx, sy, -D); p.setXYZ(1, sx + Math.cos(a - w / 2) * len, sy + Math.sin(a - w / 2) * len, -D); p.setXYZ(2, sx + Math.cos(a + w / 2) * len, sy + Math.sin(a + w / 2) * len, -D); p.needsUpdate = true;
        (m.material as THREE.MeshBasicMaterial).opacity = Sh.strength * kS * (0.8 + 0.2 * Math.sin(t * 0.6 + i * 1.7));
      });
    }
    this.night = night; this.updateLamps(low);
    this.updateWeather(cam, t);
    return L;
  }

  private updateWeather(cam: THREE.PerspectiveCamera, t: number) {
    const H = this.H, B = 9;                                   // a box of weather that travels with the camera
    if (this.wKind === "rain" && !this.rain) {
      const n = H.rain.streaks, pos = new Float32Array(n * 6), seedA = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i++) seedA[i] = rr();
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.userData.seed = seedA;
      this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: H.rain.color, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      this.rain.frustumCulled = false; this.rain.layers.set(NOINK); this.group.add(this.rain);
    }
    if (this.wKind === "snow" && !this.snow) {
      const n = H.snow.flakes, seedA = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) seedA[i] = rr();
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); g.userData.seed = seedA;
      this.snow = new THREE.Points(g, new THREE.PointsMaterial({ color: "#FFFFFF", size: H.snow.size, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      this.snow.frustumCulled = false; this.snow.layers.set(NOINK); this.group.add(this.snow);
    }
    const wrap = (v: number, c: number) => ((((v - c + B) % (2 * B)) + 2 * B) % (2 * B)) - B + c;
    if (this.rain) {
      this.rain.visible = this.wKind === "rain" && this.wAmt > 0.01;
      if (this.rain.visible) {
        const p = this.rain.geometry.attributes.position as THREE.BufferAttribute, s = this.rain.geometry.userData.seed as Float32Array, R = H.rain, n = s.length / 3, show = Math.floor(n * this.wAmt);
        for (let i = 0; i < n; i++) {
          const y = wrap(s[i * 3 + 1] * 2 * B - (t * R.speed * (0.8 + 0.4 * s[i * 3])) , cam.position.y), x = wrap(s[i * 3] * 2 * B + (y - cam.position.y) * R.slant, cam.position.x), z = wrap(s[i * 3 + 2] * 2 * B, cam.position.z), l = i < show ? R.length : 0;
          p.setXYZ(i * 2, x, y, z); p.setXYZ(i * 2 + 1, x + R.slant * l, y + l, z);
        }
        p.needsUpdate = true; (this.rain.material as THREE.LineBasicMaterial).opacity = R.opacity;
      }
    }
    if (this.snow) {
      this.snow.visible = this.wKind === "snow" && this.wAmt > 0.01;
      if (this.snow.visible) {
        const p = this.snow.geometry.attributes.position as THREE.BufferAttribute, s = this.snow.geometry.userData.seed as Float32Array, R = H.snow, n = s.length / 3;
        for (let i = 0; i < n; i++) {
          const y = wrap(s[i * 3 + 1] * 2 * B - t * R.speed * (0.6 + 0.8 * s[i * 3 + 2]), cam.position.y), x = wrap(s[i * 3] * 2 * B + 0.35 * Math.sin(t * 0.7 + i), cam.position.x), z = wrap(s[i * 3 + 2] * 2 * B + 0.35 * Math.cos(t * 0.5 + i * 1.3), cam.position.z);
          p.setXYZ(i, x, i < n * this.wAmt ? y : -999, z);
        }
        p.needsUpdate = true; (this.snow.material as THREE.PointsMaterial).opacity = R.opacity;
      }
    }
  }
}
export { HOUSE, LIGHTS };

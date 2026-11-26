// The engine: draws ANY video folder (src/videos/<name>/video.ts) with plain three.js + postprocessing into one 1080x1920
// 2D canvas. render.mjs bundles this file with "@video" = that folder's video.ts and calls window.grab(frame).
// Matches what <ThreeCanvas> + R3F 9.1.2 + @react-three/postprocessing 3.0.4 did:
//   renderer: alpha, no antialias, no stencil, high-performance, sRGB output, PCF soft shadows, pixel ratio 1,
//             tone mapping off while the composer runs (the composer component did that), autoClear on per render;
//   composer: multisampling 4, HalfFloat buffers, RenderPass first, then the children grouped the same way
//             (a Pass stays alone, a CONVOLUTION effect gets its own EffectPass, other effects merge with followers).
// Per frame: background colour, the shot (+ the incoming shot in a matched dissolve), the video's 2D overlay, white flash, captions.
import * as THREE from "three";
import { BlendFunction, BloomEffect, Effect, EffectAttribute, EffectComposer, EffectPass, Pass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "./post/ink";
import { LensBlur } from "./post/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "./post/grade";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { VideoDef, World } from "./video";
// @ts-ignore  (render.mjs points "@video" at src/videos/<name>/video.ts)
import videoDef from "@video";

const video = videoDef as VideoDef;
const FPS = video.fps ?? 30, TOTAL = video.total, CAPS = video.caps ?? [];
const whiteAt = video.whiteAt ?? (() => 0);
const dissolveAt = video.dissolveAt ?? (() => null);
const W = 1080, H = 1920;
const S: number = Math.max(1, Number(new URLSearchParams(location.search).get("res")) || Number((window as any).__RES) || 1);   // output size = S x 1080x1920 (render.mjs: set RES=2k -> 1.3333 = 1440x2560). All drawing code still uses 1080x1920 coordinates.
const PW = Math.round(W * S), PH = Math.round(H * S);
const BG = video.background ?? "#1B1020", WHITE = "#FEF9F6";

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: video.bloom ?? 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

// ---------- one WebGL canvas, shared by both layers (base + incoming shot in matched dissolves) ----------
const glCanvas = document.createElement("canvas");
glCanvas.width = PW; glCanvas.height = PH;
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
THREE.ColorManagement.enabled = true;
renderer.setPixelRatio(1);
renderer.setSize(PW, PH, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// the picture that gets saved
const out = document.getElementById("out") as HTMLCanvasElement;
out.width = PW; out.height = PH;
const ctx = out.getContext("2d")!;
ctx.setTransform(S, 0, 0, S, 0, 0);

type Layer = { scene: THREE.Scene; camera: THREE.PerspectiveCamera; world: World; lens: LensBlur; composer: EffectComposer; grade: GradeEffect };

const isConv = (e: Effect) => (e.getAttributes() & EffectAttribute.CONVOLUTION) === EffectAttribute.CONVOLUTION;

let envTex: THREE.Texture | null = null;
const envMap = () => {
  if (!envTex) { const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); }
  return envTex;
};

function makeLayer(assets: any): Layer {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, W / H, video.near ?? 0.05, video.far ?? 80);   // Fable5.2: video.ts near / far (big outdoor places)
  camera.position.set(0, 0, 5);
  const world = video.makeWorld(assets);
  scene.add(world.root);
  if (video.env) { scene.environment = envMap(); scene.environmentIntensity = video.env; }   // 3D look: soft light from all around
  const lens = new LensBlur({ maxCoC: 24, nearScale: 1.2 });
  const grade = new GradeEffect(video.grade ?? GRADES.day, video.gradeStrength ?? GRADE_STRENGTH.day);
  const children: (Pass | Effect)[] = [
    ...(video.ink === false ? [] : [new InkPass(scene, camera, video.inkOptions)]),
    lens.pre, lens.main,
    makeBloom(),
    new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade,
  ];
  const composer = new EffectComposer(renderer, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c instanceof Effect) {
      const group: Effect[] = [c];
      if (!isConv(c)) {
        let n: Pass | Effect | undefined;
        while ((n = children[i + 1]) instanceof Effect && !isConv(n)) { group.push(n); i++; }
      }
      composer.addPass(new EffectPass(camera, ...group));
    } else composer.addPass(c);
  }
  composer.setSize(PW, PH);
  return { scene, camera, world, lens, composer, grade };
}

function drawLayer(L: Layer, t: number, pose: ReturnType<VideoDef["camAt"]>, target: CanvasRenderingContext2D = ctx) {
  const r = L.world.update(t, L.camera, L.scene, pose);
  if (video.near || video.far) {   // Fable5.2: the video's near / far win over whatever the world set (depth precision outdoors)
    if (video.near) L.camera.near = video.near;
    if (video.far) L.camera.far = video.far;
    L.camera.updateProjectionMatrix();
  }
  if (pose.roll) { L.camera.rotateZ((pose.roll * Math.PI) / 180); L.camera.updateMatrixWorld(); }   // camera tilt (R3KNRF)
  if (video.gradeAt) { const g = video.gradeAt(t); L.grade.set(g.p); if (g.amount !== undefined) L.grade.amount = g.amount; }   // grade that follows the light
  if (video.ink !== false) noInkFallback(L.world.root);
  L.lens.focus = r.focus;
  L.lens.cInf = r.cInf;
  const ac = renderer.autoClear;
  renderer.autoClear = true;
  L.composer.render(1 / FPS);
  renderer.autoClear = ac;
  target.drawImage(glCanvas, 0, 0, W, H);    // same task as the GL draw, so the buffer is still there
}

// ---------- optional (bank2): soft circle wipe and the object transition ----------
let offC: HTMLCanvasElement | null = null, offG: CanvasRenderingContext2D | null = null;
const off = () => { if (!offC) { offC = document.createElement("canvas"); offC.width = PW; offC.height = PH; offG = offC.getContext("2d")!; offG.setTransform(S, 0, 0, S, 0, 0); } return offG!; };
const pv = new THREE.Vector3();
const toScreen = (cam: THREE.Camera, p: [number, number, number]): [number, number] => { pv.set(p[0], p[1], p[2]).project(cam); return [(pv.x + 1) * 0.5 * W, (1 - pv.y) * 0.5 * H]; };
// the incoming shot inside a growing soft circle (it starts at the wipe point and ends past every corner)
function drawWipe(L: Layer, t: number, pose: ReturnType<VideoDef["camAt"]>, w: number, at: [number, number, number], glow?: string) {
  const g = off();
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
  drawLayer(L, t, pose, g);
  const [cx, cy] = toScreen(L.camera, at), soft = 170;
  const far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy)) + soft;
  const r = Math.max(1, w * far), r0 = Math.max(0, r - soft);
  const grad = g.createRadialGradient(cx, cy, r0, cx, cy, r);
  grad.addColorStop(0, "rgba(0,0,0,1)"); grad.addColorStop(1, "rgba(0,0,0,0)");
  g.globalCompositeOperation = "destination-in"; g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
  ctx.drawImage(offC!, 0, 0, W, H);
  if (glow && w > 0 && w < 1) {                       // a soft glowing ring on the edge
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.55 * Math.sin(Math.PI * w);
    const rg = ctx.createRadialGradient(cx, cy, Math.max(0, r - soft * 0.9), cx, cy, r);
    rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(0.55, glow); rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}
// one triangle of a picture mapped onto a triangle of the screen (affine)
function tri(img: CanvasImageSource, s: number[], d: number[]) {
  const [x0, y0, x1, y1, x2, y2] = s, [u0, v0, u1, v1, u2, v2] = d;
  const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0); if (Math.abs(den) < 1e-9) return;
  const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / den, b = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / den;
  const c = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / den, dd = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / den;
  const e = u0 - a * x0 - c * y0, f = v0 - b * x0 - dd * y0;
  const mx = (u0 + u1 + u2) / 3, my = (v0 + v1 + v2) / 3, grow = (x: number, m: number) => x + Math.sign(x - m) * 0.6;   // 0.6 px overlap: no seams
  ctx.save(); ctx.beginPath(); ctx.moveTo(grow(u0, mx), grow(v0, my)); ctx.lineTo(grow(u1, mx), grow(v1, my)); ctx.lineTo(grow(u2, mx), grow(v2, my)); ctx.closePath(); ctx.clip();
  ctx.setTransform(a, b, c, dd, S * e, S * f); ctx.drawImage(img, 0, 0); ctx.restore();   // source picture is S times bigger than the 1080 coordinates: the linear part stays, only the shift scales
}
let snapC: HTMLCanvasElement | null = null, snapG: CanvasRenderingContext2D | null = null;
const snap = () => { if (!snapC) { snapC = document.createElement("canvas"); snapC.width = PW; snapC.height = PH; snapG = snapC.getContext("2d")!; snapG.setTransform(S, 0, 0, S, 0, 0); } return snapG!; };
function drawCollapse(c: NonNullable<ReturnType<NonNullable<VideoDef["collapseAt"]>>>, t: number) {
  const q = c.corners.map((p) => toScreen(base.camera, p));
  const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, c.k)), 3);            // ease-out into the object
  const full: [number, number][] = [[0, 0], [W, 0], [W, H], [0, H]];
  const D = full.map((f, i) => [f[0] + (q[i][0] - f[0]) * e, f[1] + (q[i][1] - f[1]) * e]);
  const at = (u: number, v: number) => {                                    // bilinear point inside the quad
    const top = [D[0][0] + (D[1][0] - D[0][0]) * u, D[0][1] + (D[1][1] - D[0][1]) * u], bot = [D[3][0] + (D[2][0] - D[3][0]) * u, D[3][1] + (D[2][1] - D[3][1]) * u];
    return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
  };
  if ((c.alpha ?? 1) <= 0.001) return;
  ctx.save(); ctx.globalAlpha = c.alpha ?? 1;
  const N = 6;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N, v0 = j / N, v1 = (j + 1) / N;
    const p00 = at(u0, v0), p10 = at(u1, v0), p11 = at(u1, v1), p01 = at(u0, v1);
    tri(snapC!, [u0 * W, v0 * H, u1 * W, v0 * H, u1 * W, v1 * H], [p00[0], p00[1], p10[0], p10[1], p11[0], p11[1]]);
    tri(snapC!, [u0 * W, v0 * H, u1 * W, v1 * H, u0 * W, v1 * H], [p00[0], p00[1], p11[0], p11[1], p01[0], p01[1]]);
  }
  ctx.globalAlpha = (c.alpha ?? 1) * Math.min(1, e * 1.5);                   // a thin dark edge so it reads as a picture
  ctx.lineWidth = 3 + 5 * (1 - e); ctx.strokeStyle = "#1a1020"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(D[0][0], D[0][1]); for (const p of [D[1], D[2], D[3]]) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.stroke();
  ctx.restore();
}

// ---------- captions: the same look as the old DOM div (Arial Black 84 px, 10 px stroke under the fill, soft shadow) ----------
const FONT = '900 84px "Arial Black", Impact, sans-serif';
function drawCaption(t: number) {
  const c = CAPS.find((k) => t >= k.a && t < k.b);
  if (!c) return;
  const pop = 1 + 0.08 * Math.max(0, 1 - (t - c.a) / 0.1);
  const text = c.text.toUpperCase();
  ctx.save();
  ctx.font = FONT;
  const m = ctx.measureText(text);
  const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
  const top = 1300, cy = top + (asc + desc) / 2, y = top + asc;   // div top 1300, line-height normal, scaled about its centre
  ctx.translate(540, cy); ctx.scale(pop, pop); ctx.translate(-540, -cy);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "miter"; ctx.miterLimit = 4;
  ctx.lineWidth = 10; ctx.strokeStyle = "#1a1020";
  ctx.shadowColor = "rgba(26,16,32,0.6)"; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 6 * pop; ctx.shadowBlur = 6 * pop;
  ctx.strokeText(text, 540, y);
  ctx.shadowColor = "rgba(0,0,0,0)";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 540, y);
  ctx.restore();
}

let base: Layer, topL: Layer;

function renderFrame(f: number) {
  const t = f / FPS;
  const dz = dissolveAt(t);
  const cz = video.collapseAt ? video.collapseAt(t) : null;
  if (cz) { const g = snap(); g.globalAlpha = 1; g.fillStyle = BG; g.fillRect(0, 0, W, H); drawLayer(topL, t, cz.out, g); if (cz.style) { g.save(); cz.style(g, W, H, Math.min(1, cz.k), t); g.restore(); } cz.snapTo?.(snapC!); }   // the old shot first, into its own canvas
  ctx.globalAlpha = 1;
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  drawLayer(base, t, dz ? dz.out : video.camAt(t));
  if (dz && dz.wipe) drawWipe(topL, t, video.camAt(t), dz.w, dz.wipe, dz.wipeGlow);
  else if (dz) {                            // incoming shot over the outgoing one, both fully post-processed
    ctx.globalAlpha = dz.w;
    drawLayer(topL, t, video.camAt(t));
    ctx.globalAlpha = 1;
  }
  if (cz) drawCollapse(cz, t);
  if (video.overlay) { ctx.save(); video.overlay(ctx, t); ctx.restore(); }   // flat things on the screen (e.g. a stopwatch in a corner)
  const w = whiteAt(t);
  if (w > 0) { ctx.globalAlpha = w; ctx.fillStyle = WHITE; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  drawCaption(t);
}

function gpuName() {
  const gl = renderer.getContext();
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
}

async function init() {
  const assets = await video.load();
  try { await document.fonts.load(FONT, "A"); } catch { /* system font */ }
  base = makeLayer(assets);
  topL = makeLayer(assets);
  const wid = (f: string) => { ctx.font = f; return ctx.measureText("CHESS 123").width; };
  const arialBlack = wid('900 84px "Arial Black", monospace') !== wid("900 84px monospace");
  const impact = wid("84px Impact, monospace") !== wid("84px monospace");
  return { total: TOTAL, fps: FPS, size: [PW, PH], gpu: gpuName(), font: arialBlack ? "Arial Black" : impact ? "Impact" : "sans-serif (Arial Black missing!)" };
}

// ---------- `node render.mjs check` (Fable5.2): finds camera and ground problems WITHOUT rendering a frame ----------
// CAMERA  THROUGH: the straight line between two frames' camera positions crosses a surface (wall, prop, body, head).
//         CLOSE:   something is within `clear` m in front of, beside or above the lens (it would fill the frame or be cut open).
// GROUND  two big flat pieces less than 3 cm apart with no depth offset: they flicker from far away (use kit.ts onGround).
// NOT DRAWN  things that sit wholly beyond the camera's far plane.
// Something the camera may pass through on purpose:  obj.userData.camFree = true  (covers its children too).
function check(step = 2, clear = 0.3) {
  const L = base, ray = new THREE.Raycaster(), sph = new THREE.Sphere(), box = new THREE.Box3(), prev = new THREE.Vector3(), p = new THREE.Vector3(), d = new THREE.Vector3();
  ray.layers.enableAll();
  const free = (o: THREE.Object3D | null): boolean => { for (; o; o = o.parent) if (o.userData.camFree) return true; return false; };
  const shown = (o: THREE.Object3D | null): boolean => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  const label = (o: THREE.Object3D) => { for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.name) return q.name; const g = (o as THREE.Mesh).geometry; return g ? g.type.replace("Geometry", "") : o.type; };
  const mat0 = (m: THREE.Mesh) => (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material;
  const solid = (o: THREE.Object3D): o is THREE.Mesh => { const m = o as THREE.Mesh; if (!m.isMesh || !m.geometry) return false; const mt = mat0(m); return !!mt && mt.depthWrite !== false && mt.visible !== false && !(mt.transparent && mt.opacity < 0.5); };
  const cam: { f: number; kind: string; what: string; at: number[] }[] = [], flat = new Map<string, string>(), clipped = new Map<string, string>();
  let lastShot = -1, have = false;
  for (let f = 0; f < TOTAL; f += step) {
    const t = f / FPS, pose = video.camAt(t);
    L.world.update(t, L.camera, L.scene, pose);
    L.scene.updateMatrixWorld(true);
    p.copy(L.camera.position);
    const moved = have ? p.distanceTo(prev) : 0, cut = !have || (pose.shot !== lastShot && moved > 0.6) || moved > 2.5;
    const near: THREE.Mesh[] = [], reach = clear + (cut ? 0 : moved) + 0.05, wide = f % (step * 150) === 0;
    const flats: { o: THREE.Mesh; y: number; b: THREE.Box3 }[] = [];
    L.scene.traverse((o) => {
      if (!solid(o) || !shown(o) || free(o)) return;
      const im = o as unknown as THREE.InstancedMesh;
      if (im.isInstancedMesh) { if (!im.boundingSphere) im.computeBoundingSphere(); sph.copy(im.boundingSphere!); }
      else { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); sph.copy(o.geometry.boundingSphere!); }
      sph.applyMatrix4(o.matrixWorld);
      const dist = sph.center.distanceTo(p);
      if (dist - sph.radius < reach) near.push(o);
      if (!wide) return;
      if (dist - sph.radius > L.camera.far) clipped.set(o.uuid, `"${label(o)}" is ${Math.round(dist)} m away, beyond the far plane (${L.camera.far} m)`);
      box.setFromObject(o);
      if (box.max.y - box.min.y < 0.006 && box.max.x - box.min.x > 1.5 && box.max.z - box.min.z > 1.5) flats.push({ o, y: box.min.y, b: box.clone() });
    });
    for (let i = 0; i < flats.length; i++) for (let j = i + 1; j < flats.length; j++) {
      const A = flats[i], B = flats[j], gap = Math.abs(A.y - B.y);
      if (gap >= 0.03 || A.b.max.x < B.b.min.x || B.b.max.x < A.b.min.x || A.b.max.z < B.b.min.z || B.b.max.z < A.b.min.z) continue;
      const top = A.y >= B.y ? A : B;   // the upper layer must carry the depth offset
      if (mat0(top.o).polygonOffset) continue;
      flat.set([A.o.uuid, B.o.uuid].sort().join(), `"${label(A.o)}" (y ${A.y.toFixed(3)}) and "${label(B.o)}" (y ${B.y.toFixed(3)}) are flat layers ${(gap * 1000).toFixed(0)} mm apart: wrap the upper one in onGround(mesh, level)`);
    }
    const hit = (from: THREE.Vector3, dir: THREE.Vector3, len: number) => { ray.set(from, dir); ray.near = 0; ray.far = len; const h = ray.intersectObjects(near, false); return h.length ? h[0] : null; };
    if (near.length) {
      if (!cut && moved > 1e-4) {   // through: tried both ways (a one-sided surface only counts from its front)
        d.copy(p).sub(prev).normalize();
        const h = hit(prev, d, moved) ?? hit(p, d.clone().negate(), moved);
        if (h) cam.push({ f, kind: "THROUGH", what: label(h.object), at: h.point.toArray().map((v) => +v.toFixed(2)) });
      }
      const m = L.camera.matrixWorld.elements, R = new THREE.Vector3(m[0], m[1], m[2]).normalize(), U = new THREE.Vector3(m[4], m[5], m[6]).normalize(), F = new THREE.Vector3(-m[8], -m[9], -m[10]).normalize();
      for (const dir of [F, R, R.clone().negate(), U]) {
        const h = hit(p, dir, clear) ?? hit(p.clone().addScaledVector(dir, clear), dir.clone().negate(), clear);
        if (h) { cam.push({ f, kind: "CLOSE", what: label(h.object), at: h.point.toArray().map((v) => +v.toFixed(2)) }); break; }
      }
    }
    prev.copy(p); lastShot = pose.shot; have = true;
  }
  return JSON.stringify({ total: TOTAL, fps: FPS, step, clear, near: L.camera.near, far: L.camera.far, cam, flat: [...flat.values()], clipped: [...clipped.values()] });
}

const w = window as any;
w.check = check;
w.renderFrame = renderFrame;
w.whiteOf = (f: number) => whiteAt(f / FPS);   // 2026-11-26: lets the blank-frame guard tell a planned white flash from a black GPU frame
w.grab = (f: number, fmt: string) => {
  renderFrame(f);
  return fmt === "png" ? out.toDataURL("image/png") : out.toDataURL("image/jpeg", 0.95);
};
w.readyPromise = init().then((info) => { w.ready = true; return info; }, (e) => { w.loadError = String(e && e.stack || e); throw e; });

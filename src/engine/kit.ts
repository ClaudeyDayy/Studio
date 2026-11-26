// Shared building helpers: canvases, two-tone materials, ink on/off, pop-in scale, ink hulls.
import * as THREE from "three";
import { twoTone } from "./post/shade";
import { NOINK } from "./post/ink";
import { V3, smooth } from "./core/util";

export const INK_BROWN = "#2A1A1E";            // characters, hands, hulls: soft dark brown, never pure black
export const mkCanvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
export const canvasTex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const mats = new Map<string, THREE.MeshLambertMaterial>();
// M("#hex"): the toon material for a plain colour (shared, so call it as often as you like)
export const M = (hex: string): THREE.MeshLambertMaterial => {
  let m = mats.get(hex);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: hex })) as THREE.MeshLambertMaterial; mats.set(hex, m); }
  return m;
};
// MT(texture): the toon material for a painted texture
export const MT = (map: THREE.Texture) => twoTone(new THREE.MeshLambertMaterial({ map })) as THREE.MeshLambertMaterial;
// ---- the 3D look (2026-11-11): REAL materials, no toon steps, no outlines (the reference world looks almost real) ----
// MR("#hex", roughness 0..1, metalness 0..1): a real material for a plain colour (shared). MTR(texture, roughness): a real
// material with a picture. They take the sun, the sky light and video.ts `env` like real things (soft shading, highlights).
const rmats = new Map<string, THREE.MeshStandardMaterial>();
export const MR = (hex: string, rough = 0.75, metal = 0): THREE.MeshStandardMaterial => {
  const k = hex + "|" + rough + "|" + metal;
  let m = rmats.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal }); rmats.set(k, m); }
  return m;
};
export const MTR = (map: THREE.Texture, rough = 0.8, metal = 0) => new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: metal });
// onGround(mesh, level) (Fable5.2): for a flat thing lying ON another flat thing (a dirt pad or road on the grass, water, a rug,
// a puddle, a photo on a table). Two flat pieces a few mm apart flicker from far away or from above ("the ground glitches green").
// level 1 = the lowest patch, 2 = a patch on top of that, ... It gives the mesh its own material copy with a depth offset, so it
// always wins over what lies under it at any distance. `node render.mjs check` lists every pair that still needs it.
export const onGround = <T extends THREE.Mesh>(m: T, level = 1): T => {
  const mat = (Array.isArray(m.material) ? m.material[0] : m.material).clone();
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2 * level; mat.polygonOffsetUnits = -8 * level;
  m.material = mat; m.renderOrder = Math.max(m.renderOrder, level);
  return m;
};
export const noInk = <T extends THREE.Object3D>(o: T): T => { o.layers.set(NOINK); return o; };     // no ink outline on this object
export const noInkAll = (o: THREE.Object3D) => o.traverse((c: THREE.Object3D) => c.layers.set(NOINK));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const popScale = (t: number, a: number, b: number) => {           // pop in at a with overshoot, shrink out at b
  const i = Math.min(1, Math.max(0, (t - a) / 0.2)), o = 1 - smooth(b - 0.15, b, t);
  const ov = i < 1 ? 1 + 0.18 * Math.sin(i * Math.PI) : 1;
  return t < a || t > b ? 0 : smooth(0, 1, i) * ov * o;
};
// backface ink shell (an outline that also works where the ink pass does not run)
export const hull = (geo: THREE.BufferGeometry, s = 1.06) => {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: INK_BROWN, side: THREE.BackSide }));
  m.scale.setScalar(s); return m;
};

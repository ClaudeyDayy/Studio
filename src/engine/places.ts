// THE PLACE LIBRARY (2026-11-16). Ready-made American places and street pieces that already follow the house rules
// (src/house/look.ts, src/house/OUTDOOR-RULES.md). A video PICKS places from here; it does not build streets, houses,
// sidewalks, stairs or lamps from scratch any more. That is what made every video slow and made the rules get lost.
// READ src/house/START-HERE.md FIRST. render.mjs refuses a video that neither uses this file nor says why not.
//
//   WHOLE PLACES (one call each, in the world's constructor, after `this.out = new Outdoor(this.root)`):
//     neighborhood(root, out, { houses: 4, climate: "temperate", seed: 3 })   a street of family houses with lawns, paths,
//                                                                             driveways, cars, fences, mailboxes, trees, lamps
//     mainStreet(root, out, { shops: 5, bank: true, seed: 5 })                brick shops with awnings and signs, a bank, lamps,
//                                                                             benches, parked cars, crosswalks
//     Both return { group, doors, walk, length }: `doors` = the front-door points, `walk` = sidewalk points in front of
//     each building (world coordinates: stand people there, aim the camera there). x / z / yaw place the whole thing.
//   PIECES (each returns a Group standing on the ground at its own centre, FRONT FACING +z):
//     house(opts)  shop(opts)  bank(opts)                        buildings
//     road()  sidewalk()  crosswalk()  ground()  flat()          the ground pieces (flat things use onGround, no flicker)
//     stairs({ steps, width, rails })                             any stairway: foot at the origin, climbs toward -z
//     door()  win()                                               door and sash window, to put on your own wall
//     picketFence(len)  mailbox()  hydrant()  bench()  trashCan()  utilityPole()  wires(a, b)  car(colour, "sedan" | "pickup")
//     street lamps: out.lamp(x, z) (engine/outdoor.ts)      trees: scatterTrees(root, climate, spots) (engine/trees.ts)
//   every frame:  windowsLit(this.out.night)   (the windows glow warm when it gets dark)
//
// SCALE: people are 1.2 m tall, so a door is 1.5 m, a storey 2.1 m, a car 3 m long (SIZE below). Keep new pieces to it.
// THE RULES THIS FILE KEEPS FOR YOU: big surfaces (walls, roofs, ground, roads) have no outline and are textured (siding,
// brick, plaster, shingles, asphalt); small details (doors, windows, posts, rails, steps, kerbs, lamps, signs) are outlined;
// trees fit the climate; everything casts and receives shadows; nothing is a plain coloured box.
// SOMETHING MISSING (a school, a diner, a gas station, a farm, a harbour)? Add it HERE as a general builder with options,
// use it from the video, and add one line to the LOG at the bottom. Never build it only inside one video folder.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MR, mkCanvas, canvasTex, noInk, onGround } from "./kit";
import { brickTex, plankTex, plasterTex, Outdoor } from "./outdoor";
import { scatterTrees, Climate } from "./trees";

type V3 = [number, number, number];
export const SIZE = { person: 1.2, door: [0.72, 1.5] as [number, number], storey: 2.1, window: [0.78, 0.95] as [number, number], step: [0.14, 0.27] as [number, number] };
const TRIM = "#F4EFE6", IRON = "#2E2A30";
const R = (seed: number) => { let a = Math.imul(Math.floor(Math.abs(seed) * 7919) ^ 0x9e3779b9, 0x85ebca6b); a ^= a >>> 13; a = Math.imul(a, 0xc2b2ae35); a = (a ^ (a >>> 16)) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const shade = (hex: string, k: number) => "#" + new THREE.Color(hex).multiplyScalar(k).getHexString();
const USED: Record<string, number> = {};
const used = (n: string) => { USED[n] = (USED[n] || 0) + 1; (globalThis as any).__PLACES_USED = USED; };

// ---------------- textures (made once, shared). Each remembers how many metres it covers (userData.m) ----------------
const TX = new Map<string, THREE.Texture>();
type Ctx = CanvasRenderingContext2D;
function tex(key: string, m: number, px: number, draw: (g: Ctx, W: number, r: () => number) => void) {
  let t = TX.get(key); if (t) return t;
  const c = mkCanvas(px, px); draw(c.getContext("2d")!, px, R(key.length * 3.7 + px));
  t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.userData.m = m; TX.set(key, t); return t;
}
const eng = (key: string, m: number, make: () => THREE.Texture) => { let t = TX.get(key); if (!t) { t = make(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.userData.m = m; TX.set(key, t); } return t; };
const blotch = (g: Ctx, W: number, r: () => number, base: string, n: number, big = 1) => {
  for (let i = 0; i < n; i++) { g.fillStyle = shade(base, r() < 0.5 ? 0.78 : 1.16); g.globalAlpha = 0.06 + 0.07 * r(); g.beginPath(); g.ellipse(r() * W, r() * W, (20 + 70 * r()) * big, (10 + 30 * r()) * big, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1;
};
/** wooden siding: horizontal boards with a shadow line under each (the American house wall). 2 m */
export const sidingTex = (color: string) => tex("siding" + color, 2, 512, (g, W, r) => {
  const n = 10, bh = W / n;
  for (let j = 0; j < n; j++) { g.fillStyle = shade(color, 0.95 + 0.08 * r()); g.fillRect(0, j * bh, W, bh); g.fillStyle = shade(color, 1.1); g.fillRect(0, j * bh, W, 3); g.fillStyle = shade(color, 0.6); g.fillRect(0, (j + 1) * bh - 5, W, 5); }
});
/** roof shingles in offset rows. 2 m */
export const shingleTex = (color: string) => tex("shingle" + color, 2, 512, (g, W, r) => {
  const rows = 8, rh = W / rows, sw = W / 6;
  g.fillStyle = shade(color, 0.55); g.fillRect(0, 0, W, W);
  for (let j = 0; j < rows; j++) for (let i = -1; i < 7; i++) { g.fillStyle = shade(color, 0.84 + 0.3 * r()); g.fillRect(i * sw + (j % 2 ? sw / 2 : 0) + 2, j * rh, sw - 4, rh - 5); }
});
/** road surface: one dark grey with soft blotches and a few pale specks (never fine noise). 4 m */
export const asphaltTex = (color = "#4B4B53") => tex("asphalt" + color, 4, 512, (g, W, r) => {
  g.fillStyle = color; g.fillRect(0, 0, W, W); blotch(g, W, r, color, 46);
  for (let i = 0; i < 90; i++) { g.fillStyle = shade(color, 1.5); g.globalAlpha = 0.35; g.beginPath(); g.arc(r() * W, r() * W, 1.2 + 1.8 * r(), 0, 7); g.fill(); } g.globalAlpha = 1;
});
/** concrete paving: 1 m slabs with joints. 2 m */
export const concreteTex = (color = "#CFC9BC") => tex("concrete" + color, 2, 512, (g, W, r) => {
  g.fillStyle = color; g.fillRect(0, 0, W, W); blotch(g, W, r, color, 30);
  g.fillStyle = shade(color, 0.68); for (const p of [0, W / 2]) { g.fillRect(p - 2, 0, 4, W); g.fillRect(0, p - 2, W, 4); }
});
/** open ground: grass, dirt, sand or snow. One clear colour, soft blotches, a few tufts. 6 m */
const GROUND = { grass: "#5F9E4A", dirt: "#B08A5E", sand: "#E3CF9C", snow: "#EEF2F7" };
export const groundTex = (kind: keyof typeof GROUND = "grass", color = GROUND[kind]) => tex("ground" + kind + color, 6, 1024, (g, W, r) => {
  g.fillStyle = color; g.fillRect(0, 0, W, W); blotch(g, W, r, color, 180, 1.6);
  for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * W; g.strokeStyle = shade(color, r() < 0.6 ? 0.7 : 1.25); g.globalAlpha = 0.5; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4 * (r() - 0.5), y - 5 - 6 * r()); g.stroke(); } g.globalAlpha = 1;
});
const stripeTex = (a: string, b: string) => tex("stripe" + a + b, 1.2, 256, (g, W) => { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * W) / 6, 0, W / 6 + 1, W); } });
export function signTex(text: string, bg = "#2F4B3A", fg = "#F4E9C8") {
  const c = mkCanvas(512, 128), g = c.getContext("2d")!; g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(9, 9, 494, 110); g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "bold 74px Georgia, 'Times New Roman', serif"; const mw = g.measureText(text).width || 300;
  if (mw > 450) g.font = `bold ${Math.floor((74 * 450) / mw)}px Georgia, 'Times New Roman', serif`;
  g.fillText(text, 256, 68); return canvasTex(c);
}
export type Wall = "siding" | "brick" | "plaster";
export const wallTex = (kind: Wall, color: string) => kind === "brick" ? eng("brick" + color, 2, () => brickTex(color)) : kind === "plaster" ? eng("plaster" + color, 3, () => plasterTex(color)) : sidingTex(color);
const plank = (color: string) => eng("plank" + color, 2, () => plankTex(color, 8));

// ---------------- small building helpers ----------------
const MATS = new Map<string, THREE.MeshStandardMaterial>();
const matOf = (t: THREE.Texture, rough = 0.9) => { const k = t.uuid + rough; let m = MATS.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ map: t, roughness: rough }); MATS.set(k, m); } return m; };
/** texture coordinates in metres, so one shared texture fits a wall of any size without stretching */
function uvMetres<T extends THREE.BufferGeometry>(geo: T, m: number): T {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ax >= ay && ax >= az) uv.setXY(i, p.getZ(i) / m, p.getY(i) / m); else if (ay >= az) uv.setXY(i, p.getX(i) / m, p.getZ(i) / m); else uv.setXY(i, p.getX(i) / m, p.getY(i) / m);
  }
  return geo;
}
const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, name = "") => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; if (name) o.name = name; return o; };
/** a small detail (outlined) in a plain colour */
const box = (w: number, h: number, d: number, col: string, x: number, y: number, z: number, name = "", rough = 0.75) => mesh(new THREE.BoxGeometry(w, h, d), MR(col, rough), x, y, z, name);
/** a detail (outlined) with a texture */
const tbox = (w: number, h: number, d: number, t: THREE.Texture, x: number, y: number, z: number, name = "") => mesh(uvMetres(new THREE.BoxGeometry(w, h, d), t.userData.m), matOf(t), x, y, z, name);
/** a BIG surface: no outline, textured (the outdoor rule) */
const big = (w: number, h: number, d: number, t: THREE.Texture, x: number, y: number, z: number, name = "") => noInk(tbox(w, h, d, t, x, y, z, name));
/** many small boxes as ONE mesh (pickets, balusters, window bars). Each: [w, h, d, x, y, z] */
function boxes(col: string, list: number[][], name = "", rough = 0.75) {
  const gs = list.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  return mesh(mergeGeometries(gs) as THREE.BufferGeometry, MR(col, rough), 0, 0, 0, name);
}
/** a flat thing lying on the ground (path, driveway, road, lawn): no outline, never flickers. level 1 = on the ground, 2 = on that */
export function flat(w: number, d: number, t: THREE.Texture, level: number, x = 0, z = 0, name = "") {
  const m = mesh(uvMetres(new THREE.PlaneGeometry(w, d), t.userData.m).rotateX(-Math.PI / 2), matOf(t, 0.95), x, 0.006 * level, z, name);
  m.castShadow = false; return noInk(onGround(m, level));
}
const paint = (w: number, d: number, col: string, level: number, x: number, z: number, name = "") => {
  const m = mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), MR(col, 0.8), x, 0.006 * level, z, name); m.castShadow = false; return noInk(onGround(m, level));
};
const W = (G: THREE.Object3D, x: number, y: number, z: number): V3 => { const c = Math.cos(G.rotation.y), s = Math.sin(G.rotation.y); return [G.position.x + c * x + s * z, y, G.position.z - s * x + c * z]; };

// ---------------- windows and doors ----------------
const GLASS = new THREE.MeshStandardMaterial({ color: "#8DB9D2", roughness: 0.15, metalness: 0.4, emissive: "#FFC56A", emissiveIntensity: 0 });
/** call every frame with this.out.night (0 day .. 1 night): the windows glow warm in the dark */
export const windowsLit = (k: number) => { GLASS.emissiveIntensity = 1.7 * Math.max(0, Math.min(1, k)); };
/** a sash window on a wall: origin = the middle of the window on the wall face, facing +z. shutters: a colour or null */
export function win(o: { w?: number; h?: number; trim?: string; shutters?: string | null; lintel?: boolean } = {}) {
  const w = o.w ?? SIZE.window[0], h = o.h ?? SIZE.window[1], G = new THREE.Group(); G.name = "window";
  const glass = mesh(new THREE.BoxGeometry(w, h, 0.03), GLASS, 0, 0, 0.012, "glass"); glass.castShadow = false; glass.userData.noShadow = true; G.add(glass);
  const f = 0.06, bars = [[f, h + 2 * f, 0.07, -w / 2 - f / 2, 0, 0.035], [f, h + 2 * f, 0.07, w / 2 + f / 2, 0, 0.035], [w + 2 * f, f, 0.07, 0, h / 2 + f / 2, 0.035],
    [w + 0.24, 0.07, 0.13, 0, -h / 2 - 0.035, 0.065], [w, 0.045, 0.05, 0, 0, 0.03], [0.03, h, 0.045, 0, 0, 0.028]];
  if (o.lintel) bars.push([w + 0.3, 0.12, 0.09, 0, h / 2 + f + 0.06, 0.045]);
  G.add(boxes(o.trim ?? TRIM, bars, "frame"));
  if (o.shutters) { const sw = w * 0.42, sx = w / 2 + f + sw / 2 + 0.02; G.add(boxes(o.shutters, [[sw, h + 0.06, 0.035, -sx, 0, 0.02], [sw, h + 0.06, 0.035, sx, 0, 0.02], [sw * 0.8, 0.04, 0.05, -sx, h * 0.22, 0.03], [sw * 0.8, 0.04, 0.05, -sx, -h * 0.22, 0.03], [sw * 0.8, 0.04, 0.05, sx, h * 0.22, 0.03], [sw * 0.8, 0.04, 0.05, sx, -h * 0.22, 0.03]], "shutters")); }
  return G;
}
/** a door on a wall: origin = the middle of its bottom edge on the wall face, facing +z */
export function door(o: { w?: number; h?: number; color?: string; trim?: string; double?: boolean; glass?: boolean } = {}) {
  const w = o.w ?? SIZE.door[0] * (o.double ? 2 : 1), h = o.h ?? SIZE.door[1], col = o.color ?? "#8E2F2B", G = new THREE.Group(); G.name = "door";
  const leaves = o.double ? [-w / 4, w / 4] : [0], lw = w / leaves.length;
  for (const lx of leaves) {
    G.add(box(lw - 0.01, h, 0.05, col, lx, h / 2, 0.025, "doorLeaf", 0.6));
    if (o.glass) { const g = mesh(new THREE.BoxGeometry(lw * 0.62, h * 0.5, 0.02), GLASS, lx, h * 0.62, 0.055, "glass"); g.castShadow = false; G.add(g); G.add(boxes(shade(col, 0.78), [[lw * 0.62, h * 0.2, 0.02, lx, h * 0.17, 0.055]], "panel", 0.6)); }
    else G.add(boxes(shade(col, 0.78), [[lw * 0.3, h * 0.36, 0.02, lx - lw * 0.2, h * 0.7, 0.055], [lw * 0.3, h * 0.36, 0.02, lx + lw * 0.2, h * 0.7, 0.055], [lw * 0.3, h * 0.3, 0.02, lx - lw * 0.2, h * 0.27, 0.055], [lw * 0.3, h * 0.3, 0.02, lx + lw * 0.2, h * 0.27, 0.055]], "panels", 0.6));
    const knob = mesh(new THREE.SphereGeometry(0.03, 12, 10), MR("#E2B23C", 0.3, 0.8), lx + (o.double ? (lx < 0 ? 1 : -1) : 1) * lw * 0.38, h * 0.47, 0.085, "knob"); G.add(knob);
  }
  G.add(boxes(o.trim ?? TRIM, [[0.08, h + 0.08, 0.1, -w / 2 - 0.04, h / 2 + 0.04, 0.05], [0.08, h + 0.08, 0.1, w / 2 + 0.04, h / 2 + 0.04, 0.05], [w + 0.22, 0.1, 0.12, 0, h + 0.05, 0.06], [w + 0.1, 0.03, 0.14, 0, 0.015, 0.07]], "doorFrame"));
  return G;
}

// ---------------- stairs ----------------
/** A stairway. The foot is at the origin; it climbs toward -z; the top is at y = steps * rise, z = -steps * run.
 *  kind: "concrete" | "wood" | "stone". rails: handrails on both sides (iron). */
export function stairs(o: { steps?: number; width?: number; rise?: number; run?: number; rails?: boolean; kind?: "concrete" | "wood" | "stone"; color?: string } = {}) {
  used("stairs");
  const n = o.steps ?? 3, w = o.width ?? 1.1, rise = o.rise ?? SIZE.step[0], run = o.run ?? SIZE.step[1], G = new THREE.Group(); G.name = "stairs";
  const t = o.kind === "wood" ? plank(o.color ?? "#A67C52") : concreteTex(o.color ?? (o.kind === "stone" ? "#D9D3C6" : "#C4BEB2"));
  for (let i = 1; i <= n; i++) G.add(tbox(w, i * rise, run, t, 0, (i * rise) / 2, -(i - 0.5) * run, "step"));
  if (o.rails) for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.035), L = Math.hypot(n * run, n * rise), a = Math.atan2(rise, run);
    G.add(boxes(IRON, [[0.04, 0.62, 0.04, x, rise + 0.31, -run / 2], [0.04, 0.62, 0.04, x, n * rise + 0.31, -(n - 0.5) * run]], "railPost", 0.5));
    const rail = box(0.045, 0.045, L - run, IRON, x, ((n + 1) * rise) / 2 + 0.62, -(n * run) / 2, "handrail", 0.5); rail.rotation.x = a; G.add(rail);
  }
  return G;
}

// ---------------- the street ----------------
/** open ground under everything (no outline). kind: "grass" | "dirt" | "sand" | "snow" */
export function ground(o: { size?: number; kind?: keyof typeof GROUND; color?: string } = {}) {
  const t = groundTex(o.kind ?? "grass", o.color), s = o.size ?? 1600;
  const m = mesh(uvMetres(new THREE.PlaneGeometry(s, s), t.userData.m).rotateX(-Math.PI / 2), matOf(t, 0.95), 0, 0, 0, "ground"); m.castShadow = false; return noInk(m);
}
/** a road along x: asphalt, centre lines ("yellow" double line, "dash" white dashes, "none"), white edge lines */
export function road(o: { length?: number; width?: number; centre?: "yellow" | "dash" | "none"; edges?: boolean } = {}) {
  used("road");
  const L = o.length ?? 80, w = o.width ?? 6.4, G = new THREE.Group(); G.name = "road";
  G.add(flat(L, w, asphaltTex(), 1, 0, 0, "asphalt"));
  const c = o.centre ?? "yellow";
  if (c === "yellow") { G.add(paint(L, 0.09, "#E8B92E", 2, 0, -0.09, "centreLine"), paint(L, 0.09, "#E8B92E", 2, 0, 0.09, "centreLine")); }
  if (c === "dash") for (let x = -L / 2 + 1.5; x < L / 2; x += 4.5) G.add(paint(2, 0.1, "#ECE8DC", 2, x, 0, "dash"));
  if (o.edges !== false) G.add(paint(L, 0.08, "#ECE8DC", 2, 0, -w / 2 + 0.3, "edgeLine"), paint(L, 0.08, "#ECE8DC", 2, 0, w / 2 - 0.3, "edgeLine"));
  return G;
}
/** a sidewalk along x with a kerb on its +z edge (turn it 180 degrees for the other side of the road) */
export function sidewalk(o: { length?: number; width?: number; height?: number } = {}) {
  used("sidewalk");
  const L = o.length ?? 80, w = o.width ?? 1.9, h = o.height ?? 0.1, G = new THREE.Group(); G.name = "sidewalk";
  G.add(tbox(L, h, w - 0.14, concreteTex(), 0, h / 2, -0.07, "walkway"));
  G.add(box(L, h + 0.01, 0.14, "#AFA89B", 0, (h + 0.01) / 2, w / 2 - 0.07, "kerb", 0.85));
  return G;
}
/** a zebra crossing over a road of this width (stripes run along x) */
export function crosswalk(roadWidth = 6.4, width = 2.2) {
  used("crosswalk"); const G = new THREE.Group(); G.name = "crosswalk";
  for (let z = -roadWidth / 2 + 0.45; z < roadWidth / 2 - 0.2; z += 0.75) G.add(paint(width, 0.36, "#ECE8DC", 2, 0, z, "zebra"));
  return G;
}

// ---------------- street furniture (all outlined details) ----------------
export function hydrant(color = "#C7362F") {
  used("hydrant"); const G = new THREE.Group(), m = MR(color, 0.5); G.name = "hydrant";
  G.add(mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.05, 14), m, 0, 0.025, 0), mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.36, 14), m, 0, 0.23, 0), mesh(new THREE.SphereGeometry(0.085, 14, 10, 0, 6.3, 0, 1.6), m, 0, 0.41, 0), mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), m, 0, 0.5, 0));
  const cap = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 10), m, 0, 0.3, 0); cap.rotation.z = Math.PI / 2; G.add(cap);
  return G;
}
export function mailbox(color = "#3A4046") {
  used("mailbox"); const G = new THREE.Group(); G.name = "mailbox";
  G.add(box(0.06, 0.72, 0.06, "#7A5A3C", 0, 0.36, 0, "post"), box(0.17, 0.11, 0.36, color, 0, 0.775, 0, "box", 0.5));
  const top = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.36, 14, 1, false, 0, Math.PI), MR(color, 0.5), 0, 0.83, 0, "boxTop"); top.rotation.set(Math.PI / 2, Math.PI / 2, 0); G.add(top);
  G.add(box(0.012, 0.11, 0.05, "#C7362F", 0.092, 0.86, 0.09, "flag"));
  return G;
}
export function bench() {
  used("bench"); const G = new THREE.Group(); G.name = "bench";
  G.add(boxes("#8A5E3A", [[1.3, 0.035, 0.11, 0, 0.36, -0.12], [1.3, 0.035, 0.11, 0, 0.36, 0], [1.3, 0.035, 0.11, 0, 0.36, 0.12], [1.3, 0.1, 0.03, 0, 0.5, -0.2], [1.3, 0.1, 0.03, 0, 0.66, -0.22]], "slats"));
  G.add(boxes(IRON, [[0.05, 0.36, 0.05, -0.58, 0.18, 0.14], [0.05, 0.74, 0.05, -0.58, 0.37, -0.2], [0.05, 0.05, 0.4, -0.58, 0.33, -0.03], [0.05, 0.36, 0.05, 0.58, 0.18, 0.14], [0.05, 0.74, 0.05, 0.58, 0.37, -0.2], [0.05, 0.05, 0.4, 0.58, 0.33, -0.03]], "legs", 0.5));
  return G;
}
export function trashCan(color = "#3F5A4A") {
  used("trashCan"); const G = new THREE.Group(); G.name = "trashCan";
  G.add(mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.5, 16), MR(color, 0.6), 0, 0.25, 0), mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.05, 16), MR(shade(color, 0.7), 0.6), 0, 0.52, 0));
  return G;
}
/** a white picket fence along x, `length` metres, centred */
export function picketFence(length: number, color = TRIM) {
  used("picketFence"); const L = Math.max(0.6, length), list: number[][] = [[L, 0.045, 0.03, 0, 0.2, -0.02], [L, 0.045, 0.03, 0, 0.46, -0.02]];
  const n = Math.max(2, Math.round(L / 0.15)); for (let i = 0; i < n; i++) list.push([0.075, 0.6, 0.022, -L / 2 + (i + 0.5) * (L / n), 0.3, 0]);
  for (let x = -L / 2; x <= L / 2 + 0.01; x += L / Math.max(1, Math.round(L / 1.6))) list.push([0.09, 0.7, 0.09, x, 0.35, -0.02]);
  const m = boxes(color, list, "picketFence"); const G = new THREE.Group(); G.name = "fence"; G.add(m); return G;
}
/** a wooden utility pole with a cross arm. Its wire points: userData.tips (two local points) */
export function utilityPole() {
  used("utilityPole"); const G = new THREE.Group(); G.name = "utilityPole";
  G.add(mesh(new THREE.CylinderGeometry(0.06, 0.085, 5.4, 10), MR("#6E5038", 0.9), 0, 2.7, 0, "pole"), box(0.09, 0.09, 1.3, "#6E5038", 0, 4.95, 0, "arm", 0.9));
  G.add(boxes("#C9D2D6", [[0.05, 0.1, 0.05, 0, 5.04, -0.55], [0.05, 0.1, 0.05, 0, 5.04, 0.55]], "insulators", 0.4));
  G.userData.tips = [[0, 5.1, -0.55], [0, 5.1, 0.55]];
  return G;
}
/** a hanging wire between two points (thin, dark, no outline) */
export function wires(a: V3, b: V3, sag = 0.5) {
  const pts: THREE.Vector3[] = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - sag * 4 * k * (1 - k), a[2] + (b[2] - a[2]) * k)); }
  const m = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.014, 5), MR("#1F1D22", 0.6), 0, 0, 0, "wire"); m.castShadow = false; m.receiveShadow = false; return noInk(m);
}
/** a chunky parked car, 3 m long along x (front = +x). kind: "sedan" | "pickup" */
export function car(color = "#C7423A", kind: "sedan" | "pickup" = "sedan") {
  used("car"); const G = new THREE.Group(), body = MR(color, 0.35, 0.3), dark = MR("#1C1B20", 0.7); G.name = "car";
  G.add(mesh(new RoundedBoxGeometry(3.0, 0.42, 1.2, 4, 0.1), body, 0, 0.45, 0, "carBody"));
  const cx = kind === "pickup" ? 0.3 : -0.1, cl = kind === "pickup" ? 1.0 : 1.55;
  G.add(mesh(new RoundedBoxGeometry(cl, 0.4, 1.1, 4, 0.12), body, cx, 0.82, 0, "cabin"));
  const gl = mesh(new THREE.BoxGeometry(cl - 0.22, 0.24, 1.12), GLASS, cx, 0.84, 0, "carGlass"); gl.castShadow = false; G.add(gl);
  const ws = mesh(new THREE.BoxGeometry(cl + 0.01, 0.22, 0.9), GLASS, cx, 0.85, 0, "windscreen"); ws.castShadow = false; G.add(ws);
  if (kind === "pickup") G.add(boxes(color, [[1.25, 0.2, 0.05, -0.85, 0.74, 0.575], [1.25, 0.2, 0.05, -0.85, 0.74, -0.575], [0.05, 0.2, 1.15, -1.47, 0.74, 0]], "bed", 0.35));
  for (const [x, z] of [[0.95, 0.56], [0.95, -0.56], [-0.95, 0.56], [-0.95, -0.56]]) {
    const wh = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 18), dark, x, 0.24, z, "wheel"); wh.rotation.x = Math.PI / 2; G.add(wh);
    const hub = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.17, 12), MR("#C9CDD2", 0.3, 0.8), x, 0.24, z, "hub"); hub.rotation.x = Math.PI / 2; G.add(hub);
  }
  G.add(boxes("#C9CDD2", [[0.08, 0.1, 1.24, 1.5, 0.33, 0], [0.08, 0.1, 1.24, -1.5, 0.33, 0]], "bumpers", 0.3));
  G.add(boxes("#FFF3C8", [[0.03, 0.09, 0.2, 1.505, 0.5, 0.4], [0.03, 0.09, 0.2, 1.505, 0.5, -0.4]], "headlights", 0.3), boxes("#B3261E", [[0.03, 0.08, 0.2, -1.505, 0.5, 0.42], [0.03, 0.08, 0.2, -1.505, 0.5, -0.42]], "tailLights", 0.3));
  return G;
}

// ---------------- buildings ----------------
// a pitched roof whose ridge runs along x; y = 0 is the top of the walls. L = along the ridge, D = across
function gableRoof(L: number, D: number, pitch: number, roofT: THREE.Texture, wallT: THREE.Texture, trim: string) {
  const G = new THREE.Group(), over = 0.32, s = D / 2 + over, len = s / Math.cos(pitch), rise = (D / 2) * Math.tan(pitch), tp = Math.tan(pitch); G.name = "roof";
  for (const sg of [-1, 1]) { const slab = big(L + 2 * over, 0.09, len, roofT, 0, rise - (s / 2) * tp + 0.045, (sg * s) / 2, "roofSlope"); slab.rotation.x = sg * pitch; G.add(slab);
    G.add(box(L + 2 * over + 0.02, 0.13, 0.05, trim, 0, -over * tp + 0.02, sg * (s - 0.01), "fascia")); }
  const tri = new THREE.Shape(); tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, rise); tri.closePath();
  for (const sx of [-1, 1]) { const g = new THREE.ShapeGeometry(tri), uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / wallT.userData.m, uv.getY(i) / wallT.userData.m);
    const m = noInk(mesh(g, matOf(wallT), (sx * L) / 2, 0, 0, "gable")); m.rotation.y = (sx * Math.PI) / 2; G.add(m); }
  G.add(box(L + 2 * over, 0.07, 0.18, shade("#5B5F66", 0.8), 0, rise + 0.06, 0, "ridge"));
  G.userData.rise = rise; return G;
}
const HOUSE_LOOKS: { wall: Wall; color: string; roof: string; shutters: string; door: string }[] = [
  { wall: "siding", color: "#F2EDE2", roof: "#5B5F66", shutters: "#2F4B3A", door: "#8E2F2B" }, { wall: "siding", color: "#E9D9A6", roof: "#6A4B3A", shutters: "#4B5E7C", door: "#2F4466" },
  { wall: "siding", color: "#A9C4D6", roof: "#4E545C", shutters: "#F4EFE6", door: "#F4EFE6" }, { wall: "siding", color: "#B7C7A8", roof: "#6B5A48", shutters: "#4B3A2E", door: "#4B3A2E" },
  { wall: "brick", color: "#A8503E", roof: "#4A4E55", shutters: "#1F2A30", door: "#1F2A30" }, { wall: "siding", color: "#C9CBD0", roof: "#3F4349", shutters: "#7A2E2A", door: "#7A2E2A" },
];
export type HouseOpts = { w?: number; d?: number; storeys?: 1 | 2; wall?: Wall; color?: string; trim?: string; roof?: string; door?: string; shutters?: string | null;
  porch?: boolean; chimney?: boolean; gable?: "side" | "front"; seed?: number };
/** An American family house: siding or brick walls, pitched shingle roof, chimney, sash windows with shutters, a front porch
 *  with posts, rails and steps (or a small stoop). Different seed = a different house. Origin: the middle of the house on
 *  the ground; the front faces +z. userData: door [x, y, z] (local), front (how far the steps reach in +z), size [w, d, h]. */
export function house(o: HouseOpts = {}): THREE.Group {
  used("house");
  const r = R(o.seed ?? 1), look = HOUSE_LOOKS[Math.floor(r() * HOUSE_LOOKS.length)];
  const w = o.w ?? 5.6 + Math.floor(r() * 4) * 0.5, d = o.d ?? 4.6 + Math.floor(r() * 3) * 0.4, st = o.storeys ?? (r() < 0.45 ? 2 : 1);
  const kind = o.wall ?? look.wall, color = o.color ?? look.color, trim = o.trim ?? TRIM, shut = o.shutters === undefined ? look.shutters : o.shutters;
  const B = 3 * SIZE.step[0], H = st * SIZE.storey, top = B + H, frontGable = o.gable ? o.gable === "front" : r() < 0.3;
  const hasPorch = o.porch ?? r() < 0.65, hasChimney = o.chimney ?? r() < 0.75, dside = r() < 0.5 ? -1 : 1;
  const G = new THREE.Group(), wt = wallTex(kind, color), rt = shingleTex(o.roof ?? look.roof); G.name = "house";
  G.add(big(w + 0.14, B, d + 0.14, concreteTex("#B9B2A6"), 0, B / 2, 0, "foundation"), big(w, H, d, wt, 0, B + H / 2, 0, "walls"));
  const roof = frontGable ? gableRoof(d, w, 0.5, rt, wt, trim) : gableRoof(w, d, 0.5, rt, wt, trim); if (frontGable) roof.rotation.y = Math.PI / 2; roof.position.y = top; G.add(roof);
  const rise = roof.userData.rise as number;
  G.add(boxes(trim, [[0.11, H, 0.11, -w / 2, B + H / 2, d / 2], [0.11, H, 0.11, w / 2, B + H / 2, d / 2], [0.11, H, 0.11, -w / 2, B + H / 2, -d / 2], [0.11, H, 0.11, w / 2, B + H / 2, -d / 2]], "cornerBoards"));
  if (hasChimney) { const ch = rise + 0.9; G.add(tbox(0.55, ch, 0.55, wallTex("brick", "#9A4A3A"), -dside * w * 0.27, top + ch / 2 - 0.15, -d * 0.12, "chimney"), box(0.66, 0.08, 0.66, "#8C8478", -dside * w * 0.27, top + ch - 0.11, -d * 0.12, "chimneyCap")); }
  // front: door and windows
  const dx = dside * w * 0.12, dr = door({ color: o.door ?? look.door, trim }); dr.position.set(dx, B, d / 2); G.add(dr);
  const put = (x: number, y: number, face: number, sh: string | null) => { const q = win({ trim, shutters: sh });
    if (face === 0) q.position.set(x, y, d / 2); else if (face === 2) { q.position.set(x, y, -d / 2); q.rotation.y = Math.PI; } else { q.position.set((face * w) / 2, y, x); q.rotation.y = (face * Math.PI) / 2; } G.add(q); };
  for (let k = 0; k < st; k++) { const y = B + k * SIZE.storey + 1.15;
    for (const x of k === 0 ? [-w * 0.33, w * 0.33] : [-w * 0.33, dx, w * 0.33]) put(x, y, 0, shut);
    for (const f of [-1, 1]) for (const z of [-d * 0.22, d * 0.22]) put(z, y, f, null);
    for (const x of [-w * 0.25, w * 0.25]) put(x, y, 2, null); }
  // porch (deck, posts, rails, roof, steps) or a small stoop with steps
  const S = SIZE.step, pd = hasPorch ? 1.25 : 0.7, zf = d / 2 + pd;
  if (hasPorch) {
    const pw = Math.min(w, Math.max(3.2, w * 0.66)), px = Math.max(-(w - pw) / 2, Math.min((w - pw) / 2, dx)), wood = plank("#B08A62"), x0 = px - pw / 2 + 0.06, x1 = px + pw / 2 - 0.06, zp = zf - 0.07;
    G.add(tbox(pw, B, pd, wood, px, B / 2, d / 2 + pd / 2, "porchDeck"));
    const posts = [x0, dx - 0.75, dx + 0.75, x1].filter((x, i, a) => x >= x0 - 0.01 && x <= x1 + 0.01 && (i === 0 || x - a[i - 1] > 0.5));
    G.add(boxes(trim, posts.map((x) => [0.1, 1.8, 0.1, x, B + 0.9, zp]).concat([[pw + 0.1, 0.13, 0.1, px, B + 1.83, zp]]), "porchPosts"));
    const rails: number[][] = []; const bay = (a: number, b: number, z: number, alongZ = false) => { const L = Math.abs(b - a), n = Math.max(1, Math.round(L / 0.14)), mid = (a + b) / 2;
      rails.push(alongZ ? [0.045, 0.045, L, z, B + 0.56, mid] : [L, 0.045, 0.045, mid, B + 0.56, z], alongZ ? [0.045, 0.045, L, z, B + 0.1, mid] : [L, 0.045, 0.045, mid, B + 0.1, z]);
      for (let i = 0; i < n; i++) { const p = a + ((i + 0.5) * (b - a)) / n; rails.push(alongZ ? [0.028, 0.44, 0.028, z, B + 0.33, p] : [0.028, 0.44, 0.028, p, B + 0.33, z]); } };
    for (let i = 0; i < posts.length - 1; i++) if (!(posts[i] <= dx && posts[i + 1] >= dx)) bay(posts[i], posts[i + 1], zp);
    bay(d / 2, zp, x0, true); bay(d / 2, zp, x1, true); G.add(boxes(trim, rails, "porchRail"));
    const pr = tbox(pw + 0.3, 0.07, pd + 0.32, rt, px, B + 1.96, d / 2 + pd / 2 + 0.02, "porchRoof"); pr.rotation.x = 0.13; G.add(pr);
    const sts = stairs({ steps: 3, width: 1.3, kind: "wood", color: "#B08A62" }); sts.position.set(dx, 0, zf + 3 * S[1]); G.add(sts);
  } else {
    G.add(tbox(1.2, B, pd, concreteTex("#C4BEB2"), dx, B / 2, d / 2 + pd / 2, "stoop"));
    const sts = stairs({ steps: 3, width: 1.2, rails: true }); sts.position.set(dx, 0, zf + 3 * S[1]); G.add(sts);
    G.add(boxes(trim, [[1.3, 0.06, 0.7, dx, B + SIZE.door[1] + 0.32, d / 2 + 0.35]], "doorCanopy"));
  }
  G.userData.door = [dx, B, d / 2]; G.userData.front = zf + 3 * S[1]; G.userData.size = [w, d, top + rise];
  return G;
}
const SHOP_NAMES = ["DINER", "BAKERY", "HARDWARE", "BARBER", "BOOKS", "PHARMACY", "GROCERY", "CAFE", "TOYS", "TAILOR", "FLORIST", "RECORDS"];
const SHOP_BRICK = ["#A8503E", "#B86A4A", "#8C4A3A", "#C2A27C", "#7F5A4C", "#9A6A52"];
const AWNINGS: [string, string][] = [["#C7423A", "#F4EFE6"], ["#2F6B4F", "#F4EFE6"], ["#2F4B7A", "#F4EFE6"], ["#D9A441", "#F4EFE6"]];
export type ShopOpts = { w?: number; d?: number; storeys?: 1 | 2; color?: string; name?: string; awning?: [string, string] | null; seed?: number };
/** A main-street shop: brick front, a big display window, a glass door, a striped awning, a painted name sign, sash
 *  windows upstairs, a cornice. Origin: the middle on the ground; the front faces +z. userData like house(). */
export function shop(o: ShopOpts = {}): THREE.Group {
  used("shop");
  const r = R((o.seed ?? 1) + 0.37), w = o.w ?? 4.6 + Math.floor(r() * 4) * 0.4, d = o.d ?? 6, st = o.storeys ?? (r() < 0.7 ? 2 : 1);
  const color = o.color ?? SHOP_BRICK[Math.floor(r() * SHOP_BRICK.length)], name = o.name ?? SHOP_NAMES[Math.floor(r() * SHOP_NAMES.length)], aw = o.awning === undefined ? AWNINGS[Math.floor(r() * AWNINGS.length)] : o.awning;
  const H1 = 2.95, H = H1 + (st - 1) * SIZE.storey + 0.35, G = new THREE.Group(), side = r() < 0.5 ? -1 : 1, zf = d / 2, dark = shade(color, 0.45); G.name = "shop";
  G.add(big(w, H, d, wallTex("brick", color), 0, H / 2, 0, "walls"));
  const dx = side * (w / 2 - 0.72), ww = w - 1.75, wx = -side * 0.55;
  const dr = door({ glass: true, color: dark, trim: TRIM }); dr.position.set(dx, 0, zf); G.add(dr);
  const gl = mesh(new THREE.BoxGeometry(ww, 1.3, 0.04), GLASS, wx, 0.45 + 0.65, zf + 0.02, "shopGlass"); gl.castShadow = false; G.add(gl);
  G.add(boxes(TRIM, [[ww + 0.14, 0.07, 0.09, wx, 1.785, zf + 0.045], [0.07, 1.37, 0.09, wx - ww / 2 - 0.035, 1.1, zf + 0.045], [0.07, 1.37, 0.09, wx + ww / 2 + 0.035, 1.1, zf + 0.045], [0.04, 1.3, 0.06, wx, 1.1, zf + 0.04]], "shopFrame"));
  G.add(boxes(dark, [[ww + 0.14, 0.45, 0.1, wx, 0.225, zf + 0.05]], "bulkhead"));
  const board = box(w - 0.5, 0.44, 0.06, dark, 0, 2.55, zf + 0.03, "signBoard"); G.add(board);
  const sg = mesh(new THREE.PlaneGeometry(w - 0.6, 0.36), new THREE.MeshStandardMaterial({ map: signTex(name, dark), roughness: 0.7 }), 0, 2.55, zf + 0.065, "sign"); sg.castShadow = false; G.add(noInk(sg));
  if (aw) { const a = tbox(w - 0.3, 0.035, 1.05, stripeTex(aw[0], aw[1]), 0, 2.08, zf + 0.5, "awning"); a.rotation.x = 0.36; G.add(a);
    G.add(tbox(w - 0.3, 0.16, 0.025, stripeTex(aw[0], aw[1]), 0, 1.83, zf + 0.99, "awningEdge")); }
  for (let k = 1; k < st; k++) { const n = w > 5.2 ? 3 : 2; for (let i = 0; i < n; i++) { const q = win({ lintel: true }); q.position.set(-w / 2 + ((i + 0.5) * w) / n, H1 + (k - 1) * SIZE.storey + 1.15, zf); G.add(q); } }
  G.add(boxes(TRIM, [[w + 0.12, 0.16, 0.24, 0, H - 0.22, zf + 0.06], [w + 0.04, 0.08, 0.16, 0, H - 0.04, zf + 0.04]], "cornice"));
  G.userData.door = [dx, 0, zf]; G.userData.front = zf; G.userData.size = [w, d, H]; G.userData.name = name;
  return G;
}
/** An American bank: pale stone front, wide steps, four columns, a triangle on top, tall double doors, a metal name sign, a
 *  flag pole. Origin: the middle on the ground; the front faces +z. userData like house(). */
export function bank(o: { w?: number; d?: number; name?: string; color?: string } = {}): THREE.Group {
  used("bank");
  const w = o.w ?? 10, d = o.d ?? 8, H = 5.2, col = o.color ?? "#D9D3C6", st = plasterWall(col), G = new THREE.Group(), pw = Math.min(7, w - 2), py = 5 * SIZE.step[0], pd = 2.0, zf = d / 2; G.name = "bank";
  G.add(big(w, H, d, st, 0, H / 2, 0, "walls"), big(pw + 0.6, py, pd, concreteTex(col), 0, py / 2, zf + pd / 2, "platform"));
  const sts = stairs({ steps: 5, width: pw + 0.6, kind: "stone", color: col }); sts.position.set(0, 0, zf + pd + 5 * SIZE.step[1]); G.add(sts);
  const ch = 3.3, cm = MR(shade(col, 1.06), 0.7);
  for (const x of [-pw / 2 + 0.35, -pw / 6, pw / 6, pw / 2 - 0.35]) { G.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, ch, 18), cm, x, py + ch / 2, zf + pd - 0.4, "column"));
    G.add(boxes(shade(col, 1.06), [[0.62, 0.14, 0.62, x, py + 0.07, zf + pd - 0.4], [0.58, 0.14, 0.58, x, py + ch - 0.07, zf + pd - 0.4]], "columnEnds", 0.7)); }
  G.add(big(pw + 0.5, 0.6, pd, st, 0, py + ch + 0.3, zf + pd / 2, "beam"));
  const tri = new THREE.Shape(); tri.moveTo(-pw / 2 - 0.4, 0); tri.lineTo(pw / 2 + 0.4, 0); tri.lineTo(0, 1.25); tri.closePath();
  const ped = noInk(mesh(new THREE.ExtrudeGeometry(tri, { depth: pd + 0.1, bevelEnabled: false }), MR(shade(col, 0.97), 0.85), 0, py + ch + 0.6, zf - 0.05, "pediment")); G.add(ped);
  const sg = mesh(new THREE.PlaneGeometry(pw * 0.6, 0.42), new THREE.MeshStandardMaterial({ map: signTex(o.name ?? "BANK", shade(col, 0.9), "#6A5A2C"), roughness: 0.5, metalness: 0.3 }), 0, py + ch + 0.3, zf + pd + 0.012, "sign"); sg.castShadow = false; G.add(noInk(sg));
  const dr = door({ double: true, w: 1.5, h: 2.05, color: "#5A3A22", trim: shade(col, 0.8) }); dr.position.set(0, py, zf); G.add(dr);
  for (const x of [-pw * 0.3, pw * 0.3]) { const q = win({ w: 0.7, h: 1.7, trim: shade(col, 0.8), lintel: true }); q.position.set(x, py + 1.5, zf); G.add(q); }
  for (const f of [-1, 1]) for (const z of [-d * 0.25, d * 0.25]) { const q = win({ w: 0.7, h: 1.7, trim: shade(col, 0.8) }); q.position.set((f * w) / 2, py + 1.6, z); q.rotation.y = (f * Math.PI) / 2; G.add(q); }
  G.add(boxes(shade(col, 0.88), [[w + 0.16, 0.22, d + 0.16, 0, H - 0.11, 0]], "cornice", 0.85));
  G.add(mesh(new THREE.CylinderGeometry(0.035, 0.05, 5.2, 10), MR("#C9CDD2", 0.3, 0.8), w / 2 - 0.8, 2.6, zf + pd + 1.0, "flagPole"));
  const fl = mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshStandardMaterial({ map: stripeTex("#B3261E", "#F4EFE6"), roughness: 0.8, side: THREE.DoubleSide }), w / 2 - 0.18, 4.8, zf + pd + 1.0, "flag");
  (fl.material as THREE.MeshStandardMaterial).map!.rotation = Math.PI / 2; G.add(fl, box(0.5, 0.36, 0.012, "#2F4B7A", w / 2 - 0.53, 4.97, zf + pd + 1.0, "flagCorner"));
  G.userData.door = [0, py, zf]; G.userData.front = zf + pd + 5 * SIZE.step[1]; G.userData.size = [w, d, H + 1.2];
  return G;
}
function plasterWall(col: string) { return wallTex("plaster", col); }

// ---------------- whole places ----------------
export type Placed = { group: THREE.Group; doors: V3[]; walk: V3[]; length: number };
type PlaceAt = { x?: number; z?: number; yaw?: number; seed?: number; ground?: boolean | keyof typeof GROUND };
const CAR_COLORS = ["#C7423A", "#2F5F8A", "#E9E4D8", "#3F4349", "#3E7A5A", "#D9A441"];
function begin(root: THREE.Object3D, name: string, o: PlaceAt) {
  const G = new THREE.Group(); G.name = name; G.position.set(o.x ?? 0, 0, o.z ?? 0); G.rotation.y = ((o.yaw ?? 0) * Math.PI) / 180; root.add(G);
  if (o.ground !== false) G.add(ground({ kind: typeof o.ground === "string" ? o.ground : "grass" }));
  return G;
}
/** A STREET OF FAMILY HOUSES along x: road with yellow centre lines, sidewalks with kerbs, a house on every lot (all
 *  different), front paths, driveways with cars, mailboxes, picket fences, trees that fit the climate, street lamps,
 *  utility poles with wires, a hydrant. houses = per side; sides 1 = only the far side (-z);
 *  ext = how far the road runs past the houses, m (default 70). */
export function neighborhood(root: THREE.Object3D, out: Outdoor | null, o: PlaceAt & { houses?: number; lot?: number; sides?: 1 | 2; setback?: number; climate?: Climate; ext?: number } = {}): Placed {
  used("neighborhood");
  const seed = o.seed ?? 3, r = R(seed), n = o.houses ?? 4, lot = Math.max(12, o.lot ?? 13), rw = 6.4, ww = 1.9, back = o.setback ?? 4.2, L = n * lot, ext = o.ext ?? 70, lotZ = rw / 2 + ww;
  const G = begin(root, "neighborhood", o), doors: V3[] = [], walk: V3[] = [], spots: [number, number][] = [];
  G.add(road({ length: L + 2 * ext, width: rw }));
  for (const side of o.sides === 1 ? [-1] : [-1, 1]) {
    const sw = sidewalk({ length: L + 2 * ext, width: ww }); sw.position.z = side * (rw / 2 + ww / 2); if (side > 0) sw.rotation.y = Math.PI; G.add(sw);
    for (let i = 0; i < n; i++) {
      const cx = -L / 2 + lot * (i + 0.5), h = house({ seed: seed * 100 + i * 7 + (side > 0 ? 50 : 0), w: Math.min(lot - 5.8, 5.6 + Math.floor(r() * 4) * 0.5) });
      const f = h.userData.front as number, sz = h.userData.size as V3, dl = h.userData.door as V3, hz = side * (lotZ + back + f);
      h.position.set(cx, 0, hz); if (side > 0) h.rotation.y = Math.PI; G.add(h);
      const px = cx + dl[0] * (side > 0 ? -1 : 1), ds = i % 2 ? 1 : -1, ddx = cx + ds * (lot / 2 - 1.6), dlen = back + f + 1.5;
      G.add(flat(1.0, back, concreteTex(), 1, px, side * (lotZ + back / 2), "path"), flat(2.6, dlen, concreteTex("#BDB7AA"), 1, ddx, side * (lotZ + dlen / 2), "driveway"));
      doors.push(W(G, px, dl[1], hz - side * (sz[1] / 2))); walk.push(W(G, px, 0.1, side * (rw / 2 + ww / 2)));
      if (r() < 0.6) { const c = car(CAR_COLORS[Math.floor(r() * CAR_COLORS.length)], r() < 0.35 ? "pickup" : "sedan"); c.position.set(ddx, 0, side * (lotZ + back * 0.55 + 1.2)); c.rotation.y = (side * Math.PI) / 2; G.add(c); }
      const mb = mailbox(); mb.position.set(ddx - ds * 1.75, 0.1, side * (rw / 2 + 0.32)); mb.rotation.y = side > 0 ? Math.PI : 0; G.add(mb);
      if (r() < 0.45) {   // picket fence along the sidewalk, open at the path and the driveway
        const cuts = [[px - 0.75, px + 0.75], [ddx - 1.5, ddx + 1.5]].sort((a, b) => a[0] - b[0]); let a = cx - lot / 2 + 0.25; const end = cx + lot / 2 - 0.25;
        for (const [c0, c1] of [...cuts, [end, end]]) { if (c0 - a > 0.8) { const fn = picketFence(c0 - a); fn.position.set((a + c0) / 2, 0, side * (lotZ + 0.2)); if (side > 0) fn.rotation.y = Math.PI; G.add(fn); } a = Math.max(a, c1); }
      }
      spots.push([cx - ds * lot * 0.3, side * (lotZ + back * 0.5)], [cx + (r() - 0.5) * 6, side * (lotZ + back + f + sz[1] + 3 + 4 * r())]);
      if (r() < 0.5) spots.push([cx + ds * (lot * 0.1), side * (lotZ + back + f + sz[1] + 8 + 5 * r())]);
    }
  }
  scatterTrees(G, o.climate ?? "temperate", spots, seed + 11);
  if (out) for (let k = 0, x = -L / 2 + 4; x <= L / 2; x += 14, k++) { const p = W(G, x, 0, (k % 2 ? 1 : -1) * (rw / 2 + 0.45)); out.lamp(p[0], p[2], { real: k < 6, groundY: 0.1 }); }
  let prev: THREE.Group | null = null;
  for (let x = -L / 2 - lot; x <= L / 2 + lot + 0.1; x += lot * 2) { const p = utilityPole(); p.position.set(x + 0.9, 0.1, -(lotZ - 0.3)); G.add(p);
    if (prev) for (const t of p.userData.tips as V3[]) G.add(wires([prev.position.x, t[1] + 0.1, prev.position.z + t[2]], [p.position.x, t[1] + 0.1, p.position.z + t[2]], 0.55));
    prev = p; }
  const hy = hydrant(); hy.position.set(L * 0.12, 0.1, rw / 2 + 0.45); G.add(hy);
  return { group: G, doors, walk, length: L };
}
/** A SMALL-TOWN MAIN STREET along x: brick shops wall to wall on both sides (awnings, signs, big windows), a bank in the
 *  middle of the far side, wide sidewalks, lamps, benches, trash cans, parked cars, crosswalks, a few street trees.
 *  ext = how far the road runs past the shops, m (default 60). */
export function mainStreet(root: THREE.Object3D, out: Outdoor | null, o: PlaceAt & { shops?: number; bank?: boolean; climate?: Climate; names?: string[]; ext?: number } = {}): Placed {
  used("mainStreet");
  const seed = o.seed ?? 5, r = R(seed), n = o.shops ?? 5, rw = 7.4, ww = 2.4, lotZ = rw / 2 + ww, ext = o.ext ?? 60;
  const G = begin(root, "mainStreet", o), doors: V3[] = [], walk: V3[] = [], spots: [number, number][] = [], names = [...(o.names ?? SHOP_NAMES)];
  let L = 0;
  for (const side of [-1, 1]) {
    const row: THREE.Group[] = [];
    for (let i = 0; i < n; i++) row.push(side < 0 && o.bank !== false && i === Math.floor(n / 2) ? bank() : shop({ seed: seed * 10 + i + (side > 0 ? 40 : 0), name: names.length ? names.splice(Math.floor(r() * names.length), 1)[0] : undefined }));
    const total = row.reduce((a, b) => a + (b.userData.size as V3)[0], 0); L = Math.max(L, total); let x = -total / 2;
    for (const b of row) { const sz = b.userData.size as V3, dl = b.userData.door as V3, cx = x + sz[0] / 2, bz = side * (lotZ + sz[1] / 2 + (b.name === "bank" ? 3.4 : 0));
      b.position.set(cx, 0, bz); if (side > 0) b.rotation.y = Math.PI; G.add(b); x += sz[0];
      const px = cx + dl[0] * (side > 0 ? -1 : 1); doors.push(W(G, px, dl[1], bz - side * (sz[1] / 2))); walk.push(W(G, px, 0.1, side * (rw / 2 + ww * 0.55)));
      if (b.name === "bank") G.add(flat(sz[0], 3.4, concreteTex(), 1, cx, side * (lotZ + 1.7), "bankPlaza")); }
  }
  G.add(road({ length: L + 2 * ext, width: rw }));
  for (const side of [-1, 1]) { const sw = sidewalk({ length: L + 2 * ext, width: ww }); sw.position.z = side * (rw / 2 + ww / 2); if (side > 0) sw.rotation.y = Math.PI; G.add(sw);
    for (let x = -L / 2 + 2.2, k = 0; x < L / 2 - 2; x += 6.2, k++) {   // parked cars along the kerb, some gaps
      if (r() < 0.55) { const c = car(CAR_COLORS[Math.floor(r() * CAR_COLORS.length)], r() < 0.3 ? "pickup" : "sedan"); c.position.set(x, 0, side * (rw / 2 - 0.85)); if (side < 0) c.rotation.y = Math.PI; G.add(c); }
      if (k % 3 === 1) { const bn = bench(); bn.position.set(x + 2.6, 0.1, side * (lotZ - 0.5)); bn.rotation.y = side > 0 ? Math.PI : 0; G.add(bn); const tc = trashCan(); tc.position.set(x + 3.7, 0.1, side * (lotZ - 0.45)); G.add(tc); }
      if (k % 3 === 2) spots.push([x + 3.1, side * (rw / 2 + 0.55)]);
    }
  }
  for (const x of [-L / 2 - 2.2, L / 2 + 2.2]) { const cw = crosswalk(rw); cw.position.x = x; G.add(cw); }
  const trees = scatterTrees(G, o.climate ?? "temperate", spots, seed + 3, 0.1); for (const t of trees) t.scale.setScalar(0.8);
  if (out) for (let k = 0, x = -L / 2 + 3; x <= L / 2; x += 10, k++) { const p = W(G, x, 0, (k % 2 ? 1 : -1) * (rw / 2 + 0.45)); out.lamp(p[0], p[2], { real: k < 6, groundY: 0.1 }); }
  const hy = hydrant(); hy.position.set(-L * 0.2, 0.1, rw / 2 + 0.45); G.add(hy);
  return { group: G, doors, walk, length: L };
}
/** what the video took from the library (render.mjs prints it) */
export const placesUsed = () => ({ ...USED });

// LOG (newest first): one line per builder added or changed.
// 2026-11-16  File created: neighborhood, mainStreet, house, shop, bank, road, sidewalk, crosswalk, ground, flat, stairs, door, win,
//             picketFence, mailbox, hydrant, bench, trashCan, utilityPole, wires, car. ("it took me 8 hours": never from scratch again.)

// LOG (newest first). One line per change: date, what.
// 2026-11-16  ext option on neighborhood and mainStreet: how far the road runs past the buildings, m
//             (defaults 70 / 60, exactly as before -> old videos unchanged). For the town map corner (src/map/town.ts).
//             Copy of the file before this: src/videos/_old/places-before-ext.ts

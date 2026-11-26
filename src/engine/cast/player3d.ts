// player3d.ts - THE 3D LOOK (2026-11-11): a REAL 3D body with a 2D drawn head, like the reference channel.
//
//   body   a 3D bean (the shape of the library torso pictures) wearing a 3D outfit from library/wardrobe3d/<outfit>/
//          (front.png round the front half, back.png round the back half). It takes the real scene light and casts
//          real shadows, and it TURNS like a real object (never squeezed: from the side you see a narrower bean, from
//          behind you see the back of the clothes). A thin dark-brown outline round its edge.
//   head   the character's own 2D head picture, always turned flat to the camera (never squeezed, never tilted back).
//          The drawn face slides toward the side the body faces; from behind you see the back of the head.
//   arms / legs   thin dark ink strokes (as before) from the 3D shoulders and hips; dot hands.
//   mouth  talking opens a real mouth: dark red inside, top teeth, tongue (face.ts mouthInside).
//
// Same use as Player (cast/player.ts): new Player3D(parent, cast, who, floorPoint, facing, seated, opts); every frame set
// hand.L / hand.R, optionally setPos / setFacing / setLook / setWalk / sit / lean / squash, then update(t, cam, night, order).
// The old Player is untouched: old videos (chess2, bank, bank2) draw exactly as before.
import * as THREE from "three";
import { litCard, ZONE_HEAD, ZONE_FACE } from "./cardlight";
import { NOINK } from "../post/ink";
import { V3, smooth } from "../core/util";
import { INK_BROWN, mkCanvas } from "../kit";
import { Face, FACE_LIST, Life, makeLife } from "./life";
import { drawFace, faceAt, autoBlinks, DEFAULT_RIG, FaceKey, FaceRig } from "./face";
import { clean1x, makeLayer, headWidth, headBottom, makeBlank, measureHead, setSkinSet, FACE_BOX, FACE_PX, PXM, HIP, HAND_R, Hand, LegStyle, STAND_HIP } from "./player";
import { file, loadImages, Imgs } from "./assets";

const CW = 600, CH = 1000, NECK = 460;
const tex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; return t;
};

// ======================================================================================================================
// loading: which character wears what
// ======================================================================================================================
// one entry per character: outfit = library/wardrobe3d/<outfit>; hat = library/hats/<hat>; skin = face colour [r,g,b]
// when it is not the default cream (dark or tan skin); rig = face layout / colours (face.json overrides);
// pictureFaces = use the 4 drawn head pictures (neutral/smug/shock/grin) instead of the morphing drawn face (for heads
// with sunglasses or a beard over the mouth: no talking mouth then).
// base = use another library character's head (e.g. "general": { base: "max", outfit: "army", hat: "officer" }), so one
// person can appear in two outfits or hats in the same video under two names
export type Cast3DSpec = Record<string, { outfit: string; hat?: string; base?: string; skin?: [number, number, number]; rig?: Partial<FaceRig>; pictureFaces?: boolean }>;
export type Body3DInfo = { top: number; bottom: number; halfWidth: number[]; depth: number; box: [number, number, number, number]; scale: number };
export type Cast3DAssets = { imgs: Imgs; bodies: Record<string, Body3DInfo>; faces: Record<string, any>; spec: Cast3DSpec };

const FACES = ["neutral", "smug", "shock", "grin"];
const tryImage = (p: string) => new Promise<HTMLImageElement | null>((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = file(p); });
const tryJson = (p: string) => fetch(file(p)).then((r) => (r.ok ? r.json() : null)).catch(() => null);

/** Load everything the 3D cast needs from public/library (filled by tools/pick-assets.mjs with "look": "3d").
 *  extra: your own pictures, e.g. { sign: "myvideo/sign.png" } -> assets.imgs.sign */
export async function loadCast3d(spec: Cast3DSpec, extra: Record<string, string> = {}): Promise<Cast3DAssets> {
  const need: Record<string, string> = { ...extra };
  for (const [ch, s] of Object.entries(spec)) {
    const src = s.base ?? ch;                                       // the library character whose pictures this person uses
    for (const f of FACES) need[`${ch}_${f}`] = `library/cast/${src}/faces/${f}.png`;
    need[`${ch}_back`] = `library/cast/${src}/back.png`;
    need[`${s.outfit}__front3d`] = `library/wardrobe3d/${s.outfit}/front.png`;
    need[`${s.outfit}__back3d`] = `library/wardrobe3d/${s.outfit}/back.png`;
    if (s.hat) for (const v of ["front", "back", "mask"]) need[`${ch}_hat_${v}`] = `library/hats/${s.hat}/hat_${src}_${v}.png`;
  }
  const imgs = await loadImages(need);
  const bodies: Record<string, Body3DInfo> = {}, faces: Record<string, any> = {};
  for (const [ch, s] of Object.entries(spec)) {
    const src = s.base ?? ch;
    if (!s.hat) for (const v of ["front", "back"]) {                 // an outfit's own hat (police, fisherman), if the library has one for him
      const h = await tryImage(`library/wardrobe3d/${s.outfit}/hat_${src}_${v}.png`); if (h) imgs[`${ch}_hat_${v}`] = h;
    }
    const blank = await tryImage(`library/cast/${src}/faces/blank.png`);
    if (blank) imgs[`${ch}_blank`] = blank;
    faces[ch] = await tryJson(`library/cast/${src}/face.json`);
    if (!bodies[s.outfit]) {
      const b = await tryJson(`library/wardrobe3d/${s.outfit}/body.json`);
      if (!b) throw new Error(`missing file: public/library/wardrobe3d/${s.outfit}/body.json (run: node tools\\pick-assets.mjs <cast-sheet>.json with "look": "3d")`);
      bodies[s.outfit] = b;
    }
  }
  return { imgs, bodies, faces, spec };
}

// ======================================================================================================================
// building: the head pictures (as before) + the 3D outfit
// ======================================================================================================================
export type Cast3D = {
  who: string;
  heads: Record<Face, THREE.Texture>; headBack: THREE.Texture; hatF?: THREE.Texture; hatB?: THREE.Texture;
  blank?: THREE.Texture; face?: { head: { cx: number; cy: number; r: number }; rig: FaceRig; top?: HTMLCanvasElement };
  W: number; chin: number;                              // head width and the lowest head row (pixels in the 600x1000 pictures)
  body: { info: Body3DInfo; front: THREE.Texture; back: THREE.Texture };
};
const cache = new Map<string, Cast3D>();
const bodyTex = new Map<string, THREE.Texture>();
const btex = (im: HTMLImageElement, key: string) => {
  let t = bodyTex.get(key);
  if (!t) { t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; bodyTex.set(key, t); }
  return t;
};

export function buildCast3d(A: Cast3DAssets, who: string): Cast3D {
  const hit = cache.get(who); if (hit) return hit;
  const s = A.spec[who], imgs = A.imgs;
  const heads1 = Object.fromEntries(FACE_LIST.map((f) => [f, clean1x(imgs[`${who}_${f}`])])) as Record<Face, HTMLCanvasElement>;
  const W = headWidth(heads1.neutral), thin = 0.012 * W, thick = 0.065 * W;
  let hatErase: Uint8Array | undefined;
  if (imgs[`${who}_hat_mask`]) {
    const mc = mkCanvas(CW, CH), gm = mc.getContext("2d", { willReadFrequently: true })!; gm.drawImage(imgs[`${who}_hat_mask`], 0, 0, CW, CH);
    const md = gm.getImageData(0, 0, CW, CH).data; hatErase = new Uint8Array(CW * CH);
    for (let i = 0; i < CW * CH; i++) hatErase[i] = md[i * 4 + 3] > 128 ? 1 : 0;
  }
  const layer = (c: HTMLCanvasElement, th = thick) => tex(makeLayer(c, { thin, thick: th, erase: hatErase }));
  const out: Cast3D = {
    who, W, chin: headBottom(heads1.neutral),
    heads: Object.fromEntries(FACE_LIST.map((f) => [f, layer(heads1[f])])) as Record<Face, THREE.Texture>,
    headBack: layer(clean1x(imgs[`${who}_back`])),
    // the hat itself is never erased by its own mask (the mask only takes the hair above the brim off the head)
    hatF: imgs[`${who}_hat_front`] ? tex(makeLayer(clean1x(imgs[`${who}_hat_front`]), { thin, thick: 0.045 * W })) : undefined,
    hatB: imgs[`${who}_hat_back`] ? tex(makeLayer(clean1x(imgs[`${who}_hat_back`]), { thin, thick: 0.045 * W })) : undefined,
    body: { info: A.bodies[s.outfit], front: btex(imgs[`${s.outfit}__front3d`], s.outfit + "_f"), back: btex(imgs[`${s.outfit}__back3d`], s.outfit + "_b") },
  };
  if (!s.pictureFaces) {
    // drawn morphing face: the blank head (library faces/blank.png, or made here from the neutral head)
    const fj = A.faces[who] ?? {};
    const skin = s.skin ?? (fj.skin ? hexRgb(fj.skin) : null);
    setSkinSet(skin);
    const auto = makeBlank(heads1.neutral);
    const b1 = imgs[`${who}_blank`] ? clean1x(imgs[`${who}_blank`]) : auto.canvas;
    out.blank = layer(b1);
    const head = fj.head ?? measureHead(b1);
    let top: HTMLCanvasElement | undefined;
    if (auto.top && !imgs[`${who}_blank`]) {
      const side = FACE_BOX * head.r; top = mkCanvas(FACE_PX, FACE_PX);
      top.getContext("2d")!.drawImage(auto.top, head.cx - side / 2, head.cy - side / 2, side, side, 0, 0, FACE_PX, FACE_PX);
    }
    out.face = { head, rig: { ...DEFAULT_RIG, mouthInk: "#56202A", ...auto.rig, ...(fj.rig ?? {}), ...(fj.skin ? { skin: fj.skin } : {}), ...(s.rig ?? {}) }, top };
    setSkinSet(null);
  }
  cache.set(who, out);
  return out;
}
const hexRgb = (h: string): [number, number, number] => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// ======================================================================================================================
// the 3D body (bean) from the outfit's body.json
// ======================================================================================================================
// local space: origin = the hips (picture row HIP), +y up, the person looks toward +z, the person's RIGHT is -x.
const TH = 40, OUTLINE = 0.0085;                        // segments round each half, outline thickness (m)
const bodyGeo = new Map<string, { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry; hw: (row: number) => number }>();
function makeBody(info: Body3DInfo) {
  const key = JSON.stringify([info.top, info.bottom, info.depth, info.halfWidth.length]);
  const hit = bodyGeo.get(key); if (hit) return hit;
  const { top, bottom, halfWidth: HWs, depth, box } = info;
  const hw = (row: number) => {                         // half width (px) at a picture row, smooth between rows
    const r = Math.min(bottom, Math.max(top, row)) - top, i = Math.floor(r), f = r - i;
    const a = HWs[Math.min(HWs.length - 1, i)], b = HWs[Math.min(HWs.length - 1, i + 1)];
    return a + (b - a) * f;
  };
  // rows: a dome over the top (hidden under the head), the sides, then a round bottom
  const rows: { row: number; k: number }[] = [];
  rows.push({ row: top - 14, k: 0 }, { row: top - 11, k: 0.5 }, { row: top - 6, k: 0.85 }, { row: top - 2, k: 0.97 });
  const N = 44;
  for (let i = 0; i <= N; i++) rows.push({ row: top + ((bottom - top) * i) / N, k: 1 });
  rows.push({ row: bottom + 1.5, k: 0 });                // close the round bottom
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [], hpos: number[] = [];
  const [bx0, by0, bx1, by1] = box, Wt = bx1 - bx0, Ht = by1 - by0;
  const yOf = (row: number) => (HIP - row) * PXM;
  const aOf = (r: { row: number; k: number }) => hw(r.row) * r.k * PXM;
  const groups: [number, number][] = [];
  for (const half of [0, 1]) {                          // 0 = front (+z), 1 = back (-z)
    const base = pos.length / 3, i0 = idx.length;
    rows.forEach((r, ri) => {
      const a = aOf(r), b = a * depth, y = yOf(r.row);
      const rp = rows[Math.max(0, ri - 1)], rn = rows[Math.min(rows.length - 1, ri + 1)];
      const dy = yOf(rn.row) - yOf(rp.row) || -1e-4;
      const da = (aOf(rn) - aOf(rp)) / dy, db = da * depth;     // derivative along +y
      for (let j = 0; j <= TH; j++) {
        const th = (j / TH) * Math.PI + half * Math.PI, c = Math.cos(th), s = Math.sin(th);
        const x = a * c, z = b * s;
        pos.push(x, y, z);
        // analytic normal of the elliptic bean: (b cos, -(a' b cos^2 + a b' sin^2), a sin)
        let nx = b * c, ny = -(da * b * c * c + a * db * s * s), nz = a * s;
        const l = Math.hypot(nx, ny, nz);
        if (l < 1e-7) { nx = 0; ny = r.row < top ? 1 : -1; nz = 0; } else { nx /= l; ny /= l; nz /= l; }
        if (r.k === 0) { nx = 0; ny = r.row < top ? 1 : -1; nz = 0; }
        nrm.push(nx, ny, nz);
        hpos.push(x + nx * OUTLINE, y + ny * OUTLINE, z + nz * OUTLINE);
        // texture: mostly a straight projection from the front (or back), a little wrapped round the sides
        const tt = half ? th - Math.PI : th;                       // 0..pi across the half
        const xpic = hw(r.row) * r.k * (0.62 * Math.cos(tt) + 0.38 * (1 - (2 * tt) / Math.PI));
        // front: the viewer's right is +x = picture right. Back: the back picture is drawn as seen from behind, and from
        // behind the viewer's right is -x; both come out as picture x = 300 + xpic
        const u = (300 + xpic - bx0) / Wt;
        const v = 1 - (Math.min(bottom + 2, Math.max(top + 1, r.row)) - by0) / Ht;
        uv.push(u, v);
      }
    });
    const cols = TH + 1;
    for (let ri = 0; ri < rows.length - 1; ri++) for (let j = 0; j < TH; j++) {
      const a = base + ri * cols + j, b = a + 1, c = a + cols, d = c + 1;
      if (half === 0) idx.push(a, c, b, b, c, d); else idx.push(a, c, b, b, c, d);
    }
    groups.push([i0, idx.length - i0]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  groups.forEach(([s, c], m) => geo.addGroup(s, c, m));
  fixWinding(geo);
  const hull = new THREE.BufferGeometry();
  hull.setAttribute("position", new THREE.Float32BufferAttribute(hpos, 3)); hull.setIndex(geo.getIndex()!.clone());
  geo.computeBoundingSphere(); hull.computeBoundingSphere();
  const o = { geo, hull, hw };
  bodyGeo.set(key, o);
  return o;
}
// make every triangle face outward (its winding agrees with the analytic normal)
function fixWinding(g: THREE.BufferGeometry) {
  const p = g.getAttribute("position"), n = g.getAttribute("normal"), I = g.getIndex()!.array as unknown as number[];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3(), F = new THREE.Vector3();
  for (let i = 0; i < I.length; i += 3) {
    A.fromBufferAttribute(p, I[i]); B.fromBufferAttribute(p, I[i + 1]); C.fromBufferAttribute(p, I[i + 2]);
    F.subVectors(B, A).cross(C.clone().sub(A));
    N.fromBufferAttribute(n, I[i]).add(C.fromBufferAttribute(n, I[i + 1])).add(C.fromBufferAttribute(n, I[i + 2]));
    if (F.dot(N) < 0) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; }
  }
  g.getIndex()!.needsUpdate = true;
}

// ======================================================================================================================
// the person
// ======================================================================================================================
const headGeo = new THREE.PlaneGeometry(CW * PXM, CH * PXM);
const ARM_HW = 0.0085, HAND_DISC = 0.03, ARM_SEG = 14;
// legs are flat strokes facing the camera, so they cast no real shadow: each leg also gets two thin rods that ONLY cast a shadow (2026-11-16)
const SHADOW_ONLY = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
const ROD = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 8); g.translate(0, 0.5, 0); return g; })();
const LEG_SEG = 16, LEG_HW = 0.011, FOOT_HW = 0.0125, HIP_DX = 0.062, FOOT_DX = 0.075, FOOT_LEN = 0.06;
const HEAD_PUSH = 0.13;                                  // the head is drawn this much toward the camera, so it is always in front of its own body
const handGeo = new THREE.CircleGeometry(HAND_DISC, 28), capGeo = new THREE.CircleGeometry(ARM_HW, 14), footCap = new THREE.CircleGeometry(1, 16);
const INK = new THREE.Color(INK_BROWN);
const ribbonGeo = (seg = ARM_SEG) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((seg + 1) * 6), 3));
  const idx: number[] = [];
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx); return g;
};
let dropTex: THREE.Texture | null = null;
const sweatTex = () => {
  if (dropTex) return dropTex;
  const c = mkCanvas(80, 112), g = c.getContext("2d")!;
  g.beginPath(); g.moveTo(40, 6); g.bezierCurveTo(52, 34, 72, 56, 70, 76); g.bezierCurveTo(68, 98, 52, 106, 40, 106); g.bezierCurveTo(28, 106, 12, 98, 10, 76); g.bezierCurveTo(8, 56, 28, 34, 40, 6); g.closePath();
  g.fillStyle = "#6EC6F2"; g.fill(); g.lineWidth = 6; g.strokeStyle = "#2A1A1E"; g.lineJoin = "round"; g.stroke();
  g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.ellipse(30, 74, 6, 12, 0.3, 0, 7); g.fill();
  dropTex = tex(c); return dropTex;
};
const dropGeo = new THREE.PlaneGeometry(40 * PXM, 56 * PXM);
const DROPS: [number, number, number][] = [[478, 255, 0], [505, 330, 0.33], [112, 300, 0.66]];
type LegMesh = { ink: THREE.Mesh; foot: THREE.Mesh; capA: THREE.Mesh; capB: THREE.Mesh; pants?: THREE.Mesh; boxer?: THREE.Mesh; boxerInk?: THREE.Mesh };
let heartTex: THREE.Texture | null = null;
const boxerTex = () => {
  if (heartTex) return heartTex;
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#E8283C";
  const heart = (x: number, y: number, s: number) => { g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.5, y - s * 0.2, x - s * 0.6, y - s * 1.1, x, y - s * 0.3); g.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.5, y - s * 0.2, x, y + s * 0.9); g.fill(); };
  for (const [x, y] of [[24, 30], [88, 20], [56, 70], [112, 84], [20, 104], [84, 118]]) heart(x, y, 13);
  heartTex = tex(c); heartTex.wrapS = heartTex.wrapT = THREE.RepeatWrapping; return heartTex;
};

export type Player3DOpts = {
  life?: Life; seed?: number;
  legs?: LegStyle;                      // trousers / shoes / boxer shorts (legs are always there)
  face?: FaceKey[];                     // drawn face track [{ t, e: "smile", look? }, ...] (default: neutral all the time)
  blinks?: number[] | "auto";           // default "auto"
  talk?: (t: number) => number;         // mouth shape 0..5 while speaking, -1 otherwise
  lit?: boolean;                        // the head takes the scene light colour (cardlight.ts); default true
};

export class Player3D {
  hand: Record<Hand, V3> = { L: [0, 0, 0], R: [0, 0, 0] };
  R: V3 = [-1, 0, 0];                   // the character's right, world
  facing: 1 | -1;
  sit: number; seatY = 0.19; pantsDrop = 0; squash = 1; lean = 0;
  readonly life: Life; readonly seated: boolean;
  /** the 3D body (add your own things to it: they move and turn with the person) */
  readonly body = new THREE.Group();
  private bodyMesh: THREE.Mesh; private hullMesh: THREE.Mesh; private hw: (row: number) => number;
  private headG = new THREE.Group(); private head: THREE.Mesh; private hat: THREE.Mesh; private faceMesh?: THREE.Mesh;
  private headMat: THREE.MeshBasicMaterial; private hatMat: THREE.MeshBasicMaterial; private faceMat?: THREE.MeshBasicMaterial;
  private faceCanvas?: HTMLCanvasElement; private faceTex?: THREE.CanvasTexture;
  private faceTrack: FaceKey[]; private blinks: number[]; private blink4: boolean;
  private talk?: (t: number) => number;
  private drops: THREE.Mesh[] = []; private dropMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  private armMat = new THREE.MeshBasicMaterial({ color: INK_BROWN, side: THREE.DoubleSide });
  private arms: Record<Hand, { tube: THREE.Mesh; dot: THREE.Mesh; cap: THREE.Mesh }>;
  private legShadow: THREE.Mesh[] = [];
  private legs: LegMesh[] = []; private pile?: THREE.Mesh; private legStyle: LegStyle; private pantsMat?: THREE.MeshBasicMaterial; private shoeMat: THREE.MeshBasicMaterial;
  private pivot: THREE.Vector3; private seed: number;
  private walkPhase = 0; private walkK = 0; private walkDir = new THREE.Vector3(0, 0, 1);
  private lookOver: THREE.Vector3 | null = null; private look = new THREE.Vector3(0, 0, 1);
  private camPos = new THREE.Vector3(); private hidden = false;

  constructor(parent: THREE.Object3D, private cast: Cast3D, readonly who: string, floor: V3, facing: 1 | -1, seated: boolean, opts: Player3DOpts = {}) {
    this.life = opts.life ?? makeLife([]); this.seated = seated; this.sit = seated ? 1 : 0; this.facing = facing;
    this.pivot = new THREE.Vector3(...floor); this.seed = opts.seed ?? 0.4; this.talk = opts.talk; this.legStyle = opts.legs ?? {};
    this.faceTrack = [...(opts.face ?? [{ t: 0, e: "neutral" }])].sort((a, b) => a.t - b.t);
    this.blink4 = opts.blinks === "auto" || opts.blinks === undefined;
    this.blinks = this.blink4 ? autoBlinks(this.faceTrack, this.seed) : (opts.blinks as number[]);
    // ---- 3D body ----
    const B = makeBody(cast.body.info); this.hw = B.hw;
    const mk = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 0.82, metalness: 0 });
    this.bodyMesh = new THREE.Mesh(B.geo, [mk(cast.body.front), mk(cast.body.back)]);
    this.bodyMesh.castShadow = this.bodyMesh.receiveShadow = true;
    this.hullMesh = new THREE.Mesh(B.hull, new THREE.MeshBasicMaterial({ color: INK_BROWN, side: THREE.BackSide }));
    for (const m of [this.bodyMesh, this.hullMesh]) { m.layers.set(NOINK); m.frustumCulled = false; this.body.add(m); }
    parent.add(this.body);
    // ---- 2D head (camera-facing) ----
    const lit = opts.lit ?? true;
    this.headMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, side: THREE.DoubleSide });
    this.hatMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, side: THREE.DoubleSide });
    this.head = new THREE.Mesh(headGeo, this.headMat); this.hat = new THREE.Mesh(headGeo, this.hatMat);
    const cy = (NECK - CH / 2) * PXM;                     // card centre (row 500) sits this far below the neck point
    this.head.position.set(0, cy, 0); this.hat.position.set(0, cy, 0.004);
    for (const m of [this.head, this.hat]) { m.frustumCulled = false; m.layers.set(NOINK); this.headG.add(m); }
    this.head.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
    this.head.castShadow = true;
    if (cast.face && cast.blank) {
      const h = cast.face.head, side = FACE_BOX * h.r * PXM;
      this.faceCanvas = mkCanvas(FACE_PX, FACE_PX);
      this.faceTex = new THREE.CanvasTexture(this.faceCanvas); this.faceTex.colorSpace = THREE.SRGBColorSpace; this.faceTex.anisotropy = 8;
      this.faceMat = new THREE.MeshBasicMaterial({ map: this.faceTex, transparent: true, alphaTest: 0.02, depthWrite: false, side: THREE.DoubleSide });
      this.faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(side, side), this.faceMat);
      this.faceMesh.position.set((h.cx - CW / 2) * PXM, (CH / 2 - h.cy) * PXM, 0.0012); this.faceMesh.frustumCulled = false;
      this.faceMesh.layers.set(NOINK); this.head.add(this.faceMesh);
    }
    this.dropMat.map = sweatTex();
    for (let k = 0; k < DROPS.length; k++) { const m = new THREE.Mesh(dropGeo, this.dropMat); m.frustumCulled = false; m.layers.set(NOINK); m.visible = false; this.headG.add(m); this.drops.push(m); }
    parent.add(this.headG);
    if (lit) { litCard(this.headMat, ZONE_HEAD); litCard(this.hatMat, ZONE_HEAD); if (this.faceMat) litCard(this.faceMat, ZONE_FACE); }
    // ---- arms and legs: ink strokes ----
    const flat = (m: THREE.Mesh) => { m.frustumCulled = false; m.layers.set(NOINK); parent.add(m); return m; };
    const arm = () => ({ tube: flat(new THREE.Mesh(ribbonGeo(), this.armMat)), dot: flat(new THREE.Mesh(handGeo, this.armMat)), cap: flat(new THREE.Mesh(capGeo, this.armMat)) });
    this.arms = { L: arm(), R: arm() };
    const st = this.legStyle;
    if (st.pants) this.pantsMat = new THREE.MeshBasicMaterial({ color: st.pants, side: THREE.DoubleSide });
    this.shoeMat = st.shoes ? new THREE.MeshBasicMaterial({ color: st.shoes, side: THREE.DoubleSide }) : this.armMat;
    for (let k = 0; k < 2; k++) {
      const L: LegMesh = { ink: flat(new THREE.Mesh(ribbonGeo(LEG_SEG), this.armMat)), foot: flat(new THREE.Mesh(ribbonGeo(1), this.shoeMat)),
        capA: flat(new THREE.Mesh(footCap, this.shoeMat)), capB: flat(new THREE.Mesh(footCap, this.shoeMat)) };
      if (st.pants) L.pants = flat(new THREE.Mesh(ribbonGeo(LEG_SEG), this.pantsMat!));
      if (st.boxers) { L.boxerInk = flat(new THREE.Mesh(ribbonGeo(LEG_SEG), this.armMat)); L.boxer = flat(new THREE.Mesh(ribbonGeo(LEG_SEG), new THREE.MeshBasicMaterial({ map: boxerTex(), side: THREE.DoubleSide }))); }
      this.legs.push(L);
      for (let r = 0; r < 2; r++) { const m = new THREE.Mesh(ROD, SHADOW_ONLY); m.castShadow = true; m.frustumCulled = false; m.layers.set(NOINK); m.name = who + " leg shadow"; parent.add(m); this.legShadow.push(m); }
    }
    if (st.pants) { this.pile = flat(new THREE.Mesh(ribbonGeo(6), this.pantsMat!)); this.pile.visible = false; }
    if (lit) for (const m of new Set([this.armMat, this.shoeMat, ...(this.pantsMat ? [this.pantsMat] : [])])) litCard(m, null);
  }

  // ---------------- where the person is and where he looks ----------------
  setPos(x: number, y: number, z: number) { this.pivot.set(x, y, z); }        // the floor point under the person
  get pos(): V3 { return [this.pivot.x, this.pivot.y, this.pivot.z]; }
  setFacing(f: 1 | -1) { this.facing = f; this.lookOver = null; }
  /** look (and turn the whole body) toward any direction on the floor: setLook(dx, dz). Animate it to make him turn round. */
  private eyeTarget: V3 | null = null; private eyeK = 1;
  /** only the EYES look at a point in the world (another person's head): lookEyes([x, y, z], strength 0..1). lookEyes(null) = back to the face track. */
  lookEyes(p: V3 | null, k = 1) { this.eyeTarget = p; this.eyeK = k; }
  /** the point other people look at when they look at this person (about eye height) */
  get eyePoint(): V3 { return [this.pivot.x, this.pivot.y + 0.86, this.pivot.z]; }
  setLook(dx: number, dz: number) { const l = Math.hypot(dx, dz) || 1; this.lookOver = new THREE.Vector3(dx / l, 0, dz / l); }
  /** turn toward a point on the floor */
  lookAtPoint(x: number, z: number) { this.setLook(x - this.pivot.x, z - this.pivot.z); }
  // phase: 2 pi per two steps (distance * pi / 0.42); k: 0 standing .. 1 walking; dx, dz: the way he walks
  setWalk(phase: number, k: number, dx = 0, dz = 1) { this.walkPhase = phase; this.walkK = k; const l = Math.hypot(dx, dz) || 1; this.walkDir.set(dx / l, 0, dz / l); }
  aimAt(_x: number, _y: number, _z: number) { /* not needed: a 3D body is never squeezed */ }
  lookDir() {
    const base = this.lookOver ?? new THREE.Vector3(0, 0, this.facing);
    const w = smooth(0.15, 0.6, this.walkK);
    this.look.set(base.x * (1 - w) + this.walkDir.x * w, 0, base.z * (1 - w) + this.walkDir.z * w);
    if (this.look.lengthSq() < 1e-6) this.look.copy(base);
    return this.look.normalize();
  }
  get hipY() { return this.pivot.y + (STAND_HIP + (this.seatY - STAND_HIP) * this.sit) * (this.sit > 0.5 ? 1 : this.squash) + 0.016 * this.walkK * Math.abs(Math.sin(this.walkPhase)); }
  private right() { const L = this.lookDir(); return new THREE.Vector3(-L.z, 0, L.x); }  // the person's right (look x up)
  lapHand(h: Hand): V3 { const s = h === "R" ? 1 : -1, L = this.lookDir(), Rt = this.right(); return [this.pivot.x + Rt.x * 0.075 * s + L.x * 0.12, this.hipY + 0.04, this.pivot.z + Rt.z * 0.075 * s + L.z * 0.12]; }
  restHand(h: Hand): V3 {
    const s = h === "R" ? 1 : -1, p = this.pivot, L = this.lookDir(), Rt = this.right(), k = this.sit;
    const st: V3 = [p.x + Rt.x * 0.19 * s + L.x * 0.03, this.hipY + 0.1, p.z + Rt.z * 0.19 * s + L.z * 0.03], la = this.lapHand(h);
    return [st[0] + (la[0] - st[0]) * k, st[1] + (la[1] - st[1]) * k, st[2] + (la[2] - st[2]) * k];
  }
  /** centre of the head in the world (for cameras, sparkles, things above the head) */
  headWorld(out = new THREE.Vector3()) {
    const h = this.cast.face?.head ?? { cy: 298 };
    return out.set(this.pivot.x, this.hipY + (HIP - h.cy) * PXM * (this.sit > 0.5 ? 1 : this.squash), this.pivot.z);
  }
  setVisible(v: boolean) {
    this.body.visible = this.headG.visible = v; this.hidden = !v;
    for (const h of ["L", "R"] as Hand[]) { const a = this.arms[h]; a.tube.visible = a.dot.visible = a.cap.visible = v; }
    for (const L of this.legs) for (const m of Object.values(L)) if (m) (m as THREE.Mesh).visible = v;
    for (const m of this.legShadow) m.visible = v;
    if (this.pile && !v) this.pile.visible = false;
  }
  // a point on the body (picture row, across -1 = his right .. +1 = his left, forward -1 back .. +1 front) in world space
  bodyPoint(row: number, across: number, fwd = 0, out = new THREE.Vector3()) {
    const a = this.hw(row) * PXM, b = a * this.cast.body.info.depth;
    return this.body.localToWorld(out.set(across * a, (HIP - row) * PXM, fwd * b));
  }

  update(t: number, cam: THREE.Camera, night: number, order: number) {
    cam.getWorldPosition(this.camPos);
    const L = this.lookDir(), yaw = Math.atan2(L.x, L.z);
    const roll = this.lean + 0.035 * this.walkK * Math.sin(this.walkPhase);
    // ---- body ----
    this.body.position.set(this.pivot.x, this.hipY, this.pivot.z);
    this.body.rotation.set(0, yaw, -roll, "YXZ");
    this.body.scale.set(1, this.sit > 0.5 ? 1 : this.squash, 1);
    this.body.updateMatrixWorld(true);
    const Rt = this.right(); this.R = [Rt.x, 0, Rt.z];
    // ---- head: flat to the camera at the neck, pulled toward the camera so it is always in front of its own body ----
    const neck = this.bodyPoint(NECK, 0, 0);
    const toCam = this.camPos.clone().sub(neck), dist = toCam.length(); toCam.normalize();
    const push = Math.min(HEAD_PUSH, dist * 0.4);
    this.headG.position.copy(neck).addScaledVector(toCam, push);
    this.headG.quaternion.copy((cam as THREE.PerspectiveCamera).quaternion);
    const idle = 0.03 * Math.sin(t * 1.25 + this.seed * 3) + 0.015 * Math.sin(t * 0.53 + this.seed);
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const hz = Math.hypot(toCam.x, toCam.z) || 1e-6;
    const c = (L.x * toCam.x + L.z * toCam.z) / hz;                  // +1 = he faces the camera
    const s = L.x * camRight.x + L.z * camRight.z;                     // + = he faces screen right
    const front = c > -0.2;
    this.headG.rotateZ(idle - roll);
    this.headG.scale.setScalar((dist - push) / dist);               // same size on screen as at the neck
    this.headG.updateMatrixWorld(true);
    // ---- face ----
    const Wm = this.cast.W * PXM;
    let hsx = 1, hsy = 1, hrot = 0;
    if (this.faceMesh) this.faceMesh.visible = false;
    if (front && this.faceMesh && this.cast.blank && this.cast.face) {
      this.headMat.map = this.cast.blank; this.faceMesh.visible = true;
      const sh = this.talk ? this.talk(t) : -1;
      const open = sh < 0 ? 0 : [0.1, 0.35, 0.6, 1, 0.75, 0.5][Math.min(5, sh)];
      const ff = faceAt(this.faceTrack, t, { blinks: this.blinks, blink4: this.blink4, talk: open > 0 ? () => open : undefined, mouthInside: true });
      if (this.eyeTarget) {   // HOUSE 2026-11-14: the eyes slide toward a point in the world (the person he talks or listens to), as the camera sees it
        const a = this.headG.getWorldPosition(new THREE.Vector3()).project(cam), b = new THREE.Vector3(...this.eyeTarget).project(cam);
        const want = Math.max(-1, Math.min(1, (b.x - a.x) * 3.2));
        ff.face.look = ff.face.look + (want - ff.face.look) * this.eyeK;
      }
      const F = this.cast.face, k = FACE_PX / (FACE_BOX * F.head.r), g = this.faceCanvas!.getContext("2d")!;
      g.clearRect(0, 0, FACE_PX, FACE_PX);
      drawFace(g, ff.face, FACE_PX / 2, FACE_PX / 2, F.head.r * k, F.rig);
      if (F.top) g.drawImage(F.top, 0, 0);
      this.faceTex!.needsUpdate = true;
      // the face slides toward the side he faces (reference: 0.07-0.15 head widths)
      this.faceMesh.position.x = (F.head.cx - CW / 2) * PXM + 0.12 * Wm * s;
      hsx = ff.sx; hsy = ff.sy; hrot = ff.rot;
      this.faceMesh.renderOrder = order + 2.5;
    } else if (front) {
      const fm = this.life.face(t);
      this.headMat.map = this.cast.heads[fm.k >= 0.5 ? fm.to : fm.from];
    } else this.headMat.map = this.cast.headBack;
    this.head.scale.set(hsx, hsy, 1); this.head.rotation.z = hrot;
    const hatT = front ? this.cast.hatF : (this.cast.hatB ?? this.cast.hatF);
    this.hat.visible = !!hatT; if (hatT) { this.hatMat.map = hatT; this.hat.scale.copy(this.head.scale); this.hat.rotation.z = hrot; }
    this.head.renderOrder = order + 2; this.hat.renderOrder = order + 4;
    // sweat
    const sw = front ? this.life.sweat(t) : 0, cy = (NECK - CH / 2) * PXM;
    this.drops.forEach((m, k) => {
      const [px, py, ph] = DROPS[k], u = ((t * 1.1 + ph) % 1);
      m.visible = sw > 0.02; if (!m.visible) return;
      const sc = sw * (u < 0.15 ? u / 0.15 : 1) * (1 - 0.2 * u);
      m.scale.set(sc, sc, 1); m.position.set((px - 300) * PXM, cy + (CH / 2 - py) * PXM - 0.03 * u, 0.016); m.renderOrder = order + 6;
    });
    // night tint on the drawn parts (the 3D body gets the real light)
    for (const m of [this.headMat, this.hatMat, this.dropMat, ...(this.faceMat ? [this.faceMat] : [])]) m.color.setRGB(1 - 0.5 * night, 1 - 0.42 * night, 1 - 0.1 * night);
    this.armMat.color.setRGB(INK.r * (1 - 0.5 * night), INK.g * (1 - 0.42 * night), INK.b * (1 - 0.1 * night));
    // ---- arms: from the shoulders on the 3D body (a little inside it, so no gap) to the hands ----
    const sRow = Math.max(this.cast.body.info.top + 22, Math.min(HIP - 90, this.cast.chin + 0.05 * this.cast.W));
    for (const h of ["L", "R"] as Hand[]) {
      // the shoulder sits just OUTSIDE the side of the bean, so the stroke never cuts through the body's surface
      const S = this.bodyPoint(sRow, h === "R" ? -1.05 : 1.05, 0), H = new THREE.Vector3(...this.hand[h]);
      const C = S.clone().lerp(H, 0.5); C.y -= 0.035;
      const curve = new THREE.QuadraticBezierCurve3(S, C, H);
      const arm = this.arms[h], pos = arm.tube.geometry.getAttribute("position") as THREE.BufferAttribute;
      const side = new THREE.Vector3(1, 0, 0), T = new THREE.Vector3(), V = new THREE.Vector3(), P = new THREE.Vector3(), n = new THREE.Vector3();
      for (let i = 0; i <= ARM_SEG; i++) {
        curve.getPoint(i / ARM_SEG, P); curve.getTangent(i / ARM_SEG, T);
        V.copy(this.camPos).sub(P).normalize(); n.crossVectors(T, V);
        if (n.lengthSq() > 1e-8) side.copy(n.normalize());
        pos.setXYZ(i * 2, P.x + side.x * ARM_HW, P.y + side.y * ARM_HW, P.z + side.z * ARM_HW);
        pos.setXYZ(i * 2 + 1, P.x - side.x * ARM_HW, P.y - side.y * ARM_HW, P.z - side.z * ARM_HW);
      }
      pos.needsUpdate = true; arm.tube.geometry.computeBoundingSphere();
      arm.cap.position.copy(S); arm.cap.quaternion.copy(cam.quaternion);
      V.copy(this.camPos).sub(H).normalize();
      arm.dot.position.copy(H).addScaledVector(V, 0.003); arm.dot.quaternion.copy(cam.quaternion);
    }
    if (!this.hidden) this.updateLegs(cam, order);
  }

  // legs: strokes hip -> knee -> ankle + a short foot stroke; trousers / boxer shorts are wider strokes on the same path
  private updateLegs(cam: THREE.Camera, order: number) {
    const L = this.lookDir().clone(), Rt = this.right(), up = new THREE.Vector3(0, 1, 0);
    const k = this.sit, wk = this.walkK, ph = this.walkPhase, floor = this.pivot.y;
    const hipY = this.hipY, legLen = STAND_HIP, thigh = legLen * 0.5;
    const toCam = new THREE.Vector3(), P = new THREE.Vector3(), T = new THREE.Vector3(), n = new THREE.Vector3(), side = new THREE.Vector3(1, 0, 0);
    const ankles: THREE.Vector3[] = [];
    this.legs.forEach((Lg, i) => {
      const sgn = i === 0 ? -1 : 1;                                        // his right / left
      const hip = new THREE.Vector3(this.pivot.x, hipY + 0.012, this.pivot.z).addScaledVector(Rt, -sgn * HIP_DX);
      const top = hip.clone().addScaledVector(up, 0.05);
      const swing = Math.cos(ph + (i === 0 ? 0 : Math.PI)), lift = Math.max(0, -Math.sin(ph + (i === 0 ? 0 : Math.PI)));
      const stand = new THREE.Vector3(this.pivot.x, floor + FOOT_HW, this.pivot.z).addScaledVector(Rt, -sgn * (FOOT_DX - 0.03 * wk))
        .addScaledVector(this.walkDir, 0.17 * wk * swing); stand.y += 0.07 * wk * lift;
      const kneeStand = hip.clone().lerp(stand, 0.5).addScaledVector(this.walkDir, 0.05 * wk * lift);
      const kneeSit = hip.clone().addScaledVector(L, thigh).addScaledVector(Rt, sgn * 0.01); kneeSit.y = hipY - 0.01;
      const footSit = kneeSit.clone().addScaledVector(L, 0.02); footSit.y = Math.max(floor + FOOT_HW, hipY - (legLen - thigh));
      const knee = kneeStand.lerp(kneeSit, k), foot = stand.lerp(footSit, k);
      ankles.push(foot.clone());
      { const rod = (m: THREE.Mesh | undefined, a: THREE.Vector3, b: THREE.Vector3) => { if (!m) return; const d = b.clone().sub(a), len = d.length(); m.position.copy(a); m.quaternion.setFromUnitVectors(up, d.normalize()); m.scale.set(LEG_HW * 2.5, len, LEG_HW * 2.5); };
        rod(this.legShadow[i * 2], hip, knee); rod(this.legShadow[i * 2 + 1], knee, foot); }
      const ctrl = knee.clone().multiplyScalar(2).addScaledVector(hip.clone().add(foot), -0.5);
      const curve = new THREE.QuadraticBezierCurve3(hip, ctrl, foot);
      const at = (u: number) => { if (u < 0) { P.copy(top).lerp(hip, 1 + u / 0.14); T.set(0, -1, 0); } else { curve.getPoint(u, P); curve.getTangent(u, T); } };
      const strip = (mesh: THREE.Mesh, u0: number, u1: number, hw0: number, hw1: number, nudge: number) => {
        const pos = mesh.geometry.getAttribute("position") as THREE.BufferAttribute, seg = pos.count / 2 - 1;
        for (let j = 0; j <= seg; j++) {
          const u = u0 + (u1 - u0) * (j / seg); at(u);
          toCam.copy(this.camPos).sub(P).normalize(); n.crossVectors(T, toCam);
          if (n.lengthSq() > 1e-8) side.copy(n.normalize());
          const hw = hw0 + (hw1 - hw0) * (j / seg); P.addScaledVector(toCam, nudge);
          pos.setXYZ(j * 2, P.x + side.x * hw, P.y + side.y * hw, P.z + side.z * hw);
          pos.setXYZ(j * 2 + 1, P.x - side.x * hw, P.y - side.y * hw, P.z - side.z * hw);
        }
        pos.needsUpdate = true; mesh.geometry.computeBoundingSphere();
      };
      strip(Lg.ink, 0, 1, LEG_HW, LEG_HW, 0); Lg.ink.renderOrder = order - 3;
      const dr = this.pantsDrop;
      if (Lg.pants) { strip(Lg.pants, -0.14 + (0.92 + 0.14) * dr, 0.97, 0.031 + 0.02 * dr, 0.029 + 0.03 * dr, 0.004); Lg.pants.renderOrder = order - 1; }
      if (Lg.boxer && Lg.boxerInk) {
        Lg.boxer.visible = Lg.boxerInk.visible = dr > 0.02;
        if (dr > 0.02) { strip(Lg.boxerInk, -0.14, 0.37, 0.085, 0.06, 0.0015); strip(Lg.boxer, -0.14, 0.345, 0.078, 0.053, 0.003); Lg.boxer.renderOrder = order - 2; }
      }
      const shoe = !!this.legStyle.shoes, fh = shoe ? 0.019 : FOOT_HW;
      const fdir = Rt.clone().multiplyScalar(-sgn * 0.4).addScaledVector(wk > 0.3 ? this.walkDir : L, 0.9).normalize();
      const a = foot.clone(), b = foot.clone().addScaledVector(fdir, FOOT_LEN); if (shoe) { a.y = Math.max(a.y, floor + fh); b.y = Math.max(b.y, floor + fh); }
      const fp = Lg.foot.geometry.getAttribute("position") as THREE.BufferAttribute;
      toCam.copy(this.camPos).sub(a).normalize(); n.crossVectors(T.copy(b).sub(a).normalize(), toCam).normalize();
      for (const [j, q] of [[0, a], [1, b]] as [number, THREE.Vector3][]) {
        fp.setXYZ(j * 2, q.x + n.x * fh + toCam.x * 0.006, q.y + n.y * fh + toCam.y * 0.006, q.z + n.z * fh + toCam.z * 0.006);
        fp.setXYZ(j * 2 + 1, q.x - n.x * fh + toCam.x * 0.006, q.y - n.y * fh + toCam.y * 0.006, q.z - n.z * fh + toCam.z * 0.006);
      }
      fp.needsUpdate = true; Lg.foot.geometry.computeBoundingSphere();
      for (const [m, q] of [[Lg.capA, a], [Lg.capB, b]] as [THREE.Mesh, THREE.Vector3][]) { m.position.copy(q).addScaledVector(toCam, 0.006); m.quaternion.copy(cam.quaternion); m.scale.setScalar(fh); }
    });
    if (this.pile) {
      const dr = this.pantsDrop; this.pile.visible = dr > 0.55;
      if (this.pile.visible) {
        const [a, b] = ankles, pos = this.pile.geometry.getAttribute("position") as THREE.BufferAttribute, seg = pos.count / 2 - 1, hw = 0.03 * smooth(0.55, 1, dr);
        for (let j = 0; j <= seg; j++) {
          P.copy(a).lerp(b, j / seg); P.y += 0.012 + 0.01 * Math.sin((j / seg) * Math.PI * 3);
          toCam.copy(this.camPos).sub(P).normalize(); P.addScaledVector(toCam, 0.005);
          pos.setXYZ(j * 2, P.x, P.y + hw, P.z); pos.setXYZ(j * 2 + 1, P.x, P.y - hw, P.z);
        }
        pos.needsUpdate = true; this.pile.geometry.computeBoundingSphere(); this.pile.renderOrder = order - 1;
      }
    }
  }
}
export { HAND_R };

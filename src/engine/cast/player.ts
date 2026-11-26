// Characters as layered camera-facing cards made from the shorts-library PNGs.
// Fixes from v1/v2: never hidden or culled; soft thick-thin dark-brown outline (thick on the lower right);
// drawn arms removed from the card and replaced by real 3D stick arms from the shoulders to dot hands
// (so a held piece sits exactly on the hand); faces fade over 6 frames; layers slide as the camera goes around.
// v3.1: shoulders sit on the top corners of the SHIRT, just below where the head ends (in v3 they were at the neck,
// hidden under the head, so the arms seemed to come out of the face).
// v3.2: arms are FLAT camera-facing ink strokes (same weight as the drawn lines) with a round hand disc, starting just
// behind the body card (so from behind there is no stub); seated cards tilt back from the NECK, not the hip, and at most
// 0.45 rad (from the hip the head leaned over the table edge and the table's outline was drawn across the head);
// the shirt is drawn 12 % wider so the bare body's outline no longer shows as black bands at its sides.
// v5 (bank video, 2026-11-10), all optional, old videos draw exactly as before:
//   opts.legs      legs as flat ink strokes (like the arms) instead of the drawn legs: the person can WALK (setWalk), SIT on an
//                  open chair with the legs showing (sit 0..1, seatY), move (setPos) and turn round (setFacing). With
//                  legs: { pants, shoes, boxers } the person wears trousers that can drop to the ankles (pantsDrop 0..1).
//   opts.talk      (t) => mouth shape 0..5 while the person speaks, -1 otherwise. Needs buildCast(imgs, who, { talk: true }):
//                  it finds the mouth on the neutral face and draws the talking mouths over it (lips move in real time).
//   buildCast(.., { keepDark: true })  keeps dark cloth (a black suit) as drawn, not recoloured to ink brown.
// v6 (2026-11-11), optional: DRAWN MORPHING FACES (face.ts). Needs the blank head picture (<who>_blank: the head with no
//   eyes/brows/mouth, library cast/<who>/faces/head_blank.png) and opts.face = [{ t, e: "happy", look?: -1..1 }, ...].
//   The eyes, brows and mouth are drawn every frame and slide into each new expression; the head squashes and bounces a
//   little on every change; opts.blinks = [t, ...]; opts.talk still works (shapes 0..5 open the drawn mouth).
//   Old videos (no opts.face) draw exactly as before.
// R3KNRF (2026-11-11), optional, old videos draw exactly as before:
//   opts.lit = true     the person takes the scene light (cardlight.ts): tinted by the light colour, the side away from the
//                       light a little darker and cooler. The world sets the light each frame with applyLight (core/lights.ts);
//                       pass night = 0 to update() when you use it.
//   opts.blinks = "auto" (drawn faces) blinks by itself every 0.5-2.3 s (4 frames: half, shut, shut, half) and blinks
//                       across every expression change, like the reference. A list of times still works as before.
import * as THREE from "three";
import { litCard, ZONE_CARD, ZONE_HEAD, ZONE_FACE } from "./cardlight";
import { defringeData } from "../post/fringe";
import { NOINK } from "../post/ink";
import { V3, smooth } from "../core/util";
import { INK_BROWN, mkCanvas } from "../kit";
import { Face, FACE_LIST, Life, makeLife } from "./life";
import { drawFace, faceAt, autoBlinks, DEFAULT_RIG, FaceKey, FaceRig } from "./face";

export const PXM = 0.0013, HIP = 732, SOLE = 975;
export const HAND_R = 0.024;
const ARM_HW = 0.0085, HAND_DISC = 0.03, ARM_SEG = 14;   // stroke half width, hand disc radius (m), segments
const NECK = 460;                                       // top of the torso in the 600x1000 library pictures
const CW = 600, CH = 1000, SS = 2;                     // textures are drawn at 2x for smooth edges in close-ups
export type Hand = "L" | "R";
type Px = { x: number; y: number };

export type CastTex = {
  body: { seated: THREE.Texture; standing: THREE.Texture };
  torsoF: { seated: THREE.Texture; standing: THREE.Texture };
  torsoB: { seated: THREE.Texture; standing: THREE.Texture };
  heads: Record<Face, THREE.Texture>; headBack: THREE.Texture;
  hatF?: THREE.Texture; hatB?: THREE.Texture;   // a separate hat (library/hats/<name>/), drawn over the head
  mouths?: THREE.Texture[];                     // talking mouths 0..5 (cover patch + mouth), same grid as the head
  blank?: THREE.Texture;                        // the head with no face (for drawn faces)
  face?: { head: { cx: number; cy: number; r: number }; rig: FaceRig; mask: HTMLCanvasElement; top?: HTMLCanvasElement };   // head circle (px), face layout, skin mask
  shoulder: Record<Hand, Px>;          // image pixels; R = the character's right = image left
  W: number;                           // head width in pixels
};

const tex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; return t;
};
export const clean1x = (im: HTMLImageElement) => {
  const c = mkCanvas(CW, CH), g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(im, 0, 0, CW, CH);
  const id = g.getImageData(0, 0, CW, CH); defringeData(id.data, CW, CH); g.putImageData(id, 0, 0);
  return c;
};
const alphaOf = (c: HTMLCanvasElement) => c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, CW, CH).data;

export const headWidth = (c: HTMLCanvasElement) => {
  const d = alphaOf(c); let x0 = CW, x1 = 0;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (d[(y * CW + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  return x1 > x0 ? x1 - x0 : 330;
};
// lowest row of the head picture (its chin / bottom outline)
export const headBottom = (c: HTMLCanvasElement) => {
  const d = alphaOf(c);
  for (let y = CH - 1; y >= 0; y--) for (let x = 120; x < 480; x++) if (d[(y * CW + x) * 4 + 3] > 40) return y;
  return 0;
};
// solid run through the middle of a row (ignoring the erased-arm pixels)
const rowRun = (c: HTMLCanvasElement, y: number, arm: Uint8Array) => {
  const d = alphaOf(c), A = (x: number) => d[(y * CW + x) * 4 + 3] > 40 && !arm[y * CW + x];
  if (!A(300)) return null;
  let l = 300, r = 300; while (l > 0 && A(l - 1)) l--; while (r < CW - 1 && A(r + 1)) r++;
  return r - l > 40 ? { l, r } : null;
};

// Find the drawn arms on the bare body (pixels left/right of the torso, connected), so they can be erased.
const analyseBody = (body: HTMLCanvasElement, W: number) => {
  const d = alphaOf(body), A = (x: number, y: number) => d[(y * CW + x) * 4 + 3] > 40;
  const runL = new Int16Array(CH).fill(-1), runR = new Int16Array(CH).fill(-1);
  for (let y = 0; y < CH; y++) if (A(300, y)) {
    let l = 300, r = 300; while (l > 0 && A(l - 1, y)) l--; while (r < CW - 1 && A(r + 1, y)) r++; runL[y] = l; runR[y] = r;
  }
  let ref = HIP - 100; while (ref > 200 && runL[ref] < 0) ref--;
  let top = ref, bot = ref;
  while (top > 0 && runL[top - 1] >= 0) top--;
  while (bot < CH - 1 && runL[bot + 1] >= 0) bot++;
  const halves: number[] = [];
  for (let y = Math.round(top + 0.4 * (bot - top)); y <= bot; y++) halves.push((runR[y] - runL[y]) / 2);
  halves.sort((a, b) => a - b);
  const half = halves.length ? halves[halves.length >> 1] : 0.4 * W;
  const Lc = (y: number) => { const yy = Math.min(bot, Math.max(top, y)); return Math.max(runL[yy], Math.round(300 - 1.2 * half)); };
  const Rc = (y: number) => { const yy = Math.min(bot, Math.max(top, y)); return Math.min(runR[yy], Math.round(300 + 1.2 * half)); };
  const arm = new Uint8Array(CW * CH);
  const shoulder: Record<Hand, Px> = { R: { x: Math.round(300 - 0.8 * half), y: Math.round(top + 0.12 * (bot - top)) }, L: { x: Math.round(300 + 0.8 * half), y: Math.round(top + 0.12 * (bot - top)) } };
  for (const side of ["R", "L"] as Hand[]) {
    const inside = (x: number, y: number) => (side === "R" ? x < Lc(y) - 1 : x > Rc(y) + 1);
    const q: number[] = [];
    const yEnd = Math.min(CH - 1, bot + 120);                       // also catches hand dots drawn apart from the arm
    for (let y = top; y <= yEnd; y++) for (let x = 0; x < CW; x++) if (inside(x, y) && A(x, y) && !arm[y * CW + x]) { arm[y * CW + x] = 1; q.push(y * CW + x); }
    let minY = CH;
    for (let k = 0; k < q.length; k++) {
      const i = q[k], x = i % CW, y = (i - x) / CW;
      if (y < minY) minY = y;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < top || nx >= CW || ny >= CH) continue;
        const j = ny * CW + nx;
        if (!arm[j] && A(nx, ny) && inside(nx, ny)) { arm[j] = 1; q.push(j); }
      }
    }
    if (q.length > 50) shoulder[side] = { x: side === "R" ? Lc(minY) + Math.round(0.12 * half) : Rc(minY) - Math.round(0.12 * half), y: minY + 4 };
  }
  return { arm, shoulder };
};

// One layer: erase arms / cut at the hips, recolour the black ink to warm brown, upscale 2x, add a soft outline
// that is thick on the lower right (shadow side) and thin on the upper left (lit side).
export const makeLayer = (src: HTMLCanvasElement, o: { erase?: Uint8Array; cut?: number; thin: number; thick: number; rim?: { k: number; w: number }; keepDark?: boolean }) => {
  const c1 = mkCanvas(CW, CH), g1 = c1.getContext("2d", { willReadFrequently: true })!;
  g1.drawImage(src, 0, 0);
  const id = g1.getImageData(0, 0, CW, CH), d = id.data;
  for (let i = 0; i < CW * CH; i++) {
    const y = (i / CW) | 0;
    if ((o.erase && o.erase[i]) || (o.cut !== undefined && y >= o.cut)) { d[i * 4 + 3] = 0; continue; }
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], lum = 0.3 * r + 0.59 * g + 0.11 * b;
    if (lum < 95 && !o.keepDark) { const k = Math.min(1, (95 - lum) / 55); d[i * 4] = r + (42 - r) * k; d[i * 4 + 1] = g + (26 - g) * k; d[i * 4 + 2] = b + (30 - b) * k; }
  }
  g1.putImageData(id, 0, 0);
  const c2 = mkCanvas(CW * SS, CH * SS), g2 = c2.getContext("2d")!;
  g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = "high";
  if (o.thick > 0) {
    const m = mkCanvas(CW * SS, CH * SS), gm = m.getContext("2d")!;
    gm.imageSmoothingEnabled = true; gm.imageSmoothingQuality = "high";
    gm.drawImage(c1, 0, 0, CW * SS, CH * SS); gm.globalCompositeOperation = "source-in"; gm.fillStyle = INK_BROWN; gm.fillRect(0, 0, m.width, m.height);
    const ol = mkCanvas(CW * SS, CH * SS), go = ol.getContext("2d")!;
    const th0 = (50 * Math.PI) / 180;                                    // thickest toward the lower right
    for (let k = 0; k < 28; k++) {
      const th = (k / 28) * Math.PI * 2, r = (o.thin + (o.thick - o.thin) * Math.pow(Math.max(0, Math.cos(th - th0)), 1.3)) * SS;
      for (const f of [1, 0.5]) go.drawImage(m, Math.cos(th) * r * f, Math.sin(th) * r * f);
    }
    g2.filter = `blur(${1.2 * SS}px)`; g2.drawImage(ol, 0, 0); g2.filter = "none";
  }
  g2.drawImage(c1, 0, 0, CW * SS, CH * SS);
  // v4 rim light (reference 16.6): a thin cream line just inside the outline on the lit side (light from the upper left).
  // Band = pixels inside the shape whose point k px up-left is inside and whose point k+w px up-left is outside.
  if (o.rim) {
    const m = mkCanvas(CW * SS, CH * SS), gm = m.getContext("2d")!;
    gm.imageSmoothingEnabled = true; gm.drawImage(c1, 0, 0, CW * SS, CH * SS);
    const rc = mkCanvas(CW * SS, CH * SS), gr = rc.getContext("2d")!;
    const dx = 0.62, dy = 0.78, k = o.rim.k * SS, w = o.rim.w * SS;
    gr.drawImage(m, 0, 0);
    gr.globalCompositeOperation = "destination-in"; gr.drawImage(m, dx * k, dy * k);
    gr.globalCompositeOperation = "destination-out"; gr.drawImage(m, dx * (k + w), dy * (k + w));
    gr.globalCompositeOperation = "source-in"; gr.fillStyle = "#FFF1D8"; gr.fillRect(0, 0, rc.width, rc.height);
    g2.save(); g2.globalAlpha = 0.85; g2.filter = `blur(${0.6 * SS}px)`; g2.drawImage(rc, 0, 0); g2.restore();
  }
  return c2;
};

const castCache = new Map<string, CastTex>();
// ---- drawn faces: head circle from the blank head (the skin area), and a mask so the face never draws over hair/outline ----
// a character with another skin colour (CastOpts.skin) is found by colour distance; light skins keep the old test
let SKIN_SET: number[] | null = null;
export const setSkinSet = (s: number[] | null) => { SKIN_SET = s; };   // player3d.ts: which colour is skin while it builds a head
const isSkin = (r: number, g: number, b: number, a: number) => SKIN_SET
  ? a > 200 && Math.abs(r - SKIN_SET[0]) + Math.abs(g - SKIN_SET[1]) + Math.abs(b - SKIN_SET[2]) < 60
  : a > 200 && (r * 3 + g * 6 + b) / 10 > 200 && Math.max(r, g, b) - Math.min(r, g, b) < 40;
export const measureHead = (c: HTMLCanvasElement) => {
  // the face = the biggest connected patch of skin in the upper part of the picture
  const d = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, CW, CH).data, N = CW * CH;
  const sk = new Uint8Array(N), lab = new Int32Array(N), st: number[] = [];
  for (let i = 0; i < CW * Math.round(CH * 0.62); i++) sk[i] = isSkin(d[i * 4], d[i * 4 + 1], d[i * 4 + 2], d[i * 4 + 3]) ? 1 : 0;
  let best = { n: 0, x0: 0, x1: 0, y1: 0 }, id = 0;
  for (let i = 0; i < N; i++) if (sk[i] && !lab[i]) {
    id++; let n = 0, x0 = CW, x1 = 0, y1 = 0; lab[i] = id; st.push(i);
    while (st.length) { const j = st.pop()!, x = j % CW, y = (j / CW) | 0; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y > y1) y1 = y;
      for (const k of [x > 0 ? j - 1 : -1, x < CW - 1 ? j + 1 : -1, j - CW, j + CW]) if (k >= 0 && k < N && sk[k] && !lab[k]) { lab[k] = id; st.push(k); } }
    if (n > best.n) best = { n, x0, x1, y1 };
  }
  const r = Math.max(60, (best.x1 - best.x0) / 2); return { cx: (best.x0 + best.x1) / 2, cy: best.y1 - r, r };
};
// blank head made from the neutral head: every dark part fully enclosed by skin (eyes, brows, mouth) is painted with the
// skin colour, and the skin is set to the exact skin colour. Things that touch the outline or the hair (glasses arms,
// hair) are kept. Also measures where the old eyes and mouth were, so the drawn face sits in the same place.
const SKIN_RGB_DEFAULT = [0xfc, 0xf2, 0xea];
export const makeBlank = (src: HTMLCanvasElement) => {
  const SKIN_RGB = SKIN_SET ?? SKIN_RGB_DEFAULT;
  const c = mkCanvas(CW, CH), g = c.getContext("2d", { willReadFrequently: true })!; g.drawImage(src, 0, 0);
  const id = g.getImageData(0, 0, CW, CH), d = id.data, N = CW * CH;
  const skin = new Uint8Array(N); for (let i = 0; i < N; i++) skin[i] = isSkin(d[i * 4], d[i * 4 + 1], d[i * 4 + 2], d[i * 4 + 3]) ? 1 : 0;
  // flood the outside through every non-skin pixel; what is not reached and not skin is a hole (a face feature)
  const out = new Uint8Array(N), st: number[] = [];
  const push = (i: number) => { if (!out[i] && !skin[i]) { out[i] = 1; st.push(i); } };
  for (let x = 0; x < CW; x++) { push(x); push((CH - 1) * CW + x); }
  for (let y = 0; y < CH; y++) { push(y * CW); push(y * CW + CW - 1); }
  while (st.length) { const i = st.pop()!, x = i % CW; if (x > 0) push(i - 1); if (x < CW - 1) push(i + 1); if (i >= CW) push(i - CW); if (i < N - CW) push(i + CW); }
  const hole = new Uint8Array(N); for (let i = 0; i < N; i++) hole[i] = !skin[i] && !out[i] ? 1 : 0;
  // feature parts (for the layout)
  const lab = new Int32Array(N), parts: { x: number; y: number; n: number; col: number }[] = [];
  for (let i = 0; i < N; i++) if (hole[i] && !lab[i]) {
    const id2 = parts.length + 1; let sx = 0, sy = 0, n = 0, col = 0; st.push(i); lab[i] = id2;
    while (st.length) { const j = st.pop()!, x = j % CW, y = (j / CW) | 0; sx += x; sy += y; n++;
      { const q = j * 4, mx = Math.max(d[q], d[q + 1], d[q + 2]); if (mx - Math.min(d[q], d[q + 1], d[q + 2]) > 45 && mx > 70) col++; }
      for (const k of [x > 0 ? j - 1 : -1, x < CW - 1 ? j + 1 : -1, j - CW, j + CW]) if (k >= 0 && k < N && hole[k] && !lab[k]) { lab[k] = id2; st.push(k); } }
    parts.push({ x: sx / n, y: sy / n, n, col: col / n });
  }
  // coloured parts (a moustache, a beard: more than 25 % coloured pixels) are KEPT: cut out to a top layer that is drawn
  // over the drawn face, so the mouth moves under the moustache
  const keepId = new Set(parts.map((p, k) => (p.col > 0.25 && p.n > 200 ? k + 1 : 0)).filter(Boolean));
  const top = mkCanvas(CW, CH), gt = top.getContext("2d")!, tid = gt.createImageData(CW, CH);
  let anyTop = false;
  for (let i = 0; i < N; i++) if (lab[i] && keepId.has(lab[i])) {
    anyTop = true; for (let k = 0; k < 4; k++) tid.data[i * 4 + k] = d[i * 4 + k];
    { const q = i * 4, lum = (d[q] * 3 + d[q + 1] * 6 + d[q + 2]) / 10; if (lum < 60) { const t = Math.min(1, (60 - lum) / 40); tid.data[q] = d[q] + (42 - d[q]) * t; tid.data[q + 1] = d[q + 1] + (26 - d[q + 1]) * t; tid.data[q + 2] = d[q + 2] + (30 - d[q + 2]) * t; } }   // dark lines -> ink brown, like makeLayer
    hole[i] = 1;                                  // it is painted out of the blank head too (it comes back on top)
  }
  if (anyTop) {                                   // include the soft 1-2 px edge around kept parts
    for (let i = 0; i < N; i++) if (!tid.data[i * 4 + 3] && !skin[i]) {
      const x = i % CW; let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const k = i + dy * CW + dx; if (k >= 0 && k < N && Math.abs((k % CW) - x) <= 2 && lab[k] && keepId.has(lab[k])) { near = true; break; } }
      if (near) for (let k = 0; k < 4; k++) tid.data[i * 4 + k] = d[i * 4 + k];
    }
    gt.putImageData(tid, 0, 0);
  }
  // paint: holes (grown 2 px) and the skin core get the exact skin colour
  const grow = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (hole[i]) { const x = i % CW; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const k = i + dy * CW + dx, kx = x + dx; if (kx >= 0 && kx < CW && k >= 0 && k < N && (skin[k] || hole[k])) grow[k] = 1; } }
  for (let i = 0; i < N; i++) {
    let core = skin[i] === 1;
    if (core) { const x = i % CW; for (const k of [i - 3, i + 3, i - 3 * CW, i + 3 * CW]) if (k < 0 || k >= N || (!skin[k] && !hole[k]) || Math.abs((k % CW) - x) > 3) { core = false; break; } }
    if (grow[i] || core) { d[i * 4] = SKIN_RGB[0]; d[i * 4 + 1] = SKIN_RGB[1]; d[i * 4 + 2] = SKIN_RGB[2]; d[i * 4 + 3] = 255; }
  }
  g.putImageData(id, 0, 0);
  const head = measureHead(c);
  const rig: Partial<FaceRig> = {};
  const big = parts.filter((p, k) => p.n >= 30 && p.y < head.cy + head.r && !keepId.has(k + 1));
  if (big.length) {
    const mouth = big.reduce((a, b) => (b.y > a.y ? b : a));
    rig.mouthY = (mouth.y - head.cy) / head.r;
    // eyes: the two biggest parts above the mouth; when brows are there too (4 parts), the lower pair are the eyes
    const up = big.filter((p) => p !== mouth && p.y < mouth.y - 10).sort((a, b) => b.n - a.n).slice(0, 4).sort((a, b) => a.y - b.y);
    const eyes = up.length >= 4 ? up.slice(2, 4) : up.slice(0, 2);
    if (eyes.length === 2) { rig.eyeX = Math.abs(eyes[0].x - eyes[1].x) / 2 / head.r; rig.eyeY = (eyes[0].y + eyes[1].y) / 2 / head.r - head.cy / head.r - 0.06; }
  }
  return { canvas: c, head, rig, top: anyTop ? top : undefined };
};
export const FACE_BOX = 2.4;                 // the face layer covers a square of FACE_BOX x head radius around the head centre
export const FACE_PX = 512;                         // face layer canvas size
const FACE_CLIP = false;                     // true = trim the drawn face to the skin area
export const faceMask = (c: HTMLCanvasElement, h: { cx: number; cy: number; r: number }) => {
  const side = FACE_BOX * h.r, k = FACE_PX / side, m = mkCanvas(FACE_PX, FACE_PX), g = m.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(c, h.cx - side / 2, h.cy - side / 2, side, side, 0, 0, FACE_PX, FACE_PX);
  const id = g.getImageData(0, 0, FACE_PX, FACE_PX), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const on = isSkin(d[i], d[i + 1], d[i + 2], d[i + 3]); d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = on ? 255 : 0; }
  g.putImageData(id, 0, 0);
  // soften the mask edge a little (k px) so lines fade into the outline instead of being cut sharp
  const m2 = mkCanvas(FACE_PX, FACE_PX), g2 = m2.getContext("2d")!; g2.filter = `blur(${Math.max(0.6, 0.8 * k)}px)`; g2.drawImage(m, 0, 0);
  return m2;
};
// ---- talking mouths: find the mouth on the neutral face, then draw a skin-coloured cover + six mouth shapes ----
export const MOUTH_SHAPES = 6;        // 0 closed, 1 a little open, 2 open, 3 wide open (ah), 4 round (oo), 5 wide with teeth (ee)
const findMouth = (head: HTMLCanvasElement) => {
  const g = head.getContext("2d", { willReadFrequently: true })!, d = g.getImageData(0, 0, CW, CH).data;
  const dark = (x: number, y: number) => { const i = (y * CW + x) * 4; return d[i + 3] > 200 && 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2] < 70; };
  // lowest dark blob near the centre line that is not the chin outline: scan up from the chin, skip the outline, take the next dark run
  let bottom = CH - 1; while (bottom > 0 && d[(bottom * CW + 300) * 4 + 3] < 40) bottom--;
  let y = bottom; while (y > 0 && dark(300, y)) y--;                    // through the chin outline
  let best: { x: number; y: number } | null = null;
  for (let yy = y - 4; yy > y - 150 && !best; yy--) for (const x of [300, 290, 310, 280, 320]) if (dark(x, yy)) {
    let y0 = yy; while (y0 > 0 && dark(x, y0 - 1)) y0--;
    let x0 = x, x1 = x; const ym = Math.round((yy + y0) / 2);
    while (x0 > 150 && dark(x0 - 1, ym)) x0--; while (x1 < 450 && dark(x1 + 1, ym)) x1++;
    best = { x: Math.round((x0 + x1) / 2), y: ym }; break;
  }
  best = best ?? { x: 300, y: bottom - 90 };
  // skin colour: the most common colour in a ring around the mouth
  const cnt = new Map<number, number>();
  for (let yy = best.y - 34; yy <= best.y + 30; yy += 2) for (let xx = best.x - 70; xx <= best.x + 70; xx += 2) {
    const i = (yy * CW + xx) * 4; if (d[i + 3] < 250 || dark(xx, yy)) continue;
    const k = ((d[i] >> 2) << 12) | ((d[i + 1] >> 2) << 6) | (d[i + 2] >> 2); cnt.set(k, (cnt.get(k) ?? 0) + 1);
  }
  let top = 0, key = 0; cnt.forEach((n, k) => { if (n > top) { top = n; key = k; } });
  const skin = `rgb(${((key >> 12) & 63) * 4 + 2},${((key >> 6) & 63) * 4 + 2},${(key & 63) * 4 + 2})`;
  return { ...best, skin };
};
const makeMouths = (head: HTMLCanvasElement, at?: { x: number; y: number }) => {
  const f = findMouth(head), mx = at?.x ?? f.x, my = at?.y ?? f.y, out: HTMLCanvasElement[] = [];
  const cover = mkCanvas(CW, CH), gc = cover.getContext("2d", { willReadFrequently: true })!;
  { const src = head.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, CW, CH).data, id = gc.createImageData(CW, CH), d = id.data;
    const ya = my - 19, yb = my + 24, RX = 46, RY = 18, cyc = my + 2;
    for (let x = mx - RX - 4; x <= mx + RX + 4; x++) {
      const ia = (ya * CW + x) * 4, ib = (yb * CW + x) * 4;
      for (let y = ya; y <= yb; y++) {
        const u = (y - ya) / (yb - ya), i = (y * CW + x) * 4;
        const e = Math.hypot((x - mx) / RX, (y - cyc) / RY);                 // soft elliptical edge
        const al = Math.max(0, Math.min(1, (1.12 - e) / 0.12));
        if (al <= 0) continue;
        for (let c = 0; c < 3; c++) d[i + c] = src[ia + c] + (src[ib + c] - src[ia + c]) * u;
        d[i + 3] = 255 * al;
      }
    }
    gc.putImageData(id, 0, 0); }
  for (let k = 0; k < MOUTH_SHAPES; k++) {
    const c = mkCanvas(CW * SS, CH * SS), g = c.getContext("2d")!; g.scale(SS, SS);
    // cover: the face's own skin with the drawn mouth painted out (each column filled from the pixels just above and
    // below the mouth), so it matches the face exactly; small and soft, it stays clear of glasses and eyes
    g.drawImage(cover, 0, 0, CW, CH);
    g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = INK_BROWN; g.lineWidth = 7;
    const cy = my + 4, DARK = "#4A1722", TONGUE = "#F2879A";
    const open = (rx: number, ry: number, teeth: number, tongue: number) => {
      g.beginPath(); g.ellipse(mx, cy, rx, ry, 0, 0, 7); g.fillStyle = DARK; g.fill();
      g.save(); g.clip();
      if (tongue > 0) { g.fillStyle = TONGUE; g.beginPath(); g.ellipse(mx, cy + ry * 1.05, rx * 0.8, ry * tongue, 0, 0, 7); g.fill(); }
      if (teeth > 0) { g.fillStyle = "#FFFFFF"; g.fillRect(mx - rx, cy - ry - 2, rx * 2, ry * teeth + 2); }
      g.restore(); g.beginPath(); g.ellipse(mx, cy, rx, ry, 0, 0, 7); g.stroke();
    };
    if (k === 0) { g.lineWidth = 8; g.beginPath(); g.moveTo(mx - 19, cy - 3); g.quadraticCurveTo(mx, cy + 1, mx + 19, cy - 3); g.stroke(); }
    else if (k === 1) open(17, 8, 0, 0);
    else if (k === 2) open(20, 15, 0.42, 0.7);
    else if (k === 3) open(23, 18, 0.36, 0.8);
    else if (k === 4) open(11, 13, 0, 0.5);
    else {                                                    // 5: wide, teeth showing
      g.beginPath(); g.roundRect(mx - 29, cy - 11, 58, 21, 10); g.fillStyle = "#FFFFFF"; g.fill(); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(mx - 26, cy); g.lineTo(mx + 26, cy); g.stroke();
    }
    // the face layers tone dark colours toward ink brown (makeLayer); do the same here so the cover matches the face exactly
    const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const r = d[i], gg = d[i + 1], b = d[i + 2], lum = 0.3 * r + 0.59 * gg + 0.11 * b;
      if (lum < 95) { const k = Math.min(1, (95 - lum) / 55); d[i] = r + (42 - r) * k; d[i + 1] = gg + (26 - gg) * k; d[i + 2] = b + (30 - b) * k; }
    }
    g.putImageData(id, 0, 0);
    out.push(c);
  }
  return out;
};

export type CastOpts = { skin?: [number, number, number]; keepDark?: boolean; talk?: boolean; mouth?: { x: number; y: number }; noRim?: boolean;
  drawnFace?: boolean;                                                               // drawn morphing faces (blank head made automatically)
  face?: { head?: { cx: number; cy: number; r: number }; rig?: Partial<FaceRig> } };   // optional face.json override   // drawn faces: face.json from the library (optional; measured if missing)   // noRim: no cream rim line (it can look like white dots)
export const buildCast = (imgs: Record<string, HTMLImageElement>, who: string, co: CastOpts = {}): CastTex => {
  const hit = castCache.get(who); if (hit) return hit;
  const body = clean1x(imgs.body), heads1 = Object.fromEntries(FACE_LIST.map((f) => [f, clean1x(imgs[`${who}_${f}`])])) as Record<Face, HTMLCanvasElement>;
  const W = headWidth(heads1.neutral);
  const { arm, shoulder } = analyseBody(body, W);
  const thin = 0.012 * W, thick = 0.065 * W, bThick = 0.035 * W, tThin = 0.012 * W, tThick = 0.03 * W;
  const tf = clean1x(imgs[`${who}_torso_front`]), tb = clean1x(imgs[`${who}_torso_back`]), hb = clean1x(imgs[`${who}_back`]);
  const rim = co.noRim ? undefined : { k: 0.026 * W, w: 0.009 * W };
  // hat: erase the hair above the brim (the hat's mask picture) from every head layer, then draw the hat as its own layer
  let hatErase: Uint8Array | undefined;
  if (imgs[`${who}_hat_mask`]) {
    const mc = mkCanvas(CW, CH), gm = mc.getContext("2d", { willReadFrequently: true })!; gm.drawImage(imgs[`${who}_hat_mask`], 0, 0, CW, CH);
    const md = gm.getImageData(0, 0, CW, CH).data; hatErase = new Uint8Array(CW * CH);
    for (let i = 0; i < CW * CH; i++) hatErase[i] = md[i * 4 + 3] > 128 ? 1 : 0;
  }
  // shoulders: on the shirt's top corners, a little below the chin, so the arm starts on the shirt and never under the head
  const sy = Math.min(HIP - 60, headBottom(heads1.neutral) + Math.round(0.05 * W));
  const run = rowRun(tf, sy, arm) ?? rowRun(body, sy, arm);
  if (run) {
    const half = (run.r - run.l) / 2;
    shoulder.R = { x: Math.round(run.l + 0.18 * half), y: sy };
    shoulder.L = { x: Math.round(run.r - 0.18 * half), y: sy };
  } else {
    shoulder.R = { ...shoulder.R, y: Math.max(shoulder.R.y, sy) };
    shoulder.L = { ...shoulder.L, y: Math.max(shoulder.L.y, sy) };
  }
  const both = (src: HTMLCanvasElement, a: number, b: number, keepDark = false) => ({
    seated: tex(makeLayer(src, { erase: arm, cut: HIP, thin: a, thick: b, rim, keepDark })),
    standing: tex(makeLayer(src, { erase: arm, thin: a, thick: b, rim, keepDark })),
  });
  const out: CastTex = {
    body: both(body, thin, bThick), torsoF: both(tf, tThin, tThick, co.keepDark), torsoB: both(tb, tThin, tThick, co.keepDark),
    heads: Object.fromEntries(FACE_LIST.map((f) => [f, tex(makeLayer(heads1[f], { thin, thick, erase: hatErase, rim }))])) as Record<Face, THREE.Texture>,
    headBack: tex(makeLayer(hb, { thin, thick, erase: hatErase, rim })), shoulder, W,
    hatF: imgs[`${who}_hat_front`] ? tex(makeLayer(clean1x(imgs[`${who}_hat_front`]), { thin, thick: 0.045 * W, rim })) : undefined,
    hatB: imgs[`${who}_hat_back`] ? tex(makeLayer(clean1x(imgs[`${who}_hat_back`]), { thin, thick: 0.045 * W, rim })) : undefined,
    mouths: co.talk ? makeMouths(heads1.neutral, co.mouth).map(tex) : undefined,
  };
  if (co.drawnFace || imgs[`${who}_blank`] || co.face) {
    // the blank head: the library's head_blank.png if given, otherwise made here from the neutral head
    SKIN_SET = co.skin ?? null;
    const auto = makeBlank(heads1.neutral);
    const b1 = imgs[`${who}_blank`] ? clean1x(imgs[`${who}_blank`]) : auto.canvas;
    out.blank = tex(makeLayer(b1, { thin, thick, erase: hatErase, rim }));
    const head = co.face?.head ?? measureHead(b1);
    let top: HTMLCanvasElement | undefined;
    if (auto.top && !imgs[`${who}_blank`]) {        // moustache etc. cropped to the face layer's square
      const side = FACE_BOX * head.r; top = mkCanvas(FACE_PX, FACE_PX);
      top.getContext("2d")!.drawImage(auto.top, head.cx - side / 2, head.cy - side / 2, side, side, 0, 0, FACE_PX, FACE_PX);
    }
    out.face = { head, rig: { ...DEFAULT_RIG, ...auto.rig, ...(co.face?.rig ?? {}) }, mask: faceMask(b1, head), top };
  }
  SKIN_SET = null;
  castCache.set(who, out);
  return out;
};

const cardGeo = new THREE.PlaneGeometry(CW * PXM, CH * PXM);
// blue sweat drop (reference 16.7)
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
const DROPS: [number, number, number][] = [[478, 255, 0], [505, 330, 0.33], [112, 300, 0.66]];   // picture x, y, phase
const handGeo = new THREE.CircleGeometry(HAND_DISC, 28);
const capGeo = new THREE.CircleGeometry(ARM_HW, 14);
const INK = new THREE.Color(INK_BROWN);
// one flat ribbon: seg+1 pairs of vertices, rebuilt in place every frame (uv: u along, v across)
const ribbonGeo = (seg = ARM_SEG) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((seg + 1) * 6), 3));
  const uv = new Float32Array((seg + 1) * 4);
  for (let i = 0; i <= seg; i++) { uv[i * 4] = i / seg; uv[i * 4 + 1] = 0; uv[i * 4 + 2] = i / seg; uv[i * 4 + 3] = 1; }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const idx: number[] = [];
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx); return g;
};

// ---- legs as strokes (opts.legs) ----
const LEG_SEG = 16, LEG_HW = 0.011, FOOT_HW = 0.0125;
const HIP_DX = 0.075, FOOT_DX = 0.085, FOOT_LEN = 0.06;         // narrow stance, short feet (wide splayed feet looked like open soles)
export const STAND_HIP = (SOLE - HIP) * PXM;                     // hip height above the floor when standing (0.316 m)
export type LegStyle = { pants?: string; shoes?: string; boxers?: boolean };
let heartTex: THREE.Texture | null = null;
const boxerTex = () => {                                         // white boxer shorts with red hearts
  if (heartTex) return heartTex;
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#E8283C";
  const heart = (x: number, y: number, s: number) => { g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.5, y - s * 0.2, x - s * 0.6, y - s * 1.1, x, y - s * 0.3); g.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.5, y - s * 0.2, x, y + s * 0.9); g.fill(); };
  for (const [x, y] of [[24, 30], [88, 20], [56, 70], [112, 84], [20, 104], [84, 118]]) heart(x, y, 13);
  heartTex = tex(c); heartTex.wrapS = heartTex.wrapT = THREE.RepeatWrapping; return heartTex;
};
type LegMesh = { ink: THREE.Mesh; foot: THREE.Mesh; capA: THREE.Mesh; capB: THREE.Mesh; pants?: THREE.Mesh; boxer?: THREE.Mesh; boxerInk?: THREE.Mesh };

export class Player {
  group = new THREE.Group();
  hand: Record<Hand, V3> = { L: [0, 0, 0], R: [0, 0, 0] };
  R: V3;                                           // the character's right, world
  facing: 1 | -1;
  // ---- only with opts.legs: set these before update() ----
  sit: number;                                     // 0 = standing, 1 = sitting (in between = getting up / sitting down)
  seatY = 0.19;                                    // seat height above the floor point
  pantsDrop = 0;                                   // 0 = trousers on, 1 = down at the ankles
  squash = 1;                                      // body height scale (crouch < 1 < stretch)
  lean = 0;                                        // extra sideways lean of the whole card (rad)
  private walkPhase = 0; private walkK = 0; private walkDir = new THREE.Vector3(0, 0, 1);
  private pivot: THREE.Vector3; private row: number; private tilt: number;
  private meshes: THREE.Mesh[] = []; private mats: THREE.MeshBasicMaterial[] = [];
  private drops: THREE.Mesh[] = []; private dropMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  private seed: number;
  private arms: Record<Hand, { tube: THREE.Mesh; dot: THREE.Mesh; cap: THREE.Mesh }>;
  private armMat = new THREE.MeshBasicMaterial({ color: INK_BROWN, side: THREE.DoubleSide });
  private camPos = new THREE.Vector3();
  private v = new THREE.Vector3(); private tmp = new THREE.Vector3();
  private legsOn: boolean; private legStyle: LegStyle = {}; private legs: LegMesh[] = []; private pile?: THREE.Mesh;
  private mouth?: THREE.Mesh; private mouthMat?: THREE.MeshBasicMaterial; private talk?: (t: number) => number;
  private pantsMat?: THREE.MeshBasicMaterial; private shoeMat?: THREE.MeshBasicMaterial;
  private faceTrack?: FaceKey[]; private blinks: number[] = []; private blink4 = false; private faceMesh?: THREE.Mesh; private faceMat?: THREE.MeshBasicMaterial;
  private faceCanvas?: HTMLCanvasElement; private faceTex?: THREE.CanvasTexture;

  readonly life: Life; readonly tableY: number;
  // parent: where to add it; cast: buildCast(imgs, name); who: the name; pivot: hip point (seated) or feet point (standing);
  //   with opts.legs the pivot is always the FLOOR point under the person (see setPos), sitting or standing.
  // facing: +1 looks toward +z, -1 toward -z; seated: sits on a chair (hands rest on a table at opts.tableY).
  // opts.life = makeLife(faces, sweat) for face changes; opts.seed changes the idle sway so two people do not move the same.
  constructor(parent: THREE.Object3D, private cast: CastTex, readonly who: string, pivot: V3, facing: 1 | -1, readonly seated: boolean,
    opts: { life?: Life; seed?: number; tableY?: number; legs?: boolean | LegStyle; talk?: (t: number) => number; face?: FaceKey[]; blinks?: number[] | "auto"; lit?: boolean; flat?: boolean } = {}) {
    this.life = opts.life ?? makeLife([]); this.tableY = opts.tableY ?? 0.78;
    this.facing = facing; this.sit = seated ? 1 : 0;
    this.legsOn = !!opts.legs; if (typeof opts.legs === "object") this.legStyle = opts.legs;
    this.talk = opts.talk; this.flat = !!opts.flat;
    this.pivot = new THREE.Vector3(...pivot); this.row = seated ? HIP : SOLE;
    this.tilt = seated ? NECK : SOLE;                  // the card tilts about this picture row (neck when seated, feet when standing)
    this.R = [-facing, 0, 0];
    this.group.position.copy(this.pivot); this.group.position.y += (this.row - this.tilt) * PXM; parent.add(this.group);
    const cy = (this.tilt - CH / 2) * PXM;
    this.seed = opts.seed ?? 0.4;
    // depthWrite: the hat (i 4) writes depth too, so the lens blur sees it at the head's distance and keeps it sharp
    // (without depth it got the background's blur). headB is the face cross-fade layer and stays depth-free.
    ["body", "torso", "headA", "headB", "hat"].forEach((_, i) => {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, depthWrite: i < 3 || i === 4, side: THREE.DoubleSide });
      const m = new THREE.Mesh(cardGeo, mat);
      m.position.set(0, cy, 0.003 * i); m.frustumCulled = false; m.layers.set(NOINK);
      this.group.add(m); this.meshes.push(m); this.mats.push(mat);
    });
    if (this.talk && cast.mouths) {                    // talking mouth: rides with the head, above the face layers, below the hat
      this.mouthMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.02, depthWrite: false, side: THREE.DoubleSide });
      this.mouth = new THREE.Mesh(cardGeo, this.mouthMat); this.mouth.position.set(0, cy, 0.0105); this.mouth.frustumCulled = false;
      this.mouth.layers.set(NOINK); this.mouth.visible = false; this.group.add(this.mouth);
    }
    if (opts.face && cast.face && cast.blank) {          // drawn face: a canvas layer that rides on the head card
      this.faceTrack = [...opts.face].sort((a, b) => a.t - b.t);
      if (opts.blinks === "auto") { this.blinks = autoBlinks(this.faceTrack, this.seed); this.blink4 = true; }
      else this.blinks = opts.blinks ?? [];
      const h = cast.face.head, side = FACE_BOX * h.r * PXM;
      this.faceCanvas = mkCanvas(FACE_PX, FACE_PX);
      this.faceTex = new THREE.CanvasTexture(this.faceCanvas); this.faceTex.colorSpace = THREE.SRGBColorSpace; this.faceTex.anisotropy = 8;
      this.faceMat = new THREE.MeshBasicMaterial({ map: this.faceTex, transparent: true, alphaTest: 0.02, depthWrite: false, side: THREE.DoubleSide });
      this.faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(side, side), this.faceMat);
      this.faceMesh.position.set((h.cx - CW / 2) * PXM, (CH / 2 - h.cy) * PXM, 0.0012); this.faceMesh.frustumCulled = false;
      this.faceMesh.layers.set(NOINK); this.meshes[2].add(this.faceMesh);
    }
    this.dropMat.map = sweatTex();
    for (let k = 0; k < DROPS.length; k++) {
      const m = new THREE.Mesh(dropGeo, this.dropMat); m.frustumCulled = false; m.layers.set(NOINK); m.visible = false;
      this.group.add(m); this.drops.push(m);
    }
    const mk = () => {
      const tube = new THREE.Mesh(ribbonGeo(), this.armMat); tube.frustumCulled = false; tube.layers.set(NOINK);
      const dot = new THREE.Mesh(handGeo, this.armMat); dot.frustumCulled = false; dot.layers.set(NOINK);
      const cap = new THREE.Mesh(capGeo, this.armMat); cap.frustumCulled = false; cap.layers.set(NOINK);
      parent.add(tube, dot, cap); return { tube, dot, cap };
    };
    this.arms = { L: mk(), R: mk() };
    if (this.legsOn) {
      const st = this.legStyle, flat = (m: THREE.Mesh) => { m.frustumCulled = false; m.layers.set(NOINK); parent.add(m); return m; };
      if (st.pants) this.pantsMat = new THREE.MeshBasicMaterial({ color: st.pants, side: THREE.DoubleSide });
      this.shoeMat = st.shoes ? new THREE.MeshBasicMaterial({ color: st.shoes, side: THREE.DoubleSide }) : this.armMat;
      const footCap = new THREE.CircleGeometry(1, 16);
      for (let k = 0; k < 2; k++) {
        const L: LegMesh = {
          ink: flat(new THREE.Mesh(ribbonGeo(LEG_SEG), this.armMat)),
          foot: flat(new THREE.Mesh(ribbonGeo(1), this.shoeMat)), capA: flat(new THREE.Mesh(footCap, this.shoeMat)), capB: flat(new THREE.Mesh(footCap, this.shoeMat)),
        };
        if (st.pants) L.pants = flat(new THREE.Mesh(ribbonGeo(LEG_SEG), this.pantsMat!));
        if (st.boxers) { L.boxerInk = flat(new THREE.Mesh(ribbonGeo(LEG_SEG), this.armMat)); L.boxer = flat(new THREE.Mesh(ribbonGeo(LEG_SEG), new THREE.MeshBasicMaterial({ map: boxerTex(), side: THREE.DoubleSide }))); }
        this.legs.push(L);
      }
      if (st.pants) { this.pile = flat(new THREE.Mesh(ribbonGeo(6), this.pantsMat!)); this.pile.visible = false; }
    }
    if (opts.lit) {                                      // R3KNRF: take the scene light (cardlight.ts)
      this.mats.forEach((m, i) => litCard(m, i < 2 ? ZONE_CARD : ZONE_HEAD));
      if (this.mouthMat) litCard(this.mouthMat, ZONE_HEAD);
      if (this.faceMat) litCard(this.faceMat, ZONE_FACE);
      const flats = new Set<THREE.MeshBasicMaterial>([this.armMat]);
      if (this.pantsMat) flats.add(this.pantsMat);
      if (this.shoeMat) flats.add(this.shoeMat);
      for (const L of this.legs) if (L.boxer) flats.add(L.boxer.material as THREE.MeshBasicMaterial);
      for (const m of flats) litCard(m, null);
    }
  }

  // show / hide the whole person (card, arms, legs)
  setVisible(v: boolean) {
    this.group.visible = v;
    for (const h of ["L", "R"] as Hand[]) { const a = this.arms[h]; a.tube.visible = a.dot.visible = a.cap.visible = v; }
    for (const L of this.legs) for (const m of Object.values(L)) if (m) (m as THREE.Mesh).visible = v;
    if (this.pile && !v) this.pile.visible = false;
    this.hidden = !v;
  }
  private hidden = false;
  // ---- with opts.legs: where the person is and what the legs do ----
  setPos(x: number, y: number, z: number) { this.pivot.set(x, y, z); }                       // the floor point under the person
  get pos(): V3 { return [this.pivot.x, this.pivot.y, this.pivot.z]; }
  setFacing(f: 1 | -1) { this.facing = f; this.R = [-f, 0, 0]; }
  // phase: 2 pi per two steps (use distance * pi / 0.42); k: 0 = standing still, 1 = walking; dx, dz: walking direction
  setWalk(phase: number, k: number, dx = 0, dz = 1) {
    this.walkPhase = phase; this.walkK = k; const l = Math.hypot(dx, dz) || 1; this.walkDir.set(dx / l, 0, dz / l);
    const f = this.lookDir(); this.R = [-f.z, 0, f.x];
  }
  // where the person looks: straight along +-z (facing), or, while walking, the way they walk (so a walker seen from
  // ahead shows a full-width face, not a card squeezed side-on, and the shoulders and hands follow the walk)
  private look = new THREE.Vector3();
  // opts.flat (bank2, 2026-11-11): a flat card is NEVER squeezed. Call aimAt(camera position) every frame BEFORE setWalk
  // and the hands: the person then turns to face the camera (full width, front), or shows the full back when the
  // camera is behind him. Without opts.flat nothing changes (old videos keep the side squeeze).
  private flat = false; private aimOn = false; private aim = new THREE.Vector3();
  aimAt(x: number, y: number, z: number) { if (this.flat) { this.aim.set(x, y, z); this.aimOn = true; } }
  lookDir() {
    const w = this.legsOn ? smooth(0.15, 0.6, this.walkK) : 0;
    this.look.set(this.walkDir.x * w, 0, this.facing * (1 - w) + this.walkDir.z * w);
    if (this.look.lengthSq() < 1e-6) this.look.set(0, 0, this.facing);
    this.look.normalize();
    if (this.aimOn) {                                                  // flat: turn to the camera (front) or straight away from it (back)
      const dx = this.aim.x - this.pivot.x, dz = this.aim.z - this.pivot.z, l = Math.hypot(dx, dz);
      if (l > 1e-4) { const sg = this.look.x * dx + this.look.z * dz >= 0 ? 1 : -1; this.look.set((sg * dx) / l, 0, (sg * dz) / l); }
    }
    return this.look;
  }
  // height of the hips above the floor point right now
  get hipY() { return this.pivot.y + (STAND_HIP + (this.seatY - STAND_HIP) * this.sit) * (this.sit > 0.5 ? 1 : this.squash) + 0.016 * this.walkK * Math.abs(Math.sin(this.walkPhase)); }
  // a hand resting on the lap (seated on an open chair) / on the thigh
  lapHand(h: Hand): V3 { const s = h === "R" ? 1 : -1, rz = this.aimOn ? this.R[2] * 0.085 * s : 0; return [this.pivot.x + this.R[0] * 0.085 * s, this.hipY + 0.045, this.pivot.z + rz + this.facing * 0.11]; }

  // rest hands: on the table (seated) or hanging at the sides (standing)
  restHand(h: Hand): V3 {
    const s = h === "R" ? 1 : -1, p = this.pivot, f = this.facing;
    if (this.legsOn) {
      const Lk = this.aimOn ? this.lookDir() : null;                  // flat: hands at the sides as seen from the camera
      const st: V3 = Lk ? [p.x + this.R[0] * 0.21 * s + Lk.x * 0.1, this.hipY + 0.105, p.z + this.R[2] * 0.21 * s + Lk.z * 0.1]
        : [p.x + this.R[0] * 0.21 * s, this.hipY + 0.105, p.z + f * 0.1], la = this.lapHand(h), k = this.sit;
      return [st[0] + (la[0] - st[0]) * k, st[1] + (la[1] - st[1]) * k, st[2] + (la[2] - st[2]) * k];
    }
    return this.seated
      ? [p.x + this.R[0] * 0.2 * s, this.tableY + HAND_R + 0.002, p.z + f * 0.43]
      : [p.x + this.R[0] * 0.21 * s, p.y + 0.42, p.z + f * 0.1];
  }
  // centre of the head in the world (for cameras, sparkles, things above the head)
  headWorld(out = new THREE.Vector3()) { return this.group.localToWorld(out.set(0, (this.tilt - 300) * PXM, 0)); }

  shoulderWorld(h: Hand, out: THREE.Vector3) {
    const sp = this.cast.shoulder[h];
    const offX = (300 - sp.x) * PXM, offY = (this.tilt - sp.y) * PXM;  // body-fixed: along the character's right, and up
    const yaw = this.group.rotation.y;
    const hx = this.R[0] * offX, hz = this.R[2] * offX;
    const a = hx * Math.cos(yaw) - hz * Math.sin(yaw);                 // component along the card's local x
    const b = hx * Math.sin(yaw) + hz * Math.cos(yaw);                 // component toward the camera
    out.set(a, offY, b - 0.006);                                       // just behind the body card: the arm comes out from behind it
    return this.group.localToWorld(out);
  }

  update(t: number, cam: THREE.Camera, night: number, order: number) {
    if (this.legsOn) {                                                 // movable person: re-place the card from pos / sit
      const k = this.sit;
      this.tilt = SOLE + (NECK - SOLE) * k;
      this.group.position.set(this.pivot.x, this.hipY + (HIP - this.tilt) * PXM, this.pivot.z);
      const cy0 = (this.tilt - CH / 2) * PXM;
      this.meshes[0].position.y = cy0; this.meshes[1].position.y = cy0;
    }
    // billboard: yaw toward the camera, tilt back (limited) when the camera is above, so no paper edge ever shows
    const cy = (this.tilt - CH / 2) * PXM;
    const d = this.v.copy(cam.position).sub(this.tmp.copy(this.group.position).setY(this.group.position.y + cy));
    const hz = Math.hypot(d.x, d.z) || 1e-6;
    const maxPitch = this.legsOn ? 0.75 + (0.45 - 0.75) * this.sit : this.seated ? 0.45 : 0.75;
    const yaw = Math.atan2(d.x, d.z), pitch = Math.min(maxPitch, Math.max(-0.15, Math.atan2(d.y, hz)));
    const roll = this.legsOn ? this.lean + 0.035 * this.walkK * Math.sin(this.walkPhase) : 0;
    this.group.rotation.set(-pitch, yaw, roll, "YXZ");
    const L = this.lookDir();
    const c = (L.x * d.x + L.z * d.z) / hz;                            // +1 = camera in front of the character
    const s = L.x * Math.cos(yaw) - L.z * Math.sin(yaw);               // facing direction along the card's x (screen right)
    const front = c >= 0;
    this.group.scale.set(0.62 + 0.38 * smooth(0, 0.5, Math.abs(c)), this.legsOn ? this.squash : 1, 1);
    this.group.updateMatrixWorld(true);
    // layer slide (skill 6.9)
    const Wm = this.cast.W * PXM, dir = front ? 1 : -0.5;
    const [, torso, hA, hB, hat] = this.meshes;
    torso.position.x = 0.035 * Wm * s * dir;
    torso.scale.x = 1.12;                                              // shirt covers the bare body's sides
    // v4 idle life: a slow head tilt and sway so nobody is frozen (reference 16.7); the hat and drops ride with the head
    const tilt = 0.03 * Math.sin(t * 1.25 + this.seed * 3) + 0.015 * Math.sin(t * 0.53 + this.seed);
    const headX = 0.06 * Wm * s * dir + 0.004 * Math.sin(t * 0.9 + this.seed * 5);
    for (const m of [hA, hB, hat]) {
      m.rotation.z = tilt;
      m.position.x = headX;                                           // the card centre (picture row 500) is at the neck, so it pivots there
      m.position.y = cy + 0.002 * Math.sin(t * 1.7 + this.seed);
    }
    hA.scale.x = hB.scale.x = hat.scale.x = 1 - 0.12 * Math.abs(s);
    hA.scale.y = hat.scale.y = 1;
    // textures
    const v = this.seated || this.legsOn ? "seated" : "standing";
    const [mb, mt, ma, mbb] = this.mats;
    mb.map = this.cast.body[v];
    mt.map = front ? this.cast.torsoF[v] : this.cast.torsoB[v];
    if (this.faceMesh) this.faceMesh.visible = false;
    if (front && this.faceMesh && this.cast.blank && this.cast.face) {
      // drawn face: blank head + the morphing face; the head wobbles after every change
      ma.map = this.cast.blank; hB.visible = false; this.faceMesh.visible = true;
      const sh = this.talk ? this.talk(t) : -1;
      const open = sh < 0 ? 0 : [0.1, 0.35, 0.6, 1, 0.75, 0.5][Math.min(5, sh)];
      const ff = faceAt(this.faceTrack!, t, { blinks: this.blinks, blink4: this.blink4, talk: open > 0 ? () => open : undefined });
      const F = this.cast.face, k = FACE_PX / (FACE_BOX * F.head.r), g = this.faceCanvas!.getContext("2d")!;
      g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, FACE_PX, FACE_PX);
      drawFace(g, ff.face, FACE_PX / 2, FACE_PX / 2, F.head.r * k, F.rig);
      // brows may go over the hair (Arian's choice); set FACE_CLIP = true to keep the face on the skin only
      if (FACE_CLIP) { g.globalCompositeOperation = "destination-in"; g.drawImage(F.mask, 0, 0); g.globalCompositeOperation = "source-over"; }
      if (F.top) g.drawImage(F.top, 0, 0);          // moustache / beard over the drawn mouth
      this.faceTex!.needsUpdate = true;
      for (const m of [hA, hat]) { m.scale.x *= ff.sx; m.scale.y = ff.sy; m.rotation.z += ff.rot; }
      this.faceMesh.renderOrder = order + 2.5;
    } else if (front) {
      const fm = this.life.face(t);
      // while talking the face is the neutral one: its small mouth is what the talking-mouth cover paints out
      const talking = !!(this.mouth && this.talk && this.talk(t) >= 0);
      ma.map = this.cast.heads[talking ? "neutral" : fm.k >= 1 ? fm.to : fm.from];
      mbb.map = this.cast.heads[fm.to]; mbb.opacity = fm.k; hB.visible = !talking && fm.k > 0 && fm.k < 1;
    } else { ma.map = this.cast.headBack; hB.visible = false; }
    const hatT = front ? this.cast.hatF : (this.cast.hatB ?? this.cast.hatF);
    hat.visible = !!hatT; if (hatT) this.mats[4].map = hatT;
    hat.position.z = 0.012;
    // talking mouth (only from the front, only while talk(t) >= 0)
    if (this.mouth && this.mouthMat && this.cast.mouths) {
      const sh = front && this.talk && !this.faceMesh ? this.talk(t) : -1;
      this.mouth.visible = sh >= 0;
      if (sh >= 0) {
        this.mouthMat.map = this.cast.mouths[Math.min(this.cast.mouths.length - 1, sh)];
        this.mouth.rotation.z = hA.rotation.z; this.mouth.position.x = hA.position.x; this.mouth.position.y = hA.position.y; this.mouth.scale.x = hA.scale.x;
        this.mouth.renderOrder = order + 3.5;
      }
    }
    // sweat drops: slide down and fade in a loop while sweatAt > 0, only when the face is shown
    const sw = front ? this.life.sweat(t) : 0;
    this.drops.forEach((m, k) => {
      const [px, py, ph] = DROPS[k];
      const u = ((t * 1.1 + ph) % 1);
      m.visible = sw > 0.02;
      if (!m.visible) return;
      const sc = sw * (u < 0.15 ? u / 0.15 : 1) * (1 - 0.2 * u);
      m.scale.set(sc, sc, 1);
      m.position.set(headX + (px - 300) * PXM * hA.scale.x, cy + (CH / 2 - py) * PXM - 0.03 * u, 0.016);
    });
    for (const m of [...this.mats, this.dropMat]) m.color.setRGB(1 - 0.5 * night, 1 - 0.42 * night, 1 - 0.1 * night);
    if (this.mouthMat) this.mouthMat.color.copy(this.mats[2].color);
    if (this.faceMat) this.faceMat.color.copy(this.mats[2].color);
    this.armMat.color.setRGB(INK.r * (1 - 0.5 * night), INK.g * (1 - 0.42 * night), INK.b * (1 - 0.1 * night));
    this.meshes.forEach((m, i) => { m.renderOrder = order + i; });
    for (const m of this.drops) m.renderOrder = order + 6;
    // arms: flat ink strokes from the shoulder to the hand, always turned to the camera; the hand disc is centred
    // exactly on this.hand (so a held piece sits on it), nudged 3 mm toward the camera so it covers the stroke's end
    cam.getWorldPosition(this.camPos);
    for (const h of ["L", "R"] as Hand[]) {
      const S = this.shoulderWorld(h, new THREE.Vector3()), H = new THREE.Vector3(...this.hand[h]);
      const C = S.clone().lerp(H, 0.5); C.y -= 0.035;
      const curve = new THREE.QuadraticBezierCurve3(S, C, H);
      const arm = this.arms[h], pos = arm.tube.geometry.getAttribute("position") as THREE.BufferAttribute;
      const side = new THREE.Vector3(1, 0, 0), T = new THREE.Vector3(), V = new THREE.Vector3(), P = new THREE.Vector3(), n = new THREE.Vector3();
      for (let i = 0; i <= ARM_SEG; i++) {
        const u = i / ARM_SEG;
        curve.getPoint(u, P); curve.getTangent(u, T);
        V.copy(this.camPos).sub(P).normalize();
        n.crossVectors(T, V);
        if (n.lengthSq() > 1e-8) side.copy(n.normalize());               // keep the last side if the arm points at the camera
        pos.setXYZ(i * 2, P.x + side.x * ARM_HW, P.y + side.y * ARM_HW, P.z + side.z * ARM_HW);
        pos.setXYZ(i * 2 + 1, P.x - side.x * ARM_HW, P.y - side.y * ARM_HW, P.z - side.z * ARM_HW);
      }
      pos.needsUpdate = true; arm.tube.geometry.computeBoundingSphere();
      arm.cap.position.copy(S); arm.cap.quaternion.copy(cam.quaternion);
      V.copy(this.camPos).sub(H).normalize();
      arm.dot.position.copy(H).addScaledVector(V, 0.003); arm.dot.quaternion.copy(cam.quaternion);
    }
    if (this.legsOn && !this.hidden) this.updateLegs(cam, yaw, order);
  }

  // legs: flat strokes hip -> knee -> ankle + a foot stroke; trousers / boxer shorts are wider strokes on the same path
  private updateLegs(cam: THREE.Camera, yaw: number, order: number) {
    const bx = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));          // the card's right on screen
    const fw = new THREE.Vector3(0, 0, this.facing), up = new THREE.Vector3(0, 1, 0);
    const k = this.sit, wk = this.walkK, ph = this.walkPhase, floor = this.pivot.y;
    const hipY = this.hipY, legLen = STAND_HIP, thigh = legLen * 0.5;
    const toCam = new THREE.Vector3(), P = new THREE.Vector3(), T = new THREE.Vector3(), n = new THREE.Vector3(), side = new THREE.Vector3(1, 0, 0);
    const ankles: THREE.Vector3[] = [];
    // flat: the feet step toward / away from the camera (the way the body faces), so a walker crossing the screen does not cross his legs
    const step = this.aimOn ? this.lookDir().clone() : this.walkDir;
    this.legs.forEach((L, i) => {
      const sgn = i === 0 ? -1 : 1;                                          // screen left / right leg
      const hip = this.group.localToWorld(new THREE.Vector3(sgn * HIP_DX, (this.tilt - HIP) * PXM, -0.006));
      hip.y = hipY;
      const top = hip.clone().addScaledVector(up, 0.05);                     // wide strokes start a little higher, behind the shirt
      // standing foot (with walking: steps along walkDir, lifts)
      const swing = Math.cos(ph + (i === 0 ? 0 : Math.PI)), lift = Math.max(0, -Math.sin(ph + (i === 0 ? 0 : Math.PI)));   // the foot lifts while it swings forward
      const stand = new THREE.Vector3(this.pivot.x, floor + FOOT_HW, this.pivot.z).addScaledVector(bx, sgn * (FOOT_DX - 0.03 * wk))
        .addScaledVector(step, 0.17 * wk * swing); stand.y += 0.07 * wk * lift;
      const kneeStand = hip.clone().lerp(stand, 0.5).addScaledVector(step, 0.05 * wk * lift);
      // seated: thigh forward along the seat, shin down to the floor
      const kneeSit = hip.clone().addScaledVector(fw, thigh).addScaledVector(bx, -sgn * 0.01); kneeSit.y = hipY - 0.01;
      const footSit = kneeSit.clone().addScaledVector(fw, 0.02); footSit.y = Math.max(floor + FOOT_HW, hipY - (legLen - thigh)); footSit.addScaledVector(bx, -sgn * 0.012);
      const knee = kneeStand.lerp(kneeSit, k), foot = stand.lerp(footSit, k);
      ankles.push(foot.clone());
      const ctrl = knee.clone().multiplyScalar(2).addScaledVector(hip.clone().add(foot), -0.5);   // the curve passes through the knee
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
      strip(L.ink, 0, 1, LEG_HW, LEG_HW, 0); L.ink.renderOrder = order - 3;
      const dr = this.pantsDrop;
      if (L.pants) { strip(L.pants, -0.14 + (0.92 + 0.14) * dr, 0.97, 0.031 + 0.02 * dr, 0.029 + 0.03 * dr, 0.004); L.pants.renderOrder = order - 1; }
      if (L.boxer && L.boxerInk) {                                         // wide at the top so the two legs join into one pair of shorts
        L.boxer.visible = L.boxerInk.visible = dr > 0.02;
        if (dr > 0.02) { strip(L.boxerInk, -0.14, 0.37, 0.085, 0.06, 0.0015); strip(L.boxer, -0.14, 0.345, 0.078, 0.053, 0.003); L.boxer.renderOrder = order - 2; }
      }
      // foot: a short thick stroke from the ankle outward, round ends
      const shoe = !!this.legStyle.shoes, fh = shoe ? 0.019 : FOOT_HW;
      const fdir = bx.clone().multiplyScalar(sgn * 0.45).addScaledVector(this.aimOn ? (k < 0.5 ? step : fw) : this.walkK > 0.3 ? this.walkDir : fw, 0.9).normalize();
      const a = foot.clone(), b = foot.clone().addScaledVector(fdir, FOOT_LEN); if (shoe) { a.y = Math.max(a.y, floor + fh); b.y = Math.max(b.y, floor + fh); }
      const fp = L.foot.geometry.getAttribute("position") as THREE.BufferAttribute;
      toCam.copy(this.camPos).sub(a).normalize(); n.crossVectors(T.copy(b).sub(a).normalize(), toCam).normalize();
      for (const [j, q] of [[0, a], [1, b]] as [number, THREE.Vector3][]) {
        fp.setXYZ(j * 2, q.x + n.x * fh + toCam.x * 0.006, q.y + n.y * fh + toCam.y * 0.006, q.z + n.z * fh + toCam.z * 0.006);
        fp.setXYZ(j * 2 + 1, q.x - n.x * fh + toCam.x * 0.006, q.y - n.y * fh + toCam.y * 0.006, q.z - n.z * fh + toCam.z * 0.006);
      }
      fp.needsUpdate = true; L.foot.geometry.computeBoundingSphere();
      for (const [m, q] of [[L.capA, a], [L.capB, b]] as [THREE.Mesh, THREE.Vector3][]) { m.position.copy(q).addScaledVector(toCam, 0.006); m.quaternion.copy(cam.quaternion); m.scale.setScalar(fh); }
    });
    if (this.pile) {                                                     // the trousers bunched between the ankles
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

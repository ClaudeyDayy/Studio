// MORE PLACES (2026-11-20, first made for the Wald bomber video; all general, use them in any video).
// Plain rough colours on purpose: the final look (materials, light) is added in Blender. Shapes, sizes and spots matter here.
//
//   cloudSea({ y, size, gap })          a floor of puffy clouds to fly above (gap: [x, z, r] = a round hole in it)
//   airfield(out)                       runway, concrete apron with 4 parking spots, arched hangar (inside included),
//                                       control tower, windsock, fuel truck, tally board.  -> { group, spots, hangar, tally, ... }
//   hangar()                            arched metal hangar, open front, inside: board with photos + diagram, work lamps,
//                                       workbench, steel plates, drums. Used by airfield(); also alone.
//   office()                            1940s study room: desk, globe lamp, papers, chalkboard, shelves, window (night blue).
//   fantasyDiner()                      the fantasy space restaurant: violet sky dome, pink moon, cobalt floor, tables,
//                                       string lights, a lone open door to the dark.
//   board(kind)                         a drawing board that redraws: "tally" (count planes), "diagram" (a bomber with hit dots,
//                                       red circles k 0..1), "photos" (pinned photos + diagram). -> { group, draw(state) }
// Every builder: origin on the floor at its centre, front facing +z, returns named spots (world = add the group's position).
import * as THREE from "three";
import { MR, mkCanvas, canvasTex, noInk, noInkAll, onGround } from "./kit";
import { plankTex, plasterTex, brickTex, Outdoor } from "./outdoor";
import { road, flat, concreteTex, car, win, door } from "./places";

type V3 = [number, number, number];
let rs = 7; const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
const seed = (s: number) => { rs = (Math.floor(s * 7919) % 2147483646) + 1; };
const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, name = "") => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (name) m.name = name; return m; };
const bx = (w: number, h: number, d: number, col: string | THREE.Material, x: number, y: number, z: number, name = "", rough = 0.75) => mk(new THREE.BoxGeometry(w, h, d), typeof col === "string" ? MR(col, rough) : col, x, y, z, name);
const rep = (t: THREE.Texture, a: number, b: number) => { const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(a, b); return c; };
const glowTex = (() => { let t: THREE.Texture | null = null; return () => { if (t) return t; const c = mkCanvas(128, 128), g = c.getContext("2d")!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (t = canvasTex(c)); }; })();
/** a glowing bulb: emissive ball + soft additive halo (bloom catches it). Not a real light (cheap). */
export function bulb(r = 0.05, col = "#FFD08A", halo = 6) {
  const G = new THREE.Group(); G.name = "bulb";
  const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.2), toneMapped: false })); b.userData.noShadow = true; G.add(b);
  const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 })); h.scale.setScalar(r * halo); h.userData.camFree = true; G.add(h);
  noInkAll(h); return G;
}

// ---------------- cloud floor ----------------
function puffTex(top: string, under: string) {
  const c = mkCanvas(256, 160), g = c.getContext("2d")!;
  for (let i = 0; i < 9; i++) { const x = 40 + rnd() * 176, y = 60 + rnd() * 50, r = 26 + rnd() * 34, gr = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
    gr.addColorStop(0, top); gr.addColorStop(0.75, top); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  const sh = g.createLinearGradient(0, 80, 0, 160); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, under);
  g.globalCompositeOperation = "source-atop"; g.fillStyle = sh; g.fillRect(0, 0, 256, 160); return canvasTex(c);
}
/** A floor of puffy clouds to fly above. Sprites (always face the camera) + a soft base sheet so no gap shows the ground.
 *  gap: [x, z, r] leaves a round hole (a match for a round shape, or to see the ground through). camFree: the camera may pass. */
export function cloudSea(o: { y?: number; size?: number; count?: number; gap?: [number, number, number]; seed?: number; top?: string; under?: string } = {}) {
  seed(o.seed ?? 4); const G = new THREE.Group(); G.name = "cloudSea"; G.userData.camFree = true;
  const y = o.y ?? 0, S = o.size ?? 900, n = o.count ?? 420, top = o.top ?? "#FFFFFF", under = o.under ?? "#C9CFEA";
  const texs = [0, 1, 2, 3].map(() => puffTex(top, under));
  for (let i = 0; i < n; i++) {
    const x = (rnd() - 0.5) * S, z = (rnd() - 0.5) * S;
    if (o.gap && Math.hypot(x - o.gap[0], z - o.gap[1]) < o.gap[2] + 6) continue;
    const w = 26 + rnd() * 46, s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texs[i % 4], transparent: true, depthWrite: false, fog: true }));
    s.position.set(x, y + rnd() * 5, z); s.scale.set(w, w * 0.62, 1); s.name = "cloud"; G.add(s);
  }
  const base = new THREE.Mesh(new THREE.RingGeometry(o.gap ? o.gap[2] : 0.01, S * 0.6, 64, 1), new THREE.MeshStandardMaterial({ color: "#EEF0FA", roughness: 1 }));
  base.rotation.x = -Math.PI / 2; base.position.y = y - 2; if (o.gap) base.position.set(o.gap[0], y - 2, o.gap[1]); base.name = "cloudBase"; base.receiveShadow = true; G.add(base);
  noInkAll(G); return G;
}

// ---------------- boards that redraw ----------------
export type BoardKind = "tally" | "diagram" | "photos";
export type BoardState = { count?: number; dots?: number; circles?: number; chalk?: boolean };
/** the bomber seen from above, nose up, as a drawing. dots = hit marks (never on the engines or the cockpit), circles 0..1 */
function drawBomber(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, ink: string, st: BoardState) {
  g.save(); g.translate(cx, cy); g.scale(s, s); g.strokeStyle = ink; g.lineWidth = 3 / s * 1.4; g.lineJoin = "round";
  const P = (pts: number[][]) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); };
  g.beginPath(); g.ellipse(0, 0, 9, 62, 0, 0, 7); g.stroke();                                    // body
  P([[-9, -14], [-96, 4], [-96, 12], [-9, 10]]); P([[9, -14], [96, 4], [96, 12], [9, 10]]);         // wings
  P([[-6, 46], [-34, 54], [-34, 60], [-5, 58]]); P([[6, 46], [34, 54], [34, 60], [5, 58]]);       // tail
  const eng = [-62, -32, 32, 62]; for (const x of eng) { g.beginPath(); g.ellipse(x, -6, 5, 14, 0, 0, 7); g.stroke(); }
  if (st.dots) { seed(11); g.fillStyle = ink; let k = 0, tries = 0;
    while (k < st.dots && tries++ < 2000) { const z = rnd(); let x: number, y: number;
      if (z < 0.6) { x = (rnd() < 0.5 ? -1 : 1) * (14 + rnd() * 78); y = -4 + rnd() * 12 + Math.abs(x) * 0.12; if (eng.some((e) => Math.abs(x - e) < 9)) continue; }
      else if (z < 0.85) { x = (rnd() - 0.5) * 12; y = -10 + rnd() * 56; } else { x = (rnd() - 0.5) * 60; y = 50 + rnd() * 8; }
      g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); k++; } }
  if (st.circles) { g.strokeStyle = "#D8352E"; g.lineWidth = 4.5 / s * 1.4; const marks = [...eng.map((x) => [x, -6, 17]), [0, -50, 15]];
    marks.forEach(([x, y, r], i) => { const k = Math.max(0, Math.min(1, st.circles! * marks.length - i)); if (k <= 0) return; g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2.1); g.stroke(); }); }
  g.restore();
}
/** a board (chalk or paper) that can redraw itself; w x h metres. Origin: bottom middle, facing +z. */
export function board(kind: BoardKind, o: { w?: number; h?: number; chalk?: boolean; legs?: boolean } = {}) {
  const w = o.w ?? 2.4, h = o.h ?? 1.4, chalk = o.chalk ?? kind !== "photos", c = mkCanvas(1024, Math.round((1024 * h) / w)), g = c.getContext("2d")!, t = canvasTex(c);
  const G = new THREE.Group(); G.name = kind + "Board"; const y0 = o.legs ? 0.5 : 0;
  G.add(bx(w + 0.12, h + 0.12, 0.05, "#7A5636", 0, y0 + h / 2, 0, "boardFrame"));
  const face = mk(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), 0, y0 + h / 2, 0.03, "boardFace"); G.add(face);
  if (o.legs) for (const s of [-1, 1]) G.add(bx(0.07, y0 + h, 0.07, "#6A4A30", s * (w / 2 - 0.1), (y0 + h) / 2, -0.04, "boardLeg"));
  const W = c.width, H = c.height;
  const draw = (st: BoardState = {}) => {
    const ink = chalk ? "#F2EFE6" : "#2B1C1A";
    g.fillStyle = chalk ? "#2F4A3C" : "#C9A77A"; g.fillRect(0, 0, W, H);
    if (chalk) { g.globalAlpha = 0.12; for (let i = 0; i < 30; i++) { g.fillStyle = "#FFFFFF"; g.fillRect(rnd() * W, rnd() * H, 80 + rnd() * 200, 6 + rnd() * 20); } g.globalAlpha = 1; }
    if (kind === "tally") {
      seed(5); const n = st.count ?? 0;
      for (let i = 0; i < n; i++) { const col = i % 8, row = Math.floor(i / 8), x = 70 + col * 118, y = 90 + row * 120; drawPlaneIcon(g, x, y, 0.9, ink); g.strokeStyle = "#D8352E"; g.lineWidth = 7; g.beginPath(); g.moveTo(x - 40, y - 34); g.lineTo(x + 40, y + 34); g.stroke(); }
    } else if (kind === "diagram") drawBomber(g, W / 2, H / 2, Math.min(W / 230, H / 150), ink, st);
    else {   // photos: pinned photos round a paper diagram
      seed(9); drawBomber(g, W * 0.62, H * 0.5, Math.min(W / 380, H / 170), "#2B1C1A", { dots: st.dots ?? 40 });
      for (let i = 0; i < 6; i++) { const x = 40 + (i % 2) * 150, y = 30 + Math.floor(i / 2) * (H / 3.2), pw = 130, ph = 100;
        g.save(); g.translate(x + pw / 2, y + ph / 2); g.rotate((rnd() - 0.5) * 0.2); g.fillStyle = "#F4EFE6"; g.fillRect(-pw / 2, -ph / 2, pw, ph); g.fillStyle = "#6F86A0"; g.fillRect(-pw / 2 + 8, -ph / 2 + 8, pw - 16, ph - 28);
        drawPlaneIcon(g, 0, -6, 0.55, "#33302C"); g.fillStyle = "#C7362F"; g.beginPath(); g.arc(0, -ph / 2 + 4, 6, 0, 7); g.fill(); g.restore(); }
    }
    t.needsUpdate = true;
  };
  draw(); return { group: G, draw, size: [w, h] as [number, number], centre: [0, y0 + h / 2, 0.03] as V3 };
}
function drawPlaneIcon(g: CanvasRenderingContext2D, x: number, y: number, s: number, ink: string) {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = ink; g.beginPath(); g.ellipse(0, 0, 38, 6, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, -34); g.lineTo(12, -34); g.lineTo(8, 0); g.lineTo(12, 34); g.lineTo(6, 34); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-30, 0); g.lineTo(-36, -12); g.lineTo(-32, -12); g.lineTo(-24, 0); g.lineTo(-32, 12); g.lineTo(-36, 12); g.closePath(); g.fill(); g.restore();
}

// ---------------- hangar ----------------
function corrugated(col: string) {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!; for (let i = 0; i < 16; i++) { const gr = g.createLinearGradient(i * 16, 0, i * 16 + 16, 0); gr.addColorStop(0, shadeHex(col, 0.75)); gr.addColorStop(0.5, shadeHex(col, 1.12)); gr.addColorStop(1, shadeHex(col, 0.75)); g.fillStyle = gr; g.fillRect(i * 16, 0, 16, 256); }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const shadeHex = (hex: string, k: number) => "#" + new THREE.Color(hex).multiplyScalar(k).getHexString();
/** An arched metal hangar, open at the front (+z). w x d metres. Inside (an indoor group, outlined): the board with photos and
 *  the bomber diagram on the back wall, hanging work lamps, workbench, toolbox, steel plates, oil drums. */
export function hangar(o: { w?: number; d?: number; color?: string } = {}) {
  const w = o.w ?? 32, d = o.d ?? 26, r = w / 2, G = new THREE.Group(); G.name = "hangar";
  const shellT = corrugated(o.color ?? "#8D9188"), shellM = new THREE.MeshStandardMaterial({ map: rep(shellT, 30, d / 2), roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
  const arch = new THREE.CylinderGeometry(r, r, d, 48, 1, true, Math.PI / 2, Math.PI); arch.rotateX(Math.PI / 2);
  G.add(noInk(mk(arch, shellM, 0, 0, 0, "hangarShell")));
  const back = new THREE.CircleGeometry(r, 48, 0, Math.PI); G.add(noInk(mk(back, new THREE.MeshStandardMaterial({ map: rep(shellT, 14, 1), roughness: 0.7, side: THREE.DoubleSide }), 0, 0, -d / 2, "hangarBack")));
  const ow = w * 0.8, oh = r * 0.78, front = new THREE.Shape();   // the front wall round the big door opening
  front.moveTo(-r, 0); front.lineTo(-ow / 2, 0); front.lineTo(-ow / 2, oh); front.lineTo(ow / 2, oh); front.lineTo(ow / 2, 0); front.lineTo(r, 0); front.absarc(0, 0, r, 0, Math.PI, false);
  const fg = new THREE.ShapeGeometry(front, 24); G.add(noInk(mk(fg, new THREE.MeshStandardMaterial({ color: "#7E837A", roughness: 0.7, side: THREE.DoubleSide }), 0, 0, d / 2, "hangarFront")));
  G.add(bx(ow + 0.6, 0.5, 0.4, "#5E625B", 0, oh + 0.25, d / 2 + 0.1, "doorBeam"));
  for (const s of [-1, 1]) G.add(bx(5.5, oh, 0.25, "#7A7F76", s * (ow / 2 + 2.6), oh / 2, d / 2 + 0.35, "slideDoor"));
  G.add(onGround(mk(new THREE.PlaneGeometry(w - 0.4, d - 0.2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: rep(concreteTex("#B8B3A8"), w / 2, d / 2), roughness: 0.95 }), 0, 0.01, 0, "hangarFloor"), 2));
  // inside: an indoor group (keeps its outlines)
  const I = new THREE.Group(); I.name = "hangarInside"; I.userData.indoor = true; G.add(I);
  const bd = board("photos", { w: 5, h: 2.4, chalk: false }); bd.group.position.set(0, 0.9, -d / 2 + 0.25); I.add(bd.group);
  I.add(bx(5.6, 0.9, 0.2, "#6A5A48", 0, 0.45, -d / 2 + 0.2, "boardStand"));
  const lamps: V3[] = [];
  for (const [x, z] of [[-7, -6], [7, -6], [-7, 5], [7, 5], [0, -10]]) {
    const y = 6.5; I.add(bx(0.02, r - y, 0.02, "#2E2A30", x, y + (r - y) / 2, z, "lampCord"));
    const shade = mk(new THREE.ConeGeometry(0.55, 0.4, 16, 1, true), new THREE.MeshStandardMaterial({ color: "#3E5A44", roughness: 0.5, side: THREE.DoubleSide }), x, y, z, "lampShade"); I.add(shade);
    const b = bulb(0.14, "#FFC36A", 10); b.position.set(x, y - 0.18, z); I.add(b); lamps.push([x, y - 0.2, z]);
  }
  I.add(bx(3, 0.08, 0.8, "#8A6A48", -w / 2 + 3.5, 0.75, -6, "workbench")); for (const s of [-1, 1]) I.add(bx(0.08, 0.75, 0.7, "#5A4632", -w / 2 + 3.5 + s * 1.4, 0.375, -6, "benchLeg"));
  I.add(bx(0.7, 0.5, 0.4, "#C7362F", -w / 2 + 3.0, 1.04, -6.1, "toolbox"));
  for (let k = 0; k < 6; k++) I.add(bx(1.0, 0.03, 0.7, "#A9AEB4", w / 2 - 3.5, 0.03 + k * 0.035, -7, "steelPlate", 0.4));
  for (let k = 0; k < 4; k++) I.add(mk(new THREE.CylinderGeometry(0.3, 0.3, 0.85, 16), MR(k % 2 ? "#3F6FA8" : "#B5483C", 0.6), w / 2 - 2 - (k % 2) * 0.7, 0.425, 6 + Math.floor(k / 2) * 0.7, "drum"));
  return { group: G, board: bd, lamps, inside: { boardFront: [0, 0, -d / 2 + 4] as V3, wingSpot: [0, 0, 0] as V3, door: [0, 0, d / 2] as V3 }, size: [w, r, d] as V3 };
}

// ---------------- airfield ----------------
/** A 1940s airfield. Runway along x (south side), concrete apron with 4 parking spots, the hangar behind it opening onto the apron,
 *  a control tower, windsock, fuel truck, and a tally board. Grass comes from ground(). out: for the lamps (optional). */
export function airfield(out: Outdoor | null, o: { runway?: number } = {}) {
  const G = new THREE.Group(); G.name = "airfield";
  const rw = road({ length: o.runway ?? 500, width: 14, centre: "dash" }); rw.position.set(0, 0, -45); G.add(rw);
  const ta = road({ length: 30, width: 8, centre: "none", edges: false }); ta.rotation.y = Math.PI / 2; ta.position.set(-70, 0, -25); G.add(ta);
  G.add(flat(110, 34, concreteTex("#C8C2B5"), 1, 0, 0, "apron"));
  const hg = hangar(); hg.group.position.set(0, 0, 30); hg.group.rotation.y = Math.PI; G.add(hg.group);   // open front toward the apron and runway
  // tower: two storeys, glass cab on top, outlined details
  const T = new THREE.Group(); T.name = "tower"; T.position.set(62, 0, 4); G.add(T);
  T.add(noInk(bx(5, 4.2, 5, new THREE.MeshStandardMaterial({ map: rep(plasterTex("#E6E0D2"), 2, 2), roughness: 0.9 }), 0, 2.1, 0, "towerBody")));
  T.add(bx(5.6, 0.2, 5.6, "#F4EFE6", 0, 4.3, 0, "towerDeck")); T.add(bx(3.6, 1.3, 3.6, "#8DB9D2", 0, 5.05, 0, "towerCab", 0.2)); T.add(bx(4, 0.2, 4, "#5B5F66", 0, 5.8, 0, "towerRoof"));
  for (const [x, z] of [[-2.8, 2.8], [2.8, 2.8], [-2.8, -2.8], [2.8, -2.8]]) T.add(bx(0.06, 0.5, 0.06, "#2E2A30", x, 4.65, z, "rail"));
  const wn = win(); wn.position.set(-1.2, 2.5, 2.51); T.add(wn); const wn2 = win(); wn2.position.set(1.2, 2.5, 2.51); T.add(wn2);
  const dr = door({ color: "#3F5A4A" }); dr.position.set(0, 0, 2.51); T.add(dr);
  // windsock
  const ws = new THREE.Group(); ws.name = "windsock"; ws.position.set(-60, 0, 8); G.add(ws);
  ws.add(bx(0.08, 4, 0.08, "#E8E2D2", 0, 2, 0, "sockPole")); const sock = mk(new THREE.ConeGeometry(0.3, 1.6, 12, 1, true), MR("#E2702E", 0.7), 0.85, 3.8, 0, "sock"); sock.rotation.z = Math.PI / 2 + 0.25; ws.add(sock);
  // fuel truck + jeep-ish pickup
  const ft = car("#5E6B3A", "pickup"); ft.position.set(-40, 0, 12); ft.rotation.y = 0.3; G.add(ft);
  // tally board on legs, by the tower (faces the apron)
  const tb = board("tally", { w: 3.2, h: 1.8, legs: true }); tb.group.position.set(48, 0, 8); tb.group.rotation.y = Math.PI - 0.35;   // faces the apron G.add(tb.group);
  // 4 parking spots on the apron (bomber centre, nose toward -z: the runway)
  const spots: V3[] = [[-39, 0, -2], [-13, 0, -2], [13, 0, -2], [39, 0, -2]];
  for (const [x, , z] of spots) for (const s of [-1, 1]) G.add(flat(0.25, 14, concreteTex("#E8D9A0"), 2, x + s * 6, z, "spotLine"));
  return { group: G, spots, hangar: hg, tally: tb, tower: [62, 0, 4] as V3, runway: { z: -45, y: 0 }, truck: [-40, 0, 12] as V3 };
}

// ---------------- office (Wald's study, 1940s) ----------------
/** A study room: plaster walls with a wood wainscot, plank floor, window (night blue outside), desk with a round globe lamp
 *  (a round shape for matches), paper piles, chalkboard (bomber diagram that redraws), bookshelf, clock, chair, coat rack.
 *  Room w x d (inside), front open toward +z for the camera. */
export function office(o: { w?: number; d?: number; h?: number; wall?: string } = {}) {
  const w = o.w ?? 6, d = o.d ?? 5, h = o.h ?? 2.5, G = new THREE.Group(); G.name = "office"; G.userData.indoor = true;
  const wallM = new THREE.MeshStandardMaterial({ map: rep(plasterTex(o.wall ?? "#B9C7A6"), w / 3, h / 3), roughness: 0.95 });
  const floorM = new THREE.MeshStandardMaterial({ map: rep(plankTex("#8A6242", 8), d / 2, w / 2), roughness: 0.8 });
  G.add(mk(new THREE.BoxGeometry(w, 0.05, d), floorM, 0, -0.025, 0, "floor"));
  G.add(mk(new THREE.BoxGeometry(w, 0.05, d), MR("#E8E0CC", 0.95), 0, h + 0.025, 0, "ceiling"));
  G.add(mk(new THREE.BoxGeometry(w, h, 0.1), wallM, 0, h / 2, -d / 2 - 0.05, "backWall"));
  for (const s of [-1, 1]) G.add(mk(new THREE.BoxGeometry(0.1, h, d), wallM, s * (w / 2 + 0.05), h / 2, 0, s < 0 ? "leftWall" : "rightWall"));
  G.add(bx(w, 0.8, 0.03, "#6A4A32", 0, 0.4, -d / 2 + 0.015, "wainscot")); for (const s of [-1, 1]) G.add(bx(0.03, 0.8, d, "#6A4A32", s * (w / 2 - 0.015), 0.4, 0, "wainscot"));
  // window in the left wall: night-blue sky plane behind it
  const wn = win({ w: 1.0, h: 1.2, trim: "#E8E0CC" }); wn.position.set(-w / 2 + 0.02, 1.45, -0.6); wn.rotation.y = Math.PI / 2; G.add(wn);
  const sky = mk(new THREE.PlaneGeometry(1.4, 1.6), new THREE.MeshBasicMaterial({ color: "#23338A" }), -w / 2 - 0.3, 1.45, -0.6, "nightOutside"); sky.rotation.y = Math.PI / 2; sky.castShadow = false; G.add(sky);
  // desk, chair, lamp, papers, model stand
  const desk: V3 = [1.0, 0, -1.2];
  G.add(bx(1.9, 0.07, 0.9, "#7A4E30", desk[0], 0.72, desk[2], "desk"));
  for (const sx of [-1, 1]) G.add(bx(0.5, 0.68, 0.84, "#6A4228", desk[0] + sx * 0.68, 0.34, desk[2], "deskPedestal"));
  const lampAt: V3 = [desk[0] + 0.62, 1.12, desk[2] - 0.2];
  G.add(mk(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 18), MR("#C99A3C", 0.3, 0.7), lampAt[0], 0.775, lampAt[2], "lampBase"));
  G.add(mk(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), MR("#C99A3C", 0.3, 0.7), lampAt[0], 0.9, lampAt[2], "lampStem"));
  const globe = bulb(0.13, "#FFD79A", 7); globe.position.set(...lampAt); G.add(globe);
  seed(3); for (let p = 0; p < 4; p++) { const n = 5 + Math.floor(rnd() * 12), px = desk[0] - 0.65 + p * 0.33, pz = desk[2] + (p % 2 ? 0.15 : -0.1);
    for (let k = 0; k < n; k++) G.add(bx(0.26, 0.012, 0.34, k % 4 ? "#F2ECDD" : "#E4D7B6", px + (rnd() - 0.5) * 0.03, 0.762 + k * 0.013, pz + (rnd() - 0.5) * 0.03, "paper", 0.9)); }
  G.add(bx(0.48, 0.05, 0.45, "#5A3A26", desk[0], 0.45, desk[2] + 0.75, "chairSeat")); G.add(bx(0.48, 0.5, 0.05, "#5A3A26", desk[0], 0.72, desk[2] + 0.98, "chairBack"));
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) G.add(bx(0.04, 0.45, 0.04, "#3E2818", desk[0] + a * 0.2, 0.22, desk[2] + 0.75 + b * 0.19, "chairLeg"));
  // chalkboard on the back wall (left part)
  const cb = board("diagram", { w: 2.4, h: 1.3, chalk: true }); cb.group.position.set(-1.4, 0.95, -d / 2 + 0.04); G.add(cb.group);
  G.add(bx(2.4, 0.04, 0.1, "#7A5636", -1.4, 0.9, -d / 2 + 0.1, "chalkTray"));
  // bookshelf, clock, coat rack, radiator, diploma
  const shelf = new THREE.Group(); shelf.name = "bookshelf"; shelf.position.set(w / 2 - 0.25, 0, 0.6); G.add(shelf);
  shelf.add(bx(0.35, 2.0, 1.2, "#6A4228", 0, 1.0, 0, "shelfBody"));
  seed(8); const bcols = ["#8E2F2B", "#2F4466", "#3E5A44", "#C99A3C", "#5A3A6A", "#B5483C"];
  for (let r2 = 0; r2 < 4; r2++) { let z = -0.52; while (z < 0.5) { const bw = 0.05 + rnd() * 0.06, bh = 0.26 + rnd() * 0.12; shelf.add(bx(0.22, bh, bw, bcols[Math.floor(rnd() * 6)], -0.06, 0.2 + r2 * 0.46 + bh / 2, z + bw / 2, "book")); z += bw + 0.005; } }
  const clock = mk(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 28), MR("#F4EFE6", 0.6), 1.0, 1.95, -d / 2 + 0.03, "clock"); clock.rotation.x = Math.PI / 2; G.add(clock);
  G.add(bx(0.02, 0.15, 0.02, "#2B1C1A", 1.0, 1.99, -d / 2 + 0.065, "clockHand"));
  G.add(bx(0.45, 0.35, 0.03, "#C99A3C", 2.1, 1.6, -d / 2 + 0.02, "diploma")); G.add(bx(0.37, 0.27, 0.01, "#F2ECDD", 2.1, 1.6, -d / 2 + 0.04, "diplomaPaper"));
  G.add(bx(0.05, 1.5, 0.05, "#3E2818", -w / 2 + 0.4, 0.75, 1.4, "coatRack")); G.add(mk(new THREE.CylinderGeometry(0.16, 0.18, 0.1, 16), MR("#4A3A30", 0.7), -w / 2 + 0.4, 1.55, 1.4, "hatOnRack"));
  G.add(bx(0.9, 0.5, 0.12, "#C9C3B4", -w / 2 + 0.12, 0.3, 1.0, "radiator"));
  return { group: G, board: cb, lamp: lampAt, desk, chair: [desk[0], 0, desk[2] + 0.75] as V3, boardFront: [-1.4, 0, -d / 2 + 1.1] as V3,
    colleagues: [[-2.3, 0, -0.6], [-0.4, 0, -0.4]] as V3[], size: [w, h, d] as V3 };
}

// ---------------- the fantasy diner ----------------
const FANTASY_VS = "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const FANTASY_FS = "varying vec3 vP; void main(){ vec3 d = normalize(vP); float h = clamp(d.y, 0.0, 1.0);" +
  " vec3 c = mix(vec3(0.94,0.48,0.78), vec3(0.79,0.31,0.85), smoothstep(0.0, 0.18, h)); c = mix(c, vec3(0.35,0.17,0.78), smoothstep(0.18, 0.6, h));" +
  " if (d.y < 0.0) c = vec3(0.94,0.48,0.78); gl_FragColor = vec4(c, 1.0); }";
/** The fantasy space (his palette): violet -> magenta -> hot-pink sky dome, a huge pale pink moon, stars, a cobalt floor,
 *  round tables with white cloths and chairs, string lights on poles, a counter, and a lone open door to the dark at the back. */
export function fantasyDiner(o: { tables?: number; walls?: string } = {}) {   // walls: colour of a back wall round the door (opt-in, 2026-11-26)
  const G = new THREE.Group(); G.name = "fantasyDiner"; G.userData.indoor = true;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: true, vertexShader: FANTASY_VS, fragmentShader: FANTASY_FS }));
  dome.name = "fantasySky"; dome.userData.camFree = true; dome.userData.noShadow = true; G.add(noInk(dome));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(22, 48), new THREE.MeshBasicMaterial({ color: "#FFE9F2", toneMapped: false })); moon.position.set(-25, 34, -100); moon.lookAt(0, 2, 0); moon.name = "moon"; G.add(noInk(moon));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: "#FFD3E8", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 })); halo.scale.setScalar(80); halo.position.copy(moon.position).multiplyScalar(0.98); G.add(noInk(halo));
  seed(21); const sp: number[] = []; for (let i = 0; i < 500; i++) { const a = rnd() * 6.283, e = 0.15 + rnd() * 1.3; sp.push(Math.cos(a) * Math.cos(e) * 110, Math.sin(e) * 110, Math.sin(a) * Math.cos(e) * 110); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3)); G.add(noInk(new THREE.Points(sg, new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.5, sizeAttenuation: true }))));
  G.add(noInk(mk(new THREE.CircleGeometry(40, 64).rotateX(-Math.PI / 2), MR("#2F5FE0", 0.25, 0.1), 0, 0, 0, "cobaltFloor")));
  const tables: V3[] = [], n = o.tables ?? 5, spots: V3[] = [];
  for (let i = 0; i < n; i++) { const x = (i % 3 - 1) * 2.6 + (Math.floor(i / 3) ? 1.3 : 0), z = -Math.floor(i / 3) * 2.6 + 0.4; tables.push([x, 0, z]);
    G.add(mk(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 24), MR("#FFFFFF", 0.8), x, 0.68, z, "tableTop"));
    G.add(mk(new THREE.CylinderGeometry(0.52, 0.56, 0.32, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.9, side: THREE.DoubleSide }), x, 0.54, z, "tableCloth"));
    G.add(mk(new THREE.CylinderGeometry(0.04, 0.06, 0.66, 10), MR("#2E2A30", 0.5), x, 0.33, z, "tableLeg"));
    const cnd = bulb(0.035, "#FFB45A", 8); cnd.position.set(x, 0.78, z); G.add(cnd);
    for (const s of [-1, 1]) { const cx = x + s * 0.75; G.add(bx(0.4, 0.05, 0.4, "#E2702E", cx, 0.42, z, "chair")); G.add(bx(0.05, 0.45, 0.4, "#E2702E", cx + s * 0.2, 0.67, z, "chairBack")); spots.push([cx, 0, z]); } }
  // string lights between 4 poles
  const poles: V3[] = [[-5, 0, 2.5], [5, 0, 2.5], [5, 0, -5], [-5, 0, -5]];
  for (const [x, , z] of poles) G.add(bx(0.08, 3.2, 0.08, "#2E2A30", x, 1.6, z, "lightPole"));
  for (let i = 0; i < 4; i++) { const a = poles[i], b = poles[(i + 1) % 4];
    for (let k = 1; k < 12; k++) { const u = k / 12, sag = Math.sin(u * Math.PI) * 0.45, bl = bulb(0.05, k % 3 ? "#FFD08A" : "#FF9AC8", 7); bl.position.set(a[0] + (b[0] - a[0]) * u, 3.1 - sag, a[2] + (b[2] - a[2]) * u); G.add(bl); } }
  // counter for the owner, and the lone open door at the back (where customers leave into the dark)
  G.add(bx(2.4, 0.9, 0.6, "#F07AC8", 3.6, 0.45, -6.5, "counter")); G.add(bx(2.5, 0.06, 0.7, "#FFFFFF", 3.6, 0.92, -6.5, "counterTop"));
  const doorAt: V3 = [-2.2, 0, -8];
  G.add(bx(0.12, 1.75, 0.15, "#F4EFE6", doorAt[0] - 0.46, 0.875, doorAt[2], "doorFrame")); G.add(bx(0.12, 1.75, 0.15, "#F4EFE6", doorAt[0] + 0.46, 0.875, doorAt[2], "doorFrame")); G.add(bx(1.04, 0.12, 0.15, "#F4EFE6", doorAt[0], 1.81, doorAt[2], "doorFrame"));
  const dark = mk(new THREE.PlaneGeometry(0.8, 1.7), new THREE.MeshBasicMaterial({ color: "#1A0F3A" }), doorAt[0], 0.86, doorAt[2] - 0.01, "doorDark"); dark.castShadow = false; G.add(dark);
  const leaf = bx(0.78, 1.68, 0.05, "#8E2F2B", 0, 0.84, 0.39, "doorLeaf"); const hinge = new THREE.Group(); hinge.position.set(doorAt[0] - 0.4, 0, doorAt[2]); hinge.rotation.y = -1.2; leaf.position.set(0.39, 0.84, 0); hinge.add(leaf); G.add(hinge);
  if (o.walls) {   // a back wall with the door in it (old videos: no wall, the door stands alone)
    const H = 2.6, x0 = -7.5, x1 = 7.5, gl = doorAt[0] - 0.52, gr = doorAt[0] + 0.52, gt = 1.87, z = doorAt[2] - 0.02;
    G.add(bx(gl - x0, H, 0.14, o.walls, (x0 + gl) / 2, H / 2, z, "backWall")); G.add(bx(x1 - gr, H, 0.14, o.walls, (gr + x1) / 2, H / 2, z, "backWall"));
    G.add(bx(gr - gl, H - gt, 0.14, o.walls, doorAt[0], (gt + H) / 2, z, "backWall"));
  }
  return { group: G, tables, seats: spots, owner: [3.6, 0, -5.8] as V3, door: doorAt, beyondDoor: [doorAt[0], 0, doorAt[2] - 6] as V3 };
}

// LOG (newest first)
// 2026-11-20  Hangar turned to open onto the apron; tally board turned to face it.
// 2026-11-20  File created: cloudSea, board (tally / diagram / photos), hangar, airfield, office, fantasyDiner, bulb. Rough colours (Blender adds the look).

// PROPS for the Vietnam tunnels video (video-only, not library). Real materials (MR / MTR), no outlines.
// World units: metres; people are 1.2 m tall (heads about 0.53 m wide). Vehicles face +z (nose / front toward +z).
// Every maker returns a THREE.Group with castShadow/receiveShadow set. Moving parts are named children (rotor, lid ...).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MR, MTR, mkCanvas, canvasTex } from "../../engine/kit";

// ---------------------------------------------------------------- helpers
export const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o;
};
const grp = (...c: THREE.Object3D[]) => { const g = new THREE.Group(); c.forEach((o) => g.add(o)); return g; };
let SEED = 7; const rnd = () => ((SEED = (SEED * 16807) % 2147483647) / 2147483647);
const lathe = (pts: [number, number][], seg = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const along = (g: THREE.BufferGeometry) => g.rotateX(Math.PI / 2);                    // a y-axis shape -> lying along +z
const shapeGeo = (pts: [number, number][], depth: number, bevel = 0.02) => {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
  g.translate(0, 0, -depth / 2); return g;
};
const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, rep: [number, number] = [1, 1]) => {
  const c = mkCanvas(w, h); draw(c.getContext("2d")!); const t = canvasTex(c);
  if (rep[0] !== 1 || rep[1] !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  return t;
};
const blobs = (g: CanvasRenderingContext2D, w: number, h: number, cols: string[], n: number, r0: number, r1: number) => {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length]; g.beginPath();
    const x = rnd() * w, y = rnd() * h, r = r0 + rnd() * (r1 - r0), a = rnd() * 6;
    for (let k = 0; k < 9; k++) { const t = (k / 9) * Math.PI * 2, rr = r * (0.6 + 0.4 * Math.sin(t * 2 + a) + 0.15 * rnd()); g.lineTo(x + Math.cos(t) * rr * 1.4, y + Math.sin(t) * rr); }
    g.closePath(); g.fill();
  }
};
const speckle = (g: CanvasRenderingContext2D, w: number, h: number, n: number, dark: string, light: string) => {
  for (let i = 0; i < n; i++) { g.fillStyle = rnd() < 0.5 ? dark : light; g.globalAlpha = 0.05 + 0.1 * rnd(); g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + 4 * rnd(), 0, 7); g.fill(); }
  g.globalAlpha = 1;
};

// ---------------------------------------------------------------- shared textures and materials
const cache: Record<string, any> = {};
const once = <T>(k: string, f: () => T): T => (cache[k] ??= f());
export const MAT = {
  olive: () => once("olive", () => MR("#556431", 0.62)),
  oliveDark: () => once("oliveD", () => MR("#3E4A22", 0.7)),
  steel: () => once("steel", () => MR("#5A5E62", 0.4, 0.7)),
  black: () => once("black", () => MR("#202226", 0.5, 0.2)),
  rubber: () => once("rubber", () => MR("#26262A", 0.9)),
  glass: () => once("glass", () => MR("#1B2C46", 0.08, 0.4)),
  wood: () => once("wood", () => MTR(tex(256, 256, (g) => { g.fillStyle = "#8A5A34"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${rnd() < 0.5 ? "60,35,18" : "180,130,80"},0.35)`; g.lineWidth = 1 + 2 * rnd(); const y = rnd() * 256; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + 6 * rnd(), 170, y - 6 * rnd(), 256, y + 3); g.stroke(); } }, [1, 1]), 0.75)),
  bamboo: () => once("bamboo", () => MR("#C9A956", 0.6)),
  brass: () => once("brass", () => MR("#C9962E", 0.35, 0.8)),
  clay: () => once("clay", () => MTR(tex(256, 256, (g) => { g.fillStyle = "#A8603C"; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 900, "#5E2E18", "#E0A070"); for (let i = 0; i < 30; i++) { g.strokeStyle = "rgba(90,45,22,0.35)"; g.lineWidth = 2; g.beginPath(); const x = rnd() * 256; g.moveTo(x, 0); g.lineTo(x + 20 * (rnd() - 0.5), 256); g.stroke(); } }, [2, 2]), 0.95)),
  canvas: () => once("canvas", () => MTR(tex(256, 256, (g) => { g.fillStyle = "#6A7440"; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 700, "#3F4626", "#9AA466"); g.strokeStyle = "rgba(40,46,20,0.5)"; g.lineWidth = 3; for (const x of [0, 128]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } }, [2, 1]), 0.92)),
  burlap: () => once("burlap", () => MTR(tex(128, 128, (g) => { g.fillStyle = "#B49A68"; g.fillRect(0, 0, 128, 128); g.globalAlpha = 0.25; for (let i = 0; i < 128; i += 3) { g.fillStyle = "#6F5B36"; g.fillRect(i, 0, 1, 128); g.fillRect(0, i, 128, 1); } g.globalAlpha = 1; speckle(g, 128, 128, 200, "#5C4A2A", "#E4CF9A"); }, [3, 2]), 0.97)),
  camo: () => once("camo", () => MTR(tex(512, 512, (g) => { g.fillStyle = "#BFA676"; g.fillRect(0, 0, 512, 512); blobs(g, 512, 512, ["#5E6B3A", "#3D4A2C", "#5E6B3A"], 46, 30, 70); }, [1, 1]), 0.55, 0.15)),
};
// the US star roundel (white star on a blue disc, white bars) as a flat decal
export const starDecal = (size: number) => {
  const t = tex(256, 128, (g) => {
    g.fillStyle = "#F4F2EC"; g.fillRect(8, 46, 240, 36); g.fillStyle = "#1E3A7A"; g.fillRect(8, 52, 240, 24);
    g.fillStyle = "#F4F2EC"; g.fillRect(16, 56, 224, 16);
    g.beginPath(); g.arc(128, 64, 54, 0, 7); g.fillStyle = "#1E3A7A"; g.fill();
    g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 20 : 50, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(128 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.closePath(); g.fillStyle = "#F4F2EC"; g.fill();
  });
  const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, roughness: 0.6 });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size), m); return o;
};

// ---------------------------------------------------------------- vehicles
/** Jet fighter, about 9.5 m long, nose toward +z, belly at y = 0 (origin on the centre line). Child "flame". */
export function jet() {
  const camo = MAT.camo(), g = new THREE.Group();
  g.add(mesh(along(lathe([[0.3, 3.9], [0.44, 3.2], [0.52, 2.2], [0.55, 0.8], [0.55, -2.0], [0.5, -3.4], [0.44, -4.5], [0, -4.5]])), camo));
  g.add(mesh(along(lathe([[0, 4.9], [0.1, 4.7], [0.22, 4.3], [0.3, 3.9], [0, 3.9]])), MR("#3A3D40", 0.45, 0.3)));
  const gl = new THREE.MeshStandardMaterial({ color: "#3B6690", roughness: 0.05, metalness: 0.6, envMapIntensity: 1.6 });
  g.add(mesh(new THREE.SphereGeometry(0.3, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.85, 0.85, 2.6), gl, 0, 0.36, 2.1));
  g.add(mesh(new THREE.BoxGeometry(0.04, 0.05, 1.5), MR("#2E3236", 0.5), 0, 0.62, 2.05));
  for (const s2 of [-1, 1]) {
    g.add(mesh(along(new THREE.CylinderGeometry(0.26, 0.3, 1.9, 20)), camo, s2 * 0.58, -0.05, 0.7));
    g.add(mesh(new THREE.CircleGeometry(0.24, 20), MR("#111214", 0.9), s2 * 0.58, -0.05, 1.651));
    g.add(mesh(along(new THREE.CylinderGeometry(0.21, 0.2, 0.35, 20, 1, true)), MR("#2A2A2E", 0.4, 0.6), s2 * 0.24, -0.02, -4.65));
  }
  const wing = shapeGeo([[-3.3, -0.9], [-0.55, 1.0], [0.55, 1.0], [3.3, -0.9], [3.3, -1.8], [0.55, -1.7], [-0.55, -1.7], [-3.3, -1.8]], 0.09, 0.03);
  wing.rotateX(Math.PI / 2); g.add(mesh(wing, camo, 0, -0.12, -0.6));
  const stab = shapeGeo([[-1.6, -3.5], [-0.3, -2.8], [0.3, -2.8], [1.6, -3.5], [1.6, -4.1], [-1.6, -4.1]], 0.07, 0.02); stab.rotateX(Math.PI / 2);
  g.add(mesh(stab, camo, 0, 0.05, 0));
  const fin = shapeGeo([[2.5, 0.25], [4.4, 0.25], [4.6, 2.0], [4.0, 2.0]], 0.09, 0.03); fin.rotateY(Math.PI / 2); g.add(mesh(fin, camo, 0, 0.25, 0));
  const d1 = starDecal(0.5); d1.rotation.x = Math.PI / 2; d1.position.set(-2.1, -0.18, -1.0); g.add(d1);
  for (const s2 of [-1, 1]) { const d = starDecal(0.34); d.rotation.y = s2 * Math.PI / 2; d.position.set(s2 * 0.562, 0.12, -2.4); g.add(d); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.3, 20, 1, true).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.9, 0.35), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.position.set(0, -0.02, -5.4); flame.name = "flame"; g.add(flame);
  return g;
}

/** Helicopter (a Huey-like transport), about 8 m long without the rotor, skids at y = 0, nose toward +z.
 *  Children: "rotor" (spin on y), "tailRotor" (spin on x), "light" (searchlight lens). */
export function helicopter() {
  const ol = MAT.olive(), g = new THREE.Group();
  const gl = new THREE.MeshStandardMaterial({ color: "#3B6690", roughness: 0.05, metalness: 0.6, envMapIntensity: 1.6 });
  g.add(mesh(new RoundedBoxGeometry(1.6, 1.5, 3.2, 4, 0.5), ol, 0, 1.3, -0.1));
  g.add(mesh(new THREE.SphereGeometry(0.78, 32, 20).scale(1.0, 0.96, 1.15), ol, 0, 1.3, 1.45));
  // windscreen (upper front) and chin windows: parts of a slightly bigger sphere, glass
  const win = (t0: number, t1: number, p: number) => mesh(new THREE.SphereGeometry(0.8, 32, 16, Math.PI / 2 - p, 2 * p, t0, t1 - t0).scale(1.0, 0.96, 1.15), gl, 0, 1.3, 1.47);
  g.add(win(0.22 * Math.PI, 0.47 * Math.PI, 0.95)); g.add(win(0.56 * Math.PI, 0.72 * Math.PI, 0.55));
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.62, 0.05), ol, 0, 1.62, 2.3));
  // open side doors: dark cabin inside with a bench
  for (const s2 of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.95, 1.45), MR("#151711", 0.95), s2 * 0.801, 1.3, -0.1));
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.12, 1.3), MR("#5E6A3A", 0.9), s2 * 0.8, 0.98, -0.1));
  }
  g.add(mesh(new RoundedBoxGeometry(1.1, 0.5, 1.8, 3, 0.18), ol, 0, 2.2, -0.3));
  g.add(mesh(along(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 16)), MR("#2E2E30", 0.5, 0.5), 0, 2.25, -1.3));
  const boom = mesh(along(new THREE.CylinderGeometry(0.16, 0.36, 4.4, 20)), ol, 0, 1.62, -3.6); g.add(boom);
  const fin = shapeGeo([[5.3, 1.45], [5.9, 1.45], [6.3, 2.9], [5.8, 2.9]], 0.08, 0.03); fin.rotateY(Math.PI / 2); g.add(mesh(fin, ol, 0, 0, 0));
  const tr = new THREE.Group(); tr.name = "tailRotor"; tr.position.set(0.14, 2.55, -5.95);
  for (const a2 of [0, Math.PI / 2]) { const bl = mesh(new THREE.BoxGeometry(0.03, 1.2, 0.12), MAT.black()); bl.rotation.x = a2; tr.add(bl); }
  g.add(tr);
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 12), MAT.steel(), 0, 2.65, -0.1));
  const rotor = new THREE.Group(); rotor.name = "rotor"; rotor.position.set(0, 2.92, -0.1);
  rotor.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 16), MAT.steel()));
  for (const s2 of [-1, 1]) rotor.add(mesh(new THREE.BoxGeometry(0.32, 0.05, 3.6), MAT.black(), 0, 0, s2 * 1.85));
  g.add(rotor);
  for (const s2 of [-1, 1]) {
    g.add(mesh(along(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 12)), MAT.steel(), s2 * 0.95, 0.06, 0.1));
    const tip = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12), MAT.steel(), s2 * 0.95, 0.18, 1.95); tip.rotation.x = -0.9; g.add(tip);
    for (const z of [-0.8, 0.8]) { const st = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 10), MAT.steel(), s2 * 0.88, 0.38, z); st.rotation.z = s2 * 0.28; g.add(st); }
  }
  for (const s2 of [-1, 1]) { const d = starDecal(0.36); d.rotation.y = s2 * Math.PI / 2; d.position.set(s2 * 0.31, 1.66, -2.6); g.add(d); }
  const lamp = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 16), MAT.black(), 0, 0.5, 1.8); lamp.rotation.x = 1.2; g.add(lamp);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.7) }));
  lens.name = "light"; lens.position.set(0, 0.45, 1.9); lens.rotation.x = 1.2 + Math.PI / 2; g.add(lens);
  return g;
}

/** Tank, about 4.6 m long, tracks on y = 0, gun toward +z. Children: "turret". */
const trackTex = () => once("track", () => tex(64, 64, (g) => { g.fillStyle = "#2E2E30"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#4A4A4C"; for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 6); g.fillStyle = "#1A1A1C"; for (let y = 8; y < 64; y += 16) g.fillRect(0, y, 64, 2); }, [1, 14]));
export function tank() {
  const ol = MAT.olive(), g = new THREE.Group();
  for (const s2 of [-1, 1]) {
    // track: side profile with rounded ends, track plates texture
    const tp = new THREE.Shape(); tp.moveTo(-2.0, 0); tp.lineTo(1.85, 0); tp.absarc(1.85, 0.36, 0.36, -Math.PI / 2, 0.7, false); tp.lineTo(2.05, 0.78); tp.lineTo(-2.25, 0.78); tp.absarc(-2.0, 0.36, 0.38, 1.8, Math.PI * 1.5, false); tp.closePath();
    const tg = new THREE.ExtrudeGeometry(tp, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 16 });
    tg.translate(0, 0, -0.3); tg.rotateY(-Math.PI / 2);
    g.add(mesh(tg, MTR(trackTex(), 0.85, 0.2), s2 * 1.02, 0, 0));
    for (let i = 0; i < 6; i++) {
      const w = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 24).rotateZ(Math.PI / 2), MR("#4A5232", 0.55, 0.2), s2 * 1.34, 0.36, -1.65 + i * 0.66); g.add(w);
      g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 16).rotateZ(Math.PI / 2), MR("#2E2E30", 0.5, 0.5), s2 * 1.37, 0.36, -1.65 + i * 0.66));
    }
    g.add(mesh(new THREE.BoxGeometry(0.72, 0.06, 4.7), ol, s2 * 1.04, 0.84, 0));
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.16), MR("#E9E2C4", 0.3, 0.1), s2 * 0.75, 1.05, 2.15));
  }
  const hull = shapeGeo([[-2.1, 0.55], [2.0, 0.55], [2.35, 0.9], [1.7, 1.3], [-1.95, 1.3], [-2.2, 1.0]], 1.95, 0.05); hull.rotateY(Math.PI / 2);
  g.add(mesh(hull, ol));
  const tur = new THREE.Group(); tur.name = "turret"; tur.position.set(0, 1.3, -0.2);
  tur.add(mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.0, 0.55, 1.2), ol));
  tur.add(mesh(along(new THREE.CylinderGeometry(0.085, 0.1, 3.0, 16)), ol, 0, 0.28, 2.4));
  tur.add(mesh(new THREE.BoxGeometry(0.3, 0.22, 0.4), MAT.oliveDark(), 0, 0.28, 3.9));
  tur.add(mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.22, 20), MAT.oliveDark(), 0.3, 0.58, -0.3));
  for (const s2 of [-1, 1]) { const d = starDecal(0.3); d.rotation.y = s2 * Math.PI / 2; d.position.set(s2 * 0.935, 0.25, -0.1); tur.add(d); }
  g.add(tur);
  return g;
}

// ---------------------------------------------------------------- camp
/** Army tent, 3.2 m wide x 4.4 m deep, door on +z (open, dark inside unless you build the inside). */
/** win: a real window hole in the +x wall (centre z, bottom y0, top y1, width ww) with a frame and bars that cast the sun grid */
export function tent(w = 3.2, d = 4.4, wallH = 1.1, roofH = 1.0, inside = false, win?: { z: number; y0: number; y1: number; ww: number }) {
  const c = MAT.canvas(), g = new THREE.Group();
  const side = (x: number) => g.add(mesh(new THREE.BoxGeometry(0.04, wallH, d), c, x, wallH / 2, 0));
  side(-w / 2);
  if (!win) side(w / 2);
  else {   // the +x wall built AROUND the opening, so the sun can come in
    const x = w / 2, z0 = win.z - win.ww / 2, z1 = win.z + win.ww / 2, wall = (y0: number, y1: number, za: number, zb: number) => g.add(mesh(new THREE.BoxGeometry(0.04, y1 - y0, zb - za), c, x, (y0 + y1) / 2, (za + zb) / 2));
    wall(0, wallH, -d / 2, z0); wall(0, wallH, z1, d / 2); wall(0, win.y0, z0, z1); wall(win.y1, wallH, z0, z1);
    const wd = MAT.wood(), fr = (y: number, z: number, hy: number, hz: number) => { const o = mesh(new THREE.BoxGeometry(0.06, hy, hz), wd, x, y, z); o.name = "windowFrame"; g.add(o); };
    const ym = (win.y0 + win.y1) / 2, hy = win.y1 - win.y0;
    fr(win.y0, win.z, 0.05, win.ww + 0.05); fr(win.y1, win.z, 0.05, win.ww + 0.05); fr(ym, z0, hy, 0.05); fr(ym, z1, hy, 0.05);
    fr(ym, win.z - win.ww / 6, hy, 0.05); fr(ym, win.z + win.ww / 6, hy, 0.05); fr(ym, win.z, 0.05, win.ww);   // bars: the grid of light
  }
  g.add(mesh(new THREE.BoxGeometry(w, wallH, 0.04), c, 0, wallH / 2, -d / 2));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(w * 0.32, wallH, 0.04), c, s * w * 0.34, wallH / 2, d / 2));
  const roof = shapeGeo([[-w / 2 - 0.15, wallH - 0.05], [0, wallH + roofH], [w / 2 + 0.15, wallH - 0.05], [w / 2 + 0.15, wallH - 0.12], [0, wallH + roofH - 0.07], [-w / 2 - 0.15, wallH - 0.12]], d + 0.3, 0);
  g.add(mesh(roof, c));
  const gable = shapeGeo([[-w / 2, wallH], [0, wallH + roofH - 0.04], [w / 2, wallH]], 0.04, 0);
  g.add(mesh(gable, c, 0, 0, -d / 2)); g.add(mesh(gable.clone(), c, 0, 0, d / 2));
  for (const s of [-1, 1]) { const fl = mesh(new THREE.CylinderGeometry(0.09, 0.09, wallH, 12), MR("#5C6436", 0.9), s * w * 0.17, wallH / 2, d / 2 + 0.05); g.add(fl); }
  for (const z of [-d / 2 - 0.02, d / 2 + 0.02]) g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, wallH + roofH + 0.15, 8), MAT.wood(), 0, (wallH + roofH) / 2, z));
  for (const s of [-1, 1]) for (const z of [-d * 0.35, 0, d * 0.35]) {
    const from = new THREE.Vector3(s * (w / 2 + 0.1), wallH, z), to = new THREE.Vector3(s * (w / 2 + 1.0), 0, z), mid = from.clone().add(to).multiplyScalar(0.5);
    const rope = mesh(new THREE.CylinderGeometry(0.008, 0.008, from.distanceTo(to), 6), MR("#D8CFAE", 0.9), mid.x, mid.y, mid.z);
    rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()); g.add(rope);
    g.add(mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), MAT.wood(), to.x, 0.04, to.z));
  }
  if (!inside) g.add(mesh(new THREE.BoxGeometry(w * 0.34, wallH - 0.02, 0.02), MR("#141610", 0.95), 0, wallH / 2, d / 2 - 0.4));
  return g;
}

/** A wall of sandbags, `len` m long, `rows` high, along x. */
export function sandbags(len = 2.4, rows = 4) {
  const geo = new RoundedBoxGeometry(0.36, 0.13, 0.22, 3, 0.06), g = new THREE.Group();
  const n = Math.round(len / 0.34), im = new THREE.InstancedMesh(geo, MAT.burlap(), n * rows + rows);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
  for (let r = 0; r < rows; r++) for (let i = 0; i < n + (r % 2); i++) {
    const x = -len / 2 + (i + (r % 2 ? 0 : 0.5)) * 0.34;
    e.set((rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.06); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, 0.065 + r * 0.12, (rnd() - 0.5) * 0.03), q, new THREE.Vector3(1 + 0.06 * rnd(), 1, 1)); im.setMatrixAt(k++, m4);
  }
  im.count = k; im.castShadow = im.receiveShadow = true; g.add(im); return g;
}

/** Tear-off wall calendar showing a year; setYear() is not needed: the front page flips up (child "page", rotate x). */
export function calendar(back = "1966", front = "1965") {
  const page = (y: string) => MTR(tex(256, 320, (g) => {
    g.fillStyle = "#F7F2E6"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#C8302C"; g.fillRect(0, 0, 256, 70);
    g.fillStyle = "#FFFFFF"; g.font = "bold 44px Arial, sans-serif"; g.textAlign = "center"; g.fillText("YEAR", 128, 52);
    g.fillStyle = "#1E1A22"; g.font = "bold 96px Arial, sans-serif"; g.fillText(y, 128, 210);
    g.fillStyle = "#8C8478"; for (let i = 0; i < 4; i++) g.fillRect(40 + i * 48, 250, 30, 30);
  }), 0.85);
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.06, 0.06), MAT.wood(), 0, 0.27, 0.01));
  g.add(mesh(new THREE.PlaneGeometry(0.4, 0.5), page(back), 0, 0, 0.012));
  const p = new THREE.Group(); p.name = "page"; p.position.set(0, 0.25, 0.02);
  p.add(mesh(new THREE.PlaneGeometry(0.4, 0.5).translate(0, -0.25, 0), page(front))); g.add(p);
  return g;
}

/** M16-like rifle, 0.55 m long, along +z (muzzle), grip at the origin. */
export function rifle() {
  const b = MAT.black(), g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.08, 0.24), b, 0, 0.03, 0.02));
  g.add(mesh(along(new THREE.CylinderGeometry(0.026, 0.026, 0.16, 12)), b, 0, 0.035, 0.22));
  g.add(mesh(along(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8)), b, 0, 0.035, 0.36));
  g.add(mesh(new THREE.BoxGeometry(0.02, 0.05, 0.1), b, 0, 0.1, 0.03));
  const mag = mesh(new THREE.BoxGeometry(0.03, 0.12, 0.05), b, 0, -0.05, 0.06); mag.rotation.x = 0.2; g.add(mag);
  const grip = mesh(new THREE.BoxGeometry(0.03, 0.08, 0.035), b, 0, -0.03, -0.05); grip.rotation.x = -0.35; g.add(grip);
  g.add(mesh(new THREE.BoxGeometry(0.045, 0.08, 0.2), b, 0, 0.01, -0.2));
  return g;
}

/** Cartoon bomb, 0.9 m long, nose toward -y (falling). */
export function bomb() {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, -0.45], [0.12, -0.38], [0.18, -0.2], [0.19, 0.1], [0.14, 0.32], [0.07, 0.42], [0, 0.42]]), MR("#3E4628", 0.55, 0.2)));
  g.add(mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.06, 24), MR("#E2B425", 0.5), 0, -0.24, 0));
  for (let i = 0; i < 4; i++) { const f = mesh(new THREE.BoxGeometry(0.02, 0.2, 0.2), MR("#3E4628", 0.55, 0.2), 0, 0.42, 0); f.rotation.y = (i * Math.PI) / 2; f.translateZ(0.1); g.add(f); }
  return g;
}

/** Shovel, `len` m long, blade down (-y), handle top at y = len. */
export function shovel(len = 0.9) {
  const g = new THREE.Group(), s = len / 0.9;
  g.add(mesh(new THREE.CylinderGeometry(0.018 * s, 0.02 * s, 0.68 * s, 10), MAT.wood(), 0, 0.5 * s, 0));
  g.add(mesh(new THREE.BoxGeometry(0.14 * s, 0.025 * s, 0.03 * s), MAT.wood(), 0, 0.85 * s, 0));
  const blade = shapeGeo([[-0.09, 0.16], [0.09, 0.16], [0.1, 0.0], [0.0, -0.1], [-0.1, 0.0]], 0.012, 0.004);
  blade.scale(s, s, s); g.add(mesh(blade, MR("#8A8C8E", 0.35, 0.8), 0, 0.06 * s, 0));
  return g;
}

// ---------------------------------------------------------------- war room
/** Jungle map texture for tables (green jungle, a river, roads, a red border). */
export const jungleMapTex = () => tex(1024, 768, (g) => {
  g.fillStyle = "#E9DDB8"; g.fillRect(0, 0, 1024, 768);
  blobs(g, 1024, 768, ["#5E8C45", "#4C7A38", "#6E9C50"], 140, 30, 80);
  g.strokeStyle = "#3D7FB8"; g.lineWidth = 18; g.lineCap = "round"; g.beginPath(); g.moveTo(-20, 520); g.bezierCurveTo(260, 420, 420, 700, 700, 560); g.bezierCurveTo(860, 480, 900, 300, 1050, 260); g.stroke();
  g.strokeStyle = "#C9A85E"; g.lineWidth = 7; g.setLineDash([16, 10]); g.beginPath(); g.moveTo(80, 60); g.lineTo(500, 380); g.lineTo(980, 690); g.stroke(); g.setLineDash([]);
  g.strokeStyle = "rgba(40,40,40,0.25)"; g.lineWidth = 2; for (let x = 0; x < 1024; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 768); g.stroke(); } for (let y = 0; y < 768; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  g.strokeStyle = "#B8302A"; g.lineWidth = 10; g.strokeRect(5, 5, 1014, 758);
});
/** A wooden table with a jungle map on top (top at y = 0.5). */
export function mapTable(w = 1.6, d = 1.1) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, 0.05, d), MAT.wood(), 0, 0.475, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), MAT.wood(), sx * (w / 2 - 0.08), 0.225, sz * (d / 2 - 0.08)));
  const map = mesh(new THREE.PlaneGeometry(w - 0.08, d - 0.08), MTR(jungleMapTex(), 0.9), 0, 0.502, 0); map.rotation.x = -Math.PI / 2; g.add(map);
  return g;
}
/** Little plastic army man (toy), 0.07 m tall. */
export function toySoldier(color = "#5E7A2E") {
  const m = MR(color, 0.45), g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 16), m, 0, 0.002, 0));
  g.add(mesh(new THREE.CapsuleGeometry(0.009, 0.03, 4, 10), m, 0, 0.028, 0));
  g.add(mesh(new THREE.SphereGeometry(0.009, 12, 10), m, 0, 0.058, 0));
  g.add(mesh(new THREE.SphereGeometry(0.011, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, 0.06, 0));
  const r = mesh(new THREE.BoxGeometry(0.004, 0.004, 0.035), m, 0.008, 0.04, 0.01); r.rotation.x = -0.4; g.add(r);
  return g;
}
/** The farmer token: a little figure with a straw cone hat, 0.07 m. */
export function toyFarmer() {
  const g = new THREE.Group(), m = MR("#2C3866", 0.5);
  g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 16), MAT.wood(), 0, 0.002, 0));
  g.add(mesh(new THREE.CapsuleGeometry(0.009, 0.03, 4, 10), m, 0, 0.028, 0));
  g.add(mesh(new THREE.SphereGeometry(0.009, 12, 10), MR("#F2C8A4", 0.6), 0, 0.056, 0));
  g.add(mesh(new THREE.ConeGeometry(0.022, 0.016, 20), MR("#E8CF8A", 0.7), 0, 0.068, 0));
  return g;
}
/** A big flat red arrow (for battle plans), `len` m long, pointing +z, lying on y = 0. */
export function arrow(len = 0.5, color = "#D7352B") {
  const w = len * 0.18, a = shapeGeo([[-w / 2, -len / 2], [w / 2, -len / 2], [w / 2, len / 2 - w * 1.4], [w * 1.2, len / 2 - w * 1.4], [0, len / 2], [-w * 1.2, len / 2 - w * 1.4], [-w / 2, len / 2 - w * 1.4]], 0.012, 0.004);
  a.rotateX(Math.PI / 2); const g = new THREE.Group(); g.add(mesh(a, MR(color, 0.45), 0, 0.008, 0)); return g;
}

// ---------------------------------------------------------------- tunnels
/** Warm oil lamp: brass base, glass chimney, flame + glow (+ a real warm point light). Child "flame", "light". */
export function oilLamp(withLight = true) {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, 0], [0.06, 0], [0.065, 0.03], [0.05, 0.06], [0.025, 0.07], [0.02, 0.08], [0, 0.08]]), MAT.brass()));
  const glass = new THREE.Mesh(lathe([[0.025, 0.08], [0.04, 0.12], [0.03, 0.18], [0.022, 0.2]]), new THREE.MeshStandardMaterial({ color: "#FFF4DC", transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }));
  g.add(glass);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10).scale(1, 2.2, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.7) }));
  fl.position.y = 0.12; fl.name = "flame"; g.add(fl);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.6, 0.95, 0.45), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(0.42, 0.42, 1); glow.position.y = 0.12; glow.name = "glow"; g.add(glow);
  if (withLight) { const L = new THREE.PointLight("#FFB25C", 2.2, 3.2, 1.6); L.position.y = 0.16; L.name = "light"; g.add(L); }
  return g;
}
export const glowTex = () => once("glow", () => tex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,0.5)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }));

/** Termite mound with a lid on top that lifts (child "lid", hinge at its back edge). Height ~1.25 m, opening r 0.3. */
export function termiteMound() {
  const g = new THREE.Group(), m = MAT.clay();
  const prof: [number, number][] = [[0.0, 0], [0.78, 0], [0.74, 0.12], [0.62, 0.35], [0.52, 0.6], [0.44, 0.85], [0.38, 1.0], [0.3, 1.0]];
  const geo = lathe(prof, 40), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x), k = 1 + 0.08 * Math.sin(a * 5 + y * 7) + 0.05 * Math.sin(a * 11 - y * 13); if (y > 0.001 && y < 0.999) { pos.setX(i, x * k); pos.setZ(i, z * k); } }
  geo.computeVertexNormals(); g.add(mesh(geo, m));
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 32), MR("#140C08", 1), 0, 0.99, 0));
  for (const [x, z, h, r] of [[0.32, 0.2, 0.55, 0.16], [-0.3, -0.25, 0.45, 0.14], [0.1, -0.35, 0.35, 0.12]] as const) g.add(mesh(new THREE.ConeGeometry(r, h, 16), m, x, 0.7 + h / 2 - 0.1, z));
  const lid = new THREE.Group(); lid.name = "lid"; lid.position.set(0, 1.0, -0.3);
  const lg = lathe([[0, 0.0], [0.31, 0], [0.315, 0.04], [0.3, 0.08], [0.22, 0.2], [0.1, 0.27], [0, 0.29]], 32);   // vietnam3: a solid lid (closed bottom, thick rim), not a paper-thin shell lg.translate(0, 0, 0.3); { const m2 = m.clone(); m2.side = THREE.DoubleSide; lid.add(mesh(lg, m2)); }
  g.add(lid); return g;
}

/** Leaf-covered wooden trapdoor in the ground, 0.7 m square. Child "door" hinges at its back edge (rotate x). */
export function trapdoor() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.76, 0.02, 0.76), MR("#120C08", 1), 0, -0.005, 0));
  const d = new THREE.Group(); d.name = "door"; d.position.set(0, 0.03, -0.36);
  for (let i = 0; i < 5; i++) d.add(mesh(new THREE.BoxGeometry(0.7, 0.04, 0.135), MAT.wood(), 0, 0, 0.07 + i * 0.142));
  const leafM = MR("#4E7A2C", 0.8), leafM2 = MR("#6E9A3A", 0.8), leafM3 = MR("#8A6A2C", 0.9);
  for (let i = 0; i < 26; i++) { const l = mesh(new THREE.CircleGeometry(0.06 + 0.04 * rnd(), 6).scale(1.8, 1, 1), [leafM, leafM2, leafM3][i % 3], (rnd() - 0.5) * 0.66, 0.025, 0.04 + rnd() * 0.66); l.rotation.set(-Math.PI / 2, 0, rnd() * 6); d.add(l); }
  g.add(d); return g;
}

/** Hammock between two posts, `len` m, sag 0.25; occupant lies at y ~0.42. */
export function hammock(len = 1.6) {
  const g = new THREE.Group(), N = 24, W = 0.5, geo = new THREE.PlaneGeometry(len, W, N, 4), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), u = x / (len / 2), y = p.getY(i); p.setXYZ(i, x, 0.62 - 0.26 * (1 - u * u) - 0.05 * (1 - (2 * y / W) ** 2), y); }
  geo.computeVertexNormals();
  const cloth = new THREE.Mesh(geo, MTR(tex(128, 64, (g) => { g.fillStyle = "#3F5E7A"; g.fillRect(0, 0, 128, 64); g.fillStyle = "#D7C59A"; for (let x = 0; x < 128; x += 16) g.fillRect(x, 0, 6, 64); }), 0.9)); (cloth.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  cloth.castShadow = cloth.receiveShadow = true; g.add(cloth);
  for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.95, 10), MAT.bamboo(), s * (len / 2 + 0.12), 0.47, 0));
  return g;
}
/** Field hospital cot, 1.1 m long, top at y 0.35. */
export function cot() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.1, 0.04, 0.48), MR("#5E6A3A", 0.9), 0, 0.35, 0));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.08, 0.4), MR("#EDE6D6", 0.9), -0.38, 0.41, 0));
  g.add(mesh(new THREE.BoxGeometry(0.62, 0.05, 0.46), MR("#E4DCCB", 0.9), 0.12, 0.39, 0));
  for (const s of [-1, 1]) for (const e of [-1, 1]) { const l = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8), MAT.wood(), s * 0.48, 0.18, e * 0.2); l.rotation.z = s * e * 0.35; g.add(l); }
  const box = mesh(new THREE.BoxGeometry(0.18, 0.14, 0.14), MR("#F4F1EA", 0.7), 0.7, 0.07, 0.1); g.add(box);
  const cr = (w: number, h: number) => mesh(new THREE.BoxGeometry(w, h, 0.005), MR("#C8302C", 0.6), 0.7, 0.08, 0.173); g.add(cr(0.08, 0.025)); g.add(cr(0.025, 0.08));
  return g;
}
/** Iron pot over a small fire (child "fire"), 0.3 m. */
export function cookingPot() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const s = mesh(new THREE.DodecahedronGeometry(0.06), MR("#6A625A", 0.95), Math.cos(i * 2.1) * 0.13, 0.04, Math.sin(i * 2.1) * 0.13); g.add(s); }
  g.add(mesh(lathe([[0, 0], [0.13, 0.01], [0.15, 0.08], [0.14, 0.16], [0.12, 0.17], [0.125, 0.18], [0.11, 0.18], [0.12, 0.17], [0.13, 0.16], [0.135, 0.08], [0.12, 0.02], [0, 0.02]]).translate(0, 0.1, 0), MR("#2B2826", 0.5, 0.5)));
  const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(2.4, 1.1, 0.35), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  fire.scale.set(0.34, 0.3, 1); fire.position.y = 0.08; fire.name = "fire"; g.add(fire);
  const L = new THREE.PointLight("#FF9A40", 1.4, 2.0, 1.6); L.position.y = 0.12; g.add(L);
  return g;
}
/** Bamboo ladder, `h` m tall, leaning 0. */
export function ladder(h = 1.4) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.025, 0.028, h, 10), MAT.bamboo(), s * 0.16, h / 2, 0));
  for (let y = 0.2; y < h - 0.05; y += 0.24) g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8).rotateZ(Math.PI / 2), MAT.bamboo(), 0, y, 0));
  return g;
}

/** THE CUT-OPEN GROUND: a slab of earth seen from the side. rows: strings, "#" = soil, "." = air (tunnel/room),
 *  "g" = soil with grass on top, top row = surface. cell = size of one character in m, depth = slab thickness.
 *  The slab's front face is at z = 0, x from 0 to width, y from 0 (bottom) up to height (surface). */
/** DETAILED SOIL (his note: "not brown cream"): one tile = 3 m wide x 6.5 m tall (the whole depth of the cut), red-brown
 *  laterite with a dark root-filled topsoil, wavy strata, mottling, grain, cracks, clods and pebbles with light and shadow.
 *  A matching bump picture gives the clods and stones real relief. soilMat(w, h): a material showing w x h metres of it. */
const SOIL_W = 3, SOIL_H = 6.5;
const soilPics = () => once("soilPics", () => {
  const W = 1024, H = 2048, c = mkCanvas(W, H), g = c.getContext("2d")!, bc = mkCanvas(W, H), b = bc.getContext("2d")!;
  const wrap = (x: number, r: number, f: (x: number) => void) => { f(x); if (x < r) f(x + W); if (x > W - r) f(x - W); };
  // base colour from the surface down
  const gr = g.createLinearGradient(0, 0, 0, H);
  for (const [k, col] of [[0, "#3E2818"], [0.05, "#4E3020"], [0.11, "#7A4428"], [0.2, "#9C5634"], [0.45, "#A65C38"], [0.62, "#8E4C2E"], [0.8, "#7C4228"], [1, "#5E321E"]] as const) gr.addColorStop(k, col);
  g.fillStyle = gr; g.fillRect(0, 0, W, H); b.fillStyle = "#808080"; b.fillRect(0, 0, W, H);
  // strata: wavy bands (they wrap left/right)
  for (let i = 0; i < 16; i++) {
    const y0 = 220 + rnd() * (H - 300), th = 14 + rnd() * 70, a1 = 18 * (rnd() - 0.5), a2 = 18 * (rnd() - 0.5);
    g.fillStyle = ["rgba(196,120,64,0.22)", "rgba(90,40,20,0.22)", "rgba(170,96,52,0.2)", "rgba(120,64,36,0.25)"][i % 4];
    g.beginPath(); g.moveTo(0, y0); g.bezierCurveTo(W * 0.33, y0 + a1, W * 0.66, y0 + a2, W, y0); g.lineTo(W, y0 + th); g.bezierCurveTo(W * 0.66, y0 + th + a2, W * 0.33, y0 + th + a1, 0, y0 + th); g.closePath(); g.fill();
  }
  // mottling
  for (let i = 0; i < 260; i++) { const x = rnd() * W, y = rnd() * H, r = 20 + rnd() * 90; wrap(x, r, (xx) => { const rg = g.createRadialGradient(xx, y, 0, xx, y, r); const d = rnd() < 0.5; rg.addColorStop(0, d ? "rgba(60,26,12,0.16)" : "rgba(220,150,95,0.13)"); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(xx - r, y - r, 2 * r, 2 * r); }); }
  // fine grain
  for (let i = 0; i < 60000; i++) { const x = rnd() * W, y = rnd() * H, d = rnd() < 0.55; g.fillStyle = d ? "rgba(40,18,8,0.28)" : "rgba(235,170,115,0.22)"; g.fillRect(x, y, 1 + rnd() * 1.5, 1 + rnd() * 1.5); b.fillStyle = d ? "rgba(60,60,60,0.35)" : "rgba(170,170,170,0.35)"; b.fillRect(x, y, 2, 2); }
  // roots in the topsoil (wavy dark lines that branch downward)
  const root = (x: number, y: number, w: number, len: number, depth: number) => {
    let px = x, py = y; g.strokeStyle = "rgba(42,24,14,0.85)"; b.strokeStyle = "rgba(170,170,170,0.9)";
    for (let k = 0; k < len; k++) { const nx = px + (rnd() - 0.5) * 16, ny = py + 6 + rnd() * 12;
      for (const [cx, lw] of [[g, w], [b, w + 1]] as const) { cx.lineWidth = lw; cx.beginPath(); cx.moveTo(px, py); cx.lineTo(nx, ny); cx.stroke(); }
      px = nx; py = ny; w = Math.max(0.6, w * 0.93); if (depth < 2 && rnd() < 0.12) root(px, py, w * 0.7, Math.floor(len * 0.5), depth + 1); }
  };
  for (let i = 0; i < 46; i++) root(rnd() * W, rnd() * 40, 1.5 + rnd() * 3, 14 + Math.floor(rnd() * 26), 0);
  // cracks
  for (let i = 0; i < 70; i++) { let x = rnd() * W, y = 200 + rnd() * (H - 200); g.strokeStyle = "rgba(36,16,8,0.6)"; g.lineWidth = 1 + rnd() * 1.6; b.strokeStyle = "rgba(20,20,20,0.8)"; b.lineWidth = 2.5;
    for (let k = 0; k < 6; k++) { const nx = x + (rnd() - 0.5) * 30, ny = y + (rnd() - 0.3) * 26; for (const cx of [g, b]) { cx.beginPath(); cx.moveTo(x, y); cx.lineTo(nx, ny); cx.stroke(); } x = nx; y = ny; } }
  // clods: lumps with a lit top edge and a dark lower edge (+ raised in the bump picture)
  const lump = (x: number, y: number, r: number, base: string, lit: string, dark: string) => {
    const pts: [number, number][] = []; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, rr = r * (0.75 + 0.35 * rnd()); pts.push([Math.cos(a) * rr * 1.25, Math.sin(a) * rr]); }
    const path = (cx: CanvasRenderingContext2D, xx: number, dx = 0, dy = 0) => { cx.beginPath(); pts.forEach(([px, py], k) => (k ? cx.lineTo(xx + px + dx, y + py + dy) : cx.moveTo(xx + px + dx, y + py + dy))); cx.closePath(); };
    wrap(x, r * 1.5, (xx) => {
      path(g, xx, 1.5, 2.5); g.fillStyle = dark; g.fill();
      path(g, xx); g.fillStyle = base; g.fill();
      g.save(); path(g, xx); g.clip(); g.fillStyle = lit; g.beginPath(); g.ellipse(xx - r * 0.3, y - r * 0.45, r * 0.9, r * 0.5, -0.3, 0, 7); g.fill(); g.restore();
      const rb = b.createRadialGradient(xx - r * 0.2, y - r * 0.2, 0, xx, y, r * 1.2); rb.addColorStop(0, "rgba(255,255,255,0.95)"); rb.addColorStop(1, "rgba(128,128,128,0)"); path(b, xx); b.fillStyle = rb; b.fill();
    });
  };
  for (let i = 0; i < 520; i++) { const y = 120 + rnd() * (H - 120), r = 4 + rnd() * 16 * (0.6 + y / H); lump(rnd() * W, y, r, ["#94502E", "#A65E38", "#7E4426", "#B26A40"][i % 4], "rgba(236,170,115,0.45)", "rgba(40,16,6,0.55)"); }
  // pebbles and small stones (grey-brown, shiny top)
  for (let i = 0; i < 380; i++) { const y = 60 + rnd() * (H - 60), r = 2.5 + rnd() * 9 * (0.5 + y / H); lump(rnd() * W, y, r, ["#8A7C6E", "#9E8C76", "#6E6052", "#B4A08A", "#7C6A58"][i % 5], "rgba(250,240,225,0.6)", "rgba(30,20,12,0.6)"); }
  // the darker topsoil band edge with tiny grass roots
  const top = g.createLinearGradient(0, 0, 0, 120); top.addColorStop(0, "rgba(30,20,10,0.55)"); top.addColorStop(1, "rgba(30,20,10,0)"); g.fillStyle = top; g.fillRect(0, 0, W, 120);
  const map = canvasTex(c), bump = new THREE.CanvasTexture(bc);
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return { map, bump };
});
export function soilMat(w: number, h: number, tint = "#FFFFFF") {
  const P = soilPics(), map = P.map.clone(), bump = P.bump.clone();
  for (const t of [map, bump]) { t.repeat.set(w / SOIL_W, h / SOIL_H); t.needsUpdate = true; }
  const m = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 2.2, roughness: 0.93, metalness: 0, color: tint });
  return m;
}
export function cutaway(rows: string[], cell = 0.25, depth = 3.0) {
  const H = rows.length, W = Math.max(...rows.map((r) => r.length)), g = new THREE.Group();
  const soil = soilMat(W * cell, H * cell);
  const boxes: THREE.BufferGeometry[] = [];
  for (let r = 0; r < H; r++) {
    const row = rows[r], y = (H - 1 - r) * cell; let x0 = -1;
    for (let i = 0; i <= W; i++) {
      const solid = i < row.length && row[i] !== ".";
      if (solid && x0 < 0) x0 = i;
      if (!solid && x0 >= 0) { const b = new THREE.BoxGeometry((i - x0) * cell, cell, depth); b.translate((x0 + i) / 2 * cell, y + cell / 2, -depth / 2); boxes.push(b); x0 = -1; }
    }
  }
  // world-space UVs on the front face so the soil texture does not stretch
  const merged = mergeGeometries(boxes.map((b) => b.toNonIndexed()));
  const p = merged.attributes.position, n = merged.attributes.normal, uv = merged.attributes.uv;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); uv.setXY(i, ay > 0.5 ? p.getX(i) / (W * cell) : ax > 0.5 ? -p.getZ(i) / (W * cell) : p.getX(i) / (W * cell), ay > 0.5 ? -p.getZ(i) / (H * cell) : p.getY(i) / (H * cell)); }
  g.add(mesh(merged, soil));
  // the back of the holes (dark earth wall) so rooms and tunnels have depth
  g.add(mesh(new THREE.PlaneGeometry(W * cell, H * cell), soilMat(W * cell, H * cell, "#6A5048"), W * cell / 2, H * cell / 2, -depth + 0.001));
  // grass on top of surface soil ("g")
  const grassM = MR("#5A8E38", 0.9);
  rows.forEach((row, r) => { const y = (H - r) * cell; for (let i = 0; i < row.length; i++) if (row[i] === "g") g.add(mesh(new THREE.BoxGeometry(cell, 0.04, depth), grassM, (i + 0.5) * cell, y + 0.02, -depth / 2)); });
  return g;
}

// ---------------------------------------------------------------- kitchen analogy and small props
/** Giant hammer, `len` m long, head at the top (+y), grip at the origin. */
export function hammer(len = 1.0) {
  const g = new THREE.Group(), s = len;
  g.add(mesh(new THREE.CylinderGeometry(0.03 * s, 0.035 * s, 0.85 * s, 14), MAT.wood(), 0, 0.42 * s, 0));
  g.add(mesh(new RoundedBoxGeometry(0.36 * s, 0.14 * s, 0.14 * s, 3, 0.02 * s), MR("#7E8488", 0.3, 0.9), 0.04 * s, 0.9 * s, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.07 * s, 0.075 * s, 0.06 * s, 20).rotateZ(Math.PI / 2), MR("#9AA0A4", 0.25, 0.9), 0.25 * s, 0.9 * s, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.036 * s, 0.036 * s, 0.18 * s, 14), MR("#B8302A", 0.6), 0, 0.09 * s, 0));
  return g;
}
/** Cartoon fly, 0.07 m. Children "wingL" / "wingR" (flap on z). */
export function fly() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.018, 16, 12).scale(1, 0.9, 1.5), MR("#1A1C22", 0.3, 0.2)));
  g.add(mesh(new THREE.SphereGeometry(0.013, 16, 12), MR("#1A1C22", 0.3), 0, 0.004, 0.024));
  for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.008, 12, 10), MR("#B8202A", 0.2, 0.1), s * 0.009, 0.008, 0.03));
  const wm = new THREE.MeshStandardMaterial({ color: "#DDE8F4", transparent: true, opacity: 0.55, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  for (const s of [-1, 1]) { const w = new THREE.Group(); w.name = s < 0 ? "wingL" : "wingR"; w.position.set(s * 0.008, 0.016, 0); const p = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16).scale(0.7, 1.3, 1).rotateX(-Math.PI / 2).translate(s * 0.016, 0, -0.01), wm); w.add(p); g.add(w); }
  for (const s of [-1, 1]) for (const z of [-0.01, 0.005, 0.02]) { const l = mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.03, 4), MR("#1A1C22", 0.5), s * 0.018, -0.012, z); l.rotation.z = s * 0.7; g.add(l); }
  return g;
}
/** Red Christmas ornament with a gold cap and hook, 0.12 m. */
export function ornament() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.06, 32, 20), MR("#D21E2A", 0.15, 0.35), 0, 0.06, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.022, 16), MAT.brass(), 0, 0.125, 0));
  g.add(mesh(new THREE.TorusGeometry(0.012, 0.0025, 8, 16), MAT.brass(), 0, 0.145, 0));
  return g;
}
/** Flashlight 0.2 m along +z with a soft beam cone (child "beam"). */
export function flashlight() {
  const g = new THREE.Group();
  g.add(mesh(along(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 16)), MR("#2E5A3A", 0.5, 0.3), 0, 0, 0));
  g.add(mesh(along(new THREE.CylinderGeometry(0.035, 0.024, 0.05, 16)), MR("#2E5A3A", 0.5, 0.3), 0, 0, 0.1));
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.032, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.6) })); lens.position.z = 0.126; g.add(lens);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 32, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 0.58), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.95, 0.7), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.name = "beam"; g.add(beam);
  return g;
}
/** Binoculars 0.14 m wide, looking along +z. */
export function binoculars() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(mesh(along(new THREE.CylinderGeometry(0.028, 0.032, 0.12, 16)), MAT.black(), s * 0.036, 0, 0));
  g.add(mesh(new THREE.BoxGeometry(0.04, 0.02, 0.05), MAT.black(), 0, 0, 0));
  return g;
}

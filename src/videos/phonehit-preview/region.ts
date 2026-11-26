// REGION kit (2026-11-16): shared by phonehit-preview (New York area, 250 km up) and whalehit-preview (Yucatan coast, 600 km up).
//  - curvedGround: ONE ground that is flat for 25 km round the target (so the city, cars and houses sit right) and then bends away
//    like the real Earth out to the horizon (about 1800 km at 250 km height). Up to 4 map pictures are blended by where they are.
//  - strokeLoop: the red hand-drawn stroke, round any closed curve.
//  - nyMap: our own map-like drawing of the New York area (about 400 km), made to fit the Manhattan map in city.ts.
//  - gulfMap: our own map-like drawing of the Gulf of Mexico / Yucatan coast.
// Units: metres. x = east, z = south, the target is at about (0, 0).
import * as THREE from "three";
import { mkCanvas, canvasTex, noInk } from "../../engine/kit";
import { W, njPoly, eastPoly, southPoly, govPoly, islandPoly } from "../cityhit-preview/city";

export const R_EARTH = 6371000, FLAT = 25000;
export const curveY = (x: number, z: number) => { const d = Math.max(0, Math.hypot(x, z) - FLAT); return -d * d / (2 * R_EARTH); };
export const horizonDist = (alt: number) => Math.sqrt(2 * R_EARTH * alt + alt * alt);
let sd = 31337; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);

// ---------------- the curved ground ----------------
function curvedGeo(rMax: number) {
  const NA = 160, NR = 110, pos: number[] = [0, 0, 0], nrm: number[] = [0, 1, 0], idx: number[] = [];
  for (let i = 0; i <= NR; i++) {
    const r = FLAT * Math.pow(rMax / FLAT, i / NR), y = curveY(r, 0), sl = (r - FLAT) / R_EARTH;
    for (let a = 0; a < NA; a++) {
      const th = (a / NA) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), n = new THREE.Vector3(-sl * c, 1, -sl * s).normalize();
      pos.push(r * c, y, r * s); nrm.push(n.x, n.y, n.z);
    }
  }
  for (let a = 0; a < NA; a++) idx.push(0, 1 + ((a + 1) % NA), 1 + a);
  for (let i = 0; i < NR; i++) for (let a = 0; a < NA; a++) {
    const A = 1 + i * NA + a, B = 1 + i * NA + ((a + 1) % NA), C = 1 + (i + 1) * NA + a, D = 1 + (i + 1) * NA + ((a + 1) % NA);
    idx.push(A, B, C, B, D, C);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)); g.setIndex(idx);
  return g;
}
export type Lvl = { x0: number; z0: number; size: number; tex: THREE.Texture | null };
export type Ground = { mesh: THREE.Mesh; hi: (k: number) => void; wave: (cx: number, cz: number, radius: number, width: number, k: number) => void };
export function curvedGround(levels: Lvl[], waterDetail = false): Ground {
  const L = [...levels]; while (L.length < 4) L.push({ x0: 1e9, z0: 1e9, size: 1, tex: null });
  const dummy = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1); dummy.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ map: L[0].tex!, roughness: 0.93, metalness: 0, side: THREE.DoubleSide });
  const U: Record<string, { value: any }> = {
    t1: { value: L[1].tex || dummy }, t2: { value: L[2].tex || dummy }, t3: { value: L[3].tex || dummy },
    b0: { value: new THREE.Vector3(L[0].x0, L[0].z0, L[0].size) }, b1: { value: new THREE.Vector3(L[1].x0, L[1].z0, L[1].size) },
    b2: { value: new THREE.Vector3(L[2].x0, L[2].z0, L[2].size) }, b3: { value: new THREE.Vector3(L[3].x0, L[3].z0, L[3].size) },
    uHi: { value: 1 }, uWv: { value: new THREE.Vector4(0, 0, 0, 0) }, uWw: { value: 1 }, uWd: { value: waterDetail ? 1 : 0 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vWP; uniform sampler2D t1; uniform sampler2D t2; uniform sampler2D t3; uniform vec3 b0; uniform vec3 b1; uniform vec3 b2; uniform vec3 b3;
uniform float uHi; uniform vec4 uWv; uniform float uWw; uniform float uWd; float gWater = 0.0;
vec2 lvlQ(vec3 b) { return (vWP.xz - b.xy) / b.z; }
float lvlK(vec3 b) { vec2 q = lvlQ(b); vec2 e = min(q, 1.0 - q); return smoothstep(0.0, 0.08, min(e.x, e.y)); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }`)
      .replace("#include <map_fragment>", `
vec2 q0 = lvlQ(b0), q1 = lvlQ(b1), q2 = lvlQ(b2), q3 = lvlQ(b3);
vec4 tc = texture2D(map, vec2(q0.x, 1.0 - q0.y));
tc = mix(tc, texture2D(t1, vec2(q1.x, 1.0 - q1.y)), lvlK(b1) * uHi);
tc = mix(tc, texture2D(t2, vec2(q2.x, 1.0 - q2.y)), lvlK(b2) * uHi);
tc = mix(tc, texture2D(t3, vec2(q3.x, 1.0 - q3.y)), lvlK(b3) * uHi);
gWater = step(tc.r * 1.25, tc.b) * step(tc.g * 1.02, tc.b);
if (uWd > 0.5 && gWater > 0.5) {                                   // close up the sea has ripples and long swells
  float rip = vn(vWP.xz * 0.35) * 0.5 + vn(vWP.xz * 1.3) * 0.3 + vn(vWP.xz * 0.04 + vec2(3.0)) * 0.5;
  tc.rgb *= 0.62 + 0.62 * rip;
  tc.rgb += vec3(0.05, 0.08, 0.1) * smoothstep(0.62, 0.95, vn(vWP.xz * 0.9 + vec2(7.0, 1.0)));
}
if (uWv.z > 0.0) {                                                 // the big wave: white front, churned water behind it, flooded land
  float dW = length(vWP.xz - uWv.xy), R = uWv.z, wd = uWw;
  float inside = 1.0 - smoothstep(R - wd * 0.4, R, dW);
  float front = smoothstep(R - wd, R - wd * 0.15, dW) * (1.0 - smoothstep(R - wd * 0.15, R + wd * 0.25, dW));
  float churn = vn(vWP.xz / (wd * 0.35)) * 0.6 + vn(vWP.xz / (wd * 0.1)) * 0.4;
  vec3 sea = mix(tc.rgb, vec3(0.62, 0.74, 0.8), 0.55 * inside * (0.4 + 0.6 * churn));
  vec3 mud = mix(tc.rgb, vec3(0.22, 0.17, 0.13), 0.85 * inside);
  tc.rgb = mix(tc.rgb, mix(mud, sea, gWater), uWv.w);
  tc.rgb = mix(tc.rgb, vec3(1.0), clamp(front * (0.55 + 0.45 * churn) * 1.4, 0.0, 1.0) * uWv.w);
}
diffuseColor *= tc;`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.3, gWater * uWd);");
  };
  const mesh = new THREE.Mesh(curvedGeo(2.4e6), m);
  mesh.name = "ground"; mesh.receiveShadow = true; mesh.frustumCulled = false; noInk(mesh);
  return { mesh, hi: (k) => { U.uHi.value = k; }, wave: (cx, cz, radius, width, k) => { U.uWv.value.set(cx, cz, radius, k); U.uWw.value = width; } };
}

// ---------------- the red stroke round the target (hand-drawn, soft glow), round any closed curve ----------------
// raw: points (x, z in metres) of the loop in order; center: the point the wobble pushes away from; k: size of the wobble (1 = the 3 km Manhattan loop)
export function strokeLoop(raw: [number, number][], center: [number, number], k: number) {
  const C = new THREE.CatmullRomCurve3(raw.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal");
  const N = 700, over = 1.07, pts: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * over, p = C.getPointAt((s + 0.02) % 1);
    const w = k * (160 * Math.sin(s * 9.1 + 1) + 90 * Math.sin(s * 23.7) + 260 * (s - 0.5));
    pts.push(new THREE.Vector2(p.x, p.z).addScaledVector(new THREE.Vector2(p.x, p.z).sub(new THREE.Vector2(center[0], center[1])).normalize(), s > 1 ? w + k * 220 * (s - 1) / 0.07 : w));
  }
  const n = pts.length, pos = new Float32Array(n * 2 * 3), nrm = new Float32Array(n * 2 * 2), side = new Float32Array(n * 2), sv = new Float32Array(n * 2), wv = new Float32Array(n * 2), idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], t = new THREE.Vector2().subVectors(b, a).normalize();
    const s = (i / (n - 1)) * over, w = 0.8 + 0.25 * Math.sin(s * 31) + 0.15 * Math.sin(s * 77);
    for (let q = 0; q < 2; q++) {
      const j = i * 2 + q; pos.set([pts[i].x, 40 + curveY(pts[i].x, pts[i].y), pts[i].y], j * 3); nrm.set([-t.y, t.x], j * 2); side[j] = q ? 1 : -1; sv[j] = s; wv[j] = w;
    }
    if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("aN", new THREE.BufferAttribute(nrm, 2));
  geo.setAttribute("aSide", new THREE.BufferAttribute(side, 1)); geo.setAttribute("aS", new THREE.BufferAttribute(sv, 1)); geo.setAttribute("aW", new THREE.BufferAttribute(wv, 1));
  geo.setIndex(idx);
  const mk = (soft: boolean, col: [number, number, number], alpha: number) => new THREE.ShaderMaterial({
    uniforms: { uWidth: { value: 100 }, uProg: { value: 0 }, uCol: { value: new THREE.Vector3(...col) }, uAlpha: { value: alpha } },
    transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false, blending: soft ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
    vertexShader: `attribute vec2 aN; attribute float aSide; attribute float aS; attribute float aW; uniform float uWidth; uniform float uProg; varying float vSide; varying float vS;
void main() { float taper = smoothstep(0.0, 0.02, aS) * (0.45 + 0.55 * smoothstep(0.0, 0.025, uProg - aS)) * (1.0 - 0.5 * smoothstep(1.03, 1.07, aS));
  vec3 p = position; p.xz += aN * aSide * uWidth * aW * taper; vSide = aSide; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float uProg; uniform vec3 uCol; uniform float uAlpha; varying float vSide; varying float vS;
void main() { if (vS > uProg) discard; float e = abs(vSide); float a = ${soft ? "pow(1.0 - e, 2.2)" : "1.0 - smoothstep(0.65, 1.0, e)"}; gl_FragColor = vec4(uCol, a * uAlpha); }`,
  });
  const glow = new THREE.Mesh(geo, mk(true, [1.0, 0.12, 0.08], 0.55)), line = new THREE.Mesh(geo, mk(false, [1.7, 0.18, 0.12], 1));
  glow.renderOrder = 900; line.renderOrder = 901;
  for (const m of [glow, line]) { m.frustumCulled = false; m.userData.camFree = true; m.userData.noShadow = true; noInk(m); }
  glow.name = "stroke glow"; line.name = "stroke";
  const G = new THREE.Group(); G.add(glow, line); G.name = "stroke";
  const set = (prog: number, width: number, alpha: number) => {
    for (const [m, w] of [[glow, 3.6], [line, 1]] as const) { const u = (m.material as THREE.ShaderMaterial).uniforms; u.uProg.value = prog; u.uWidth.value = width * w; u.uAlpha.value = alpha * (m === glow ? 0.55 : 1); }
    G.visible = alpha > 0.01 && prog > 0;
  };
  return { group: G, set };
}

// ---------------- map drawing helpers ----------------
type MV = { x0: number; z0: number; size: number; px: number };
const startCanvas = (V: MV) => { const c = mkCanvas(V.px, V.px), g = c.getContext("2d")!, k = V.px / V.size; g.setTransform(k, 0, 0, k, -V.x0 * k, -V.z0 * k); return { c, g, k }; };
const trace = (g: CanvasRenderingContext2D, P: [number, number][]) => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); };
const finish = (c: HTMLCanvasElement) => { const t = canvasTex(c); t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
const blob = (g: CanvasRenderingContext2D, x: number, z: number, r: number, rgba: string) => {
  const gr = g.createRadialGradient(x, z, 0, x, z, r); gr.addColorStop(0, rgba); gr.addColorStop(0.45, rgba.replace(/,([^,]+)\)$/, (_m, a) => "," + (parseFloat(a) * 0.85).toFixed(3) + ")")); gr.addColorStop(1, rgba.replace(/,[^,]+\)$/, ",0)")); g.fillStyle = gr; g.fillRect(x - r, z - r, 2 * r, 2 * r);
};
// sea with a lighter shelf along the coast, then land with soft patches. land: polygons in metres
function seaAndLand(g: CanvasRenderingContext2D, V: MV, lands: [number, number][][], landCol: string) {
  g.fillStyle = "#1F4E78"; g.fillRect(V.x0, V.z0, V.size, V.size);
  sd = 11; for (let i = 0; i < 500; i++) { blob(g, V.x0 + rnd() * V.size, V.z0 + rnd() * V.size, V.size * (0.02 + rnd() * 0.05), rnd() < 0.5 ? "rgba(70,130,190,0.10)" : "rgba(5,30,70,0.10)"); }
  g.lineJoin = "round";
  for (const P of lands) { trace(g, P); g.strokeStyle = "rgba(95,160,205,0.30)"; g.lineWidth = V.size * 0.03; g.stroke(); trace(g, P); g.strokeStyle = "rgba(120,185,220,0.35)"; g.lineWidth = V.size * 0.012; g.stroke(); }
  for (const P of lands) { trace(g, P); g.strokeStyle = "rgba(233,227,214,0.85)"; g.lineWidth = Math.max(60, V.size * 0.0004); g.stroke(); }
  for (const P of lands) { trace(g, P); g.fillStyle = landCol; g.fill(); }
}
const uvToW = (L: [number, number][]) => L.map(([u, v]) => W(u, v) as [number, number]);

// ---------------- the New York area, 400 km (x -200..200 km, z -200..200 km round the Manhattan map of city.ts) ----------------
export function nyMap(px = 2048) {
  const size = 400000, V: MV = { x0: -size / 2, z0: -size / 2, size, px }, { c, g, k } = startCanvas(V);
  const farWest = uvToW([[200, -200], [200, -2.75], [40, -2.75], [-25, -2.75], [-30, -7], [-40, -14], [-58, -22], [-80, -33], [-110, -48], [-150, -68], [-200, -92], [-200, -200]]);
  const farEast = uvToW([[-25, 40], [-28, 60], [-32, 80], [-36, 100], [-40, 125], [-44, 160], [-46, 200], [200, 200], [200, -1.0], [40, -1.0], [40, 40]]);
  const lands: [number, number][][] = [farWest, farEast, njPoly(), eastPoly(), southPoly(), govPoly()];
  seaAndLand(g, V, lands, "#667F50");
  const landPath = new Path2D(); for (const P of [farWest, farEast]) { landPath.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) landPath.lineTo(P[i][0], P[i][1]); landPath.closePath(); }
  sd = 21; for (let i = 0; i < 260; i++) {                                      // green and brown patches
    const x = V.x0 + rnd() * V.size, z = V.z0 + rnd() * V.size, r = 4000 + rnd() * 16000, q = rnd();
    g.save(); g.clip(landPath);
    blob(g, x, z, r, q < 0.5 ? "rgba(60,100,50,0.28)" : q < 0.8 ? "rgba(120,115,85,0.2)" : "rgba(40,80,50,0.25)"); g.restore();
  }
  // the Sound between Long Island and Connecticut, and the Hudson going north
  g.fillStyle = "#1F4E78";
  trace(g, uvToW([[26, 26], [28, 40], [31, 60], [35, 85], [39, 110], [43, 150], [48, 200], [55, 200], [50, 150], [46, 110], [42, 85], [38, 60], [34, 40], [33, 26]])); g.fill();
  // the city: a grey patch round Manhattan, a strip along Long Island, some towns along the Hudson and in New Jersey
  const city = (u: number, v: number, r: number, a: number) => { const [x, z] = W(u, v); blob(g, x, z, r, `rgba(128,123,116,${a})`); };
  city(8, -3, 50000, 0.95); city(10, 0, 32000, 1); city(-8, 20, 38000, 0.9); city(-10, 45, 30000, 0.75); city(-14, 70, 26000, 0.6);
  city(-6, -22, 30000, 0.8); city(30, -8, 24000, 0.8); city(55, -8, 16000, 0.55); city(26, 28, 18000, 0.6);
  for (const P of [islandPoly()]) { trace(g, P); g.fillStyle = "#77736E"; g.fill(); }
  edgeFade(g, V, { n: "#5F7F4E", w: "#5F7F4E", s: "#1F4E78", e: "#1F4E78" });
  return { tex: finish(c), V };
}
function edgeFade(g: CanvasRenderingContext2D, V: MV, c: { n: string; s: string; e: string; w: string }) {
  const e = V.size * 0.1, mk = (col: string, x0: number, z0: number, x1: number, z1: number, rx: number, rz: number, rw: number, rh: number) => {
    const gr = g.createLinearGradient(x0, z0, x1, z1); gr.addColorStop(0, col); gr.addColorStop(1, col + "00"); g.fillStyle = gr; g.fillRect(rx, rz, rw, rh);
  };
  mk(c.w, V.x0, 0, V.x0 + e, 0, V.x0, V.z0, e, V.size); mk(c.e, V.x0 + V.size, 0, V.x0 + V.size - e, 0, V.x0 + V.size - e, V.z0, e, V.size);
  mk(c.n, 0, V.z0, 0, V.z0 + e, V.x0, V.z0, V.size, e); mk(c.s, 0, V.z0 + V.size, 0, V.z0 + V.size - e, V.x0, V.z0 + V.size - e, V.size, e);
}

// the red loop round the New York area (u, v in km of the Manhattan map)
export const NY_LOOP: [number, number][] = uvToW([[40, -12], [44, 6], [36, 28], [14, 42], [-8, 40], [-26, 28], [-36, 6], [-36, -18], [-22, -30], [2, -36], [26, -30]]);


// ---------------- the Gulf of Mexico and the Yucatan coast (for the whale hit) ----------------
// lat / lon -> metres round the Chicxulub coast (21.3 N, 89.6 W). x = east, z = south.
export const LL = (lat: number, lon: number): [number, number] => [(lon + 89.6) * 103700, -(lat - 21.3) * 110600];
const nz = (x: number, z: number) => Math.sin(x * 0.00071 + Math.sin(z * 0.0004) * 2) * 0.5 + Math.sin(z * 0.0013 + x * 0.0007) * 0.3 + Math.sin(x * 0.0041 + z * 0.0029) * 0.2;
function wobble(P: [number, number][], seg = 2000, amp = 900) {          // coasts are not straight: a small wobble that is the same in every picture
  const out: [number, number][] = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / seg));
    for (let j = 0; j < n; j++) { const t = j / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; out.push([x + nz(x, z) * amp, z + nz(z + 500, x - 300) * amp]); }
  }
  return out;
}
const ll = (L: [number, number][]) => L.map(([la, lo]) => LL(la, lo));
export const IMPACT = LL(21.36, -89.6);                                          // a few km off the coast, in the water
export function gulfMaps() {
  const mainland = wobble(ll([[30.4, -80.0], [25.3, -80.1], [25.15, -80.9], [25.2, -81.1], [26.1, -81.8], [27.8, -82.8], [29.15, -83.05], [29.9, -84.0], [29.67, -85.35], [30.1, -85.7], [30.3, -87.2], [30.25, -88.05],
    [30.35, -89.3], [29.9, -89.9], [29.0, -89.2], [29.1, -90.3], [29.6, -91.5], [29.55, -93.0], [29.75, -93.9], [29.3, -94.8], [28.4, -96.3], [27.8, -97.3], [26.9, -97.4], [25.95, -97.15], [24.5, -97.7], [23.2, -97.8],
    [22.25, -97.85], [20.95, -97.4], [19.5, -96.4], [18.8, -95.8], [18.2, -94.5], [18.4, -93.2], [18.65, -91.8], [19.35, -90.72], [19.85, -90.53], [20.86, -90.4], [21.16, -90.03], [21.28, -89.66], [21.34, -89.26],
    [21.39, -88.9], [21.57, -88.23], [21.52, -87.7], [21.6, -87.07], [21.16, -86.8], [20.63, -87.07], [20.2, -87.45], [19.5, -87.45], [18.5, -87.8], [17.3, -88.1], [16.0, -88.6], [15.8, -87.5], [15.9, -86.0],
    [15.2, -83.4], [14.0, -83.3], [12.3, -83.4], [12.3, -99.2], [30.4, -99.2]]));
  const cuba = wobble(ll([[21.87, -84.95], [22.2, -84.0], [22.7, -83.2], [23.1, -82.4], [23.1, -81.0], [23.0, -80.0], [22.3, -80.0], [22.0, -80.3], [21.9, -81.5], [22.0, -83.2], [21.9, -84.3]]));
  const pacific = wobble(ll([[12.3, -99.2], [16.4, -99.2], [16.4, -98.5], [16.2, -96.5], [15.7, -95.0], [15.9, -93.7], [14.7, -92.4], [14.0, -91.0], [13.6, -90.0], [13.2, -88.0], [12.9, -87.4], [12.3, -86.8]]));
  const lands = [mainland, cuba];
  const draw = (V: MV, detail: boolean) => {
    const { c, g } = startCanvas(V);
    seaAndLand(g, V, lands, "#5F8A4C");
    g.fillStyle = "#1F4E78"; trace(g, pacific); g.fill();                         // the Pacific, west of Central America
    const shelf = (la: number, lo: number, r: number, a: number) => { const [x, z] = LL(la, lo); blob(g, x, z, r, `rgba(75,170,185,${a})`); };
    shelf(21.6, -90.2, 170000, 0.55); shelf(20.5, -92.5, 130000, 0.35); shelf(25.5, -83.5, 170000, 0.4); shelf(23.0, -81.5, 90000, 0.35);   // light shallow water
    g.save(); g.beginPath(); for (const P of lands) { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); } g.clip();
    const lb = (la: number, lo: number, r: number, rgba: string) => { const [x, z] = LL(la, lo); blob(g, x, z, r, rgba); };
    lb(21.0, -89.0, 220000, "rgba(160,170,95,0.55)"); lb(20.0, -98.5, 320000, "rgba(170,150,105,0.5)"); lb(29.5, -98.0, 380000, "rgba(175,160,115,0.5)");
    lb(17.5, -92.0, 260000, "rgba(50,110,60,0.45)"); lb(16.0, -88.5, 200000, "rgba(50,110,60,0.45)"); lb(28.0, -82.0, 200000, "rgba(70,125,70,0.4)"); lb(22.8, -82.0, 120000, "rgba(60,120,65,0.4)");
    sd = 77; for (let i = 0; i < (detail ? 220 : 500); i++) { const x = V.x0 + rnd() * V.size, z = V.z0 + rnd() * V.size, r = V.size * (0.01 + rnd() * 0.04), q = rnd(); blob(g, x, z, r, q < 0.5 ? "rgba(45,95,50,0.25)" : q < 0.8 ? "rgba(150,140,90,0.22)" : "rgba(85,120,60,0.22)"); }
    g.restore();
    if (detail) {                                                                  // the coast up close: sand, a village and its pier, salt marsh behind the beach
      for (const P of [mainland]) { trace(g, P); g.strokeStyle = "rgba(232,222,186,0.95)"; g.lineWidth = 520; g.stroke(); }
      g.save(); g.beginPath(); g.moveTo(mainland[0][0], mainland[0][1]); for (let i = 1; i < mainland.length; i++) g.lineTo(mainland[i][0], mainland[i][1]); g.closePath(); g.clip();
      sd = 5; for (let i = 0; i < 400; i++) { const x = V.x0 + rnd() * V.size, z = V.z0 + rnd() * V.size; blob(g, x, z, 600 + rnd() * 2200, rnd() < 0.6 ? "rgba(205,200,170,0.3)" : "rgba(70,105,60,0.3)"); }
      const [px, pz] = LL(21.285, -89.665); blob(g, px, pz, 2600, "rgba(150,145,140,0.9)"); blob(g, LL(21.3, -89.6)[0], LL(21.3, -89.6)[1], 1500, "rgba(150,145,140,0.8)"); blob(g, LL(21.32, -89.42)[0], LL(21.32, -89.42)[1], 1000, "rgba(150,145,140,0.7)");
      g.restore();
      g.strokeStyle = "#B8B0A0"; g.lineWidth = 60; g.beginPath(); g.moveTo(px - 500, pz - 600); g.lineTo(px - 500, pz - 6500); g.stroke();   // the pier at Progreso
    }
    if (!detail) edgeFade(g, V, { n: "#8A9A62", w: "#8A9A62", s: "#1F4E78", e: "#1F4E78" });
    return { tex: finish(c), V };
  };
  const BV: MV = { x0: -1000000, z0: -1000000, size: 2000000, px: 3072 }, MVv: MV = { x0: IMPACT[0] - 30000, z0: IMPACT[1] - 30000, size: 60000, px: 2048 };
  return { B: draw(BV, false), M: draw(MVv, true) };
}
// the red loop round the area that will be hit (about 140 km round the impact), hand-drawn: not a perfect circle
export const GULF_LOOP: [number, number][] = Array.from({ length: 13 }, (_, i) => { const a = (i / 13) * Math.PI * 2, r = 140000 + 16000 * Math.sin(i * 2.3 + 1) + 10000 * Math.sin(i * 5.1); return [IMPACT[0] + r * Math.cos(a), IMPACT[1] + r * 0.9 * Math.sin(a)] as [number, number]; });

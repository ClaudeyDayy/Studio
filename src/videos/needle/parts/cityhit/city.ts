// MANHATTAN for the city hit (2026-11-16). Our own map-like drawing of the place (no real map data):
// the island with its street grid, Central Park, the rivers, the boroughs around, piers, bridges,
// plus small 3D buildings (a little taller than real) with tall towers in Midtown and Downtown.
// The ground has 3 picture levels: the whole region, the area round the hit, and the streets right at the hit.
// Units: metres.  x = east, z = south.  The island runs along -z (north is up in the high view).
//   u = km along the island from its south tip,  v = km across it (east +).
import * as THREE from "three";
import { mkCanvas, canvasTex, noInk, MR } from "../../../../engine/kit";

let sd = 777; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const U0 = 10.8;                                                    // the island's middle sits at z = 0
export const W = (u: number, v: number): [number, number] => [v * 1000, -(u - U0) * 1000];
const INK = "#2A1A1E";

// ---------------- the island ----------------
const ROWS: [number, number, number][] = [[0, -0.25, 0.25], [0.4, -0.7, 0.6], [1, -1.0, 1.0], [2, -1.15, 1.45], [3, -1.25, 2.0], [4, -1.35, 2.0],
  [5, -1.42, 1.8], [6.5, -1.45, 1.6], [8, -1.45, 1.5], [10, -1.42, 1.45], [12, -1.38, 1.35], [13.5, -1.3, 1.05], [15, -1.2, 0.8],
  [16.5, -1.05, 0.5], [18, -0.9, 0.2], [19.5, -0.75, -0.05], [20.8, -0.6, -0.2], [21.6, -0.42, -0.36]];
export function edges(u: number): [number, number] {
  if (u <= 0) return [ROWS[0][1], ROWS[0][2]];
  for (let i = 0; i < ROWS.length - 1; i++) {
    const a = ROWS[i], b = ROWS[i + 1];
    if (u <= b[0]) { const k = smooth(0, 1, (u - a[0]) / (b[0] - a[0])); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  }
  const L = ROWS[ROWS.length - 1]; return [L[1], L[2]];
}
const wob = (u: number, s: number) => 0.012 * Math.sin(u * 7.1 + s) + 0.007 * Math.sin(u * 19.3 + 2 * s);
const inIsland = (u: number, v: number, m = 0) => { if (u < m || u > 21.6 - m) return false; const [a, b] = edges(u); return v > a + m && v < b - m; };
export function islandPoly(): [number, number][] {
  const P: [number, number][] = [];
  for (let u = 21.6; u >= 0; u -= 0.04) P.push(W(u, edges(u)[0] + wob(u, 1)));
  for (let k = 0; k <= 12; k++) { const a = (k / 12) * Math.PI; P.push(W(-0.2 * Math.sin(a), -0.25 * Math.cos(a))); }
  for (let u = 0; u <= 21.6; u += 0.04) P.push(W(u, edges(u)[1] + wob(u, 2)));
  return P;
}
// the land around (NJ to the west, Brooklyn / Queens / the Bronx to the east, a southern island)
const uvPoly = (pts: [number, number][]) => pts.map(([u, v]) => W(u, v));
export function njPoly() { const P: [number, number][] = [[40, -40]]; for (let u = 40; u >= -25; u -= 0.1) P.push([u, -2.75 + 0.12 * Math.sin(u * 0.6) + 0.05 * Math.sin(u * 2.3)]); P.push([-25, -40]); return uvPoly(P); }
export function eastPoly() {
  const S: [number, number][] = [[-25, 3.5], [-6, 2.9], [-2.5, 1.5], [-1.2, 1.2], [0.6, 1.4], [1.6, 1.75], [3, 2.6], [5, 2.4], [7, 2.15], [10, 2.0], [12, 1.85], [13.2, 1.35],
    [15, 1.0], [16.5, 0.7], [18, 0.4], [19.5, 0.15], [20.8, 0.0], [21.7, -0.25], [22.2, -0.75], [30, -0.95], [40, -1.0]];
  const P: [number, number][] = [];
  for (let i = 0; i < S.length - 1; i++) for (let k = 0; k < 10; k++) { const t = k / 10, u = S[i][0] + (S[i + 1][0] - S[i][0]) * t; P.push([u, S[i][1] + (S[i + 1][1] - S[i][1]) * t + 0.03 * Math.sin(u * 5.3)]); }
  P.push(S[S.length - 1], [40, 40], [-25, 40]);
  return uvPoly(P);
}
export const southPoly = () => uvPoly([[-9.5, -4], [-9.2, -1.5], [-10.5, 1.5], [-14, 2.2], [-20, 0.5], [-24, -3], [-20, -6], [-12, -5.5]]);
export const govPoly = () => { const P: [number, number][] = []; for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; P.push([-1.0 + 0.32 * Math.cos(a), 0.55 + 0.22 * Math.sin(a)]); } return uvPoly(P); };

// ---------------- the street grid and the blocks ----------------
export const AV = Array.from({ length: 13 }, (_, i) => -1.40 + i * 0.27);   // avenues (v, km): run along the island
export const ST0 = 3.6, STEP = 0.08;                                        // streets (u, km): cross it
export const AVW = 30, STW = 18;                                            // avenue / street widths, m
export const PARK = { u0: 9.0, u1: 13.1, v0: AV[4], v1: AV[7] };
export type Block = { c: [number, number]; d: [number, number]; hl: number; hw: number; u: number; v: number };
export const BLOCKS: Block[] = [];
{
  // north of 3.6 km: the regular grid (long sides across the island)
  for (let k = 0; ST0 + (k + 1) * STEP <= 21.7; k++) for (let i = 0; i < AV.length - 1; i++) {
    const u0 = ST0 + k * STEP + STW / 2000, u1 = ST0 + (k + 1) * STEP - STW / 2000;
    let v0 = AV[i] + AVW / 2000, v1 = AV[i + 1] - AVW / 2000;
    const uc = (u0 + u1) / 2;
    if (uc > PARK.u0 && uc < PARK.u1 && v0 > PARK.v0 - 0.01 && v1 < PARK.v1 + 0.01) continue;
    const [a0, b0] = edges(u0), [a1, b1] = edges(u1), lo = Math.max(a0, a1) + 0.035, hi = Math.min(b0, b1) - 0.035;
    v0 = Math.max(v0, lo); v1 = Math.min(v1, hi);
    if (v1 - v0 < 0.05) continue;
    const [x, z] = W(uc, (v0 + v1) / 2);
    BLOCKS.push({ c: [x, z], d: [1, 0], hl: (v1 - v0) * 500, hw: (u1 - u0) * 500, u: uc, v: (v0 + v1) / 2 });
  }
  // south of it: an older, smaller grid at an angle
  const O = [1.7, 0.2], ph = 0.25, eb = [Math.cos(ph), Math.sin(ph)], ea = [-Math.sin(ph), Math.cos(ph)], SA = 0.16, SB = 0.105;
  for (let i = -14; i <= 14; i++) for (let k = -20; k <= 20; k++) {
    const ac = (i + 0.5) * SA, bc = (k + 0.5) * SB, ha = (SA - 0.024) / 2, hb = (SB - 0.016) / 2;
    const at = (a: number, b: number) => [O[0] + eb[0] * b + ea[0] * a, O[1] + eb[1] * b + ea[1] * a];
    const cs = [at(ac - ha, bc - hb), at(ac + ha, bc - hb), at(ac - ha, bc + hb), at(ac + ha, bc + hb)];
    if (!cs.every(([u, v]) => u < 3.55 && inIsland(u, v, 0.03))) continue;
    const [uc, vc] = at(ac, bc), [x, z] = W(uc, vc);
    const dx = ea[1], dz = -ea[0], L = Math.hypot(dx, dz);           // the long side (along a) in world x / z
    BLOCKS.push({ c: [x, z], d: [dx / L, dz / L], hl: ha * 1000, hw: hb * 1000, u: uc, v: vc });
  }
}

// ---------------- the map picture (one function, three levels of detail) ----------------
type View = { x0: number; z0: number; size: number; px: number; lod: number };
const inView = (V: View, x: number, z: number, r: number) => x + r > V.x0 && x - r < V.x0 + V.size && z + r > V.z0 && z - r < V.z0 + V.size;
const path = (g: CanvasRenderingContext2D, P: [number, number][]) => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); };
const rectAt = (g: CanvasRenderingContext2D, cx: number, cz: number, d: [number, number], hl: number, hw: number) => {
  const px = -d[1], pz = d[0];
  g.moveTo(cx - d[0] * hl - px * hw, cz - d[1] * hl - pz * hw); g.lineTo(cx + d[0] * hl - px * hw, cz + d[1] * hl - pz * hw);
  g.lineTo(cx + d[0] * hl + px * hw, cz + d[1] * hl + pz * hw); g.lineTo(cx - d[0] * hl + px * hw, cz - d[1] * hl + pz * hw); g.closePath();
};

function drawBorough(g: CanvasRenderingContext2D, V: View, poly: [number, number][], ang: number, sa: number, sb: number, seed: number) {
  g.save(); path(g, poly); g.clip();
  g.fillStyle = "#7C7A76"; g.fillRect(V.x0, V.z0, V.size, V.size);                                    // the streets
  const ca = Math.cos(ang), sa_ = Math.sin(ang), cx = V.x0 + V.size / 2, cz = V.z0 + V.size / 2, R = V.size * 0.72;
  const pa = cx * ca + cz * sa_, pb = -cx * sa_ + cz * ca;
  const cols = ["#ABA59B", "#9E9890", "#918C85", "#B4AEA4", "#878079", "#A69D90", "#98928A", "#7E8A72"];
  const paths = cols.map(() => new Path2D()), park = new Path2D(), all = new Path2D();
  const i0 = Math.floor((pa - R) / sa), i1 = Math.ceil((pa + R) / sa), k0 = Math.floor((pb - R) / sb), k1 = Math.ceil((pb + R) / sb);
  for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) {
    const a = (i + 0.5) * sa, b = (k + 0.5) * sb, x = a * ca - b * sa_, z = a * sa_ + b * ca;
    if (!inView(V, x, z, sa)) continue;
    const h = hash(i + seed, k), hl = sa / 2 - 7, hw = sb / 2 - 7, d: [number, number] = [ca, sa_];
    const P = h < 0.025 ? park : paths[Math.floor(hash(k, i + seed) * cols.length)];
    const p2 = new Path2D(); rectAt(p2 as any, x, z, d, hl, hw); P.addPath(p2); all.addPath(p2);
  }
  cols.forEach((c, i) => { g.fillStyle = c; g.fill(paths[i]); });
  g.fillStyle = "#5E9A4A"; g.fill(park);
  const mpp = V.size / V.px;
  sd = 300 + seed;                                                                                      // neighbourhoods: soft darker / greener / paler patches
  for (let i = 0; i < 700; i++) {
    const x = V.x0 + rnd() * V.size, z = V.z0 + rnd() * V.size, r = 400 + rnd() * 1800, kind = rnd();
    const gr = g.createRadialGradient(x, z, 0, x, z, r);
    gr.addColorStop(0, kind < 0.55 ? "rgba(70,115,55,0.2)" : kind < 0.75 ? "rgba(70,70,74,0.1)" : "rgba(235,232,225,0.14)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - r, z - r, 2 * r, 2 * r);
  }
  const trees = new Path2D();                                                                           // street trees seen from above
  for (let i = 0; i < 60000; i++) { const x = V.x0 + rnd() * V.size, z = V.z0 + rnd() * V.size; if (hash(Math.floor(x / 900), Math.floor(z / 900) + seed) < 0.35) continue; const r = 9 + rnd() * 14; trees.moveTo(x + r, z); trees.arc(x, z, r, 0, 7); }
  g.fillStyle = "rgba(60,105,48,0.55)"; g.fill(trees);
  g.strokeStyle = "rgba(42,26,30,0.35)"; g.lineWidth = 1.1 * mpp; g.stroke(all);
  g.restore();
}

function drawPark(g: CanvasRenderingContext2D, V: View) {
  const [x0, z1] = W(PARK.u0 + 0.009, PARK.v0 + 0.015), [x1, z0] = W(PARK.u1 - 0.009, PARK.v1 - 0.015);
  if (!inView(V, (x0 + x1) / 2, (z0 + z1) / 2, 4000)) return;
  g.fillStyle = "#4E8F3F"; g.fillRect(x0, z0, x1 - x0, z1 - z0);
  sd = 99;
  for (let i = 0; i < 5000; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), r = 8 + rnd() * 22; g.fillStyle = rnd() < 0.6 ? "#3C7633" : "#67A955"; g.beginPath(); g.arc(x, z, r, 0, 7); g.fill(); }
  // meadows, two lakes, curvy paths
  g.fillStyle = "#86BC63"; for (const [u, v, a, b] of [[9.6, 0.05, 0.35, 0.18], [10.6, 0.25, 0.25, 0.12], [12.6, -0.1, 0.3, 0.14]]) { const [x, z] = W(u, v); g.beginPath(); g.ellipse(x, z, b * 1000, a * 1000, 0, 0, 7); g.fill(); }
  g.fillStyle = "#3F7FB0"; g.strokeStyle = INK; g.lineWidth = 3;
  { const [x, z] = W(11.55, 0.08); g.beginPath(); g.ellipse(x, z, 300, 430, 0.05, 0, 7); g.fill(); g.stroke(); }
  { const [x, z] = W(10.1, -0.02); g.beginPath(); g.ellipse(x, z, 170, 120, 0.6, 0, 7); g.fill(); g.stroke(); }
  g.strokeStyle = "#E3D9C2"; g.lineWidth = 7;
  for (let p = 0; p < 6; p++) { g.beginPath(); for (let u = PARK.u0 + 0.05; u < PARK.u1 - 0.05; u += 0.05) { const v = (PARK.v0 + PARK.v1) / 2 + (p - 2.5) * 0.11 + 0.05 * Math.sin(u * 6 + p * 2); const [x, z] = W(u, v); if (u === PARK.u0 + 0.05) g.moveTo(x, z); else g.lineTo(x, z); } g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = Math.max(2, 1.4 * V.size / V.px); g.strokeRect(x0, z0, x1 - x0, z1 - z0);
}

function drawStreetsDetail(g: CanvasRenderingContext2D, V: View) {
  // lane lines, crosswalks, manholes on the regular grid (only in the two close pictures)
  const u0 = (-(V.z0 + V.size) / 1000) + U0, u1 = (-V.z0 / 1000) + U0;
  const dash = (x0: number, z0: number, x1: number, z1: number, on: number, off: number, col: string, w: number) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash([on, off]); g.beginPath(); g.moveTo(x0, z0); g.lineTo(x1, z1); g.stroke(); g.setLineDash([]); };
  for (const a of AV) {                                                       // avenues: 4 lanes each way of white dashes
    const x = a * 1000; if (x < V.x0 - 40 || x > V.x0 + V.size + 40) continue;
    for (const o of [-6.8, -3.4, 3.4, 6.8]) dash(x + o, V.z0, x + o, V.z0 + V.size, 3, 9, "#ECEAE4", 0.15);
    dash(x - 0.25, V.z0, x - 0.25, V.z0 + V.size, 1e5, 0, "#E8C44A", 0.15); dash(x + 0.25, V.z0, x + 0.25, V.z0 + V.size, 1e5, 0, "#E8C44A", 0.15);
    for (const o of [-10.6, 10.6]) dash(x + o, V.z0, x + o, V.z0 + V.size, 1e5, 0, "#ECEAE4", 0.12);
  }
  for (let k = Math.floor((u0 - ST0) / STEP) - 1; k <= Math.ceil((u1 - ST0) / STEP) + 1; k++) {   // streets: one dashed middle line
    const z = W(ST0 + k * STEP, 0)[1];
    dash(V.x0, z, V.x0 + V.size, z, 3, 6, "#ECEAE4", 0.13);
    for (const a of AV) {                                                     // crosswalks on the four sides of each crossing
      const x = a * 1000; if (!inView(V, x, z, 40)) continue;
      g.fillStyle = "#EFEDE8";
      for (const s of [-1, 1]) {
        for (let o = -STW / 2 + 0.8; o < STW / 2 - 0.5; o += 1.25) g.fillRect(x + s * (AVW / 2 + 1.2), z + o, s * 3.2, 0.6);   // across the street
        for (let o = -AVW / 2 + 0.8; o < AVW / 2 - 0.5; o += 1.25) g.fillRect(x + o, z + s * (STW / 2 + 1.2), 0.6, s * 3.2);   // across the avenue
        g.fillRect(x + s * (AVW / 2 + 5.0), z - STW / 2, s * 0.45, STW);                                                        // stop lines
        g.fillRect(x - AVW / 2, z + s * (STW / 2 + 5.0), AVW, s * 0.45);
      }
    }
  }
  sd = 31;
  for (let i = 0; i < (V.lod === 2 ? 1500 : 6000); i++) { const x = V.x0 + rnd() * V.size, z = V.z0 + rnd() * V.size; g.fillStyle = rnd() < 0.5 ? "rgba(30,30,32,0.18)" : "rgba(160,158,154,0.12)"; g.fillRect(x, z, 1 + rnd() * 6, 0.6 + rnd() * 3); }
  for (let i = 0; i < (V.lod === 2 ? 60 : 300); i++) { const x = V.x0 + rnd() * V.size, z = V.z0 + rnd() * V.size; g.fillStyle = "#3B3938"; g.beginPath(); g.arc(x, z, 0.4, 0, 7); g.fill(); }
}

function drawBlocks(g: CanvasRenderingContext2D, V: View) {
  const mpp = V.size / V.px;
  for (const B of BLOCKS) {
    if (!inView(V, B.c[0], B.c[1], B.hl + 20)) continue;
    g.beginPath(); rectAt(g, B.c[0], B.c[1], B.d, B.hl, B.hw);
    g.fillStyle = V.lod > 0 ? "#CEC8BD" : "#ADA597"; g.fill();                                        // the sidewalk
    if (V.lod > 0) { g.strokeStyle = "#F0ECE4"; g.lineWidth = 0.35; g.stroke(); }
    g.beginPath(); rectAt(g, B.c[0], B.c[1], B.d, B.hl - 4.5, B.hw - 4.5); g.fillStyle = V.lod > 0 ? "#958C82" : "#9D9284"; g.fill();
    g.strokeStyle = "rgba(42,26,30,0.55)"; g.lineWidth = Math.max(0.15, 1.1 * mpp); g.stroke();
    if (V.lod === 0) continue;
    // street trees (outlined) and parked cars along the kerb
    const px = -B.d[1], pz = B.d[0];
    sd = 1000 + Math.floor(B.c[0] * 3 + B.c[1] * 7) % 100000;
    for (const s of [-1, 1]) {
      for (let l = -B.hl + 6; l < B.hl - 6; l += 9) {
        const x = B.c[0] + B.d[0] * l + px * s * (B.hw - 2.2), z = B.c[1] + B.d[1] * l + pz * s * (B.hw - 2.2);
        if (rnd() < 0.35) continue;
        g.fillStyle = rnd() < 0.5 ? "#4C8A3B" : "#5E9C48"; g.beginPath(); g.arc(x, z, 2.1 + rnd() * 0.6, 0, 7); g.fill();
        g.strokeStyle = INK; g.lineWidth = 0.18; g.stroke();
        g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.arc(x - 0.6, z - 0.6, 0.8, 0, 7); g.fill();
      }
      for (let l = -B.hl + 4; l < B.hl - 6; l += 6.2) {
        if (rnd() < 0.3) continue;
        const x = B.c[0] + B.d[0] * l + px * s * (B.hw + 1.4), z = B.c[1] + B.d[1] * l + pz * s * (B.hw + 1.4);
        const car = ["#C8312C", "#2F5F9E", "#E8E6E0", "#1E2124", "#9AA2AA", "#E3B53A", "#3E7A4E", "#6B6F75"][Math.floor(rnd() * 8)];
        g.save(); g.translate(x, z); g.rotate(Math.atan2(B.d[1], B.d[0]));
        g.fillStyle = car; g.beginPath(); (g as any).roundRect(-2.3, -0.92, 4.6, 1.84, 0.5); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.12; g.stroke();
        g.fillStyle = "#2A3440"; g.fillRect(0.6, -0.75, 0.9, 1.5); g.fillRect(-1.7, -0.7, 0.6, 1.4);
        g.restore();
      }
    }
  }
  // the long avenues inside each block edge also get kerb lines (done above) ; done
}

export function drawMap(V: View) {
  const c = mkCanvas(V.px, V.px), g = c.getContext("2d")!;
  const k = V.px / V.size; g.setTransform(k, 0, 0, k, -V.x0 * k, -V.z0 * k);
  const mpp = 1 / k;
  g.fillStyle = "#24557F"; g.fillRect(V.x0, V.z0, V.size, V.size);                     // water
  sd = 5; for (let i = 0; i < 4000; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(120,180,225,0.10)" : "rgba(10,40,80,0.10)"; const r = (40 + rnd() * 300) * Math.max(1, mpp / 10); g.beginPath(); g.ellipse(V.x0 + rnd() * V.size, V.z0 + rnd() * V.size, r * 2, r, 0.3, 0, 7); g.fill(); }
  const lands = [njPoly(), eastPoly(), southPoly(), govPoly()];
  for (const P of lands) { path(g, P); g.fillStyle = "#77736C"; g.fill(); }
  drawBorough(g, V, lands[0], 0.5, 110, 230, 3);
  drawBorough(g, V, lands[1], -0.3, 120, 210, 11);
  drawBorough(g, V, lands[2], 0.9, 160, 240, 17);
  // green strips: the cliffs along the west shore, a big park in the east, a few smaller ones
  g.fillStyle = "#4C8240";
  { path(g, uvPoly([[12, -2.78], [30, -2.78], [30, -3.25], [12, -3.2]])); g.fill(); }
  for (const [u, v, a, b] of [[-5, 4.6, 1.0, 0.8], [24, 3.0, 1.2, 0.7], [8, 4.5, 0.6, 0.9], [-1.0, 0.55, 0.12, 0.08]]) { const [x, z] = W(u, v); g.beginPath(); g.ellipse(x, z, b * 1000, a * 1000, 0.2, 0, 7); g.fill(); }
  // piers along the west shore of the island
  g.fillStyle = "#C4BBAE"; g.strokeStyle = INK; g.lineWidth = Math.max(0.2, 1.2 * mpp);
  for (let u = 0.7; u < 9.6; u += 0.24) { if (u > 6.5 && u < 7.8) continue; const v = edges(u)[0] + wob(u, 1); g.beginPath(); rectAt(g, ...W(u, v - 0.09), [1, 0], 100, 12); g.fill(); g.stroke(); }
  // the island: street asphalt, then the blocks, then the park
  const I = islandPoly(); path(g, I); g.fillStyle = V.lod > 0 ? "#5D5B5A" : "#77736E"; g.fill();
  if (V.lod > 0) { g.save(); path(g, I); g.clip(); drawStreetsDetail(g, V); g.restore(); }
  drawBlocks(g, V);
  drawPark(g, V);
  // shores: a light rim and a thin dark outline (map look)
  for (const P of [I, ...lands]) { path(g, P); g.strokeStyle = "#E9E3D6"; g.lineWidth = Math.max(1, 4 * mpp); g.stroke(); g.strokeStyle = INK; g.lineWidth = Math.max(0.3, 1.5 * mpp); g.stroke(); }
  const t = canvasTex(c); t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// ---------------- the ground: one plane, three pictures blended by where they are ----------------
export function ground(hit: [number, number]) {
  const R: View = { x0: -22000, z0: -22000, size: 44000, px: 2048, lod: 0 };
  const P: View = { x0: hit[0] - 1200, z0: hit[1] - 1200, size: 2400, px: 2048, lod: 1 };
  const C: View = { x0: hit[0] - 130, z0: hit[1] - 130, size: 260, px: 2048, lod: 2 };
  const tR = drawMap(R), tP = drawMap(P), tC = drawMap(C);
  const m = new THREE.MeshStandardMaterial({ map: tR, roughness: 0.93, metalness: 0 });
  const b = (V: View) => new THREE.Vector3(V.x0, V.z0, V.size);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { tP: { value: tP }, tC: { value: tC }, bR: { value: b(R) }, bP: { value: b(P) }, bC: { value: b(C) } });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vWP; uniform sampler2D tP; uniform sampler2D tC; uniform vec3 bR; uniform vec3 bP; uniform vec3 bC;
vec2 lvlQ(vec3 b) { return (vWP.xz - b.xy) / b.z; }
float lvlK(vec3 b) { vec2 q = lvlQ(b); vec2 e = min(q, 1.0 - q); return smoothstep(0.0, 0.08, min(e.x, e.y)); }`)
      .replace("#include <map_fragment>", `
vec2 qR = lvlQ(bR), qP = lvlQ(bP), qC = lvlQ(bC);
vec4 cR = texture2D(map, vec2(qR.x, 1.0 - qR.y)), cP = texture2D(tP, vec2(qP.x, 1.0 - qP.y)), cC = texture2D(tC, vec2(qC.x, 1.0 - qC.y));
vec4 tc = mix(vec4(0.27, 0.26, 0.24, 1.0), cR, lvlK(bR));
tc = mix(tc, cP, lvlK(bP)); tc = mix(tc, cC, lvlK(bC));
diffuseColor *= tc;`);
  };
  const g = new THREE.Mesh(new THREE.PlaneGeometry(600000, 600000), m);
  g.rotation.x = -Math.PI / 2; g.name = "ground"; g.receiveShadow = true; noInk(g);
  return g;
}

// ---------------- the buildings ----------------
function heightOf(u: number, v: number): { h: number; tower: boolean } {
  const r = rnd(), r2 = rnd();
  let lo = 18, hi = 45, p = 0.03, t0 = 70, t1 = 130;
  if (u < 1.7) { lo = 60; hi = 160; p = 0.4; t0 = 180; t1 = 400; }
  else if (u < 3.6) { lo = 18; hi = 45; p = 0.05; t0 = 80; t1 = 150; }
  else if (u < 6.2) { lo = 25; hi = 80; p = 0.08; t0 = 100; t1 = 200; }
  else if (u < 9.1) { const mid = 1 - Math.min(1, Math.abs(v - 0.1) / 1.6); lo = 60 + 40 * mid; hi = 150 + 60 * mid; p = 0.3 + 0.25 * mid; t0 = 200; t1 = 330 + 110 * mid; }
  else if (u < 13.2) { lo = 35; hi = 95; p = 0.05; t0 = 110; t1 = 190; }
  const tower = r2 < p;
  return { h: 1.45 * (tower ? t0 + (t1 - t0) * r : lo + (hi - lo) * r), tower };
}
export function buildings() {
  type Bd = { x: number; z: number; ang: number; l: number; w: number; h: number; tower: boolean; y: number };
  const L: Bd[] = [];
  sd = 4242;
  for (const B of BLOCKS) {
    const px = -B.d[1], pz = B.d[0], ang = -Math.atan2(B.d[1], B.d[0]);
    const put = (l0: number, l1: number, w0: number, w1: number, h: number, tower: boolean) => {
      const lc = (l0 + l1) / 2, wc = (w0 + w1) / 2;
      const b: Bd = { x: B.c[0] + B.d[0] * lc + px * wc, z: B.c[1] + B.d[1] * lc + pz * wc, ang, l: l1 - l0 - 1.2, w: w1 - w0, h, tower, y: 0 };
      L.push(b);
      if (tower && rnd() < 0.55) L.push({ ...b, l: b.l * 0.62, w: b.w * 0.62, y: h, h: h * (0.12 + rnd() * 0.12) });   // a slimmer top
    };
    let l = -B.hl + 5;
    while (l < B.hl - 12) {
      const hz = heightOf(B.u, B.v);
      if (hz.tower && B.hw > 24) { const len = Math.min(B.hl - 5 - l, 40 + rnd() * 30); put(l, l + len, -B.hw + 5, B.hw - 5, hz.h, true); l += len; continue; }
      const len = Math.min(B.hl - 5 - l, 20 + rnd() * 30);
      put(l, l + len, -B.hw + 5, -0.5, hz.h, false);
      const h2 = heightOf(B.u, B.v); put(l, l + len, 0.5, B.hw - 5, h2.tower ? h2.h * 0.5 : h2.h, false);
      l += len;
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying vec3 vNW;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vNW = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying vec3 vNW;")
      .replace("#include <color_fragment>", `#include <color_fragment>
float winM = 0.0;
{
  vec3 nW = normalize(vNW);
  if (nW.y > 0.5) {                                                    // roofs: grey, little roof boxes
    vec2 q = floor(vWP.xz / 5.0); float r = fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453);
    diffuseColor.rgb = mix(diffuseColor.rgb * 0.6, vec3(0.30, 0.30, 0.31), 0.55) * (0.85 + 0.3 * r);
  } else {                                                             // walls: rows of windows (fade to an average far away)
    float hc = dot(vWP.xz, vec2(-nW.z, nW.x));
    float fx = hc / 3.3, fy = vWP.y / 3.6;
    float fw = max(fwidth(fx), fwidth(fy));
    float win = step(0.2, fract(fx)) * step(fract(fx), 0.8) * step(0.3, fract(fy)) * step(fract(fy), 0.85);
    float k = 1.0 - smoothstep(0.25, 0.7, fw);
    float rr = fract(sin(dot(floor(vec2(fx, fy)), vec2(41.3, 289.1))) * 15731.7);
    vec3 glass = mix(vec3(0.05, 0.08, 0.13), vec3(0.22, 0.32, 0.45), rr);
    vec3 wallc = diffuseColor.rgb;
    diffuseColor.rgb = mix(mix(wallc, glass, 0.35), mix(wallc, glass, win), k);
    diffuseColor.rgb *= mix(0.6, 1.0, smoothstep(0.0, 5.0, vWP.y));
    winM = win * k;
  }
}`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.2, winM);");
  };
  const im = new THREE.InstancedMesh(geo, mat, L.length); im.name = "buildings";
  const low = ["#9C5B48", "#A8694F", "#B78B6A", "#C9BBA3", "#D8CCB6", "#BDB4A6", "#E4E0D6", "#8E5444"], tall = ["#5E7C93", "#6F8FA6", "#4D6A80", "#8AA0AE", "#C8C0B0", "#9FA9B0"];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
  L.forEach((b, i) => {
    q.setFromAxisAngle(Y, b.ang);
    m4.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(b.l, b.h, b.w)); im.setMatrixAt(i, m4);
    const pal = b.tower ? tall : low; col.set(pal[Math.floor(rnd() * pal.length)]); im.setColorAt(i, col);
  });
  im.castShadow = im.receiveShadow = true; im.frustumCulled = false;
  return im;
}

// ---------------- bridges (small details: they keep their outlines) ----------------
export function bridges() {
  const G = new THREE.Group(); G.name = "bridges";
  const deckM = MR("#8F959C", 0.7), towerM = MR("#B9AE9C", 0.8), cableM = MR("#6E747B", 0.5, 0.3);
  const list: [number, number, number, number, number][] = [[1.25, 1.02, 1.6, 1.82, 1], [2.0, 1.47, 2.2, 2.45, 1], [4.1, 2.0, 4.25, 2.62, 1], [9.0, 1.45, 9.1, 2.12, 0.9], [18.6, -0.9, 18.7, -2.97, 1.8]];
  for (const [ua, va, ub, vb, s] of list) {
    const [xa, za] = W(ua, va), [xb, zb] = W(ub, vb), len = Math.hypot(xb - xa, zb - za) + 300, ang = -Math.atan2(zb - za, xb - xa);
    const B = new THREE.Group(); B.position.set((xa + xb) / 2, 0, (za + zb) / 2); B.rotation.y = ang; B.name = "bridge";
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 5, 26 * s), deckM); deck.position.y = 45 * s; deck.name = "bridge deck"; B.add(deck);
    const th = 95 * s;
    for (const sx of [-0.27, 0.27]) for (const sz of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(12 * s, th, 7 * s), towerM); t.position.set(sx * len, th / 2, sz * 13 * s); t.name = "bridge tower"; B.add(t); }
    for (const sz of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 40; i++) { const x = -len / 2 + (len * i) / 40, xx = x / (len * 0.27), y = Math.abs(xx) <= 1 ? 45 * s + 4 + (th - 45 * s - 4) * xx * xx : th - (th - 45 * s) * Math.min(1, (Math.abs(xx) - 1) * 1.4); pts.push(new THREE.Vector3(x, y, sz * 13 * s)); }
      const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 1.4 * s, 6), cableM); c.name = "bridge cable"; B.add(c);
    }
    B.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = o.receiveShadow = true; } });
    G.add(B);
  }
  return G;
}

// ---------------- the red stroke round the target (hand-drawn, soft glow) ----------------
export function stroke() {
  const pts: THREE.Vector2[] = [];
  const raw: [number, number][] = [];
  for (let u = -0.7; u <= 22.3; u += 0.5) raw.push([u, edges(Math.min(21.6, Math.max(0, u)))[1] + 0.55 + 0.25 * smooth(18, 22, u) - 0.2 * smooth(-0.7, 0.4, -u)]);   // east side, going north
  raw.push([22.6, -0.4]);
  for (let u = 22.1; u >= -0.7; u -= 0.5) raw.push([u, edges(Math.min(21.6, Math.max(0, u)))[0] - 0.5 - 0.15 * smooth(-0.7, 0.4, -u)]);                          // west side, going south
  raw.push([-1.15, 0.1]);
  const C = new THREE.CatmullRomCurve3(raw.map(([u, v]) => { const [x, z] = W(u, v); return new THREE.Vector3(x, 0, z); }), true, "centripetal");
  const N = 700, over = 1.07;
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * over, p = C.getPointAt((s + 0.02) % 1);
    const w = 160 * Math.sin(s * 9.1 + 1) + 90 * Math.sin(s * 23.7) + 260 * (s - 0.5);                    // hand-drawn wobble, a little spiral at the end
    pts.push(new THREE.Vector2(p.x, p.z).addScaledVector(new THREE.Vector2(p.x, p.z).sub(new THREE.Vector2(150, 0)).normalize(), s > 1 ? w + 220 * (s - 1) / 0.07 : w));
  }
  const n = pts.length, pos = new Float32Array(n * 2 * 3), nrm = new Float32Array(n * 2 * 2), side = new Float32Array(n * 2), sv = new Float32Array(n * 2), wv = new Float32Array(n * 2), idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], t = new THREE.Vector2().subVectors(b, a).normalize();
    const s = (i / (n - 1)) * over, w = 0.8 + 0.25 * Math.sin(s * 31) + 0.15 * Math.sin(s * 77);
    for (let k = 0; k < 2; k++) {
      const j = i * 2 + k; pos.set([pts[i].x, 30, pts[i].y], j * 3); nrm.set([-t.y, t.x], j * 2); side[j] = k ? 1 : -1; sv[j] = s; wv[j] = w;
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

// ---------------- city life round the hit (Arian 03:25): cars driving on the avenues, cars waiting at red lights on the
// streets, people walking on the sidewalks and across the streets. Small details: they keep their outlines up close.
export function life(hit: [number, number]) {
  const G = new THREE.Group(); G.name = "city life";
  sd = 9191;
  type Car = { x: number; z: number; dx: number; dz: number; v: number };
  type Walker = { x: number; z: number; dx: number; dz: number; v: number; ph: number };
  const cars: Car[] = [], ppl: Walker[] = [];
  const RC = 1300, RP = 750, near = (x: number, z: number, r: number) => Math.abs(x - hit[0]) < r && Math.abs(z - hit[1]) < r;
  // avenues: two lanes each way, green light: moving, evenly spaced per lane (no car runs into another)
  for (const a of AV) {
    const x0 = a * 1000; if (Math.abs(x0 - hit[0]) > RC) continue;
    for (const o of [-6.8, -3.4, 3.4, 6.8]) {
      const dz = o < 0 ? -1 : 1, v = 9 + rnd() * 5;
      for (let z = hit[1] - RC - 80; z < hit[1] + RC + 80; z += 7 + rnd() * 26) cars.push({ x: x0 + o, z, dx: 0, dz, v });
    }
  }
  // streets: red light: short queues waiting before the stop lines
  const kHit = Math.round((U0 - hit[1] / 1000 - ST0) / STEP);
  for (let k = kHit - 18; k <= kHit + 18; k++) {
    const zs = W(ST0 + k * STEP, 0)[1];
    for (const a of AV) {
      const x0 = a * 1000; if (!near(x0, zs, RC)) continue;
      for (const s of [-1, 1]) {                               // s = -1: cars coming from the west, heading east
        const n = Math.floor(rnd() * 5);
        for (let i = 0; i < n; i++) cars.push({ x: x0 + s * (AVW / 2 + 8 + i * 6.6), z: zs - s * 2.6, dx: -s, dz: 0, v: 0 });
      }
    }
  }
  // people: along the long sides of every block near the hit, and along the avenue sidewalks (they cross the streets on the crosswalks)
  for (const B of BLOCKS) {
    if (!near(B.c[0], B.c[1], RP) || B.d[1] !== 0) continue;
    for (const s of [-1, 1]) for (const e of [1.0, 3.6]) {
      const z = B.c[1] + s * (B.hw - e);
      for (let l = -B.hl + 3; l < B.hl - 3; l += 5 + rnd() * 14) ppl.push({ x: B.c[0] + l, z, dx: rnd() < 0.5 ? -1 : 1, dz: 0, v: 1.1 + rnd() * 0.5, ph: rnd() * 7 });
    }
  }
  for (const a of AV) {
    const x0 = a * 1000; if (Math.abs(x0 - hit[0]) > RP) continue;
    for (const s of [-1, 1]) for (const e of [1.0, 3.6]) for (let z = hit[1] - RP; z < hit[1] + RP; z += 5 + rnd() * 14)
      ppl.push({ x: x0 + s * (AVW / 2 + e), z, dx: 0, dz: rnd() < 0.5 ? -1 : 1, v: 1.1 + rnd() * 0.5, ph: rnd() * 7 });
  }
  // shapes
  const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, n: number, name: string) => { const m = new THREE.InstancedMesh(geo, mat, n); m.name = name; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; G.add(m); return m; };
  const body = new THREE.BoxGeometry(4.4, 0.9, 1.8); body.translate(0, 0.75, 0);
  const cab = new THREE.BoxGeometry(2.3, 0.62, 1.6); cab.translate(-0.25, 1.5, 0);
  const legs = new THREE.BoxGeometry(0.22, 0.85, 0.32); legs.translate(0, 0.43, 0);
  const torso = new THREE.CapsuleGeometry(0.21, 0.42, 4, 8); torso.translate(0, 1.18, 0); torso.scale(1, 1, 1.35);
  const head = new THREE.SphereGeometry(0.13, 10, 8); head.translate(0, 1.65, 0);
  const mBody = mk(body, MR("#ffffff", 0.35, 0.3), cars.length, "cars"), mCab = mk(cab, MR("#2A3440", 0.15, 0.4), cars.length, "car windows");
  const mLegs = mk(legs, MR("#2E3038", 0.9), ppl.length, "people legs"), mTorso = mk(torso, MR("#ffffff", 0.85), ppl.length, "people"), mHead = mk(head, MR("#ffffff", 0.7), ppl.length, "people heads");
  const col = new THREE.Color();
  const carCols = ["#C8312C", "#2F5F9E", "#E8E6E0", "#1E2124", "#9AA2AA", "#E3B53A", "#E3B53A", "#3E7A4E", "#6B6F75", "#F2F0EA"];
  cars.forEach((_, i) => { col.set(carCols[Math.floor(rnd() * carCols.length)]); mBody.setColorAt(i, col); });
  const shirts = ["#C8312C", "#2F5F9E", "#E8E6E0", "#1E2124", "#E3B53A", "#3E7A4E", "#8A4FA0", "#E07A3A", "#7FB2D8", "#D9D2C4"], skins = ["#F1C9A5", "#D9A27A", "#A86E4C", "#6E4430", "#E8B98F"];
  ppl.forEach((_, i) => { col.set(shirts[Math.floor(rnd() * shirts.length)]); mTorso.setColorAt(i, col); col.set(skins[Math.floor(rnd() * skins.length)]); mHead.setColorAt(i, col); });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), sc = new THREE.Vector3();
  const update = (t: number) => {
    cars.forEach((c, i) => {
      q.setFromAxisAngle(Y, -Math.atan2(c.dz, c.dx)); p.set(c.x + c.dx * c.v * t, 0, c.z + c.dz * c.v * t);
      m4.compose(p, q, one); mBody.setMatrixAt(i, m4); mCab.setMatrixAt(i, m4);
    });
    ppl.forEach((w, i) => {
      const step = t * w.v * 1.9 + w.ph, bob = Math.abs(Math.sin(step)) * 0.05;
      q.setFromAxisAngle(Y, -Math.atan2(w.dz, w.dx) + 0.06 * Math.sin(step)); p.set(w.x + w.dx * w.v * t, bob, w.z + w.dz * w.v * t);
      m4.compose(p, q, one); mTorso.setMatrixAt(i, m4); mHead.setMatrixAt(i, m4);
      sc.set(1, 1, 0.6 + 0.4 * Math.abs(Math.cos(step))); m4.compose(p, q, sc); mLegs.setMatrixAt(i, m4);   // legs open and close as they walk
    });
    for (const m of [mBody, mCab, mLegs, mTorso, mHead]) m.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { group: G, update, count: { cars: cars.length, people: ppl.length } };
}

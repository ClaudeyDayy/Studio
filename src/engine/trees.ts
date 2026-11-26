// TREES (HOUSE 2026-11-14, his rule): trees belong to the PLACE. A warm place gets the trees that grow in a warm place.
// Inside one place most trees are the same kind (the main kind), a few are a second kind, and no two are exact copies
// (size, lean, crown shape and leaf colour vary a little). Never one identical tree repeated, never a random mix.
//   scatterTrees(root, "temperate", [[x, z], [x, z], ...], seed)      the place's own mix (src/house/look.ts HOUSE.trees)
//   makeTree("oak", seed, size)                                        one tree of a kind
// Kinds: oak (round leafy crown on a forked trunk), umbrella (wide flat crown, thin forked trunk), pine (tall, layered),
// cypress (thin dark column), birch (white trunk, light crown), palm (curved trunk, fronds), cactus, bush, bare (no leaves).
// Look (his reference): the crown is many sprays of small leaves in 3 close greens, you can see the trunk and its fork;
// no outlines on trees (many small clumps with lines look noisy).
// Cost: a tree is about 15-25 meshes (leaves merged per colour). A few hundred trees are fine; thousands need instancing.
import * as THREE from "three";
import { HOUSE } from "../house/look";
import { MR, noInkAll, mkCanvas, canvasTex } from "./kit";

export type TreeKind = "oak" | "umbrella" | "pine" | "cypress" | "birch" | "palm" | "cactus" | "bush" | "bare";
const rnd = (seed: number) => { let s = Math.floor(seed * 7919 + 13) % 2147483647; if (s <= 0) s += 2147483646; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; };
const clumpGeo = new THREE.IcosahedronGeometry(1, 0);                       // a faceted clump = a bunch of leaves
const shade = (hex: string, k: number) => "#" + new THREE.Color(hex).multiplyScalar(k).getHexString();
const leafMat = (hex: string) => { const m = MR(hex, 0.95); m.flatShading = true; return m; };
const GREENS: Record<string, string[]> = {
  oak: ["#3F8F3A", "#56A845", "#2F7434"], umbrella: ["#4C9A3C", "#66B24A", "#3A7F36"], pine: ["#2F6E4A", "#3C8257", "#235A3E"],
  cypress: ["#2A5E40", "#346F4A", "#204D36"], birch: ["#7DBB4E", "#96CC5E", "#63A244"], palm: ["#3E9A4E", "#57B05C", "#2F8244"],
  bush: ["#4A9440", "#60AA4C", "#377C38"], cactus: ["#4E9A5C", "#5FAE6A", "#3F844E"],
};
function limb(g: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, mat: THREE.Material) {
  const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, d.length(), 7), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); g.add(m);
}
// a spray of small leaves on a clear background (white-grey: the material colour tints it green)
let leafTexCache: THREE.Texture | null = null;
function leafTex() {
  if (leafTexCache) return leafTexCache;
  const W = 256, c = mkCanvas(W, W), g = c.getContext("2d")!, r = rnd(77);
  for (let i = 0; i < 95; i++) {
    const a = r() * 6.283, d = Math.pow(r(), 0.7) * W * 0.4, x = W / 2 + Math.cos(a) * d, y = W / 2 + Math.sin(a) * d, L = 15 + 13 * r(), v = Math.round(150 + 105 * r());
    g.save(); g.translate(x, y); g.rotate(a + (r() - 0.5) * 1.2); g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath(); g.moveTo(-L / 2, 0); g.quadraticCurveTo(0, -L * 0.42, L / 2, 0); g.quadraticCurveTo(0, L * 0.42, -L / 2, 0); g.fill(); g.restore();
  }
  const t = canvasTex(c); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; leafTexCache = t; return t;
}
const leafMats = new Map<string, THREE.MeshStandardMaterial>();
const leafCard = (hex: string) => { let m = leafMats.get(hex); if (!m) { m = new THREE.MeshStandardMaterial({ map: leafTex(), color: hex, roughness: 0.95, alphaTest: 0.45, side: THREE.DoubleSide }); leafMats.set(hex, m); } return m; };
// LEAFY CROWN: each clump is 3 crossed cards of small leaves. All clumps of one colour are merged into one mesh (fast), and
// their normals point away from the crown's middle, so the crown shades like one soft round mass (light top, dark underside).
function clumps(g: THREE.Group, r: () => number, c: THREE.Vector3, rx: number, ry: number, n0: number, size0: number, cols: string[]) {
  const n = Math.round(n0 * 1.6), size = size0 * 1.9;
  const P: number[][] = [[], [], []], N: number[][] = [[], [], []], U: number[][] = [[], [], []], I: number[][] = [[], [], []], v = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, u = Math.pow(r(), 0.6), k = i % 3 === 0 ? 2 : i % 3 === 1 ? 0 : 1;
    const o = new THREE.Vector3(c.x + Math.cos(a) * rx * u, c.y + (r() - 0.35) * ry, c.z + Math.sin(a) * rx * u), s = size * (0.75 + 0.5 * r()), yaw = r() * 3.1416;
    for (let q = 0; q < 3; q++) {
      const ang = yaw + (q * Math.PI) / 3, tilt = (r() - 0.5) * 0.9, ax = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)), up = new THREE.Vector3(-Math.sin(ang) * Math.sin(tilt), Math.cos(tilt), Math.cos(ang) * Math.sin(tilt)), base = P[k].length / 3;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        v.copy(o).addScaledVector(ax, sx * s * 0.5).addScaledVector(up, sy * s * 0.5); P[k].push(v.x, v.y, v.z);
        nn.copy(v).sub(c); nn.y += Math.max(rx, ry) * 0.45; nn.normalize(); N[k].push(nn.x, nn.y, nn.z); U[k].push((sx + 1) / 2, (sy + 1) / 2);
      }
      I[k].push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  for (let k = 0; k < 3; k++) {
    if (!P[k].length) continue;
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(P[k], 3)); geo.setAttribute("normal", new THREE.Float32BufferAttribute(N[k], 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(U[k], 2)); geo.setIndex(I[k]);
    const m = new THREE.Mesh(geo, leafCard(cols[k])); m.name = "leaves"; g.add(m);
  }
}
/** one tree. size = about how tall, in metres (people are 1.2 m). */
export function makeTree(kind: TreeKind, seed = 1, size = 0): THREE.Group {
  const r = rnd(seed), g = new THREE.Group(); g.name = "tree-" + kind;
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z), cols = GREENS[kind] ?? GREENS.oak;
  const bark = MR(kind === "birch" ? "#E9E4D8" : kind === "palm" ? "#9A7A54" : shade("#6B4A30", 0.85 + 0.3 * r()), 0.9);
  const H = size || ({ oak: 3.2, umbrella: 2.8, pine: 4.6, cypress: 4.2, birch: 3.4, palm: 4.0, cactus: 1.6, bush: 0.7, bare: 2.8 } as Record<string, number>)[kind] * (0.8 + 0.4 * r());
  const lean = V((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25);
  if (kind === "oak" || kind === "umbrella" || kind === "birch" || kind === "bare") {
    const fork = V(lean.x * H * 0.45, H * (kind === "umbrella" ? 0.55 : 0.42), lean.z * H * 0.45), tw = kind === "birch" ? 0.05 : 0.09;
    limb(g, V(0, 0, 0), fork, H * tw, H * tw * 0.6, bark);
    const nb = kind === "bare" ? 5 : 3 + Math.floor(r() * 2), spread = kind === "umbrella" ? 0.62 : 0.36;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * 6.283 + r(), tip = V(fork.x + Math.cos(a) * H * spread * (0.6 + 0.5 * r()), H * (kind === "umbrella" ? 0.8 : 0.72) + r() * H * 0.1, fork.z + Math.sin(a) * H * spread * (0.6 + 0.5 * r()));
      limb(g, fork, tip, H * tw * 0.5, H * tw * 0.22, bark);
      if (kind === "bare") { limb(g, tip, tip.clone().add(V((r() - 0.5) * H * 0.3, H * 0.16, (r() - 0.5) * H * 0.3)), H * tw * 0.2, H * 0.008, bark); continue; }
      clumps(g, r, tip.clone().add(V(0, H * 0.06, 0)), H * (kind === "umbrella" ? 0.26 : 0.22), H * (kind === "umbrella" ? 0.1 : 0.22), kind === "birch" ? 7 : 10, H * (kind === "umbrella" ? 0.1 : 0.115), cols);
    }
    if (kind !== "bare") clumps(g, r, V(fork.x, H * (kind === "umbrella" ? 0.86 : 0.84), fork.z), H * (kind === "umbrella" ? 0.5 : 0.26), H * (kind === "umbrella" ? 0.08 : 0.2), kind === "umbrella" ? 16 : 10, H * 0.11, cols);
  } else if (kind === "pine" || kind === "cypress") {
    const top = V(lean.x * H * 0.3, H, lean.z * H * 0.3); limb(g, V(0, 0, 0), top, H * 0.04, H * 0.008, bark);
    const tiers = kind === "pine" ? 6 : 9, base = kind === "pine" ? 0.24 : 0.1;
    for (let i = 0; i < tiers; i++) {
      const k = i / (tiers - 1), y = H * (kind === "pine" ? 0.26 : 0.1) + k * H * (kind === "pine" ? 0.7 : 0.88), rad = H * base * (kind === "pine" ? 1 - 0.82 * k : Math.sin(Math.PI * (0.15 + 0.8 * k)));
      clumps(g, r, V(top.x * k, y, top.z * k), rad, H * 0.05, kind === "pine" ? 7 : 5, Math.max(H * 0.045, rad * 0.55), cols);
    }
  } else if (kind === "palm") {
    const pts: THREE.Vector3[] = []; const bend = 0.5 + 0.5 * r(), ang = r() * 6.283;
    for (let i = 0; i <= 6; i++) { const k = i / 6; pts.push(V(Math.cos(ang) * bend * k * k * H * 0.3, k * H, Math.sin(ang) * bend * k * k * H * 0.3)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, H * 0.035, 7), bark));
    const topP = pts[6], fm = [leafMat(cols[0]), leafMat(cols[1]), leafMat(cols[2])]; for (const m of fm) m.side = THREE.DoubleSide;
    for (let i = 0; i < 8; i++) {   // fronds: long thin leaves that arch out and droop
      const a = (i / 8) * 6.283 + r() * 0.4, L = H * (0.34 + 0.1 * r()), geo = new THREE.PlaneGeometry(L, H * 0.085, 6, 1), p = geo.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j < p.count; j++) { const x = p.getX(j) + L / 2, k = x / L; p.setXYZ(j, x, p.getY(j) * (1 - 0.8 * k), 0); p.setZ(j, 0); p.setY(j, p.getY(j)); p.setXYZ(j, x, L * (0.28 * k - 0.62 * k * k), p.getY(j)); }
      geo.computeVertexNormals(); const f = new THREE.Mesh(geo, fm[i % 3]); f.position.copy(topP); f.rotation.y = a; g.add(f);
    }
    const nut = new THREE.Mesh(clumpGeo, MR("#6A4A2C", 0.9)); nut.scale.setScalar(H * 0.045); nut.position.copy(topP); g.add(nut);
  } else if (kind === "cactus") {
    const cm = MR(cols[0], 0.8), body = new THREE.Mesh(new THREE.CapsuleGeometry(H * 0.1, H * 0.8, 4, 10), cm); body.position.y = H * 0.5; g.add(body);
    for (let i = 0; i < 1 + Math.floor(r() * 2); i++) { const s = i ? -1 : 1, y = H * (0.4 + 0.2 * r()), arm = new THREE.Mesh(new THREE.CapsuleGeometry(H * 0.065, H * 0.26, 4, 8), cm);
      limb(g, V(0, y, 0), V(s * H * 0.22, y, 0), H * 0.065, H * 0.065, cm); arm.position.set(s * H * 0.22, y + H * 0.16, 0); g.add(arm); }
  } else { clumps(g, r, V(0, H * 0.5, 0), H * 0.7, H * 0.5, 9, H * 0.42, cols); }
  g.rotation.y = r() * 6.283;
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  noInkAll(g);
  return g;
}
export type Climate = keyof typeof HOUSE.trees.climates;
/** Trees for a place: mostly the climate's main kind, some of its second kind, rarely its third. spots = [x, z] ground points. */
export function scatterTrees(root: THREE.Object3D, climate: Climate, spots: [number, number][], seed = 1, groundY = 0): THREE.Group[] {
  const mix = HOUSE.trees.climates[climate] as readonly TreeKind[], r = rnd(seed), [wA, wB] = HOUSE.trees.mix, out: THREE.Group[] = [];
  spots.forEach(([x, z], i) => {
    const u = r(), kind = mix[u < wA ? 0 : u < wA + wB ? Math.min(1, mix.length - 1) : Math.min(2, mix.length - 1)];
    const t = makeTree(kind, seed * 31 + i + 1); t.position.set(x, groundY, z); root.add(t); out.push(t);
  });
  return out;
}

// Chess helpers (board, pieces). The general helpers (M, MT, mkCanvas, popScale, hull ...) come from the engine.
import * as THREE from "three";
import { M, mkCanvas, canvasTex, hull } from "../../engine/kit";
export * from "../../engine/kit";

export const boardTex = (light = "#F6E3B4", dark = "#B8502A", line = "#3A1E14") => {
  const c = mkCanvas(512, 512), g = c.getContext("2d")!;
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { g.fillStyle = (i + j) % 2 ? dark : light; g.fillRect(i * 64, j * 64, 64, 64); }
  g.strokeStyle = line; g.lineWidth = 3;
  for (let k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, 512); g.stroke(); g.beginPath(); g.moveTo(0, k * 64); g.lineTo(512, k * 64); g.stroke(); }
  g.lineWidth = 8; g.strokeRect(2, 2, 508, 508);
  return canvasTex(c);
};

// ---------------- chess pieces ----------------
export const PROF: Record<string, [number, number][]> = {
  pawn: [[0, 0], [.5, 0], [.5, .1], [.28, .18], [.2, .45], [.32, .5], [.25, .56], [.3, .7], [.22, .9], [.1, 1], [0, 1]],
  rook: [[0, 0], [.5, 0], [.5, .12], [.34, .2], [.3, .65], [.45, .7], [.45, 1], [0, 1]],
  bishop: [[0, 0], [.5, 0], [.5, .1], [.3, .2], [.18, .5], [.3, .55], [.22, .6], [.3, .8], [.18, 1], [0, 1.05]],
  queen: [[0, 0], [.5, 0], [.5, .1], [.3, .2], [.2, .55], [.35, .6], [.25, .65], [.38, .85], [.3, .95], [.45, 1], [0, 1]],
  king: [[0, 0], [.5, 0], [.5, .1], [.3, .2], [.2, .55], [.35, .6], [.25, .65], [.38, .85], [.3, .92], [.0, .95]],
  knight: [[0, 0], [.5, 0], [.5, .1], [.3, .2], [.28, .4], [0, .45]],
};
export const HGT: Record<string, number> = { pawn: 0.07, rook: 0.085, bishop: 0.1, queen: 0.115, king: 0.125, knight: 0.1 };
const pieceGeos = new Map<string, THREE.LatheGeometry>();
export const lathe = (kind: string) => {
  let g = pieceGeos.get(kind);
  if (!g) { g = new THREE.LatheGeometry(PROF[kind].map(([r, y]) => new THREE.Vector2(r * 0.07, y * HGT[kind])), 14); pieceGeos.set(kind, g); }
  return g;
};
export const BACK_ROW = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
export const kindAt = (i: number, j: number) => (j === 0 || j === 7 ? BACK_ROW[i] : "pawn");
export const HOMES: [number, number][] = [];
for (let i = 0; i < 8; i++) for (const j of [0, 1, 6, 7]) HOMES.push([i, j]);
export const pieceId = (i: number, j: number) => `${i},${j}`;           // id = home square
export const kindOf = (id: string) => { const [i, j] = id.split(",").map(Number); return kindAt(i, j); };

// one chess piece as a group (the knight gets a head, the king a cross); optional ink hull
export const makePiece = (kind: string, col: string, side: -1 | 1, withHull: boolean) => {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, y: number, rx = 0) => {
    const m = new THREE.Mesh(geo, M(col)); m.position.y = y; m.rotation.x = rx; m.castShadow = true; m.receiveShadow = true; g.add(m);
    if (withHull) { const h = hull(geo, 1.08); h.position.y = y; h.rotation.x = rx; g.add(h); }
    return m;
  };
  add(lathe(kind), 0);
  if (kind === "knight") { const m = add(new THREE.BoxGeometry(0.035, 0.07, 0.06), 0.065, side * 0.3); m.position.z = side * 0.01; }
  if (kind === "king") { add(new THREE.BoxGeometry(0.012, 0.04, 0.012), HGT.king + 0.02); add(new THREE.BoxGeometry(0.03, 0.012, 0.012), HGT.king + 0.025); }
  return g;
};

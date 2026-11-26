// THE STORY: "North Vietnam won the war" (R3KNRF, THE 3D LOOK). Time, places, camera shots, faces, talking, captions.
// Voice: words.json (his own recording, 73.46 s, never re-timed). No loop. 2 object transitions. Captions 1 word at a time.
// Places (world metres, ground y = 0 unless said):
//   PADDY  around (0,0,0): Minh's rice field, the jungle edge with a trapdoor behind him, the soldiers' lookout far in front.
//   CAMP   around (80,0,0): rows of soldiers, tents, the calendar pole, a helipad, the tank lane; the war-room tent at WT.
//   CUT    the cut-open ground: a slab of earth, front face at z = 0, x from CUT_X to CUT_X + 48, surface at y = CUT_H.
//   HOME   around (240,0,0): a kitchen at night (the "You see," part).
import words from "./words.json";
import { V3 } from "../../engine/core/util";
import { P, Shot, makeCamera, makeWhite } from "../../engine/core/camera";
import { makeLife, Life } from "../../engine/cast/life";
import type { FaceKey } from "../../engine/cast/face";
import { Word, capsFromWords } from "../../engine/core/captions";
import { makeTalk } from "../../engine/core/talk";
import { lightTrack, LIGHTS, Light } from "../../engine/core/lights";
import type { FxEvent } from "../../engine/fx/fx";

export const FPS = 30;
export const WORDS = words as Word[];
export const DURATION = 74.0;
export const TOTAL = Math.round(DURATION * FPS);           // 2220
export const LOOP = false;

// ---------------- places ----------------
export const M0: V3 = [0, -0.03, 0];                        // Minh's spot in the paddy (feet just in the water)
export const TD: V3 = [-2.3, 0.04, -4.0];                   // the trapdoor at the jungle edge behind him
export const LK: V3 = [16, 0, 26];                          // the soldiers' lookout (sandbags) far in front of Minh
const dl = Math.hypot(M0[0] - LK[0], M0[2] - LK[2]);
export const LKD: V3 = [(M0[0] - LK[0]) / dl, 0, (M0[2] - LK[2]) / dl];   // from the lookout toward Minh
export const LKP: V3 = [LKD[2], 0, -LKD[0]];                // along the sandbag wall
const lk = (along: number, toward: number, y = 0): V3 => [LK[0] + LKP[0] * along + LKD[0] * toward, y, LK[2] + LKP[2] * along + LKD[2] * toward];
export const CAMP: V3 = [80, 0, 0];
export const CAL: V3 = [78.6, 0, 5.2];                      // the calendar pole
export const PAD: V3 = [92, 0, -8];                         // helipad
export const WT: V3 = [66, 0, 14];                          // war-room tent (door toward +z)
export const TABLE: V3 = [WT[0], 0, WT[2] - 0.6];           // map table inside it (top at y 0.5)
export const LAMP_X = 28.2;                                 // the floor-2 lamp the camera dives into (S11 -> S12 match)
export const CUT_X = -330, CUT_H = 6.5, CUT_W = 48, CUT_D = 3.0;
export const cx = (x: number) => CUT_X + x;                 // local x along the cut -> world x
export const F1 = 3.6, F2 = 1.2;                            // floor heights of the two tunnel floors (world y)
export const HOME: V3 = [240, 0, 0];

// ---------------- the cut-open ground (char grid, 0.25 m cells, 26 rows x 192 cols) ----------------
export const CELL = 0.25;
export const CUT_ROWS = (() => {
  const H = Math.round(CUT_H / CELL), W = Math.round(CUT_W / CELL), g: string[][] = [];
  for (let r = 0; r < H; r++) g.push(Array(W).fill(r === 0 ? "g" : "#"));
  const carve = (x0: number, x1: number, y0: number, y1: number) => {        // metres, local x, world y
    for (let r = 0; r < H; r++) { const yc = CUT_H - (r + 0.5) * CELL; if (yc < y0 || yc > y1) continue;
      for (let c = 0; c < W; c++) { const xc = (c + 0.5) * CELL; if (xc >= x0 && xc <= x1) g[r][c] = "."; } }
  };
  carve(1.5, 2.3, F1, CUT_H);                    // A: entry shaft under the surface trapdoor
  carve(1.5, 13.2, F1, F1 + 1.4);                // A: the tunnel he digs (plugs fill it until dug)
  carve(13.0, 40.6, F1, F1 + 1.4);               // floor 1 main tunnel
  carve(14.0, 17.6, F1, F1 + 2.0);               // B: kitchen
  carve(18.6, 22.2, F1, F1 + 2.0);               // B: hospital
  carve(23.2, 26.4, F1, F1 + 2.0);               // B: beds
  carve(26.6, 27.4, F1 + 1.4, CUT_H);            // B: shaft up into the termite mound
  carve(3.0, 46.0, F2, F2 + 1.4);                // floor 2 long tunnel
  for (const x of [17.75, 29.4, 38.4]) carve(x, x + 0.9, F2 + 1.0, F1 + 0.2);       // shafts between the floors (29.4 = the ladder)
  carve(40.4, 45.8, F1, F1 + 2.0);               // E: the hammock room under Max's boots
  carve(31.0, 34.0, 0.25, F2 + 0.2);             // a small deep room (stores)
  return g.map((r) => r.join(""));
})();
// S8: the tunnel he digs, opened segment by segment (local x from 2.3 to 13.0): the dig face x at time t
export const digX = (t: number) => 2.3 + 10.7 * smoothc((t - 32.5) / 2.4);
function smoothc(x: number) { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); }
export const sm = (a: number, b: number, t: number) => smoothc((t - a) / (b - a));

// ---------------- light (dawn -> day -> sunset (bombs) -> night ("You see,") -> dawn/day) ----------------
const DAWN: Light = { ...LIGHTS.sunset, sky: "#F2B49C", sunI: 2.9, az: 25, el: 14, lit: [1.8, 1.3, 1.05], sun: [1.0, 0.78, 0.6] };
// his note: more sunlight (brighter, warmer sun, sunny sky)
const SUNNY: Light = { ...LIGHTS.day, az: 35, el: 52, sunI: 3.6, sun: [1.0, 0.92, 0.74], lit: [1.95, 1.75, 1.28], shade: [0.7, 0.68, 0.72], sky: "#8ED0F0" };
export const LIGHT = lightTrack([[0, DAWN], [4.0, SUNNY, 0.2], [46.8, "sunset", 1.0], [51.0, "night", 0.3], [62.0, DAWN, 0.3], [66.0, SUNNY, 1.2]]);
export const TENT_DAY: Light = { ...LIGHTS.indoor, sky: "#E8B87A" };
export const TENT_NIGHT: Light = { ...LIGHTS.indoor, lit: [1.3, 1.0, 0.8], sun: [0.55, 0.62, 0.95], sunI: 0.9, sky: "#141A38" };

// ---------------- camera ----------------
// P(camera position, point it looks at, lens degrees, background blur, roll)
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const MH: V3 = add(M0, [0, 0.88, 0]);                       // Minh's head
const C = (x: number, y: number, z: number): V3 => [cx(x), y, z];
export const S = { // shot start times (from words.json)
  s1: 0, s2: 4.1, s3: 12.4, s4: 16.0, s5: 20.75, s6: 25.1, s7: 27.25, s8: 31.45, s9: 35.95, s10: 41.75, s11: 46.7, s12: 50.95,
  s13: 57.65, s14: 62.05, s15: 65.95, s16: 69.95, s17: 72.25,
};
const shots: Shot[] = [
  // S1 dawn paddy: low on his sandals, rise to him; helicopters and jets cross the sky behind him; "won" he plants the shovel
  { t: 0, space: "paddy", from: P([0.15, 0.12, 1.35], [0, 0.1, 0], 38, 10), to: P([0.15, 0.12, 1.35], [0, 0.1, 0], 38, 10), move: 0 },
  { t: 0.25, space: "paddy", move: 1.4, to: P([0.3, 0.35, 2.4], [0, 2.4, -6], 46, 3), creep: 0.04 },
  { t: 2.4, space: "paddy", move: 1.7, to: P([0.6, 0.6, 3.0], [12.0, 9.3, -16], 46, 2, -3) },          // follow a helicopter up and right
  // S2 the camp: dissolve on the helicopter in the sky, tilt down to the calendar ("1966"), rise over the rows of soldiers
  { t: S.s2, space: "camp", dissolve: 0.4, from: P([76.6, 1.0, 9.0], [84, 7, -14], 44, 2, -3), to: P([77.6, 1.05, 7.0], [CAL[0], 1.05, CAL[2]], 34, 10), move: 0.7, creep: 0.03 },
  { t: 5.3, space: "camp", move: 1.6, to: P([80.4, 9.5, 12.5], [79.6, 0.0, -17], 50, 2), creep: 0.06 },          // the huge crowd (385,000)
  { t: 9.5, space: "camp", move: 1.0, to: P([84.5, 5.0, 12.5], [87, 1.5, -6], 52, 2), creep: 0.04 },
  { t: 11.75, space: "camp", move: 0.65, to: P([80.01, 1.32, -0.06], [79.99, 0.8, -0.09], 26, 2) },   // push right into a front-row helmet
  // S3 match: helmet from above -> Minh's straw hat from above, down to his face; sandals; shovel; pull back across the paddy
  { t: S.s3, space: "paddy", dissolve: 0.25, from: P([-0.19, 1.29, -0.4], [-0.21, 0.77, -0.43], 26, 2), to: P([0.1, 1.05, 2.3], MH, 34, 8), move: 0.95, creep: 0.03 },
  { t: 14.1, space: "paddy", move: 0.4, to: P([0.25, 0.22, 1.0], [0, 0.04, 0.05], 36, 12) },
  { t: 15.05, space: "paddy", move: 0.45, to: P([-0.85, 0.7, 1.15], [-0.24, 0.5, 0.05], 36, 10) },
  // S4 back across the paddy to the lookout: over the shoulders at tiny Minh; they laugh; Max, then Arian (Christmas ornament)
  { t: S.s4, space: "paddy", dissolve: 0.3, from: P(lk(0.04, -1.3, 1.22), add(M0, [0, 0.7, 0]), 26, 5), to: P(lk(0.04, -1.5, 1.24), add(M0, [0, 0.7, 0]), 26, 5), move: 1.2 },
  { t: 17.3, space: "paddy", dissolve: 0.3, from: P(lk(0.5, 2.7, 1.05), lk(0.25, 0, 0.85), 36, 8), to: P(lk(0.35, 2.4, 1.0), lk(0.25, 0, 0.85), 36, 8), move: 1.2 },   // straight to their faces      // around to the front: Max talks
  { t: 19.2, space: "paddy", move: 0.6, to: P(lk(-0.25, 2.2, 0.95), lk(-0.3, 0, 0.75), 36, 8), creep: 0.03 },  // Arian
  // OBJECT TRANSITION 1: the lookout picture shrinks into a photo pinned on the war-room map. S5: hands push toys onto the map.
  { t: S.s5, space: "tent", from: P([TABLE[0] + 0.3, 1.45, TABLE[2] + 1.2], [TABLE[0] + 0.12, 0.6, TABLE[2] - 0.15], 42, 3), to: P([TABLE[0] + 0.3, 1.45, TABLE[2] + 1.2], [TABLE[0] + 0.12, 0.6, TABLE[2] - 0.15], 42, 3), move: 0, creep: 0.02, collapse: { dur: 0.6, hold: 0.45 } },
  { t: 24.75, space: "tent", move: 0.5, to: P([TABLE[0] + 0.62, 0.6, TABLE[2] + 0.38], [TABLE[0] + 0.55, 0.53, TABLE[2] + 0.25], 40, 10) },   // push into the farmer token
  // S6 match: the token's hat -> Minh's hat; he pulls out a shovel twice his height
  { t: S.s6, space: "paddy", dissolve: 0.3, from: P([0.1, 1.2, 0.9], [0, 1.12, 0], 40, 8), to: P([0.4, 1.0, 3.6], [0, 1.15, 0], 38, 4), move: 0.8, creep: 0.03 },
  // S7 the jungle edge: he looks both ways, lifts the trapdoor, drops in ("earth?"); the camera dives into the hole
  { t: S.s7, space: "paddy", move: 0.9, to: P([TD[0] + 2.7, 1.35, TD[2] + 4.3], [TD[0] + 0.5, 0.6, TD[2] + 0.5], 40, 4), creep: 0.03 },
  { t: 30.95, space: "paddy", move: 0.5, to: P([TD[0], 0.8, TD[2] + 0.1], [TD[0], -1.2, TD[2]], 40, 2) },
  // S8 the cut-open ground: dark hole -> he lands in the shaft, digs right; tunnels grow; the camera pulls far back
  { t: S.s8, space: "cut", dissolve: 0.35, from: P(C(2.0, 4.9, 3.2), C(2.0, 4.4, -1.2), 44, 4), to: P(C(2.4, 4.5, 2.5), C(2.6, 4.3, -1.2), 42, 4), move: 0.8 },
  { t: 32.5, space: "cut", move: 2.35, to: P(C(12.0, 4.5, 2.6), C(12.2, 4.3, -1.2), 42, 4) },
  { t: 34.85, space: "cut", move: 1.05, to: P(C(-3.0, 4.8, 7.0), C(14, 3.6, -1.4), 46, 1) },
  // S9 rooms: kitchen, hospital, beds (one per word); up the shaft; the mound lid lifts, he peeks out ("mounds")
  { t: S.s9, space: "cut", move: 0.8, to: P(C(15.8, 4.6, 3.3), C(15.8, 4.4, -1.4), 40, 5) },
  { t: 37.55, space: "cut", move: 0.4, to: P(C(20.4, 4.6, 3.3), C(20.4, 4.3, -1.4), 40, 5) },
  { t: 38.35, space: "cut", move: 0.4, to: P(C(24.8, 4.6, 3.3), C(24.8, 4.3, -1.4), 40, 5) },
  { t: 39.2, space: "cut", move: 1.3, to: P(C(27.0, 7.3, 3.6), C(27.0, 7.1, -0.6), 40, 4), creep: 0.03 },
  // S10 the jungle path on the surface: traps, the patrol, the ambush (smoke puffs), they vanish; camera rises to the bombers
  { t: S.s10, space: "cut", dissolve: 0.35, from: P(C(15.0, CUT_H + 1.25, -0.3), C(7.0, CUT_H + 0.45, -1.3), 40, 4), to: P(C(14.6, CUT_H + 1.3, -0.3), C(6.6, CUT_H + 0.45, -1.3), 40, 4), move: 1.0, creep: 0.03 },
  { t: 43.4, space: "cut", dissolve: 0.3, from: P(C(4.5, CUT_H + 2.45, 4.05), C(8.7, CUT_H + 0.45, -1.3), 50, 3), to: P(C(4.6, CUT_H + 2.4, 3.9), C(8.7, CUT_H + 0.45, -1.3), 50, 3), move: 0.8, creep: 0.03 },   // from the front-left: the patrol walks toward us, the eyes watch
  // S11 sunset: up to the bombers, bombs fall, down to the cut: puffs on the surface; Minh climbs down one floor with his tea
  { t: S.s11, space: "cut", move: 0.8, to: P(C(26.0, CUT_H + 1.6, 6.0), C(30, CUT_H + 9.5, -8), 50, 2) },
  { t: 47.45, space: "cut", move: 0.5, to: P(C(28.6, CUT_H + 3.4, 10.5), C(29.6, CUT_H + 0.3, -2.0), 48, 2) },     // down to the impacts
  { t: 48.85, space: "cut", move: 0.8, to: P(C(29.9, 4.6, 7.5), C(29.9, 4.2, -1.4), 46, 3), creep: 0.04 },
  { t: 50.3, space: "cut", move: 0.65, to: P(C(LAMP_X, F2 + 0.13, -0.41), C(LAMP_X, F2 + 0.12, -0.75), 40, 6) },  // right into the lamp flame
  // S12 match: lamp glow -> the round kitchen lamp; Max and the fly; the slam ("hammer?"); the fly lands on the hammer ("lands")
  { t: S.s12, space: "home", dissolve: 0.45, from: P([HOME[0], 1.95, 0.55], [HOME[0], 1.95, -0.25], 40, 6), to: P([HOME[0] + 0.3, 1.25, 3.0], [HOME[0], 0.75, 0], 36, 5), move: 1.0, creep: 0.03 },
  { t: 53.75, space: "home", move: 1.0, to: P([HOME[0] + 0.55, 0.9, 1.45], [HOME[0] + 0.15, 0.75, 0.2], 36, 8), creep: 0.03 },
  { t: 55.15, space: "home", move: 1.0, to: P([HOME[0] + 0.2, 1.15, 2.7], [HOME[0] - 0.1, 0.8, 0], 36, 5), creep: 0.03 },
  { t: 56.55, space: "home", move: 0.75, to: P([HOME[0] - 0.05, 0.98, 1.45], [HOME[0] - 0.1, 0.72, 0.0], 36, 8) },
  // OBJECT TRANSITION 2: the kitchen picture shrinks into a photo on the general's board. S13: open battle; under the table
  { t: S.s13, space: "tent", from: P([TABLE[0] - 0.4, 1.1, TABLE[2] + 1.6], [WT[0] - 0.85, 0.95, WT[2] - 2.9], 40, 4), to: P([TABLE[0] - 0.4, 1.1, TABLE[2] + 1.6], [WT[0] - 0.85, 0.95, WT[2] - 2.9], 40, 4), move: 0, collapse: { dur: 0.6, hold: 0.45 } },
  { t: 58.8, space: "tent", move: 0.7, to: P([TABLE[0] + 0.15, 1.6, TABLE[2] + 1.6], [TABLE[0], 0.7, TABLE[2] - 0.3], 42, 4), creep: 0.03 },
  { t: 60.6, space: "tent", move: 0.6, to: P([TABLE[0] + 1.05, 0.55, TABLE[2] - 0.55], [TABLE[0] - 0.05, 0.52, TABLE[2] - 0.82], 44, 6) },
  { t: 61.25, space: "tent", move: 0.8, via: [TABLE[0] + 1.45, 0.2, TABLE[2] + 0.8], to: P([TABLE[0] + 0.3, 0.12, TABLE[2] + 1.1], [TABLE[0] + 0.2, 0.0, TABLE[2] + 0.1], 48, 3) },   // down to the floorboards
  // S14 dawn underground: a huge tank rolls over above; Minh taps his head ("smarter"), grin ("not bigger")
  { t: S.s14, space: "cut", dissolve: 0.35, from: P(C(36.0, 5.6, 9.0), C(37.5, 6.1, -1.2), 46, 3), to: P(C(36.0, 5.6, 7.5), C(37.5, 6.1, -1.2), 46, 3), move: 1.0, creep: 0.03 },
  { t: 63.9, space: "cut", move: 0.5, to: P(C(36.0, 4.5, 2.3), C(36.1, 4.45, -1.2), 38, 6), creep: 0.03 },
  // S15 rise above the surface: the huge base; "right on top of": the camera sinks over the edge: tunnels right under the tents
  { t: S.s15, space: "cut", move: 1.1, to: P(C(35, CUT_H + 9, 4.0), C(35, CUT_H, -14), 50, 1) },
  { t: 68.1, space: "cut", move: 1.2, to: P(C(35, CUT_H - 0.6, 13.5), C(35, CUT_H - 1.6, -1.5), 48, 1), creep: 0.03 },
  // S16 the jungle: they search (poking bushes, binoculars, helicopter searchlight)
  { t: S.s16, space: "cut", move: 1.0, to: P(C(46.6, CUT_H + 1.9, 4.5), C(42.5, CUT_H + 2.5, -4.0), 46, 3), creep: 0.03 },
  // S17 from Max's boots straight down through the soil to Minh in his hammock right below ("feet")
  { t: S.s17, space: "cut", move: 0.45, to: P(C(43.0, CUT_H + 0.35, 0.9), C(43.0, CUT_H + 0.15, -0.42), 40, 6) },
  { t: 72.85, space: "cut", move: 0.7, to: P(C(43.0, 4.55, 2.6), C(43.0, 4.15, -1.2), 40, 5), creep: 0.04 },
];
export const BOMB_HIT = [47.85, 48.27, 48.69];
const rumble = (t0: number, g: number): [number, number][] => [0, 2, 4, 6, 9, 12, 15, 19].map((f, k) => [t0 + f / 30, g * [1, 0.85, 0.7, 0.6, 0.45, 0.35, 0.25, 0.15][k]]);
export const KICKS: [number, number][] = [[1.78, 0.6], [44.3, 1.0], [44.54, 0.6], [44.78, 0.6], [45.03, 0.6], ...BOMB_HIT.flatMap((h) => rumble(h, 3.2)), ...rumble(BOMB_HIT[2] + 0.35, 1.6), [53.5, 1.4], [59.55, 1.0], [63.0, 0.5]];
const CAM = makeCamera(shots, DURATION, { kicks: KICKS });
export const camAt = CAM.camAt;
export const dissolveAt = CAM.dissolveAt;
export const collapseAt = (t: number) => CAM.collapseAt(t);
export const whiteAt = makeWhite([]);

// ---------------- photos for the two object transitions (9:16) ----------------
export const PHOTO1 = { c: [TABLE[0] + 0.25, 0.503, TABLE[2] + 0.28] as V3, w: 0.18, h: 0.32 };      // lying on the map
export const PHOTO2 = { c: [WT[0] - 0.85, 0.95, WT[2] - 2.86] as V3, w: 0.2, h: 0.356 };             // pinned on the board
const pc = PHOTO1, p2 = PHOTO2;
export const PHOTO1_CORNERS: V3[] = [[pc.c[0] - pc.w / 2, pc.c[1], pc.c[2] - pc.h / 2], [pc.c[0] + pc.w / 2, pc.c[1], pc.c[2] - pc.h / 2], [pc.c[0] + pc.w / 2, pc.c[1], pc.c[2] + pc.h / 2], [pc.c[0] - pc.w / 2, pc.c[1], pc.c[2] + pc.h / 2]];
export const PHOTO2_CORNERS: V3[] = [[p2.c[0] - p2.w / 2, p2.c[1] + p2.h / 2, p2.c[2]], [p2.c[0] + p2.w / 2, p2.c[1] + p2.h / 2, p2.c[2]], [p2.c[0] + p2.w / 2, p2.c[1] - p2.h / 2, p2.c[2]], [p2.c[0] - p2.w / 2, p2.c[1] - p2.h / 2, p2.c[2]]];

// ---------------- people ----------------
export type Who = "minh" | "minhT" | "team2" | "team3" | "max" | "arian" | "general" | "maxHome";
export const FACE: Record<string, FaceKey[]> = {
  minh: [{ t: 0, e: "smug" }, { t: 1.7, e: "smile" }, { t: 13.0, e: "smile" }, { t: 14.4, e: "smug", look: -1 }, { t: 15.3, e: "smile" },
    { t: 25.4, e: "surprised" }, { t: 26.3, e: "happy" }, { t: 27.0, e: "smug" }, { t: 28.7, e: "neutral", look: -1 }, { t: 29.2, e: "neutral", look: 1 }, { t: 29.7, e: "smug" }],
  minhT: [{ t: 31.4, e: "strain" }, { t: 32.4, e: "angry" }, { t: 35.5, e: "smile" }, { t: 39.3, e: "smug" }, { t: 40.9, e: "happy" }, { t: 41.6, e: "smug", look: 1 },
    { t: 47.0, e: "smile" }, { t: 48.1, e: "smug", look: 1 }, { t: 49.2, e: "smile" }, { t: 62.0, e: "smile" }, { t: 63.2, e: "smug", look: 1 }, { t: 64.3, e: "smug" }, { t: 65.4, e: "happy" },
    { t: 72.0, e: "smile" }, { t: 72.9, e: "smug", look: 1 }, { t: 73.3, e: "smug" }],
  team2: [{ t: 0, e: "smile" }, { t: 37.8, e: "content" }, { t: 38.5, e: "smile" }, { t: 42.0, e: "smug" }, { t: 44.3, e: "happy" }, { t: 45.4, e: "smug" }],
  team3: [{ t: 0, e: "smile" }, { t: 37.0, e: "happy" }, { t: 37.6, e: "smile" }, { t: 42.0, e: "smug", look: -1 }, { t: 44.3, e: "happy" }, { t: 45.4, e: "smile" }],
  max: [{ t: 0, e: "smug" }, { t: 16.7, e: "happy" }, { t: 17.3, e: "content" }, { t: 17.7, e: "smug" }, { t: 19.3, e: "smile", look: 1 },
    { t: 44.15, e: "scared" }, { t: 45.5, e: "stressed" }, { t: 70.0, e: "angry" }, { t: 71.0, e: "confused", look: -1 }],
  arian: [{ t: 0, e: "smile" }, { t: 16.7, e: "content" }, { t: 17.4, e: "happy" }, { t: 18.0, e: "smile", look: -1 }, { t: 19.4, e: "smug" }, { t: 20.2, e: "happy" },
    { t: 44.4, e: "surprised" }, { t: 45.2, e: "scared" }],
  general: [{ t: 0, e: "smug" }, { t: 22.3, e: "angry" }, { t: 23.3, e: "smug" }, { t: 24.5, e: "smile" }, { t: 57.6, e: "smug" }, { t: 59.4, e: "angry" }, { t: 60.4, e: "confused" }, { t: 61.2, e: "scared" }],
  maxHome: [{ t: 51.0, e: "angry" }, { t: 53.4, e: "strain" }, { t: 53.7, e: "surprised" }, { t: 54.4, e: "angry" }, { t: 56.0, e: "strain" }, { t: 56.4, e: "stressed" }, { t: 57.1, e: "confused", look: 1 }],
  extra: [{ t: 0, e: "smile" }, { t: 16.7, e: "happy" }, { t: 17.5, e: "smile" }],
};
export const LIFE: Record<string, Life> = {
  general: makeLife([], [[61.2, 62.0]]), maxHome: makeLife([], [[56.3, 57.6]]), max: makeLife([], [[45.0, 46.0], [70.8, 72.2]]), def: makeLife([], []),
};
// who speaks when (the mouth opens with teeth and tongue on his words)
export const talkAt = makeTalk(WORDS, [{ who: "max", a: 17.7, b: 18.95 }, { who: "arian", a: 19.5, b: 20.6 }]);

// ---------------- effects (fx kit) ----------------
export const FX: FxEvent[] = [
  { kind: "sparkle", t: 26.6, at: [0.55, 2.3, 0.1], size: 0.5 },
  { kind: "dust", t: 30.95, at: [TD[0], 0.1, TD[2]], size: 0.3 },
  ...Array.from({ length: 10 }, (_, i): FxEvent => { const tt = 32.55 + i * 0.24; return { kind: "dust", t: tt, at: [cx(digX(tt) + 0.02), F1 + 0.35 + 0.25 * (i % 2), -1.0 - 0.3 * (i % 3)], size: 0.42, seed: i }; }),
  ...Array.from({ length: 6 }, (_, i): FxEvent => { const tt = 32.8 + i * 0.4; return { kind: "dust", t: tt, at: [cx(Math.max(1.9, digX(tt) - 1.7)), F1 + 0.12, -0.9], size: 0.3, seed: 20 + i }; }),
  { kind: "speed", t: 32.8, dur: 1.6, at: [cx(6), F1 + 0.7, -1.0], dir: 0, size: 0.8 },
  { kind: "notes", t: 38.6, dur: 0.9, at: [cx(24.8), F1 + 0.9, -1.2], size: 0.3 },
  ...[44.3, 44.54, 44.78, 45.03].map((tt, i): FxEvent => ({ kind: "dust", t: tt + 0.06, at: [cx(9.5), CUT_H + 0.15, -0.95], size: 0.55, seed: 30 + i })),
  { kind: "dust", t: 45.98, at: [cx(6.4), CUT_H + 0.1, -1.7], size: 0.28 }, { kind: "dust", t: 46.0, at: [cx(7.3), CUT_H + 0.1, -1.7], size: 0.28 }, { kind: "dust", t: 46.02, at: [cx(8.2), CUT_H + 0.1, -1.7], size: 0.28 },
  ...BOMB_HIT.flatMap((tt, i): FxEvent[] => [{ kind: "burst", t: tt, at: [cx([26.5, 30, 33][i]), CUT_H + 0.6, -1.5], size: 1.1, seed: 40 + i }, { kind: "dust", t: tt + 0.05, at: [cx([26.5, 30, 33][i]), CUT_H + 0.3, -1.3], size: 1.4, seed: 50 + i }]),
  ...BOMB_HIT.map((tt, i): FxEvent => ({ kind: "dust", t: tt + 0.08, at: [cx([29.4, 30.3, 29.8][i]), F1 + 1.3, -1.0], size: 0.25, seed: 60 + i })),
  { kind: "burst", t: 53.5, at: [HOME[0] - 0.42, 0.72, 0.1], size: 0.25 }, { kind: "stars", t: 57.3, dur: 0.8, at: [HOME[0] - 0.2, 1.3, 0.15], size: 0.14 },
  { kind: "burst", t: 59.55, at: [TABLE[0], 0.56, TABLE[2]], size: 0.18 },
  { kind: "dust", t: 63.0, at: [cx(35), F1 + 1.35, -1.0], size: 0.22 },
  { kind: "sparkle", t: 64.35, at: [cx(36.15), F1 + 1.2, -0.9], size: 0.3 },
];

// ---------------- captions: 1 word at a time; the name is MINH; "385" + ",000" = one caption ----------------
const capWords: Word[] = [];
for (let i = 0; i < WORDS.length; i++) {
  const w = WORDS[i];
  if (w.w === "385" && WORDS[i + 1]?.w === ",000") { capWords.push({ w: "385,000", s: w.s, e: WORDS[i + 1].e }); i++; continue; }
  capWords.push({ ...w, w: w.w.replace(/^Min(?=\b|'s)/, "Minh") });
}
export const CAPS = capsFromWords(capWords, 1);

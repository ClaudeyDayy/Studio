// NEEDLE AT LIGHT SPEED: the real video (2026-11-16). 9:16, 69.56 s = the voice (64.06 s) + 3 pauses of 1.5 s (after "left", "next",
// "dinosaurs": Arian cuts his voice himself) + 1 s of picture after the last word. words.json already has the shifted times.
// One continuous list of shots; every shot has a `space` that says which part of the video draws it (world.ts picks the part).
import words from "./words.json";
import { V3, smooth } from "../../engine/core/util";
import { P, Shot, makeCamera, makeWhite } from "../../engine/core/camera";
import { makeLife, Life } from "../../engine/cast/life";
import type { FaceKey } from "../../engine/cast/face";
import { Word, capsFromWords } from "../../engine/core/captions";
import { makeTalk, makeTalkEyes, Line } from "../../engine/core/talk";
import { lightTrack, LIGHTS } from "../../engine/core/lights";

export const FPS = 30;
export const WORDS = words as Word[];
export const DURATION = 69.56;
export const TOTAL = Math.ceil(DURATION * FPS);
export const SUN = { az: 35, el: 26 };
export const LIGHT = lightTrack([[0, { ...LIGHTS.sunny, ...SUN } as any]]);

// ---------- the parts (where each one starts, video seconds) ----------
export const START: Record<string, number> = {
  sp1: 13.30, city1: 16.11, sp2: 28.5, city2: 30.08, sp3: 42.0, city3: 43.44, explain: 50.5, sp4: 65.25, finale: 67.35,
};
export const MOON_PHONE = 21.8;          // the phone trip (phone-preview) starts here
export const FIRES = [13.0, 28.4];       // muzzle flashes seen from outside
export const WHALE_PICK = 40.04, MOUNTAIN_PICK = 63.52;

// ---------- the moon scene ----------
export const SPOT = { max: [-0.5, 0, 0] as V3, ava: [0.55, 0, 0.1] as V3 };
export const ROCKET: V3 = [2.4, 0, -4.2];
export const ROCKET_YAW = -0.35;
export const EARTH: V3 = [-4, 20, -60];
export const NEEDLE_POS: V3 = [-3.2, 9.0, -21];          // the needle in the opening: it hangs in front of the Earth

const rk = (lx: number, y: number, lz: number): V3 => { const c = Math.cos(ROCKET_YAW), s = Math.sin(ROCKET_YAW); return [ROCKET[0] + c * lx + s * lz, y, ROCKET[2] - s * lx + c * lz]; };
const DOOR_Y = 1.03;
const S = SPOT.max, D = rk(0, DOOR_Y, 1.0), IN = rk(0, DOOR_Y, 0.45);
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const A = lerp3(S, [D[0], 0, D[2]], 0.34), B = lerp3(S, [D[0], 0, D[2]], 0.68);
const E: V3 = [-0.35, 0, 0.05];
const A2 = lerp3(E, [D[0], 0, D[2]], 0.66), B2 = lerp3(E, [D[0], 0, D[2]], 0.33);
type Move = { a: number; b: number; from: V3; to: V3; h: number };
const MOVES: Move[] = [
  { a: 0.70, b: 1.30, from: S, to: A, h: 0.55 }, { a: 1.38, b: 1.98, from: A, to: B, h: 0.55 }, { a: 2.06, b: 2.76, from: B, to: D, h: 0.75 },
  { a: 2.80, b: 3.05, from: D, to: IN, h: 0 }, { a: 3.62, b: 3.85, from: IN, to: D, h: 0 }, { a: 4.06, b: 4.66, from: D, to: A2, h: 0.45 },
  { a: 4.74, b: 5.24, from: A2, to: B2, h: 0.45 }, { a: 5.32, b: 5.82, from: B2, to: E, h: 0.4 },
];
export type MaxState = { pos: V3; dir: [number, number]; squash: number; visible: boolean; phone: boolean; raise: number; air: number };
export function maxAt(tg: number): MaxState {
  const t = tg - MOON_PHONE;                  // the phone trip's own clock
  let pos: V3 = S, dir: [number, number] = [0.25, 1], squash = 1, air = 0, last = -1;
  for (let i = 0; i < MOVES.length; i++) if (t >= MOVES[i].a) last = i;
  if (last >= 0) {
    const m = MOVES[last], u = Math.min(1, (t - m.a) / (m.b - m.a));
    pos = lerp3(m.from, m.to, u);
    if (m.h > 0 && u < 1) { pos = [pos[0], pos[1] + m.h * 4 * u * (1 - u), pos[2]]; air = 1; }
    dir = [m.to[0] - m.from[0], m.to[2] - m.from[2]];
  } else {
    const k = smooth(0.35, 0.65, t), to: [number, number] = [D[0] - S[0], D[2] - S[2]], n = Math.hypot(...to);
    dir = [0.25 * (1 - k) + (to[0] / n) * k, 1 * (1 - k) + (to[1] / n) * k];
  }
  for (const m of MOVES) if (m.h > 0) {
    squash -= 0.14 * smooth(m.a - 0.14, m.a - 0.04, t) * (1 - smooth(m.a - 0.04, m.a + 0.06, t));
    squash -= 0.16 * smooth(m.b - 0.03, m.b, t) * (1 - smooth(m.b + 0.04, m.b + 0.22, t));
  }
  if (t > 5.82) { const k = smooth(5.85, 6.15, t); dir = [dir[0] * (1 - k) + 0.75 * k, dir[1] * (1 - k) + 0.65 * k]; }
  const c = Math.cos(ROCKET_YAW), sn = Math.sin(ROCKET_YAW), lz = sn * (pos[0] - ROCKET[0]) + c * (pos[2] - ROCKET[2]);
  const visible = !(pos[1] > 0.9 && lz < 0.97);
  return { pos, dir, squash, visible, phone: t > 3.5, raise: smooth(5.85, 6.15, t), air };
}
export const doorAt = (tg: number) => { const t = tg - MOON_PHONE; return Math.max(smooth(1.9, 2.3, t) * (1 - smooth(3.05, 3.35, t)), smooth(3.35, 3.62, t) * (1 - smooth(4.35, 4.65, t))); };

// ---------- the gun: menu and thumb (absolute times) ----------
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const DOWN = [WHALE_PICK + 0.4, WHALE_PICK + 0.85, MOUNTAIN_PICK + 0.5], ENTER = [WHALE_PICK + 1.45, MOUNTAIN_PICK + 1.1];
export const scrollAt = (t: number) => DOWN.reduce((a, d) => a + ease((t - d - 0.05) / 0.22), 0);
const tap = (t: number, at: number) => Math.max(0, 1 - Math.abs(t - at - 0.06) / 0.08);
export const pressAt = (t: number): [number, number] => [Math.max(...DOWN.map((d) => tap(t, d))), Math.max(...ENTER.map((d) => tap(t, d)))];
export const pickAt = (t: number) => { const e = t >= ENTER[1] + 0.06 ? ENTER[1] : t >= ENTER[0] + 0.06 && t < DOWN[2] ? ENTER[0] : -1; return e < 0 ? 0 : Math.min(1, (t - e - 0.06) / 0.4) + 0.001; };
const TAPS = [...DOWN.map((at) => ({ at, z: -0.022 })), ...ENTER.map((at) => ({ at, z: 0.022 }))].sort((a, b) => a.at - b.at);
export const thumbAt = (t: number): [number, number, number] => {
  let z = TAPS[0].z;
  for (let i = 1; i < TAPS.length; i++) z += (TAPS[i].z - TAPS[i - 1].z) * ease((t - (TAPS[i].at - 0.32)) / 0.22);
  const near = Math.max(...TAPS.map((p) => ease(1 - Math.abs(t - p.at - 0.06) / 0.17)));
  const [pd, pe] = pressAt(t), sink = 0.005 * Math.max(pd, pe);
  return [-0.056, 0.184 - sink + 0.012 * (1 - near), z];
};

// ---------- the camera ----------
const hold = (pose: ReturnType<typeof P>) => ({ from: pose, to: pose, move: 0, noRamp: true });
const X = P([0, 0, 2], [0, 0, 0], 40, 0);   // (parts that move their own camera)
const CAMN = P([-0.4, 1.2, 5.0], [0.6, 2.9, -2], 52, 4);
const shots: Shot[] = [
  { t: 0, space: "moon", from: P([NEEDLE_POS[0] + 0.2, NEEDLE_POS[1] + 0.2, NEEDLE_POS[2] + 1.5], [NEEDLE_POS[0] + 0.1, NEEDLE_POS[1] + 2.2, NEEDLE_POS[2] - 36.5], 42, 0), to: CAMN, move: 4.5 },   // from behind the needle, down to the moon
  { t: 4.62, space: "moon", move: 0.8, to: P([0.1, 1.0, 5.4], [0.02, 0.72, 0], 34, 8), creep: 0.02 },                                  // both, close
  { t: 6.0, space: "moon", move: 0.8, to: P([-1.1, 0.9, 2.6], [-0.55, 0.62, 0.2], 32, 12), creep: 0.02 },                              // the gun
  { t: 8.3, space: "moon", move: 0.5, to: P([-1.0, 0.95, 1.9], [-0.45, 0.85, 0.1], 30, 6), creep: 0.02 },                             // the loading
  { t: 9.75, space: "moon", move: 0.6, to: P([0.35, 1.1, 2.4], [0.55, 0.85, 0.1], 34, 6), creep: 0.02 },                              // Ava laughs
  { t: 12.4, space: "moon", move: 0.5, to: P([-1.6, 1.3, 2.4], [-0.4, 1.15, -0.8], 40, 4), creep: 0.03 },                             // he fires
  { t: START.sp1, space: "sp1", ...hold(X) },
  { t: START.city1, space: "city1", ...hold(X) },
  { t: 21.3, space: "moon", from: P([-2.8, 1.15, 4.7], [0.78, 1.35, -1.5], 50, 3), to: P([-2.8, 1.15, 4.7], [0.78, 1.35, -1.5], 50, 3), move: 0, noRamp: true },
  { t: MOON_PHONE + 0.2, space: "moon", move: 6.0, to: P([-2.3, 1.05, 4.15], [0.8, 1.2, -1.6], 48, 3) },                                // the phone trip
  { t: 28.0, space: "moon", move: 0.45, to: P([-1.5, 1.25, 2.3], [-0.3, 1.1, -0.2], 40, 3), creep: 0.03 },                             // he fires
  { t: START.sp2, space: "sp2", ...hold(X) },
  { t: START.city2, space: "city2", ...hold(X) },
  { t: 35.4, space: "moon", from: P([0.55, 1.25, 3.7], [0.55, 1.0, 0.1], 34, 6), to: P([0.55, 1.25, 3.7], [0.55, 1.0, 0.1], 34, 6), move: 0, creep: 0.03, noRamp: true },   // Ava crosses her arms
  { t: 37.6, space: "moon", move: 1.0, to: P([0.1, 1.0, 5.4], [0.02, 0.72, 0], 34, 8), creep: 0.02 },
  { t: WHALE_PICK - 0.2, space: "pov", ...hold(X) },                                                                                   // Max's eyes: the menu
  { t: START.sp3, space: "sp3", ...hold(X) },
  { t: START.city3, space: "city3", ...hold(X) },
  { t: 48.8, space: "moon", from: P([0.3, 1.15, 3.0], [0.55, 0.95, 0.1], 32, 6), to: P([0.3, 1.15, 3.0], [0.55, 0.95, 0.1], 32, 6), move: 0, creep: 0.03, noRamp: true },   // Ava: wait...
  { t: START.explain, space: "explain", ...hold(X) },
  { t: 63.0, space: "pov", ...hold(X), collapse: { dur: 0.5, hold: 0.25 } },                                                              // the explainer shrinks into the gun's screen
  { t: START.sp4, space: "sp4", ...hold(X) },
  { t: START.finale, space: "finale", ...hold(X) },
];
const CAM = makeCamera(shots, DURATION);
export const camAt = CAM.camAt;
export const collapseAt = CAM.collapseAt;
export const dissolveAt = (_t: number) => null;
// white flashes: they hide every cut between parts (the light-speed jumps) and the hits
export const whiteAt = makeWhite([
  [13.16, 13.28, 13.45], [15.98, 16.08, 16.22], [20.86, 21.11, 21.9], [28.38, 28.5, 28.65], [29.95, 30.05, 30.2], [35.08, 35.38, 36.0],
  [41.85, 41.98, 42.12], [43.32, 43.42, 43.55], [48.39, 48.69, 49.5], [65.1, 65.22, 65.36], [67.23, 67.33, 67.47], [68.12, 68.24, 68.95],
]);

// ---------- people ----------
export type Who = "max" | "ava";
export const FACE: Record<Who, FaceKey[]> = {
  max: [{ t: 0, e: "smug" }, { t: 25.4, e: "grin" }, { t: 41.8, e: "smug" }],
  ava: [{ t: 0, e: "neutral" }, { t: 9.9, e: "grin" }, { t: 11.0, e: "neutral" }, { t: 21.4, e: "grin" }, { t: 21.9, e: "neutral" }, { t: 25.0, e: "smug" }, { t: 33.0, e: "neutral" }, { t: 35.8, e: "smug" }, { t: 48.0, e: "shock" }, { t: 50.2, e: "neutral" }],
};
export const LIFE: Record<Who, Life> = {
  max: makeLife([[0, "smug"], [25.4, "grin"], [41.8, "smug"]] as any, []),
  ava: makeLife([[0, "neutral"], [9.9, "grin"], [11.0, "neutral"], [21.4, "grin"], [21.9, "neutral"], [25.0, "smug"], [33.0, "neutral"], [35.8, "smug"], [48.0, "shock"], [50.2, "neutral"]] as any, []),
};
export const SEED: Record<Who, number> = { max: 0.4, ava: 1.7 };
export const LINES: Line[] = [
  { who: "ava", a: 10.9, b: 12.15, to: "max" }, { who: "ava", a: 22.0, b: 24.7, to: "max" }, { who: "ava", a: 34.3, b: 36.5, to: "max" },
  { who: "ava", a: 48.0, b: 50.3, to: "max" }, { who: "max", a: 50.7, b: 57.4, to: "ava" }, { who: "max", a: 58.0, b: 63.0, to: "ava" },
];
export const talkAt = makeTalk(WORDS, LINES);
export const eyesAt = makeTalkEyes(LINES);
export const CAPS = capsFromWords(WORDS);

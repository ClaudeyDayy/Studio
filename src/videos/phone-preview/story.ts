// PHONE PREVIEW (2026-11-16): Ava's line after Manhattan is gone. Max moon-hops to the rocket, jumps up into the door,
// comes back out with his phone and hops back. Preview time 0 = 20.30 s of the voice (21.80 s in the video after the 1.5 s pause).
import words from "./words.json";
import { V3, smooth } from "../../engine/core/util";
import { P, Shot, makeCamera, makeWhite } from "../../engine/core/camera";
import { makeWhips } from "../../engine/core/whip";
import { makeLife, Life } from "../../engine/cast/life";
import type { FaceKey } from "../../engine/cast/face";
import { Word, capsFromWords } from "../../engine/core/captions";
import { makeTalk, makeTalkEyes, Line } from "../../engine/core/talk";
import { lightTrack, LIGHTS } from "../../engine/core/lights";

export const FPS = 30;
export const WORDS = words as Word[];
export const DURATION = 6.4;
export const TOTAL = Math.ceil(DURATION * FPS);
export const SUN = { az: 35, el: 26 };
export const LIGHT = lightTrack([[0, { ...LIGHTS.sunny, ...SUN } as any]]);

export const SPOT = { max: [-0.5, 0, 0] as V3, ava: [0.55, 0, 0.1] as V3 };
export const ROCKET: V3 = [2.4, 0, -4.2];
export const ROCKET_YAW = -0.35;
export const EARTH: V3 = [-4, 20, -60];

// a point given in the rocket's own frame (x across, z out of the door side) -> world
const rk = (lx: number, y: number, lz: number): V3 => {
  const c = Math.cos(ROCKET_YAW), s = Math.sin(ROCKET_YAW);
  return [ROCKET[0] + c * lx + s * lz, y, ROCKET[2] - s * lx + c * lz];
};
const DOOR_Y = 1.03;                         // the bottom of the door opening
const S = SPOT.max, D = rk(0, DOOR_Y, 1.0), IN = rk(0, DOOR_Y, 0.45);
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const A = lerp3(S, [D[0], 0, D[2]], 0.34), B = lerp3(S, [D[0], 0, D[2]], 0.68);
const E: V3 = [-0.35, 0, 0.05];              // where he lands at the end, next to Ava
const A2 = lerp3(E, [D[0], 0, D[2]], 0.66), B2 = lerp3(E, [D[0], 0, D[2]], 0.33);

// moves: hop = a low-gravity arc (high, floaty); step = a short slide on the door sill
type Move = { a: number; b: number; from: V3; to: V3; h: number };
const MOVES: Move[] = [
  { a: 0.70, b: 1.30, from: S, to: A, h: 0.55 },
  { a: 1.38, b: 1.98, from: A, to: B, h: 0.55 },
  { a: 2.06, b: 2.76, from: B, to: D, h: 0.75 },     // up into the door
  { a: 2.80, b: 3.05, from: D, to: IN, h: 0 },       // in
  { a: 3.62, b: 3.85, from: IN, to: D, h: 0 },       // out, with the phone
  { a: 4.06, b: 4.66, from: D, to: A2, h: 0.45 },    // down
  { a: 4.74, b: 5.24, from: A2, to: B2, h: 0.45 },
  { a: 5.32, b: 5.82, from: B2, to: E, h: 0.4 },
];
export type MaxState = { pos: V3; dir: [number, number]; squash: number; visible: boolean; phone: boolean; raise: number; air: number };
export function maxAt(t: number): MaxState {
  let pos: V3 = S, dir: [number, number] = [0.25, 1], squash = 1, air = 0;
  let last = -1;
  for (let i = 0; i < MOVES.length; i++) if (t >= MOVES[i].a) last = i;
  if (last >= 0) {
    const m = MOVES[last], u = Math.min(1, (t - m.a) / (m.b - m.a));
    pos = lerp3(m.from, m.to, u);
    if (m.h > 0 && u < 1) { pos = [pos[0], pos[1] + m.h * 4 * u * (1 - u), pos[2]]; air = 1; }
    dir = [m.to[0] - m.from[0], m.to[2] - m.from[2]];
  } else {
    const k = smooth(0.35, 0.65, t), to: [number, number] = [D[0] - S[0], D[2] - S[2]];
    const n = Math.hypot(...to);
    dir = [0.25 * (1 - k) + (to[0] / n) * k, 1 * (1 - k) + (to[1] / n) * k];
  }
  // crouch before each hop and on each landing (soft, like the moon)
  for (const m of MOVES) if (m.h > 0) {
    squash -= 0.14 * smooth(m.a - 0.14, m.a - 0.04, t) * (1 - smooth(m.a - 0.04, m.a + 0.06, t));
    squash -= 0.16 * smooth(m.b - 0.03, m.b, t) * (1 - smooth(m.b + 0.04, m.b + 0.22, t));
  }
  // after the last landing he turns to Ava and holds the phone up
  if (t > 5.82) { const k = smooth(5.85, 6.15, t); dir = [dir[0] * (1 - k) + 0.75 * k, dir[1] * (1 - k) + 0.65 * k]; }
  // hidden once he is through the doorway (inside the hull), so his head card never shows through the wall
  const c = Math.cos(ROCKET_YAW), sn = Math.sin(ROCKET_YAW), lz = sn * (pos[0] - ROCKET[0]) + c * (pos[2] - ROCKET[2]);
  const visible = !(pos[1] > 0.9 && lz < 0.97);
  return { pos, dir, squash, visible, phone: t > 3.5, raise: smooth(5.85, 6.15, t), air };
}
// the door: open (0..1)
export const doorAt = (t: number) => Math.max(smooth(1.9, 2.3, t) * (1 - smooth(3.05, 3.35, t)), smooth(3.35, 3.62, t) * (1 - smooth(4.35, 4.65, t)));

const shots: Shot[] = [
  // camera a little to the left so Ava never stands in front of the ladder and the door
  { t: 0, from: P([-2.8, 1.15, 4.7], [0.78, 1.35, -1.5], 50, 3), to: P([-2.8, 1.15, 4.7], [0.78, 1.35, -1.5], 50, 3), move: 0, noRamp: true },
  { t: 0.2, move: 6.0, to: P([-2.3, 1.05, 4.15], [0.8, 1.2, -1.6], 48, 3) },   // one slow push in
];
const CAM = makeCamera(shots, DURATION);
const WH = makeWhips(shots, CAM.camAt);
export const camAt = WH.camAt;
export const dissolveAt = WH.dissolveAt;
export const whipBlur = WH.blur;
export const whiteAt = makeWhite([]);

export type Who = "max" | "ava";
export const FACE: Record<Who, FaceKey[]> = { max: [{ t: 0, e: "smug" }], ava: [{ t: 0, e: "grin" }] };
export const LIFE: Record<Who, Life> = {
  max: makeLife([[0, "smug"], [3.6, "grin"]] as any, []),
  ava: makeLife([[0, "grin"], [0.4, "neutral"], [1.5, "smug"], [4.5, "neutral"]] as any, []),
};
export const SEED: Record<Who, number> = { max: 0.4, ava: 1.7 };
export const LINES: Line[] = [{ who: "ava", a: 1.58, b: 3.56, to: "max" }];
export const talkAt = makeTalk(WORDS, LINES);
export const eyesAt = makeTalkEyes(LINES);
export const CAPS = capsFromWords(WORDS);

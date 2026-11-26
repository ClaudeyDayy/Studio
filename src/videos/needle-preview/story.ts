// NEEDLE PREVIEW (2026-11-16): a short look at the new things for "Needle at light speed": the astronaut suits with clear
// bubble helmets, our own rocket with the MAX FILMS logo, our own light-speed gun with its small screen, and the phone.
import words from "./words.json";
import { V3 } from "../../engine/core/util";
import { P, Shot, makeCamera, makeWhite } from "../../engine/core/camera";
import { makeWhips } from "../../engine/core/whip";
import { makeLife, Life } from "../../engine/cast/life";
import type { FaceKey } from "../../engine/cast/face";
import { Word, capsFromWords } from "../../engine/core/captions";
import { makeTalk, makeTalkEyes, Line } from "../../engine/core/talk";
import { lightTrack, LIGHTS } from "../../engine/core/lights";

export const FPS = 30;
export const WORDS = words as Word[];
export const DURATION = 15;
export const TOTAL = Math.ceil(DURATION * FPS);
export const SUN = { az: 35, el: 26 };          // the sun stands lower than the sunny preset, so it can be seen
export const LIGHT = lightTrack([[0, { ...LIGHTS.sunny, ...SUN } as any]]);

export const SPOT = { max: [-0.5, 0, 0] as V3, ava: [0.55, 0, 0.1] as V3 };
export const ROCKET: V3 = [2.4, 0, -4.2];
export const EARTH: V3 = [-4, 20, -60];
const shots: Shot[] = [
  { t: 0, from: P([-0.4, 1.2, 5.0], [0.6, 2.9, -2], 52, 4), to: P([-0.4, 1.2, 5.0], [0.6, 2.9, -2], 52, 4), move: 0, creep: 0.02, noRamp: true },   // wide: both, the rocket, the Earth
  { t: 2.0, move: 0.8, to: P([0.1, 1.0, 5.4], [0.02, 0.72, 0], 34, 8), creep: 0.02 },                  // both, close: suits and helmets
  { t: 4.0, move: 0.8, to: P([-1.1, 0.9, 2.6], [-0.55, 0.62, 0.2], 32, 12), creep: 0.02 },           // the gun and the phone
  { t: 6.0, move: 1.0, to: P([0.9, 2.2, 1.6], [2.3, 3.1, -3.3], 40, 6), creep: 0.02 },                   // the rocket and its logo
  { t: 8.0, move: 1.2, to: P([0.2, 1.4, -2.5], [0.2 + 0.57 * 40, 1.4 + 0.44 * 40, -2.5 + 0.69 * 40], 50, 0), creep: 0.01 },   // turn round: the sun
  { t: 10.0, move: 1.0, to: P([0.2, 1.4, -2.5], [0.2 + 0.91 * 40, 1.4 + 0.28 * 40, -2.5 + 0.30 * 40], 50, 0), creep: 0.01 },  // Mars
  { t: 11.6, move: 0.9, to: P([0.2, 1.4, -2.5], [0.2 - 0.86 * 40, 1.4 + 0.42 * 40, -2.5 - 0.35 * 40], 50, 0), creep: 0.01 },  // Saturn
  { t: 13.0, move: 1.0, to: P([0.2, 1.4, -2.5], [0.2 + -0.33*40, 1.4 + 0.62*40, -2.5 + -0.71*40], 50, 0), creep: 0.01 },  // a far spiral galaxy
];
const CAM = makeCamera(shots, DURATION);
const WH = makeWhips(shots, CAM.camAt);
export const camAt = WH.camAt;
export const dissolveAt = WH.dissolveAt;
export const whipBlur = WH.blur;
export const whiteAt = makeWhite([]);

export type Who = "max" | "ava";
export const FACE: Record<Who, FaceKey[]> = { max: [{ t: 0, e: "smug" }], ava: [{ t: 0, e: "neutral" }] };
export const LIFE: Record<Who, Life> = { max: makeLife([[0, "smug"]] as any, []), ava: makeLife([[0, "neutral"], [3.0, "smug"]] as any, []) };
export const SEED: Record<Who, number> = { max: 0.4, ava: 1.7 };
export const LINES: Line[] = [];
export const talkAt = makeTalk(WORDS, LINES);
export const eyesAt = makeTalkEyes(LINES);
export const lookAt = (who: Who, _t: number): [number, number] => (who === "max" ? [0.25, 1] : [-0.3, 1]);
export const CAPS = capsFromWords(WORDS);

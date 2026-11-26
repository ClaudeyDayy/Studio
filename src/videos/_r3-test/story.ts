// R3KNRF TEST: the new engine pieces in 10 s: people that take the light, automatic blinks, light changing
// day -> sunset -> night (with the grade), camera tilt, an impact kick, and every effect of the effects kit.
import words from "./words.json";
import { V3 } from "../../engine/core/util";
import { P, Shot, makeCamera, makeWhite } from "../../engine/core/camera";
import { makeLife, Life } from "../../engine/cast/life";
import { Word, capsFromWords } from "../../engine/core/captions";
import type { FaceKey } from "../../engine/cast/face";
import { lightTrack, LIGHTS } from "../../engine/core/lights";
import type { FxEvent } from "../../engine/fx/fx";

export const FPS = 30;
export const WORDS = words as Word[];
export const DURATION = 10;
export const TOTAL = Math.ceil(DURATION * FPS);

const HEAD_M: V3 = [0.55, 0.86, 0];
const TWO = P([0, 1.0, 5.2], [0, 0.7, 0], 34, 3);                   // front two-shot (both face camera)
const CLOSE_M = P([0.85, 0.95, 1.5], HEAD_M, 32, 7, 5);               // Max close, tilted 5 deg
const WIDE = P([1.2, 1.7, 5.6], [0, 0.6, 0], 40, 0, -4);               // wide, tilted the other way
export const LOOP = false;
const shots: Shot[] = [
  { t: 0, from: TWO, to: TWO, move: 0, creep: 0.03, noRamp: true },
  { t: 3.3, move: 0.9, to: CLOSE_M, creep: 0.02 },
  { t: 6.4, move: 1.0, to: WIDE, creep: 0.03 },
];
export const KICKS: [number, number][] = [[5.0, 1.2]];
const CAM = makeCamera(shots, DURATION, { kicks: KICKS });
export const camAt = CAM.camAt;
export const dissolveAt = CAM.dissolveAt;
export const whiteAt = makeWhite([]);

export type Who = "arian" | "max";
// drawn faces: [{ t, e, look? }]  e = neutral content happy satisfied strain angry stressed sad scared surprised confused
export const FACES: Record<Who, FaceKey[]> = {
  max: [{ t: 0, e: "neutral" }, { t: 1.4, e: "happy" }, { t: 4.98, e: "surprised" }, { t: 6.0, e: "sad" }, { t: 8.5, e: "neutral" }],
  arian: [{ t: 0, e: "neutral" }, { t: 1.8, e: "content" }, { t: 7.0, e: "scared" }, { t: 9.0, e: "confused" }],
};
// light: day (sun from the side), then sunset from 3.0 s, night from 6.8 s
export const LIGHT = lightTrack([[0, { ...LIGHTS.day, az: 10 }], [3.0, { ...LIGHTS.sunset, az: 215 }, 1.5], [6.8, LIGHTS.night, 1.5]]);
// effects: positions are fixed points here (a function (t) => [x, y, z] can follow a person)
export const FX: FxEvent[] = [
  { kind: "sparkle", t: 0.6, at: [0, 1.15, -0.6] },
  { kind: "notes", t: 1.6, dur: 1.6, at: [0, 1.05, 0.6] },
  { kind: "burst", t: 5.0, at: [0.06, 0.92, -0.45] },
  { kind: "stars", t: 5.25, dur: 1.4, at: [0, 1.2, -0.6], size: 0.16 },
  { kind: "dust", t: 7.4, at: [0, 0.02, 0.6], size: 0.25 },
  { kind: "speed", t: 8.0, dur: 0.7, at: [0, 0.75, -0.6], dir: 90 },
  { kind: "splash", t: 9.0, at: [0.3, 0.02, 0], size: 0.4 },
];
export const LIFE: Record<Who, Life> = { arian: makeLife([[0, "neutral"]], []), max: makeLife([[0, "neutral"]], []) };
export const SEED: Record<Who, number> = { arian: 0.4, max: 1.7 };
export const BOX = { a: 99, b: 100, pos: [0.55, 0, 0] as V3 };   // the example box stays hidden
export const CAPS = capsFromWords(WORDS);

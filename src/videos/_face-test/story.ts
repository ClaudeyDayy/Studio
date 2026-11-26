// FACE TEST: Max close up going through the drawn morphing faces (engine face.ts), then a wide shot with Arian.
import words from "./words.json";
import { V3 } from "../../engine/core/util";
import { P, Shot, makeCamera, makeWhite } from "../../engine/core/camera";
import { makeLife, Life } from "../../engine/cast/life";
import { Word, capsFromWords } from "../../engine/core/captions";
import type { FaceKey } from "../../engine/cast/face";

export const FPS = 30;
export const WORDS = words as Word[];
export const DURATION = 11;
export const TOTAL = Math.ceil(DURATION * FPS);

const HEAD_M: V3 = [0, 0.86, -0.6];
const CLOSE_M = P([0.1, 0.88, 0.45], HEAD_M, 30, 6);        // Max's face, close
const OPEN = P([1.6, 1.5, 2.6], [0, 0.9, 0], 38, 2);
export const LOOP = false;
const shots: Shot[] = [
  { t: 0, from: CLOSE_M, to: CLOSE_M, move: 0, creep: 0.01, noRamp: true },
  { t: 8.4, move: 1.3, to: OPEN, creep: 0.03 },
];
const CAM = makeCamera(shots, DURATION);
export const camAt = CAM.camAt;
export const dissolveAt = CAM.dissolveAt;
export const whiteAt = makeWhite([]);

export type Who = "arian" | "max";
// drawn faces: [{ t, e, look? }]  e = neutral content happy satisfied strain angry stressed sad scared surprised confused
export const FACES: Record<Who, FaceKey[]> = {
  max: [{ t: 0, e: "neutral" }, { t: 0.9, e: "neutral", look: -1 }, { t: 1.7, e: "neutral", look: 1 }, { t: 2.5, e: "neutral" },
    { t: 3.2, e: "happy" }, { t: 4.1, e: "angry" }, { t: 5.0, e: "surprised" }, { t: 5.9, e: "sad" }, { t: 6.8, e: "strain" },
    { t: 7.7, e: "neutral" }, { t: 9.6, e: "satisfied" }],
  arian: [{ t: 0, e: "neutral" }, { t: 9.0, e: "neutral", look: -1 }, { t: 9.8, e: "confused" }],
};
export const BLINKS: Record<Who, number[]> = { max: [1.25, 3.7, 7.3, 10.4], arian: [2.0, 8.9] };
export const LIFE: Record<Who, Life> = { arian: makeLife([[0, "neutral"]], []), max: makeLife([[0, "neutral"]], []) };
export const SEED: Record<Who, number> = { arian: 0.4, max: 1.7 };
export const BOX = { a: 99, b: 100, pos: [0.55, 0, 0] as V3 };   // the example box stays hidden
export const CAPS = capsFromWords(WORDS);

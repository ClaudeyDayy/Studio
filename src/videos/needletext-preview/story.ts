// NEEDLE TEXT PREVIEW (2026-11-16): the needle flies through space in slow motion, the camera follows it very close,
// and a glowing techy label flies next to it: "299,792 km/s" and "0.5 g". Only to show Arian the text style.
import words from "./words.json";
import { V3 } from "../../engine/core/util";
import { P, Shot, makeCamera, makeWhite } from "../../engine/core/camera";
import { makeWhips } from "../../engine/core/whip";
import { Word, capsFromWords } from "../../engine/core/captions";
import { lightTrack, LIGHTS } from "../../engine/core/lights";

export const FPS = 30;
export const WORDS = words as Word[];
export const DURATION = 4.0;
export const TOTAL = Math.ceil(DURATION * FPS);
export const SUN = { az: 35, el: 26 };
export const LIGHT = lightTrack([[0, { ...LIGHTS.sunny, ...SUN } as any]]);
export const EARTH: V3 = [6, -4, -75];
const shots: Shot[] = [{ t: 0, from: P([0, 0, 2], [0, 0, 0], 40, 0), to: P([0, 0, 2], [0, 0, 0], 40, 0), move: 0, creep: 0, noRamp: true }];   // (the world moves the camera with the needle)
const CAM = makeCamera(shots, DURATION);
const WH = makeWhips(shots, CAM.camAt);
export const camAt = WH.camAt;
export const dissolveAt = WH.dissolveAt;
export const whipBlur = WH.blur;
export const whiteAt = makeWhite([]);
export const CAPS = capsFromWords(WORDS);

// the label: frame draws in, the speed types in, then the weight, it holds, then it flickers out
export const LABEL = { frame: [0.2, 0.45], lines: [{ text: "299,792 km/s", tag: "SPEED", at: 0.5, dur: 0.75 }, { text: "0.5 g", tag: "MASS", at: 1.35, dur: 0.35 }], out: [3.3, 3.7] };

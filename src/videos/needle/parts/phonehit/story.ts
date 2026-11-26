// PHONE HIT PREVIEW, New York area (2026-11-16). Only to show Arian the phone-hit sequence (no voice, no captions):
//   0.00-2.30  HIGH VIEW in slow motion, 250 km up, looking north over the curve of the Earth: the whole New York area; the phone is a hot
//              dot falling toward it; the RED hand-drawn stroke draws round the whole area (0.3-2.1).
//   2.30-3.70  DIVE: slow motion ends; the camera swoops onto the phone and follows it about 5 m behind, down to Manhattan.
//   3.70-4.20  just before the hit the camera pulls back VERY FAST to the high view.
//   4.20-5.30  THE FLASH: a tiny white point at the phone that spreads (doubling every 0.1 s) until the whole picture is white.
// In the real video this is about 28.9-32 s of the voice (the phone's stroke 28.88-31.22, then the pause, then the hit).
import words from "./words.json";
import { P, Shot, makeCamera, makeWhite } from "../../../../engine/core/camera";
import { makeWhips } from "../../../../engine/core/whip";
import { Word, capsFromWords } from "../../../../engine/core/captions";
import { lightTrack, LIGHTS } from "../../../../engine/core/lights";

export const FPS = 30;
export const WORDS = words as Word[];
export const DURATION = 5.7;
export const TOTAL = Math.ceil(DURATION * FPS);
export const T = { strokeA: 0.3, strokeB: 2.1, dive: 2.3, back: 3.7, hit: 4.2 };
export const LIGHT = lightTrack([[0, { ...LIGHTS.sunny, az: 35, el: 30, sunI: 2.5 } as any]]);
const shots: Shot[] = [{ t: 0, from: P([0, 30000, 6000], [0, 0, 0], 46, 0), to: P([0, 30000, 6000], [0, 0, 0], 46, 0), move: 0, creep: 0, noRamp: true }];   // (the world moves the camera)
const CAM = makeCamera(shots, DURATION);
const WH = makeWhips(shots, CAM.camAt);
export const camAt = WH.camAt;
export const dissolveAt = WH.dissolveAt;
export const whipBlur = WH.blur;
export const whiteAt = makeWhite([[5.0, 5.3, 99]]);   // the screen goes fully white only after the blast has covered the frame
export const CAPS = capsFromWords(WORDS);

// CITY HIT PREVIEW, Manhattan (2026-11-16). Only to show Arian the city-hit sequence (no voice, no captions):
//   0.00-2.10  HIGH VIEW in slow motion, about 30 km up: all of Manhattan; the needle is a hot dot falling toward it;
//              the RED hand-drawn stroke draws round the island (0.25-1.95).
//   2.10-3.40  DIVE: slow motion ends; the camera swoops onto the needle and follows it about 5 m behind, down to the streets.
//   3.40-3.90  just before the hit the camera pulls back VERY FAST to the high view.
//   3.90-5.00  THE FLASH (Arian 03:50): starts as a tiny white point at the needle and spreads visibly (a white dome and a
//              bright ring running over the city, doubling in size about every 0.1 s), until the whole picture is white.
// In the real video this is 16.36-20.2 s (stroke 16.36-18.10, then the 1.5 s pause Arian adds, then the hit).
import words from "./words.json";
import { P, Shot, makeCamera, makeWhite } from "../../engine/core/camera";
import { makeWhips } from "../../engine/core/whip";
import { Word, capsFromWords } from "../../engine/core/captions";
import { lightTrack, LIGHTS } from "../../engine/core/lights";

export const FPS = 30;
export const WORDS = words as Word[];
export const DURATION = 5.3;
export const TOTAL = Math.ceil(DURATION * FPS);
export const T = { strokeA: 0.25, strokeB: 1.95, dive: 2.1, back: 3.4, hit: 3.9 };
export const LIGHT = lightTrack([[0, { ...LIGHTS.sunny, az: 35, el: 30, sunI: 2.5 } as any]]);
const shots: Shot[] = [{ t: 0, from: P([0, 30000, 6000], [0, 0, 0], 46, 0), to: P([0, 30000, 6000], [0, 0, 0], 46, 0), move: 0, creep: 0, noRamp: true }];   // (the world moves the camera)
const CAM = makeCamera(shots, DURATION);
const WH = makeWhips(shots, CAM.camAt);
export const camAt = WH.camAt;
export const dissolveAt = WH.dissolveAt;
export const whipBlur = WH.blur;
export const whiteAt = makeWhite([[4.75, 5.0, 99]]);   // the screen goes fully white only after the blast has covered the frame
export const CAPS = capsFromWords(WORDS);

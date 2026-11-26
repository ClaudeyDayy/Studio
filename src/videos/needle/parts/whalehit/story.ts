// WHALE HIT PREVIEW, Yucatan coast (2026-11-16). Only to show Arian the whale-hit sequence (no voice, no captions):
//   0.00-2.40  HIGH VIEW in slow motion, 600 km up, looking north over the curve of the Earth: the Gulf of Mexico and the Yucatan coast; the whale is a hot
//              dot falling toward the place where the dinosaur asteroid hit (the coast of Yucatan, Chicxulub); the RED hand-drawn stroke draws round the area.
//   2.40-3.80  DIVE: the camera follows the whale about 30 m behind, down to the sea.
//   3.80-4.30  just before the hit the camera pulls back VERY FAST to the high view.
//   4.30-5.30  THE FLASH: a point at the whale that spreads (doubling every 0.11 s), white-out, then the white fades out.
//   5.30-8.30  the water column and the BIG WAVE: a bright front runs out over the sea, the sea behind it churns white, the coast it reaches turns dark and flooded.
import words from "./words.json";
import { P, Shot, makeCamera, makeWhite } from "../../../../engine/core/camera";
import { makeWhips } from "../../../../engine/core/whip";
import { Word, capsFromWords } from "../../../../engine/core/captions";
import { lightTrack, LIGHTS } from "../../../../engine/core/lights";

export const FPS = 30;
export const WORDS = words as Word[];
export const DURATION = 8.3;
export const TOTAL = Math.ceil(DURATION * FPS);
export const T = { strokeA: 0.3, strokeB: 2.2, dive: 2.4, back: 3.8, hit: 4.3 };
export const LIGHT = lightTrack([[0, { ...LIGHTS.sunny, az: 35, el: 30, sunI: 2.5 } as any]]);
const shots: Shot[] = [{ t: 0, from: P([0, 30000, 6000], [0, 0, 0], 46, 0), to: P([0, 30000, 6000], [0, 0, 0], 46, 0), move: 0, creep: 0, noRamp: true }];   // (the world moves the camera)
const CAM = makeCamera(shots, DURATION);
const WH = makeWhips(shots, CAM.camAt);
export const camAt = WH.camAt;
export const dissolveAt = WH.dissolveAt;
export const whipBlur = WH.blur;
export const whiteAt = makeWhite([[4.95, 5.25, 6.0]]);   // the screen goes fully white only after the blast has covered the frame
export const CAPS = capsFromWords(WORDS);

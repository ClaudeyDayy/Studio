// THE STORY: time, camera shots, white flashes, faces, talking, who turns when, captions, prop timings. Change this file first.
// THE 3D LOOK (2026-11-11): real 3D bodies with 2D drawn heads (engine cast/player3d.ts), a world with no outlines and
// real light. World units are metres, the ground is y = 0.
// Arian stands at x = -0.34 and Max at x = +0.34, both on z = 0, facing the camera (+z) at the start.
import words from "./words.json";
import { V3 } from "../../engine/core/util";
import { P, Shot, makeCamera, makeWhite } from "../../engine/core/camera";
import { makeWhips } from "../../engine/core/whip";
import { makeLife, Life } from "../../engine/cast/life";
import type { FaceKey } from "../../engine/cast/face";
import { Word, capsFromWords, wordsEnd } from "../../engine/core/captions";
import { makeTalk, makeTalkEyes, Line } from "../../engine/core/talk";
import { lightTrack } from "../../engine/core/lights";

export const FPS = 30;
export const WORDS = words as Word[];
// length: the end of the last word (from your voice timing), or a fixed number of seconds if there are no words yet
export const DURATION = Math.max(wordsEnd(WORDS) + 2.5, 6);
export const TOTAL = Math.ceil(DURATION * FPS);

// ---------------- light (core/lights.ts presets: day, sunny, sunset, night, storm, indoor). Outside: HOUSE.outdoor.light ----------------
export const LIGHT = lightTrack([[0, "day"]]);

// ---------------- camera: one continuous camera, no cuts ----------------
// P(camera position, point it looks at, lens in degrees, background blur 0..24)
export const SPOT = { arian: [-0.34, 0, 0] as V3, max: [0.34, 0, 0] as V3 };     // where they stand (floor points)
const HEAD_A: V3 = [-0.34, 0.88, 0], HEAD_M: V3 = [0.34, 0.88, 0];
const OPEN = P([0.25, 1.0, 3.5], [0, 0.66, 0], 34, 6);       // opening: both, from the front (also the last frame if LOOP)
export const LOOP = false;                                     // true: the ending creeps back into the opening frame (ASK every video)
const CREEP = 0.03;

const shots: Shot[] = [
  // 0 both from the front, slow push in
  { t: 0, from: OPEN, to: OPEN, move: 0, creep: CREEP, noRamp: true },
  // 1 glide round to the side: the 3D bodies turn in the light (never squeezed)
  { t: 2.9, move: 1.6, to: P([2.6, 0.95, 1.7], [0, 0.66, 0], 34, 8), creep: 0.03 },
  // 2 close on Arian while Max turns round
  { t: 5.0, move: 1.2, to: P([-0.05, 0.95, 1.55], HEAD_A, 32, 12), creep: 0.03 },
];
if (LOOP) { const last = shots[shots.length - 1]; last.to = makeCamera([], DURATION).creepStart(OPEN, CREEP, DURATION - last.t - last.move); }
const CAM = makeCamera(shots, DURATION);
// HOUSE: a shot with `dissolve` is a WHIP PAN (engine/core/whip.ts, numbers in HOUSE.whip), never a blend
const WH = makeWhips(shots, CAM.camAt);
export const camAt = WH.camAt;
export const dissolveAt = WH.dissolveAt;
export const whipBlur = WH.blur;
// white flashes: [fade in from, full white at, fade out until]   e.g. [[2.9, 3.1, 3.3]]
export const whiteAt = makeWhite([]);
void HEAD_M;

// ---------------- people ----------------
export type Who = "arian" | "max";
// drawn faces that morph: neutral content happy satisfied strain angry stressed sad scared surprised confused smile smug
// (resting faces: smile / smug / neutral with OPEN eyes; closed-eye faces only for a short laugh beat)
export const FACE: Record<Who, FaceKey[]> = {
  arian: [{ t: 0, e: "smile" }, { t: 3.2, e: "smug", look: 1 }],
  max: [{ t: 0, e: "neutral" }, { t: 1.6, e: "surprised" }, { t: 4.4, e: "smile", look: -1 }],
};
export const LIFE: Record<Who, Life> = { arian: makeLife([], []), max: makeLife([], [[1.7, 3.2]]) };   // sweat: [[from, to]]
export const SEED: Record<Who, number> = { arian: 0.4, max: 1.7 };     // idle sway phase (keeps the two from moving the same)
// who says which words (seconds): the mouth opens with teeth and tongue on every word
// `to` = who he says it to: both look at each other while the line is spoken (only the eyes move; setLook turns the body)
export const LINES: Line[] = [{ who: "arian", a: 0.55, b: 3.0, to: "max" }];
export const talkAt = makeTalk(WORDS, LINES);
export const eyesAt = makeTalkEyes(LINES);
// where each person looks (a direction on the floor). Here Max turns round to look at Arian and back: the body spins in 3D.
export const lookAt = (who: Who, t: number): [number, number] => {
  if (who === "max") { const a = Math.min(1, Math.max(0, (t - 1.4) / 0.6)) * (1 - Math.min(1, Math.max(0, (t - 5.2) / 0.8))); const ang = -a * 1.35; return [Math.sin(ang), Math.cos(ang)]; }
  return [0, 1];
};

// ---------------- props: when they pop in and out ----------------
export const BOX = { a: 0.6, b: DURATION - 0.4, pos: [0.95, 0, -0.35] as V3 };

// ---------------- captions from words.json (empty file = no captions) ----------------
export const CAPS = capsFromWords(WORDS);

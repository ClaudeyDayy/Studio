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
export const DURATION = 4.6;
export const TOTAL = Math.ceil(DURATION * FPS);
export const SUN = { az: 35, el: 26 };          // the sun stands lower than the sunny preset, so it can be seen
export const LIGHT = lightTrack([[0, { ...LIGHTS.sunny, ...SUN } as any]]);

export const SPOT = { max: [-0.5, 0, 0] as V3, ava: [0.55, 0, 0.1] as V3 };
export const ROCKET: V3 = [2.4, 0, -4.2];
export const EARTH: V3 = [-4, 20, -60];
const shots: Shot[] = [
  { t: 0, from: P([0.2, 1.4, 3.0], [-0.3, 0.7, 0], 30, 4), to: P([0.2, 1.4, 3.0], [-0.3, 0.7, 0], 30, 4), move: 0, creep: 0, noRamp: true },   // (the world moves the camera to the gun screen)
]
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

// the gun menu: Max presses DOWN twice (GPU -> controller -> whale, quick), then ENTER
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const DOWN = [0.4, 0.85, 3.0], ENTER = [1.45, 3.6];   // whale: down, down, enter. Then (the ending) down once more to the mountain, enter
export const scrollAt = (t: number) => DOWN.reduce((a, d) => a + ease((t - d - 0.05) / 0.22), 0);
const tap = (t: number, at: number) => Math.max(0, 1 - Math.abs(t - at - 0.06) / 0.08);
export const pressAt = (t: number): [number, number] => [Math.max(...DOWN.map((d) => tap(t, d))), Math.max(...ENTER.map((d) => tap(t, d)))];
export const pickAt = (t: number) => { const e = t >= ENTER[1] + 0.06 ? ENTER[1] : t >= ENTER[0] + 0.06 && t < 2.8 ? ENTER[0] : -1; return e < 0 ? 0 : Math.min(1, (t - e - 0.06) / 0.4) + 0.001; };
// Max's thumb (gun units): hovers over the next button, moves across before it, comes down and presses it
const TAPS = [...DOWN.map((at) => ({ at, z: -0.022 })), ...ENTER.map((at) => ({ at, z: 0.022 }))].sort((a, b) => a.at - b.at);
export const thumbAt = (t: number): [number, number, number] => {
  let z = TAPS[0].z;
  for (let i = 1; i < TAPS.length; i++) z += (TAPS[i].z - TAPS[i - 1].z) * ease((t - (TAPS[i].at - 0.32)) / 0.22);
  const near = Math.max(...TAPS.map((p) => ease(1 - Math.abs(t - p.at - 0.06) / 0.17)));
  const [pd, pe] = pressAt(t), sink = 0.005 * Math.max(pd, pe);
  return [-0.056, 0.184 - sink + 0.012 * (1 - near), z];
};

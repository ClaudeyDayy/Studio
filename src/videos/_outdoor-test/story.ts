import { V3 } from "../../engine/core/util";
import { P, Shot, makeCamera } from "../../engine/core/camera";
import { makeLife, Life } from "../../engine/cast/life";
import type { FaceKey } from "../../engine/cast/face";
import { lightTrack } from "../../engine/core/lights";
import { HOUSE } from "../../house/look";

export const FPS = 30, DURATION = 12, TOTAL = DURATION * FPS;
// day (house preset) -> sunset -> night -> storm
export const LIGHT = lightTrack([[0, HOUSE.outdoor.light], [3, "sunset", 0.3], [6, "night", 0.3], [9, "storm", 0.3]]);
export const WEATHER = (t: number): ["clear" | "rain" | "snow", number] => (t >= 9 ? ["rain", 1] : ["clear", 0]);
export const SPOT = { arian: [-0.4, 0, 0] as V3, max: [0.45, 0, 0.1] as V3 };
const HEADS: V3 = [0, 0.7, 0];
const shots: Shot[] = [
  { t: 0, from: P([1.6, 1.0, 5.2], [0, 0.95, 0], 38, 0), to: P([1.6, 1.0, 5.2], [0, 0.95, 0], 38, 0), move: 0, creep: 0.03, noRamp: true },   // wide, down the street
  { t: 3, move: 0.3, to: P([-0.9, 0.55, 4.2], [0.3, 1.0, -6], 40, 0), creep: 0.03 },      // low, toward the low sun
  { t: 6, move: 0.3, to: P([2.4, 1.3, 4.6], [0, 1.1, -2], 38, 0), creep: 0.03 },          // night
  { t: 9, move: 0.3, to: P([-1.8, 1.1, 4.4], HEADS, 36, 4), creep: 0.03 },                // storm, closer
];
const CAM = makeCamera(shots, DURATION);
export const camAt = CAM.camAt, dissolveAt = CAM.dissolveAt;
export type Who = "arian" | "max";
export const FACE: Record<Who, FaceKey[]> = { arian: [{ t: 0, e: "smile" }], max: [{ t: 0, e: "smug" }] };
export const LIFE: Record<Who, Life> = { arian: makeLife([], []), max: makeLife([], []) };
export const SEED: Record<Who, number> = { arian: 0.4, max: 1.7 };

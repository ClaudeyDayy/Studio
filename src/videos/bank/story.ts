// "The pants bet" (bank): time, people, camera shots, white flashes, faces, talking, prop timings.
// World units are metres, but at CHARACTER scale: people are 1.2 m tall, seats 0.19 m, the counter 0.5 m, doors 1.5 m.
// Hall: x -3.4..3.4, z -4.6..3.2. Counter z -3.1..-2.6. Waiting chairs in a row at z = 0.9, everybody faces -z (the counter).
// CEO office behind the left wall (x < -3.5). The fantasy space is the same scene, far away at x = FX.
import words from "./words.json";
import { V3, smooth, clamp01 } from "../../engine/core/util";
import { P, Pose, Shot as EShot, CamState, makeCamera, makeWhite } from "../../engine/core/camera";
import { FaceEv, makeLife, Life } from "../../engine/cast/life";
import { Word, Cap } from "../../engine/core/captions";
import { makePath, WalkState } from "../../engine/cast/walk";

export const FPS = 30;
export const DURATION = 66.2;                       // the voice file is 66.19 s
export const TOTAL = Math.ceil(DURATION * FPS);
export const WORDS = words as Word[];
export type { V3 };
export { smooth, clamp01 };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const mix = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const win = (t: number, a: number, b: number, i = 0.25, o = 0.3) => smooth(a, a + i, t) * (1 - smooth(b, b + o, t));
export const FX = 60;
export const F = (x: number, y: number, z: number): V3 => [FX + x, y, z];

// ---------------- places ----------------
export const SEAT_Y = 0.19, ROW_Z = 0.9, STAND_Z = 0.72, LANE_Z = -0.9;
export const SEATS = [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5];
export const AVA_X = -0.3, ARIAN_X = 0.3, OMAR_X = 1.5;
export const HEAD_SIT = 0.752, HEAD_STAND = 0.8775;
export const HA: V3 = [AVA_X, HEAD_SIT, ROW_Z], HR: V3 = [ARIAN_X, HEAD_SIT, ROW_Z], MID: V3 = [0, 0.7, ROW_Z];
export const COUNTER = { x0: -2.9, x1: 1.5, z0: -3.1, z1: -2.6, top: 0.5 };
export const AVA_COUNTER: V3 = [-0.6, 0, -2.38], TINA_HOME: V3 = [-0.6, 0, -3.3];
export const DOOR_CEO: V3 = [-3.4, 0, LANE_Z], DOOR_IN: V3 = [3.4, 0, LANE_Z];
export const DESK: V3 = [-5.05, 0, -1.0], MAX_SEAT: V3 = [-5.05, 0, -1.55], DESK_TOP = 0.4;
export const CENTRE: V3 = [0, 0, -1.3];
export const BOARD: V3 = [-1.8, 1.72, -2.7];

// ---------------- people: where they are, which way they face, sitting or walking ----------------
export type Who = "ava" | "arian" | "max" | "tina" | "cop" | "nora" | "omar";
export type Body = { pos: V3; facing: 1 | -1; sit: number; walk: WalkState | null; show: boolean; lean: number; squash: number };
const still = (pos: V3, facing: 1 | -1, sit = 0): Body => ({ pos, facing, sit, walk: null, show: true, lean: 0, squash: 1 });

export const T = {
  maxIn: 2.85, maxDoor: 7.3, maxInside: 7.9,
  avaUp: 40.45, avaGo: 40.85, avaAt: 42.6, avaBack: 47.5, avaHome: 49.5, avaSat: 50.0,
  tinaGo: 46.9, tinaKnock: 49.6, tinaIn: 50.0, tinaGone: 50.5,
  zip: 56.75, arrive: 57.45, skidEnd: 58.1, pantsDown: 60.4, pantsDownEnd: 60.78, pantsUp: 61.3, pantsUpEnd: 61.75,
  maxOut: 62.35, maxOutDoor: 63.6, avaUp2: 62.7, pay: 63.3, avaTake: 64.1, avaLeave: 64.35,
};
const AVA_SIT: V3 = [AVA_X, 0, ROW_Z], AVA_STAND: V3 = [AVA_X, 0, STAND_Z];
const avaWalk1 = makePath([{ t0: T.avaGo, t1: T.avaAt, from: AVA_STAND, to: AVA_COUNTER }]);
const avaWalk2 = makePath([{ t0: T.avaBack, t1: T.avaHome, from: AVA_COUNTER, to: AVA_STAND }]);
const avaWalk3 = makePath([{ t0: T.avaLeave, t1: 65.3, from: AVA_STAND, to: [1.3, 0, -0.35] }, { t0: 65.3, t1: 66.8, from: [1.3, 0, -0.35], to: [3.3, 0, LANE_Z] }]);
const MAX_ST: V3 = [5.4, 0, 1.5], MAX_TURN: V3 = [4.55, 0, LANE_Z];             // along the pavement, then in through the doors
const maxWalk1 = makePath([{ t0: T.maxIn, t1: 3.8, from: MAX_ST, to: MAX_TURN }, { t0: 3.8, t1: T.maxDoor, from: MAX_TURN, to: [-3.0, 0, LANE_Z] }, { t0: T.maxDoor, t1: T.maxInside, from: [-3.0, 0, LANE_Z], to: [-4.1, 0, LANE_Z] }]);
const maxWalk2 = makePath([{ t0: T.maxOut, t1: T.maxOutDoor, from: CENTRE, to: [3.0, 0, LANE_Z] }, { t0: T.maxOutDoor, t1: 64.2, from: [3.0, 0, LANE_Z], to: [4.5, 0, LANE_Z] },
  { t0: 64.2, t1: 66.6, from: [4.5, 0, LANE_Z], to: [5.0, 0, -5.5] }]);
const tinaWalk = makePath([
  { t0: T.tinaGo, t1: 48.3, from: TINA_HOME, to: [-3.15, 0, -3.3] }, { t0: 48.3, t1: 49.1, from: [-3.15, 0, -3.3], to: [-3.15, 0, -2.2] },
  { t0: 49.1, t1: T.tinaKnock, from: [-3.15, 0, -2.2], to: [-2.95, 0, -1.0] }, { t0: T.tinaIn, t1: T.tinaGone, from: [-2.95, 0, -1.0], to: [-4.1, 0, LANE_Z] },
]);
const walking = (w: WalkState, facing: 1 | -1): Body => ({ pos: w.pos, facing, sit: 0, walk: w, show: true, lean: 0, squash: 1 });

export const bodyAt: Record<Who, (t: number) => Body> = {
  ava: (t) => {
    if (t < T.avaUp) return still(AVA_SIT, -1, 1);
    if (t < T.avaGo) { const k = smooth(T.avaUp, T.avaGo, t); return still(mix(AVA_SIT, AVA_STAND, k), -1, 1 - k); }
    if (t < T.avaBack) return walking(avaWalk1.at(t), -1);
    if (t < T.avaHome + 0.05) return walking(avaWalk2.at(t), 1);
    if (t < T.avaSat) { const k = smooth(T.avaHome + 0.05, T.avaSat, t); return still(mix(AVA_STAND, AVA_SIT, k), -1, k); }
    if (t < T.avaUp2) return still(AVA_SIT, -1, 1);
    if (t < T.avaLeave) { const k = smooth(T.avaUp2, T.avaUp2 + 0.4, t); return still(mix(AVA_SIT, AVA_STAND, k), -1, 1 - k); }
    return walking(avaWalk3.at(t), -1);
  },
  arian: () => still([ARIAN_X, 0, ROW_Z], -1, 1),
  omar: () => still([OMAR_X, 0, ROW_Z], -1, 1),
  nora: (t) => still([2.5, 0, 2.6], t < 58.3 ? 1 : -1),
  cop: () => still([2.85, 0, 0.0], -1),
  tina: (t) => {
    if (t < T.tinaGo) return still(TINA_HOME, 1);
    if (t < T.tinaGone) return walking(tinaWalk.at(t), 1);
    return still([-4.2, 0, -1.25], 1);
  },
  max: (t) => {
    if (t < T.maxIn) return { ...still(MAX_ST, -1), show: false };
    if (t < T.maxInside) return walking(maxWalk1.at(t), -1);
    if (t < 8.5) return { ...still([-4.1, 0, LANE_Z], -1), show: false };
    if (t < T.zip) return still(MAX_SEAT, 1, 1);
    if (t < T.zip + 0.2) { const k = smooth(T.zip, T.zip + 0.2, t); return { ...still(mix(MAX_SEAT, [-4.6, 0, -1.5], k), 1, 1 - k), lean: -0.5 * k, squash: 1 + 0.15 * k }; }
    if (t < 57.3) return { ...still(CENTRE, -1), show: false };
    if (t < T.skidEnd) {                               // skids into the middle of the waiting area, leaning back
      const k = 1 - Math.pow(1 - clamp01((t - 57.3) / (T.skidEnd - 57.3)), 2.2);
      return { ...still(mix([-1.6, 0, -1.1], CENTRE, k), -1), lean: -0.32 * (1 - k), squash: 1 - 0.1 * Math.sin(Math.PI * k) };
    }
    if (t < T.maxOut) {                                // a little crouch while the trousers go down and come up
      const dn = smooth(T.pantsDown - 0.25, T.pantsDown, t) * (1 - smooth(T.pantsDownEnd, T.pantsDownEnd + 0.2, t));
      const up = smooth(T.pantsUp - 0.05, T.pantsUp + 0.15, t) * (1 - smooth(T.pantsUpEnd - 0.1, T.pantsUpEnd + 0.15, t));
      const bag = Math.max(win(t, BAG.down - 0.3, BAG.down + 0.1), win(t, BAG.up - 0.3, BAG.up + 0.1));
      return { ...still(CENTRE, -1), squash: 1 - 0.09 * dn - 0.1 * up - 0.12 * bag + 0.06 * smooth(T.pantsUpEnd, T.pantsUpEnd + 0.1, t) * (1 - smooth(T.pantsUpEnd + 0.1, T.pantsUpEnd + 0.3, t)) };
    }
    const w = maxWalk2.at(t);
    return walking(w, -1);
  },
};
// the CEO puts his briefcase down before the trousers come off, and picks it up again before he walks out
export const BAG = { down: 58.55, up: 62.05 };
export const pantsDropAt = (t: number) => smooth(T.pantsDown, T.pantsDownEnd, t) * (1 - smooth(T.pantsUp, T.pantsUpEnd, t));
// doors: 0 = shut, 1 = open
export const ceoDoorAt = (t: number) => Math.max(smooth(6.85, 7.25, t) * (1 - smooth(7.95, 8.35, t)), smooth(49.75, 50.05, t) * (1 - smooth(50.5, 50.85, t)));
export const entranceAt = (t: number) => Math.max(smooth(3.4, 3.8, t) * (1 - smooth(4.7, 5.3, t)), smooth(62.95, 63.35, t) * (1 - smooth(64.4, 64.9, t)), smooth(65.7, 66.1, t));

// ---------------- camera: one short path per shot, eased ends, slow creep after each move ----------------
export type Space = "hall" | "office" | "fantasy";
type Shot = EShot & { space: Space };
const XF = 0.3;
const MOON: V3 = F(0, 9, -20);
export { MOON };
const pushR = P([0.36, 0.8, 0.5], HR, 32, 6);                         // close on Arian's white head: into and out of the thought
const moonA = P(F(0.6, 1.0, 2.9), MOON, 20, 0);
const OUT_F = P(F(0.9, 1.9, 5.6), F(0, 1.0, 0), 50, 0);
const TWO = P([0.0, 0.98, -2.45], MID, 38, 5);                        // front two-shot of Ava and Arian
const ENTR = P([2.5, 0.86, LANE_Z], [4.3, 0.8, LANE_Z], 46, 2);            // just inside the glass doors, straight out through them
const OUTSIDE = P([6.35, 1.0, 1.7], [3.7, 1.15, LANE_Z - 0.3], 50, 2);   // on the pavement, looking back at the bank's doors
const DOORSHOT = P([-0.3, 0.85, LANE_Z], [-3.4, 0.78, LANE_Z], 40, 0); // the CEO door fills the frame
export const NOTE: V3 = [-4.75, 0.62, -1.15];
// counter: the camera 25 degrees off the line between Ava and the teller, behind one of them
const OTS_T = P([0.03, 1.02, -1.02], [-0.6, 0.78, -3.3], 34, 8), OTS_A = P([-1.09, 1.0, -4.32], [-0.6, 0.76, -2.38], 34, 8);
// note: behind the CEO, 35 degrees to the side and higher, so his back and the text are both seen
const OTS_M = P([-4.3, 1.7, -2.6], [-4.82, 0.66, -1.15], 38, 4);
const HIGH = P([0.35, 1.9, -3.55], [0.0, 0.35, -0.9], 50, 2);        // high view over the counter into the waiting area

export const SHOTS: Shot[] = [
  // 0 "Her number was 33," close on Ava's face (her ticket is not shown), then pull back
  { t: 0, space: "hall", from: P([-0.32, 0.82, -0.62], [-0.3, 0.74, 0.9], 30, 8), to: P([-0.32, 0.82, -0.62], [-0.3, 0.74, 0.9], 30, 8), move: 0, creep: -0.05, noRamp: true },
  { t: 0.35, space: "hall", move: 1.3, to: P([-0.75, 0.95, -1.95], [-0.2, 0.68, 0.9], 38, 6), creep: 0.03 },
  // 2 "and while she was waiting for her turn," wide of the waiting row, seen from above the counter
  { t: 1.6, space: "hall", move: 1.2, to: P([0.55, 1.4, -3.3], [0.1, 0.55, 0.4], 44, 2), creep: 0.03 },
  // 3 "the CEO of the bank" the camera flies to the glass doors; he comes up the street; the doors open as it stops
  { t: 2.75, space: "hall", move: 1.2, to: ENTR },
  // 4 "walked in and straight to his office." it backs away in front of him (camAt below), then turns to Ava and Arian
  { t: 7.3, space: "hall", from: TWO, to: TWO, move: 0, creep: 0.03 },
  // 5 "After he was in the office, old lady turned to the guy waiting next to her" back to the two of them
  { t: 8.75, space: "hall", move: 1.5, to: TWO, creep: 0.03 },
  // 6 "and saw his number." from up at the ceiling lamp, looking down: he holds the ticket low on his thigh, the camera catches it
  { t: 11.2, space: "hall", dissolve: XF, from: P([0.55, 2.2, 0.3], [0.36, 0.3, 0.78], 34, 3), to: P([0.55, 2.2, 0.3], [0.36, 0.3, 0.78], 34, 3), move: 0 },
  { t: 11.45, space: "hall", move: 0.6, to: P([0.44, 1.9, 0.48], [0.35, 0.27, 0.77], 26, 4), creep: 0.03 },
  // 6b "She looked at his shirt" the dice on his shirt (seen from her side), they glint
  { t: 12.85, space: "hall", dissolve: XF, from: P([-0.32, 0.74, -0.65], [0.28, 0.5, 0.86], 36, 8), to: P([-0.32, 0.74, -0.65], [0.28, 0.5, 0.86], 36, 8), move: 0, creep: 0.04 },
  // 7 "and said, you a betting guy?" Ava (lips move)
  { t: 13.95, space: "hall", dissolve: XF, from: P([-0.42, 0.95, -1.75], [-0.36, 0.74, 0.9], 36, 8), to: P([-0.42, 0.95, -1.75], [-0.36, 0.74, 0.9], 36, 8), move: 0, creep: 0.04 },
  // 8 "The guy looked at her and said, it depends." dissolve head -> head, Arian (lips move)
  { t: 15.75, space: "hall", dissolve: XF, from: P([0.42, 0.9, -1.7], [0.36, 0.74, 0.9], 36, 8), to: P([0.42, 0.9, -1.7], [0.36, 0.74, 0.9], 36, 8), move: 0, creep: 0.04 },
  // 9-10 "She went straight for it and said, when the CEO steps out, I bet 5,000 bucks that he will take his pants off."
  { t: 18.5, space: "hall", dissolve: XF, from: P([-0.62, 0.76, -1.85], [-0.36, 0.72, 0.9], 36, 8), to: P([-0.62, 0.76, -1.85], [-0.36, 0.72, 0.9], 36, 8), move: 0, creep: 0.05 },
  { t: 22.2, space: "hall", move: 0.9, to: P([-0.2, 0.92, -1.9], [-0.3, 0.66, 0.9], 38, 8), creep: 0.03 },
  // 11 "The guy just didn't hesitate and accepted it." two-shot, handshake
  { t: 25.7, space: "hall", dissolve: XF, from: TWO, to: TWO, move: 0, creep: 0.04 },
  // 12 "You see," push into Arian's head (white) -> the white moon
  { t: 28.15, space: "hall", move: 0.75, to: pushR },
  // 13-16 fantasy: the unsure bet (dice, magnifying glass), the sure bet (trophy, cash slammed down), then pull far back -> white
  { t: 28.9, space: "fantasy", from: moonA, to: moonA, move: 0 },
  { t: 28.95, space: "fantasy", move: 1.2, to: P(F(0.3, 1.0, 3.3), F(-0.02, 0.72, 0), 42, 4), creep: 0.04 },
  { t: 30.7, space: "fantasy", dissolve: XF, from: P(F(-0.6, 0.95, 2.7), F(-0.02, 0.8, 0), 36, 6), to: P(F(-0.6, 0.95, 2.7), F(-0.02, 0.8, 0), 36, 6), move: 0, creep: 0.04 },
  { t: 34.0, space: "fantasy", dissolve: XF, from: P(F(0.55, 0.7, 3.1), F(-0.02, 0.8, 0), 40, 4), to: P(F(0.55, 0.7, 3.1), F(-0.02, 0.8, 0), 40, 4), move: 0, creep: 0.04 },
  { t: 37.35, space: "fantasy", move: 0.65, to: OUT_F },
  // 17 out of the white: close on Arian's head, pull back out of it. "While they were waiting for CEO to step out,"
  { t: 38.0, space: "hall", from: pushR, move: 1.6, to: P([0.25, 1.02, -2.5], MID, 40, 4), creep: 0.03 },
  // 18 "her turn arrived." from behind the chairs: the board shows 33, she gets up and walks to the counter
  { t: 40.15, space: "hall", dissolve: XF, from: P([0.9, 1.7, 2.95], [-0.9, 1.3, -2.8], 44, 3), to: P([0.9, 1.7, 2.95], [-0.9, 1.3, -2.8], 44, 3), move: 0, creep: 0.05 },
  // 19-21 at the counter: cash, the note, "give it to the boss"
  //    over the shoulder, 25 degrees: behind Ava onto the teller, behind the teller onto Ava, behind Ava again
  { t: 42.35, space: "hall", dissolve: XF, from: OTS_T, to: OTS_T, move: 0, creep: 0.04 },
  { t: 43.38, space: "hall", dissolve: 0.25, from: OTS_A, to: OTS_A, move: 0, creep: 0.04 },
  { t: 45.35, space: "hall", dissolve: 0.25, from: OTS_T, to: OTS_T, move: 0, creep: 0.04 },
  // 22-23 "Old lady went back and sat next to the guy and waited again." then the camera goes to the CEO door
  { t: 47.4, space: "hall", dissolve: XF, from: P([1.75, 1.05, -1.75], [-0.1, 0.62, 0.75], 42, 3), to: P([1.75, 1.05, -1.75], [-0.1, 0.62, 0.75], 42, 3), move: 0, creep: 0.03, orbit: 2 },
  { t: 50.05, space: "hall", move: 1.05, to: DOORSHOT },
  // 24-25 "In that note she wrote: ..." the door becomes the note (same tall shape); slow pull back, his eyes over the note
  { t: 51.1, space: "office", dissolve: 0.35, from: P([-4.66, 0.98, -1.78], NOTE, 30, 4), to: P([-4.66, 0.98, -1.78], NOTE, 30, 4), move: 0 },
  { t: 51.5, space: "office", move: 2.4, to: OTS_M, creep: 0.03 },
  //    "this is all yours." round to his front: the grin
  { t: 54.8, space: "office", move: 1.0, to: P([-4.72, 1.05, 0.45], [-5.02, 0.64, -1.3], 40, 3), creep: 0.02 },
  // 26 "After no time," he is gone in a puff -> white
  { t: 56.3, space: "office", move: 1.0, to: P([-4.85, 0.82, 0.5], [-5.0, 0.62, -1.4], 40, 3) },
  // 27 "CEO was already in the middle of the waiting area, took his pants off and on again,"
  { t: T.arrive, space: "hall", from: HIGH, to: HIGH, move: 0, creep: 0.05 },
  // 28 "and he stepped out of the bank." behind him to the doors (camAt below), then outside: he comes out and walks off
  { t: 62.3, space: "hall", move: 0.9, to: P([-1.2, 1.0, -1.25], [2.0, 0.7, LANE_Z], 44, 2) },
  { t: 63.25, space: "hall", dissolve: XF, from: OUTSIDE, to: OUTSIDE, move: 0, creep: 0.04 },
  // 29 "She left just after him with the money." back inside: Arian pays, she walks out past him; the last second is his face
  { t: 64.0, space: "hall", dissolve: XF, from: P([0.95, 1.02, -1.55], [0.0, 0.66, 0.85], 38, 6), to: P([0.95, 1.02, -1.55], [0.0, 0.66, 0.85], 38, 6), move: 0 },
  { t: 64.55, space: "hall", move: 1.2, to: P([0.8, 0.98, -1.75], HR, 36, 8), creep: 0.07 },
];
const CAM = makeCamera(SHOTS, DURATION);
// the camera follows Max while he walks through the hall (shots 3-4 and 28)
const follow = (c: CamState, t: number): CamState => {
  const w = smooth(62.35, 62.9, t) * (1 - smooth(63.9, 64.0, t));
  if (w <= 0 || c.space !== "hall" || t > 63.55) return c;
  const m = bodyAt.max(t).pos;                                         // behind him, a little high, his back and the doors ahead
  return { ...c, pos: mix(c.pos, [m[0] - 1.45, 1.0, m[2] - 0.25], w), look: mix(c.look, [m[0] + 1.5, 0.66, LANE_Z], w) };
};
// 3.9-7.3: the camera backs away in front of the CEO as if he follows it, then turns to Ava and Arian before he shuts his door
const lead = (c: CamState, t: number): CamState => {
  if (t < 3.9 || t >= 7.3) return c;
  const m = bodyAt.max(t).pos[0], k = smooth(5.6, 7.3, t);
  const ahead: V3 = [Math.max(-2.55, Math.min(ENTR.pos[0], m - 1.7)), 0.86, LANE_Z], look: V3 = [m, 0.8, LANE_Z];   // straight in front, on his path
  const ctrl: V3 = [-1.7, 1.12, -2.35];                                // then it slides aside (counter side, out of his way) and turns to the two of them
  const pos = mix(mix(ahead, ctrl, k), mix(ctrl, TWO.pos, k), k);
  return { ...c, pos, look: mix(look, TWO.look, smooth(5.9, 7.3, t)), fov: lerp(ENTR.fov, TWO.fov, k), blur: lerp(ENTR.blur, TWO.blur, k) };
};
export const camAt = (t: number) => (t < 63.25 ? follow(lead(CAM.camAt(t), t), t) : CAM.camAt(t)) as CamState & { space: Space };
export const dissolveAt = (t: number) => { const d = CAM.dissolveAt(t); return d ? { w: d.w, out: follow(d.out, t) } : null; };
export const whiteAt = makeWhite([[28.55, 28.9, 29.2], [37.75, 38.0, 38.3], [57.15, T.arrive, 57.75]]);
export const fantasyOn = (t: number) => t > 28.7 && t < 38.2;

// ---------------- faces + sweat ----------------
const FACES: Record<Who | "dream", FaceEv[]> = {
  ava: [[0, "neutral"], [0.9, "smug"], [2.4, "neutral"], [5.2, "smug"], [8.0, "neutral"], [9.7, "smug"], [11.8, "grin"], [12.9, "smug"], [15.6, "neutral"], [17.6, "smug"], [18.7, "grin"],
    [20.3, "smug"], [25.4, "grin"], [26.3, "smug"], [27.4, "grin"], [28.4, "smug"], [39.2, "neutral"], [40.5, "grin"], [41.1, "neutral"], [42.9, "grin"], [43.5, "smug"], [44.6, "neutral"],
    [45.5, "smug"], [47.2, "grin"], [48.2, "smug"], [50.1, "neutral"], [50.5, "smug"], [58.4, "grin"], [59.4, "smug"], [60.5, "grin"], [61.4, "smug"], [62.2, "grin"]],
  arian: [[0, "neutral"], [4.7, "shock"], [5.7, "neutral"], [11.6, "smug"], [13.2, "neutral"], [15.0, "shock"], [15.9, "neutral"], [16.4, "smug"], [18.8, "neutral"], [22.7, "shock"], [23.9, "neutral"],
    [24.7, "shock"], [25.5, "smug"], [26.0, "grin"], [28.3, "smug"], [39.0, "grin"], [40.5, "neutral"], [41.5, "smug"], [49.6, "grin"], [50.4, "smug"], [57.5, "shock"], [58.7, "neutral"],
    [59.3, "smug"], [60.45, "shock"], [62.3, "neutral"], [63.0, "shock"], [64.2, "neutral"], [65.0, "shock"]],
  dream: [[0, "neutral"], [30.0, "smug"], [31.0, "neutral"], [32.0, "shock"], [33.0, "neutral"], [34.6, "grin"], [35.7, "smug"], [36.8, "grin"]],
  max: [[0, "neutral"], [4.2, "smug"], [6.0, "neutral"], [53.2, "shock"], [54.6, "neutral"], [55.3, "grin"], [56.3, "smug"], [57.4, "shock"], [58.4, "neutral"], [59.3, "smug"], [60.4, "grin"],
    [61.3, "smug"], [62.2, "grin"]],
  tina: [[0, "neutral"], [42.7, "grin"], [43.6, "neutral"], [44.8, "smug"], [45.6, "shock"], [46.6, "neutral"], [53.3, "shock"], [55.4, "neutral"], [56.8, "shock"]],
  cop: [[0, "neutral"], [4.0, "grin"], [5.4, "neutral"], [60.5, "shock"], [62.2, "smug"], [63.2, "grin"]],
  omar: [[0, "neutral"], [4.8, "smug"], [6.0, "neutral"], [57.6, "shock"], [58.8, "neutral"], [60.5, "shock"], [61.9, "grin"]],
  nora: [[0, "neutral"], [58.4, "shock"], [59.2, "neutral"], [60.5, "shock"], [61.9, "grin"]],
};
const SWEAT: Partial<Record<Who | "dream", [number, number][]>> = {
  arian: [[60.45, 62.2], [63.0, 66.3]], dream: [[31.0, 33.8]], max: [[53.2, 54.6], [57.5, 58.6]], tina: [[45.6, 46.6]],
};
export const LIFE = Object.fromEntries(Object.entries(FACES).map(([k, f]) => [k, makeLife(f, SWEAT[k as Who] ?? [])])) as Record<Who | "dream", Life>;
export const SEED: Record<Who | "dream", number> = { ava: 0.4, arian: 1.7, max: 2.9, tina: 3.6, cop: 4.4, nora: 5.3, omar: 6.1, dream: 1.1 };

// ---------------- talking: mouth shapes from the spoken words (lips move in real time) ----------------
// shapes: 0 closed, 1 a little open, 2 open, 3 wide open, 4 round, 5 wide with teeth
const SAY: Record<string, string> = { "5,000": "fivethousand", ceo: "seeeeoh", "guy?": "gai", you: "yoo", a: "a" };
const shapesOf = (word: string): number[] => {
  const w = SAY[word.toLowerCase()] ?? word.toLowerCase().replace(/[^a-z]/g, ""), out: number[] = [];
  for (const ch of w) {
    const s = "a".includes(ch) ? 3 : "ei y".includes(ch) ? 5 : ch === "o" ? 2 : "uw".includes(ch) ? 4 : "mbp".includes(ch) ? 0 : 1;
    if (out[out.length - 1] !== s) out.push(s);
  }
  return out.length ? out : [1];
};
const LINES: { who: Who; a: number; b: number }[] = [{ who: "ava", a: 51, b: 54 }, { who: "arian", a: 62, b: 63 }, { who: "ava", a: 71, b: 86 }];
export const talkAt = (who: Who, t: number): number => {
  for (const L of LINES) {
    if (L.who !== who || t < WORDS[L.a].s - 0.03 || t > WORDS[L.b].e + 0.08) continue;
    for (let i = L.a; i <= L.b; i++) {
      const w = WORDS[i], e = Math.max(w.e, w.s + 0.12);
      if (t >= w.s && t < e) {
        let sh = shapesOf(w.w); const n = Math.max(1, Math.round((e - w.s) / 0.085));
        if (sh.length > n) sh = Array.from({ length: n }, (_, k) => sh[Math.round((k * (sh.length - 1)) / Math.max(1, n - 1))]);
        return sh[Math.min(sh.length - 1, Math.floor(((t - w.s) / (e - w.s)) * sh.length))];
      }
    }
    return 0;                                             // a gap between two words of the line: closed
  }
  return -1;
};

// ---------------- captions: 1-2 words, never wider than the screen ----------------
export const CAPS: Cap[] = (() => {
  const out: Cap[] = []; let cur: Word[] = [];
  const flush = () => { if (cur.length) { out.push({ a: cur[0].s, b: cur[cur.length - 1].e, text: cur.map((w) => w.w).join(" ") }); cur = []; } };
  for (const w of WORDS) {
    if (cur.length && (cur[0].w.length + 1 + w.w.length > 13 || w.s - cur[0].e > 0.35)) flush();
    cur.push(w);
    if (cur.length >= 2 || /[.?!,:]$/.test(w.w)) flush();
  }
  flush();
  for (let i = 0; i < out.length; i++) out[i].b = Math.max(out[i].b, Math.min(out[i + 1]?.a ?? out[i].b + 0.4, out[i].b + 0.35));
  return out;
})();

// ---------------- prop timings ----------------
export const BOARD_FLIP = 40.38;
export const COINS = { a: 22.62, step: 0.16, b: 24.0 };
export const SHAKE = { a: 26.85, b: 27.95 };
export const DICE_GLINT = { a: 13.15, b: 13.95 };
export const NOTE_LINES = { pants: 53.1, yours: 55.05 };
export const QMARKS = { a: 65.0, step: 0.22 };
export const DREAM = { q: [31.2, 31.9, 32.6], qOut: 33.9, swap: 34.55, slam: 37.1 };

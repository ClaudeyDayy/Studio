// WALD BOMBER: the real timing (2026-11-20). 16 scenes from PLAN-wald-bomber-2026-11-20, timed to words.json (63.54 s).
// Loop: the last frame is the first frame (holed wing in golden sun). 1 object transition (S03 -> S04 photo). No captions.
// Joins are TRUE matched dissolves (no whip pans). Every shot names its place in `space`: the world picks the light,
// who is visible and where people stand from it (so both layers of a dissolve are right).
import { V3, sub, mul, norm } from "../../engine/core/util";
import { P, Pose, Shot, makeCamera, makeWhite, ramp } from "../../engine/core/camera";
import { lightTrack } from "../../engine/core/lights";

export const FPS = 30, DURATION = 64, TOTAL = DURATION * FPS;

// ---------------- where each place sits in the one shared world (far apart, never seen together) ----------------
export const SKY: V3 = [3000, 140, 0];      // P1: Jack's bomber above the cloud floor (clouds at y 120)
export const CABIN: V3 = [3000, 141, 70];   // P2: the cockpit set, up in the same sky (clouds in the windows)
export const STORM: V3 = [3000, 140, 1600]; // P1 storm (S07a): plated bombers in a grey-blue storm, low cloud floor
export const FIELD: V3 = [0, 0, 0];         // P3 + P4: airfield, hangar at z = 30
export const OFFICE: V3 = [-3000, 0, 0];    // P5: Wald's office
export const DINER: V3 = [0, 0, -3000];     // P6: fantasy restaurant
export const A = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
/** a point given in a turned thing's own frame (turned by th about y, like three's rotation.y) -> world */
export const rotY = (o: V3, th: number, x: number, y: number, z: number): V3 => [o[0] + x * Math.cos(th) + z * Math.sin(th), o[1] + y, o[2] - x * Math.sin(th) + z * Math.cos(th)];

// ---------------- story spots (the world uses the same numbers, so cameras and people agree) ----------------
export const PB: V3 = A(SKY, 0, 0, -90);                 // S13: the plane that gets hit in the engine and drops
export const STORM_PLANES: V3[] = [A(STORM, 0, 0, 0), A(STORM, -22, -1, -14), A(STORM, -44, -2, -28)];   // S07a line, the back one vanishes
export const TALLY: V3 = A(FIELD, -2.5, 0, -13), TALLY_R = 2.498;   // S07b tally board, faces the camera; the plated plane 1 behind it
export const tally = (x: number, y: number, z: number) => rotY(TALLY, TALLY_R, x, y, z);
export const MAX_TALLY = tally(1.9, 0, 0.75);           // Max beside the tally board
export const MAX_WING: V3 = A(FIELD, -7.2, 0, 1.3);     // S06 Max on the ground by the plated wing
export const CHEESE: V3 = A(FIELD, -7.07, 0.78, 1.68);  // S06 the Swiss cheese held out low in Max's right hand (his head stays out of the close-up)
export const MAX_ENGINE: V3 = A(FIELD, -3.6, 0, -1.6);  // S15 Max watching the plates go onto the engine (over his shoulder)
export const ENGINE_LOOK: V3 = A(FIELD, -6.8, 1.9, -5.0);
export const WALD_DESK: V3 = A(OFFICE, 1.0, 0, -1.95);  // seated behind the desk, facing the camera (+z)
export const WALD_BOARD: V3 = A(OFFICE, -2.35, 0, -1.7);// standing at the chalkboard's left end
export const LAMP: V3 = A(OFFICE, 1.62, 1.12, -1.4);
export const MODEL_DESK: V3 = A(OFFICE, 1.15, 0.81, -1.0), MODEL_UP: V3 = A(OFFICE, 1.42, 1.14, -1.5);
// chalkboard in the office: centre, and where the drawn engines / cockpit are (board local units -> metres: 0.00867)
export const BOARD_C: V3 = A(OFFICE, -1.4, 1.6, -2.43);
export const BOARD_MARKS: V3[] = [[-62, -6], [-32, -6], [32, -6], [62, -6], [0, -50]].map(([x, y]) => A(BOARD_C, x * 0.00867, -y * 0.00867, 0.01));
// the photo on the hangar board that S03 collapses into (screen corners TL, TR, BR, BL as the S04 camera sees them)
export const PHOTO_C: V3 = A(FIELD, -2.15, 2.1, 42.70), PHOTO_W = 0.36, PHOTO_H = 0.64;
export const PHOTO_CORNERS: V3[] = [A(PHOTO_C, PHOTO_W / 2, PHOTO_H / 2, 0), A(PHOTO_C, -PHOTO_W / 2, PHOTO_H / 2, 0), A(PHOTO_C, -PHOTO_W / 2, -PHOTO_H / 2, 0), A(PHOTO_C, PHOTO_W / 2, -PHOTO_H / 2, 0)];
// landing planes in S03: touch-down time and the runway (x along it, 30 m/s, then braking)
export const LAND = [{ td: 11.5 }, { td: 13.2 }];

// ---------------- camera ----------------
const OPEN = P(A(SKY, -2.6, 1.3, -9.4), A(SKY, 0.4, -0.2, -4.5), 44);          // first = last frame: holed wing, low gold sun
const NOSE = P(A(SKY, 9.5, 1.8, -4.0), A(SKY, 4.7, 0.5, 0), 48);              // in front of the cockpit windows
const CREEP = 0.12, LAST_T = 61.85, LAST_MOVE = 1.25;
const endPose = (): Pose => { const d = norm(sub(OPEN.look, OPEN.pos)); return { ...OPEN, pos: sub(OPEN.pos, mul(d, CREEP * ramp(DURATION - LAST_T - LAST_MOVE))) }; };
const near = (target: V3, from: V3, d: number): V3 => { const v = norm(sub(from, target)); return [target[0] + v[0] * d, target[1] + v[1] * d, target[2] + v[2] * d]; };
const CHEESE_CAM0: V3 = A(FIELD, -5.6, 1.02, 2.9);
const camT = (cx: number, cy: number, cz: number, lx: number, ly: number, lz: number, fov: number, blur = 0) => P(tally(cx, cy, cz), tally(lx, ly, lz), fov, blur);
const head = (p: V3, h = 0.98): V3 => [p[0], p[1] + h, p[2]];
const level = (p: V3, y: number): V3 => [p[0], y, p[2]];

const shots: Shot[] = [
  // S01 0.00-3.45  "The safest part of a bomber was the part covered in bullet holes."  holed wing -> pull back -> fly to the cockpit
  { t: 0, space: "sky", from: OPEN, to: OPEN, move: 0, creep: CREEP, noRamp: true, tag: "S01" },
  { t: 0.95, space: "sky", to: P(A(SKY, -5, 4.6, -16.5), A(SKY, 1.5, 0, -3), 44), move: 1.8 },
  { t: 2.75, space: "sky", to: NOSE, move: 0.85, via: A(SKY, 3, 5, -12) },
  // S02a 3.45-8.85  "It's 1943 ... Jack limps home ... ten-man crew,"  through the windscreen to Max, then down the body to the crew
  { t: 3.3, space: "cabin", from: P(A(CABIN, 1.75, 1.55, -0.1), A(CABIN, -0.62, 0.95, -0.2), 50), to: P(A(CABIN, 1.15, 1.45, -0.12), A(CABIN, -0.62, 0.93, -0.18), 50), move: 1.4, creep: 0.05, dissolve: 0.35, tag: "S02a" },
  { t: 7.2, space: "cabin", from: P(A(CABIN, -1.32, 1.02, 0.2), A(CABIN, -7, 0.72, -0.05), 58), to: P(A(CABIN, -1.4, 1.0, 0.2), A(CABIN, -7, 0.72, -0.05), 58), move: 0.8, creep: 0.1, dissolve: 0.4 },
  // S02b 8.85-10.63  "one wing full of holes."  insert on the holed wing, an engine coughs; follow the line down
  { t: 8.75, space: "sky", from: P(A(SKY, -0.8, 2.7, -12.2), A(SKY, 2.4, 0.1, -5.2), 40), to: P(A(SKY, -0.2, 2.5, -11.6), A(SKY, 2.6, 0.1, -5.0), 40, 0, 3), move: 1.2, dissolve: 0.35, tag: "S02b" },
  { t: 9.95, space: "sky", to: P(A(SKY, 2, 6.5, -13.5), A(SKY, 9, -14, -6), 50), move: 0.75 },
  // S03 10.63-15.54  "Planes like his keep coming back ... never return."  high over the landing planes, glide down to the empty spot
  { t: 10.5, space: "field", from: P(A(FIELD, -62, 22, -80), A(FIELD, -88, 6, -45), 46), to: P(A(FIELD, -58, 21, -79), A(FIELD, -70, 4, -45), 46), move: 0.7, dissolve: 0.35, tag: "S03" },
  { t: 11.2, space: "field", to: P(A(FIELD, 19, 1.1, -15), A(FIELD, 13.5, 1.3, -3), 50), move: 3.2, via: A(FIELD, -25, 16, -48), creep: 0.15 },
  // S04 15.54-18.46  "The generals study the damage and make a simple plan."  OBJECT TRANSITION: S03 shrinks into a photo on the board
  { t: 15.45, space: "hangar", from: P(A(FIELD, 2.0, 1.25, 35.4), A(FIELD, -1.0, 1.9, 42.7), 44, 8), to: P(A(FIELD, 2.0, 1.25, 35.4), A(FIELD, -1.0, 1.9, 42.7), 44, 8), move: 0, creep: 0.14, collapse: { dur: 0.6, hold: 0.3 }, tag: "S04" },
  { t: 17.2, space: "hangar", to: P(A(FIELD, 1.6, 1.25, 36.2), A(FIELD, -0.4, 1.85, 42.7), 44, 8), move: 1.0, creep: 0.08 },
  // S05 18.46-20.63  "Armor every spot that got hit."  low insert on the wing: plates go on, stamp on "hit"
  { t: 18.35, space: "field", from: P(A(FIELD, -6.7, 2.75, 1.9), A(FIELD, -8.7, 2.3, -0.9), 46), to: P(A(FIELD, -6.85, 2.65, 1.6), A(FIELD, -8.7, 2.3, -0.9), 46), move: 1.6, creep: 0.06, dissolve: 0.35, tag: "S05" },
  // S06 20.63-24.57  "Jack laughs ... Swiss cheese wearing a steel jacket."  two-shot, then push to the cheese
  { t: 20.5, space: "field", from: P(A(FIELD, -5.4, 1.05, 3.1), A(FIELD, -7.7, 1.3, 0.5), 50), to: P(CHEESE_CAM0, A(FIELD, -7.5, 1.25, 0.5), 50), move: 1.2, creep: 0.06, dissolve: 0.35, tag: "S06" },
  { t: 22.35, space: "field", to: P(near(CHEESE, CHEESE_CAM0, 0.75), CHEESE, 42), move: 1.3, creep: 0.05 },
  { t: 23.75, space: "field", to: P(level(near(CHEESE, CHEESE_CAM0, 0.34), CHEESE[1] + 0.02), CHEESE, 38), move: 0.8 },
  // S07a 24.57-27.38  "Still, bombers keep vanishing over Europe."  storm, plated planes in a line, the back one slips into cloud
  { t: 24.45, space: "storm", from: P(A(STORM, 12, 2, 24), A(STORM, -16, -2, -10), 48), to: P(A(STORM, 9, 2.5, 22), A(STORM, -18, -2.5, -12), 48), move: 1.6, drift: [-1.2, 0, -0.6], dissolve: 0.4, tag: "S07a" },
  // S07b+S08 27.38-33.24  "Armor is heavy ... Wait, why would armor ... not help?"  tally board, push to Max on "Wait"
  { t: 27.25, space: "field", from: camT(0.6, 1.2, 5.6, 0.85, 1.3, 0, 50), to: camT(0.75, 1.15, 5.0, 0.9, 1.3, 0, 50), move: 1.4, creep: 0.05, dissolve: 0.4, tag: "S07b" },
  { t: 28.95, space: "field", to: camT(1.55, 1.02, 2.75, 1.85, 0.98, 0.75, 46), move: 0.65, creep: 0.06 },
  { t: 32.4, space: "field", to: P(near(head(MAX_TALLY), tally(1.6, 1.0, 2.75), 0.6), head(MAX_TALLY), 44), move: 0.75 },   // into his round head
  // S09 33.24-37.44  "You see, a mathematician named Abraham Wald studies the same planes."  round head -> round lamp, pull back
  { t: 33.05, space: "office", from: P(A(OFFICE, 1.62, 1.16, -0.55), LAMP, 48), to: P(A(OFFICE, 1.62, 1.16, -0.55), LAMP, 48), move: 0, dissolve: 0.4, tag: "S09" },
  { t: 33.5, space: "office", to: P(A(OFFICE, -0.1, 1.32, 2.3), A(OFFICE, 1.0, 0.95, -1.5), 54), move: 2.4, orbit: 2.5 },
  // S10 37.44-43.05  "Legend says he asks ... Where are the holes that aren't here?"  over a colleague's shoulder, sting onto the clean engines
  { t: 37.35, space: "office2", from: P(A(OFFICE, 0.8, 1.25, 2.2), A(OFFICE, -1.6, 1.35, -2.2), 50, 6), to: P(A(OFFICE, 0.6, 1.2, 1.9), A(OFFICE, -1.6, 1.35, -2.2), 50, 6), move: 1.5, creep: 0.05, dissolve: 0.4, tag: "S10" },
  { t: 41.05, space: "office2", to: P(A(OFFICE, -1.3, 1.64, -1.15), A(OFFICE, -1.4, 1.63, -2.42), 46, 0, 5), move: 1.15, via: A(OFFICE, -0.3, 1.6, 0.2) },
  { t: 42.45, space: "office2", to: P(A(OFFICE, -2.28, 1.0, -1.22), head(WALD_BOARD, 0.98), 50), move: 0.5 },   // push into his white head
  // S11 43.05-48.76  "Think about judging a restaurant ... the ones who left."  FANTASY: moon, Ava asks the diners, turn to the door
  { t: 43.05, space: "diner", from: P(A(DINER, 0.6, 1.5, 5.2), A(DINER, -25, 34, -100), 50), to: P(A(DINER, 0.6, 1.5, 5.2), A(DINER, -25, 34, -100), 50), move: 0, tag: "S11" },
  { t: 43.4, space: "diner", to: P(A(DINER, 1.7, 1.45, 3.7), A(DINER, -0.3, 0.9, -0.5), 50), move: 1.7, drift: [-0.12, 0, -0.05] },
  { t: 46.85, space: "diner", to: P(A(DINER, -0.6, 1.5, 2.0), A(DINER, -2.2, 1.0, -8), 46), move: 1.1, creep: 0.1 },
  { t: 48.3, space: "diner", to: P(A(DINER, 2.4, 2.1, 6.0), A(DINER, -2.2, 1.0, -8), 68), move: 0.45 },                // fantasy exit: fast pull back, wide
  // S12 48.76-50.75  "These bombers are the survivors."  out of Wald's white head; he holds the holed model up to the lamp
  { t: 48.76, space: "office", from: P(A(OFFICE, 1.0, 1.06, -1.42), head(WALD_DESK, 0.98), 46), to: P(A(OFFICE, 1.0, 1.06, -1.42), head(WALD_DESK, 0.98), 46), move: 0, tag: "S12" },
  { t: 48.95, space: "office", to: P(A(OFFICE, 0.4, 1.28, 1.3), A(OFFICE, 1.15, 1.0, -1.6), 52), move: 1.3 },
  { t: 50.25, space: "office", to: P(A(OFFICE, 1.42, 1.14, -0.75), MODEL_UP, 44), move: 0.45 },
  // S13 50.75-53.75  "A bad hit to the engine, and a plane never makes it home."  model -> real plane; hit, it drops into the clouds
  { t: 50.55, space: "sky", from: P(A(PB, -1.5, 0.6, 30), A(PB, 0.5, 0, 0), 44), to: P(A(PB, -1.2, 0.5, 29), A(PB, 0.8, -0.3, 0), 44), move: 1.2, creep: 0.3, dissolve: 0.4, tag: "S13" },
  { t: 52.0, space: "sky", to: P(A(PB, -1.5, 4, 27), A(PB, 3, -18, 0), 48), move: 1.35 },
  // S14 53.75-56.80  "So the clean, untouched spots are the deadly ones."  red chalk circles on the clean engines and cockpit
  { t: 53.6, space: "office3", from: P(A(OFFICE, -1.3, 1.55, 0.0), A(OFFICE, -1.4, 1.7, -2.42), 52), to: P(A(OFFICE, -1.3, 1.6, -0.2), A(OFFICE, -1.4, 1.7, -2.42), 52), move: 1.4, creep: 0.12, dissolve: 0.4, tag: "S14" },
  // S15 56.80-60.63  "Legend says the generals listen, and armor goes there instead."  over Max's shoulder: plates go on the engine
  { t: 56.7, space: "field", from: P(A(FIELD, -2.6, 1.25, -0.9), ENGINE_LOOK, 52, 8), to: P(A(FIELD, -2.77, 1.19, -1.08), ENGINE_LOOK, 52, 8), move: 1.2, orbit: -3, dissolve: 0.4, tag: "S15" },
  { t: 60.1, space: "field", to: P(A(FIELD, -3.8, 5.5, -2.5), A(FIELD, -12, 28, -22), 60), move: 0.55 },                // fly up into the sky
  // S16 60.63-64.00  "The holes were never the danger. They were the good news."  Max happy, then out to the holed wing (= the first frame)
  { t: 60.5, space: "cabin", from: P(A(CABIN, 1.0, 1.42, -0.12), A(CABIN, -0.62, 0.93, -0.2), 50), to: P(A(CABIN, 1.4, 1.48, -0.1), A(CABIN, -0.62, 0.93, -0.2), 50), move: 1.4, dissolve: 0.35, tag: "S16" },
  { t: LAST_T, space: "sky", from: NOSE, to: endPose(), move: LAST_MOVE, via: A(SKY, 3, 5, -12), creep: CREEP, dissolve: 0.35 },
];
// impact kicks: plate stamp on "hit", engine hit, the two plates going onto the engine
const KICKS: [number, number][] = [[20.18, 1.0], [51.34, 1.0], [58.0, 0.5], [59.7, 0.5]];
const CAM = makeCamera(shots, DURATION, { kicks: KICKS });
export const camAt = CAM.camAt, dissolveAt = CAM.dissolveAt, collapseAt = CAM.collapseAt;
// white: into the fantasy (through Wald's head) and back out of it
export const whiteAt = makeWhite([[42.82, 43.05, 43.3], [48.5, 48.76, 49.0]]);
// colour grade over time (the world picks each place's light from the shot's space; this is only the grade)
export const LIGHT = lightTrack([[0, "sunset"], [3.3, "sunny", 0.35], [8.75, "sunset", 0.35], [10.5, "sunny", 0.35], [24.45, "storm", 0.4], [27.25, "sunny", 0.4],
  [33.05, "night", 0.4], [43.05, "sunny", 0.1], [48.76, "night", 0.1], [50.55, "sunset", 0.4], [53.6, "night", 0.4], [56.7, "sunny", 0.4], [60.5, "sunny"], [61.85, "sunset", 0.35]]);
// the place light for each space
export const SPACE_LIGHT: Record<string, "sunset" | "sunny" | "storm" | "night"> = {
  sky: "sunset", cabin: "sunny", storm: "storm", field: "sunny", hangar: "sunny", office: "night", office2: "night", office3: "night", diner: "sunny",
};
// cloud floors scroll backwards so the planes fly; each sky scene restarts the scroll (the loop frame matches: offset 0 at t = 0 and 64)
export const cloudAnchor = (t: number) => (t < 8 ? 0 : t < 24 ? 8.75 : t < 40 ? 24.45 : t < 58 ? 50.55 : DURATION);

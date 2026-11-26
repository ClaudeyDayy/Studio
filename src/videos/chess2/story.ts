// "Infinite chess" v3 (remake with the updated chained-camera-shorts skill).
// World units are metres. Café table at the origin, top at y = 0.78. Arian sits at z = +0.95 facing -z, Max at z = -0.95 facing +z.
// The fantasy space (thoughts) is the same scene, far away at x = FX.
// v3.1: both fantasies are Max's thoughts and both END the same way: the fantasy camera pulls back fast, the picture goes
// white, and the café starts close on Max's white head and pulls back out of it (mirror of going in). No glass dome.
import words from "./words.json";
import { V3, clamp01, smooth, shuffled, easeOutBounce } from "../../engine/core/util";
import { P, Pose, Shot as EShot, makeCamera, makeWhite } from "../../engine/core/camera";
import { Face, FaceEv, makeLife, Life } from "../../engine/cast/life";
import { Word, capsFromWords } from "../../engine/core/captions";

export const FPS = 30;
export const DURATION = 67.26;            // end of the last word
export const TOTAL = Math.ceil(DURATION * FPS);
export type { Word };
export const WORDS = words as Word[];
export type { V3 } from "../../engine/core/util";
export type Who = "arian" | "max";
export { clamp01, smooth } from "../../engine/core/util";

export const FX = 60;
export const F = (x: number, y: number, z: number): V3 => [FX + x, y, z];

// ---------------- camera: one short path per shot (skill 4.5), eased ends, slow creep after each move ----------------
export type Space = "cafe" | "fantasy";
export type { Pose };
type Shot = EShot & { space: Space };

export const HEAD_A: V3 = [0, 1.13, 0.95];
export const HEAD_M: V3 = [0, 1.13, -0.95];
export const STOPWATCH_POS: V3 = [-0.45, 0.9, 0.0];
export const MOON: V3 = F(0, 9, -20);

// top-down opening = ending (loop). The last shot creeps into exactly this pose at DURATION.
export const LOOP = P([0, 2.75, 0.12], [0, 0.8, 0], 44, 0);
const LOOP_CREEP = 0.04, LAST_T = 61.3, LAST_MOVE = 3.5;
const LOOP_PRE: Pose = makeCamera([], DURATION).creepStart(LOOP, LOOP_CREEP, DURATION - LAST_T - LAST_MOVE);

const pushM1 = P([0.28, 1.1, -0.84], HEAD_M, 32, 6);           // close on Max's face (white head): going into AND coming out of his thoughts
const moonA = P(F(0.6, 1.0, 2.9), MOON, 20, 0);
const moonB = P(F(-0.6, 1.0, 2.9), MOON, 20, 0);
// fantasy exits: fast pull back + wider lens (zoom out), the picture goes white at the end of the move
const OUT_A = P(F(0.9, 1.9, 5.6), F(0, 1.0, 0), 50, 0);
const OUT_B = P(F(0.9, 2.0, 5.4), F(0, 1.0, 0), 50, 0);
export const EXIT2 = { a: 38.2, b: 38.9 };
const XF = 0.3;                                                  // matched dissolve length (9 frames)

export const SHOTS: Shot[] = [
  // 0 "You can read minds." top-down on the board (top-down 1 of 2)
  { t: 0, space: "cafe", from: LOOP, to: LOOP, move: 0, creep: LOOP_CREEP, noRamp: true },
  // 1 "...sat down to play chess with a stranger." 90-degree tilt from top-down to over Arian's shoulder, onto Max
  { t: 2.0, space: "cafe", move: 2.2, to: P([0.38, 1.3, 1.85], [0, 1.1, -0.95], 34, 12), creep: 0.03 },
  // 2 "You hear his every thought." dissolve (Max's head -> Max's head) to a low side view of Max
  { t: 5.0, space: "cafe", dissolve: XF, from: P([1.1, 0.95, -0.55], HEAD_M, 32, 10), to: P([1.1, 0.95, -0.55], HEAD_M, 32, 10), move: 0, creep: 0.03 },
  // 3 push into Max's head (white) -> the white moon
  { t: 6.45, space: "cafe", move: 0.75, to: pushM1 },
  // 4-6 fantasy: "He thinks about his queen. You already know."  moon close-up, zoom out to the platform, then EXIT: pull far back -> white
  { t: 7.2, space: "fantasy", from: moonA, to: moonA, move: 0 },
  { t: 7.25, space: "fantasy", move: 1.2, to: P(F(0.55, 1.1, 2.4), F(0, 1.6, -3), 42, 6), creep: 0.04 },
  { t: 9.2, space: "fantasy", move: 0.65, to: OUT_A },
  // 7 out of the white: close on Max's head, pull back out of it, over Arian's head, to a high view down the board:
  //   "He plans an attack." (red attack arrow, Max reaches for his queen) "You block it" (Arian's pawn breaks the arrow)
  //   "before he touches the piece." (Max's hand freezes above the queen, then pulls back). Both hands stay in the picture.
  { t: 9.85, space: "cafe", from: pushM1, move: 1.15, to: P([-0.22, 1.72, 1.3], [0, 0.8, -0.12], 36, 5), creep: 0.03 },
  // 8 "You're unbeatable. Or so you think." dissolve to a low angle on Arian, blurred pieces in front
  { t: 13.5, space: "cafe", dissolve: XF, from: P([0.5, 1.02, -0.25], [0, 1.12, 0.95], 32, 12), to: P([0.5, 1.02, -0.25], [0, 1.12, 0.95], 32, 12), move: 0, creep: 0.03 },
  // 9 "Because every move you make, he counters perfectly." dissolve (Arian's head -> Arian's head), over Max's shoulder
  { t: 16.7, space: "cafe", dissolve: XF, from: P([-0.38, 1.3, -1.85], [0, 1.1, 0.95], 34, 12), to: P([-0.38, 1.3, -1.85], [0, 1.1, 0.95], 34, 12), move: 0, creep: 0.03 },
  // 10 "You see, ... it takes almost no time for him to lose." dissolve to a high view of the whole game, slow orbit.
  //    The stopwatch is a flat overlay (video.ts): pops in big, flies to the top left and ticks while they play in time-lapse;
  //    on "lose" it stops, flies back and grows until its white face fills the screen -> white -> the moon (round matches round)
  { t: 20.25, space: "cafe", dissolve: XF, from: P([1.05, 2.15, 1.2], [0, 0.82, -0.05], 38, 4), to: P([1.05, 2.15, 1.2], [0, 0.82, -0.05], 38, 4), move: 0, orbit: -3, creep: 0.02 },
  // 12-15 fantasy: move number five, the future, your secret
  { t: 27.3, space: "fantasy", from: moonB, to: moonB, move: 0 },
  { t: 27.4, space: "fantasy", move: 1.2, to: P(F(-0.55, 1.1, 2.4), F(0, 1.6, -3), 42, 6), creep: 0.04 },
  { t: 32.1, space: "fantasy", dissolve: XF, from: P(F(1.3, 2.0, 1.4), F(0, 0.6, 0), 36, 6), to: P(F(1.3, 2.0, 1.4), F(0, 0.6, 0), 36, 6), move: 0, creep: 0.03 },
  { t: 35.15, space: "fantasy", dissolve: XF, from: P(F(0.35, 1.15, 1.75), F(0, 1.15, -0.1), 34, 8), to: P(F(0.35, 1.15, 1.75), F(0, 1.15, -0.1), 34, 8), move: 0, creep: 0.025 },
  // 16 EXIT 2: pull far back in the fantasy -> white
  { t: EXIT2.a, space: "fantasy", move: EXIT2.b - EXIT2.a, to: OUT_B },
  // 17 out of the white: close on Max's head, pull back out of it into the café
  { t: EXIT2.b, space: "cafe", from: pushM1, move: 1.7, to: P([1.25, 1.25, 1.25], [0.3, 0.84, 0.3], 38, 6), creep: 0.02 },
  // 18 "And you just push harder on him ... You already heard it." rise to a high three-quarter view, slow orbit
  { t: 40.95, space: "cafe", move: 1.3, to: P([1.5, 2.05, 1.55], [0, 0.92, 0], 36, 4), orbit: 2, creep: 0.015 },
  // 19 "You both think you're cheating ... neither of you can lose." dissolve to a low wide side view, slow orbit
  { t: 48.9, space: "cafe", dissolve: XF, from: P([2.6, 1.55, 0.6], [0, 1.0, 0], 38, 2), to: P([2.6, 1.55, 0.6], [0, 1.0, 0], 38, 2), move: 0, orbit: -6, creep: 0.008 },
  // 20-21 "Because every future leads to another move. Hours pass. The board never ends." dissolve, then a slow crane up behind Arian
  //   (higher and farther back than v3, so Arian's head in front is smaller and not cut by the frame)
  { t: 55.6, space: "cafe", dissolve: XF, from: P([0.35, 2.0, 2.15], [0, 0.9, -0.1], 40, 4), to: P([0.35, 2.0, 2.15], [0, 0.9, -0.1], 40, 4), move: 0 },
  { t: 56.9, space: "cafe", move: 4.2, to: P([0.15, 2.35, 1.6], [0, 0.85, 0], 40, 2) },
  // 22 "Congratulations ... who would actually win?" rise to top-down (2 of 2) = the opening frame
  { t: LAST_T, space: "cafe", move: LAST_MOVE, to: LOOP_PRE, creep: LOOP_CREEP },
];

const CAM = makeCamera(SHOTS, DURATION);
export const camAt = CAM.camAt as (t: number) => ReturnType<typeof CAM.camAt> & { space: Space };
// matched dissolves: the outgoing shot keeps moving underneath while the incoming one fades in on top
export const dissolveAt = CAM.dissolveAt;

// white dissolves: into a thought (round white thing -> white moon) and out of it (fantasy pull-back -> Max's white head)
export const whiteAt = makeWhite([[6.95, 7.2, 7.45], [9.6, 9.85, 10.1], [27.05, 27.3, 27.55], [38.6, 38.9, 39.2]]);
export const fantasyVisible = (t: number) => (t > 7.1 && t < 10.0) || (t > 27.2 && t < EXIT2.b + 0.1);

// ---------------- faces: each change fades over 6 frames (no one-frame jumps) ----------------
export type { Face };
export const FACES: Record<Who, FaceEv[]> = {
  // v4: faces change on almost every key word (reference study 16.7); both neutral at the start and the end (loop)
  arian: [[0, "neutral"], [1.7, "smug"], [3.5, "neutral"], [5.3, "smug"], [8.85, "grin"], [10.0, "smug"], [11.65, "grin"], [13.0, "smug"],
    [13.85, "grin"], [15.3, "neutral"], [16.15, "shock"], [17.6, "neutral"], [18.8, "shock"], [19.9, "neutral"], [20.55, "smug"], [23.3, "grin"],
    [24.4, "smug"], [25.95, "grin"], [26.7, "neutral"], [35.3, "smug"], [37.0, "grin"], [39.1, "neutral"], [40.5, "shock"], [41.65, "smug"], [42.7, "grin"],
    [44.0, "smug"], [45.05, "shock"], [46.25, "neutral"], [47.65, "smug"], [48.3, "grin"], [49.1, "smug"], [50.75, "grin"], [52.4, "shock"],
    [54.0, "neutral"], [55.0, "shock"], [56.0, "neutral"], [61.55, "grin"], [63.4, "smug"], [64.5, "grin"], [65.6, "neutral"]],
  max: [[0, "neutral"], [2.9, "smug"], [4.4, "neutral"], [7.15, "smug"], [12.0, "shock"], [13.4, "neutral"], [14.15, "shock"], [15.4, "smug"],
    [17.0, "neutral"], [18.85, "smug"], [19.5, "grin"], [20.55, "neutral"], [22.3, "smug"], [24.6, "neutral"], [25.95, "shock"], [26.7, "smug"], [30.8, "grin"],
    [33.9, "smug"], [36.6, "neutral"], [37.4, "shock"], [38.3, "neutral"], [40.7, "smug"], [42.7, "shock"], [43.5, "neutral"], [45.05, "smug"],
    [45.9, "grin"], [46.9, "smug"], [47.65, "shock"], [49.0, "smug"], [50.75, "grin"], [52.4, "shock"], [54.0, "neutral"], [55.0, "shock"],
    [56.0, "neutral"], [61.55, "grin"], [63.4, "smug"], [64.6, "grin"], [65.6, "neutral"]],
};
// blue sweat drops on stressful beats (reference 16.7): [start, end]
export const SWEAT: Record<Who, [number, number][]> = {
  arian: [[16.15, 17.7], [45.05, 46.3], [52.4, 55.9]],
  max: [[12.0, 13.5], [14.15, 15.4], [25.95, 27.2], [42.7, 43.6], [47.65, 48.9], [52.4, 55.9]],
};
export const LIFE: Record<Who, Life> = { arian: makeLife(FACES.arian, SWEAT.arian), max: makeLife(FACES.max, SWEAT.max) };
export const SEED: Record<Who, number> = { arian: 0.4, max: 1.7 };      // idle sway phase per person
export const sweatAt = (who: Who, t: number) => LIFE[who].sweat(t);
export const faceMix = (who: Who, t: number) => LIFE[who].face(t);

// ---------------- props ----------------
// stopwatch overlay (screen pixels): pop in big at the centre, shrink to the top left, tick, stop on "lose", grow to fill the screen
export const STOPWATCH = { a: 20.6, toCorner: 21.0, corner: 21.45, stop: 26.15, back: 26.45, fill: 27.2, spin: 9 };
// "He plans an attack. You block it": red attack arrow from Max's queen toward Arian's king, broken by Arian's pawn
export const ATTACK = { draw: 10.75, drawEnd: 11.3, block: 11.95, gone: 12.9 };
export const SIGN = { a: 61.6, b: 66.0, pos: [0.52, 0.8, -0.5] as V3, size: 0.28 };
export const CUPS = { a: 56.0, b: 61.2, fadeEnd: 62.2, count: 7 };
export const CONFETTI = { a: 61.6, b: 66.0 };
// fantasy props
export const GHOSTS = { a: 29.6, step: 0.4, out: 32.2 };     // ghost moves 1-4 stack up
export const FIVE = { a: 31.3, b: 32.0 };                    // big 3D "5" (gone before the dissolve at 32.1)
export const FUTURE = { a: 32.9, b: 35.0, lit: 34.4 };       // future moves glide over the board
export const EYE = { a: 35.4 };                              // Arian's secret (glowing eye) above his copy

// ---------------- light cycle: day -> sunset -> night -> dawn -> day during "hours pass" (time-lapse, reference 16.1) ----------------
export const nightAt = (t: number) => smooth(56.9, 58.4, t) * (1 - smooth(59.4, 60.6, t));
export const duskAt = (t: number) => Math.max(smooth(55.7, 56.8, t) * (1 - smooth(57.4, 58.4, t)), smooth(59.6, 60.4, t) * (1 - smooth(60.6, 61.6, t)));

// ---------------- the opening: the pieces appear one by one in a random order on the empty board, all placed by the time the
// camera reaches Max (about 4.2 s). The ending: they vanish one by one in another random order, so the last frame is the empty
// board from the top = the first frame (loop). ----------------
export const PIECES_IN = { a: 0.15, b: 3.9, dur: 0.38 };
export const PIECES_OUT = { a: 62.6, b: 66.55, dur: 0.32 };
const ORDER_IN = shuffled(32, 3), ORDER_OUT = shuffled(32, 11);
const RANK_IN: number[] = [], RANK_OUT: number[] = [];
ORDER_IN.forEach((p, k) => { RANK_IN[p] = k; }); ORDER_OUT.forEach((p, k) => { RANK_OUT[p] = k; });
// piece number i (0..31): scale, lift above its square (m), spin (rad), and a landing / vanishing sparkle 0..1
export const pieceShow = (i: number, t: number) => {
  const a = PIECES_IN.a + (RANK_IN[i] / 31) * (PIECES_IN.b - PIECES_IN.a);
  const b = PIECES_OUT.a + (RANK_OUT[i] / 31) * (PIECES_OUT.b - PIECES_OUT.a);
  if (t < a || t >= b + PIECES_OUT.dur) return { s: 0, lift: 0, spin: 0, spark: 0 };
  if (t < a + PIECES_IN.dur) {
    const u = (t - a) / PIECES_IN.dur;
    return { s: smooth(0, 0.25, u), lift: 0.16 * (1 - easeOutBounce(u)), spin: 1.4 * (1 - u) * (1 - u), spark: u > 0.35 ? Math.sin(Math.PI * clamp01((u - 0.35) / 0.65)) : 0 };
  }
  if (t >= b) {
    const u = (t - b) / PIECES_OUT.dur;
    return { s: 1 - smooth(0.15, 1, u), lift: 0.06 * u * u, spin: -2.2 * u * u, spark: Math.sin(Math.PI * u) };
  }
  return { s: 1, lift: 0, spin: 0, spark: 0 };
};

// ---------------- captions from words.json: 1-2 words per caption, split at punctuation ----------------
export type { Cap } from "../../engine/core/captions";
export const CAPS = capsFromWords(WORDS);

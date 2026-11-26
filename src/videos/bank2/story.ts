// "The pants bet" REMAKE (bank2, R3KNRF, 2026-11-11): time, people, camera shots, faces, talking, prop timings,
// built fresh for the new voice (words.json, 59.3 s). Same hall, office and cast as the first bank video.
// World units are metres at CHARACTER scale: people 1.2 m, seats 0.19 m, the counter 0.5 m, doors 1.5 m.
// Hall: x -3.4..3.4, z -4.6..3.2. Counter z -3.1..-2.6. Waiting chairs in a row at z = 0.9, everybody faces -z (the counter).
// CEO office behind the left wall (x < -3.5). The fantasy is the same scene, far away at x = FX, seen through the SAME still
// camera (shifted by FX) so only Arian stays while everything round him changes.
import words from "./words.json";
import { V3, smooth, smoother, clamp01 } from "../../engine/core/util";
import { P, Pose, Shot as EShot, CamState, makeCamera, makeWhite } from "../../engine/core/camera";
import { FaceEv, makeLife, Life } from "../../engine/cast/life";
import type { FaceKey } from "../../engine/cast/face";
import { Word, Cap } from "../../engine/core/captions";
import { makePath, WalkState } from "../../engine/cast/walk";
import type { FxEvent } from "../../engine/fx/fx";

export const FPS = 30;
export const DURATION = 59.75;                      // the voice ends at 59.32 s
export const TOTAL = Math.ceil(DURATION * FPS);
// "$5" + ",000" arrive as two tokens: join them so captions and lips treat them as one word
const merge = (ws: Word[]): Word[] => { const out: Word[] = []; for (const w of ws) { const q = out[out.length - 1]; if (q && /^\$\d+$/.test(q.w) && /^,\d+/.test(w.w)) out[out.length - 1] = { ...q, w: q.w + w.w, e: w.e }; else out.push({ ...w }); } return out; };
export const WORDS = merge(words as Word[]);
export type { V3 };
export { smooth, clamp01 };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const mix = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const win = (t: number, a: number, b: number, i = 0.25, o = 0.3) => smooth(a, a + i, t) * (1 - smooth(b, b + o, t));
export const FX = 60;
export const F = (x: number, y: number, z: number): V3 => [FX + x, y, z];
const FP = (p: Pose): Pose => ({ ...p, pos: [p.pos[0] + FX, p.pos[1], p.pos[2]], look: [p.look[0] + FX, p.look[1], p.look[2]] });

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
// the security monitor on the CEO's desk (object transition): screen centre, size; it faces -z (toward his chair)
export const MON = { x: -4.76, y: 0.63, z: -0.9, w: 0.2, h: 0.356 };      // a tall (9:16) screen, so the whole picture fits
export const MON_CORNERS: V3[] = [[MON.x + MON.w / 2, MON.y + MON.h / 2, MON.z - 0.021], [MON.x - MON.w / 2, MON.y + MON.h / 2, MON.z - 0.021],
  [MON.x - MON.w / 2, MON.y - MON.h / 2, MON.z - 0.021], [MON.x + MON.w / 2, MON.y - MON.h / 2, MON.z - 0.021]];   // TL, TR, BR, BL seen from his chair
// the note in his hands, and where he puts it down on the desk (next to the cash)
export const NOTE: V3 = [-5.3, 0.5, -1.32];                          // held low at his right side, its text toward him
export const NOTE_DESK: V3 = [-5.25, 0.401, -0.92], CASH_DESK: V3 = [-4.48, 0.425, -0.93];

// ---------------- time of every beat (s, from words.json) ----------------
export const T = {
  // Max arrives
  maxApp: 5.6, maxTurn: 6.75, maxInside: 10.6,
  // Ava at the counter and back
  avaUp: 35.15, avaGo: 35.5, avaAt: 37.05, cash: 36.95, write: 38.2, writeEnd: 39.05, slide: 39.4, point: 39.75, avaBack: 40.75, avaHome: 42.3, avaSat: 42.75,
  // the teller takes the note to the boss
  tinaTake: 40.2, tinaGo: 40.45, tinaKnock: 42.75, tinaIn: 43.0, tinaHand: 43.4, tinaOut: 43.95,
  // the CEO in his office (object transition at 43.75), then in the hall
  bagPick: 44.25, maxUp: 44.2, maxWalk: 44.55, maxHall: 45.7, arrive: 47.35, bagDown: 47.42, pantsDown: 47.66, pantsDownEnd: 48.02,
  pantsUp: 48.82, pantsUpEnd: 49.22, bagUp: 49.6, maxOut: 49.95,
  // payoff
  pay: 55.45, avaTake: 56.55,
};
const AVA_SIT: V3 = [AVA_X, 0, ROW_Z], AVA_STAND: V3 = [AVA_X, 0, STAND_Z];
const avaWalk1 = makePath([{ t0: T.avaGo, t1: T.avaAt, from: AVA_STAND, to: AVA_COUNTER }]);
const avaWalk2 = makePath([{ t0: T.avaBack, t1: T.avaHome, from: AVA_COUNTER, to: AVA_STAND }]);
const MAX_ST: V3 = [5.4, 0, 1.5], MAX_TURN: V3 = [4.55, 0, LANE_Z];             // along the pavement, then in through the doors
// in through the doors and on through his own door in ONE piece (no stop at his door: a stop flips the card front/back)
const MAX_IN: V3 = [-4.5, 0, LANE_Z];                                          // inside his office, clear of the desk and the door leaf
const maxWalk1 = makePath([{ t0: T.maxApp, t1: T.maxTurn, from: MAX_ST, to: MAX_TURN }, { t0: T.maxTurn, t1: T.maxInside, from: MAX_TURN, to: MAX_IN }]);
// from his chair round the desk, out of his door, strolling into the middle of the waiting area
const maxWalk2 = makePath([{ t0: T.maxWalk, t1: 44.95, from: [-5.05, 0, -1.62], to: [-4.15, 0, -1.6] }, { t0: 44.95, t1: 45.25, from: [-4.15, 0, -1.6], to: [-4.0, 0, LANE_Z] },
  { t0: 45.25, t1: T.arrive, from: [-4.0, 0, LANE_Z], to: CENTRE }]);                          // out of his door and on into the middle in ONE stroll
const maxWalk3 = makePath([{ t0: T.maxOut, t1: 51.3, from: CENTRE, to: [3.0, 0, LANE_Z] }, { t0: 51.3, t1: 52.4, from: [3.0, 0, LANE_Z], to: [4.6, 0, LANE_Z] }]);
const tinaWalk = makePath([
  { t0: T.tinaGo, t1: 41.55, from: TINA_HOME, to: [-3.15, 0, -3.3] }, { t0: 41.55, t1: 42.15, from: [-3.15, 0, -3.3], to: [-3.15, 0, -2.2] },
  { t0: 42.15, t1: T.tinaKnock, from: [-3.15, 0, -2.2], to: [-2.95, 0, -1.0] }, { t0: T.tinaIn, t1: 43.35, from: [-2.95, 0, -1.0], to: [-4.15, 0, -1.0] },
  // hands the note over, then back out and to her window
  { t0: T.tinaOut, t1: 44.5, from: [-4.15, 0, -1.0], to: [-2.95, 0, LANE_Z] }, { t0: 44.5, t1: 45.5, from: [-2.95, 0, LANE_Z], to: [-3.15, 0, -2.2] },
  { t0: 45.5, t1: 46.1, from: [-3.15, 0, -2.2], to: [-3.15, 0, -3.3] }, { t0: 46.1, t1: 47.1, from: [-3.15, 0, -3.3], to: TINA_HOME },
]);

export type Who = "ava" | "arian" | "max" | "tina" | "cop" | "nora" | "omar";
export type Body = { pos: V3; facing: 1 | -1; sit: number; walk: WalkState | null; show: boolean; lean: number; squash: number };
const still = (pos: V3, facing: 1 | -1, sit = 0): Body => ({ pos, facing, sit, walk: null, show: true, lean: 0, squash: 1 });
const walking = (w: WalkState, facing: 1 | -1): Body => ({ pos: w.pos, facing, sit: 0, walk: w, show: true, lean: 0, squash: 1 });
// a laugh: alternating squash (bob) for a short while
const laugh = (t: number, a: number, b: number) => 1 - 0.035 * win(t, a, b, 0.1, 0.2) * Math.abs(Math.sin((t - a) * 17));

export const bodyAt: Record<Who, (t: number) => Body> = {
  ava: (t) => {
    if (t < T.avaUp) return { ...still(AVA_SIT, -1, 1), squash: laugh(t, 47.75, 48.6) };
    if (t < T.avaGo) { const k = smooth(T.avaUp, T.avaGo, t); return still(mix(AVA_SIT, AVA_STAND, k), -1, 1 - k); }
    if (t < T.avaBack) return walking(avaWalk1.at(t), -1);
    if (t < T.avaHome + 0.05) return walking(avaWalk2.at(t), 1);
    if (t < T.avaSat) { const k = smooth(T.avaHome + 0.05, T.avaSat, t); return still(mix(AVA_STAND, AVA_SIT, k), -1, k); }
    return { ...still(AVA_SIT, -1, 1), squash: laugh(t, 47.75, 48.6) * laugh(t, 57.1, 57.9) };
  },
  arian: (t) => ({ ...still([ARIAN_X, 0, ROW_Z], -1, 1), squash: laugh(t, 20.6, 21.35) }),
  omar: (t) => ({ ...still([OMAR_X, 0, ROW_Z], -1, 1), squash: laugh(t, 48.0, 48.9) }),
  nora: (t) => still([2.5, 0, 2.6], t < 47.6 ? 1 : -1),
  cop: () => still([2.85, 0, 0.0], -1),
  tina: (t) => {
    if (t < T.tinaGo) return still(TINA_HOME, 1);
    if (t < T.tinaIn) return walking(tinaWalk.at(t), 1);
    if (t < T.tinaOut) { const w = tinaWalk.at(t); return w.k > 0.01 ? walking(w, 1) : still(w.pos, 1); }
    if (t < 47.1) return walking(tinaWalk.at(t), 1);
    return still(TINA_HOME, 1);
  },
  max: (t) => {
    if (t < T.maxApp) return { ...still(MAX_ST, -1), show: false };
    if (t < T.maxInside) return walking(maxWalk1.at(t), t > 10.2 ? 1 : -1);   // facing only counts while he slows down inside: +z keeps his back to us
    if (t < T.maxUp) return still(MAX_SEAT, 1, 1);
    if (t < T.maxWalk) { const k = smooth(T.maxUp, T.maxWalk, t); return still(mix(MAX_SEAT, [-5.05, 0, -1.62], k), 1, 1 - k); }
    if (t < T.arrive) return walking(maxWalk2.at(t), -1);
    if (t < T.maxOut) {                                // a little crouch while the trousers go down and come up, and for the briefcase
      const dn = smooth(T.pantsDown - 0.25, T.pantsDown, t) * (1 - smooth(T.pantsDownEnd, T.pantsDownEnd + 0.2, t));
      const up = smooth(T.pantsUp - 0.05, T.pantsUp + 0.15, t) * (1 - smooth(T.pantsUpEnd - 0.1, T.pantsUpEnd + 0.15, t));
      const bag = Math.max(win(t, T.bagDown - 0.25, T.bagDown + 0.05, 0.2, 0.2), win(t, T.bagUp - 0.3, T.bagUp + 0.05, 0.25, 0.25));
      return { ...still(CENTRE, -1), squash: 1 - 0.09 * dn - 0.1 * up - 0.12 * bag + 0.06 * smooth(T.pantsUpEnd, T.pantsUpEnd + 0.1, t) * (1 - smooth(T.pantsUpEnd + 0.1, T.pantsUpEnd + 0.3, t)) };
    }
    if (t < 52.4) return walking(maxWalk3.at(t), -1);
    return { ...still([4.6, 0, LANE_Z], -1), show: false };
  },
};
export const pantsDropAt = (t: number) => smooth(T.pantsDown, T.pantsDownEnd, t) * (1 - smooth(T.pantsUp, T.pantsUpEnd, t));
// doors: 0 = shut, 1 = open
export const ceoDoorAt = (t: number) => Math.max(smooth(9.3, 9.7, t) * (1 - smooth(10.45, 10.85, t)), smooth(42.85, 43.15, t) * (1 - smooth(46.2, 46.6, t)));
export const entranceAt = (t: number) => Math.max(smooth(6.6, 7.0, t) * (1 - smooth(8.4, 9.0, t)), smooth(50.85, 51.25, t));

// ---------------- camera: one short path per shot, eased ends, slow creep after each move ----------------
export type Space = "hall" | "office" | "fantasy";
type Shot = EShot & { space: Space };
const XF = 0.3;
const MOON: V3 = F(0, 9, -20);
export { MOON };
const AVA_CLOSE = P([-0.32, 0.82, -0.62], [-0.3, 0.74, 0.9], 30, 8);
const AVA_MED = P([-0.72, 0.94, -1.9], [-0.22, 0.68, 0.9], 38, 6);
const HIGHROW = P([0.55, 1.42, -3.3], [0.1, 0.55, 0.4], 44, 2);       // wide of the waiting row from above the counter
const ENTR = P([1.9, 0.92, LANE_Z], [4.3, 0.8, LANE_Z], 46, 2);           // just inside the glass doors, straight out through them
export const TWO = P([0.0, 0.98, -2.45], MID, 38, 5);                   // front two-shot of Ava and Arian
// the talking: one camera in front of them that glides to whoever speaks (never side-on: no squeezed people)
const AVA_TALK = P([-0.44, 0.94, -1.62], [-0.33, 0.74, 0.9], 34, 7);
const ARIAN_TALK = P([0.44, 0.93, -1.62], [0.33, 0.74, 0.9], 34, 7);
const AVA_TALK2 = P([-0.56, 0.9, -1.74], [-0.31, 0.72, 0.9], 35, 7);
const ARIAN_LAUGH = P([0.4, 0.95, -1.78], [0.3, 0.73, 0.9], 36, 7);
const TWO2 = P([0.02, 0.96, -2.15], [0.0, 0.68, 0.9], 38, 5);
const WAIT_A = P([-0.36, 0.84, -1.18], [-0.31, 0.76, 0.9], 30, 8, 4);   // "Wait, why is she so sure?" push in on her, tilted
// the fantasy frame: Arian alone, sitting, room in front of him for the props. The camera does NOT move here.
export const FANT_H = P([0.3, 0.8, -1.12], [0.3, 0.6, 0.9], 40, 4);
export const FANT_F = FP(FANT_H);
export const HEAD_R: V3 = [ARIAN_X, HEAD_SIT, ROW_Z];
// her turn: from behind the chairs (the board shows 33), then over her shoulder at the counter
const BEHIND = P([0.9, 1.7, 2.95], [-0.9, 1.3, -2.8], 44, 3);
const OTS_T = P([0.03, 1.02, -1.02], [-0.6, 0.78, -3.3], 34, 8);
const WRITE = P([-0.16, 1.06, -2.0], [-0.4, 0.5, -2.74], 32, 8);
const OTS_T2 = P([0.42, 1.08, -0.82], [-0.82, 0.76, -3.0], 38, 6);
// the security camera: high in the back right corner, over the counter, onto the waiting row
export const CCTV = P([3.0, 2.24, -4.12], [-0.2, 0.42, 0.75], 46, 0);
// the CEO's office, behind him: his back, the monitor on the desk beyond his shoulder
const OTS_M = P([-4.42, 1.42, -2.5], [-4.93, 0.6, -1.12], 50, 4);
const DOORVIEW = P([-0.7, 0.95, -1.4], [-3.4, 0.76, LANE_Z], 40, 2);    // in the hall, his door fills the frame
const HIGH = P([0.35, 1.9, -3.55], [0.0, 0.35, -0.9], 50, 2);           // high view over the counter into the waiting area
const NOTE_TOP = P([-5.27, 1.2, -1.42], [-5.25, 0.4, -0.92], 34, 6);
const NOTE_TOP2 = P([-5.26, 1.02, -1.27], [-5.25, 0.4, -0.93], 34, 7);
const PAY = P([0.05, 0.98, -2.05], [0.0, 0.66, 0.85], 38, 6);
const PAY_END = P([-0.24, 0.86, -1.22], [-0.18, 0.72, 0.9], 32, 8);

export const SHOTS: Shot[] = [
  // "An old lady bets $5,000 ..." close on Ava (smug), she holds up her hand, coins pop over it; the camera pulls back
  { t: 0, space: "hall", from: AVA_CLOSE, to: AVA_CLOSE, move: 0, creep: -0.05, noRamp: true },
  { t: 0.4, space: "hall", move: 1.4, to: AVA_MED, creep: 0.03 },
  // "... that a bank CEO will drop his pants." rising back and up: the whole bank
  { t: 2.7, space: "hall", move: 2.0, to: HIGHROW, creep: 0.03 },
  // "She's waiting with number 33" the waiting row; "when the CEO walks in" fly to the glass doors, they open
  { t: 6.05, space: "hall", move: 1.05, to: ENTR },
  // "and heads straight to his office." it backs away in front of him (lead below), then slides round to the two of them
  { t: 10.65, space: "hall", from: TWO, to: TWO, move: 0, creep: 0.02 },
  // ONE camera for the talking, gliding to whoever speaks:
  //   "you a betting guy?" Ava
  { t: 11.75, space: "hall", move: 0.75, to: AVA_TALK, creep: 0.02 },
  //   "It depends, he says." Arian
  { t: 13.3, space: "hall", move: 0.6, to: ARIAN_TALK, creep: 0.02 },
  //   "When the CEO steps out, I bet $5,000 he takes his pants off." Ava
  { t: 15.2, space: "hall", move: 0.65, to: AVA_TALK2, creep: 0.02 },
  //   "The guy laughs. Easy money!" Arian
  { t: 19.95, space: "hall", move: 0.7, to: ARIAN_LAUGH, creep: 0.02 },
  //   "He says yes without a second thought." both: the handshake
  { t: 22.65, space: "hall", move: 0.95, to: TWO2, creep: 0.03 },
  // "Wait, why is she so sure?" push in on her smug face with a tilt, then glide to Arian and STOP
  { t: 25.3, space: "hall", move: 0.9, to: WAIT_A, creep: 0.02 },
  { t: 26.5, space: "hall", move: 1.0, to: FANT_H, creep: 0 },
  // "You see, ..." the fantasy grows out of his head in a soft circle; the bank (and his chair) is gone, only Arian stays
  { t: 27.6, space: "fantasy", from: FANT_F, to: FANT_F, move: 0, creep: 0, dissolve: 0.65, wipe: F(...HEAD_R), wipeGlow: "rgba(255,150,235,0.9)" },
  // "... A sure thing never does." the bank grows back round him the same way
  { t: 34.3, space: "hall", from: FANT_H, to: FANT_H, move: 0, creep: 0, dissolve: 0.6, wipe: HEAD_R, wipeGlow: "rgba(255,230,170,0.8)" },
  // "Her turn comes." behind the chairs: the board flips to 33, she gets up and goes to the counter
  { t: 34.97, space: "hall", dissolve: XF, from: BEHIND, to: BEHIND, move: 0, creep: 0.05 },
  { t: 35.6, space: "hall", move: 1.5, via: [0.5, 1.62, 0.6], to: OTS_T, creep: 0.03 },
  // "writes a note," her pen on the counter
  { t: 37.85, space: "hall", move: 0.6, to: WRITE, creep: 0.02 },
  // "and sends it to the boss." she slides it to the teller and points to his office
  { t: 39.1, space: "hall", move: 0.75, to: OTS_T2, creep: 0.02 },
  // "Then she sits back down next to the guy and waits." the security camera, high in the corner
  { t: 40.95, space: "hall", dissolve: 0.35, from: CCTV, to: CCTV, move: 0, creep: 0.015 },
  // OBJECT TRANSITION: that picture shrinks into the monitor on the CEO's desk ("A minute later,")
  { t: 43.7, space: "office", from: OTS_M, to: OTS_M, move: 0, creep: 0.03, collapse: { dur: 0.62, hold: 0.62 } },
  // "the CEO strolls into the waiting area," in the hall: his door, he comes out, the camera backs away in front of him (lead2)
  { t: 44.95, space: "hall", dissolve: 0.35, from: DOORVIEW, to: DOORVIEW, move: 0, creep: 0.03 },
  // "drops his pants, pulls them back up," high over the counter: him in the middle, the row behind him
  { t: 47.4, space: "hall", from: HIGH, to: HIGH, move: 0, creep: 0.05 },
  // "and leaves." behind him to the doors (follow below)
  { t: 49.95, space: "hall", move: 0.9, to: P([-1.2, 1.0, -1.25], [2.0, 0.7, LANE_Z], 44, 2) },
  // "The note said, ..." the glass door becomes the note on his desk; the words appear as they are spoken
  { t: 50.95, space: "office", dissolve: 0.35, from: NOTE_TOP, to: NOTE_TOP, move: 0 },
  { t: 51.4, space: "office", move: 3.6, to: NOTE_TOP2, creep: 0.01 },
  // "She spent $2,500 to win $5,000." back in the hall: Arian pays up, she fans the cash; slow push to her grin
  { t: 55.15, space: "hall", dissolve: 0.35, from: PAY, to: PAY, move: 0 },
  { t: 55.6, space: "hall", move: 3.7, to: PAY_END, creep: 0.02 },
];
export const KICKS: [number, number][] = [[25.47, 0.5], [47.9, 1.1]];
const CAM = makeCamera(SHOTS, DURATION, { kicks: KICKS });
// 7.1-10.65: the camera backs away in front of the CEO (2.35 m ahead), then stops aside on the counter side and lets him
// walk PAST it: his face, then (one flip, as he passes) his back while he goes through his door. Seen from there his flat card fits
// the doorway and never cuts into the wall (from the side it stuck diagonally through the door frame). Then it turns to Ava and Arian.
const PASS: V3 = [-1.7, 1.12, -2.5];                                   // near head height: a high camera tilts his card back about his feet and pushes his head into the door frame
const lead = (c: CamState, t: number): CamState => {
  if (t < 7.1 || t >= 10.65) return c;
  const m = bodyAt.max(Math.min(t, 10.2)).pos;
  const ahead: V3 = [Math.max(-2.9, Math.min(ENTR.pos[0], m[0] - 2.35)), 0.92, LANE_Z];
  const kk = smooth(7.1, 7.6, t);                                       // ease from the door shot into following him
  const b = smoother((t - 8.2) / 1.0), cc = smoother((t - 9.85) / 0.8);
  let pos = mix(ahead, PASS, b);                                        // slows down from moving with him to the still point
  if (t > 9.85) pos = mix(PASS, TWO.pos, cc);
  const look = mix([m[0] - 0.3 * b, 0.74, m[2]], TWO.look, cc);         // a little ahead of him (toward his door) once he passes
  const fov = lerp(ENTR.fov, 48, b) + (TWO.fov - 48) * cc;
  return { ...c, pos: mix(c.pos, pos, kk), look: mix(c.look, look, kk), fov: lerp(c.fov, fov, kk), blur: lerp(ENTR.blur, TWO.blur, cc) };
};
// 45.85-47.4: he strolls out of his door; the camera backs away in front of him, then rises to the high view
const lead2 = (c: CamState, t: number): CamState => {
  if (t < 45.85 || t >= 47.4 || c.space !== "hall") return c;
  const m = bodyAt.max(t).pos, k = smooth(46.35, 47.4, t), kk = smooth(45.85, 46.35, t);
  const ahead: V3 = [m[0] + 2.75, 1.02, m[2] - 0.8], look: V3 = [m[0], 0.76, m[2]];
  return { ...c, pos: mix(mix(c.pos, ahead, kk), HIGH.pos, k), look: mix(mix(c.look, look, kk), HIGH.look, k), fov: lerp(lerp(c.fov, 46, kk), HIGH.fov, k), blur: lerp(c.blur, HIGH.blur, k) };
};
// 49.95-50.95: behind him while he walks to the doors
const follow = (c: CamState, t: number): CamState => {
  const w = smooth(49.95, 50.5, t);
  if (w <= 0 || c.space !== "hall" || t > 51.4) return c;
  const m = bodyAt.max(t).pos;
  return { ...c, pos: mix(c.pos, [m[0] - 1.45, 1.0, m[2] - 0.25], w), look: mix(c.look, [m[0] + 1.5, 0.66, LANE_Z], w) };
};
const fix = (c: CamState, t: number) => follow(lead2(lead(c, t), t), t);
export const camAt = (t: number) => fix(CAM.camAt(t), t) as CamState & { space: Space };
export const dissolveAt = (t: number) => { const d = CAM.dissolveAt(t); return d ? { ...d, out: fix(d.out, t) } : null; };
export const collapseAt = (t: number) => CAM.collapseAt(t);
export const whiteAt = makeWhite([]);
export const fantasyOn = (t: number) => t > 27.5 && t < 35.0;

// ---------------- faces ----------------
// drawn faces (Arian, Max, Ava, Tina, Nora): [{ t, e, look }]; e = neutral smile smug happy strain angry stressed sad scared
// surprised confused (content / satisfied CLOSE the eyes: not used here, he saw "eyes closed in most frames"); look -1 = to the viewer's left, +1 right. In the front shots Ava is on the right, Arian on the left.
const K = (t: number, e: string, look = 0): FaceKey => ({ t, e, look });
export const DRAWN: Partial<Record<Who | "dream", FaceKey[]>> = {
  ava: [K(0, "smug"), K(0.85, "happy"), K(2.1, "smug"), K(5.1, "neutral"), K(7.6, "neutral", 1), K(9.4, "neutral"), K(10.4, "smile", -1), K(11.85, "smug", -1),
    K(13.5, "neutral", -1), K(14.9, "smile", -1), K(15.8, "smug", 1), K(17.3, "happy", -1), K(19.2, "smug", -1), K(20.7, "smile", -1), K(23.1, "happy", -1),
    K(24.6, "smug"), K(25.5, "smug", -1), K(34.9, "neutral"), K(35.15, "smile"), K(37.1, "happy"), K(38.1, "neutral"), K(39.4, "smug"), K(40.9, "smile"),
    K(42.8, "smug", -1), K(43.6, "smug"), K(47.7, "happy"), K(49.3, "smug"), K(50.2, "smile"), K(55.3, "smug", -1), K(56.55, "happy"), K(57.9, "happy", 1), K(58.4, "happy")],
  arian: [K(0, "neutral"), K(5.1, "neutral"), K(7.7, "neutral", 1), K(9.5, "neutral"), K(10.5, "neutral", 1), K(12.6, "surprised", 1), K(13.5, "smug"), K(14.95, "neutral", 1),
    K(16.3, "confused", 1), K(17.9, "surprised", 1), K(19.4, "surprised"), K(20.6, "happy"), K(21.85, "smug"), K(23.1, "happy", 1), K(24.5, "smile"), K(25.6, "confused", 1),
    K(27.0, "neutral"), K(28.4, "smile", -1), K(29.1, "smile", 1), K(29.8, "neutral"), K(30.6, "stressed"), K(31.5, "scared", -1), K(32.75, "surprised"), K(33.35, "happy"), K(34.0, "smug"), K(34.6, "neutral"),
    K(36.0, "neutral"), K(41.2, "neutral", 1), K(43.0, "smile", 1), K(43.8, "neutral"), K(47.7, "surprised"), K(48.6, "scared"), K(49.8, "confused"), K(50.6, "neutral"),
    K(55.3, "sad", 1), K(56.7, "stressed", 1), K(58.2, "sad")],
  max: [K(0, "neutral"), K(7.3, "smug"), K(9.0, "neutral"), K(43.7, "neutral"), K(44.25, "smile"), K(44.75, "happy"), K(45.9, "smile"), K(47.3, "smug"),
    K(47.7, "happy"), K(48.6, "smug"), K(49.3, "smile"), K(50.1, "happy")],
  tina: [K(0, "neutral"), K(37.0, "happy"), K(38.2, "neutral"), K(39.5, "confused"), K(40.15, "surprised"), K(40.6, "neutral"), K(43.3, "smile"), K(44.0, "neutral"), K(47.7, "surprised"), K(49.3, "neutral")],
  nora: [K(0, "neutral"), K(7.7, "smile"), K(9.0, "neutral"), K(47.7, "surprised"), K(49.4, "happy")],
};
DRAWN.dream = DRAWN.arian;                                               // the fantasy Arian IS Arian (same face, same moment)
// picture faces (the cop has sunglasses, Omar a beard: they keep their drawn pictures)
const FACES: Record<Who | "dream", FaceEv[]> = {
  ava: [[0, "neutral"]], arian: [[0, "neutral"]], dream: [[0, "neutral"]], max: [[0, "neutral"]], tina: [[0, "neutral"]], nora: [[0, "neutral"]],
  cop: [[0, "neutral"], [7.6, "grin"], [9.0, "neutral"], [47.7, "shock"], [49.3, "smug"], [50.4, "grin"]],
  omar: [[0, "neutral"], [7.8, "smug"], [9.2, "neutral"], [47.7, "shock"], [48.2, "grin"], [50.0, "neutral"]],
};
const SWEAT: Partial<Record<Who | "dream", [number, number][]>> = {
  arian: [[30.8, 32.5], [47.85, 50.0], [55.35, 57.8]], dream: [[30.8, 32.5]], tina: [[40.15, 40.8]],
};
export const LIFE = Object.fromEntries(Object.keys(FACES).map((k) => [k, makeLife(FACES[k as Who], SWEAT[k as Who] ?? [])])) as Record<Who | "dream", Life>;
export const SEED: Record<Who | "dream", number> = { ava: 0.4, arian: 1.7, max: 2.9, tina: 3.6, cop: 4.4, nora: 5.3, omar: 6.1, dream: 1.7 };

// ---------------- talking: mouth shapes from the spoken words (lips move in real time) ----------------
// shapes: 0 closed, 1 a little open, 2 open, 3 wide open, 4 round, 5 wide with teeth
const SAY: Record<string, string> = { "$5,000": "fivethousand", ceo: "seeeeoh", "guy?": "gai", you: "yoo", a: "a" };
const shapesOf = (word: string): number[] => {
  const w = SAY[word.toLowerCase()] ?? word.toLowerCase().replace(/[^a-z]/g, ""), out: number[] = [];
  for (const ch of w) {
    const s = "a".includes(ch) ? 3 : "ei y".includes(ch) ? 5 : ch === "o" ? 2 : "uw".includes(ch) ? 4 : "mbp".includes(ch) ? 0 : 1;
    if (out[out.length - 1] !== s) out.push(s);
  }
  return out.length ? out : [1];
};
// spoken lines [from, to] in seconds: Ava "you a betting guy?", Arian "It depends,", Ava "When the CEO steps out, ...", Arian "Easy money!"
const LINES: { who: Who; a: number; b: number }[] = [{ who: "ava", a: 12.55, b: 13.4 }, { who: "arian", a: 13.83, b: 14.42 }, { who: "ava", a: 15.75, b: 20.15 }, { who: "arian", a: 21.83, b: 22.62 }];
export const talkAt = (who: Who, t: number): number => {
  for (const L of LINES) {
    if (L.who !== who || t < L.a || t > L.b + 0.08) continue;
    for (const w of WORDS) {
      if (w.s < L.a - 0.05 || w.e > L.b + 0.05) continue;
      const e = Math.max(w.e, w.s + 0.12);
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

// ---------------- captions: ONE word at a time (like the reference), swapped exactly on the word ----------------
export const CAPS: Cap[] = (() => {
  const out: Cap[] = WORDS.map((w) => ({ a: w.s, b: w.e, text: w.w }));
  for (let i = 0; i < out.length; i++) out[i].b = Math.max(out[i].b, Math.min(out[i + 1]?.a ?? out[i].b + 0.4, out[i].b + 0.35));
  return out;
})();

// ---------------- prop timings ----------------
export const BOARD_FLIP = 35.12;
export const COINS = { a: 0.95, step: 0.15, b: 2.35 };                  // over Ava's raised hand: "bets $5,000"
export const COINS2 = { a: 17.72, step: 0.12, b: 18.95 };               // "I bet $5,000"
export const SHAKE = { a: 23.55, b: 24.95 };                             // the handshake: "He says yes without a second thought."
export const DICE_GLINT = { a: 10.95, b: 11.75 };                        // "the guy beside her"
// the note on the desk: how many of its 6 lines show at each moment (the words appear as they are spoken)
export const NOTE_LINES: [number, number][] = [[0, 0], [52.06, 1], [52.46, 2], [53.08, 3], [53.4, 4], [54.1, 5], [54.6, 6]];
export const noteLinesAt = (t: number) => { let n = 0; for (const [a, k] of NOTE_LINES) if (t >= a) n = k; return n; };
// the fantasy: a coin teeters on its edge on a little side table ("A maybe makes you hesitate."), turns gold ("A sure thing"), he slaps the cash down ("never")
export const STAND: V3 = F(0.52, 0, 0.7);      // the side table at his right (screen left), so his whole body stays in view
export const DREAM = { dice: 28.45, coin: 30.55, gold: 32.75, cash: 30.65, slam: 33.42, out: 34.2 };
// effects (fx.ts)
export const FXS: FxEvent[] = [
  { kind: "sparkle", t: 21.9, at: [0.12, 1.02, 0.86], size: 0.22 },          // "Easy money!"
  { kind: "sparkle", t: 22.2, at: [0.5, 0.94, 0.84], size: 0.18, seed: 2 },
  { kind: "sparkle", t: 35.14, at: [BOARD[0], BOARD[1], BOARD[2] + 0.12], size: 0.6 },   // the board flips to 33
  { kind: "notes", t: 45.8, dur: 1.6, at: (t) => { const m = bodyAt.max(t).pos; return [m[0], 1.12, m[2]]; }, size: 0.2 },   // he whistles while he strolls
  { kind: "burst", t: 47.9, at: [0.0, 0.2, -1.36], size: 0.26 },             // the trousers hit the floor
  { kind: "dust", t: 47.95, at: [0.0, 0.03, -1.3], size: 0.24 },
  { kind: "burst", t: DREAM.slam, at: F(0.64, 0.36, 0.7), size: 0.26 },       // the slap in the fantasy
  { kind: "sparkle", t: DREAM.gold, at: F(0.66, 0.5, 0.76), size: 0.28 },
  { kind: "sparkle", t: 58.35, at: [-0.18, 0.66, 0.66], size: 0.3 },         // "$5,000": the last word
  { kind: "sparkle", t: 58.6, at: [-0.44, 0.78, 0.7], size: 0.22, seed: 3 },
];

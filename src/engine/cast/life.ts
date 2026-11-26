// Faces and sweat over time for one character. Each face change fades over FACE_FADE seconds (no one-frame jumps).
import { smooth } from "../core/util";

export type Face = "neutral" | "smug" | "shock" | "grin";      // the face pictures in library/cast/<name>/faces/
export const FACE_LIST: Face[] = ["neutral", "smug", "shock", "grin"];
export type FaceEv = [number, Face];                            // [time (s), face]
export type FaceMix = { from: Face; to: Face; k: number };
export type Life = { face: (t: number) => FaceMix; sweat: (t: number) => number };

const FACE_FADE = 0.2;

// faces: [[0, "neutral"], [2.5, "smug"], ...]   sweat: [[start, end], ...] (blue drops on stressful beats)
export function makeLife(faces: FaceEv[], sweat: [number, number][] = []): Life {
  const L = faces.length ? faces : [[0, "neutral"] as FaceEv];
  return {
    face: (t) => {
      let i = 0;
      while (i + 1 < L.length && L[i + 1][0] <= t) i++;
      const [s, f] = L[i], prev = i > 0 ? L[i - 1][1] : f;
      const k = smooth(s, s + FACE_FADE, t);
      return k >= 1 || prev === f ? { from: f, to: f, k: 1 } : { from: prev, to: f, k };
    },
    sweat: (t) => {
      let k = 0;
      for (const [a, b] of sweat) k = Math.max(k, smooth(a, a + 0.15, t) * (1 - smooth(b - 0.2, b, t)));
      return k;
    },
  };
}

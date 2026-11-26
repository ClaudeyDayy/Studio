// Talking mouths from the voice timing (moved here from bank2/story.ts so every video can use it, 2026-11-11).
//   const talkAt = makeTalk(WORDS, [{ who: "arian", a: 1.2, b: 2.4, to: "max" }, ...]);      // who says which part (seconds), and to whom
//   new Player3D(..., { talk: (t) => talkAt("arian", t) })
// HOUSE 2026-11-14 (his request): the lips should LOOK like the word, not be exact. Each word is read as sounds, not letters:
//   0 closed (m b p)   1 a little open (t d n s k g l r ...)   2 o   3 wide open (a)   4 round, small (oo u w)   5 teeth (ee i e, f v, th s-h ch)
// Vowels are held about twice as long as consonants, a silent end "e" is dropped, and every word ends closed if there is a gap.
//   say: { "one": "wun", "people": "peepul" }  spells a word the way it sounds when the letters mislead.
// EYES: makeTalkEyes(lines) says who each person should look at while a line is spoken (speaker <-> listener):
//   const eyesAt = makeTalkEyes(LINES);   world.update:  const who = eyesAt("arian", t);  p.lookEyes(who ? people[who].eyePoint : null, k)
import type { Word } from "./captions";
import { smooth } from "./util";

export type Line = { who: string; a: number; b: number; to?: string };
const PAIRS: [string, number, number][] = [   // sounds written with two letters: [letters, mouth shape, length]
  ["oo", 4, 2], ["ou", 3, 2], ["ow", 3, 2], ["ee", 5, 2], ["ea", 5, 2], ["ai", 3, 2], ["ay", 3, 2], ["oa", 2, 2], ["oi", 2, 2], ["oy", 2, 2],
  ["th", 5, 1], ["sh", 4, 1], ["ch", 4, 1], ["wh", 4, 1], ["ph", 5, 1], ["ck", 1, 1], ["ng", 1, 1],
];
const ONE: Record<string, [number, number]> = { a: [3, 2], e: [5, 2], i: [5, 2], o: [2, 2], u: [4, 2], y: [5, 1], w: [4, 1], m: [0, 1], b: [0, 1], p: [0, 1], f: [5, 1], v: [5, 1] };
export function soundsOf(word: string, say: Record<string, string> = {}): [number, number][] {
  let w = say[word.toLowerCase()] ?? word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length > 3 && w.endsWith("e") && !/[aeiou]/.test(w[w.length - 2])) w = w.slice(0, -1);   // silent e: "made", "time"
  const out: [number, number][] = [];
  for (let i = 0; i < w.length; ) {
    const two = PAIRS.find((p) => w.startsWith(p[0], i)), s: [number, number] = two ? [two[1], two[2]] : ONE[w[i]] ?? [1, 1];
    i += two ? 2 : 1;
    const last = out[out.length - 1];
    if (last && last[0] === s[0]) last[1] = Math.max(last[1], s[1]); else out.push([s[0], s[1]]);
  }
  return out.length ? out : [[1, 1]];
}
export function makeTalk(words: Word[], lines: Line[], say: Record<string, string> = {}) {
  return (who: string, t: number): number => {
    for (const L of lines) {
      if (L.who !== who || t < L.a || t > L.b + 0.08) continue;
      for (const w of words) {
        if (w.s < L.a - 0.05 || w.e > L.b + 0.05) continue;
        const e = Math.max(w.e, w.s + 0.12);
        if (t >= w.s && t < e) {
          let sh = soundsOf(w.w, say);
          const n = Math.max(1, Math.round((e - w.s) / 0.07));              // a mouth shape needs about 2 frames to be seen
          while (sh.length > n) {                                            // too many sounds for a short word: drop the shortest consonants first
            let k = -1; for (let i = sh.length - 1; i >= 0; i--) if (sh[i][1] === 1 && sh[i][0] !== 0) { k = i; break; }
            sh.splice(k < 0 ? sh.length - 1 : k, 1);
          }
          const total = sh.reduce((a, s) => a + s[1], 0); let u = ((t - w.s) / (e - w.s)) * total;
          for (const s of sh) { if (u < s[1]) return s[0]; u -= s[1]; }
          return sh[sh.length - 1][0];
        }
      }
      return 0;                                             // a gap between two words of the line: closed
    }
    return -1;                                              // not talking
  };
}
/** Who should `who` look at, at time t? During a spoken line (from 0.2 s before to 0.3 s after) the speaker looks at `to`
 *  (or at the speaker of the nearest other line) and everybody else looks at the speaker. Returns [name, strength 0..1] or null. */
export function makeTalkEyes(lines: Line[], lead = 0.2, tail = 0.3) {
  const partner = (L: Line) => L.to ?? [...lines].sort((x, y) => Math.abs(x.a - L.a) - Math.abs(y.a - L.a)).find((x) => x.who !== L.who)?.who ?? null;
  return (who: string, t: number): [string, number] | null => {
    for (const L of lines) {
      if (t < L.a - lead || t > L.b + tail) continue;
      const k = smooth(L.a - lead, L.a, t) * (1 - smooth(L.b, L.b + tail, t));
      if (L.who === who) { const p = partner(L); return p ? [p, k] : null; }
      if (!L.to || L.to === who) return [L.who, k];
    }
    return null;
  };
}

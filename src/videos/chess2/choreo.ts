// Who moves which piece, with which hand, when. A piece only moves while its owner's hand carries it,
// and its base is always exactly under the dot hand (skill 6.10). Everything is back home before the loop.
import { V3, smooth, F } from "./story";
import { HGT, HOMES, kindOf, pieceId } from "./kit";
import { HAND_R } from "../../engine/cast/player";

export type Sq = [number, number];
type Seg = { t0: number; t1: number; p0: V3; p1: V3; carry?: string; arc: number; toSq?: Sq };

export class Track {
  segs: Seg[] = []; private t = 0; private p: V3;
  constructor(readonly rest: V3) { this.p = rest; }
  go(t0: number, t1: number, p: V3, o: { carry?: string; arc?: number; toSq?: Sq } = {}) {
    if (t0 > this.t) this.segs.push({ t0: this.t, t1: t0, p0: this.p, p1: this.p, arc: 0 });
    this.segs.push({ t0, t1, p0: this.p, p1: p, carry: o.carry, arc: o.arc ?? 0.025, toSq: o.toSq });
    this.t = t1; this.p = p;
  }
  hold(t1: number, carry?: string) { this.segs.push({ t0: this.t, t1, p0: this.p, p1: this.p, carry, arc: 0 }); this.t = t1; }
  home(t0: number, t1: number) { this.go(t0, t1, this.rest); }
  at(t: number): { p: V3; carry?: string } {
    for (const s of this.segs) if (t >= s.t0 && t < s.t1) {
      const u = smooth(s.t0, s.t1, t);
      return { p: [s.p0[0] + (s.p1[0] - s.p0[0]) * u, s.p0[1] + (s.p1[1] - s.p0[1]) * u + s.arc * Math.sin(Math.PI * u), s.p0[2] + (s.p1[2] - s.p0[2]) * u], carry: s.carry };
    }
    return { p: this.segs.length && t >= this.segs[this.segs.length - 1].t1 ? this.p : this.rest };
  }
}

export class Choreo {
  tracks = new Map<string, Track>();
  private place = new Map<string, { t: number; sq: Sq }[]>();
  private state = new Map<string, string>();               // square -> piece id (authoring order)
  constructor(readonly origin: V3, rest: Record<string, V3>) {
    for (const k in rest) this.tracks.set(k, new Track(rest[k]));
    for (const [i, j] of HOMES) this.state.set(`${i},${j}`, pieceId(i, j));
  }
  sqPos(s: Sq): V3 { return [this.origin[0] - 0.35 + 0.1 * s[0], this.origin[1], this.origin[2] - 0.35 + 0.1 * s[1]]; }
  private off(id: string) { return HGT[kindOf(id)] + HAND_R * 0.9; }
  above(s: Sq, id: string, extra = 0): V3 { const p = this.sqPos(s); return [p[0], p[1] + this.off(id) + extra, p[2]]; }
  private take(s: Sq) { const k = `${s[0]},${s[1]}`, id = this.state.get(k); if (!id) throw new Error("no piece on " + k); return id; }
  private put(id: string, from: Sq, to: Sq, t: number) {
    this.state.delete(`${from[0]},${from[1]}`); this.state.set(`${to[0]},${to[1]}`, id);
    if (!this.place.has(id)) this.place.set(id, []);
    this.place.get(id)!.push({ t, sq: to });
  }
  tr(key: string) { const t = this.tracks.get(key); if (!t) throw new Error("no hand " + key); return t; }

  // reach (30 %), carry with a small lift (40 %), back to rest (30 %)
  move(key: string, from: Sq, to: Sq, t0: number, t1: number) {
    const id = this.take(from), d = t1 - t0, a = t0 + 0.3 * d, b = t0 + 0.7 * d, tr = this.tr(key);
    tr.go(t0, a, this.above(from, id));
    tr.go(a, b, this.above(to, id), { carry: id, arc: 0.07, toSq: to });
    tr.home(b, t1);
    this.put(id, from, to, b);
  }
  // reach toward a piece and stop above it without touching
  hover(key: string, s: Sq, t0: number, t1: number, t2: number, t3: number) {
    const id = this.take(s), tr = this.tr(key);
    tr.go(t0, t1, this.above(s, id, 0.06)); tr.hold(t2); tr.home(t2, t3);
  }
  // lift a piece and put it back on the same square ("changes his plan")
  liftBack(key: string, s: Sq, t0: number, t1: number, t2: number) {
    const id = this.take(s), tr = this.tr(key);
    tr.go(t0, t1, this.above(s, id));
    tr.go(t1, t2, this.above(s, id), { carry: id, arc: 0.09, toSq: s });
    this.put(id, s, s, t2);
  }
  // carry a piece somewhere off the board and keep holding it
  lift(key: string, s: Sq, t0: number, t1: number, t2: number, to: V3, t3: number) {
    const id = this.take(s), tr = this.tr(key);
    tr.go(t0, t1, this.above(s, id));
    tr.go(t1, t2, to, { carry: id, arc: 0.04 });
    tr.hold(t3, id);
    return id;
  }
  setDown(key: string, id: string, s: Sq, from: Sq, t0: number, t1: number, t2: number) {
    const tr = this.tr(key);
    tr.go(t0, t1, this.above(s, id), { carry: id, arc: 0.03, toSq: s });
    tr.home(t1, t2);
    this.put(id, from, s, t1);
  }

  hands(t: number) { const o: Record<string, V3> = {}; this.tracks.forEach((tr, k) => { o[k] = tr.at(t).p; }); return o; }
  pieceAt(id: string, t: number): V3 {
    for (const tr of this.tracks.values()) {
      const r = tr.at(t);
      if (r.carry === id) return [r.p[0], r.p[1] - this.off(id), r.p[2]];
    }
    let sq: Sq | null = null;
    for (const e of this.place.get(id) ?? []) if (e.t <= t) sq = e.sq;
    if (!sq) { const [i, j] = id.split(",").map(Number); sq = [i, j]; }
    return this.sqPos(sq);
  }
}

// ---------------- the café game ----------------
// Hands: "<who>:<R|L>". Arian (z = +0.95) has his right hand at +x; Max (z = -0.95) has his right hand at -x.
export const makeCafe = (rest: Record<string, V3>) => {
  const C = new Choreo([0, 0.784, 0], rest);
  // "He plans an attack." Max reaches for his queen... "You block it before he touches the piece."
  //   Max's hand freezes just above the queen (never touches it), Arian's pawn lands on the attack line at 11.93 (ATTACK.block)
  C.hover("max:R", [3, 0], 10.55, 11.15, 12.7, 13.4);
  C.move("arian:L", [3, 6], [3, 5], 11.3, 12.2);
  // "every move you make, he counters perfectly."
  C.move("arian:L", [1, 7], [2, 5], 17.55, 18.55);
  C.move("max:L", [6, 0], [5, 2], 18.85, 19.9);
  // "...playing with a normal person, it takes almost no time for him to lose." time-lapse game under the stopwatch overlay.
  //   Arian's last move (bishop, lands on "lose") wins. All of it goes back home in the "hours pass" time-lapse (57.2-58.8).
  {
    const D = 0.42;
    const tl: [string, Sq, Sq, number][] = [
      ["arian:R", [6, 6], [6, 5], 21.0], ["max:L", [7, 1], [7, 3], 21.48], ["arian:R", [5, 7], [6, 6], 21.96], ["max:R", [1, 1], [1, 2], 22.44],
      ["arian:L", [0, 6], [0, 4], 22.92], ["max:R", [2, 0], [1, 1], 23.4], ["arian:R", [6, 7], [5, 5], 23.88], ["max:L", [7, 0], [7, 2], 24.36],
      ["arian:R", [5, 5], [6, 3], 24.84], ["max:R", [1, 1], [0, 2], 25.32], ["arian:R", [6, 6], [3, 3], 25.79],
    ];
    for (const [h, a, b, t0] of tl) C.move(h, a, b, t0, t0 + D);
  }
  // "And you just push harder on him."
  C.move("arian:R", [3, 7], [3, 6], 42.35, 43.35);
  // "You change your move." reach for the knight, stop, move the e-pawn instead
  {
    const tr = C.tr("arian:L");
    tr.go(43.85, 44.15, C.above([2, 5], "1,7", 0.06)); tr.hold(44.3);
    C.move("arian:L", [4, 6], [4, 5], 44.3, 45.3);
  }
  // "He changes his plan." lifts his bishop, puts it back, pushes the e-pawn
  C.liftBack("max:L", [5, 0], 46.3, 46.55, 46.85);
  C.move("max:L", [4, 1], [4, 2], 46.85, 47.75);
  // "Hours pass. The board never ends." time-lapse: everything goes back home (loop). First the time-lapse game pieces:
  C.move("arian:R", [3, 3], [5, 7], 57.2, 57.7); C.move("arian:R", [6, 3], [6, 7], 57.75, 58.25); C.move("arian:R", [6, 5], [6, 6], 58.3, 58.8);
  C.move("arian:L", [0, 4], [0, 6], 57.3, 57.8);
  C.move("max:L", [7, 2], [7, 0], 57.3, 57.8); C.move("max:L", [7, 3], [7, 1], 57.85, 58.35);
  C.move("max:R", [0, 2], [2, 0], 57.2, 57.7); C.move("max:R", [1, 2], [1, 1], 57.75, 58.25);
  C.move("arian:R", [3, 6], [3, 7], 59.0, 59.55);
  C.move("arian:L", [2, 5], [1, 7], 59.0, 59.55);
  C.move("max:L", [5, 2], [6, 0], 59.1, 59.65);
  C.move("max:R", [4, 2], [4, 1], 59.1, 59.65);
  C.move("arian:L", [3, 5], [3, 6], 59.6, 60.15);
  C.move("arian:R", [4, 5], [4, 6], 59.6, 60.15);
  return C;
};

// ---------------- the fantasy board (on a pedestal, top at 0.505) ----------------
export const FANT_BOARD: V3 = F(0, 0.505, 0);
export const makeFantasy = (rest: Record<string, V3>) => {
  const C = new Choreo(FANT_BOARD, rest);
  // "He thinks about his queen." Max's copy lifts his queen up high
  const q = C.lift("max:R", [3, 0], 7.55, 7.95, 8.45, F(-0.05, 0.505 + 0.42, -0.25), 9.95);
  C.setDown("max:R", q, [3, 0], [3, 0], 9.95, 10.35, 10.7);
  return C;
};


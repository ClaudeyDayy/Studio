// One continuous camera made of shots (no cuts). Each shot moves from where the last one is to its `to` pose,
// then keeps creeping / drifting / orbiting slowly. A shot with `dissolve` fades in over the previous shot (which keeps moving).
// A shot with `from` jumps to that pose (only do this under a white flash or a dissolve).
// R3KNRF (2026-11-11), both optional, old videos are unchanged:
//   roll  = camera tilt in degrees (5th value of P). The reference tilts 4-5 deg on drama beats, about 3 times per 10 s,
//           each tilt glides in over >= 18 frames (set it on a shot's `to` pose; it eases like the rest of the move).
//   kicks = makeCamera(shots, duration, { kicks: [[time, strength], ...] }): impact shake. The picture jumps sideways and
//           flips direction EVERY frame, fading out over 7 frames (reference: ~3 px at 720p per unit, roll 0.23 deg per unit).
//           Strength 1 = a normal hit, 0.5 = small, 1.6 = big. The slow push-in stops at the hit (end the shot's creep there).
import { V3, add, sub, mul, norm, lerpN, lerpV, bez, smooth, smoother } from "./util";

export type Pose = { pos: V3; look: V3; fov: number; blur: number; roll?: number };
// P(camera position, point it looks at, lens fov in degrees, background blur 0..24, tilt in degrees (+ = clockwise))
export const P = (pos: V3, look: V3, fov: number, blur = 0, roll = 0): Pose => (roll ? { pos, look, fov, blur, roll } : { pos, look, fov, blur });

export type Shot = {
  t: number;            // start time (s)
  to: Pose; move: number;  // where to go and how long the move takes (0 = stay)
  space?: string;       // optional name of the place (e.g. "room", "dream"); the world can use it
  from?: Pose;          // jump to this pose at t (only under a white flash or a dissolve)
  via?: V3;             // curve control point so the path goes around heads and props
  creep?: number;       // slow push-in after the move, m/s
  drift?: V3;           // slow sideways drift after the move, m/s
  orbit?: number;       // slow orbit around the look point after the move, degrees/s
  noRamp?: boolean;     // creep starts at full speed (the loop start)
  dissolve?: number;    // matched dissolve from the previous shot over this many seconds
  wipe?: V3;            // optional (bank2): the dissolve is a soft circle that grows from this point of the NEW shot's world
  wipeGlow?: string;    //   optional colour of a soft glowing ring on the circle's edge (e.g. "#FF8AE0")
  collapse?: { dur: number; hold: number };   // optional (bank2): OBJECT TRANSITION. The previous shot's picture shrinks into a
                        //   surface of this shot's world over `dur` s (the video gives the surface corners), then keeps playing
                        //   inside it for `hold` s more. Do not combine with dissolve.
  tag?: string;
};
export type CamState = Pose & { space: string; shot: number };

const TAU = 0.4;
export const ramp = (e: number, noRamp?: boolean) => (noRamp ? e : e - TAU * (1 - Math.exp(-e / TAU)));

// impact kick 0 (none) .. strength at time t: flips sign every frame, gone after 7 frames
export const makeKicks = (kicks: [number, number][], fps = 30) => (t: number) => {
  let a = 0;
  for (const [t0, g] of kicks) {
    const n = Math.round((t - t0) * fps);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
// shift the look point sideways (and a little up) by ~3 px at 720p per unit of kick, and roll 0.23 deg per unit
export const applyKick = <T extends Pose>(c: T, a: number): T => {
  if (!a) return c;
  const d = sub(c.look, c.pos), L = Math.hypot(d[0], d[1], d[2]) || 1, h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: (c.roll ?? 0) + a * 0.23 };
};

export function makeCamera(shots: Shot[], duration: number, opts: { kicks?: [number, number][]; fps?: number } = {}) {
  const kickAt = makeKicks(opts.kicks ?? [], opts.fps ?? 30);
  const evalShot = (s: Shot, start: Pose, t: number): Pose => {
    const e = s.move > 0 ? smoother((t - s.t) / s.move) : 1;
    let pos = s.via ? bez(start.pos, s.via, s.to.pos, e) : lerpV(start.pos, s.to.pos, e);
    const look = lerpV(start.look, s.to.look, e);
    const el = Math.max(0, t - s.t - s.move);
    if (el > 0) {
      const r = ramp(el, s.noRamp);
      if (s.orbit) {
        const th = (s.orbit * Math.PI / 180) * r, dx = pos[0] - look[0], dz = pos[2] - look[2];
        pos = [look[0] + dx * Math.cos(th) + dz * Math.sin(th), pos[1], look[2] - dx * Math.sin(th) + dz * Math.cos(th)];
      }
      if (s.drift) pos = add(pos, mul(s.drift, r));
      if (s.creep) pos = add(pos, mul(norm(sub(look, pos)), s.creep * r));
    }
    const r0 = start.roll ?? 0, r1 = s.to.roll ?? 0;
    const p: Pose = { pos, look, fov: lerpN(start.fov, s.to.fov, e), blur: lerpN(start.blur, s.to.blur, e) };
    if (r0 || r1) p.roll = lerpN(r0, r1, e);
    return p;
  };
  const STARTS: Pose[] = [];
  shots.forEach((s, i) => { STARTS[i] = s.from ?? evalShot(shots[i - 1], STARTS[i - 1], s.t); });
  const shotIndex = (t: number) => { let i = 0; while (i + 1 < shots.length && t >= shots[i + 1].t) i++; return i; };
  const sp = (s: Shot) => s.space ?? "main";

  const camAt = (t: number): CamState => {
    const i = shotIndex(t), s = shots[i];
    return applyKick({ ...evalShot(s, STARTS[i], Math.min(t, duration)), space: sp(s), shot: i }, kickAt(t));
  };
  // null, or { w: how much of the new shot shows 0..1, out: the old shot's camera (still moving) }
  const dissolveAt = (t: number): { w: number; out: CamState; wipe?: V3; wipeGlow?: string } | null => {
    const i = shotIndex(t), s = shots[i];
    if (!s.dissolve || i === 0 || t >= s.t + s.dissolve) return null;
    const w = smooth(s.t, s.t + s.dissolve, t);
    const d: { w: number; out: CamState; wipe?: V3; wipeGlow?: string } = { w, out: applyKick({ ...evalShot(shots[i - 1], STARTS[i - 1], t), space: sp(shots[i - 1]), shot: i - 1 }, kickAt(t)) };
    if (s.wipe) { d.wipe = s.wipe; if (s.wipeGlow) d.wipeGlow = s.wipeGlow; }
    return d;
  };
  // object transition (shot.collapse): null, or { k: 0..1 how far the old picture has shrunk into the object (eased by the
  // engine), u: seconds since the shot started, out: the old shot's camera (still moving), shot: the new shot's index }
  const collapseAt = (t: number): { k: number; u: number; out: CamState; shot: number } | null => {
    for (let i = 1; i < shots.length; i++) {
      const s = shots[i], c = s.collapse;
      if (!c || t < s.t || t >= s.t + c.dur + c.hold) continue;
      return { k: Math.min(1, (t - s.t) / c.dur), u: t - s.t, out: applyKick({ ...evalShot(shots[i - 1], STARTS[i - 1], t), space: sp(shots[i - 1]), shot: i - 1 }, kickAt(t)), shot: i };
    }
    return null;
  };
  // for loops: the pose a shot must move to, so that after creeping for `seconds` it ends exactly on `end`
  //   e.g. last shot at t = 50 with move 3 in a 60 s video: to: creepStart(OPENING, 0.04, 60 - 50 - 3), creep: 0.04
  const creepStart = (end: Pose, creep: number, seconds: number) => {
    const dir = norm(sub(end.look, end.pos));
    return { ...end, pos: sub(end.pos, mul(dir, creep * ramp(seconds))) };
  };
  return { camAt, dissolveAt, collapseAt, creepStart, kickAt };
}

// white flashes: each [fade in start, full white, fade out end]
export const makeWhite = (list: [number, number, number][]) => (t: number) => {
  let w = 0;
  for (const [a, b, c] of list) w = Math.max(w, t < b ? smooth(a, b, t) : 1 - smooth(b, c, t));
  return w;
};

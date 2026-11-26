// Light presets for every video (R3KNRF, 2026-11-11; HOUSE 2026-11-14: + sunny, storm). Before this, each video set its light by hand in world.ts.
// A preset sets: the world's two-tone light (shade.ts TONE), the sun's colour / strength / direction, the background colour,
// the light on the characters (cardlight.ts, for people made with { lit: true }) and the matching colour grade.
// The reference changes light with the story (day -> sunset -> night for the "You see," explanation): lightTrack() does that.
//
//   world.ts update():   applyLight(LIGHT.at(t), { sun: this.sun, scene, cam });
//   video.ts:            gradeAt: LIGHT.gradeAt          (the grade follows the light)
//   story.ts:            export const LIGHT = lightTrack([[0, "day"], [31.5, "sunset", 1.5], [40, "night", 2]]);
//   a custom look:       lightTrack([[0, { ...LIGHTS.day, sky: "#88C6E8" }]])     one preset from start to end: lightTrack([[0, "indoor"]])
// The sun direction is in WORLD space: az = compass angle around the up axis (0 = the sun is toward +z, 90 = toward +x),
// el = height above the horizon. Pick az so the sun lights the faces from one side, not from straight behind the camera
// (reference: day key from the side, about 50-75 deg off the camera axis; sunset backlit and low).
import * as THREE from "three";
import { TONE } from "../post/shade";
import { CARD_LIGHT } from "../cast/cardlight";
import { GRADES, GradeParams } from "../post/grade";
import { V3, smooth } from "./util";

type C3 = [number, number, number];
export type Light = {
  lit: C3; shade: C3; lift: C3; bounce: C3; sat: number; lambert: number; sideK: number; term: number; // world two-tone
  sun: C3; sunI: number; az: number; el: number;                                                        // the sun
  sky: string;                                                                                          // background colour
  chars: C3; charSide: C3; charGrad: number;                                                            // people ({ lit: true })
  grade: GradeParams; gradeAmount: number;                                                              // colour grade
};

const GRADE_NIGHT: GradeParams = {
  ky: [0, 0.085, 0.24, 0.52, 0.8, 0.93, 1],
  sat: [1.0, 1.05, 1.05],
  tintS: [0.03, 0.0], tintM: [0.012, -0.004], tintH: [0, 0],
  vig: [0.24, 0.4],
};

export const LIGHTS = {
  // the warm day look of "Infinite chess" (proven); key from the side
  day: {
    lit: [1.7, 1.52, 1.12], shade: [0.62, 0.6, 0.64], lift: [0.035, 0.03, 0.04], bounce: [0.04, 0.025, 0], sat: 1.3, lambert: 0.4, sideK: 0.84, term: 0.25,
    sun: [1.0, 0.9, 0.72], sunI: 2.8, az: 35, el: 48, sky: "#9FD3E6",
    chars: [1.0, 0.97, 0.95], charSide: [0.92, 0.9, 0.97], charGrad: 0.1,
    grade: GRADES.day, gradeAmount: 1,
  },
  // golden hour: orange light, violet-blue shadows (never brown), low sun (reference: backlit, long shadows toward the camera)
  sunset: {
    lit: [1.95, 1.15, 0.62], shade: [0.42, 0.36, 0.62], lift: [0.04, 0.05, 0.13], bounce: [0.05, 0.02, 0], sat: 1.25, lambert: 0.4, sideK: 0.82, term: 0.15,
    sun: [1.0, 0.62, 0.32], sunI: 3.6, az: 160, el: 9, sky: "#F2A56E",
    chars: [1.0, 0.84, 0.7], charSide: [0.82, 0.78, 0.96], charGrad: 0.16,
    grade: GRADES.golden, gradeAmount: 1,
  },
  // night: blue moonlight (the "Infinite chess" night values); add your own lamps / windows as glowing things
  night: {
    lit: [0.6, 0.7, 1.25], shade: [0.32, 0.34, 0.5], lift: [0.03, 0.035, 0.06], bounce: [0, 0, 0], sat: 1.15, lambert: 0.4, sideK: 0.84, term: 0.25,
    sun: [0.55, 0.65, 1.0], sunI: 1.2, az: 60, el: 35, sky: "#1B2350",
    chars: [0.6, 0.66, 0.92], charSide: [0.8, 0.82, 1.0], charGrad: 0.14,
    grade: GRADE_NIGHT, gradeAmount: 1,
  },
  // inside a room with warm lamps
  indoor: {
    lit: [1.6, 1.38, 1.02], shade: [0.58, 0.52, 0.6], lift: [0.04, 0.03, 0.05], bounce: [0.05, 0.03, 0], sat: 1.25, lambert: 0.4, sideK: 0.84, term: 0.25,
    sun: [1.0, 0.85, 0.62], sunI: 2.4, az: 50, el: 40, sky: "#2A1B22",
    chars: [1.0, 0.94, 0.86], charSide: [0.9, 0.86, 0.96], charGrad: 0.12,
    grade: GRADES.day, gradeAmount: 1,
  },
  // HOUSE (2026-11-14): the bright sunny day he approved in the Vietnam video (more sun, warmer, sunny sky)
  sunny: {
    lit: [1.95, 1.75, 1.28], shade: [0.7, 0.68, 0.72], lift: [0.035, 0.03, 0.04], bounce: [0.04, 0.025, 0], sat: 1.3, lambert: 0.4, sideK: 0.84, term: 0.25,
    sun: [1.0, 0.92, 0.74], sunI: 3.6, az: 35, el: 52, sky: "#8ED0F0",
    chars: [1.0, 0.97, 0.95], charSide: [0.92, 0.9, 0.97], charGrad: 0.1,
    grade: GRADES.day, gradeAmount: 1,
  },
  // HOUSE: storm / heavy rain: dark saturated indigo, never grey or black (reference storm at sea)
  storm: {
    lit: [0.78, 0.86, 1.28], shade: [0.34, 0.36, 0.54], lift: [0.03, 0.035, 0.06], bounce: [0, 0, 0], sat: 1.15, lambert: 0.4, sideK: 0.84, term: 0.25,
    sun: [0.6, 0.7, 1.0], sunI: 1.4, az: 60, el: 40, sky: "#1D2E86",
    chars: [0.66, 0.72, 0.95], charSide: [0.8, 0.82, 1.0], charGrad: 0.14,
    grade: GRADE_NIGHT, gradeAmount: 1,
  },
} satisfies Record<string, Light>;
export type LightName = keyof typeof LIGHTS;

const L1 = (a: number, b: number, k: number) => a + (b - a) * k;
const L3 = (a: C3, b: C3, k: number): C3 => [L1(a[0], b[0], k), L1(a[1], b[1], k), L1(a[2], b[2], k)];
const L2 = (a: [number, number], b: [number, number], k: number): [number, number] => [L1(a[0], b[0], k), L1(a[1], b[1], k)];
const colA = new THREE.Color(), colB = new THREE.Color();
export const mixGrade = (a: GradeParams, b: GradeParams, k: number): GradeParams => ({
  ky: a.ky.map((v, i) => L1(v, b.ky[i], k)), sat: L3(a.sat, b.sat, k),
  tintS: L2(a.tintS, b.tintS, k), tintM: L2(a.tintM, b.tintM, k), tintH: L2(a.tintH, b.tintH, k), vig: L2(a.vig, b.vig, k),
});
/** blend two lights (k = 0 -> a, 1 -> b); the sun direction turns the short way round */
export function mixLight(a: Light, b: Light, k: number): Light {
  if (k <= 0) return a; if (k >= 1) return b;
  let dAz = ((b.az - a.az + 540) % 360) - 180;
  return {
    lit: L3(a.lit, b.lit, k), shade: L3(a.shade, b.shade, k), lift: L3(a.lift, b.lift, k), bounce: L3(a.bounce, b.bounce, k),
    sat: L1(a.sat, b.sat, k), lambert: L1(a.lambert, b.lambert, k), sideK: L1(a.sideK, b.sideK, k), term: L1(a.term, b.term, k),
    sun: L3(a.sun, b.sun, k), sunI: L1(a.sunI, b.sunI, k), az: a.az + dAz * k, el: L1(a.el, b.el, k),
    sky: "#" + colA.set(a.sky).lerp(colB.set(b.sky), k).getHexString(),
    chars: L3(a.chars, b.chars, k), charSide: L3(a.charSide, b.charSide, k), charGrad: L1(a.charGrad, b.charGrad, k),
    grade: mixGrade(a.grade, b.grade, k), gradeAmount: L1(a.gradeAmount, b.gradeAmount, k),
  };
}

/** Light over time. keys: [start time, preset name or your own Light, fade seconds (default 1)]. The change starts at the
 *  key time and blends over the fade. at(t) for the world, gradeAt(t) for video.ts. */
export function lightTrack(keys: [number, LightName | Light, number?][]) {
  const K = keys.map(([t, l, f]) => ({ t, l: typeof l === "string" ? (LIGHTS[l] as Light) : l, f: f ?? 1 })).sort((a, b) => a.t - b.t);
  const at = (t: number): Light => {
    let i = 0;
    while (i + 1 < K.length && K[i + 1].t <= t) i++;
    const k = K[i];
    if (i === 0 || t >= k.t + k.f) return k.l;
    return mixLight(K[i - 1].l, k.l, smooth(k.t, k.t + k.f, t));
  };
  return { at, gradeAt: (t: number) => { const l = at(t); return { p: l.grade, amount: l.gradeAmount }; } };
}

const tmpV = new THREE.Vector3(), tmpR = new THREE.Vector3();
/** Put a light on the world for this frame. rig.sun = the world's DirectionalLight (its target stays where the world put it);
 *  scene: sets the background colour (leave out to keep your own); cam: needed for the people's side shading. */
export function applyLight(L: Light, rig: { sun: THREE.DirectionalLight; scene?: THREE.Scene; cam?: THREE.Camera; dist?: number; keepSunDir?: boolean }) {
  TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
  TONE.uBounce.value.set(...L.bounce); TONE.uSat.value = L.sat; TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term;
  const s = rig.sun;
  s.color.setRGB(...L.sun); s.intensity = L.sunI;
  const az = (L.az * Math.PI) / 180, el = (L.el * Math.PI) / 180;
  const dir = tmpV.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  if (rig.keepSunDir) dir.copy(s.position).sub(s.target.position).normalize();
  else { s.position.copy(s.target.position).addScaledVector(dir, rig.dist ?? 8); s.updateMatrixWorld(); }
  if (rig.scene) rig.scene.background = new THREE.Color(L.sky);
  CARD_LIGHT.uCardTint.value.set(...L.chars); CARD_LIGHT.uCardSide.value.set(...L.charSide); CARD_LIGHT.uCardGrad.value = L.charGrad;
  if (rig.cam) {                                           // which side of the screen the light comes from
    tmpR.set(1, 0, 0).applyQuaternion(rig.cam.quaternion);
    const x = dir.dot(tmpR);
    CARD_LIGHT.uSunX.value = Math.sign(x) * smooth(0, 0.35, Math.abs(x));
  }
}
export const sunDir = (L: Light): V3 => { const az = (L.az * Math.PI) / 180, el = (L.el * Math.PI) / 180; return [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]; };

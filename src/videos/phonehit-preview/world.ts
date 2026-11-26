// PHONE HIT PREVIEW world (2026-11-16): the New York area from 250 km up over the curve of the Earth, the falling phone, the red stroke,
// the dive down to Manhattan (the detailed city of cityhit-preview/city.ts), the very fast pull-back and the flash.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { NOINK } from "../../engine/post/ink";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { houseLight } from "../../engine/outdoor";
import { sunDir } from "../../engine/core/lights";
import { MR, noInk, mkCanvas, canvasTex } from "../../engine/kit";
import { loadCast3d, Cast3DAssets } from "../../engine/cast/player3d";
import { LIGHT, T } from "./story";
import { drawMap, buildings, bridges, life, W, AV, ST0, STEP } from "../cityhit-preview/city";
import { glowSprite, blast } from "../cityhit-preview/world";
import { curvedGround, strokeLoop, nyMap, NY_LOOP, horizonDist, Ground } from "./region";

export const load = () => loadCast3d({}, {});
const HAZE = new THREE.Color("#B6CCE2"), SPACE = new THREE.Color("#02040B"), LIMB = new THREE.Color("#6FA6E6");
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

// the phone (real size, silver back, dark screen), flying flat with its screen toward the camera's side
function phone() {
  const G = new THREE.Group(); G.name = "phone";
  G.add(new THREE.Mesh(new RoundedBoxGeometry(0.072, 0.148, 0.009, 3, 0.008), MR("#C7CCD6", 0.3, 0.75)));
  const sc = mkCanvas(128, 256), g = sc.getContext("2d")!, gr = g.createLinearGradient(0, 0, 128, 256);
  gr.addColorStop(0, "#2A4A8A"); gr.addColorStop(1, "#0A0E1C"); g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.14), new THREE.MeshStandardMaterial({ map: canvasTex(sc), roughness: 0.15, metalness: 0.1 })); scr.position.z = 0.0047; noInk(scr); G.add(scr);
  const cb = new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.026, 0.004, 2, 0.004), MR("#2A2D36", 0.3, 0.6)); cb.position.set(-0.018, 0.052, -0.0055); G.add(cb);
  G.scale.setScalar(2.2);                                              // a little bigger so it reads from 5 m (like the needle's glow)
  return G;
}

type Pose = { pos: THREE.Vector3; q: THREE.Quaternion; fov: number };
export class SimpleWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#cfe0ff", "#5a5650", 0.6);
  private phone = phone(); private glow = glowSprite();
  private hit: THREE.Vector3; private dir: THREE.Vector3; private upP: THREE.Vector3;
  private houses: THREE.InstancedMesh; private stroke = strokeLoop(NY_LOOP, [0, 4800], 6);
  private fog = new THREE.Fog(HAZE, 1000, 100000);
  private life: ReturnType<typeof life>;
  private blast = blast(); private ground!: Ground;
  private dummy = new THREE.PerspectiveCamera();

  constructor(_A: Cast3DAssets) {
    const R = this.root;
    const [hx, hz] = W(ST0 + 50 * STEP, AV[5]);                      // the hit: the same Midtown crossing
    this.hit = new THREE.Vector3(hx, 0, hz);
    this.dir = new THREE.Vector3(0, -1.7, -1).normalize();           // steep, from the south
    this.upP = new THREE.Vector3(0, 1, 0).addScaledVector(this.dir, -this.dir.y).normalize();
    R.add(this.sky, this.sun, this.sun.target);
    // four map pictures: the area (400 km), Manhattan and round (44 km), round the hit (2.4 km), the streets at the hit (260 m)
    const B = nyMap(), RV = { x0: -22000, z0: -22000, size: 44000, px: 2048, lod: 0 };
    const PV = { x0: hx - 1200, z0: hz - 1200, size: 2400, px: 2048, lod: 1 }, CV = { x0: hx - 130, z0: hz - 130, size: 260, px: 2048, lod: 2 };
    const tex = (V: typeof RV) => drawMap(V);
    this.ground = curvedGround([{ x0: B.V.x0, z0: B.V.z0, size: B.V.size, tex: B.tex }, { ...RV, tex: tex(RV) }, { ...PV, tex: tex(PV) }, { ...CV, tex: tex(CV) }]); R.add(this.ground.mesh);
    this.houses = buildings(); R.add(this.houses); noInk(this.houses);
    R.add(bridges());
    this.life = life([hx, hz]); R.add(this.life.group);
    R.add(this.stroke.group, this.phone, this.glow);
    this.blast.group.position.copy(this.hit); R.add(this.blast.group);
    this.phone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.dir);
  }

  private altAt(t: number) {
    if (t < T.dive) return 150000 - 25000 * (t / T.dive);                                  // slow motion: it barely moves
    if (t < T.back) { const x = (t - T.dive) / (T.back - T.dive), e = 0.4 * x + 0.6 * x * x; return 125000 * Math.pow(55 / 125000, e); }
    return Math.max(0, 55 * (1 - (t - T.back) / (T.hit - T.back)));
  }
  private phoneAt(t: number) { const a = this.altAt(t); return this.hit.clone().addScaledVector(this.dir, a / this.dir.y); }
  private pose(pos: THREE.Vector3, look: THREE.Vector3, up: THREE.Vector3, fov: number): Pose {
    const d = this.dummy; d.position.copy(pos); d.up.copy(up); d.lookAt(look);
    return { pos: pos.clone(), q: d.quaternion.clone(), fov };
  }
  private high(t: number): Pose {                                                           // 250 km up, 380 km south of the target, looking north over the curve
    const a = 250000 + 4000 * t, d = 380000 + 6000 * t, r = -0.02 + 0.008 * t;
    return this.pose(new THREE.Vector3(this.hit.x + 8000 * t, a, this.hit.z + d), new THREE.Vector3(this.hit.x + 4000, 0, this.hit.z - 62000), new THREE.Vector3(Math.sin(r), 1, 0), 38);
  }
  private follow(t: number): Pose {                                                         // about 5 m behind the phone, a little above
    const N = this.phoneAt(t);
    return this.pose(N.clone().addScaledVector(this.dir, -5).addScaledVector(this.upP, 0.9), N.clone().addScaledVector(this.dir, 40), this.upP, 52);
  }

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    // ---- the camera ----
    let P: Pose;
    if (t < T.dive) P = this.high(t);
    else if (t < T.back) {
      const w = sm(T.dive, T.dive + 0.45, t), A = this.high(t), B = this.follow(t);
      P = { pos: A.pos.lerp(B.pos, w), q: A.q.slerp(B.q, w), fov: A.fov + (B.fov - A.fov) * w };
    } else {
      const x = clamp((t - T.back) / (T.hit - T.back), 0, 1), q = 1 - Math.pow(1 - x, 3);
      const A = this.follow(T.back), B = this.high(t), a0 = A.pos.y, a1 = B.pos.y;
      const g = (Math.exp(Math.log(a0) + (Math.log(a1) - Math.log(a0)) * q) - a0) / (a1 - a0);
      P = { pos: A.pos.lerp(B.pos, g), q: A.q.slerp(B.q, sm(0, 0.75, q)), fov: A.fov + (B.fov - A.fov) * q };
    }
    cam.position.copy(P.pos); cam.quaternion.copy(P.q); cam.fov = P.fov;
    const N = this.phoneAt(t), alt = cam.position.y, dN = cam.position.distanceTo(N), hk = sm(8000, 40000, alt);
    cam.near = clamp(Math.min(dN * 0.4, alt * 0.004), 0.05, 120); cam.far = Math.max(alt * 5 + 8000, hk * horizonDist(alt) * 1.05);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);

    // ---- the phone and its glow (a hot dot far away, the real phone up close) ----
    this.phone.position.copy(N); this.phone.visible = t < T.hit; this.phone.rotation.z += 0;
    this.glow.position.copy(N); this.glow.visible = t < T.hit; this.glow.scale.setScalar(Math.max(0.3, dN * 0.016));

    // ---- the blast: a point that spreads (doubles about every 0.1 s), big enough for the whole area ----
    if (t >= T.hit) { const x = t - T.hit; this.blast.set(500 * Math.pow(2, x / 0.1), Math.min(1, x / 0.05)); } else this.blast.set(0, 0);

    this.ground.hi(1 - sm(80000, 260000, alt));
    // ---- the stroke: draws round the whole area; fades out on the way down, back on the way up ----
    const p = sm(T.strokeA, T.strokeB, t) * 1.07;
    this.stroke.set(p, alt * 0.0055, sm(30000, 120000, alt) * (1 - sm(T.hit + 0.25, T.hit + 0.55, t)));

    // ---- outlines on the buildings only when we are close; nothing of the city when it is smaller than a pixel ----
    this.houses.visible = alt < 40000; this.houses.layers.set(alt < 1500 ? 0 : NOINK);
    this.life.group.visible = alt < 4000; this.life.group.traverse((o) => o.layers.set(alt < 1500 ? 0 : NOINK)); if (this.life.group.visible) this.life.update(t);

    // ---- light, shadows, haze, the thin blue edge of the air and black space above it ----
    const fwd = cam.getWorldDirection(new THREE.Vector3()), gp = cam.position.clone();
    if (fwd.y < -0.05) gp.addScaledVector(fwd, -cam.position.y / fwd.y); gp.y = 0;
    if (gp.distanceTo(this.hit) > 30000) gp.copy(this.hit);
    this.sun.target.position.copy(gp); this.sun.target.updateMatrixWorld();
    const L = LIGHT.at(t);
    houseLight(L, { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t }, 4);
    const half = clamp(alt * 0.75, 120, 15000), sd = new THREE.Vector3(...sunDir(L)), sc = this.sun.shadow.camera;
    this.sun.position.copy(gp).addScaledVector(sd, 6000); this.sun.updateMatrixWorld();
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 50; sc.far = 13000; sc.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0001; this.sun.shadow.normalBias = (2 * half) / 4096 * 1.5; this.sun.shadow.radius = 1.5;
    this.sky.intensity = 0.35;
    scene.background = HAZE.clone().lerp(SPACE, sm(20000, 110000, alt));
    const fn = alt * 1.3, ff = fn + Math.max(alt * 8, 3000);
    this.fog.color.copy(HAZE).lerp(LIMB, sm(20000, 110000, alt));
    this.fog.near = lerp(fn, horizonDist(alt) * 0.6, hk); this.fog.far = lerp(ff, Math.max(horizonDist(alt), alt * 2), hk); scene.fog = this.fog;

    return { focus: Math.max(0.3, dN), cInf: 0 };
  }
}

// WHALE HIT PREVIEW world (2026-11-16): the Gulf of Mexico and the Yucatan coast from 800 km up over the curve of the Earth, the falling whale,
// the red stroke, the dive down to the sea at the Chicxulub coast, the very fast pull-back, the flash, then the water column and the big wave.
import * as THREE from "three";
import { NOINK } from "../../../../engine/post/ink";
import type { World } from "../../../../engine/video";
import type { CamState } from "../../../../engine/core/camera";
import { houseLight } from "../../../../engine/outdoor";
import { sunDir } from "../../../../engine/core/lights";
import { MR, noInk } from "../../../../engine/kit";
import { loadCast3d, Cast3DAssets } from "../../../../engine/cast/player3d";
import { LIGHT, T } from "./story";
import { glowSprite, blast } from "../cityhit/world";
import { curvedGround, strokeLoop, gulfMaps, GULF_LOOP, IMPACT, horizonDist, Ground } from "../phonehit/region";

export const load = () => loadCast3d({}, {});
const HAZE = new THREE.Color("#B6CCE2"), SPACE = new THREE.Color("#02040B"), LIMB = new THREE.Color("#6FA6E6");
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

// the whale: a 25 m blue whale (our own simple shape), glowing white-hot at the front, flying nose first along +x
export function whale() {
  const G = new THREE.Group(); G.name = "whale";
  const prof: [number, number][] = [[0, 0], [0.015, 0.3], [0.06, 0.58], [0.15, 0.8], [0.3, 0.9], [0.45, 0.85], [0.6, 0.66], [0.75, 0.42], [0.88, 0.22], [0.96, 0.12], [1, 0.07]];
  const L = 25, R = 3.1, pts = prof.map(([s, r]) => new THREE.Vector2(r * R, s * L));
  const bodyG = new THREE.LatheGeometry(pts, 32); bodyG.rotateZ(-Math.PI / 2);                      // length now along +x, nose at x = 0 ... tail at x = 25
  bodyG.translate(-L * 0.4, 0, 0); bodyG.scale(-1, 1, 1);                                           // nose toward +x
  const skin = MR("#5B7088", 0.55), belly = MR("#C9D3DC", 0.6);
  const body = new THREE.Mesh(bodyG, skin); body.scale.set(1, 1, 1);
  const bel = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), belly); bel.scale.set(8.5, 1.5, 2.0); bel.position.set(1.5, -1.9, 0);
  const fl = (z: number) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), skin); m.scale.set(3.2, 0.22, 1.1); m.position.set(1.0, -1.7, z); m.rotation.set(0.5 * Math.sign(z), 0.3 * Math.sign(z), 0.3); return m; };
  const fluke = (z: number) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), skin); m.scale.set(1.4, 0.18, 3.4); m.position.set(-L * 0.6 - 0.5, 0, z * 2.2); m.rotation.y = 0.35 * Math.sign(z); return m; };
  G.add(body, bel, fl(1), fl(-1), fluke(1), fluke(-1));
  G.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; } });
  return G;
}

// the water column: a tall white column with a crown, rising where the whale hit, then collapsing
function plume() {
  const prof: [number, number][] = [[0, 0], [0.55, 0.0], [0.5, 0.08], [0.36, 0.3], [0.3, 0.6], [0.34, 0.8], [0.5, 0.92], [0.32, 1.0], [0.0, 1.0]];
  const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 36);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.6, 1.7), transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, fog: false }));
  m.name = "water column"; m.userData.noShadow = true; m.userData.camFree = true; noInk(m); m.renderOrder = 940;
  return m;
}

type Pose = { pos: THREE.Vector3; q: THREE.Quaternion; fov: number };
export class SimpleWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#cfe0ff", "#5a5650", 0.6);
  private whale = whale(); private glow = glowSprite(); private plume = plume();
  private hit: THREE.Vector3; private dir: THREE.Vector3; private upP: THREE.Vector3;
  private stroke = strokeLoop(GULF_LOOP, [IMPACT[0], IMPACT[1]], 6);
  private fog = new THREE.Fog(HAZE, 1000, 100000);
  private blast = blast(); private ground: Ground;
  private dummy = new THREE.PerspectiveCamera();

  constructor(_A: Cast3DAssets) {
    const R = this.root;
    this.hit = new THREE.Vector3(IMPACT[0], 0, IMPACT[1]);
    this.dir = new THREE.Vector3(0, -1.7, -1).normalize();            // steep, from the south
    this.upP = new THREE.Vector3(0, 1, 0).addScaledVector(this.dir, -this.dir.y).normalize();
    R.add(this.sky, this.sun, this.sun.target);
    const { B, M } = gulfMaps();                                     // the Gulf (2000 km) and the coast up close (60 km)
    this.ground = curvedGround([{ ...B.V, tex: B.tex }, { ...M.V, tex: M.tex }], true); R.add(this.ground.mesh);
    R.add(this.stroke.group, this.whale, this.glow, this.plume);
    this.blast.group.position.copy(this.hit); R.add(this.blast.group);
    const zb = new THREE.Vector3().crossVectors(this.dir, this.upP).normalize();                // the whale flies belly down (its back toward the sky)
    this.whale.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(this.dir, new THREE.Vector3().crossVectors(zb, this.dir), zb));
    this.plume.position.copy(this.hit);
  }

  private altAt(t: number) {
    if (t < T.dive) return 300000 - 40000 * (t / T.dive);                                  // slow motion: it barely moves
    if (t < T.back) { const x = (t - T.dive) / (T.back - T.dive), e = 0.4 * x + 0.6 * x * x; return 260000 * Math.pow(100 / 260000, e); }
    return Math.max(0, 100 * (1 - (t - T.back) / (T.hit - T.back)));
  }
  private whaleAt(t: number) { const a = this.altAt(t); return this.hit.clone().addScaledVector(this.dir, a / this.dir.y); }
  private pose(pos: THREE.Vector3, look: THREE.Vector3, up: THREE.Vector3, fov: number): Pose {
    const d = this.dummy; d.position.copy(pos); d.up.copy(up); d.lookAt(look);
    return { pos: pos.clone(), q: d.quaternion.clone(), fov };
  }
  private high(t: number): Pose {                                                           // 800 km up, 715 km south of the look point, looking north over the curve
    const a = 800000 + 6000 * t, d = 773000 + 8000 * t, r = -0.02 + 0.008 * t;
    return this.pose(new THREE.Vector3(this.hit.x + 10000 * t, a, this.hit.z - 40000 + d), new THREE.Vector3(this.hit.x + 5000, 0, this.hit.z - 40000), new THREE.Vector3(Math.sin(r), 1, 0), 42);
  }
  private follow(t: number): Pose {                                                         // about 30 m behind the whale, a little above
    const N = this.whaleAt(t);
    const zb = new THREE.Vector3().crossVectors(this.dir, this.upP).normalize();
    return this.pose(N.clone().addScaledVector(this.dir, -34).addScaledVector(this.upP, 13).addScaledVector(zb, 9), N.clone().addScaledVector(this.dir, 12), this.upP, 52);
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
    const N = this.whaleAt(t), alt = cam.position.y, dN = cam.position.distanceTo(N), hk = sm(8000, 40000, alt);
    cam.near = clamp(Math.min(dN * 0.4, alt * 0.004), 0.1, 200); cam.far = Math.max(alt * 5 + 8000, hk * horizonDist(alt) * 1.05);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);

    // ---- the whale and its glow (a hot dot far away, the whole whale up close) ----
    this.whale.position.copy(N); this.whale.visible = t < T.hit && dN < 3000;
    this.glow.position.copy(N); this.glow.visible = t < T.hit; this.glow.scale.setScalar(dN > 300 ? Math.max(14, dN * 0.016) : 7);

    // ---- the flash, the water column, the big wave ----
    const x = t - T.hit;
    if (x >= 0) this.blast.set(600 * Math.pow(2, x / 0.11), Math.min(1, x / 0.05) * (1 - sm(1.0, 1.7, x))); else this.blast.set(0, 0);
    const col = x > 0.3 ? sm(0.3, 1.0, x) * (1 - sm(2.2, 3.6, x)) : 0;
    this.plume.visible = col > 0.01; this.plume.scale.set(22000 + 12000 * clamp(x - 0.3, 0, 3), 90000 * col, 22000 + 12000 * clamp(x - 0.3, 0, 3));
    (this.plume.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - sm(2.6, 3.8, x));
    const wr = x > 1.0 ? 140000 * (x - 1.0) : 0;                                           // the front runs out at about 140 km a second (not the true speed: so it can be seen)
    this.ground.wave(this.hit.x, this.hit.z, wr, 9000 + 0.08 * wr, wr > 0 ? 1 : 0); this.ground.hi(1 - sm(80000, 260000, alt));

    // ---- the stroke: draws round the area; fades out on the way down, back on the way up ----
    const p = sm(T.strokeA, T.strokeB, t) * 1.07;
    this.stroke.set(p, alt * 0.0055, sm(60000, 250000, alt) * (1 - sm(T.hit + 0.15, T.hit + 0.5, t)));

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

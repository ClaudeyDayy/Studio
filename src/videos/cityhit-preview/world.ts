// CITY HIT PREVIEW world: Manhattan from 30 km up, the falling needle, the red stroke, the dive and the pull-back.
// The camera goes from 30 km to a few metres, so near / far are set here every frame (not in video.ts).
import * as THREE from "three";
import { NOINK } from "../../engine/post/ink";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { houseLight } from "../../engine/outdoor";
import { sunDir } from "../../engine/core/lights";
import { mkCanvas, canvasTex, noInk } from "../../engine/kit";
import { loadCast3d, Cast3DAssets } from "../../engine/cast/player3d";
import { LIGHT, T } from "./story";
import { ground, buildings, bridges, stroke, life, W, AV, ST0, STEP } from "./city";

export const load = () => loadCast3d({}, {});
const HAZE = new THREE.Color("#B6CCE2");
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

// the needle (same design as before, real size: 6 cm), with a white-hot glow
export function needle() {
  const G = new THREE.Group(); G.name = "needle";
  const STEEL = new THREE.MeshStandardMaterial({ color: "#DCE3EC", roughness: 0.18, metalness: 1 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 24), STEEL); shaft.rotation.z = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.12, 24), STEEL); tip.rotation.z = -Math.PI / 2; tip.position.x = 0.29;
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 8, 16), STEEL); head.rotation.z = Math.PI / 2; head.position.x = -0.25; head.scale.set(1, 1, 0.75);
  G.add(shaft, tip, head); G.scale.setScalar(0.1);
  return G;
}
export function glowSprite() {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.12, "rgba(235,250,255,0.9)"); gr.addColorStop(0.35, "rgba(140,210,255,0.35)"); gr.addColorStop(1, "rgba(80,160,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(c), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  s.material.color.setScalar(2.2); s.renderOrder = 950; s.name = "needle glow"; s.userData.camFree = true; noInk(s);
  return s;
}

// the blast: a white-hot dome on the ground, a soft glow round it, a bright ring running out over the city, and a light
export function blast() {
  const G = new THREE.Group(); G.name = "blast"; G.userData.camFree = true; G.userData.noShadow = true;
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.1, 2.9), toneMapped: false, fog: false }));
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.3, 1.8), transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false, fog: false }));
  const c = mkCanvas(256, 256), g = c.getContext("2d")!, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,250,1)"); gr.addColorStop(0.3, "rgba(255,248,225,0.7)"); gr.addColorStop(0.6, "rgba(255,225,170,0.25)"); gr.addColorStop(1, "rgba(255,200,140,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(c), transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false, blending: THREE.AdditiveBlending }));
  glow.material.color.setScalar(1.8); glow.renderOrder = 960;
  const rc = mkCanvas(512, 512), rg = rc.getContext("2d")!, rr = rg.createRadialGradient(256, 256, 150, 256, 256, 256);
  rr.addColorStop(0, "rgba(255,255,255,0)"); rr.addColorStop(0.75, "rgba(255,250,235,0.25)"); rr.addColorStop(0.93, "rgba(255,255,250,1)"); rr.addColorStop(1, "rgba(255,255,255,0)");
  rg.fillStyle = rr; rg.fillRect(0, 0, 512, 512);
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: canvasTex(rc), transparent: true, depthWrite: false, toneMapped: false, fog: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 3; ring.renderOrder = 955; (ring.material as THREE.MeshBasicMaterial).color.setScalar(1.6);
  const light = new THREE.PointLight("#FFF4E0", 0, 0, 0);
  G.add(core, shell, glow, ring, light);
  for (const o of [core, shell, glow, ring]) { noInk(o); o.name = "blast"; o.userData.camFree = true; }
  const set = (R: number, k: number) => {
    G.visible = k > 0; if (!G.visible) return;
    core.scale.setScalar(R); shell.scale.setScalar(R); glow.scale.setScalar(R * 4.5); glow.position.y = R * 0.3;
    ring.scale.setScalar(R * 2.2); light.position.y = R * 0.6; light.distance = R * 6; light.intensity = 6 * k;
  };
  return { group: G, set };
}

type Pose = { pos: THREE.Vector3; q: THREE.Quaternion; fov: number };
export class SimpleWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#cfe0ff", "#5a5650", 0.6);
  private needle = needle(); private glow = glowSprite();
  private hit: THREE.Vector3; private dir: THREE.Vector3; private upP: THREE.Vector3;
  private houses: THREE.InstancedMesh; private stroke = stroke();
  private fog = new THREE.Fog(HAZE, 1000, 100000);
  private life: ReturnType<typeof life>;
  private blast = blast();
  private dummy = new THREE.PerspectiveCamera();

  constructor(_A: Cast3DAssets) {
    const R = this.root;
    const [hx, hz] = W(ST0 + 50 * STEP, AV[5]);                      // the hit: a crossing in Midtown, in the middle of an avenue
    this.hit = new THREE.Vector3(hx, 0, hz);
    this.dir = new THREE.Vector3(0, -1.7, -1).normalize();           // steep, coming from the south (from the moon), flying north down the avenue
    this.upP = new THREE.Vector3(0, 1, 0).addScaledVector(this.dir, -this.dir.y).normalize();
    R.add(this.sky, this.sun, this.sun.target);
    R.add(ground([hx, hz]));
    this.houses = buildings(); R.add(this.houses); noInk(this.houses);
    R.add(bridges());
    this.life = life([hx, hz]); R.add(this.life.group);
    console.log("city life", JSON.stringify(this.life.count));
    R.add(this.stroke.group, this.needle, this.glow);
    this.blast.group.position.copy(this.hit); R.add(this.blast.group);
    this.needle.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), this.dir);
  }

  private needleAlt(t: number) {
    if (t < T.dive) return 9000 - 1500 * (t / T.dive);                                   // slow motion: it barely moves
    if (t < T.back) { const x = (t - T.dive) / (T.back - T.dive), e = 0.4 * x + 0.6 * x * x; return 7500 * Math.pow(55 / 7500, e); }
    return Math.max(0, 55 * (1 - (t - T.back) / (T.hit - T.back)));
  }
  private needleAt(t: number) { const a = this.needleAlt(t); return this.hit.clone().addScaledVector(this.dir, -a / -this.dir.y); }
  private pose(pos: THREE.Vector3, look: THREE.Vector3, up: THREE.Vector3, fov: number): Pose {
    const d = this.dummy; d.position.copy(pos); d.up.copy(up); d.lookAt(look);
    return { pos: pos.clone(), q: d.quaternion.clone(), fov };
  }
  private high(t: number): Pose {                                                           // all of Manhattan, slowly drifting
    const a = t < T.dive ? 31500 - 1500 * sm(0, T.dive, t) : 30000 + 600 * sm(T.back, T.hit + 0.3, t);
    const r = -0.03 + 0.012 * t;
    return this.pose(new THREE.Vector3(250, a, 10500 * a / 31000), new THREE.Vector3(250, 0, 0), new THREE.Vector3(Math.sin(r), 0, -Math.cos(r)), 46);
  }
  private follow(t: number): Pose {                                                         // about 5 m behind the needle, a little above
    const N = this.needleAt(t);
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
    const N = this.needleAt(t), alt = cam.position.y, dN = cam.position.distanceTo(N);
    cam.near = clamp(Math.min(dN * 0.4, alt * 0.004), 0.05, 120); cam.far = alt * 5 + 8000;
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);

    // ---- the needle and its glow (same size on screen far away, small up close) ----
    this.needle.position.copy(N); this.needle.visible = t < T.hit;
    this.glow.position.copy(N); this.glow.visible = t < T.hit; this.glow.scale.setScalar(Math.max(0.22, dN * 0.016));

    // ---- the blast: a tiny white point at the needle that spreads (doubles about every 0.1 s) ----
    if (t >= T.hit) { const x = t - T.hit; this.blast.set(25 * Math.pow(2, x / 0.105), Math.min(1, x / 0.05)); } else this.blast.set(0, 0);

    // ---- the stroke: draws round the island; fades out on the way down, back on the way up ----
    const p = sm(T.strokeA, T.strokeB, t) * 1.07;
    this.stroke.set(p, alt * 0.0042, sm(5000, 15000, alt) * (1 - sm(T.hit + 0.25, T.hit + 0.55, t)));   // the blast swallows the stroke

    // ---- outlines on the buildings only when we are close (from 30 km they would be black mush) ----
    this.houses.layers.set(alt < 1500 ? 0 : NOINK);
    this.life.group.visible = alt < 4000; this.life.group.traverse((o) => o.layers.set(alt < 1500 ? 0 : NOINK)); if (this.life.group.visible) this.life.update(t);

    // ---- light, shadows, haze ----
    const fwd = cam.getWorldDirection(new THREE.Vector3()), gp = cam.position.clone();
    if (fwd.y < -0.05) gp.addScaledVector(fwd, -cam.position.y / fwd.y); gp.y = 0;
    this.sun.target.position.copy(gp); this.sun.target.updateMatrixWorld();
    const L = LIGHT.at(t);
    houseLight(L, { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t }, 4);
    const half = clamp(alt * 0.75, 120, 15000), sd = new THREE.Vector3(...sunDir(L)), sc = this.sun.shadow.camera;
    this.sun.position.copy(gp).addScaledVector(sd, 6000); this.sun.updateMatrixWorld();
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 50; sc.far = 13000; sc.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0001; this.sun.shadow.normalBias = (2 * half) / 4096 * 1.5; this.sun.shadow.radius = 1.5;
    this.sky.intensity = 0.35;
    scene.background = HAZE;
    this.fog.near = alt * 1.3; this.fog.far = alt * 1.3 + Math.max(alt * 8, 3000); scene.fog = this.fog;

    const focus = Math.max(0.3, dN);
    return { focus, cInf: 0 };
  }
}

// NEEDLE PREVIEW world: the moon, the stars, the Earth, our rocket, Max (gun + phone) and Ava in astronaut suits.
import * as THREE from "three";
import { NOINK } from "../../engine/post/ink";
import { Player3D, buildCast3d, loadCast3d, Cast3DSpec, Cast3DAssets } from "../../engine/cast/player3d";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { houseLight, headShadows } from "../../engine/outdoor";
import { PXM } from "../../engine/cast/player";
import { FACE, LIFE, SEED, LIGHT, SPOT, ROCKET, EARTH, SUN, Who, talkAt, lookAt, eyesAt, scrollAt, pickAt, pressAt, thumbAt } from "./story";
import { moonGround, rocks, stars, earth, sun, planets, galaxies, rocket, gun, phone, needleIcon, Gun, thumb, Thumb } from "./props";

export const CAST: Cast3DSpec = { max: { outfit: "astro_max" }, ava: { outfit: "astro_ava" } };
export const load = () => loadCast3d(CAST, { logo: "needle-preview/logo.png", bubble_max: "needle-preview/bubble_max.png", bubble_ava: "needle-preview/bubble_ava.png" });
const SPACE = new THREE.Color("#000000");      // black space (his choice for this video, 2026-11-16)

export class SimpleWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#cfd8ff", "#6a6878", 0.9);
  private people: Record<Who, Player3D>;
  private gun: Gun; private thumb: Thumb; private phone: THREE.Group;
  private glass: Record<Who, THREE.Mesh> = {} as any;
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3();

  constructor(A: Cast3DAssets) {
    const R = this.root;
    R.add(this.sky, this.sun, this.sun.target);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(moonGround()); rocks(R); R.add(stars()); R.add(earth(EARTH)); R.add(sun(SUN.az, SUN.el)); R.add(planets()); R.add(galaxies());
    const rk = rocket(A.imgs.logo as HTMLImageElement); rk.position.set(...ROCKET); rk.rotation.y = -0.35; R.add(rk);
    this.gun = gun(); this.gun.group.scale.setScalar(1.3); void needleIcon; R.add(this.gun.group);
    this.thumb = thumb(); this.gun.group.add(this.thumb.group);   // Max's gloved hand on the gun
    this.phone = phone(A.imgs.logo as HTMLImageElement); R.add(this.phone);
    const opt = (w: Who) => ({ life: LIFE[w], seed: SEED[w], face: FACE[w], blinks: "auto" as const, talk: (t: number) => talkAt(w, t),
      legs: { shoes: "#E9EBF2" } });
    this.people = {
      max: new Player3D(R, buildCast3d(A, "max"), "max", SPOT.max, 1, false, opt("max")),
      ava: new Player3D(R, buildCast3d(A, "ava"), "ava", SPOT.ava, 1, false, opt("ava")),
    };
    // clear bubble helmets: a see-through card over each head, flat to the camera like the head itself
    for (const w of ["max", "ava"] as Who[]) {
      const t = new THREE.Texture(A.imgs[`bubble_${w}`] as HTMLImageElement); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
      const g = new THREE.Mesh(new THREE.PlaneGeometry(600 * PXM, 1000 * PXM), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
      g.frustumCulled = false; g.layers.set(NOINK); g.name = w + " helmet"; g.userData.camFree = true; R.add(g); this.glass[w] = g;
    }
    this.people.max.body.name = "Max"; this.people.ava.body.name = "Ava";
  }

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    cam.getWorldDirection(this.fwd);
    this.sun.target.position.set(0, 0.5, 0); this.sun.target.updateMatrixWorld();
    houseLight(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t }, 7);
    scene.background = SPACE; this.sky.intensity = 0.55;
    const all = Object.entries(this.people) as [Who, Player3D][];
    all.forEach(([w, p], i) => {
      const [dx, dz] = lookAt(w, t); p.setLook(dx, dz);
      const ey = eyesAt(w, t); p.lookEyes(ey ? this.people[ey[0] as Who].eyePoint : null, ey ? ey[1] : 1);
      p.hand.L = p.restHand("L"); p.hand.R = p.restHand("R");
    });
    // Max: the gun in his right hand (pointing forward and out to his right), the phone in his left hand (its back to us)
    const M = this.people.max, L = M.lookDir().clone(), Rt = new THREE.Vector3(-L.z, 0, L.x), P = new THREE.Vector3(...M.pos);
    const grip = P.clone().addScaledVector(Rt, 0.21).addScaledVector(L, 0.16); grip.y = 0.5;
    M.hand.R = [grip.x, grip.y, grip.z];
    const dir = L.clone().addScaledVector(Rt, 0.9).normalize();
    this.gun.group.position.copy(grip); this.gun.group.rotation.set(0, Math.atan2(-dir.z, dir.x), 0.08);
    this.gun.menu(scrollAt(t), pickAt(t)); this.gun.press(...pressAt(t)); this.thumb.set(thumbAt(t));
    const ph = P.clone().addScaledVector(Rt, -0.2).addScaledVector(L, 0.2); ph.y = 0.6;
    M.hand.L = [ph.x, ph.y - 0.05, ph.z];
    this.phone.position.copy(ph); this.phone.rotation.set(-0.15, Math.atan2(-L.x, -L.z) + 0.25, 0);
    all.forEach(([, p], i) => p.update(t, cam, 0, 100 + i * 14));
    const cp = cam.position;
    all.forEach(([w, p], i) => {   // the helmet sits where the engine draws the head (neck point pulled 0.13 m toward the camera)
      const neck = p.bodyPoint(460, 0, 0), to = cp.clone().sub(neck), d = to.length(); to.normalize();
      const push = Math.min(0.135, d * 0.4), k = (d - push) / d, G = this.glass[w];
      G.quaternion.copy(cam.quaternion); G.scale.setScalar(k);
      G.position.copy(neck).addScaledVector(to, push).add(new THREE.Vector3(0, (460 - 500) * PXM * k, 0).applyQuaternion(cam.quaternion));
      G.renderOrder = 100 + i * 14 + 6;
    });
    { // POV: the camera sits at Max's eyes and looks down at the gun's small screen; his own head and helmet are hidden
      this.gun.group.updateMatrixWorld(true);
      const sp = new THREE.Vector3(); this.gun.group.getObjectByName("gun screen")!.getWorldPosition(sp);
      const eye = M.bodyPoint(460, 0, 0).clone().add(new THREE.Vector3(0, 0.16, 0));
      
      (M as any).headG.visible = false; this.glass.max.visible = false;
      const bx = new THREE.Vector3(1, 0, 0).transformDirection(this.gun.group.matrixWorld);
      // first-person life: a slow breathing sway, a small drift and a tiny dip with every button press (2026-11-16)
      const sw = (a: number, f: number, ph: number) => a * Math.sin(t * f * 2 * Math.PI + ph);
      const [pd, pe] = pressAt(t), dip = 0.006 * Math.max(pd, pe);
      const off = new THREE.Vector3(sw(0.007, 0.23, 0.4) + sw(0.003, 0.61, 2.1), sw(0.006, 0.31, 1.3) + sw(0.002, 0.87, 0.2) - dip, sw(0.007, 0.19, 2.7) + sw(0.003, 0.53, 1.0));
      const lk = new THREE.Vector3(sw(0.009, 0.17, 1.9), sw(0.006, 0.27, 0.7) - dip * 0.6, sw(0.01, 0.21, 3.3));
      cam.position.copy(eye).addScaledVector(bx, -0.04).add(new THREE.Vector3(0, 0.12, 0)).add(off);
      cam.up.set(sw(0.025, 0.13, 0.5), 1, sw(0.02, 0.11, 2.2)).normalize(); cam.lookAt(sp.clone().addScaledVector(bx, -0.07).add(lk));
      cam.fov = 50; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.getWorldDirection(this.fwd);
      c = { ...c, look: [sp.x, sp.y, sp.z], blur: 0 };
    }
    headShadows(Object.values(this.people).map((p) => p as any));
    const focus = Math.max(0.3, this.v.set(...c.look).sub(cam.position).dot(this.fwd));
    return { focus, cInf: c.blur };
  }
}

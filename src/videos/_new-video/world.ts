// THE WORLD (3D look): the place, the lights, the people, the props. update() places everything for time t.
// A general open place to start from: a floor, two walls, a small table, real light (sun + sky + soft all-round light),
// two people with 3D bodies and 2D heads. Replace the place and the props with your own; keep the light and people code.
// Rules of the 3D look: real materials (MR / MTR from kit.ts, never M / MT), no ink hulls on props, video.ts ink: false.
import * as THREE from "three";
import { NOINK } from "../../engine/post/ink";
import { Player3D, buildCast3d, loadCast3d, Cast3DSpec, Cast3DAssets } from "../../engine/cast/player3d";
import { MR, MTR, mkCanvas, canvasTex, popScale } from "../../engine/kit";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { houseLight } from "../../engine/outdoor";   // light with the HOUSE numbers (src/house/look.ts)
// PLACES (2026-11-16): streets, sidewalks, stairs, houses, shops, a bank, fences, cars: take them from src/engine/places.ts
//   (one call:  neighborhood(this.root, this.out, { houses: 4 })  or  mainStreet(...)). Example: src/videos/_places-test/world.ts.
//   Never build them here from boxes. Read src/house/START-HERE.md.
// AN OUTDOOR PLACE: see src/videos/_outdoor-test/world.ts. In short:  this.out = new Outdoor(this.root)  in the constructor and
//   this.out.light(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t })  instead of houseLight(...) below;
//   video.ts: near: 0.2, far: 900;  story.ts light: HOUSE.outdoor.light
import { BOX, FACE, LIFE, SEED, LIGHT, SPOT, Who, talkAt, lookAt, eyesAt } from "./story";

// who is in the video: library/cast/<name>; outfit = library/wardrobe3d/<outfit> (3D clothes); optional hat = library/hats/<hat>
// other skin colours: skin: [r, g, b] of the face picture; heads with sunglasses or a beard: pictureFaces: true
export const CAST: Cast3DSpec = { arian: { outfit: "luckytee" }, max: { outfit: "suit" } };
export const load = () => loadCast3d(CAST);                 // your own pictures: loadCast3d(CAST, { sign: "myvideo/sign.png" })

// a soft painted floor (fine noise, no lines); swap for your own
const floorTex = () => {
  const c = mkCanvas(512, 512), g = c.getContext("2d")!;
  g.fillStyle = "#B9A58E"; g.fillRect(0, 0, 512, 512);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "70,55,40" : "255,245,230"},${0.04 + 0.05 * r()})`; g.beginPath(); g.arc(r() * 512, r() * 512, 2 + 9 * r(), 0, 7); g.fill(); }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
};

export class SimpleWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#dfeeff", "#8a7a68", 0.9);
  private people: Record<Who, Player3D>;
  private box: THREE.Group;
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3();

  constructor(A: Cast3DAssets) {
    const R = this.root;
    R.add(this.sky, this.sun, this.sun.target);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096); this.sun.shadow.radius = 4;
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; R.add(o); return o;
    };
    // ---- the place ----
    const floor = add(new THREE.PlaneGeometry(14, 14), MTR(floorTex(), 0.9), 0, 0, 0); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
    add(new THREE.BoxGeometry(14, 3.5, 0.2), MR("#7FB2A8", 0.92), 0, 1.75, -2.4);        // back wall
    add(new THREE.BoxGeometry(0.2, 3.5, 8), MR("#E4A24A", 0.92), -3.2, 1.75, 0.8);       // side wall
    add(new THREE.BoxGeometry(14, 0.12, 0.06), MR("#F3EBDD", 0.6), 0, 0.06, -2.27);     // skirting board
    // a small round table (wood + metal)
    add(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 40), MR("#8A5A36", 0.55), 1.25, 0.62, -0.6);
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 16), MR("#3C3F46", 0.35, 0.8), 1.25, 0.3, -0.6);
    add(new THREE.CylinderGeometry(0.18, 0.2, 0.02, 32), MR("#3C3F46", 0.35, 0.8), 1.25, 0.01, -0.6);
    // ---- the people (standing; position = the floor point under them) ----
    const opt = (w: Who) => ({ life: LIFE[w], seed: SEED[w], face: FACE[w], blinks: "auto" as const, talk: (t: number) => talkAt(w, t) });
    this.people = {
      arian: new Player3D(R, buildCast3d(A, "arian"), "arian", SPOT.arian, 1, false, opt("arian")),
      max: new Player3D(R, buildCast3d(A, "max"), "max", SPOT.max, 1, false, { ...opt("max"), legs: { pants: "#25222F", shoes: "#16141c" } }),
    };
    // ---- an example prop: a box that pops in and out (popScale) ----
    this.box = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), MR("#D2553A", 0.6)); b.castShadow = b.receiveShadow = true; b.position.y = 0.11; this.box.add(b);
    this.box.position.set(...BOX.pos); R.add(this.box);
  }

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    // ---- camera ----
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.updateProjectionMatrix();   /* near / far come from video.ts (Fable5.2) */ cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    cam.getWorldDirection(this.fwd);
    // ---- light: the preset sets the sun, the sky colour and the light on the heads ----
    this.sun.target.position.set(0, 0.5, 0); this.sun.target.updateMatrixWorld();
    houseLight(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t }, 4);   // 4 = half-size of the shadow area, m
    // ---- people: where they look, hands at rest (move p.hand.L / p.hand.R to point, hold, wave) ----
    const all = Object.entries(this.people) as [Who, Player3D][];
    all.forEach(([w, p], i) => {
      const [dx, dz] = lookAt(w, t); p.setLook(dx, dz);
      const ey = eyesAt(w, t); p.lookEyes(ey ? this.people[ey[0] as Who].eyePoint : null, ey ? ey[1] : 1);   // talkers look at each other
      p.hand.L = p.restHand("L"); p.hand.R = p.restHand("R");
      p.update(t, cam, 0, 100 + i * 14);
    });
    // ---- props ----
    const s = popScale(t, BOX.a, BOX.b);
    this.box.visible = s > 0.01; this.box.scale.setScalar(Math.max(s, 0.001)); this.box.rotation.y = 0.4 + 0.2 * t;
    // ---- focus = the look point; blur grows away from it ----
    const focus = Math.max(0.3, this.v.set(...c.look).sub(cam.position).dot(this.fwd));
    return { focus, cInf: c.blur };
  }
}

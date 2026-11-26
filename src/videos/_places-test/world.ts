// PLACES TEST world: everything here comes from the place library. This is how a video uses it:
//   1. this.out = new Outdoor(root)                      sky, sun, clouds, haze, lamps (engine/outdoor.ts)
//   2. neighborhood(root, this.out, {...})               a whole place, one call (engine/places.ts)
//   3. stand the people on  place.walk[i]  or  place.doors[i]
import * as THREE from "three";
import { NOINK } from "../../engine/post/ink";
import { MR } from "../../engine/kit";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { Outdoor, castAll } from "../../engine/outdoor";
import { neighborhood, mainStreet, windowsLit, SIZE } from "../../engine/places";
import { LIGHT } from "./story";

export const load = async () => ({});

export class PlacesWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#dfeeff", "#8a7a68", 0.55);
  private out: Outdoor;
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3(); private cast = false;

  constructor() {
    const R = this.root;
    R.add(this.sky, this.sun, this.sun.target); this.sun.castShadow = true;
    this.out = new Outdoor(R);
    const hood = neighborhood(R, this.out, { houses: 4, seed: 3, climate: "temperate" });
    mainStreet(R, this.out, { z: -150, seed: 5, ground: false });
    // two plain figures as tall as the people (1.2 m), only to judge the scale of doors, steps and cars
    const [x, y, z] = hood.walk[1];
    for (const [dx, col] of [[-0.4, "#D9A441"], [0.4, "#3F6FA8"]] as [number, string][]) {
      const g = new THREE.Group(); g.name = "scaleFigure"; g.position.set(x + dx, y, z); R.add(g);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, SIZE.person - 0.62, 6, 14), MR(col, 0.8)); body.position.y = (SIZE.person - 0.3) / 2; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), MR("#F1D9B5", 0.8)); head.position.y = SIZE.person - 0.19; g.add(head);
    }
  }

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK); cam.getWorldDirection(this.fwd);
    if (!this.cast) { this.cast = true; castAll(scene); }
    this.out.light(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t });
    windowsLit(this.out.night);
    const focus = Math.max(0.3, this.v.set(...c.look).sub(cam.position).dot(this.fwd));
    return { focus, cInf: c.blur };
  }
}

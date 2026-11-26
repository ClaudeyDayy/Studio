// TREE SHEET: every tree kind in a row (top), then one row per climate. Stills only: node render.mjs 0
import * as THREE from "three";
import { defineVideo } from "../../engine/video";
import { HOUSE } from "../../house/look";
import { lightTrack } from "../../engine/core/lights";
import { MR, noInk } from "../../engine/kit";
import { Outdoor, castAll } from "../../engine/outdoor";
import { makeTree, scatterTrees, TreeKind, Climate } from "../../engine/trees";
const LIGHT = lightTrack([[0, HOUSE.outdoor.light]]);
const pose = { pos: [0, 16, 34] as [number, number, number], look: [0, 1, -6] as [number, number, number], fov: 40, blur: 0, space: "x", shot: 0 };
class W { root = new THREE.Group(); sun = new THREE.DirectionalLight(); hemi = new THREE.HemisphereLight("#dfeeff", "#8a7a68", 0.55); out: Outdoor; done = false;
  constructor() { const R = this.root; R.add(this.sun, this.sun.target, this.hemi); this.sun.castShadow = true; this.out = new Outdoor(R);
    const g = noInk(new THREE.Mesh(new THREE.PlaneGeometry(900, 900), MR("#7FB45A", 0.95))); g.rotation.x = -Math.PI / 2; R.add(g);
    (["oak", "umbrella", "pine", "cypress", "birch", "palm", "cactus", "bush", "bare"] as TreeKind[]).forEach((k, i) => { const t = makeTree(k, i + 3); t.position.set(-10 + i * 2.5, 0, 14); R.add(t); });
    (Object.keys(HOUSE.trees.climates) as Climate[]).forEach((c, j) => scatterTrees(R, c, Array.from({ length: 9 }, (_, i) => [-12 + i * 3 + (j % 2), 6 - j * 6.5] as [number, number]), j + 2)); }
  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: any) { cam.position.set(...(c.pos as [number, number, number])); cam.lookAt(...(c.look as [number, number, number])); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(3);
    if (!this.done) { this.done = true; castAll(scene); } this.out.light(LIGHT.at(t), { sun: this.sun, hemi: this.hemi, scene, cam, pose: c, t }); (this.sun.shadow.camera as any).left = -30; (this.sun.shadow.camera as any).right = 30; (this.sun.shadow.camera as any).top = 30; (this.sun.shadow.camera as any).bottom = -30; this.sun.shadow.camera.updateProjectionMatrix(); return { focus: 30, cInf: 0 }; } }
export default defineVideo({ fps: 30, total: 30, ink: true, inkOptions: HOUSE.line, env: 0.55, bloom: HOUSE.bloom, near: 0.2, far: 900, gradeAt: LIGHT.gradeAt, camAt: () => pose as any, caps: [], load: async () => ({}), makeWorld: () => new W() as any });

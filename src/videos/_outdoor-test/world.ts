// A general street to test the outdoor look. Replace with your own place.
// HOUSE RULE: big surfaces (walls, roofs, ground, road) = noInk + texture. Small details (walkway, doors, windows, awnings,
// posts, lamps, bulbs, crates, signs, trees) = outlined.
import * as THREE from "three";
import { NOINK } from "../../engine/post/ink";
import { Player3D, buildCast3d, loadCast3d, Cast3DSpec, Cast3DAssets } from "../../engine/cast/player3d";
import { MR, MTR, mkCanvas, canvasTex, onGround, noInk } from "../../engine/kit";
import { scatterTrees } from "../../engine/trees";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { Outdoor, castAll, headShadows, brickTex, plankTex, plasterTex } from "../../engine/outdoor";
import { FACE, LIFE, SEED, LIGHT, SPOT, WEATHER, Who } from "./story";

export const CAST: Cast3DSpec = { arian: { outfit: "luckytee" }, max: { outfit: "suit" } };
export const load = () => loadCast3d(CAST);
let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
// painted ground: one flat colour with soft blotches and small pebbles / tufts (the reference grounds are not noisy)
const groundTex = (base: string, dark: string, light: string, rep: number) => {
  const c = mkCanvas(1024, 1024), g = c.getContext("2d")!; g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? dark : light; g.globalAlpha = 0.05 + 0.06 * r(); g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 20 + 70 * r(), 10 + 30 * r(), r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.6 ? dark : light; g.globalAlpha = 0.25 + 0.3 * r(); g.beginPath(); g.arc(r() * 1024, r() * 1024, 1 + 2.5 * r(), 0, 7); g.fill(); }
  g.globalAlpha = 1; const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t;
};

export class StreetWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#dfeeff", "#8a7a68", 0.55);
  private out: Outdoor;
  private people: Record<Who, Player3D>;
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3(); private cast = false;

  constructor(A: Cast3DAssets) {
    const R = this.root;
    R.add(this.sky, this.sun, this.sun.target); this.sun.castShadow = true;
    this.out = new Outdoor(R);
    const box = (w: number, h: number, d: number, col: string, x: number, y: number, z: number, name?: string, rough = 0.85) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MR(col, rough)); o.position.set(x, y, z); if (name) o.name = name; R.add(o); return o; };
    // ---- BIG SURFACES: no outlines (noInk), textured. Ground: one mesh; the road lies on it (onGround) ----
    const ground = noInk(new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), MTR(groundTex("#B08A5E", "#7A5C3C", "#D2B486", 260), 0.95))); ground.rotation.x = -Math.PI / 2; ground.name = "ground"; R.add(ground);
    const road = noInk(onGround(new THREE.Mesh(new THREE.PlaneGeometry(5.2, 400), MTR(groundTex("#9C7850", "#6A4E34", "#BFA078", 1), 0.95)), 1)); (road.material as THREE.MeshStandardMaterial).map!.repeat.set(2, 90); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.012, -150); road.name = "road"; R.add(road);
    const wall = (kind: number, col: string, w: number, h: number) => { const t = kind === 0 ? brickTex(col) : kind === 1 ? plankTex(col, 8) : plasterTex(col); t.repeat.set(w / (kind === 2 ? 3 : 2), h / (kind === 2 ? 3 : 2)); if (kind === 1) { t.rotation = Math.PI / 2; t.repeat.set(h / 2, w / 2); } return MTR(t, 0.9); };
    const cols = ["#B5483C", "#3F6FA8", "#D9A441", "#5E8C6A", "#8A5A9A", "#C96F3B", "#4A8F96", "#A8503E"];
    const doorM = MTR(plankTex("#6A4630", 4), 0.8), walkT = plankTex("#A67C52", 7); walkT.repeat.set(1, 28); const walkM = MTR(walkT, 0.85);
    for (let side = -1; side <= 1; side += 2) {
      // ---- DETAILS: outlined. A raised wooden walkway along the houses ----
      const walk = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 58), walkM); walk.position.set(side * 3.6, 0.07, -24); walk.name = "walkway"; R.add(walk);
      for (let i = 0; i < 9; i++) {
        const w = 4 + 2 * r(), h = 3 + 2.6 * r(), z = 1 - i * 6.2, col = cols[(i * 3 + (side > 0 ? 1 : 0)) % cols.length], x = side * 7.1;
        const b = noInk(new THREE.Mesh(new THREE.BoxGeometry(5, h, w), wall((i + (side > 0 ? 1 : 0)) % 3, col, w, h))); b.position.set(x, h / 2, z); b.name = "house" + i; R.add(b);
        if (i % 3 === 1) {   // a pitched roof on some houses (roof tiles as planks), no outline
          const rt = plankTex("#8C4A3A", 9); rt.repeat.set(2.5, 1);
          const roof = noInk(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 3.2, 1.5, 4, 1), MTR(rt, 0.9))); roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, w / 4.4); roof.position.set(x, h + 0.75, z); roof.name = "roof"; R.add(roof);
        } else noInk(box(5.3, 0.25, w + 0.3, "#EDE3D0", x, h + 0.12, z, "roofEdge"));
        const fx = side * 4.58;   // the front face of the house
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.35, 0.8), doorM); door.position.set(fx, 0.82, z + 1.1); door.name = "door"; R.add(door);
        box(0.14, 1.5, 0.08, "#EDE3D0", fx, 0.85, z + 0.66, "doorFrame"); box(0.14, 1.5, 0.08, "#EDE3D0", fx, 0.85, z + 1.54, "doorFrame"); box(0.14, 0.08, 0.96, "#EDE3D0", fx, 1.56, z + 1.1, "doorFrame");
        box(0.06, 0.06, 0.06, "#E2B23C", fx - side * 0.07, 0.8, z + 0.82, "knob", 0.3);
        for (let k = 0; k < (h > 4.4 ? 2 : 1); k++) { const wy = 1.35 + 1.6 * k, wz = z - 0.8;
          box(0.08, 0.8, 0.9, "#9FD4E8", fx, wy, wz, "window", 0.2); box(0.12, 0.08, 1.06, "#EDE3D0", fx, wy + 0.44, wz, "frame"); box(0.14, 0.1, 1.12, "#EDE3D0", fx, wy - 0.45, wz, "sill");
          box(0.12, 0.8, 0.06, "#EDE3D0", fx, wy, wz, "bar"); box(0.12, 0.06, 0.9, "#EDE3D0", fx, wy, wz, "bar");
          box(0.07, 0.86, 0.3, i % 2 ? "#3E7A5A" : "#B5483C", fx, wy, wz - 0.62, "shutter"); box(0.07, 0.86, 0.3, i % 2 ? "#3E7A5A" : "#B5483C", fx, wy, wz + 0.62, "shutter"); }
        box(1.7, 0.07, 2.6, i % 2 ? "#E8E2D2" : "#C7423A", side * 3.75, 2.15, z, "awning");
        box(0.09, 2.05, 0.09, "#5A4030", side * 2.95, 1.1, z + 1.2, "post"); box(0.09, 2.05, 0.09, "#5A4030", side * 2.95, 1.1, z - 1.2, "post");
        if (i % 2 === 0) { box(0.5, 0.42, 0.5, "#8A6238", side * 3.2, 0.35, z - 2.2, "crate"); box(0.05, 0.3, 0.9, "#E9DCC0", fx - side * 0.03, 2.55, z + 1.1, "sign", 0.7); }
      }
    }
    // ---- trees: the place's own kinds (HOUSE.trees), varied, never identical ----
    scatterTrees(R, "temperate", [[-2.3, -4], [2.3, -11.5], [-2.3, -19], [2.3, -26.5], [-2.4, -34], [2.4, -41], [-13, -6], [14, -14], [-15, -24], [13, -30], [0, -62], [-6, -66], [7, -70]], 5);
    // ---- street lamps: one call each; they switch on by themselves when it gets dark (HOUSE.lamps) ----
    for (let i = 0; i < 5; i++) this.out.lamp((i % 2 ? -1 : 1) * 2.5, 0.5 - i * 9, { real: i < 4 });
    const opt = (w: Who) => ({ life: LIFE[w], seed: SEED[w], face: FACE[w], blinks: "auto" as const });
    this.people = {
      arian: new Player3D(R, buildCast3d(A, "arian"), "arian", SPOT.arian, 1, false, opt("arian")),
      max: new Player3D(R, buildCast3d(A, "max"), "max", SPOT.max, 1, false, { ...opt("max"), legs: { pants: "#25222F", shoes: "#16141c" } }),
    };
  }

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK); cam.getWorldDirection(this.fwd);
    if (!this.cast) { this.cast = true; castAll(scene); }
    // ---- the outdoor light, sky, clouds, haze, shafts, weather: one call, house numbers ----
    const [wk, wa] = WEATHER(t); this.out.weather(wk, wa);
    this.out.light(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t });
    const all = Object.values(this.people);
    all.forEach((p, i) => { p.setLook(0, 1); p.hand.L = p.restHand("L"); p.hand.R = p.restHand("R"); p.update(t, cam, 0, 100 + i * 14); });
    headShadows(all);
    const focus = Math.max(0.3, this.v.set(...c.look).sub(cam.position).dot(this.fwd));
    return { focus, cInf: c.blur };
  }
}

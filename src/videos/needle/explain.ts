// THE EXPLAINER PART (50.5-63.0 s): the pebble example, shown literally. Bright daylight road, low camera.
//   0-3.4   a pebble lies on the road, a car rolls past; nothing happens ("It does nothing")
//   3.4-7.3 a truck passes the other way, a pebble flies from its window and cracks the car's windshield
//   7.3-9.6 "speed matters more than size": a big slow rock bumps a wall (nothing), a small fast speck hits the other wall (boom)
//   9.6-12.5 near light speed: the speck is a streak and the wall goes up in a white bomb flash
import * as THREE from "three";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { houseLight } from "../../engine/outdoor";
import { mkCanvas, canvasTex, noInk, MR } from "../../engine/kit";
import { glowSprite, blast } from "./parts/cityhit/world";
import { LIGHT } from "./story";

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const SKY = new THREE.Color("#9CC8F2");
const box = (w: number, h: number, d: number, c: string, x: number, y: number, z: number, rough = 0.6) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MR(c, rough)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };

function roadTex() {
  const c = mkCanvas(512, 512), g = c.getContext("2d")!; g.fillStyle = "#4A4C54"; g.fillRect(0, 0, 512, 512);
  let q = 5; const r = () => ((q = (q * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 4000; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.12)"; g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3); }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 3); return t;
}
function crackTex() {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!; g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 3; g.lineCap = "round";
  let q = 11; const r = () => ((q = (q * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28 + r() * 0.3; let x = 128, y = 128; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { const L = 22 + r() * 26; x += Math.cos(a + (r() - 0.5) * 0.5) * L; y += Math.sin(a + (r() - 0.5) * 0.5) * L; g.lineTo(x, y); } g.stroke(); }
  g.lineWidth = 2; for (const R of [24, 46, 70]) { g.beginPath(); g.arc(128, 128, R, 0, 7); g.stroke(); }
  return canvasTex(c);
}
function car(body: string) {
  const G = new THREE.Group(), glass = new THREE.MeshStandardMaterial({ color: "#9CCBE8", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  G.add(box(4.2, 0.7, 1.8, body, 0, 0.55, 0), box(2.2, 0.08, 1.8, body, -0.15, 1.84, 0));              // body, roof
  for (const [x, z] of [[0.95, 0.85], [0.95, -0.85], [-1.2, 0.85], [-1.2, -0.85]]) G.add(box(0.09, 1.0, 0.09, body, x, 1.32, z));   // pillars
  const pane = (w: number, h: number, x: number, z: number, ry: number, name = "") => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass); p.position.set(x, 1.32, z); p.rotation.y = ry; p.name = name; noInk(p); G.add(p); };
  pane(1.7, 0.95, 0.95, 0, Math.PI / 2, "windshield"); pane(1.7, 0.95, -1.2, 0, Math.PI / 2); pane(2.15, 0.95, -0.12, 0.85, 0); pane(2.15, 0.95, -0.12, -0.85, 0);
  // inside: dashboard, seats, steering wheel, a driver (on the side we see: local z = -0.4)
  G.add(box(0.35, 0.3, 1.6, "#2A2B33", 0.78, 1.0, 0), box(1.0, 0.1, 1.6, "#2A2B33", -0.3, 0.92, 0));
  for (const z of [-0.4, 0.4]) { G.add(box(0.55, 0.16, 0.55, "#3A3C48", -0.2, 0.98, z), box(0.12, 0.7, 0.55, "#3A3C48", -0.55, 1.4, z)); }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.028, 10, 24), MR("#15151A", 0.7)); wheel.position.set(0.5, 1.35, -0.4); wheel.rotation.set(0.5, Math.PI / 2, 0); G.add(wheel);
  const skin = "#E8B88A", shirt = "#F07A1E";
  G.add(box(0.3, 0.55, 0.42, shirt, -0.28, 1.45, -0.4), box(0.5, 0.16, 0.16, "#2C3A5C", 0.05, 1.12, -0.5), box(0.5, 0.16, 0.16, "#2C3A5C", 0.05, 1.12, -0.3));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), MR(skin, 0.7)); head.position.set(-0.22, 1.9 - 0.12, -0.4); head.castShadow = true; G.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.255, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), MR("#3A2A1E", 0.9)); hair.position.copy(head.position).add(new THREE.Vector3(-0.02, 0.03, 0)); G.add(hair);
  for (const dz of [-0.17, 0.17]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 10), MR(shirt, 0.7)); arm.position.set(0.15, 1.42, -0.4 + dz); arm.rotation.z = Math.PI / 2 - 0.5; G.add(arm); }
  for (const [x, z] of [[-1.4, 0.95], [1.4, 0.95], [-1.4, -0.95], [1.4, -0.95]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 20), MR("#16161C", 0.8)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.38, z); G.add(w); }
  return G;
}
// trees of several kinds: round, pine, tall poplar, bush, autumn
function tree(kind: number, s: number) {
  const G = new THREE.Group(), trunk = (h: number, w: number, c = "#6B4A2E") => { const m = box(w, h, w, c, 0, h / 2, 0); return m; };
  if (kind === 0) { G.add(trunk(3.4, 0.5)); const l = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), MR("#3F7A3A", 0.9)); l.position.y = 4.2; l.castShadow = true; G.add(l); }
  else if (kind === 1) { G.add(trunk(1.6, 0.4)); for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(2.0 - i * 0.4, 2.2, 10), MR(i % 2 ? "#2D6A3E" : "#255A36", 0.9)); c.position.y = 2.2 + i * 1.3; c.castShadow = true; G.add(c); } }
  else if (kind === 2) { G.add(trunk(1.5, 0.35)); const l = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), MR("#5E9A3C", 0.9)); l.scale.set(1, 3.4, 1); l.position.y = 4.4; l.castShadow = true; G.add(l); }
  else if (kind === 3) { for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 - i * 0.12, 1), MR(i ? "#4C8A3A" : "#3A7434", 0.95)); l.position.set((i - 1) * 0.9, 0.7, (i % 2) * 0.4); G.add(l); } }
  else { G.add(trunk(3.0, 0.45)); const l = new THREE.Mesh(new THREE.IcosahedronGeometry(2.0, 1), MR(["#D9822B", "#C8472B", "#E3B034"][Math.floor(s * 7) % 3], 0.9)); l.position.y = 3.9; l.castShadow = true; G.add(l); }
  G.scale.setScalar(s); return G;
}

export class ExplainWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff4e0", 3.0);
  private sky = new THREE.HemisphereLight("#cfe4ff", "#7a7468", 0.9);
  private car = car("#D84A3A"); private truck = new THREE.Group(); private pebble: THREE.Mesh; private pebble2: THREE.Mesh;
  private crack: THREE.Mesh; private rock: THREE.Mesh; private speck: THREE.Mesh; private streak: THREE.Mesh; private wallA: THREE.Mesh; private wallB: THREE.Mesh;
  private bl = blast(); private flash = glowSprite(); private v = new THREE.Vector3(); private fwd = new THREE.Vector3();

  constructor() {
    const R = this.root; R.add(this.sky, this.sun, this.sun.target);
    this.sun.position.set(-20, 30, 15); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 12), new THREE.MeshStandardMaterial({ map: roadTex(), roughness: 0.9 })); road.rotation.x = -Math.PI / 2; road.receiveShadow = true; noInk(road); R.add(road);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 140), MR("#5E8F4A", 1)); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02; grass.receiveShadow = true; noInk(grass); R.add(grass);
    for (let x = -190; x < 190; x += 7) { const l = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.18), MR("#F2EED8", 0.8)); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.01, 0); noInk(l); R.add(l); }
    let q = 17; const rnd = () => ((q = (q * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const x = -130 + rnd() * 260, side = rnd() < 0.8 ? -1 : 1, z = side < 0 ? -9 - rnd() * 30 : 9.5 + rnd() * 6;
      const kind = Math.floor(rnd() * 5), t = tree(kind, 0.7 + rnd() * 0.9); t.position.set(x, 0, z); t.rotation.y = rnd() * 6; R.add(t);
    }
    this.car.position.set(0, 0, 2.6); R.add(this.car);
    // the truck: cab and box, driving the other way
    this.truck.add(box(7, 3.2, 2.5, "#E8E6E0", -1.5, 2.5, 0), box(2.4, 2.3, 2.5, "#2F5FA8", 2.9, 1.9, 0), box(8.5, 0.4, 2.4, "#2B2C32", -0.3, 0.7, 0));
    for (const x of [-3.6, -1.6, 2.4]) for (const z of [1.25, -1.25]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 20), MR("#15151A", 0.8)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.55, z); this.truck.add(w); }
    this.truck.rotation.y = Math.PI; R.add(this.truck);
    this.pebble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 1), MR("#8A857C", 0.9)); this.pebble.castShadow = true; R.add(this.pebble);
    this.pebble2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 1), MR("#8A857C", 0.9)); this.pebble2.castShadow = true; R.add(this.pebble2);
    this.crack = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false })); this.crack.rotation.y = Math.PI / 2; noInk(this.crack); this.car.add(this.crack);
    this.rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), MR("#7C766C", 0.95)); this.rock.castShadow = true; R.add(this.rock);
    this.speck = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), new THREE.MeshBasicMaterial({ color: "#FFE9B8", toneMapped: false })); R.add(this.speck);
    this.streak = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.1, 1.5), toneMapped: false, transparent: true, opacity: 0.9 })); noInk(this.streak); R.add(this.streak);
    this.wallA = box(4.4, 3.5, 0.6, "#B7B2A8", -3.2, 1.75, -8); this.wallB = box(4.4, 3.5, 0.6, "#B7B2A8", 3.2, 1.75, -8); R.add(this.wallA, this.wallB);
    this.bl.group.visible = false; R.add(this.bl.group); this.flash.visible = false; R.add(this.flash);
  }

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    cam.near = 0.1; cam.far = 900; scene.background = SKY; (scene as any).fog = new THREE.Fog(SKY, 80, 320);
    this.sun.target.position.set(0, 0, 0); this.sun.target.updateMatrixWorld();
    const stage = t >= 7.3;
    this.car.visible = !stage; this.truck.visible = !stage;
    this.rock.visible = stage; this.speck.visible = false; this.wallA.visible = stage; this.wallB.visible = stage && t < 11.95;
    this.streak.visible = false; this.bl.group.visible = false; this.flash.visible = false;
    // beats 1-2: the car drives from the right to the left and parks at x = -4 (nose to the left); a pebble lies on the road
    this.car.rotation.y = Math.PI; this.car.position.set(t < 3.4 ? 14 - 5.3 * t : -4, 0, 2.6);
    if (t >= 3.4) this.car.position.x = Math.max(-4, 14 - 5.3 * 3.4 - 12 * (t - 3.4)); this.car.position.x = Math.max(-4, this.car.position.x);
    this.pebble.position.set(0, 0.08, 2.0); this.pebble.visible = t < 7.3;
    // the truck comes from the left on the far lane, a pebble leaves its window and hits the windshield at t = 5.6
    const truckX = -50 + 12 * Math.max(0, t - 3.0); this.truck.position.set(truckX, 0, -2.6);
    const th = sm(4.3, 5.6, t); this.pebble2.visible = t >= 4.3 && t < 5.62;
    this.pebble2.position.set(truckX + 4 + (-4.9 - truckX - 4) * th, 2.0 - 0.7 * th + Math.sin(th * Math.PI) * 0.5, -2.6 + 5.0 * th);
    this.crack.visible = t > 5.62; this.crack.position.set(0.95, 1.25, 0); this.crack.scale.setScalar(0.6 + 0.4 * sm(5.62, 5.8, t));
    // beat 3: a big slow rock reaches the left wall (nothing), a small fast speck hits the right wall (a small flash)
    this.rock.position.set(-3.2, 1.3, 3 - 10.2 * sm(7.5, 9.5, t)); this.rock.rotation.z = -t * 0.8;
    if (stage && t < 9.6) { this.speck.visible = t < 8.4; this.speck.position.set(3.2, 1.8, 3 - 10.6 * sm(8.0, 8.35, t)); if (t >= 8.35) { this.flash.visible = true; this.flash.position.set(3.2, 1.8, -7.5); this.flash.scale.setScalar(1.4 * (1 - sm(8.35, 9.0, t)) + 0.01); } }
    // beat 4: near light speed. A white streak, then the wall goes up in a bomb flash
    const hit = 11.95;
    if (t >= 9.6 && t < hit) { this.streak.visible = true; this.streak.rotation.y = Math.PI / 2; const u = sm(9.6, hit - 0.05, t); this.streak.scale.set(7, 1, 1); this.streak.position.set(3.2, 1.8, 10 - 18 * u + 3.5); }
    if (t >= hit) { const k = t - hit; this.bl.group.visible = true; this.bl.group.position.set(3.2, 0, -8); this.bl.set(0.5 + 5 * (1 - Math.exp(-k * 6)), 1); this.flash.visible = true; this.flash.position.set(3.2, 2.2, -7.5); this.flash.scale.setScalar(2 + 7 * k); }
    let cx = 0, cy = 2.2, cz = 11, lx = 0, ly = 1.3, lz = 0, fov = 46;
    if (t < 3.4) { cx = 2.5 - 0.3 * t; cy = 0.55; cz = 4.6; lx = 0; ly = 0.2; lz = 2.0; fov = 42; }
    else if (t < 7.3) { cx = -8.3; cy = 2.3; cz = 6.2; lx = -3.7; ly = 1.5; lz = 2.8; fov = 40; }
    else if (t < 9.6) { cx = 0; cy = 2.6; cz = 7.5; lx = 0; ly = 1.7; lz = -8; fov = 56; }
    else { cx = 0.5; cy = 2.3; cz = 4.5; lx = 3.2; ly = 1.8; lz = -8; fov = 50; }
    cam.position.set(cx, cy, cz); cam.up.set(0, 1, 0); cam.lookAt(lx, ly, lz); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.getWorldDirection(this.fwd);
    houseLight(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t }, 7);
    scene.background = SKY;
    const focus = Math.max(0.3, this.v.set(lx, ly, lz).sub(cam.position).dot(this.fwd));
    return { focus, cInf: 0 };
  }
}

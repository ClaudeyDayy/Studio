// THE ENDING (67.35-69.56 s): the mountain reaches the Earth. White flash at 68.1, then the planet blows apart: chunks flying outward
// with a glowing core, a ring running out, and a long white-hot glow. The video ends on this (no loop).
import * as THREE from "three";
import { NOINK } from "../../engine/post/ink";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { houseLight } from "../../engine/outdoor";
import { mkCanvas, canvasTex, noInk } from "../../engine/kit";
import { LIGHT, SUN } from "./story";
import { stars, earth, sun, galaxies } from "./props";
import { glowSprite } from "./parts/cityhit/world";
import { mountainModel } from "./space";

const HIT = 0.75;                 // local time of the impact (68.10 s)
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
function fire() {
  const c = mkCanvas(256, 256), g = c.getContext("2d")!, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,235,1)"); gr.addColorStop(0.25, "rgba(255,200,110,0.85)"); gr.addColorStop(0.6, "rgba(255,110,30,0.35)"); gr.addColorStop(1, "rgba(200,40,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(c), transparent: true, depthWrite: false, toneMapped: false, fog: false, blending: THREE.AdditiveBlending }));
  s.renderOrder = 950; s.userData.camFree = true; noInk(s); return s;
}
export class FinaleWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#cfd8ff", "#262838", 0.6);
  private earth: THREE.Group; private mount = mountainModel(); private trail: THREE.Sprite; private core = fire(); private ring: THREE.Mesh;
  private chunks: { m: THREE.Mesh; p0: THREE.Vector3; v: THREE.Vector3; s: number; spin: THREE.Vector3 }[] = [];
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3();
  constructor() {
    const R = this.root; R.add(this.sky, this.sun, this.sun.target);
    const s1 = stars(), s2 = stars(); s2.rotation.x = Math.PI; s2.rotation.y = 1.3; R.add(s1, s2, galaxies(), sun(SUN.az, SUN.el));
    this.earth = earth([0, 0, 0], 7); R.add(this.earth);
    R.add(this.mount); this.trail = glowSprite(); R.add(this.trail); R.add(this.core);
    let q = 31; const r = () => ((q = (q * 16807) % 2147483647) / 2147483647);
    const cols = ["#2B6CB8", "#3F8C4A", "#B58A52", "#E7ECF4", "#8C5A3A", "#1E4F8F"];
    for (let i = 0; i < 90; i++) {
      const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), sz = 0.35 + r() * r() * 1.5;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(sz * 0.6, 0), new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.8, emissive: "#FF5A10", emissiveIntensity: 0.0 }));
      m.position.copy(dir).multiplyScalar(6.2 * r()); this.chunks.push({ m, p0: m.position.clone(), v: dir.clone().multiplyScalar(5 + r() * 16), s: sz, spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(4) });
      m.visible = false; m.userData.camFree = true; R.add(m);
    }
    const rc = mkCanvas(512, 512), rg = rc.getContext("2d")!, rr = rg.createRadialGradient(256, 256, 170, 256, 256, 256);
    rr.addColorStop(0, "rgba(255,255,255,0)"); rr.addColorStop(0.8, "rgba(255,220,170,0.35)"); rr.addColorStop(0.95, "rgba(255,255,240,1)"); rr.addColorStop(1, "rgba(255,255,255,0)");
    rg.fillStyle = rr; rg.fillRect(0, 0, 512, 512);
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: canvasTex(rc), transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    noInk(this.ring); this.ring.layers.set(NOINK); this.ring.visible = false; R.add(this.ring);
  }
  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    cam.near = 0.1; cam.far = 900;
    const k = Math.max(0, t - HIT);
    // the mountain: a very fast approach along a line into the Earth's upper left
    const from = new THREE.Vector3(-10, 5, 16), to = new THREE.Vector3(-4.8, 3.6, 3.0), u = clamp(t / HIT, 0, 1), e = u * u;
    const mp = from.clone().lerp(to, e), md = to.clone().sub(from).normalize();
    this.mount.visible = t < HIT; this.mount.position.copy(mp); this.mount.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), md); this.mount.scale.setScalar(1.6);
    this.trail.visible = t < HIT && u > 0.25; this.trail.position.copy(mp).addScaledVector(md, -3); this.trail.scale.set(9 * u, 2.2, 1); this.trail.material.color.setScalar(1.6);
    this.earth.visible = t < HIT + 0.06; this.earth.rotation.y = t * 0.15;
    // the break-up
    for (const ch of this.chunks) {
      ch.m.visible = k > 0.02; const d = 1 - Math.exp(-k * 1.6);
      ch.m.position.copy(ch.p0).addScaledVector(ch.v, d * 1.2);
      ch.m.rotation.set(ch.spin.x * k, ch.spin.y * k, ch.spin.z * k);
      (ch.m.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.max(0, 1.6 - k * 1.1);
    }
    this.core.visible = k > 0; this.core.position.set(0, 0, 0); this.core.scale.setScalar(5 + 20 * (1 - Math.exp(-k * 2.0))); this.core.material.color.setScalar(1.5 * Math.max(0.4, 1 - k * 0.4));
    this.ring.visible = k > 0; this.ring.quaternion.copy(cam.quaternion); this.ring.scale.setScalar(4 + 55 * (1 - Math.exp(-k * 2.4))); (this.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - k * 0.7);
    cam.position.set(1.0 - 0.15 * t, 2.2, 36 - 0.5 * t); cam.up.set(0, 1, 0); cam.lookAt(0, 0.3, 0); cam.fov = 42; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK); cam.getWorldDirection(this.fwd);
    this.sun.target.position.set(0, 0, 0); this.sun.target.updateMatrixWorld();
    houseLight(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t }, 7);
    scene.background = new THREE.Color("#000000"); this.sky.intensity = 0.4;
    const focus = Math.max(0.3, this.v.set(0, 0, 0).sub(cam.position).dot(this.fwd));
    return { focus, cInf: 0 };
  }
}

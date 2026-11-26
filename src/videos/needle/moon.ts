// THE MOON PART: Max and Ava in astronaut suits next to our rocket, the light-speed gun (needle, phone, then its menu: whale, mountain).
// One world for every moon beat (third person shots) and for Max's eye view of the gun (space "pov").
import * as THREE from "three";
import { NOINK } from "../../engine/post/ink";
import { smooth } from "../../engine/core/util";
import { Player3D, buildCast3d, loadCast3d, Cast3DSpec, Cast3DAssets } from "../../engine/cast/player3d";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { houseLight, headShadows } from "../../engine/outdoor";
import { CARD_LIGHT } from "../../engine/cast/cardlight";
import { PXM } from "../../engine/cast/player";
import { FACE, LIFE, SEED, LIGHT, SPOT, ROCKET, ROCKET_YAW, EARTH, SUN, NEEDLE_POS, FIRES, MOON_PHONE, Who, talkAt, maxAt, doorAt, scrollAt, pickAt, pressAt, thumbAt } from "./story";
import { moonGround, rocks, stars, earth, sun, planets, galaxies, rocket, gun, phone, needleIcon, thumb, Gun, Thumb } from "./props";
import { glowSprite } from "./parts/cityhit/world";
import { needleModel } from "./space";

const houseCharSun = () => { CARD_LIGHT.uCardGrad.value *= 2.0; const c = CARD_LIGHT.uCardTint.value; c.set(c.x * 1.06, c.y * 1.03, c.z * 0.97); };
export const CAST: Cast3DSpec = { max: { outfit: "astro_max" }, ava: { outfit: "astro_ava", pictureFaces: true } };
export const load = () => loadCast3d(CAST, { logo: "needle-preview/logo.png", bubble_max: "needle-preview/bubble_max.png", bubble_ava: "needle-preview/bubble_ava.png" });
const SPACE = new THREE.Color("#000000");
const phoneIcon = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#C9D2E0"; g.beginPath(); g.roundRect(-38, -75, 76, 150, 12); g.fill();
  g.fillStyle = "#0B1C34"; g.beginPath(); g.roundRect(-31, -66, 62, 128, 8); g.fill();
  g.fillStyle = "#33E1FF"; g.fillRect(-18, 52, 36, 4);
};
const emptyIcon = (g: CanvasRenderingContext2D) => { g.strokeStyle = "#33E1FF"; g.lineWidth = 6; g.setLineDash([14, 10]); g.strokeRect(-60, -50, 120, 100); g.setLineDash([]); };
export const GUN_CORNERS: [number, number, number][] = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];   // the gun screen's 4 corners (live), for the object transition

export class MoonWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#cfd8ff", "#6a6878", 0.9);
  private people: Record<Who, Player3D>;
  private gun: Gun; private thumb: Thumb; private phone: THREE.Group; private needle: THREE.Group; private flash: THREE.Sprite;
  private hinge = new THREE.Group(); private hole!: THREE.Mesh;
  private glass: Record<Who, THREE.Mesh> = {} as any;
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3(); private screenKey = "";

  constructor(A: Cast3DAssets) {
    const R = this.root;
    R.add(this.sky, this.sun, this.sun.target);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(moonGround()); rocks(R); R.add(stars()); R.add(earth(EARTH)); R.add(sun(SUN.az, SUN.el)); R.add(planets()); R.add(galaxies());
    const rk = rocket(A.imgs.logo as HTMLImageElement); rk.position.set(...ROCKET); rk.rotation.y = ROCKET_YAW; R.add(rk);
    const door = rk.getObjectByName("rocket door")!, handle = rk.getObjectByName("door handle")!;
    this.hinge.name = "rocket door hinge"; this.hinge.position.set(0.36, 1.65, 0.89); rk.add(this.hinge);
    rk.remove(door); rk.remove(handle); this.hinge.add(door, handle);
    door.position.set(-0.36, 0, 0); handle.position.set(-0.61, 0, 0.06);
    { const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.18), new THREE.MeshStandardMaterial({ color: "#3E4452", roughness: 0.45, metalness: 0.6 }));
      inner.rotation.y = Math.PI; inner.position.set(-0.36, 0, -0.003); inner.name = "rocket door inside"; inner.castShadow = true; this.hinge.add(inner);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.03), new THREE.MeshStandardMaterial({ color: "#C9CDD8", roughness: 0.3, metalness: 0.8 }));
      bar.position.set(-0.6, 0, -0.02); bar.name = "rocket door inside handle"; this.hinge.add(bar); }
    this.hole = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.22), new THREE.MeshBasicMaterial({ color: "#07080C" }));
    this.hole.position.set(0, 1.65, 0.918); this.hole.name = "rocket doorway"; rk.add(this.hole);
    this.gun = gun(); this.gun.group.scale.setScalar(1.3); R.add(this.gun.group);
    this.thumb = thumb(); this.gun.group.add(this.thumb.group);
    this.phone = phone(A.imgs.logo as HTMLImageElement); R.add(this.phone);
    this.needle = needleModel(); R.add(this.needle);
    this.flash = glowSprite(); this.flash.visible = false; R.add(this.flash);
    const opt = (w: Who) => ({ life: LIFE[w], seed: SEED[w], face: FACE[w], blinks: "auto" as const, talk: (t: number) => talkAt(w, t), legs: { shoes: "#E9EBF2" } });
    this.people = {
      max: new Player3D(R, buildCast3d(A, "max"), "max", SPOT.max, 1, false, opt("max")),
      ava: new Player3D(R, buildCast3d(A, "ava"), "ava", SPOT.ava, 1, false, opt("ava")),
    };
    for (const w of ["max", "ava"] as Who[]) {
      const t = new THREE.Texture(A.imgs[`bubble_${w}`] as HTMLImageElement); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
      const g = new THREE.Mesh(new THREE.PlaneGeometry(600 * PXM, 1000 * PXM), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
      g.frustumCulled = false; g.layers.set(NOINK); g.name = w + " helmet"; g.userData.camFree = true; R.add(g); this.glass[w] = g;
    }
    this.people.max.body.name = "Max"; this.people.ava.body.name = "Ava";
    for (const p of Object.values(this.people)) p.body.traverse((o) => {
      const m = (o as THREE.Mesh).material; if (!m) return;
      for (const mt of Array.isArray(m) ? m : [m]) if ((mt as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        const prev = mt.onBeforeCompile;
        mt.onBeforeCompile = (sh, r) => { prev?.call(mt, sh, r); sh.fragmentShader = sh.fragmentShader.replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n reflectedLight.directDiffuse *= 1.7;"); };
        mt.customProgramCacheKey = () => "charSun17"; mt.needsUpdate = true;
      }
    });
  }

  private setScreen(key: string, f: () => void) { if (key !== this.screenKey) { this.screenKey = key; f(); } }

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    const pov = c.space === "pov";
    cam.near = 0.2; cam.far = 900;
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    cam.getWorldDirection(this.fwd);
    this.sun.target.position.set(0, 0.5, 0); this.sun.target.updateMatrixWorld();
    houseLight(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t }, 7);
    scene.background = SPACE; this.sky.intensity = 0.55;
    const dk = doorAt(t); this.hinge.rotation.y = 2.1 * dk; this.hole.visible = dk > 0.01;
    houseCharSun();

    const M = this.people.max, Av = this.people.ava, s = maxAt(t), lt = t - MOON_PHONE;
    M.setPos(...s.pos); M.setLook(s.dir[0], s.dir[1]); M.squash = s.squash; M.setVisible(s.visible);
    M.lookEyes(Av.eyePoint, 1);
    { const dx = s.pos[0] - SPOT.ava[0], dz = s.pos[2] - SPOT.ava[2], n = Math.hypot(dx, dz) || 1;
      const a0 = Math.atan2(-0.3, 1), a1 = Math.atan2(dx / n, dz / n), w = smooth(0.6, 1.3, lt) * (1 - smooth(5.2, 5.9, lt));
      let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const a = a0 + da * w; Av.setLook(Math.sin(a), Math.cos(a)); }
    Av.lookEyes(s.visible ? M.eyePoint : null, 1);
    const all = Object.entries(this.people) as [Who, Player3D][];
    all.forEach(([, p]) => { p.hand.L = p.restHand("L"); p.hand.R = p.restHand("R"); });

    // Max: the gun in his right hand. For a muzzle flash he lifts it toward the Earth.
    const L = M.lookDir().clone(), Rt = new THREE.Vector3(-L.z, 0, L.x), P = new THREE.Vector3(...s.pos);
    const grip = P.clone().addScaledVector(Rt, 0.21).addScaledVector(L, 0.16); grip.y = s.pos[1] + 0.5 + 0.06 * s.air;
    M.hand.R = [grip.x, grip.y, grip.z];
    const dirRest = L.clone().addScaledVector(Rt, 0.9).setY(0).normalize();
    const aim = Math.max(...FIRES.map((f) => smooth(f - 0.95, f - 0.5, t) * (1 - smooth(f + 0.5, f + 0.8, t))));
    const toE = new THREE.Vector3(...EARTH).sub(grip).normalize();
    const d = dirRest.clone().lerp(toE, aim).normalize();
    this.gun.group.position.copy(grip); this.gun.group.rotation.set(0, Math.atan2(-d.z, d.x), 0.08 + Math.asin(d.y));
    this.gun.group.updateMatrixWorld(true);
    // the gun's little screen
    if (t < 9.3) this.setScreen("empty", () => this.gun.screen("READY", "LOAD ITEM", emptyIcon));
    else if (t < 27.9) this.setScreen("needle", () => this.gun.screen("NEEDLE", "0.5 g", needleIcon));
    else if (t < 39.6) this.setScreen("phone", () => this.gun.screen("PHONE", "0.2 kg", phoneIcon));
    else { this.screenKey = "menu"; this.gun.menu(scrollAt(t), pickAt(t)); }
    this.gun.press(...pressAt(t)); this.thumb.set(thumbAt(t)); this.thumb.group.visible = pov;
    const slot = this.gun.group.localToWorld(new THREE.Vector3(0.17, 0.2, 0)), muzzle = this.gun.group.localToWorld(new THREE.Vector3(0.5, 0.12, 0));

    // the phone: out of the rocket in his left hand, held up toward Ava, then loaded into the gun (27.9-28.25)
    const ph = P.clone().addScaledVector(Rt, -0.2 + 0.08 * s.raise).addScaledVector(L, 0.2 + 0.12 * s.raise); ph.y = s.pos[1] + 0.6 + 0.22 * s.raise + 0.06 * s.air;
    const pl = smooth(27.9, 28.25, t);
    M.hand.L = [ph.x, ph.y - 0.05, ph.z];
    this.phone.position.copy(ph).lerp(slot, pl); this.phone.rotation.set(-0.15 + 1.2 * pl, Math.atan2(-L.x, -L.z) + 0.25, 0); this.phone.scale.setScalar(1 - 0.65 * pl);
    this.phone.visible = s.visible && s.phone && t < 28.28;
    if (!this.phone.visible && t < 28.28) M.hand.L = M.restHand("L");
    // the needle: hangs in front of the Earth in the opening, flies off; later it is in Max's left hand and is shoved into the slot (8.55-9.3)
    const nIn = smooth(8.3, 8.6, t), nGo = smooth(8.75, 9.3, t);
    if (t < 4.5) {
      this.needle.visible = true; const dir = new THREE.Vector3(...EARTH).sub(new THREE.Vector3(...NEEDLE_POS)).normalize();
      this.needle.position.set(...NEEDLE_POS).addScaledVector(dir, 0.2 * t + 40 * Math.pow(Math.max(0, t - 4.0) / 0.5, 3)); this.needle.scale.setScalar(1.1);
      this.needle.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    } else if (t > 8.3 && t < 9.35) {
      this.needle.visible = true; const hp = ph.clone(); hp.y += 0.04;
      this.needle.position.copy(hp).lerp(slot.clone().add(new THREE.Vector3(0, 0.03 * (1 - nGo), 0)), nGo); this.needle.scale.setScalar(0.3 * (1 - 0.5 * nGo) * Math.max(0.01, nIn));
      this.needle.rotation.set(0, 0, Math.PI / 2 - 0.3 * (1 - nGo)); this.needle.rotateY(Math.atan2(-L.x, -L.z));
      if (nIn > 0.01 && nGo < 1) M.hand.L = [hp.x, hp.y - 0.05, hp.z];
    } else this.needle.visible = false;
    // the muzzle flash
    const fk = Math.max(...FIRES.map((f) => (t >= f && t < f + 0.4 ? 1 - (t - f) / 0.4 : 0)));
    this.flash.visible = fk > 0 && !pov; this.flash.position.copy(muzzle); this.flash.scale.setScalar(0.12 + 0.7 * (1 - fk) + 0.1);
    (this.flash.material as THREE.SpriteMaterial).opacity = Math.min(1, fk * 2);

    all.forEach(([, p], i) => p.update(t, cam, 0, 100 + i * 14));
    const cp = cam.position;
    all.forEach(([w, p], i) => {
      const G = this.glass[w]; G.visible = w !== "max" || s.visible;
      const neck = p.bodyPoint(460, 0, 0), to = cp.clone().sub(neck), dd = to.length(); to.normalize();
      const push = Math.min(0.135, dd * 0.4), k = (dd - push) / dd;
      G.quaternion.copy(cam.quaternion); G.scale.setScalar(k);
      G.position.copy(neck).addScaledVector(to, push).add(new THREE.Vector3(0, (460 - 500) * PXM * k, 0).applyQuaternion(cam.quaternion));
      G.renderOrder = 100 + i * 14 + 6;
    });
    let cc = c;
    if (pov) { // Max's eye view of the gun screen, with breathing sway and a dip on every press; his head and helmet are hidden
      const sp = new THREE.Vector3(); this.gun.group.getObjectByName("gun screen")!.getWorldPosition(sp);
      const eye = M.bodyPoint(460, 0, 0).clone().add(new THREE.Vector3(0, 0.16, 0));
      (M as any).headG.visible = false; this.glass.max.visible = false;
      const bx = new THREE.Vector3(1, 0, 0).transformDirection(this.gun.group.matrixWorld);
      const sw = (a: number, f: number, ph2: number) => a * Math.sin(t * f * 2 * Math.PI + ph2);
      const [pd, pe] = pressAt(t), dip = 0.006 * Math.max(pd, pe);
      const off = new THREE.Vector3(sw(0.007, 0.23, 0.4) + sw(0.003, 0.61, 2.1), sw(0.006, 0.31, 1.3) + sw(0.002, 0.87, 0.2) - dip, sw(0.007, 0.19, 2.7) + sw(0.003, 0.53, 1.0));
      const lk = new THREE.Vector3(sw(0.009, 0.17, 1.9), sw(0.006, 0.27, 0.7) - dip * 0.6, sw(0.01, 0.21, 3.3));
      cam.position.copy(eye).addScaledVector(bx, -0.04).add(new THREE.Vector3(0, 0.12, 0)).add(off);
      cam.up.set(sw(0.025, 0.13, 0.5), 1, sw(0.02, 0.11, 2.2)).normalize(); cam.lookAt(sp.clone().addScaledVector(bx, -0.07).add(lk));
      cam.fov = 50; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.getWorldDirection(this.fwd);
      cc = { ...c, look: [sp.x, sp.y, sp.z], blur: 0 };
      // the screen's 4 corners in the picture (top-left, top-right, bottom-right, bottom-left), for the object transition
      const face = this.gun.group.getObjectByName("gun screen") as THREE.Mesh, hw = 0.049, hh = 0.032;
      const pts = [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => face.localToWorld(new THREE.Vector3(x, y, 0)));
      const sc = pts.map((p) => p.clone().project(cam)), idx = [0, 1, 2, 3].sort((a, b) => sc[b].y - sc[a].y);
      const top = idx.slice(0, 2).sort((a, b) => sc[a].x - sc[b].x), bot = idx.slice(2).sort((a, b) => sc[b].x - sc[a].x);
      [...top, ...bot].forEach((k, i) => { GUN_CORNERS[i] = [pts[k].x, pts[k].y, pts[k].z]; });
    } else (M as any).headG.visible = true;
    headShadows(Object.values(this.people).map((p) => p as any));
    const focus = Math.max(0.3, this.v.set(...cc.look).sub(cam.position).dot(this.fwd));
    return { focus, cInf: cc.blur * 0.3 };
  }
}

// PHONE PREVIEW world: same moon, sky, rocket, suits and helmets as needle-preview. New: the rocket door swings open
// (hinge on its right edge, swings out 120 deg, dark opening behind it), Max moon-hops in and out, the phone appears in his left hand.
import * as THREE from "three";
import { NOINK } from "../../engine/post/ink";
import { smooth } from "../../engine/core/util";
import { Player3D, buildCast3d, loadCast3d, Cast3DSpec, Cast3DAssets } from "../../engine/cast/player3d";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { houseLight, headShadows } from "../../engine/outdoor";
import { CARD_LIGHT } from "../../engine/cast/cardlight";
// stronger sun on the heads and hats too: the far side darker, the sunny side warmer (after houseLight each frame)
const houseCharSun = () => { CARD_LIGHT.uCardGrad.value *= 2.0; const c = CARD_LIGHT.uCardTint.value; c.set(c.x * 1.06, c.y * 1.03, c.z * 0.97); };
import { PXM } from "../../engine/cast/player";
import { FACE, LIFE, SEED, LIGHT, SPOT, ROCKET, ROCKET_YAW, EARTH, SUN, Who, talkAt, eyesAt, maxAt, doorAt } from "./story";
import { moonGround, rocks, stars, earth, sun, planets, galaxies, rocket, gun, phone, needleIcon, Gun } from "./props";

// Ava: her 4 drawn pictures (with eyelashes and glasses). The drawn morphing face does not fit her head and showed up small on the rocket.
export const CAST: Cast3DSpec = { max: { outfit: "astro_max" }, ava: { outfit: "astro_ava", pictureFaces: true } };
export const load = () => loadCast3d(CAST, { logo: "needle-preview/logo.png", bubble_max: "needle-preview/bubble_max.png", bubble_ava: "needle-preview/bubble_ava.png" });
const SPACE = new THREE.Color("#000000");

export class SimpleWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#cfd8ff", "#6a6878", 0.9);
  private people: Record<Who, Player3D>;
  private gun: Gun; private phone: THREE.Group;
  private hinge = new THREE.Group(); private hole!: THREE.Mesh;
  private glass: Record<Who, THREE.Mesh> = {} as any;
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3();

  constructor(A: Cast3DAssets) {
    const R = this.root;
    R.add(this.sky, this.sun, this.sun.target);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(moonGround()); rocks(R); R.add(stars()); R.add(earth(EARTH)); R.add(sun(SUN.az, SUN.el)); R.add(planets()); R.add(galaxies());
    const rk = rocket(A.imgs.logo as HTMLImageElement); rk.position.set(...ROCKET); rk.rotation.y = ROCKET_YAW; R.add(rk);
    // the door swings OUT on a hinge at its right edge (120 deg), so we see its inside face standing open; dark opening behind
    const door = rk.getObjectByName("rocket door")!, handle = rk.getObjectByName("door handle")!;
    this.hinge.name = "rocket door hinge"; this.hinge.position.set(0.36, 1.65, 0.89); rk.add(this.hinge);
    rk.remove(door); rk.remove(handle); this.hinge.add(door, handle);
    door.position.set(-0.36, 0, 0); handle.position.set(-0.61, 0, 0.06);
    // the INSIDE of the door is dark metal (outside stays as approved), so the open door reads against the white rocket
    { const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.18), new THREE.MeshStandardMaterial({ color: "#3E4452", roughness: 0.45, metalness: 0.6 }));
      inner.rotation.y = Math.PI; inner.position.set(-0.36, 0, -0.003); inner.name = "rocket door inside"; inner.castShadow = true; this.hinge.add(inner);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.03), new THREE.MeshStandardMaterial({ color: "#C9CDD8", roughness: 0.3, metalness: 0.8 }));
      bar.position.set(-0.6, 0, -0.02); bar.name = "rocket door inside handle"; this.hinge.add(bar); }
    this.hole = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.22), new THREE.MeshBasicMaterial({ color: "#07080C" }));
    this.hole.position.set(0, 1.65, 0.918); this.hole.name = "rocket doorway"; rk.add(this.hole);   // just in front of the red band
    // stronger sun on the 3D bodies (Arian 2026-11-16): their direct light x1.7, the world stays as it is
    this.gun = gun(); this.gun.group.scale.setScalar(1.3); this.gun.screen("NEEDLE", "0.5 g", needleIcon); R.add(this.gun.group);
    this.phone = phone(A.imgs.logo as HTMLImageElement); R.add(this.phone);
    const opt = (w: Who) => ({ life: LIFE[w], seed: SEED[w], face: FACE[w], blinks: "auto" as const, talk: (t: number) => talkAt(w, t),
      legs: { shoes: "#E9EBF2" } });
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

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    cam.getWorldDirection(this.fwd);
    this.sun.target.position.set(0, 0.5, 0); this.sun.target.updateMatrixWorld();
    houseLight(LIGHT.at(t), { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t }, 7);
    scene.background = SPACE; this.sky.intensity = 0.55;
    const dk = doorAt(t); this.hinge.rotation.y = 2.1 * dk; this.hole.visible = dk > 0.01;
    houseCharSun();

    const M = this.people.max, Av = this.people.ava, s = maxAt(t);
    M.setPos(...s.pos); M.setLook(s.dir[0], s.dir[1]); M.squash = s.squash; M.setVisible(s.visible);
    M.lookEyes(t > 5.9 ? Av.eyePoint : null, 1);
    { // Ava turns round smoothly to watch Max go to the rocket, and turns back as he comes back to her
      const dx = s.pos[0] - SPOT.ava[0], dz = s.pos[2] - SPOT.ava[2], n = Math.hypot(dx, dz) || 1;
      const a0 = Math.atan2(-0.3, 1), a1 = Math.atan2(dx / n, dz / n), w = smooth(0.6, 1.3, t) * (1 - smooth(5.2, 5.9, t));
      let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const a = a0 + da * w; Av.setLook(Math.sin(a), Math.cos(a)); }
    const ey = eyesAt("ava", t); Av.lookEyes(s.visible ? M.eyePoint : null, 1); void ey;
    const all = Object.entries(this.people) as [Who, Player3D][];
    all.forEach(([, p]) => { p.hand.L = p.restHand("L"); p.hand.R = p.restHand("R"); });

    // Max: the gun in his right hand all the time; arms a little up while he is in the air
    const L = M.lookDir().clone(), Rt = new THREE.Vector3(-L.z, 0, L.x), P = new THREE.Vector3(...s.pos);
    const grip = P.clone().addScaledVector(Rt, 0.21).addScaledVector(L, 0.16); grip.y = s.pos[1] + 0.5 + 0.06 * s.air;
    M.hand.R = [grip.x, grip.y, grip.z];
    const dir = L.clone().addScaledVector(Rt, 0.9).normalize();
    this.gun.group.position.copy(grip); this.gun.group.rotation.set(0, Math.atan2(-dir.z, dir.x), 0.08);
    this.gun.group.visible = s.visible;
    // the phone: only after he has been inside; at the end held up toward Ava
    // at the end he holds the phone up in front of him, toward Ava and us
    const ph = P.clone().addScaledVector(Rt, -0.2 + 0.08 * s.raise).addScaledVector(L, 0.2 + 0.12 * s.raise); ph.y = s.pos[1] + 0.6 + 0.22 * s.raise + 0.06 * s.air;
    M.hand.L = [ph.x, ph.y - 0.05, ph.z];
    this.phone.position.copy(ph); this.phone.rotation.set(-0.15, Math.atan2(-L.x, -L.z) + 0.25, 0);
    this.phone.visible = s.visible && s.phone;
    if (!this.phone.visible) M.hand.L = M.restHand("L");

    all.forEach(([, p], i) => p.update(t, cam, 0, 100 + i * 14));
    const cp = cam.position;
    all.forEach(([w, p], i) => {
      const G = this.glass[w];
      G.visible = w !== "max" || s.visible;
      const neck = p.bodyPoint(460, 0, 0), to = cp.clone().sub(neck), d = to.length(); to.normalize();
      const push = Math.min(0.135, d * 0.4), k = (d - push) / d;
      G.quaternion.copy(cam.quaternion); G.scale.setScalar(k);
      G.position.copy(neck).addScaledVector(to, push).add(new THREE.Vector3(0, (460 - 500) * PXM * k, 0).applyQuaternion(cam.quaternion));
      G.renderOrder = 100 + i * 14 + 6;
    });
    headShadows(Object.values(this.people).map((p) => p as any));
    const focus = Math.max(0.3, this.v.set(...c.look).sub(cam.position).dot(this.fwd));
    return { focus, cInf: c.blur };
  }
}

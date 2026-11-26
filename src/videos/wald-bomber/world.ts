// WALD BOMBER world: all six places, the bombers, the people and what they do in each of the 16 scenes (2026-11-20).
// Rough plain colours on purpose (Blender adds the look). The shot's `space` (story.ts) decides the light, who is visible
// and where the generals stand, so both layers of a dissolve are right.
import * as THREE from "three";
import { NOINK } from "../../engine/post/ink";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import { V3, smooth, lerpV, norm, sub } from "../../engine/core/util";
import { LIGHTS } from "../../engine/core/lights";
import { Outdoor, castAll, headShadows } from "../../engine/outdoor";
import { Player3D, buildCast3d, loadCast3d, Cast3DSpec, Cast3DAssets } from "../../engine/cast/player3d";
import { makeLife, FaceEv } from "../../engine/cast/life";
import type { FaceKey } from "../../engine/cast/face";
import { ground } from "../../engine/places";
import { MR, mkCanvas, canvasTex, noInk } from "../../engine/kit";
import { Fx, FxEvent } from "../../engine/fx/fx";
import { loadBomber, bomber, holes, cockpit, BomberAsset, Bomber, Holes } from "../../engine/bomber";
import { cloudSea, airfield, office, fantasyDiner } from "../../engine/moreplaces";
import {
  SKY, CABIN, STORM, FIELD, OFFICE, DINER, A, PB, STORM_PLANES, TALLY, TALLY_R, tally, MAX_TALLY, MAX_WING, CHEESE, MAX_ENGINE, ENGINE_LOOK,
  WALD_DESK, WALD_BOARD, LAMP, MODEL_DESK, MODEL_UP, BOARD_C, BOARD_MARKS, PHOTO_C, PHOTO_W, PHOTO_H, LAND, SPACE_LIGHT, cloudAnchor,
} from "./story";

// who is who: main cast + extras (base = the library head they use). Hats come with the outfit (pilot: hat_max, general: hat_omar).
export const CAST: Cast3DSpec = {
  max: { outfit: "pilot" }, arian: { outfit: "suit" }, omar: { outfit: "general", pictureFaces: true }, ava: { outfit: "dress", skin: [110, 68, 46], rig: { skin: "#6E442E", ink: "#150C0C", lashes: 1, fixed: true } },   // fix7: dark skin set (as in bank2), so her drawn face sits on her head (it floated off before)
  crew1: { outfit: "pilot", base: "minh" }, crew2: { outfit: "pilot", base: "minh2" }, crew3: { outfit: "pilot", base: "minh3" }, crew4: { outfit: "pilot", base: "cop", pictureFaces: true },
  gen1: { outfit: "general", base: "cop", pictureFaces: true }, gen2: { outfit: "general", base: "minh2" },
  mech1: { outfit: "farmer", base: "minh" }, mech2: { outfit: "casual", base: "minh3" },
  din1: { outfit: "casual", base: "tina" }, din2: { outfit: "hoodie", base: "nora" }, din3: { outfit: "luckytee", base: "minh" },
  // new extras for the real timing (same outfits and heads as above, already in public\library)
  col1: { outfit: "suit", base: "minh2" }, col2: { outfit: "suit", base: "cop", pictureFaces: true },   // Wald's two colleagues (S10)
  din4: { outfit: "casual", base: "minh2" }, din5: { outfit: "hoodie", base: "tina" },                  // the customers who leave (S11)
};
export const load = async () => { const [bomber, cast] = await Promise.all([loadBomber(), loadCast3d(CAST)]); return { bomber, cast }; };

// ---- the photo on the hangar board (object transition): the engine hands us the S03 picture while it shrinks into it ----
let photoC: HTMLCanvasElement | null = null, photoVer = 0;
const photoCanvas = () => {
  if (photoC) return photoC;
  photoC = mkCanvas(360, 640); const g = photoC.getContext("2d")!;          // stand-in until the real picture arrives (single stills)
  const sk = g.createLinearGradient(0, 0, 0, 420); sk.addColorStop(0, "#6FB4E4"); sk.addColorStop(1, "#CFE8F2"); g.fillStyle = sk; g.fillRect(0, 0, 360, 640);
  g.fillStyle = "#7DB85A"; g.fillRect(0, 420, 360, 220); g.fillStyle = "#C8C2B5"; g.fillRect(0, 470, 360, 90);
  g.fillStyle = "#3E4632"; g.beginPath(); g.ellipse(180, 300, 120, 14, -0.12, 0, 7); g.fill(); g.fillRect(80, 285, 200, 10);
  return photoC;
};
export const snapPhoto = (cv: HTMLCanvasElement) => { photoCanvas().getContext("2d")!.drawImage(cv, 0, 0, 360, 640); photoVer++; };

type Person = { p: Player3D; who: string };
const sm = smooth;
const up = (v: V3, h: number): V3 => [v[0], v[1] + h, v[2]];
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const talkFn = (spans: [number, number][]) => (t: number) => { for (const [a, b] of spans) if (t >= a && t < b) return [1, 3, 2, 4, 1, 3, 5, 2][Math.floor(t * 11) % 8]; return -1; };
const F = (...k: [number, string][]): FaceKey[] => k.map(([t, e]) => ({ t, e }));
const flat = (x: number, z: number): [number, number] => [x, z];
// a hand reaching toward a point, at most `reach` from the shoulder
const reachTo = (shoulder: V3, target: V3, reach = 0.5): V3 => { const d = dist(shoulder, target); if (d <= reach) return target; const n = norm(sub(target, shoulder)); return [shoulder[0] + n[0] * reach, shoulder[1] + n[1] * reach, shoulder[2] + n[2] * reach]; };

export class BomberWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private sky = new THREE.HemisphereLight("#dfeeff", "#8a7a68", 0.55);
  private lampLight = new THREE.PointLight("#FFB866", 0, 5, 2);
  private out: Outdoor; private fx: Fx;
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3();
  // planes
  private jack: Bomber; private jackHoles: Holes; private beamsDone = false;
  private parked: Bomber[] = []; private landing: Bomber[] = []; private pb: Bomber; private storm: Bomber[] = []; private model: Bomber;
  private seaSky: THREE.Object3D; private seaStorm: THREE.Object3D;
  // boards and props
  private tallyB: ReturnType<typeof airfield>["tally"]; private tallyN = -1;
  private officeB: ReturnType<typeof office>["board"]; private circlesK = -1;
  private photo: THREE.Mesh; private photoTex: THREE.CanvasTexture; private photoSeen = -1;
  private stand: THREE.Group; private standTop = 1.3; private stand1: V3 = [-8.6, 0, -0.25]; private stand2: V3 = [-6.1, 0, -4.6]; private stand2Top = 1.2;
  private wingSpots: V3[] = []; private wingHoles: THREE.Mesh[] = []; private wingPlates: THREE.Mesh[] = [];
  private engSpots: V3[] = []; private engPlates: THREE.Mesh[] = []; private handPlate: THREE.Mesh;
  private cheese: THREE.Group; private jacket: THREE.Mesh; private clip: THREE.Group; private pencil: THREE.Mesh; private chalk: THREE.Mesh;
  // people
  private all: Person[] = []; private P: Record<string, Player3D> = {}; private crew: { p: Player3D; at: V3; look: [number, number] }[] = [];
  private diners: { p: Player3D; at: V3; look: [number, number] }[] = [];

  constructor(Aset: { bomber: BomberAsset; cast: Cast3DAssets }) {
    const R = this.root, B = Aset.bomber, at = (o: THREE.Object3D, p: V3) => { o.position.set(p[0], p[1], p[2]); R.add(o); return o; };
    R.add(this.sky, this.sun, this.sun.target, this.lampLight); this.sun.castShadow = true;
    this.out = new Outdoor(R);
    R.add(ground({ kind: "grass" }));

    // ================= P1 sky: Jack's holed bomber (S01, S02b, S16) + the plane that gets hit (S13) =================
    this.jack = bomber(B, { name: "jackBomber" }); at(this.jack.group, SKY);
    this.jackHoles = holes(this.jack, { wingL: 60, body: 12, tail: 8, seed: 3 });
    this.seaSky = at(cloudSea({ y: 0, size: 900 }), [SKY[0], SKY[1] - 20, SKY[2]]);
    this.pb = bomber(B, { name: "hitBomber" }); at(this.pb.group, PB); holes(this.pb, { wingL: 14, wingR: 14, body: 6, seed: 12 });
    // ================= storm (S07a): three plated bombers in a line, low dark cloud floor =================
    STORM_PLANES.forEach((p, i) => {
      const b = bomber(B, { name: "stormBomber" + i }); at(b.group, p); this.storm.push(b);
      const h = holes(b, { wingL: 18, wingR: 18, body: 5, seed: 20 + i });
      h.list.filter((q) => q.part === "wingL" || q.part === "wingR").slice(0, 16).forEach((q) => { const pl = this.plate(0.42); this.onSurface(pl, q.p, q.n); b.group.add(pl); });
    });
    this.seaStorm = at(cloudSea({ y: 0, size: 700, seed: 9, top: "#8E97C2", under: "#3B4378" }), [STORM[0], STORM[1] - 9, STORM[2]]);
    // ================= P2 cockpit set =================
    const ck = cockpit(); at(ck.group, CABIN);
    const book = this.logbook(); book.position.set(CABIN[0] + 0.19, CABIN[1] + 1.02, CABIN[2] - 0.12); R.add(book);

    // ================= P3 + P4 airfield and hangar =================
    const af = airfield(this.out); at(af.group, FIELD);
    af.hangar.board.draw({ dots: 45 });
    this.tallyB = af.tally; this.tallyB.group.position.set(...TALLY); this.tallyB.group.rotation.y = TALLY_R; R.add(this.tallyB.group);   // (airfield() forgot to add it)
    for (const i of [0, 1]) { const b = bomber(B, { name: "parked" + i, gear: 1 }); b.group.rotation.y = Math.PI / 2; at(b.group, [FIELD[0] + af.spots[i][0], FIELD[1] + b.groundY, FIELD[2] + af.spots[i][2]]); holes(b, { wingL: 20, wingR: 15, body: 8, seed: 5 + i }); this.parked.push(b); }
    for (const i of [0, 1]) { const b = bomber(B, { name: "landing" + i, gear: 1 }); at(b.group, [FIELD[0] - 200, FIELD[1] + 20, FIELD[2] - 45]); holes(b, { wingL: 16, wingR: 16, body: 6, seed: 30 + i }); this.landing.push(b); }
    // the photo the S03 picture shrinks into (on the right of the hangar board), with a red pin
    this.photoTex = canvasTex(photoCanvas());
    this.photo = new THREE.Mesh(new THREE.PlaneGeometry(PHOTO_W, PHOTO_H), new THREE.MeshBasicMaterial({ map: this.photoTex, toneMapped: false }));
    this.photo.name = "s03Photo"; this.photo.position.set(...PHOTO_C); this.photo.position.z -= 0.004; this.photo.rotation.y = Math.PI; R.add(this.photo);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), MR("#C7362F", 0.4)); pin.name = "photoPin"; pin.position.set(PHOTO_C[0], PHOTO_C[1] + PHOTO_H / 2 - 0.04, PHOTO_C[2] - 0.02); R.add(pin);
    // work stand (S05/S06 under the wing, S15 beside the outer engine)
    this.stand = this.workStand(); R.add(this.stand);
    this.handPlate = this.plate(0.32); R.add(this.handPlate);
    for (let i = 0; i < 3; i++) { const pl = this.plate(0.3); R.add(pl); this.wingPlates.push(pl); const hm = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), new THREE.MeshBasicMaterial({ color: "#1E1424" })); hm.name = "wingHole"; hm.rotation.x = -Math.PI / 2; R.add(noInk(hm)); this.wingHoles.push(hm); }
    for (let i = 0; i < 2; i++) { const pl = this.plate(0.3); R.add(pl); this.engPlates.push(pl); }
    // S06 props: Swiss cheese + its tiny steel jacket
    this.cheese = this.swissCheese(); R.add(this.cheese);
    this.jacket = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.098, 0.05), MR("#A9AEB4", 0.35, 0.6)); this.jacket.name = "cheeseJacket"; this.jacket.position.z = 0.03; this.cheese.add(this.jacket);

    // ================= P5 office =================
    const of = office(); at(of.group, OFFICE); this.officeB = of.board; of.board.draw({ dots: 40 });
    of.group.traverse((o: any) => {
      if (/^chair/.test(o.name)) o.position.z = 2 * of.desk[2] - o.position.z;                         // chair behind the desk: Wald faces the camera
      if (o.name === "paper" && o.position.x > 0.52 && o.position.x < 1.2) o.visible = false;          // clear the middle of the desk
    });
    this.lampLight.position.set(...LAMP);
    this.model = bomber(B, { name: "modelBomber" }); holes(this.model, { wingL: 16, wingR: 10, body: 6, seed: 7, size: 0.9 }); this.model.group.scale.setScalar(0.02); R.add(this.model.group);
    this.pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), MR("#E2B23C", 0.5)); this.pencil.name = "pencil"; R.add(this.pencil);
    this.chalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 6), MR("#D8352E", 0.8)); this.chalk.name = "redChalk"; R.add(this.chalk);
    // ================= P6 fantasy diner =================
    const dn = fantasyDiner(); at(dn.group, DINER);
    this.clip = this.clipboard(); R.add(this.clip);
    R.updateMatrixWorld(true);
    this.measureWing();

    // ================= people =================
    const person = (who: string, pos: V3, o: { seat?: number; face?: FaceKey[]; life?: FaceEv[]; sweat?: [number, number][]; talk?: [number, number][] } = {}) => {
      const p = new Player3D(R, buildCast3d(Aset.cast, who), who, pos, 1, o.seat !== undefined, {
        seed: 11 + 7 * this.all.length, face: o.face, life: o.life || o.sweat ? makeLife(o.life ?? [], o.sweat ?? []) : undefined, talk: o.talk ? talkFn(o.talk) : undefined });
      if (o.seat !== undefined) { p.sit = 1; p.seatY = o.seat; }
      this.all.push({ p, who }); return p;
    };
    // cockpit: Max flies (S02a, S16), nine crew on their spots
    const crewWho = ["max", "crew1", "crew2", "crew3", "crew4", "crew1", "crew2", "crew3", "crew4", "crew1"];
    ck.crew.forEach((c, i) => {
      const pos: V3 = c.job === "engineer" ? A(CABIN, c.at[0], 0, -0.45) : A(CABIN, c.at[0], c.at[1], c.at[2]);
      const who = crewWho[i], pic = who === "crew4";
      const p = person(who, pos, i === 0
        ? { seat: 0.42, face: F([0, "neutral"], [3.7, "content"], [5.85, "strain"], [7.4, "smile"], [8.3, "strain"], [60.4, "happy"], [62.5, "satisfied"]), sweat: [[5.8, 8.9]] }
        : { seat: c.sit ? (i < 2 ? 0.42 : 0.38) : undefined, face: F([0, "neutral"], [7.6 + 0.1 * i, i % 2 ? "content" : "smile"], [60.5, "happy"]), life: pic ? [[0, "neutral"], [7.7, "grin"]] : undefined });
      if (c.sit === false && i !== 0) p.sit = 0;
      this.crew.push({ p, at: pos, look: [Math.cos(c.yaw), Math.sin(c.yaw)] });
      if (i === 0) this.P.maxC = p;
    });
    // ground Max (S06, S07b, S15)
    this.P.maxG = person("max", MAX_WING, { face: F([0, "happy"], [21.1, "happy"], [22.3, "smile"], [23.6, "satisfied"], [27.3, "sad"], [28.2, "stressed"], [29.55, "confused"], [31.5, "stressed"], [32.3, "confused"],
      [56.6, "neutral"], [57.7, "confused"], [59.4, "surprised"], [59.95, "happy"]), sweat: [[27.9, 29.5]], talk: [[20.9, 22.1]] });
    // generals (S04 hangar, S15 by the plane)
    this.P.omar = person("omar", [-0.3, 0, 40.3], { life: [[0, "neutral"], [16.6, "smug"], [17.6, "grin"], [18.3, "smug"], [57.4, "shock"], [58.0, "smug"], [59.4, "grin"]] });
    this.P.gen1 = person("gen1", [0.9, 0, 39], { life: [[0, "neutral"], [17.7, "smug"], [57.9, "grin"]] });
    this.P.gen2 = person("gen2", [0.6, 0, 41.8], { face: F([0, "neutral"], [16.2, "content"], [17.9, "satisfied"]) });
    // mechanics
    this.P.mech1 = person("mech1", [-9.6, 0, -12.7], { face: F([0, "neutral"], [18.5, "strain"], [20.15, "satisfied"], [21.0, "happy"], [22.6, "smile"], [56.8, "content"], [57.9, "strain"], [58.2, "satisfied"], [59.5, "strain"], [59.8, "satisfied"]) });
    this.P.mech2 = person("mech2", [13.5, 0, -5], { face: F([0, "neutral"], [13.4, "sad"], [18.3, "content"], [56.8, "neutral"], [58.5, "content"]) });
    // Wald: seated at the desk (S09, S12), standing at the board (S10, S14); colleagues (S10)
    this.P.waldS = person("arian", WALD_DESK, { seat: 0.45, face: F([0, "neutral"], [35.4, "content"], [36.6, "smile"], [48.7, "neutral"], [49.4, "content"], [49.95, "satisfied"]) });
    this.P.waldB = person("arian", WALD_BOARD, { face: F([0, "neutral"], [38.3, "content"], [39.2, "smug"], [40.4, "neutral"], [41.2, "surprised"], [42.15, "smile"], [53.7, "content"], [55.1, "satisfied"], [56.0, "smug"]) });
    this.P.col1 = person("col1", A(OFFICE, -2.3, 0, -0.6), { face: F([0, "neutral"], [39.6, "confused"], [41.3, "surprised"]) });
    this.P.col2 = person("col2", A(OFFICE, -0.15, 0, -0.1), { life: [[0, "neutral"], [41.4, "shock"]] });
    // fantasy diner: Ava asks, six happy diners stay, two leave through the door
    this.P.ava = person("ava", A(DINER, 2.4, 0, 2.2), { face: F([0, "content"], [44.6, "happy"], [45.4, "smile"], [46.3, "happy"]), talk: [[44.9, 46.3]] });
    const dWho = ["din1", "din2", "din3", "din1", "din2", "din3"];
    dn.seats.slice(0, 6).forEach((s, i) => { const tb = dn.tables[Math.floor(i / 2)], pos = A(DINER, s[0], 0, s[2]);
      const p = person(dWho[i], pos, { seat: 0.45, face: F([0, "content"], [44.7 + 0.25 * i, "happy"], [46.4 + 0.2 * i, "smile"]) });
      this.diners.push({ p, at: pos, look: [tb[0] - s[0], tb[2] - s[2]] }); });
    this.P.din4 = person("din4", A(DINER, -1.6, 0, -3.4), { face: F([0, "sad"]) });
    this.P.din5 = person("din5", A(DINER, -2.7, 0, -3.0), { face: F([0, "sad"]) });

    // ================= effects =================
    const jackEng = this.jack.group.localToWorld(this.jack.engines[0].clone().add(new THREE.Vector3(-1.6, 0.4, 0)));
    const pbEng = (): V3 => { const v = this.pb.group.localToWorld(this.pb.engines[3].clone().add(new THREE.Vector3(-0.8, 0.3, 0))); return [v.x, v.y, v.z]; };
    const FX: FxEvent[] = [
      { kind: "dust", t: 9.5, at: [jackEng.x, jackEng.y, jackEng.z], size: 1.8, dur: 1.0, color: "#8E8C94" },                 // S02b an engine coughs
      { kind: "burst", t: 20.18, at: () => up(this.wingSpots[2] ?? [-8.2, 2.3, -0.8], 0.05), size: 0.5 },                    // S05 stamp on "hit"
      { kind: "dust", t: 20.2, at: () => up(this.wingSpots[2] ?? [-8.2, 2.3, -0.8], 0.04), size: 0.45, color: "#C9C3B4" },
      { kind: "sparkle", t: 23.68, at: () => up(CHEESE, 0.07), size: 0.22 },                                                // S06 the steel jacket
      { kind: "burst", t: 51.34, at: pbEng, size: 3.0 },                                                                   // S13 the engine hit
      { kind: "dust", t: 51.42, at: pbEng, size: 3.2, dur: 1.8, color: "#7E7A86" },
      { kind: "burst", t: 58.0, at: () => this.engSpots[0] ?? ENGINE_LOOK, size: 0.45 },                                     // S15 plates onto the engine
      { kind: "burst", t: 59.7, at: () => this.engSpots[1] ?? ENGINE_LOOK, size: 0.45 },
    ];
    this.fx = new Fx(R, FX);
  }

  // ---------------- small builders ----------------
  private plate(s: number) { const m = new THREE.Mesh(new THREE.BoxGeometry(s, 0.02, s), MR("#A9AEB4", 0.35, 0.6)); m.name = "steelPlate"; m.castShadow = m.receiveShadow = true; m.visible = false; return m; }
  private onSurface(m: THREE.Object3D, p: THREE.Vector3 | V3, n: THREE.Vector3 | V3) {
    const P3 = Array.isArray(p) ? new THREE.Vector3(...p) : p, N3 = Array.isArray(n) ? new THREE.Vector3(...n) : n;
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), N3.clone().normalize()); m.position.copy(P3).addScaledVector(N3, 0.013); m.visible = true;
  }
  private logbook() {
    const c = mkCanvas(512, 352), g = c.getContext("2d")!; g.fillStyle = "#F2E8CC"; g.fillRect(0, 0, 512, 352);
    g.strokeStyle = "#B9A98A"; g.lineWidth = 2; for (let y = 120; y < 352; y += 34) { g.beginPath(); g.moveTo(24, y); g.lineTo(488, y); g.stroke(); }
    g.fillStyle = "#2B1C1A"; g.font = "900 110px Georgia, serif"; g.textAlign = "center"; g.fillText("1943", 256, 112);
    g.font = "italic 34px Georgia, serif"; g.textAlign = "left"; g.fillText("Flight log - mission 25", 30, 186); g.fillText("Return: 1 engine rough", 30, 254);
    const G = new THREE.Group(); G.name = "logbook";
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.28), MR("#6A3A2A", 0.7)); cover.name = "logCover"; G.add(cover);
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.18), new THREE.MeshStandardMaterial({ map: canvasTex(c), roughness: 0.9 })); pg.name = "logPage";
    pg.rotation.set(-Math.PI / 2, 0, Math.PI / 2); pg.position.y = 0.007; G.add(pg);
    G.rotation.z = -0.25;     // text reads from the windscreen camera; the far edge tipped up toward it
    return G;
  }
  private swissCheese() {
    const G = new THREE.Group(); G.name = "cheese";
    G.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.1), MR("#F2C94C", 0.6)), { name: "cheeseBlock" }));
    const hole = new THREE.MeshBasicMaterial({ color: "#B8862A" });
    for (const [x, y, r] of [[-0.035, 0.018, 0.016], [0.03, -0.015, 0.012], [0.045, 0.025, 0.009], [-0.01, -0.025, 0.01]]) {
      const h = new THREE.Mesh(new THREE.CircleGeometry(r, 14), hole); h.position.set(x, y, 0.0505); h.name = "cheeseHole"; G.add(h); }
    G.visible = false; return G;
  }
  private clipboard() {
    const G = new THREE.Group(); G.name = "clipboard";
    G.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.012), MR("#8A5A34", 0.7)), { name: "clipBoard" }));
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.17), MR("#F7F2E6", 0.9)); paper.position.set(0, -0.015, 0.007); paper.name = "clipPaper"; G.add(paper);
    G.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.02), MR("#C9CDD2", 0.3, 0.7)), { name: "clipClip" })).children.slice(-1)[0].position.set(0, 0.1, 0.01);
    return G;
  }
  private workStand() {
    const G = new THREE.Group(); G.name = "workStand";
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.0), MR("#7A6A52", 0.8)); top.name = "standTop"; G.add(top);
    for (const [x, z] of [[-0.75, -0.45], [0.75, -0.45], [-0.75, 0.45], [0.75, 0.45]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), MR("#C7362F", 0.6)); l.name = "standLeg"; l.userData.leg = true; l.position.set(x, 0, z); G.add(l); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.04), MR("#C7362F", 0.6)); rail.name = "standRail"; rail.userData.rail = true; G.add(rail);
    G.traverse((m: any) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
    G.visible = false; return G;
  }
  private placeStand(at: V3, topY: number, rotY: number) {
    const G = this.stand; G.visible = true; G.position.set(at[0], 0, at[2]); G.rotation.y = rotY;
    G.children.forEach((m: any) => {
      if (m.name === "standTop") m.position.y = topY - 0.03;
      if (m.userData.leg) { m.scale.y = topY; m.position.y = topY / 2; }
      if (m.userData.rail) { m.position.set(0, topY + 0.35, 0.48); }
    });
  }
  /** find the wing of parked plane 1 by rays: the stand, the plate spots (S05) and the engine spots (S15) */
  private measureWing() {
    const b = this.parked[1], ray = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0);
    const down = (x: number, z: number) => { ray.set(new THREE.Vector3(x, 40, z), dn); const h = ray.intersectObjects(b.meshes, false)[0]; return h ? h.point.y : null; };
    let trail = -0.8; for (let z = 4; z > -8; z -= 0.05) { const y = down(-8.6, z); if (y !== null && y > 0.8) { trail = z; break; } }
    const top = down(-8.6, trail - 0.3) ?? 2.3;
    this.standTop = Math.max(0.4, top - 0.82); this.stand1 = [-8.6, 0, trail + 0.55];
    this.wingSpots = [[-9.05, trail - 0.35], [-8.6, trail - 0.6], [-8.15, trail - 0.38]].map(([x, z]) => [x, (down(x, z) ?? top) + 0.012, z] as V3);
    this.wingSpots.forEach((s, i) => { this.wingHoles[i].position.set(s[0], s[1] + 0.004, s[2]); });
    // the outer engine nacelle (world x about -7.3): its top, then its side from +x
    const ze = -4.6, nTop = down(-7.3, ze) ?? 2.6, side = (y: number, z: number) => { ray.set(new THREE.Vector3(-2, y, z), new THREE.Vector3(-1, 0, 0)); const h = ray.intersectObjects(b.meshes, false)[0]; return h ? h.point.x : -6.8; };
    const yS = nTop - 0.3, xS = side(yS, ze);
    this.engSpots = [[side(yS, ze - 0.3) + 0.012, yS, ze - 0.3], [side(yS - 0.05, ze + 0.3) + 0.012, yS - 0.05, ze + 0.3]];
    this.stand2 = [xS + 0.8, 0, ze]; this.stand2Top = Math.max(0.4, yS - 0.85);
    console.log("wald wing: trailing z", trail.toFixed(2), "wing top", top.toFixed(2), "stand top", this.standTop.toFixed(2), "| nacelle top", nTop.toFixed(2), "side x", xS.toFixed(2));
  }

  // ---------------- every frame ----------------
  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK); cam.getWorldDirection(this.fwd);
    const sp = c.space;
    // ---- light of this place ----
    this.out.weather(sp === "storm" ? "rain" : "clear", 0.55);
    this.out.light(LIGHTS[SPACE_LIGHT[sp] ?? "sunny"], { sun: this.sun, hemi: this.sky, scene, cam, pose: c, t });
    this.lampLight.intensity = sp.startsWith("office") ? 6 : 0;
    if (!this.cast0) { this.cast0 = true; castAll(scene); }
    // ---- planes ----
    const scroll = -8 * (t - cloudAnchor(t));
    this.seaSky.position.x = SKY[0] + scroll; this.seaStorm.position.x = STORM[0] + scroll;
    this.jack.update(t, { spin: 1, gear: 0 }); this.jack.group.position.y = SKY[1] + 0.12 * Math.sin(t * 0.9);
    const beamK = t < 4 ? 1 : sm(63.0, 63.35, t);
    if (sp === "sky" && beamK > 0 && !this.beamsDone) { this.beamsDone = true; this.jackHoles.beams(this.v.copy(this.sun.position).sub(this.sun.target.position).normalize(), 3.5); }
    this.jackHoles.setBeams(this.beamsDone ? beamK : 0);
    this.parked.forEach((b) => b.update(t, { spin: 0, gear: 1 }));
    this.landing.forEach((b, i) => {                                   // S03: two holed planes land one after the other
      const td = LAND[i].td, a = i === 0 ? 4 : 12.5, uMax = 15 / a;
      let x: number, y: number;
      if (t < td) { x = -60 - 30 * (td - t); y = b.groundY + Math.min(40, 4.5 * (td - t)); } else { const u = Math.min(t - td, uMax); x = -60 + 30 * u - a * u * u; y = b.groundY; }
      b.group.position.set(FIELD[0] + x, FIELD[1] + y, FIELD[2] - 45); b.update(t, { spin: 1, gear: 1 });
    });
    this.pb.group.visible = t > 50 && t < 54.2;                       // S13: hit in the engine, drops behind the clouds
    this.pb.update(t, { spin: 1 });
    this.pb.group.position.set(PB[0], PB[1] - 26 * Math.pow(sm(52.0, 53.45, t), 1.4) + 0.1 * Math.sin(t), PB[2]);
    this.pb.group.rotation.z = -0.3 * sm(51.7, 52.6, t); this.pb.group.rotation.x = 0.12 * sm(51.5, 52.4, t);
    this.storm.forEach((b, i) => {                                      // S07a: the back plane slips into the cloud and is gone
      b.update(t, { spin: 1, gear: 0 }); const p = STORM_PLANES[i];
      const k = i === 2 ? sm(25.6, 26.9, t) : 0;
      b.group.position.set(p[0], p[1] - 14 * Math.pow(k, 1.4) + 0.15 * Math.sin(t * 1.1 + i), p[2]); b.group.rotation.z = i === 2 ? -0.25 * sm(25.5, 26.3, t) : 0;
      b.group.visible = !(i === 2 && t > 27.2);
    });
    // ---- boards ----
    const n = 9 + [27.56, 28.0, 28.56, 29.0, 31.18].filter((x) => t >= x).length;
    if (n !== this.tallyN) { this.tallyN = n; this.tallyB.draw({ count: n }); }
    const ck = Math.round(sm(54.15, 56.36, t) * 60) / 60;
    if (ck !== this.circlesK) { this.circlesK = ck; this.officeB.draw({ dots: 40, circles: ck }); }
    this.photo.visible = t >= 15.45;
    if (this.photoSeen !== photoVer) { this.photoSeen = photoVer; this.photoTex.needsUpdate = true; }
    // ---- people + their props ----
    this.act(t, sp, cam);
    this.fx.update(t, cam);
    headShadows(this.all.filter((w) => w.p.body.visible).map((w) => w.p));
    const focus = Math.max(0.3, this.v.set(...c.look).sub(cam.position).dot(this.fwd));
    return { focus, cInf: c.blur };
  }
  private cast0 = false;

  private act(t: number, sp: string, cam: THREE.Camera) {
    const P = this.P, done = new Set<Player3D>();
    const show = (p: Player3D, v: boolean) => { p.setVisible(v); if (!v) done.add(p); return v; };
    const base = (p: Player3D, pos: V3, look: [number, number]) => { p.setPos(...pos); p.setLook(look[0], look[1]); p.setWalk(0, 0, look[0], look[1]); p.hand.L = p.restHand("L"); p.hand.R = p.restHand("R"); p.lookEyes(null); };
    const walk = (p: Player3D, a: V3, b: V3, t0: number, t1: number, look?: [number, number]): V3 => {
      const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))), pos = lerpV(a, b, k), d: [number, number] = [b[0] - a[0], b[2] - a[2]];
      base(p, pos, k > 0 && k < 1 ? d : (look ?? d)); if (k > 0 && k < 1) p.setWalk(t * 9, 1, d[0], d[1]); return pos;
    };
    const head = (p: Player3D): V3 => { const h = p.headWorld(this.v); return [h.x, h.y, h.z]; };
    const shoulder = (p: Player3D, s: 1 | -1): V3 => { const r = p.R, h = p.headWorld(this.v); return [h.x + r[0] * 0.15 * s, h.y - 0.3, h.z + r[2] * 0.15 * s]; };

    // ---- cockpit: Max at the yoke, crew at their spots looking at him ----
    const maxHead = head(P.maxC);
    this.crew.forEach(({ p, at, look }, i) => {
      base(p, at, look);
      if (i === 0) { p.hand.R = A(CABIN, -0.04, 0.68, -0.27); p.hand.L = A(CABIN, -0.04, 0.68, -0.45); }
      else p.lookEyes(maxHead, 0.7);
    });
    // ---- ground Max ----
    const mg = P.maxG;
    if (show(mg, (t > 20.2 && t < 24.8) || (t > 27.0 && t < 33.5) || (t > 56.3 && t < 60.9))) {
      if (t < 25) {                                                    // S06 by the plated wing, Swiss cheese
        base(mg, MAX_WING, [0.6, 0.8]);
        const bob = 0.012 * Math.sin(t * 5), lift = sm(22.2, 22.6, t) * 0.06;
        const ch: V3 = [CHEESE[0], CHEESE[1] - 0.06 + lift + bob, CHEESE[2]];
        mg.hand.R = ch; if (t > 23.25 && t < 23.85) mg.hand.L = lerpV(mg.restHand("L"), [ch[0] + 0.05, ch[1], ch[2] + 0.03], sm(23.25, 23.55, t) * (1 - sm(23.7, 23.85, t)));
        mg.lookEyes(t < 22.3 ? head(P.mech1) : ch, 0.8);
        this.cheese.visible = true; this.cheese.position.set(...ch); this.cheese.rotation.y = Math.atan2(cam.position.x - ch[0], cam.position.z - ch[2]);
        const j = sm(23.62, 23.78, t); this.jacket.visible = j > 0; this.jacket.scale.setScalar(Math.max(0.01, j * (1 + 0.25 * Math.sin(Math.min(1, (t - 23.62) / 0.3) * Math.PI))));
      } else if (t < 34) {                                             // S07b at the tally board; confused on "Wait"
        const f = tally(-0.45, 0, 0.9); base(mg, MAX_TALLY, [f[0] - TALLY[0], f[2] - TALLY[2]]); this.cheese.visible = false;
        mg.lookEyes(t < 29.55 ? tally(0, 1.4, 0) : up(tally(1.9, 0, 3.5), 3.0), 0.8);
      } else {                                                         // S15 over his shoulder; scratches his head, then grins
        base(mg, MAX_ENGINE, flat(ENGINE_LOOK[0] - MAX_ENGINE[0], ENGINE_LOOK[2] - MAX_ENGINE[2]));
        const k = sm(57.6, 57.9, t) * (1 - sm(59.2, 59.5, t));
        if (k > 0) { const h = head(mg), r = mg.R; mg.hand.R = lerpV(mg.restHand("R"), [h[0] + r[0] * 0.07, h[1] + 0.16 + 0.02 * Math.sin(t * 22), h[2] + r[2] * 0.07], k); }
        mg.lookEyes(this.engSpots[t < 58.8 ? 0 : 1] ?? ENGINE_LOOK, 0.8);
      }
    } else this.cheese.visible = false;
    // ---- generals: at the hangar board (S04), by the plane (S15) ----
    if (t < 56) {
      const board: V3 = [-0.4, 0, 42.7];
      // fix7: Omar and gen2 moved into the S04 frame (they stood outside it); gen1 stays the over-the-shoulder
      base(P.omar, [-0.3, 0, 40.3], flat(board[0] + 0.3, board[2] - 40.3)); base(P.gen1, [0.9, 0, 39], flat(board[0] - 0.9, board[2] - 39)); base(P.gen2, [0.6, 0, 41.8], flat(board[0] - 0.6, board[2] - 41.8));
      if (t > 17.45 && t < 18.5) { const k = sm(17.45, 17.75, t) * (1 - sm(18.2, 18.5, t)); P.omar.setLook(-1, 0.4); P.omar.hand.R = lerpV(P.omar.restHand("R"), reachTo(shoulder(P.omar, 1), [0.2, 2.0, 42.6], 0.45), k); }
      P.gen1.lookEyes(t > 17.6 ? head(P.omar) : PHOTO_C, 0.7); P.gen2.lookEyes(PHOTO_C, 0.6);
    } else {
      const om: V3 = [-6.27, 0, -3.51], g1: V3 = [-5.9, 0, -2.73];
      base(P.omar, om, flat(MAX_ENGINE[0] - om[0], MAX_ENGINE[2] - om[2])); base(P.gen1, g1, flat(MAX_ENGINE[0] - g1[0], MAX_ENGINE[2] - g1[2])); base(P.gen2, [0.6, 0, 41.8], [0, 1]);
      P.omar.lookEyes(this.engSpots[0] ?? ENGINE_LOOK, 0.6); P.gen1.lookEyes(this.engSpots[0] ?? ENGINE_LOOK, 0.6);
    }
    // ---- mechanics, the stand and the steel plates ----
    const m1 = P.mech1, m2 = P.mech2, ti = [19.1, 19.65, 20.18];
    this.handPlate.visible = false; this.engPlates.forEach((p) => (p.visible = false));
    if (t < 17) {                                                      // S03: one by the parked plane, one at the empty spot looking at the sky
      this.stand.visible = false;
      base(m1, [-9.6, 0, -12.7], [-3.4, 10.7]); base(m2, [13.5, 0, -5], [0.4, -1]); m2.lookEyes([13, 30, -60], 0.9);
      this.wingPlates.forEach((p) => (p.visible = false)); this.wingHoles.forEach((h) => (h.visible = true));
    } else if (t < 56) {                                               // S05 / S06: plates go onto the wing holes
      this.placeStand(this.stand1, this.standTop, 0);
      const s1: V3 = [this.stand1[0], this.standTop, this.stand1[2] - 0.1];
      base(m1, s1, t > 20.5 ? flat(MAX_WING[0] - s1[0], MAX_WING[2] - s1[2]) : [0, -1]);
      const chest = up(s1, 0.75);
      this.wingSpots.forEach((s, i) => {
        const on = t >= ti[i], carry = t >= ti[i] - 0.5 && t < ti[i];
        this.wingHoles[i].visible = !on; this.wingPlates[i].visible = on || carry;
        if (on) this.onSurface(this.wingPlates[i], s, [0, 1, 0]);
        if (carry) { const h = lerpV(chest, up(s, 0.04), sm(ti[i] - 0.5, ti[i] - 0.08, t)); m1.hand.R = h; this.wingPlates[i].position.set(...h); this.wingPlates[i].quaternion.identity(); }
      });
      if (t > 20.5) m1.lookEyes(head(P.maxG), 0.8);
      const m2p: V3 = [s1[0] - 1.25, 0, s1[2] + 0.6]; base(m2, m2p, flat(s1[0] - m2p[0], s1[2] - m2p[2]));
      if (t < 19.7) { const hp: V3 = [m2p[0] + 0.25, 1.25, m2p[2] - 0.15]; m2.hand.R = hp; m2.hand.L = [hp[0] + 0.12, hp[1], hp[2] - 0.05]; this.handPlate.visible = true; this.handPlate.position.set(hp[0] - 0.05, hp[1] + 0.03, hp[2] - 0.05); this.handPlate.rotation.set(0, 0.4, 0); }
      if (t > 20.5) m2.lookEyes(head(P.maxG), 0.7);
    } else {                                                           // S15: the plates come off the wing and go onto the engine
      this.placeStand(this.stand2, this.stand2Top, Math.PI / 2);
      this.wingPlates.forEach((p) => (p.visible = false)); this.wingHoles.forEach((h) => (h.visible = true));
      const s2: V3 = [this.stand2[0], this.stand2Top, this.stand2[2]]; base(m1, s2, [-1, 0]);
      const chest = up(s2, 0.75), E = this.engSpots;
      const placeAt = (pl: THREE.Mesh, s: V3) => { pl.visible = true; pl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)); pl.position.set(s[0] + 0.013, s[1], s[2]); };
      // plate A: in his hands, onto the engine on 58.0
      if (t < 58.0) { const h = lerpV(chest, E[0], sm(57.4, 57.95, t)); m1.hand.R = h; m1.hand.L = [h[0], h[1] - 0.04, h[2] + 0.12]; this.engPlates[0].visible = true; this.engPlates[0].position.set(...h); this.engPlates[0].rotation.set(0, 0, Math.PI / 2 * sm(57.4, 57.95, t)); }
      else placeAt(this.engPlates[0], E[0]);
      // plate B: the second mechanic brings it, hands it up, it goes on at 59.7 ("instead")
      const m2a: V3 = [-4.6, 0, -1.6], m2b: V3 = [s2[0] + 0.25, 0, s2[2] + 0.75];
      const m2pos = walk(m2, m2a, m2b, 56.8, 58.4, flat(s2[0] - m2b[0], s2[2] - m2b[2]));
      if (t < 59.0) { const hp: V3 = t < 58.5 ? [m2pos[0] - 0.12, 0.72, m2pos[2] - 0.12] : lerpV([m2pos[0] - 0.12, 0.72, m2pos[2] - 0.12], up(chest, -0.1), sm(58.5, 58.95, t)); m2.hand.R = hp; m2.hand.L = [hp[0] + 0.1, hp[1], hp[2]]; this.engPlates[1].visible = true; this.engPlates[1].position.set(...hp); this.engPlates[1].rotation.set(0, 0, 0); }
      else if (t < 59.7) { const h = lerpV(up(chest, -0.1), E[1], sm(59.05, 59.65, t)); m1.hand.R = h; this.engPlates[1].visible = true; this.engPlates[1].position.set(...h); this.engPlates[1].rotation.set(0, 0, Math.PI / 2 * sm(59.05, 59.65, t)); }
      else placeAt(this.engPlates[1], E[1]);
      m2.lookEyes(head(m1), 0.7);
    }
    // ---- Wald + colleagues ----
    const office = sp.startsWith("office");
    if (show(P.waldS, sp === "office")) {                              // S09 writing; S12 lifts the holed model up to the lamp
      base(P.waldS, WALD_DESK, [0, 1]);
      if (t < 45) {
        const w: V3 = A(OFFICE, 0.86 + 0.025 * Math.sin(t * 13), 0.79, -1.52 + 0.012 * Math.sin(t * 7)); P.waldS.hand.R = w; P.waldS.hand.L = A(OFFICE, 1.16, 0.79, -1.55);
        this.pencil.visible = true; this.pencil.position.set(w[0], w[1] + 0.03, w[2]); this.pencil.rotation.set(0.5, 0, -0.4);
        P.waldS.lookEyes(t < 35.3 ? A(OFFICE, 0.9, 0.76, -1.3) : null, 0.8);
      } else {
        this.pencil.visible = false;
        const k = sm(49.2, 49.9, t), m = lerpV(MODEL_DESK, MODEL_UP, k);
        P.waldS.hand.L = [m[0] - 0.02, m[1] - 0.03, m[2] + 0.05]; P.waldS.lookEyes(k > 0.3 ? MODEL_UP : null, 0.9);
      }
    } else this.pencil.visible = false;
    { // the model bomber: on the desk, then in his hand (S12)
      const k = sm(49.2, 49.9, t), m = t < 45 ? MODEL_DESK : lerpV(MODEL_DESK, MODEL_UP, k);
      this.model.group.position.set(m[0], m[1] + 0.01 * Math.sin(t * 2) * k, m[2]); this.model.group.rotation.set(0.05 * k, 0, 0.08 * k); this.model.update(t, { spin: 0 });
    }
    this.chalk.visible = false;
    if (show(P.waldB, sp === "office2" || sp === "office3")) {
      if (sp === "office2") {                                          // S10: asks; on "Where are the holes..." turns and points at the clean engines
        const turn = sm(40.95, 41.3, t);
        base(P.waldB, WALD_BOARD, [0.45 + 0.35 * turn, 1 - 1.65 * turn]);
        P.waldB.lookEyes(turn > 0.5 ? BOARD_MARKS[1] : head(P.col1), 0.8);
        if (turn > 0) { const k = sm(41.1, 41.45, t); P.waldB.hand.L = lerpV(P.waldB.restHand("L"), reachTo(shoulder(P.waldB, -1), BOARD_MARKS[1], 0.5), k); }
      } else {                                                         // S14: walks along the board, circling engines and cockpit in red chalk
        const k = sm(54.15, 56.36, t) * 5, i = Math.min(4, Math.floor(k)), mk = BOARD_MARKS[i], prev = BOARD_MARKS[Math.max(0, i - 1)];
        const bx = (q: V3) => q[0] - 0.3, x = i === 0 ? bx(mk) : bx(prev) + (bx(mk) - bx(prev)) * sm(0, 0.35, k - i), pos: V3 = [x, 0, BOARD_C[2] + 0.58];
        base(P.waldB, pos, [0.15, -1]);
        const ang = (k - i) * Math.PI * 2.1 - Math.PI / 2, r = i === 4 ? 0.13 : 0.15, target: V3 = [mk[0] + Math.cos(ang) * r, mk[1] - Math.sin(ang) * r, mk[2] + 0.02];
        const h = reachTo(shoulder(P.waldB, 1), target, 0.55); P.waldB.hand.R = h; P.waldB.lookEyes(mk, 0.9);
        this.chalk.visible = true; this.chalk.position.set(...h); this.chalk.rotation.set(Math.PI / 2, 0, 0);
      }
    }
    if (show(P.col1, sp === "office2")) { base(P.col1, A(OFFICE, -2.3, 0, -0.6), flat(-0.05, -1)); P.col1.lookEyes(t < 41.2 ? head(P.waldB) : BOARD_MARKS[1], 0.8); }
    if (show(P.col2, sp === "office2")) { base(P.col2, A(OFFICE, -0.15, 0, -0.1), flat(-1.2, -1)); P.col2.lookEyes(head(P.waldB), 0.7); }
    // ---- fantasy diner ----
    const ava = P.ava, avaStart = A(DINER, 2.4, 0, 2.2), avaEnd = A(DINER, 0.2, 0, 1.2);   // fix7: was (1.6,-2.6) -> (-0.35,-0.5), behind the table
    walk(ava, avaStart, avaEnd, 43.3, 44.9, [-0.55, 1]);   // fix7b: turned toward the camera (her back showed)
    { const L = ava.lookDir(), r = ava.R, pv = t < 44.9 ? lerpV(avaStart, avaEnd, Math.max(0, Math.min(1, (t - 43.3) / 1.6))) : avaEnd;
      const cb: V3 = [pv[0] + L.x * 0.17 - r[0] * 0.07, 0.56, pv[2] + L.z * 0.17 - r[2] * 0.07]; ava.hand.L = cb;   // fix7d: clipboard held lower (the arm line crossed her chin)
      this.clip.position.set(...cb); this.clip.rotation.set(-0.9, Math.atan2(L.x, L.z), 0);
      if (t > 45.0 && t < 46.5) ava.hand.R = [cb[0] + r[0] * 0.04 + 0.02 * Math.sin(t * 15), cb[1] + 0.04, cb[2] + r[2] * 0.04];
      ava.lookEyes(head(this.diners[2].p), 0.7); }
    this.diners.forEach(({ p, at, look }) => { base(p, at, look); p.lookEyes(t > 44.5 ? head(ava) : null, 0.7); });
    const door = A(DINER, -2.2, 0, -8), gone = A(DINER, -2.2, 0, -9.6);
    for (const [who, from, t0] of [["din4", A(DINER, -1.6, 0, -3.4), 45.5], ["din5", A(DINER, -2.7, 0, -3.0), 45.9]] as [string, V3, number][]) {
      const p = P[who], t1 = t0 + 2.6, t2 = t1 + 0.8;
      if (show(p, t < t2)) { if (t < t1) walk(p, from, door, t0, t1); else walk(p, door, gone, t1, t2); }
    }
    // ---- update every visible person ----
    let i = 0; for (const { p } of this.all) { i++; if (done.has(p)) continue; p.update(t, cam, 0, 100 + i * 14); }
    void office;
  }
}

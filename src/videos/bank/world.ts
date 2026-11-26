// THE WORLD of "The pants bet": the bank hall (counter, waiting chairs, entrance, CEO door), the CEO's office behind the left
// wall, the fantasy space far away at x = FX, the people and every prop. update() places everything for time t (pure function of t).
import * as THREE from "three";
import { TONE, twoTone } from "../../engine/post/shade";
import { NOINK } from "../../engine/post/ink";
import { loadImages as loadAll, Imgs } from "../../engine/cast/assets";
import { Player, buildCast, CastTex, Hand } from "../../engine/cast/player";
import { M, MT, noInk, hull, popScale } from "../../engine/kit";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import * as S from "./story";
import { V3, Who, F, T, mix, lerp, smooth, clamp01 } from "./story";
import * as X from "./tex";

// ---------------- pictures: this video has its own folder public/bank (cast, wardrobe, hats) ----------------
export const CAST: Record<Who, { outfit: string; hat?: string }> = {
  ava: { outfit: "cardigan" }, arian: { outfit: "luckytee" }, max: { outfit: "suit" }, tina: { outfit: "teller" },
  cop: { outfit: "police", hat: "police" }, nora: { outfit: "dress" }, omar: { outfit: "hoodie" },
};
export const loadImages = () => {
  const a: Record<string, string> = { body: "bank/cast/body.png" };
  for (const [c, s] of Object.entries(CAST)) {
    for (const f of ["neutral", "smug", "shock", "grin", "back"]) a[`${c}_${f}`] = `bank/cast/${c}/${f}.png`;
    a[`${c}_torso_front`] = `bank/wardrobe/${s.outfit}/torso_front.png`; a[`${c}_torso_back`] = `bank/wardrobe/${s.outfit}/torso_back.png`;
    if (s.hat) { a[`${c}_hat_front`] = `bank/hats/${s.hat}_front.png`; a[`${c}_hat_back`] = `bank/hats/${s.hat}_back.png`; }
  }
  return loadAll(a);
};
export const buildAll = (imgs: Imgs) => Object.fromEntries((Object.keys(CAST) as Who[]).map((w) => [w, buildCast(imgs, w, { keepDark: w === "max", talk: w === "ava" || w === "arian", noRim: true })])) as Record<Who, CastTex>;

const INK = "#241726";
const rr = (k: number) => { const x = Math.sin(k * 127.1) * 43758.5453; return x - Math.floor(x); };
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// k = 1 between a and b, eased in over `i` seconds and out over `o` seconds
const win = (t: number, a: number, b: number, i = 0.25, o = 0.3) => smooth(a, a + i, t) * (1 - smooth(b, b + o, t));
const addGlow = (map: THREE.Texture, col: THREE.Color, opacity: number) => new THREE.MeshBasicMaterial({ map, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity, side: THREE.DoubleSide });
const cut = (map: THREE.Texture, col = new THREE.Color(1, 1, 1)) => new THREE.MeshBasicMaterial({ map, color: col, transparent: true, alphaTest: 0.06, side: THREE.DoubleSide });

type Bill = THREE.Mesh;

export class BankWorld implements World {
  root = new THREE.Group();
  private sun = new THREE.DirectionalLight("#fff0d6", 2.8);
  private hemi = new THREE.HemisphereLight("#ffe9c8", "#857a72", 0.6);
  private P = {} as Record<Who | "dream", Player>;
  private blobs = {} as Record<string, THREE.Mesh>;
  private bills: Bill[] = [];
  private motes: { m: THREE.Mesh; x: number; y: number; z: number; ph: number; sz: number }[] = [];
  private halos: THREE.Mesh[] = [];
  private ceoDoor = new THREE.Group(); private slideA!: THREE.Mesh; private slideB!: THREE.Mesh;
  private boardParts: THREE.Object3D[] = []; private board!: THREE.Mesh; private boardMats!: [THREE.Material, THREE.Material]; private boardHalo!: THREE.Mesh;
  private ticketA!: THREE.Mesh; private ticketR!: THREE.Mesh; private bag = new THREE.Group(); private brief = new THREE.Group();
  private cashA = new THREE.Group(); private cashB = new THREE.Group(); private cashD = new THREE.Group();
  private noteS!: THREE.Mesh; private noteSMats!: THREE.Material[]; private noteB!: THREE.Mesh; private noteBMats!: THREE.Material[];
  private coins: THREE.Mesh[] = []; private qmarks: THREE.Mesh[] = []; private dq: THREE.Mesh[] = [];
  private puffsO: THREE.Mesh[] = []; private puffsH: THREE.Mesh[] = []; private sparks: { m: THREE.Mesh; t: number; p: V3; s: number }[] = [];
  private glint!: THREE.Mesh; private pen = new THREE.Group();
  private fant = new THREE.Group(); private dice = new THREE.Group(); private trophy = new THREE.Group(); private lens = new THREE.Group();
  private ring!: THREE.Mesh; private burst: { m: THREE.Mesh; d: THREE.Vector3 }[] = []; private rimRing!: THREE.Mesh;
  private twinkles: { m: THREE.Mesh; ph: number; s: number }[] = []; private floaters: { m: THREE.Mesh; a: number; r: number; y0: number; sp: number; ph: number; s: number }[] = [];
  private v = new THREE.Vector3(); private fwd = new THREE.Vector3();

  constructor(imgs: Imgs) {
    const R = this.root;
    R.add(this.hemi, this.sun, this.sun.target);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    const mk = (parent: THREE.Object3D) => {
      const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; };
      return {
        add,
        box: (w: number, h: number, d: number, col: string | THREE.Material, x: number, yb: number, z: number) => add(new THREE.BoxGeometry(w, h, d), typeof col === "string" ? M(col) : col, x, yb + h / 2, z),
        cyl: (r0: number, r1: number, h: number, col: string, x: number, yb: number, z: number, seg = 18) => add(new THREE.CylinderGeometry(r0, r1, h, seg), M(col), x, yb + h / 2, z),
        sph: (r: number, col: string, x: number, y: number, z: number) => add(new THREE.SphereGeometry(r, 14, 10), M(col), x, y, z),
        plane: (w: number, h: number, m: THREE.Material, x: number, y: number, z: number, ry = 0) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.y = ry; o.receiveShadow = true; parent.add(o); return o; },
        flat: (w: number, d: number, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); o.position.set(x, y, z); o.rotation.x = -Math.PI / 2; o.receiveShadow = true; parent.add(o); return o; },
      };
    };
    const sprite = (map: THREE.Texture, w: number, h: number, parent: THREE.Object3D = R, additive = false, col = new THREE.Color(1, 1, 1)) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), additive ? addGlow(map, col, 1) : new THREE.MeshBasicMaterial({ map, color: col, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      m.frustumCulled = false; noInk(m); parent.add(m); this.bills.push(m); return m;
    };
    const glow = X.glowTex(), spark = X.sparkTex();
    const H = mk(R);

    // =====================================================================================================
    // THE HALL
    // =====================================================================================================
    H.flat(6.8, 7.8, MT(X.floorTex(8, 9)), 0, 0, -0.7).castShadow = false;
    H.flat(6.8, 0.9, MT(X.runnerTex()), 0, 0.006, S.LANE_Z);
    const ceil = H.flat(6.8, 7.8, M("#F6EEDC"), 0, 2.5, -0.7); ceil.rotation.x = Math.PI / 2; ceil.castShadow = false;
    const WALL = "#12A098", WOOD = "#9A4E20", TRIM = "#5B3418", GOLD = "#F2B41E";
    const wallMat = MT((() => { const t = X.wallTex(WALL, "#22B6A8"); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 1); return t; })());
    // wall pieces along x (front/back) and along z (sides); lower pieces get a wood panel band on the inside
    const wallZ = (x: number, z0: number, z1: number, y0: number, y1: number, inside: 1 | -1) => {
      H.box(0.2, y1 - y0, z1 - z0, wallMat, x, y0, (z0 + z1) / 2);
      if (y0 === 0) { H.box(0.05, 0.62, z1 - z0, WOOD, x + inside * 0.115, 0, (z0 + z1) / 2); H.box(0.07, 0.05, z1 - z0, TRIM, x + inside * 0.12, 0.62, (z0 + z1) / 2); }
    };
    const wallX = (z: number, x0: number, x1: number, y0: number, y1: number, inside: 1 | -1) => {
      H.box(x1 - x0, y1 - y0, 0.2, wallMat, (x0 + x1) / 2, y0, z);
      if (y0 === 0) { H.box(x1 - x0, 0.62, 0.05, WOOD, (x0 + x1) / 2, 0, z + inside * 0.115); H.box(x1 - x0, 0.05, 0.07, TRIM, (x0 + x1) / 2, 0.62, z + inside * 0.12); }
    };
    wallX(-4.7, -3.6, 3.6, 0, 2.5, 1);                                                         // back wall
    wallZ(-3.5, -4.6, -1.35, 0, 2.5, 1); wallZ(-3.5, -0.45, 3.2, 0, 2.5, 1); wallZ(-3.5, -1.35, -0.45, 1.5, 2.5, 1);   // left wall + CEO door opening
    wallZ(3.5, -4.6, -1.5, 0, 2.5, -1); wallZ(3.5, -0.3, 3.2, 0, 2.5, -1); wallZ(3.5, -1.5, -0.3, 1.7, 2.5, -1);        // right wall + entrance
    wallX(3.3, -3.6, 3.6, 0, 0.8, -1); wallX(3.3, -3.6, 3.6, 2.0, 2.5, -1);                    // front wall with three windows
    for (const [a, b] of [[-3.6, -2.6], [-1.2, -0.7], [0.7, 1.2], [2.6, 3.6]]) wallX(3.3, a, b, 0.8, 2.0, -1);
    const beams: THREE.Mesh[] = [];
    const sunDir = new THREE.Vector3(-1.5, -3.9, -8.8).normalize(), bt = X.beamTex();
    [-1.9, 0, 1.9].forEach((wx, i) => {
      const win = H.plane(1.4, 1.2, new THREE.MeshBasicMaterial({ map: X.cityTex(i), color: new THREE.Color(1.45, 1.4, 1.3) }), wx, 1.4, 3.36, Math.PI); win.castShadow = false; noInk(win);
      H.box(1.5, 0.07, 0.1, TRIM, wx, 0.78, 3.2); H.box(1.5, 0.07, 0.1, TRIM, wx, 1.97, 3.2); H.box(0.05, 1.2, 0.08, TRIM, wx, 0.8, 3.2); H.box(1.4, 0.04, 0.08, TRIM, wx, 1.38, 3.2);
      H.box(1.7, 0.05, 0.22, WOOD, wx, 0.74, 3.12);
      // light shafts through the window
      const topY = 1.95, botY = 0.02, tt = (topY - botY) / -sunDir.y, off = sunDir.clone().multiplyScalar(tt);
      for (const [x0, x1] of [[wx - 0.62, wx - 0.05], [wx + 0.05, wx + 0.62]]) {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute([x0, topY, 3.15, x1, topY, 3.15, x1 + off.x, botY, 3.15 + off.z, x0 + off.x, botY, 3.15 + off.z], 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
        const m = new THREE.Mesh(g, addGlow(bt, new THREE.Color(1.7, 1.2, 0.55), 0.26)); m.frustumCulled = false; noInk(m); R.add(m); beams.push(m);
      }
    });
    H.plane(0.46, 0.46, cut(X.clockTex()), 0, 2.26, 3.18, Math.PI);
    // entrance: bright street outside, two glass doors that slide apart, gold frame
    // ---- OUTSIDE (x > 3.6): pavement, kerb, road, shops across the road, the bank's stone front, sky all round ----
    {
      const sky = new THREE.Mesh(new THREE.SphereGeometry(45, 32, 16), new THREE.MeshBasicMaterial({ map: X.daySkyTex(), side: THREE.BackSide, color: new THREE.Color(1.15, 1.12, 1.08) }));
      sky.position.set(6, -6, 0); sky.rotation.y = 0.6; noInk(sky); R.add(sky);
      H.flat(3.0, 20, MT(X.pavingTex(3, 20)), 5.1, 0.002, 0).castShadow = false;
      H.box(0.16, 0.07, 20, "#C9B9A6", 6.68, 0, 0);
      H.flat(3.5, 20, MT(X.asphaltTex(3, 18)), 8.5, 0.001, 0).castShadow = false;
      for (let z = -9.5; z < 10; z += 1.25) { const d = H.flat(0.09, 0.6, M("#FFF4D6"), 8.5, 0.004, z); d.castShadow = false; }
      H.box(0.16, 0.07, 20, "#C9B9A6", 10.33, 0, 0);
      H.flat(1.6, 20, MT(X.pavingTex(2, 20)), 11.2, 0.002, 0).castShadow = false;
      // shops across the road (they face the bank)
      [[-8.4, 3], [-6.0, 2], [-3.6, 3], [-1.2, 2], [1.2, 3], [3.6, 2], [6.0, 3], [8.4, 2]].forEach(([z, fl], i) => {
        const h = 1.2 * fl + 0.6, m = H.plane(2.36, h, MT(X.shopTex(i, fl)), 12.0, h / 2, z, -Math.PI / 2); m.castShadow = false;
        H.box(1.6, h, 2.36, "#8E6AA8", 12.82, 0, z); H.box(0.25, 0.1, 2.44, "#3B2A4A", 11.95, h, z);
      });
      // the bank's front: cream stone with a hole for the glass doors, columns, gold sign, steps
      const st = (w: number, h: number, y: number, z: number) => { const m = H.plane(w, h, MT(X.stoneTex(w * 1.2, h * 1.2)), 3.62, y + h / 2, z, Math.PI / 2); m.castShadow = false; return m; };
      st(3.3, 3.4, 0, -3.15); st(3.75, 3.4, 0, 1.575); st(1.2, 1.7, 1.7, S.LANE_Z);
      H.box(0.3, 0.16, 8.3, "#D9C29A", 3.72, 3.3, -0.8); H.box(0.18, 0.12, 8.3, GOLD, 3.7, 3.18, -0.8);
      for (const z of [-1.85, 0.05]) { H.cyl(0.11, 0.13, 2.05, "#FFF4E0", 3.82, 0.1, z, 16); H.box(0.32, 0.1, 0.32, "#E7D3AE", 3.82, 0, z); H.box(0.32, 0.1, 0.32, "#E7D3AE", 3.82, 2.15, z); }
      { const sg = H.plane(1.5, 0.38, new THREE.MeshBasicMaterial({ map: X.bankSignTex(), color: new THREE.Color(1.25, 1.2, 1.2) }), 3.66, 2.55, S.LANE_Z, Math.PI / 2); noInk(sg); sg.castShadow = false; }
      H.box(0.45, 0.06, 2.4, "#E7D3AE", 3.85, 0, S.LANE_Z);
      // street things: lamps, trees in pots, a bench, a parked car, a hydrant
      for (const z of [-4.2, 2.6]) { H.cyl(0.03, 0.04, 2.2, "#2E2A44", 6.35, 0, z, 10); H.box(0.18, 0.2, 0.18, "#2E2A44", 6.35, 2.2, z); const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.5, 1.5) })); b.position.set(6.35, 2.2, z); noInk(b); R.add(b); }
      for (const z of [-2.8, 1.3]) { H.box(0.42, 0.32, 0.42, "#C8503A", 4.5, 0, z); H.cyl(0.04, 0.05, 0.5, "#6B3F22", 4.5, 0.32, z, 8); H.sph(0.38, "#2FA84F", 4.5, 1.02, z); H.sph(0.24, "#3FC25F", 4.62, 1.3, z + 0.05); }
      H.box(0.36, 0.05, 0.9, "#C8503A", 6.1, 0.24, -6.0); for (const dz of [-0.36, 0.36]) H.box(0.3, 0.24, 0.06, "#2E2A44", 6.1, 0, -6.0 + dz); H.box(0.06, 0.28, 0.9, "#C8503A", 6.26, 0.29, -6.0);
      { const cz = 4.6; H.box(0.9, 0.36, 1.9, "#2F7BF2", 7.4, 0.12, cz); H.box(0.8, 0.3, 1.0, "#9FD8FF", 7.4, 0.48, cz - 0.1); H.box(0.84, 0.05, 1.04, "#2F7BF2", 7.4, 0.78, cz - 0.1);
        for (const [dx, dz] of [[-0.42, -0.6], [0.42, -0.6], [-0.42, 0.6], [0.42, 0.6]]) { const w = H.cyl(0.15, 0.15, 0.1, "#1E1B2E", 7.4 + dx, 0.15, cz + dz, 14); w.rotation.z = Math.PI / 2; w.position.y = 0.15; } }
      H.cyl(0.06, 0.07, 0.26, "#E8283C", 6.4, 0, -1.9, 10); H.sph(0.065, "#E8283C", 6.4, 0.27, -1.9);
    }
    const glass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.95, 1.05), transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
    const pane = (z: number) => { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.62), glass); p.rotation.y = -Math.PI / 2; p.position.y = 0.85; noInk(p); g.add(p);
      for (const dz of [-0.3, 0.3]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.66, 0.04), M(GOLD)); b.position.set(0, 0.85, dz); g.add(b); }
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.03), M(GOLD)); h.position.set(-0.03, 0.8, z > S.LANE_Z ? -0.22 : 0.22); g.add(h);
      g.position.set(3.42, 0, z); R.add(g); return g as unknown as THREE.Mesh; };
    this.slideA = pane(S.LANE_Z - 0.3); this.slideB = pane(S.LANE_Z + 0.3);
    H.box(0.26, 0.1, 1.36, GOLD, 3.5, 1.68, S.LANE_Z); H.box(0.26, 1.7, 0.08, GOLD, 3.5, 0, -1.52); H.box(0.26, 1.7, 0.08, GOLD, 3.5, 0, -0.28);
    // CEO door (opens into the office) with a gold plate
    H.box(0.26, 0.09, 1.06, TRIM, -3.5, 1.5, S.LANE_Z); H.box(0.26, 1.5, 0.08, TRIM, -3.5, 0, -1.39); H.box(0.26, 1.5, 0.08, TRIM, -3.5, 0, -0.41);
    {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.48, 0.9), MT(X.woodTex("#7A4520", "#6B3A1A"))); leaf.position.set(0, 0.74, -0.45); leaf.castShadow = true; this.ceoDoor.add(leaf);
      for (const [y, h] of [[0.42, 0.5], [1.06, 0.34]]) for (const sx of [1, -1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.012, h, 0.6), M("#8A5226")); p.position.set(sx * 0.034, y, -0.45); this.ceoDoor.add(p); }
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.158), cut(X.plaqueTex("CEO"), new THREE.Color(1.15, 1.1, 1.0))); plate.rotation.y = Math.PI / 2; plate.position.set(0.045, 1.07, -0.45); noInk(plate); this.ceoDoor.add(plate);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), M(GOLD)); knob.position.set(0.06, 0.72, -0.8); this.ceoDoor.add(knob);
      this.ceoDoor.position.set(-3.42, 0, -0.45); R.add(this.ceoDoor);
    }
    // counter: wood front, green marble top, gold strip, glass dividers; staff side behind it
    const C = S.COUNTER, cw = C.x1 - C.x0, cx = (C.x0 + C.x1) / 2, cz = (C.z0 + C.z1) / 2;
    H.box(cw, 0.46, 0.5, MT((() => { const t = X.woodTex(); t.repeat.set(6, 1); return t; })()), cx, 0, cz);
    H.box(cw + 0.1, 0.04, 0.6, MT(X.marbleTex()), cx, 0.46, cz); H.box(cw + 0.02, 0.04, 0.03, GOLD, cx, 0.36, C.z1 + 0.01); H.box(cw + 0.02, 0.06, 0.03, TRIM, cx, 0, C.z1 + 0.01);
    for (const dx of [-2.55, -1.3]) {
      H.cyl(0.02, 0.02, 0.55, GOLD, dx, 0.5, cz, 8); H.sph(0.035, GOLD, dx, 1.07, cz);
      const gp = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.5), glass); gp.rotation.y = Math.PI / 2; gp.position.set(dx, 0.77, cz); noInk(gp); R.add(gp);
    }
    for (const [mx, col] of [[-1.9, "#3A7BE8"]] as const) { H.box(0.3, 0.24, 0.04, "#2A2A38", mx, 0.56, -3.0); const sc = H.plane(0.26, 0.2, new THREE.MeshBasicMaterial({ map: X.screenTex(col) }), mx, 0.68, -3.022, Math.PI); noInk(sc); H.box(0.08, 0.06, 0.08, "#2A2A38", mx, 0.5, -3.0); }
    {                                                    // pen on a little chain, at Ava's window
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.11, 8), M("#22308A")); p.rotation.z = 0.5; p.position.y = 0.05; this.pen.add(p); R.add(this.pen);
      H.cyl(0.03, 0.035, 0.03, GOLD, -0.2, 0.5, -2.72, 12);
    }
    // back wall: the bank's name, a round vault door, cabinets
    noInk(H.plane(3.4, 0.53, cut(X.signTex(), new THREE.Color(1.2, 1.15, 1.05)), -0.7, 2.08, -4.585));
    {
      const vx = 2.25, vy = 1.0, vz = -4.56;
      const d = H.cyl(0.78, 0.78, 0.1, "#8E96A8", vx, 0, vz, 40); d.rotation.x = Math.PI / 2; d.position.y = vy;
      const d2 = H.cyl(0.62, 0.62, 0.14, "#B4BCCB", vx, 0, vz, 40); d2.rotation.x = Math.PI / 2; d2.position.y = vy;
      const hub = H.cyl(0.12, 0.12, 0.2, GOLD, vx, 0, vz, 20); hub.rotation.x = Math.PI / 2; hub.position.y = vy;
      for (let k = 0; k < 4; k++) { const sp = H.box(0.62, 0.05, 0.05, GOLD, vx, 0, vz + 0.1); sp.position.y = vy; sp.rotation.z = (k * Math.PI) / 4; }
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; H.sph(0.035, "#5A6274", vx + Math.cos(a) * 0.7, vy + Math.sin(a) * 0.7, vz + 0.06); }
    }
    H.box(1.6, 1.1, 0.35, "#6B3F22", -2.4, 0, -4.4);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) H.box(0.13, 0.26, 0.2, ["#E0283F", "#F2B921", "#3A7BE8", "#2FA84F", "#7A3FD0", "#FF7AB6"][(k + r * 2) % 6], -3.05 + k * 0.165, 0.06 + r * 0.35, -4.3);
    H.box(1.2, 0.5, 0.4, "#C7CBD6", 0.6, 0, -4.4); H.box(0.5, 0.4, 0.3, "#3A3F52", 0.6, 0.5, -4.4);
    // the hanging number board
    {
      this.boardMats = [new THREE.MeshBasicMaterial({ map: X.boardTex("32", false), color: new THREE.Color(1.25, 1.2, 1.15) }), new THREE.MeshBasicMaterial({ map: X.boardTex("33", true), color: new THREE.Color(1.7, 1.6, 1.4) })];
      this.boardParts.push(H.box(1.14, 0.56, 0.08, "#2A2238", S.BOARD[0], S.BOARD[1] - 0.28, S.BOARD[2]));
      this.board = H.plane(1.06, 0.5, this.boardMats[0], S.BOARD[0], S.BOARD[1], S.BOARD[2] + 0.045); this.board.castShadow = false; noInk(this.board);
      for (const dx of [-0.4, 0.4]) this.boardParts.push(H.cyl(0.012, 0.012, 0.5, "#3A3F52", S.BOARD[0] + dx, 2.0, S.BOARD[2], 6));
      this.boardHalo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), addGlow(glow, new THREE.Color(1.4, 0.9, 0.35), 0)); this.boardHalo.position.set(S.BOARD[0], S.BOARD[1], S.BOARD[2] + 0.06); noInk(this.boardHalo); R.add(this.boardHalo);
    }
    // waiting chairs: orange seats on a steel beam
    for (const sx of S.SEATS) {
      H.box(0.52, 0.045, 0.44, "#FF4F22", sx, S.SEAT_Y - 0.045, S.ROW_Z + 0.03); H.box(0.52, 0.38, 0.045, "#FF4F22", sx, S.SEAT_Y + 0.02, S.ROW_Z + 0.26);
      H.box(0.44, 0.03, 0.02, "#C9461C", sx, S.SEAT_Y + 0.3, S.ROW_Z + 0.235);
    }
    H.box(3.7, 0.045, 0.07, "#4A4F5E", 0, 0.08, S.ROW_Z + 0.05); for (const lx of [-1.7, 0, 1.7]) { H.box(0.06, 0.1, 0.5, "#4A4F5E", lx, 0, S.ROW_Z + 0.05); H.box(0.05, 0.08, 0.05, "#4A4F5E", lx, 0.1, S.ROW_Z + 0.05); }
    // decor: posters, plants, water cooler, cash machine, ticket kiosk, queue posts
    noInk(H.plane(0.6, 0.8, MT(X.posterTex(0)), -3.385, 1.35, 1.2, Math.PI / 2)); noInk(H.plane(0.6, 0.8, MT(X.posterTex(1)), -3.38, 1.35, 2.3, Math.PI / 2));
    noInk(H.plane(0.6, 0.8, MT(X.posterTex(2)), 3.385, 1.35, 1.0, -Math.PI / 2)); noInk(H.plane(0.6, 0.8, MT(X.posterTex(3)), 3.38, 1.35, 2.2, -Math.PI / 2));
    noInk(H.plane(0.6, 0.8, MT(X.posterTex(3)), -3.385, 1.35, -2.6, Math.PI / 2)); noInk(H.plane(0.6, 0.8, MT(X.posterTex(0)), 3.385, 1.35, -2.8, -Math.PI / 2));
    for (const [px, pz] of [[-3.0, 2.85], [3.0, 2.85], [-3.05, 0.0]] as const) { H.cyl(0.2, 0.15, 0.3, "#C8503A", px, 0, pz); H.sph(0.32, "#2FA84F", px, 0.62, pz); H.sph(0.2, "#3FC25F", px + 0.13, 0.92, pz); }
    H.box(0.3, 0.55, 0.3, "#F4F0E6", -3.1, 0, 1.75); H.cyl(0.12, 0.12, 0.3, "#5FB8F2", -3.1, 0.55, 1.75); H.box(0.1, 0.08, 0.04, "#3A7BE8", -3.1, 0.36, 1.59);
    H.box(0.6, 1.15, 0.3, "#5A6274", 2.5, 0, 3.02); noInk(H.plane(0.4, 0.3, new THREE.MeshBasicMaterial({ map: X.screenTex("#2FA8A0"), color: new THREE.Color(1.3, 1.3, 1.3) }), 2.5, 0.78, 2.865, Math.PI)); H.box(0.4, 0.04, 0.12, "#C7CBD6", 2.5, 0.52, 2.82);
    H.box(0.34, 0.75, 0.3, "#E0283F", 3.05, 0, -2.3); H.box(0.36, 0.06, 0.32, "#F4F0E6", 3.05, 0.75, -2.3); noInk(H.plane(0.22, 0.16, new THREE.MeshBasicMaterial({ map: X.screenTex("#3A7BE8") }), 2.875, 0.58, -2.3, -Math.PI / 2));
    for (const pz of [-2.1, -1.5]) { H.cyl(0.025, 0.025, 0.5, GOLD, 1.25, 0, pz, 10); H.cyl(0.09, 0.1, 0.03, GOLD, 1.25, 0, pz); H.sph(0.04, GOLD, 1.25, 0.52, pz); }
    { const rope = H.box(0.025, 0.025, 0.6, "#C2232B", 1.25, 0.42, -1.8); rope.castShadow = false; }
    // royal purple banners with a gold coin (rich colour against the teal walls)
    for (const [bx, bz, ry] of [[-0.95, 3.17, Math.PI], [0.95, 3.17, Math.PI], [-3.37, -3.6, Math.PI / 2], [3.37, -3.9, -Math.PI / 2]] as const) {
      const b = H.plane(0.36, 0.95, new THREE.MeshBasicMaterial({ map: X.bannerTex(), side: THREE.DoubleSide, color: new THREE.Color(1.1, 1.05, 1.15) }), bx, 1.42, bz, ry); noInk(b); b.castShadow = false;
    }
    // ceiling lamps with a glow and a pool of light
    for (const [lx, lz] of [[-1.7, 0.7], [1.7, 0.7]] as const) {
      H.cyl(0.008, 0.008, 0.42, INK, lx, 2.08, lz, 6);
      { const sh = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 20, 1, true), twoTone(new THREE.MeshLambertMaterial({ color: "#E7B13A", side: THREE.DoubleSide }))); sh.position.set(lx, 2.03, lz); R.add(sh); }
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1.8) })); bulb.position.set(lx, 1.96, lz); noInk(bulb); R.add(bulb);
      const halo = sprite(glow, 0.9, 0.9, R, true, new THREE.Color(1, 0.85, 0.6)); halo.position.set(lx, 1.96, lz); (halo.material as THREE.MeshBasicMaterial).opacity = 0.5; this.halos.push(halo);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), addGlow(glow, new THREE.Color(1.1, 0.8, 0.45), 0.22)); pool.rotation.x = -Math.PI / 2; pool.position.set(lx, 0.012, lz); noInk(pool); R.add(pool);
    }
    // floating dust sparkles
    for (let i = 0; i < 90; i++) {
      const big = i % 9 === 0, sz = big ? 0.045 : 0.016 + rr(i + 333) * 0.012;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), addGlow(big ? spark : glow, new THREE.Color(1.6, 1.35, 0.95), 1)); m.frustumCulled = false; noInk(m); R.add(m);
      this.motes.push({ m, x: (rr(i + 1) - 0.5) * 6, y: 0.25 + rr(i + 60) * 1.9, z: -3.2 + rr(i + 120) * 6, ph: rr(i + 200) * 6.28, sz });
    }

    // =====================================================================================================
    // THE CEO'S OFFICE (x -6.7 .. -3.6)
    // =====================================================================================================
    const NAVY = "#2B5C9A";
    H.flat(3.1, 3.7, MT(X.carpetTex()), -5.15, 0.003, -0.85);
    { const c2 = H.flat(3.1, 3.7, M("#EFE6D2"), -5.15, 2.3, -0.85); c2.rotation.x = Math.PI / 2; c2.castShadow = false; }
    H.box(3.3, 2.3, 0.2, NAVY, -5.15, 0, -2.8); H.box(3.3, 2.3, 0.2, NAVY, -5.15, 0, 1.1); H.box(0.2, 2.3, 4.1, NAVY, -6.8, 0, -0.85);
    H.box(0.03, 2.3, 1.2, NAVY, -3.615, 0, -2.0); H.box(0.03, 2.3, 1.45, NAVY, -3.615, 0, 0.3); H.box(0.03, 0.8, 0.9, NAVY, -3.615, 1.5, -0.9);
    H.box(3.1, 0.5, 0.04, WOOD, -5.15, 0, -2.68); H.box(3.1, 0.04, 0.06, GOLD, -5.15, 0.5, -2.67);
    { const w = H.plane(1.7, 0.95, new THREE.MeshBasicMaterial({ map: X.cityTex(5), color: new THREE.Color(1.35, 1.3, 1.25) }), -5.05, 1.4, -2.69); noInk(w); w.castShadow = false;
      H.box(1.8, 0.06, 0.06, TRIM, -5.05, 0.9, -2.66); H.box(1.8, 0.06, 0.06, TRIM, -5.05, 1.86, -2.66); H.box(0.06, 1.0, 0.06, TRIM, -5.92, 0.9, -2.66); H.box(0.06, 1.0, 0.06, TRIM, -4.18, 0.9, -2.66); H.box(0.04, 0.95, 0.05, TRIM, -5.05, 0.92, -2.66); }
    noInk(H.plane(0.5, 0.66, MT(X.posterTex(1)), -6.25, 1.4, -2.69)); noInk(H.plane(0.5, 0.66, MT(X.posterTex(3)), -3.95, 1.4, -2.69));
    // desk, chair, lamp, name plate
    H.box(1.4, 0.36, 0.6, MT(X.woodTex("#6B3A1A", "#5E3216")), S.DESK[0], 0, S.DESK[2]); H.box(1.5, 0.04, 0.68, "#7A4520", S.DESK[0], 0.36, S.DESK[2]); H.box(1.42, 0.03, 0.02, GOLD, S.DESK[0], 0.28, S.DESK[2] + 0.31);
    H.box(0.62, 0.36, 0.09, "#8E1F3C", S.MAX_SEAT[0], 0.12, S.MAX_SEAT[2] - 0.2); H.box(0.56, 0.06, 0.4, "#8E1F3C", S.MAX_SEAT[0], S.SEAT_Y - 0.06, S.MAX_SEAT[2]); H.cyl(0.03, 0.03, 0.13, "#3A3F52", S.MAX_SEAT[0], 0, S.MAX_SEAT[2], 8);
    { const pl = H.plane(0.3, 0.113, cut(X.plaqueTex("CEO"), new THREE.Color(1.15, 1.1, 1.0)), S.DESK[0] + 0.42, 0.46, S.DESK[2] + 0.3); noInk(pl); (pl.material as THREE.MeshBasicMaterial).side = THREE.FrontSide; H.box(0.32, 0.012, 0.05, GOLD, S.DESK[0] + 0.42, 0.4, S.DESK[2] + 0.29); }
    { const lx = S.DESK[0] - 0.52, lz = S.DESK[2] + 0.05; H.cyl(0.06, 0.07, 0.015, GOLD, lx, 0.4, lz); H.cyl(0.01, 0.01, 0.2, GOLD, lx, 0.4, lz, 8);
      const sh = H.cyl(0.05, 0.11, 0.08, "#1F8466", lx, 0.58, lz, 16); sh.castShadow = false;
      const hl = sprite(glow, 0.7, 0.7, R, true, new THREE.Color(1.4, 1.0, 0.55)); hl.position.set(lx, 0.57, lz + 0.02); (hl.material as THREE.MeshBasicMaterial).opacity = 0.8; this.halos.push(hl);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), addGlow(glow, new THREE.Color(1.2, 0.75, 0.3), 0.55)); pool.rotation.x = -Math.PI / 2; pool.position.set(lx + 0.15, 0.405, lz + 0.05); noInk(pool); R.add(pool); }
    H.box(0.3, 1.5, 1.3, "#6B3F22", -6.52, 0, -1.2);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) H.box(0.2, 0.24 + ((k * 7 + r) % 3) * 0.03, 0.05, ["#2F6FD0", "#E8683A", "#2FA84F", "#F6C84C", "#7A3FD0", "#D6453A"][(k + r * 2) % 6], -6.45, 0.08 + r * 0.36, -1.72 + k * 0.165);
    H.cyl(0.18, 0.13, 0.28, "#C8503A", -3.95, 0, -2.35); H.sph(0.3, "#2FA84F", -3.95, 0.58, -2.35); H.sph(0.18, "#3FC25F", -3.85, 0.86, -2.3);
    H.box(0.5, 0.45, 0.4, "#5A6274", -6.35, 0, 0.55); H.cyl(0.08, 0.08, 0.03, GOLD, -6.09, 0.22, 0.55).rotation.z = Math.PI / 2;

    // =====================================================================================================
    // PROPS
    // =====================================================================================================
    const card = (map: THREE.Texture, w: number, h: number, bill = true) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide })); m.frustumCulled = false; noInk(m); R.add(m); if (bill) this.bills.push(m); return m; };
    this.ticketA = card(X.ticketTex("33"), 0.1, 0.13); this.ticketR = card(X.ticketTex("37"), 0.07, 0.091, false);
    const stack = (g: THREE.Group, h: number) => {
      const geo = new THREE.BoxGeometry(0.17, h, 0.085), top = new THREE.MeshBasicMaterial({ map: X.cashTex(), color: new THREE.Color(1.05, 1.05, 1.0) }), side = M("#3F9A58");
      const b = new THREE.Mesh(geo, [side, side, top, top, top, top]); b.castShadow = true; g.add(b); g.add(hull(geo, 1.07)); g.visible = false; return g;
    };
    R.add(stack(this.cashA, 0.05), stack(this.cashB, 0.09)); this.fant.add(stack(this.cashD, 0.09));
    this.noteSMats = [cut(X.scribbleTex(0.5)), cut(X.scribbleTex(1))];
    this.noteS = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.195), this.noteSMats[0]); this.noteS.rotation.x = -Math.PI / 2; noInk(this.noteS); R.add(this.noteS);
    this.noteBMats = [0, 1, 2].map((s) => new THREE.MeshBasicMaterial({ map: X.noteTex(s), side: THREE.DoubleSide, color: new THREE.Color(1.08, 1.05, 1.0) }));
    for (const m of this.noteBMats) m.side = THREE.FrontSide;
    this.noteB = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.36), this.noteBMats[0]); noInk(this.noteB); R.add(this.noteB);
    { const back = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.36), new THREE.MeshBasicMaterial({ color: "#F2E4BE" })); back.rotation.y = Math.PI; noInk(back); this.noteB.add(back); }
    {                                                    // Ava's handbag
      const geo = new THREE.BoxGeometry(0.2, 0.13, 0.075), b = new THREE.Mesh(geo, M("#E1A21B")); b.castShadow = true; this.bag.add(b, hull(geo, 1.07));
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.204, 0.05, 0.08), M("#C98A12")); flap.position.y = 0.045; this.bag.add(flap);
      const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), M("#FFF0B0")); clasp.position.set(0, 0.02, -0.042); this.bag.add(clasp); const clasp2 = clasp.clone(); clasp2.position.z = 0.042; this.bag.add(clasp2);
      const hd = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16, Math.PI), M("#7A4F06")); hd.position.y = 0.065; this.bag.add(hd); R.add(this.bag);
    }
    {                                                    // the CEO's briefcase
      const geo = new THREE.BoxGeometry(0.24, 0.16, 0.06), b = new THREE.Mesh(geo, M("#7A4520")); b.castShadow = true; this.brief.add(b, hull(geo, 1.06));
      const hd = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 14, Math.PI), M(INK)); hd.position.y = 0.08; this.brief.add(hd);
      for (const dx of [-0.07, 0.07]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.064), M(GOLD)); l.position.set(dx, 0.05, 0); this.brief.add(l); } R.add(this.brief);
    }
    const coinT = X.coinTex();
    for (let i = 0; i < 5; i++) { const m = sprite(coinT, 0.075, 0.075, R, false, new THREE.Color(1.2, 1.15, 1.0)); (m.material as THREE.MeshBasicMaterial).alphaTest = 0.1; (m.material as THREE.MeshBasicMaterial).depthWrite = true; this.coins.push(m); }
    const qT = X.qmarkTex();
    for (let i = 0; i < 3; i++) { const m = sprite(qT, 0.16, 0.2); (m.material as THREE.MeshBasicMaterial).alphaTest = 0.1; (m.material as THREE.MeshBasicMaterial).depthWrite = true; this.qmarks.push(m); }
    const pT = X.puffTex();
    for (let i = 0; i < 6; i++) { this.puffsO.push(sprite(pT, 1, 1)); this.puffsH.push(sprite(pT, 1, 1)); }
    this.glint = sprite(spark, 0.2, 0.2, R, true, new THREE.Color(1.6, 1.5, 1.2));
    // one-off sparkles: [time, position, size]
    const SP: [number, V3, number][] = [[42.98, [-0.58, 0.6, -2.8], 0.3], [43.5, [-0.42, 0.56, -2.72], 0.18], [27.0, [0, 0.47, 0.66], 0.32], [60.8, [0, 0.36, -1.36], 0.45], [61.75, [0, 0.4, -1.36], 0.3],
      [62.98, [0.05, 0.56, 0.68], 0.3], [63.92, [0.0, 0.56, 0.68], 0.36], [55.45, [-4.68, 0.52, -0.9], 0.34], [S.BOARD_FLIP + 0.05, [S.BOARD[0], S.BOARD[1], S.BOARD[2] + 0.1], 0.7], [4.3, [3.0, 1.0, -0.9], 0.3]];
    for (const [t, p, s] of SP) this.sparks.push({ m: sprite(spark, 1, 1, R, true, new THREE.Color(1.7, 1.5, 1.1)), t, p, s });

    // =====================================================================================================
    // THE FANTASY SPACE (thoughts): violet sky, huge moon, platform over water
    // =====================================================================================================
    {
      const Fm = mk(this.fant), FR = this.fant; R.add(FR);
      const wglow = X.glowTex("255,255,255", "255,255,255");
      const at = (o: THREE.Object3D, p: V3) => { o.position.set(...p); FR.add(o); return o; };
      const sky = new THREE.Mesh(new THREE.SphereGeometry(25, 48, 24), new THREE.MeshBasicMaterial({ map: X.daySkyTex(), side: THREE.BackSide, depthWrite: false })); sky.renderOrder = -10; at(sky, F(0, 0, 0));
      const moon = new THREE.Mesh(new THREE.CircleGeometry(4.5, 72), new THREE.MeshBasicMaterial({ map: X.moonTex(), color: new THREE.Color(1.9, 1.75, 1.85) })); at(moon, S.MOON); moon.lookAt(...F(0, 1.4, 2.5));
      for (const [sz, col, op, dz] of [[22, [1.0, 0.55, 0.85], 0.55, 0.5], [40, [0.6, 0.2, 0.95], 0.22, 0.6]] as const) {
        const h = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), addGlow(wglow, new THREE.Color(...col), op)); at(h, [S.MOON[0], S.MOON[1], S.MOON[2] + dz]); h.lookAt(...F(0, 1.4, 2.5)); }
      for (let k = 0; k < 5; k++) { const a = -0.9 + k * 0.45, r = 17 - (k % 2) * 2.5;
        const cl = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2), new THREE.MeshBasicMaterial({ map: X.cloudTex(k), transparent: true, depthWrite: false, color: new THREE.Color(1.05, 0.95, 1.1), opacity: 0.92 }));
        at(cl, F(r * Math.sin(a), 0.9 + (k % 3) * 0.35, -r * Math.cos(a))); cl.lookAt(...F(0, 1.2, 0)); }
      for (let i = 0; i < 46; i++) { const az = (rr(i + 700) - 0.5) * 2.6, el = 0.25 + rr(i + 800) * 0.9, r = 21;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), addGlow(spark, new THREE.Color(1.6, 1.4, 1.7), 1)); at(m, F(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), -r * Math.cos(el) * Math.cos(az)));
        this.twinkles.push({ m, ph: rr(i + 900) * 6.28, s: 0.25 + rr(i + 950) * 0.45 }); }
      const water = new THREE.Mesh(new THREE.CircleGeometry(24, 64), new THREE.MeshBasicMaterial({ map: X.waterTex() })); water.rotation.x = -Math.PI / 2; at(water, F(0, -0.08, 0));
      const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 20), addGlow(wglow, new THREE.Color(1.3, 0.6, 1.1), 0.6)); path.rotation.x = -Math.PI / 2; at(path, F(0, -0.07, -10));
      const under = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), addGlow(wglow, new THREE.Color(1.0, 0.45, 0.95), 0.55)); under.rotation.x = -Math.PI / 2; at(under, F(0, -0.075, 0));
      this.rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.76, 0.018, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.6, 3.0) })); this.rimRing.rotation.x = Math.PI / 2; at(this.rimRing, F(0, 0, 0));
      for (let i = 0; i < 70; i++) { const gold = i % 3 === 0;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), addGlow(i % 7 === 0 ? spark : wglow, gold ? new THREE.Color(1.8, 1.4, 0.8) : new THREE.Color(1.5, 0.8, 1.6), 1)); m.frustumCulled = false; FR.add(m);
        this.floaters.push({ m, a: rr(i + 1400) * 6.28, r: 0.6 + rr(i + 1500) * 2.6, y0: rr(i + 1600) * 2.4, sp: 0.12 + rr(i + 1700) * 0.2, ph: rr(i + 1800) * 6.28, s: i % 7 === 0 ? 0.09 : 0.025 + rr(i + 1900) * 0.02 }); }
      const plat = Fm.cyl(1.7, 1.78, 0.14, "#EADFF8", S.FX, -0.14, 0, 56); const ph = hull(plat.geometry, 1.012); at(ph, F(0, -0.07, 0)); ph.scale.set(1.012, 1.08, 1.012);
      const bulbGeo = new THREE.SphereGeometry(0.03, 8, 6), posts: V3[] = [];
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + Math.PI / 6, p = F(1.6 * Math.sin(a), 0, 1.6 * Math.cos(a)); Fm.cyl(0.025, 0.03, 1.75, "#3E219F", p[0], 0, p[2], 8); posts.push([p[0], 1.75, p[2]]); }
      for (let k = 0; k < 6; k++) { const a = posts[k], b = posts[(k + 1) % 6], pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 8; i++) { const u = i / 8, p = new THREE.Vector3(a[0] + (b[0] - a[0]) * u, 1.75 - 0.25 * Math.sin(u * Math.PI), a[2] + (b[2] - a[2]) * u); pts.push(p);
          if (i > 0 && i < 8) { const m = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 3.2) })); m.position.copy(p); FR.add(m);
            const h = sprite(wglow, 0.32, 0.32, FR, true, new THREE.Color(1.0, 0.6, 0.9)); h.position.copy(p); (h.material as THREE.MeshBasicMaterial).opacity = 0.6; } }
        FR.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: "#2A1A1E" }))); }
      // pedestal, the dice (an unsure bet), the trophy (a sure win), the magnifying glass
      const ped = Fm.cyl(0.26, 0.3, 0.5, "#9A6BF0", S.FX + 0.24, 0, 0, 28); at(hull(ped.geometry, 1.04), F(0.24, 0.25, 0));
      { const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3), b = new THREE.Mesh(geo, [3, 4, 1, 6, 2, 5].map((n) => new THREE.MeshBasicMaterial({ map: X.diceTex(n), color: new THREE.Color(1.1, 1.05, 1.1) }))); this.dice.add(b, hull(geo, 1.06)); FR.add(this.dice); }
      { const gold = M("#FFB81C"), goldD = M("#E0920E");
        const cup = new THREE.LatheGeometry([[0, 0], [0.1, 0], [0.1, 0.03], [0.03, 0.06], [0.03, 0.14], [0.06, 0.17], [0.13, 0.24], [0.16, 0.36], [0.15, 0.4], [0, 0.4]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
        this.trophy.add(new THREE.Mesh(cup, gold), hull(cup, 1.05));
        for (const sx of [-1, 1]) { const hd = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16, Math.PI), goldD); hd.position.set(sx * 0.155, 0.3, 0); hd.rotation.z = -sx * Math.PI / 2; this.trophy.add(hd); }
        const st = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), addGlow(spark, new THREE.Color(1.8, 1.5, 0.9), 0.9)); st.position.set(0, 0.5, 0.05); st.name = "star"; this.trophy.add(st);
        const hl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), addGlow(wglow, new THREE.Color(1.3, 0.9, 0.3), 0.5)); hl.position.set(0, 0.22, -0.05); this.trophy.add(hl); FR.add(this.trophy); }
      { const ringG = new THREE.TorusGeometry(0.085, 0.014, 8, 28); this.lens.add(new THREE.Mesh(ringG, M("#F2B921")), hull(ringG, 1.12));
        const gl = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.1, 1.5), transparent: true, opacity: 0.35, depthWrite: false })); this.lens.add(gl);
        const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.13, 8), M("#7A4520")); hd.position.set(-0.075, -0.125, 0); hd.rotation.z = -0.55; this.lens.add(hd); FR.add(this.lens); }
      const dqT = X.qmarkTex("#FFE04A"); for (let i = 0; i < 3; i++) { const m = sprite(dqT, 0.22, 0.275, FR); (m.material as THREE.MeshBasicMaterial).alphaTest = 0.1; (m.material as THREE.MeshBasicMaterial).depthWrite = true; this.dq.push(m); }
      this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 48), addGlow(wglow, new THREE.Color(1.8, 1.4, 0.8), 0)); this.ring.rotation.x = -Math.PI / 2; at(this.ring, F(0.24, 0.52, 0));
      for (let i = 0; i < 14; i++) { const m = sprite(coinT, 0.07, 0.07, FR, false, new THREE.Color(1.25, 1.2, 1.0)); (m.material as THREE.MeshBasicMaterial).alphaTest = 0.1;
        const a = (i / 14) * Math.PI * 2; this.burst.push({ m, d: new THREE.Vector3(Math.cos(a) * (0.5 + rr(i) * 0.5), 1.2 + rr(i + 9) * 0.9, Math.sin(a) * 0.4) }); }
    }

    // =====================================================================================================
    // THE PEOPLE
    // =====================================================================================================
    const cast = buildAll(imgs);
    const person = (key: Who | "dream", who: Who, parent: THREE.Object3D, legs: any = true) => {
      const b = S.bodyAt[who](0);
      this.P[key] = new Player(parent, cast[who], who, b.pos, b.facing, false, { life: S.LIFE[key], seed: S.SEED[key], legs, talk: key === "ava" || key === "arian" ? (t) => S.talkAt(who, t) : undefined });
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.26), new THREE.MeshBasicMaterial({ map: shT, transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; noInk(sh); parent.add(sh); this.blobs[key] = sh;
    };
    const shT = X.shadowTex();
    for (const w of ["ava", "arian", "tina", "cop", "nora", "omar"] as Who[]) person(w, w, R);
    person("max", "max", R, { pants: "#272338", shoes: "#15131F", boxers: true });
    person("dream", "arian", this.fant);
  }

  // ---------------- where every hand is ----------------
  private hands(key: Who | "dream", t: number, b: S.Body): Record<Hand, V3> {
    const p = this.P[key]; let L = p.restHand("L"), Rt = p.restHand("R");
    if (b.walk && b.walk.k > 0) { const sw = 0.075 * b.walk.k * Math.sin(b.walk.phase); L = add3(L, [b.walk.dx * sw, 0, b.walk.dz * sw]); Rt = add3(Rt, [-b.walk.dx * sw, 0, -b.walk.dz * sw]); }
    const to = (h: V3, target: V3, k: number): V3 => mix(h, target, k);
    const x = b.pos[0], z = b.pos[2];
    if (key === "ava") {
      Rt = to(Rt, [-0.12, 0.47 + 0.02 * Math.sin(t * 14), 0.62], win(t, 14.5, 15.45));
      L = to(L, [-0.62, 0.56 + 0.012 * Math.sin(t * 9), 0.6], win(t, 20.7, 22.05));          // "when the CEO steps out": her LEFT hand points to his office
      Rt = to(Rt, [-0.08, 0.46, 0.6], win(t, 22.4, 23.95));
      Rt = to(Rt, [-0.1, 0.38 + 0.05 * Math.sin(t * 18), 0.6], win(t, 24.4, 25.3));
      Rt = to(Rt, [0.0, 0.43 + 0.025 * Math.sin(t * 24), 0.68], win(t, S.SHAKE.a, S.SHAKE.b, 0.2, 0.25));
      Rt = to(Rt, [-0.52, 0.57, -2.68], win(t, 43.0, 43.4, 0.25, 0.15));
      Rt = to(Rt, [-0.4 + 0.03 * Math.sin(t * 30), 0.535, -2.71 + 0.012 * Math.sin(t * 23)], win(t, 43.45, 44.3, 0.2, 0.2));
      Rt = to(Rt, add3(this.cashPos(t), [0.02, 0.05, 0.03]), win(t, 44.5, 45.3, 0.2, 0.2));
      L = to(L, [-0.95, 0.85 + 0.015 * Math.sin(t * 10), -2.45], win(t, 45.5, 47.0, 0.35, 0.3));   // "give it to the boss": left hand, toward his office
      Rt = to(Rt, [0.02, 0.5, 0.7], win(t, 63.85, 64.25, 0.25, 0.2));
      Rt = to(Rt, [x + 0.25, 0.74 + 0.03 * Math.sin(t * 9), z - 0.05], smooth(64.3, 64.65, t));
    } else if (key === "arian") {
      // "and saw his number": the ticket lies in his right hand on his thigh, held low, away from her (seen from the lamp above)
      Rt = to(Rt, add3(p.lapHand("R"), [0.05, 0.012, -0.06]), win(t, 10.6, 12.95, 0.3, 0.3));
      L = to(L, [0.0, 0.43 + 0.025 * Math.sin(t * 24), 0.68], win(t, S.SHAKE.a, S.SHAKE.b, 0.2, 0.25));
      L = to(L, [0.03, lerp(0.5, 0.45, smooth(64.4, 65.2, t)), 0.7], smooth(62.9, 63.3, t));
      Rt = to(Rt, [0.56, 0.5, 0.8], win(t, 17.4, 18.0, 0.2, 0.4));
      Rt = to(Rt, [0.52, 0.94 + 0.015 * Math.sin(t * 20), 0.86], smooth(65.1, 65.45, t));
    } else if (key === "max") {
      if (t > 50.6 && t < T.zip) { L = add3(S.NOTE, [0.13, -0.03, 0.02]); Rt = add3(S.NOTE, [-0.13, -0.03, 0.02]); }
      if (t >= 57.3) {
        L = to(L, [x - 0.24, 0.13, z - 0.03], Math.max(win(t, S.BAG.down - 0.35, S.BAG.down + 0.05, 0.3, 0.3), win(t, S.BAG.up - 0.35, S.BAG.up + 0.05, 0.3, 0.3)));
        const d = S.pantsDropAt(t);
        Rt = to(Rt, [x + 0.13, lerp(0.34, 0.15, d), z - 0.04], win(t, 60.15, 61.85, 0.25, 0.3));
      }
    } else if (key === "tina") {
      Rt = to(Rt, add3(this.cashPos(t), [0, 0.05, -0.03]), Math.max(win(t, 42.7, 43.3, 0.25, 0.25), win(t, 45.2, 46.6, 0.3, 0.3)));
      Rt = to(Rt, [x - 0.2, 0.48, z + 0.12], smooth(46.6, 46.9, t) * (1 - smooth(50.6, 50.9, t)));
    } else if (key === "cop") {
      Rt = to(Rt, [x + 0.2, 1.0, z - 0.03], Math.max(win(t, 4.0, 5.2), win(t, 63.1, 64.3)));
    } else if (key === "nora") {
      const k = 1 - smooth(58.2, 58.6, t); L = to(L, [x + 0.08, 0.52, z + 0.22], k); Rt = to(Rt, [x - 0.08, 0.52 + 0.015 * Math.sin(t * 6), z + 0.22], k);
    } else if (key === "dream") {
      L = to(L, F(-0.02 + 0.06 * Math.cos(t * 2.2), 0.82 + 0.08 * Math.sin(t * 2.9), 0.3), win(t, 30.75, 34.2, 0.25, 0.3));
      Rt = to(Rt, F(-0.5, 0.74 + 0.012 * Math.sin(t * 8), 0.22), win(t, 31.2, 33.6, 0.3, 0.4));
      L = to(L, mix(F(-0.02, 1.08, 0.22), F(0.06, 0.6, 0.16), smooth(37.0, 37.1, t)), smooth(36.5, 36.85, t));
      Rt = to(Rt, F(-0.58, 0.95, 0.15), win(t, 34.6, 36.3, 0.25, 0.4));
    }
    return { L, R: Rt };
  }
  // the first cash stack (2,500): counter -> Ava -> teller -> CEO's desk -> his hand
  private cashPos(t: number): V3 {
    const Ts: V3 = [-0.6, 0.525, -3.0], As: V3 = [-0.56, 0.525, -2.72];
    if (t < 44.55) return mix(Ts, As, smooth(42.95, 43.3, t));
    return mix(As, Ts, smooth(44.6, 45.3, t));
  }

  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    const space = c.space as S.Space;
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 80; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK); cam.getWorldDirection(this.fwd);
    scene.background = new THREE.Color("#1B1020");
    // ---- light: a bright bank by day, a warmer dim office, the violet fantasy ----
    const U = TONE;
    if (space === "fantasy") { U.uLitCol.value.set(1.45, 1.15, 1.6); U.uShadeCol.value.set(0.55, 0.42, 0.9); this.sun.position.set(S.FX + 3, 6, 6); this.sun.target.position.set(S.FX, 0.3, 0); }
    else {
      U.uLitCol.value.set(1.9, 1.5, 0.98);
      if (space === "office") U.uShadeCol.value.set(0.82, 0.64, 0.6); else U.uShadeCol.value.set(0.74, 0.72, 0.84);
      this.sun.position.set(1.5, 4.2, 8.0); this.sun.target.position.set(0, 0.3, -0.8);
    }
    U.uShadeLift.value.set(0.04, 0.035, 0.045); U.uLambert.value = 0.4; U.uSideK.value = 0.86; U.uTerm.value = 0.25; U.uBounce.value.set(0.04, 0.025, 0.0); U.uSat.value = 1.5;
    this.sun.color.setRGB(1.0, 0.9, 0.72); this.sun.intensity = 2.8;
    const sc = this.sun.shadow.camera; sc.left = -7.5; sc.right = 7.5; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 24; sc.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.03;
    this.fant.visible = S.fantasyOn(t);

    // ---- doors, board ----
    this.ceoDoor.rotation.y = 1.75 * Math.max(S.ceoDoorAt(t), smooth(T.zip + 0.15, T.zip + 0.3, t));
    const eo = S.entranceAt(t); this.slideA.position.z = S.LANE_Z - 0.3 - 0.56 * eo; this.slideB.position.z = S.LANE_Z + 0.3 + 0.56 * eo;
    const flip = t >= S.BOARD_FLIP, fk = clamp01((t - S.BOARD_FLIP) / 0.35);
    this.board.material = this.boardMats[flip ? 1 : 0];
    const bv = true;
    this.board.visible = bv; for (const o of this.boardParts) o.visible = bv;
    this.board.scale.setScalar(flip && fk < 1 ? 1 + 0.16 * Math.sin(Math.PI * fk) : 1);
    (this.boardHalo.material as THREE.MeshBasicMaterial).opacity = flip ? 0.25 + 0.55 * (1 - smooth(S.BOARD_FLIP, S.BOARD_FLIP + 1.2, t)) : 0;

    // ---- people ----
    const keys = Object.keys(this.P) as (Who | "dream")[];
    const bodies = {} as Record<string, S.Body>;
    for (const k of keys) {
      const p = this.P[k], b: S.Body = k === "dream" ? { pos: F(-0.3, 0, 0.12), facing: 1, sit: 0, walk: null, show: S.fantasyOn(t), lean: 0, squash: 1 - 0.12 * win(t, 37.0, 37.12, 0.08, 0.2) } : S.bodyAt[k](t);
      bodies[k] = b;
      p.setPos(...b.pos); p.setFacing(b.facing); p.sit = b.sit; p.seatY = S.SEAT_Y; p.lean = b.lean; p.squash = b.squash;
      p.setWalk(b.walk?.phase ?? 0, b.walk?.k ?? 0, b.walk?.dx ?? 0, b.walk?.dz ?? 1);
      p.pantsDrop = k === "max" ? S.pantsDropAt(t) : 0;
      p.setVisible(b.show);
      const bl = this.blobs[k]; bl.visible = b.show; bl.position.set(b.pos[0], b.pos[1] + 0.008, b.pos[2] + (b.sit > 0.5 ? -b.facing * -0.08 : 0));
    }
    const order = keys.slice().sort((a, b2) => cam.position.distanceToSquared(this.v.set(...bodies[b2].pos)) - cam.position.distanceToSquared(this.v.set(...bodies[a].pos)));
    const HANDS = {} as Record<string, Record<Hand, V3>>;
    order.forEach((k, i) => { const p = this.P[k], h = this.hands(k, t, bodies[k]); HANDS[k] = h; p.hand.L = h.L; p.hand.R = h.R; p.update(t, cam, 0, 100 + i * 14); });

    // ---- props that ride on hands ----
    const A = bodies.ava, PA = this.P.ava;
    this.ticketA.visible = false;                                   // her number is only spoken, never shown this.ticketA.position.set(HANDS.ava.L[0] + 0.045, HANDS.ava.L[1] + 0.055, HANDS.ava.L[2] - 0.02);
    // his ticket: only in the lamp shot (11.2-12.9), flat in his palm, tilted toward him, a corner under his thumb
    this.ticketR.visible = t > 11.3 && t < 12.9;
    { const h = HANDS.arian.R; this.ticketR.position.set(h[0] - 0.03, h[1] - 0.002, h[2] - 0.03); this.ticketR.rotation.set(-1.25, 0.0, 0.0); this.ticketR.rotateZ(Math.PI - 0.45); }
    { const lap: V3 = [A.pos[0] + 0.04, PA.hipY + 0.085, A.pos[2] + A.facing * 0.11], hl = PA.restHand("L"), hang: V3 = [hl[0], hl[1] - 0.115, hl[2]];
      const p = mix(hang, lap, A.sit);
      this.bag.position.set(...p); this.bag.rotation.y = 0.2 * (1 - A.sit); this.bag.visible = A.show; }
    { const hall = t >= 57.3, hand = hall ? HANDS.max.L : HANDS.max.R, held: V3 = [hand[0], hand[1] - 0.115, hand[2]], mp = bodies.max.pos;
      const down = hall ? smooth(S.BAG.down, S.BAG.down + 0.12, t) * (1 - smooth(S.BAG.up - 0.05, S.BAG.up + 0.07, t)) : 0;
      this.brief.visible = (t > T.maxIn && t < T.maxInside) || (hall && bodies.max.show);
      this.brief.position.set(...mix(held, [mp[0] - 0.26, 0.082, mp[2] - 0.03], down)); this.brief.rotation.y = Math.PI / 2; }
    this.pen.position.set(...(t > 43.45 && t < 44.4 ? add3(HANDS.ava.R, [0.0, -0.02, -0.01]) : [-0.2, 0.535, -2.72] as V3));
    // cash A
    { let p = this.cashPos(t), show = t > 42.8, ry = 0;
      if (t > 46.6) p = mix(p, add3(HANDS.tina.R, [0, 0.03, 0]), smooth(46.6, 46.9, t));
      if (t > 50.55) { p = [-4.68, 0.425, -0.93]; ry = 0.3; }
      if (t > T.zip - 0.1 && t < 57.3) show = false;
      if (t >= 57.3) show = false;
      this.cashA.visible = show; this.cashA.position.set(...p); this.cashA.rotation.set(0, ry, 0);
      this.cashA.scale.setScalar(popScale(t, 42.8, 999));
      // the small note: written on the counter, then rides on the cash
      const ns = t > 43.5 && t < 50.55; this.noteS.visible = ns; this.noteS.material = this.noteSMats[t < 43.95 ? 0 : 1];
      const np: V3 = t < 44.55 ? [-0.38, 0.506, -2.74] : mix([-0.38, 0.506, -2.74], add3(p, [0, 0.03, 0]), smooth(44.55, 44.75, t));
      this.noteS.position.set(...np); this.noteS.scale.setScalar(popScale(t, 43.5, 999)); }
    // cash B (5,000): Arian pays up, Ava takes it
    { const k = smooth(64.1, 64.25, t), p = mix(add3(HANDS.arian.L, [0, 0.06, 0]), add3(HANDS.ava.R, [0, 0.06, 0]), k);
      this.cashB.visible = t > 62.95; this.cashB.position.set(...p); this.cashB.scale.setScalar(popScale(t, 62.95, 999)); this.cashB.rotation.set(0, 0.3, k * 0.4 * Math.sin(t * 9)); }
    // the big note in the CEO's hands
    { const on = t > 50.8 && t < 57.3; this.noteB.visible = on;
      if (on) { const fly = Math.max(0, t - (T.zip + 0.05));
        this.noteB.material = this.noteBMats[t < S.NOTE_LINES.pants ? 0 : t < S.NOTE_LINES.yours ? 1 : 2];
        this.noteB.position.set(S.NOTE[0] + 0.25 * Math.sin(fly * 5) * Math.min(1, fly * 3), S.NOTE[1] + 0.004 * Math.sin(t * 5) + 0.9 * fly - 1.1 * fly * fly, S.NOTE[2] + 0.3 * fly);
        this.noteB.lookAt(-4.45, 1.45, -2.4); this.noteB.rotateZ(0.03 * Math.sin(t * 2.3) + fly * 1.4); this.noteB.rotateX(-fly * 2.2); } }
    // coins above Ava's hand on "5,000 bucks"
    this.coins.forEach((m, i) => { const a = S.COINS.a + i * S.COINS.step, s = popScale(t, a, S.COINS.b - 0.05 * (4 - i));
      m.visible = s > 0.01; m.scale.setScalar(Math.max(s, 0.001)); m.position.set(HANDS.ava.R[0] - 0.16 + i * 0.08, HANDS.ava.R[1] + 0.12 + 0.045 * Math.sin((i / 4) * Math.PI) + 0.012 * Math.sin(t * 6 + i), HANDS.ava.R[2] - 0.03); });
    // question marks over Arian at the end
    this.qmarks.forEach((m, i) => { const a = S.QMARKS.a + i * S.QMARKS.step, s = popScale(t, a, 999);
      m.visible = s > 0.01; m.scale.setScalar(Math.max(s, 0.001)); m.position.set(S.ARIAN_X + [-0.3, 0.02, 0.33][i], 1.13 + [0, 0.1, 0.02][i] + 0.015 * Math.sin(t * 5 + i * 2), S.ROW_Z - 0.05); m.rotation.z = [-0.3, 0.05, 0.3][i]; });
    // glint on the dice print
    { const k = win(t, S.DICE_GLINT.a, S.DICE_GLINT.b, 0.15, 0.25); this.glint.visible = k > 0.01; this.glint.position.set(0.27, 0.4, 0.76); this.glint.scale.setScalar(k * (0.8 + 0.4 * Math.sin(t * 16))); }
    // dust puffs: he vanishes from the office, he is already in the hall
    this.puffsO.forEach((m, i) => { const u = clamp01((t - (T.zip + 0.1)) / 0.65), a = i * 1.05;
      m.visible = u > 0 && t < T.arrive + 0.05; m.position.set(-5.0 + Math.cos(a) * 0.35 * u, 0.6 + Math.sin(a) * 0.3 * u + 0.1 * u, -1.25 + 0.5 * u); m.scale.setScalar(0.25 + 2.6 * u * u + 0.4 * u); (m.material as THREE.MeshBasicMaterial).opacity = 0.98; m.renderOrder = 900; });
    this.puffsH.forEach((m, i) => { const u = clamp01((t - T.arrive + 0.15) / 1.4), a = i * 1.05, mp = bodies.max.pos;
      m.visible = t > T.arrive - 0.15 && u < 1; m.position.set(mp[0] - 0.25 + Math.cos(a) * (0.45 + 0.4 * u) - 0.3 * u, 0.3 + Math.abs(Math.sin(a)) * (0.5 - 0.3 * u) + 0.2 * u, mp[2] - 0.1 + Math.sin(a) * 0.2); m.scale.setScalar((1.9 - 1.3 * u) * (i % 2 ? 0.8 : 1)); (m.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - u * u); m.renderOrder = 900; });
    for (const s of this.sparks) { const u = (t - s.t) / 0.45; s.m.visible = u > 0 && u < 1; if (s.m.visible) { s.m.position.set(...s.p); s.m.scale.setScalar(s.s * Math.sin(Math.PI * u)); s.m.rotation.z = u * 1.2; } }

    // ---- fantasy props ----
    if (this.fant.visible) {
      const swap = S.DREAM.swap, ds = popScale(t, 28.9, swap + 0.15);
      this.dice.visible = ds > 0.01; this.dice.scale.setScalar(Math.max(ds, 0.001)); this.dice.position.set(S.FX + 0.24, 0.9 + 0.04 * Math.sin(t * 2.1), 0); this.dice.rotation.set(t * 0.9, t * 1.3, 0.3);
      const ts = popScale(t, swap, 999); this.trophy.visible = ts > 0.01; this.trophy.scale.setScalar(Math.max(ts, 0.001)); this.trophy.position.set(S.FX + 0.24, 0.5, 0); this.trophy.rotation.y = 0.4 * Math.sin(t * 1.4);
      const st = this.trophy.getObjectByName("star")!; st.rotation.z = t * 0.8; st.scale.setScalar(0.8 + 0.3 * Math.sin(t * 5));
      const ls = popScale(t, 30.8, 34.4); this.lens.visible = ls > 0.01; this.lens.scale.setScalar(Math.max(ls, 0.001)); const hl = this.P.dream.hand.L; this.lens.position.set(hl[0] + 0.075, hl[1] + 0.125, hl[2] + 0.01); this.lens.quaternion.copy(cam.quaternion);
      this.dq.forEach((m, i) => { const s = popScale(t, S.DREAM.q[i], S.DREAM.qOut + i * 0.08); m.visible = s > 0.01; m.scale.setScalar(Math.max(s, 0.001)); m.position.set(S.FX + 0.24 + [-0.26, 0.02, 0.28][i], 1.26 + [0.0, 0.14, 0.03][i] + 0.02 * Math.sin(t * 4 + i * 2), 0.05); m.rotation.z = [-0.3, 0.05, 0.3][i]; });
      const hd = this.P.dream.hand.L, cs = popScale(t, 36.5, 999); this.cashD.visible = cs > 0.01; this.cashD.scale.setScalar(Math.max(cs, 0.001));
      this.cashD.position.set(...(t < 37.1 ? add3(hd as V3, [0, 0.06, 0]) : [S.FX + 0.06, 0.545, 0.16] as V3)); this.cashD.rotation.y = 0.4;
      const bu = clamp01((t - S.DREAM.slam) / 0.6); (this.ring.material as THREE.MeshBasicMaterial).opacity = bu > 0 && bu < 1 ? 0.9 * (1 - bu) : 0; this.ring.scale.setScalar(0.2 + 1.3 * bu);
      for (const b of this.burst) { const u = (t - S.DREAM.slam) / 0.9; b.m.visible = u > 0 && u < 1; if (b.m.visible) { b.m.position.set(S.FX + 0.14 + b.d.x * u, 0.55 + b.d.y * u - 1.6 * u * u, 0.15 + b.d.z * u); b.m.scale.setScalar(1 - 0.5 * u); } }
      for (const s of this.twinkles) { s.m.quaternion.copy(cam.quaternion); s.m.scale.setScalar(s.s * (0.6 + 0.4 * Math.sin(t * 2.4 + s.ph))); }
      for (const f of this.floaters) { const y = (f.y0 + t * f.sp) % 2.6; f.m.position.set(S.FX + f.r * Math.sin(f.a + t * 0.05), y, f.r * Math.cos(f.a + t * 0.05)); f.m.quaternion.copy(cam.quaternion);
        f.m.scale.setScalar(f.s * (0.7 + 0.3 * Math.sin(t * 3 + f.ph))); (f.m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, y * 3) * Math.min(1, (2.6 - y) * 2); }
      (this.rimRing.material as THREE.MeshBasicMaterial).color.setRGB(3.2 * (0.8 + 0.2 * Math.sin(t * 2)), 1.6, 3.0);
    }
    // ---- sprites face the camera; dust sparkles drift; lamp halos ----
    for (const m of this.bills) m.quaternion.copy(cam.quaternion);
    this.qmarks.forEach((m, i) => m.rotateZ([-0.3, 0.05, 0.3][i])); this.dq.forEach((m, i) => m.rotateZ([-0.3, 0.05, 0.3][i]));
    for (const s of this.sparks) if (s.m.visible) s.m.rotateZ(((t - s.t) / 0.45) * 1.2);
    for (const mo of this.motes) {
      mo.m.position.set(mo.x + 0.15 * Math.sin(t * 0.4 + mo.ph), mo.y + 0.1 * Math.sin(t * 0.3 + mo.ph * 2), mo.z + 0.15 * Math.cos(t * 0.35 + mo.ph));
      const tw = 0.55 + 0.45 * Math.sin(t * 2.1 + mo.ph * 3); mo.m.quaternion.copy(cam.quaternion); mo.m.scale.setScalar(mo.sz * (0.8 + 0.3 * tw)); (mo.m.material as THREE.MeshBasicMaterial).opacity = 0.7 * tw;
    }
    const focus = Math.max(0.3, this.v.set(...c.look).sub(cam.position).dot(this.fwd));
    return { focus, cInf: c.blur };
  }
}

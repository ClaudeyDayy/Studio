// The fantasy space (skill 4.6): copies of both players and the board on a round platform over calm cobalt water,
// under a violet-magenta sky with a huge pale moon and string lights. Used for Max's thoughts instead of bubbles,
// and as the picture that shrinks onto the glass dome in the object transition.
import * as THREE from "three";
import { F, V3, Who, LIFE, SEED, smooth, fantasyVisible, GHOSTS, FIVE, FUTURE, EYE, MOON } from "./story";
import { M, canvasTex, hull, makePiece, mkCanvas, noInkAll, popScale, boardTex, HOMES, kindAt, pieceId, INK_BROWN } from "./kit";
import { CastTex, Player } from "../../engine/cast/player";
import { Choreo, makeFantasy, FANT_BOARD } from "./choreo";

const glowTex = () => {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return canvasTex(c);
};
const skyTex = () => {
  const c = mkCanvas(4, 512), g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#2A1088"); gr.addColorStop(0.24, "#5226C4"); gr.addColorStop(0.42, "#C445D6"); gr.addColorStop(0.495, "#F07AC8");
  gr.addColorStop(0.505, "#2F5FE0"); gr.addColorStop(1, "#1E3FB0");
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512); return canvasTex(c);
};
const waterTex = () => {
  const c = mkCanvas(512, 512), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256); gr.addColorStop(0, "#3A6BF0"); gr.addColorStop(0.5, "#2F5FE0"); gr.addColorStop(1, "#1E3FB0");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(255,160,230,0.25)"; g.lineWidth = 2;
  for (let r = 40; r < 256; r += 26) { g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke(); }
  return canvasTex(c);
};
// v4 polish: moon surface, 4-point twinkle stars, horizon clouds
const moonTex = () => {
  const c = mkCanvas(512, 512), g = c.getContext("2d")!;
  const base = g.createRadialGradient(220, 210, 20, 256, 256, 256);
  base.addColorStop(0, "#FFF8FC"); base.addColorStop(0.7, "#FBE3F4"); base.addColorStop(1, "#F2C2E8");
  g.fillStyle = base; g.beginPath(); g.arc(256, 256, 254, 0, 7); g.fill();
  const rr = (k: number) => { const x = Math.sin(k * 77.3) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < 16; i++) {                 // soft craters
    const x = 90 + rr(i) * 330, y = 90 + rr(i + 40) * 330, r = 14 + rr(i + 80) * 46;
    const cg = g.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
    cg.addColorStop(0, "rgba(226,170,214,.0)"); cg.addColorStop(0.7, "rgba(226,170,214,.45)"); cg.addColorStop(1, "rgba(255,240,250,.0)");
    g.fillStyle = cg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  return canvasTex(c);
};
const starTex = () => {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 34); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,200,240,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = "#FFFFFF";
  for (const r of [0, Math.PI / 2]) { g.save(); g.translate(64, 64); g.rotate(r); g.beginPath(); g.moveTo(-62, 0); g.quadraticCurveTo(0, 5, 62, 0); g.quadraticCurveTo(0, -5, -62, 0); g.fill(); g.restore(); }
  return canvasTex(c);
};
const cloudTex = (seed: number) => {
  const c = mkCanvas(1024, 256), g = c.getContext("2d")!;
  const rr = (k: number) => { const x = Math.sin((k + seed * 13) * 91.7) * 43758.5453; return x - Math.floor(x); };
  const puffs: [number, number, number][] = [];
  for (let i = 0; i < 14; i++) puffs.push([60 + i * 66 + rr(i) * 30, 170 - rr(i + 20) * 70, 50 + rr(i + 40) * 60]);
  g.fillStyle = "#E070D2"; for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.fillRect(40, 170, 944, 86);
  g.globalCompositeOperation = "source-atop";
  const sh = g.createLinearGradient(0, 60, 0, 256); sh.addColorStop(0, "rgba(255,200,240,.55)"); sh.addColorStop(0.45, "rgba(214,90,214,0)"); sh.addColorStop(1, "rgba(90,40,180,.85)");
  g.fillStyle = sh; g.fillRect(0, 0, 1024, 256);
  g.globalCompositeOperation = "destination-in";
  const fade = g.createLinearGradient(0, 0, 1024, 0); fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(0.12, "rgba(0,0,0,1)"); fade.addColorStop(0.88, "rgba(0,0,0,1)"); fade.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = fade; g.fillRect(0, 0, 1024, 256);
  return canvasTex(c);
};
const ghostMat = (k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75 * k, 1.1 * k, 2.4 * k), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });

export class Fantasy {
  root = new THREE.Group();
  players: Player[] = [];
  choreo: Choreo;
  private pieces: { g: THREE.Group; id: string }[] = [];
  private ghosts: THREE.Mesh[] = [];
  private gliders: { m: THREE.Mesh; a: number; from: V3; to: V3 }[] = [];
  private five = new THREE.Group();
  private eye = new THREE.Group();
  private lit: THREE.Mesh;
  private halos: THREE.Mesh[] = [];
  private bulbs: { m: THREE.Mesh; ph: number }[] = [];
  private twinkles: { m: THREE.Mesh; ph: number; s: number }[] = [];
  private floaters: { m: THREE.Mesh; a: number; r: number; y0: number; sp: number; ph: number; s: number }[] = [];
  private glints: { m: THREE.Mesh; x: number; z: number; ph: number }[] = [];
  private rimRing!: THREE.Mesh; private underGlow!: THREE.Mesh;

  constructor(cast: Record<Who, CastTex>) {
    const R = this.root;
    const at = (o: THREE.Object3D, p: V3) => { o.position.set(...p); R.add(o); return o; };
    const glow = glowTex();
    // sky, stars, moon, light streaks
    const sky = new THREE.Mesh(new THREE.SphereGeometry(25, 48, 24), new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, depthWrite: false }));
    sky.renderOrder = -10; at(sky, F(0, 0, 0));
    const sp: number[] = [];
    const rr = (k: number) => { const x = Math.sin(k * 127.1) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < 260; i++) {
      const az = rr(i) * Math.PI * 2, el = 0.12 + rr(i + 300) * 1.3, r = 23;
      sp.push(F(0, 0, 0)[0] + r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az));
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    R.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: new THREE.Color(1.6, 1.5, 1.7), size: 3, sizeAttenuation: false })));
    const moon = new THREE.Mesh(new THREE.CircleGeometry(4.5, 72), new THREE.MeshBasicMaterial({ map: moonTex(), color: new THREE.Color(1.9, 1.75, 1.85) }));
    at(moon, MOON); moon.lookAt(...F(0, 1.4, 2.5));
    const mh = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(1.0, 0.55, 0.85), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    at(mh, [MOON[0], MOON[1], MOON[2] + 0.5]); mh.lookAt(...F(0, 1.4, 2.5));
    const mh2 = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(0.6, 0.2, 0.95), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    at(mh2, [MOON[0], MOON[1], MOON[2] + 0.6]); mh2.lookAt(...F(0, 1.4, 2.5));
    // soft moon rays falling toward the platform
    for (let k = 0; k < 3; k++) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + k * 0.6, 22), new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(0.9, 0.55, 1.0), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      at(ray, F(-2.5 + k * 2.5, 4.5, -9)); ray.rotation.z = 0.35 - k * 0.3; ray.rotation.x = -0.35;
    }
    // layered pink clouds on the horizon (depth in front of the sky)
    for (let k = 0; k < 5; k++) {
      const a = -0.9 + k * 0.45, r = 17 - (k % 2) * 2.5;
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2), new THREE.MeshBasicMaterial({ map: cloudTex(k), transparent: true, depthWrite: false, color: new THREE.Color(1.05, 0.95, 1.1), opacity: 0.92 }));
      at(cl, F(r * Math.sin(a), 0.9 + (k % 3) * 0.35, -r * Math.cos(a))); cl.lookAt(...F(0, 1.2, 0));
    }
    // twinkling 4-point stars
    const st = starTex();
    for (let i = 0; i < 46; i++) {
      const az = (rr(i + 700) - 0.5) * 2.6, el = 0.25 + rr(i + 800) * 0.9, r = 21;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.6, 1.4, 1.7) }));
      at(m, F(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), -r * Math.cos(el) * Math.cos(az)));
      this.twinkles.push({ m, ph: rr(i + 900) * 6.28, s: 0.25 + rr(i + 950) * 0.45 });
    }
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.12), new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(1.2, 0.7, 1.3), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      at(s, F(-9 + k * 6, 5.5 + (k % 2) * 2.2, -19)); s.rotation.z = -0.18 + 0.08 * k;
    }
    // water + moon path + platform + pedestal + board
    const water = new THREE.Mesh(new THREE.CircleGeometry(24, 64), new THREE.MeshBasicMaterial({ map: waterTex() }));
    water.rotation.x = -Math.PI / 2; at(water, F(0, -0.08, 0));
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 20), new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(1.3, 0.6, 1.1), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    path.rotation.x = -Math.PI / 2; at(path, F(0, -0.07, -10));
    for (let i = 0; i < 40; i++) {                                   // moving glints on the moon path
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.05), new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(1.6, 1.1, 1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.rotation.x = -Math.PI / 2; const x = (rr(i + 1100) - 0.5) * 3.0, z = -2.5 - rr(i + 1200) * 16;
      at(m, F(x, -0.06, z)); this.glints.push({ m, x, z, ph: rr(i + 1300) * 6.28 });
    }
    this.underGlow = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(1.0, 0.45, 0.95), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.underGlow.rotation.x = -Math.PI / 2; at(this.underGlow, F(0, -0.075, 0));
    this.rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.76, 0.018, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.6, 3.0) }));
    this.rimRing.rotation.x = Math.PI / 2; at(this.rimRing, F(0, 0.0, 0));
    // floating sparkles drifting up around the platform
    for (let i = 0; i < 70; i++) {
      const gold = i % 3 === 0;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: i % 7 === 0 ? st : glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: gold ? new THREE.Color(1.8, 1.4, 0.8) : new THREE.Color(1.5, 0.9, 1.7) }));
      R.add(m);
      this.floaters.push({ m, a: rr(i + 1400) * 6.28, r: 0.6 + rr(i + 1500) * 2.6, y0: rr(i + 1600) * 2.4, sp: 0.12 + rr(i + 1700) * 0.2, ph: rr(i + 1800) * 6.28, s: i % 7 === 0 ? 0.09 : 0.025 + rr(i + 1900) * 0.02 });
    }
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.78, 0.14, 56), M("#EADFF8")); at(plat, F(0, -0.07, 0));
    const ph = hull(plat.geometry, 1.012); at(ph, F(0, -0.07, 0)); ph.scale.set(1.012, 1.08, 1.012);
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.95), M("#B79AE8")); at(ped, F(0, 0.25, 0));
    at(hull(ped.geometry, 1.03), F(0, 0.25, 0));
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: boardTex("#FCE8FF", "#7A3FD0", "#2A1A1E") }));
    bd.rotation.x = -Math.PI / 2; at(bd, [FANT_BOARD[0], 0.503, FANT_BOARD[2]]);
    // posts with string lights around the platform
    const posts: V3[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6, p = F(1.6 * Math.sin(a), 0, 1.6 * Math.cos(a));
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.75, 8), M("#3E219F")); at(post, [p[0], 0.875, p[2]]);
      posts.push([p[0], 1.75, p[2]]);
    }
    const bulbGeo = new THREE.SphereGeometry(0.03, 8, 6);
    for (let k = 0; k < 6; k++) {
      const a = posts[k], b = posts[(k + 1) % 6], pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8, p = new THREE.Vector3(a[0] + (b[0] - a[0]) * u, 1.75 - 0.25 * Math.sin(u * Math.PI), a[2] + (b[2] - a[2]) * u);
        pts.push(p);
        if (i > 0 && i < 8) {
          const m = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 3.2) })); m.position.copy(p); R.add(m);
          const h = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(1.0, 0.6, 0.9), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
          h.position.copy(p); R.add(h); this.halos.push(h); this.bulbs.push({ m, ph: k * 3.1 + i });
        }
      }
      R.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: INK_BROWN })));
    }
    // players (standing copies) and the pieces
    this.players = [
      new Player(R, cast.arian, "arian", F(0, 0, 0.75), -1, false, { life: LIFE.arian, seed: SEED.arian }),
      new Player(R, cast.max, "max", F(0, 0, -0.75), 1, false, { life: LIFE.max, seed: SEED.max }),
    ];
    const rest: Record<string, V3> = {};
    for (const p of this.players) for (const h of ["L", "R"] as const) rest[`${p.who}:${h}`] = p.restHand(h);
    this.choreo = makeFantasy(rest);
    for (const [i, j] of HOMES) {
      const side = j >= 6 ? 1 : -1;
      const g = makePiece(kindAt(i, j), side === 1 ? "#FFF2FB" : "#3E219F", side, true);
      R.add(g); this.pieces.push({ g, id: pieceId(i, j) });
    }
    // ghost moves 1-4 (a little staircase of glowing pieces), the big 3D "5", future moves, the secret eye
    const ghostKinds = ["pawn", "knight", "bishop", "rook"];
    ghostKinds.forEach((k) => { const g = makePiece(k, "#FFFFFF", -1, false); const m = g.children[0] as THREE.Mesh; m.material = ghostMat(); this.ghosts.push(m); R.add(m); });
    const red = M("#E83A2E");
    const part = (geo: THREE.BufferGeometry, x: number, y: number, rz = 0) => {
      const m = new THREE.Mesh(geo, red); m.position.set(x, y, 0); m.rotation.z = rz; this.five.add(m);
      const h = hull(geo, 1.12); h.position.copy(m.position); h.rotation.z = rz; this.five.add(h);
    };
    part(new THREE.BoxGeometry(0.3, 0.075, 0.08), 0.03, 0.37);
    part(new THREE.BoxGeometry(0.075, 0.24, 0.08), -0.09, 0.26);
    part(new THREE.TorusGeometry(0.135, 0.04, 12, 36, (4 * Math.PI) / 3), 0.0, 0.02, -(2 * Math.PI) / 3);
    R.add(this.five);
    const glidePaths: [number, [number, number], [number, number]][] = [[FUTURE.a, [2, 1], [2, 3]], [FUTURE.a + 0.55, [5, 6], [4, 4]], [FUTURE.a + 1.1, [6, 0], [5, 2]]];
    for (const [a, f, t] of glidePaths) {
      const g = makePiece(kindAt(f[0], f[1]), "#FFFFFF", -1, false), m = g.children[0] as THREE.Mesh; m.material = ghostMat(); R.add(m);
      const p0 = this.choreo.sqPos(f), p1 = this.choreo.sqPos(t);
      this.gliders.push({ m, a, from: p0, to: p1 });
    }
    this.lit = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.0, 2.0), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.lit.rotation.x = -Math.PI / 2; at(this.lit, [FANT_BOARD[0], 0.51, FANT_BOARD[2] + 0.29]);
    const eyeWhite = new THREE.Mesh(new THREE.CircleGeometry(0.11, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.7) }));
    eyeWhite.scale.y = 0.62; this.eye.add(eyeWhite);
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.055, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.35, 2.2) })); iris.position.z = 0.002; this.eye.add(iris);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.024, 24), new THREE.MeshBasicMaterial({ color: INK_BROWN })); pupil.position.z = 0.004; this.eye.add(pupil);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.105, 0.125, 40), new THREE.MeshBasicMaterial({ color: INK_BROWN })); ring.scale.y = 0.62; ring.position.z = 0.003; this.eye.add(ring);
    const eg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(1.2, 0.6, 2.0), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    eg.position.z = -0.01; this.eye.add(eg);
    at(this.eye, F(0, 1.45, 0.75));
    R.traverse((o: THREE.Object3D) => { o.castShadow = false; o.frustumCulled = false; });
    noInkAll(R);
  }

  update(t: number, cam: THREE.Camera) {
    this.root.visible = fantasyVisible(t);
    if (!this.root.visible) return;
    const hands = this.choreo.hands(t);
    const ds = this.players.map((p) => cam.position.distanceTo(new THREE.Vector3(...p.restHand("R"))));
    this.players.forEach((p, i) => {
      p.hand.L = hands[`${p.who}:L`]; p.hand.R = hands[`${p.who}:R`];
      p.update(t, cam, 0, ds[i] > ds[1 - i] ? 200 : 210);
    });
    for (const p of this.pieces) p.g.position.set(...this.choreo.pieceAt(p.id, t));
    // ghost staircase
    const stair: [number, number][] = [[3, 2], [4, 3], [3, 4], [4, 5]];
    this.ghosts.forEach((m, k) => {
      const s = popScale(t, GHOSTS.a + k * GHOSTS.step, GHOSTS.out);
      m.visible = s > 0.01; m.scale.setScalar(Math.max(s, 0.001) * 1.3);
      const p = this.choreo.sqPos(stair[k]); m.position.set(p[0], p[1] + 0.06 + k * 0.11, p[2]); m.rotation.y = t * 0.9 + k;
    });
    const fs = popScale(t, FIVE.a, FIVE.b);
    this.five.visible = fs > 0.01; this.five.scale.setScalar(Math.max(fs, 0.001) * 1.15);
    this.five.position.set(...F(-0.3, 1.42 + 0.03 * Math.sin(t * 2.4), -0.05));   // centred in the shot, above Max's hat (was cut by the frame edge)
    this.five.rotation.y = Math.atan2(cam.position.x - this.five.position.x, cam.position.z - this.five.position.z) + 0.12 * Math.sin(t * 1.3);
    for (const g of this.gliders) {
      const s = popScale(t, g.a, FUTURE.b), u = smooth(g.a + 0.15, g.a + 1.0, t);
      g.m.visible = s > 0.01; g.m.scale.setScalar(Math.max(s, 0.001));
      g.m.position.set(g.from[0] + (g.to[0] - g.from[0]) * u, g.from[1] + 0.03 + 0.2 * Math.sin(Math.PI * u), g.from[2] + (g.to[2] - g.from[2]) * u);
    }
    (this.lit.material as THREE.MeshBasicMaterial).opacity = 0.5 * smooth(FUTURE.lit, FUTURE.lit + 0.2, t) * (1 - smooth(35.4, 35.8, t)) * (0.75 + 0.25 * Math.sin(t * 9));
    const es = popScale(t, EYE.a, 99);
    this.eye.visible = es > 0.01; this.eye.scale.setScalar(Math.max(es, 0.001) * (1 + 0.06 * Math.sin(t * 4)));
    this.eye.quaternion.copy(cam.quaternion);
    for (const h of this.halos) h.quaternion.copy(cam.quaternion);
    for (const b of this.bulbs) { const k = 0.8 + 0.2 * Math.sin(t * 2.3 + b.ph); (b.m.material as THREE.MeshBasicMaterial).color.setRGB(4 * k, 2.6 * k, 3.2 * k); }
    for (const w of this.twinkles) {
      const k = 0.5 + 0.5 * Math.sin(t * 2.6 + w.ph); w.m.quaternion.copy(cam.quaternion);
      w.m.scale.setScalar(w.s * (0.45 + 0.75 * k)); (w.m.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.65 * k;
    }
    for (const f of this.floaters) {
      const y = (f.y0 + t * f.sp) % 2.6, a = f.a + t * 0.08;
      f.m.position.set(F(0, 0, 0)[0] + f.r * Math.sin(a) + 0.08 * Math.sin(t * 1.3 + f.ph), 0.05 + y, f.r * Math.cos(a));
      f.m.quaternion.copy(cam.quaternion);
      const fade = Math.min(1, y / 0.3) * Math.min(1, (2.6 - y) / 0.6), tw = 0.6 + 0.4 * Math.sin(t * 3.1 + f.ph);
      f.m.scale.setScalar(f.s * (0.8 + 0.4 * tw)); (f.m.material as THREE.MeshBasicMaterial).opacity = fade * tw;
    }
    for (const g of this.glints) {
      const k = Math.max(0, Math.sin(t * 1.9 + g.ph)); (g.m.material as THREE.MeshBasicMaterial).opacity = k * 0.8;
      g.m.position.x = F(0, 0, 0)[0] + g.x + 0.15 * Math.sin(t * 0.7 + g.ph);
    }
    (this.underGlow.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.1 * Math.sin(t * 1.6);
    (this.rimRing.material as THREE.MeshBasicMaterial).color.setRGB(2.8 + 0.5 * Math.sin(t * 2.0), 1.4, 2.7);
  }
}

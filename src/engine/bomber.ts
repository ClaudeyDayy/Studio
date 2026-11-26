// THE BOMBER (2026-11-20, for the Wald video; general: any 1940s four-engine bomber scene).
// Outside: a downloaded model (public/models/bomber.glb, "Light Carpet Bomber" by Lagst, Sketchfab Standard licence).
// Inside: cockpit + crew body built here (the model has no inside).
//
//   load (once, in the video's load()):   const BOMBER = await loadBomber();
//   one plane:     const b = bomber(BOMBER, { gear: 1 });  root.add(b.group);  parked: b.group.position.y = ground + b.groundY
//                  every frame: b.update(t, { spin: 1, gear: 0..1 })   (propellers turn; gear 0 = folded, 1 = wheels down)
//                  gear also sets the plane's rotation.z (nose-up when parked); turn the plane with rotation.y only
//   bullet holes:  const h = holes(b, { wingL: 40, body: 12, tail: 8, seed: 3 })   (never on the engines)
//                  h.beams(sunDirWorld, 3.5) -> sun rays through the holes; h.setBeams(0..1) every frame
//   plane axes (local): nose = +x, up = +y, right wing = +z. Scaled to the people (1.2 m): span about 21 m.
//   b.engines: the 4 engine fronts (local), b.cockpit: the windscreen point (local), b.size: [length, height, span]
//   inside:        const c = cockpit();  root.add(c.group)   indoor set, forward = +x, floor y = 0, windscreen at x = 0.
//                  c.seats.pilot / c.seats.copilot, c.crew (10 spots incl. the 2 pilots), c.window (the windscreen centre)
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MR, mkCanvas, canvasTex, noInk, noInkAll } from "./kit";

type V3 = [number, number, number];
export const BOMBER_SPAN = 21;   // m. Real B-17 31.6 m x (1.2 / 1.8) for our 1.2 m people
export type BomberAsset = { template: THREE.Group; size: V3; engines: THREE.Vector3[]; cockpit: THREE.Vector3; belly: number; groundY: number; tailX: number; tailBelly: number; mainX: number; pitch: number };
const TAIL_R = 0.22;
const GEAR_DROP = 1.1;   // m from the belly to the ground when the wheels are down
export type Bomber = { group: THREE.Group; size: V3; engines: THREE.Vector3[]; cockpit: THREE.Vector3; meshes: THREE.Mesh[]; groundY: number;
  update: (t: number, o?: { spin?: number; gear?: number }) => void };

let rs = 1; const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
const bonesOf = (root: THREE.Object3D, re: RegExp) => { const out: THREE.Object3D[] = []; root.traverse((o) => { if (re.test(o.name) && !/end/i.test(o.name)) out.push(o); }); return out; };
const wpos = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());

// repaint the dark grey model in the shader: keep its panel lines and rivets, give it a colour (olive drab by default).
// (No pixel read-back: the first try read the picture back and silently did nothing on his PC.)
function meanLin(map: THREE.Texture) {
  try { const img = map.image as any, c = mkCanvas(64, 64), g = c.getContext("2d")!; g.drawImage(img, 0, 0, 64, 64); const p = g.getImageData(0, 0, 64, 64).data;
    let s = 0, n = 0; for (let i = 0; i < p.length; i += 4) { const v = (p[i] + p[i + 1] + p[i + 2]) / 765; if (v > 0.02) { s += Math.pow(v, 2.2); n++; } }
    if (n > 50 && s / n > 0.005) return s / n; } catch (e) { console.log("bomber paint: read-back failed, using default", String(e)); }
  return 0.05;
}
function repaint(mat: THREE.MeshStandardMaterial, col: string, lift: number) {
  const paint = new THREE.Color(col).multiplyScalar(lift), mean = meanLin(mat.map!);
  mat.color.set("#ffffff");
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uPaint = { value: paint }; sh.uniforms.uMean = { value: mean };
    sh.fragmentShader = "uniform vec3 uPaint; uniform float uMean;\n" + sh.fragmentShader.replace("#include <map_fragment>",
      "#ifdef USE_MAP\n vec4 sdc = texture2D( map, vMapUv ); float lum = dot( sdc.rgb, vec3( 0.3333 ) ) / uMean;\n diffuseColor.rgb *= uPaint * clamp( 0.45 + 0.55 * lum, 0.4, 1.6 );\n#endif");
  };
  mat.customProgramCacheKey = () => "bomberPaint" + col;
  mat.needsUpdate = true;
  console.log("bomber paint", mat.name, col, "mean", mean.toFixed(3));
}

/** load + turn + scale the model once. Nose +x, up +y, right wing +z, centre of the body at the origin. */
export async function loadBomber(url = "/public/models/bomber.glb", o: { color?: string; detail?: string } = {}): Promise<BomberAsset> {
  const gl = await new GLTFLoader().loadAsync(url), model = gl.scene; model.updateMatrixWorld(true);
  const props = bonesOf(model, /^Propeller/), tail = bonesOf(model, /^Yaw/)[0];
  const L = props.filter((b) => /L/.test(b.name.replace("Propeller", ""))), R = props.filter((b) => !L.includes(b));
  const mean = (a: THREE.Object3D[]) => a.reduce((s, b) => s.add(wpos(b)), new THREE.Vector3()).multiplyScalar(1 / a.length);
  let right = mean(R).sub(mean(L)).normalize();
  const f0 = mean(props).sub(wpos(tail)), fwd = f0.sub(right.clone().multiplyScalar(f0.dot(right))).normalize();
  let up = new THREE.Vector3().crossVectors(right, fwd);
  const turn = new THREE.Group(); turn.add(model);
  const T = new THREE.Group(); T.add(turn); T.name = "bomber";
  const orient = () => { const B = new THREE.Matrix4().makeBasis(fwd, up, right); turn.quaternion.setFromRotationMatrix(B.clone().transpose()); T.updateMatrixWorld(true); };
  orient();
  // which way is up: the tail fin sticks up far above the wing, the belly hangs only a little below it (bones can't be trusted)
  let box = new THREE.Box3().setFromObject(T, true);
  const wingY = props.reduce((s2, b) => s2 + T.worldToLocal(wpos(b)).y, 0) / props.length;
  if (box.max.y - wingY < wingY - box.min.y) { up.negate(); right.negate(); orient(); box = new THREE.Box3().setFromObject(T, true); }
  // which way is the nose: the tall tail fin is at the back. Rays down along the middle line; the highest hit = the fin.
  { const ms: THREE.Mesh[] = []; T.traverse((m: any) => { if (m.isMesh) ms.push(m); });
    const r0 = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0); let finX = 0, finY = -Infinity;
    for (let i = 0; i <= 60; i++) { const x = box.min.x + ((box.max.x - box.min.x) * i) / 60;
      for (const z of [-0.12, 0.12]) { r0.set(new THREE.Vector3(x, box.max.y + 5, z), dn); const h = r0.intersectObjects(ms, false)[0]; if (h && h.point.y > finY) { finY = h.point.y; finX = x; } } }
    const mid = (box.min.x + box.max.x) / 2;
    if (finX > mid) { fwd.negate(); right.negate(); orient(); box = new THREE.Box3().setFromObject(T, true); }
    console.log("bomber fin at x", finX.toFixed(2), finX > mid ? "(was at the front: turned round)" : "(at the back: ok)"); }
  let sz = box.getSize(new THREE.Vector3());
  turn.scale.setScalar(BOMBER_SPAN / sz.z); T.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(T, true); const ctr = box.getCenter(new THREE.Vector3());
  turn.position.sub(ctr); T.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(T, true); sz = box.getSize(new THREE.Vector3());
  // paint
  const paint = o.color ?? "#6E7A3C";
  T.traverse((m: any) => {
    if (!m.isMesh) return; m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
    const mat = m.material as THREE.MeshStandardMaterial; if (!mat.map) return;
    if (mat.userData.painted) return; mat.userData.painted = true;
    const det = /detail/i.test(mat.name);
    repaint(mat, det ? (o.detail ?? "#B8B4A6") : paint, 1.0); mat.metalness = det ? 0.35 : 0.08; mat.roughness = 0.65;
  });
  const engines = props.map((b) => T.worldToLocal(wpos(b))).sort((a, b) => a.z - b.z);
  const cockpit = new THREE.Vector3(box.max.x - sz.x * 0.17, box.max.y - sz.y * 0.55, 0);
  // landing gear: our own simple wheels (the model's gear animation scattered its wheel doors in our engine). Wheels touch the
  // ground GEAR_DROP below the belly; groundY = how high the plane's centre sits above the ground when parked.
  // the belly = the real bottom skin: shoot straight down through the body and the inner engines, keep only hits within 3.5 m
  // of the top skin (the bounding box also counted a hidden part far below, and the planes floated)
  const meshes: THREE.Mesh[] = []; T.traverse((m: any) => { if (m.isMesh) meshes.push(m); });
  const rc = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0); let belly = Infinity;
  const inner2 = [...engines].sort((a, b) => Math.abs(a.z) - Math.abs(b.z)).slice(0, 2);
  const lines: [number, number][] = []; for (const e of inner2) for (const dx of [-2.5, -1.5, -0.5]) { lines.push([e.x + dx, 0], [e.x + dx, e.z]); }
  for (const [x, z] of lines) {
    rc.set(new THREE.Vector3(x, box.max.y + 5, z), down); const hits = rc.intersectObjects(meshes, false); if (!hits.length) continue;
    const top = hits[0].point.y; for (const h of hits) if (h.point.y > top - 3.5) belly = Math.min(belly, h.point.y);
  }
  if (!isFinite(belly)) belly = box.min.y;
  // tail: the bottom of the body near the tail (fuselage is thin there: hits within 2.5 m of its top)
  const tailX = -sz.x * 0.38; let tailBelly = Infinity;
  for (const z of [-0.15, 0.15]) { rc.set(new THREE.Vector3(tailX, box.max.y + 5, z), down); const hits = rc.intersectObjects(meshes, false); if (!hits.length) continue;
    const top = hits[0].point.y; for (const h of hits) if (h.point.y > top - 2.5) tailBelly = Math.min(tailBelly, h.point.y); }
  if (!isFinite(tailBelly)) tailBelly = belly + 0.6;
  // parked like a real WW2 bomber: on two main wheels and a small tail wheel, so the nose points up a little
  const mainX = inner2.reduce((a2, e) => a2 + e.x, 0) / inner2.length - 1.5, y0 = belly - GEAR_DROP, tailY = tailBelly - 0.15 - 2 * TAIL_R;
  const pitch = Math.atan2(tailY - y0, mainX - tailX);
  const groundY = -(mainX * Math.sin(pitch) + y0 * Math.cos(pitch));
  console.log("bomber belly", belly.toFixed(2), "tail belly", tailBelly.toFixed(2), "pitch", (pitch * 57.3).toFixed(1), "deg, groundY", groundY.toFixed(2));
  return { template: T, size: [sz.x, sz.y, sz.z], engines, cockpit, belly, groundY, tailX, tailBelly, mainX, pitch };
}

/** one plane (copies share the textures). update(t, { spin }) turns the propellers. */
export function bomber(A: BomberAsset, o: { name?: string; gear?: number } = {}): Bomber {
  const G = cloneSkinned(A.template) as THREE.Group; G.name = o.name ?? "bomber";
  const props = bonesOf(G, /^Propeller/).map((b) => ({ b, q: b.quaternion.clone() }));
  const meshes: THREE.Mesh[] = []; G.traverse((m: any) => { if (m.isMesh) { meshes.push(m); m.castShadow = m.receiveShadow = true; } });
  const qa = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  // gear: 0 = folded (flying), 1 = wheels down (parked, landing). Two main legs under the inner engines + a tail wheel.
  const gear = new THREE.Group(); gear.name = "landingGear"; G.add(gear);
  const tyre = MR("#2A2628", 0.85), leg = MR("#9A9C96", 0.4, 0.6), y0 = A.belly - GEAR_DROP;
  const inner = [...A.engines].sort((a, b) => Math.abs(a.z) - Math.abs(b.z)).slice(0, 2);
  const wheelLeg = (x: number, z: number, top: number, r: number, cy: number, name: string) => {
    const W = new THREE.Group(); W.name = name;
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.55, 20), tyre); wh.rotation.x = Math.PI / 2; wh.position.set(x, cy, z); wh.name = name + "Wheel";
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, r * 0.58, 14), leg); hub.rotation.x = Math.PI / 2; hub.position.copy(wh.position); hub.name = name + "Hub";
    const h = Math.max(0.15, top - cy), st = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.04, r * 0.12), Math.max(0.04, r * 0.12), h, 8), leg); st.position.set(x, cy + h / 2, z); st.name = name + "Leg";
    for (const m of [wh, hub, st]) { m.castShadow = m.receiveShadow = true; W.add(m); }
    W.userData.lift = top - cy; gear.add(W);
  };
  for (const e of inner) wheelLeg(A.mainX, e.z, e.y - 0.3, 0.5, y0 + 0.5, "mainGear");
  wheelLeg(A.tailX, 0, A.tailBelly + 0.1, TAIL_R, A.tailBelly - 0.15 - TAIL_R, "tailGear");
  // gear k: wheels slide down out of the body, and the parked plane settles nose-up onto its tail wheel (rotation.z = pitch)
  const setGear = (k: number) => { k = Math.max(0, Math.min(1, k)); gear.visible = k > 0.01; gear.children.forEach((W: any) => { W.position.y = (1 - k) * W.userData.lift * 0.9; }); G.rotation.z = A.pitch * k; };
  setGear(o.gear ?? 0);
  return {
    group: G, size: A.size, engines: A.engines.map((v) => v.clone()), cockpit: A.cockpit.clone(), meshes, groundY: A.groundY,
    update(t, u = {}) { if (u.gear !== undefined) setGear(u.gear); const s = u.spin ?? 1; props.forEach((p, i) => { qa.setFromAxisAngle(Y, (t * 38 + i * 0.7) * s); p.b.quaternion.copy(p.q).multiply(qa); }); },
  };
}

// ---------------- bullet holes ----------------
function holeTex(lit: boolean) {
  const c = mkCanvas(128, 128), g = c.getContext("2d")!;
  const jag = (r: number, n: number, k: number) => { g.beginPath(); for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, rr = r * (1 - k + k * rnd()); i ? g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr) : g.moveTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  rs = lit ? 77 : 41;
  g.fillStyle = "#D9D6CC"; jag(56, 14, 0.45);                    // torn bare metal round the hole
  g.fillStyle = "#8E8C84"; jag(44, 12, 0.35);
  if (lit) { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 36); gr.addColorStop(0, "#FFFBEA"); gr.addColorStop(0.6, "#FFE29A"); gr.addColorStop(1, "#E8A84E"); g.fillStyle = gr; }
  else g.fillStyle = "#1E1424";                                  // dark plum, never black
  jag(36, 11, 0.4);
  const t = canvasTex(c); return t;
}
let HT: THREE.Texture[] | null = null, BT: THREE.Texture | null = null;
export type Holes = { under: { p: THREE.Vector3; n: THREE.Vector3; part: string }[]; list: { p: THREE.Vector3; n: THREE.Vector3; part: string }[]; group: THREE.Group; beams: (sunWorld: THREE.Vector3, len?: number) => void; setBeams: (k: number) => void };

/** Put bullet holes on the plane (raycast onto the real surface). Engines stay clean (the story's point). */
export function holes(b: Bomber, o: { wingL?: number; wingR?: number; body?: number; tail?: number; seed?: number; size?: number } = {}): Holes {
  rs = Math.floor((o.seed ?? 3) * 9973) % 2147483646 + 1;
  if (!HT) HT = [holeTex(false), holeTex(true)];
  const G = new THREE.Group(); G.name = "holes"; noInk(G); G.userData.camFree = true; b.group.add(G); b.group.updateMatrixWorld(true);
  const [Lx, Hy, Sz] = b.size, ray = new THREE.Raycaster(), list: Holes["list"] = [], inv = new THREE.Matrix4().copy(b.group.matrixWorld).invert();
  const nearEngine = (p: THREE.Vector3) => b.engines.some((e) => Math.abs(p.z - e.z) < 0.95 && p.x > e.x - 4.2);
  const shoot = (from: THREE.Vector3, dir: THREE.Vector3, part: string, ok: (p: THREE.Vector3) => boolean) => {
    const f = from.clone().applyMatrix4(b.group.matrixWorld), d = dir.clone().transformDirection(b.group.matrixWorld);
    ray.set(f, d); const hit = ray.intersectObjects(b.meshes, false)[0]; if (!hit || !hit.face) return false;
    const p = hit.point.clone().applyMatrix4(inv); if (!ok(p)) return false;
    const mo = hit.object as THREE.Mesh, A = new THREE.Vector3(), B2 = new THREE.Vector3(), C2 = new THREE.Vector3();   // posed (skinned) triangle normal
    mo.getVertexPosition(hit.face.a, A); mo.getVertexPosition(hit.face.b, B2); mo.getVertexPosition(hit.face.c, C2);
    const n = B2.sub(A).cross(C2.sub(A)).transformDirection(mo.matrixWorld).transformDirection(inv);
    if (n.dot(dir) > 0) n.negate();
    list.push({ p, n, part }); return true;
  };
  const tryN = (n: number, gen: () => [THREE.Vector3, THREE.Vector3, string, (p: THREE.Vector3) => boolean]) => { for (let k = 0, got = 0; got < n && k < n * 30; k++) if (shoot(...gen())) got++; };
  const top = Hy, wingOK = (p: THREE.Vector3) => Math.abs(p.y) < Hy * 0.35 && !nearEngine(p);
  const wing = (side: number): [THREE.Vector3, THREE.Vector3, string, (p: THREE.Vector3) => boolean] => {
    const z = side * (1.4 + rnd() * (Sz / 2 - 2.0)), x = -Lx * 0.15 + rnd() * Lx * 0.3;
    return [new THREE.Vector3(x, top, z), new THREE.Vector3(0, -1, 0), side < 0 ? "wingL" : "wingR", wingOK];
  };
  tryN(o.wingL ?? 0, () => wing(-1)); tryN(o.wingR ?? 0, () => wing(1));
  tryN(o.body ?? 0, () => { const s = rnd() < 0.5 ? -1 : 1, x = -Lx * 0.32 + rnd() * Lx * 0.55, y = -Hy * 0.15 + rnd() * Hy * 0.3;
    return [new THREE.Vector3(x, y, s * Sz), new THREE.Vector3(0, 0, -s), "body", (p) => Math.abs(p.z) < 1.4 && p.x < b.cockpit.x - 1.0]; });
  tryN(o.tail ?? 0, () => { const x = -Lx / 2 + rnd() * Lx * 0.12, z = (rnd() - 0.5) * Sz * 0.4;
    return [new THREE.Vector3(x, top, z), new THREE.Vector3(0, -1, 0), "tail", () => true]; });
  // a bullet goes through: every wing hole also has its exit on the underside (lit by the sun coming through)
  const top0 = list.length, under: Holes["list"] = [];
  for (let i = 0; i < top0; i++) { const h = list[i]; if (!h.part.startsWith("wing")) continue;
    const n0 = list.length; if (shoot(new THREE.Vector3(h.p.x, -Hy, h.p.z), new THREE.Vector3(0, 1, 0), h.part + "Under", (p) => p.y < h.p.y)) under.push(list.splice(n0, 1)[0]); }
  // decals: a thin quad on the surface, a few mm out, one per hole (merged per kind for speed)
  const sz = o.size ?? 0.24;
  const decals = (hs: Holes["list"], tex: THREE.Texture, name: string, emissive: boolean) => {
    if (!hs.length) return; rs = 5 + hs.length;
    const geos = hs.map((h) => { const s = sz * (0.6 + 0.8 * rnd()), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), h.n);
      const g = new THREE.PlaneGeometry(s, s); g.rotateZ(rnd() * 6.28); g.applyQuaternion(q); g.translate(h.p.x + h.n.x * 0.006, h.p.y + h.n.y * 0.006, h.p.z + h.n.z * 0.006); return g; });
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false });
    if (emissive) { mat.emissiveMap = tex; mat.emissive.set("#FFC86A"); mat.emissiveIntensity = 1.6; }
    const m = new THREE.Mesh(mergeGeometries(geos), mat); m.name = name; m.renderOrder = 3; m.receiveShadow = true; m.castShadow = false; m.userData.noShadow = true; G.add(m);
  };
  decals(list, HT[0], "bulletHoles", false); decals(under, HT[1], "bulletHolesLit", true); noInkAll(G);
  // sun rays through the holes: thin additive cones on the far side of each hole, along the sun
  const beamG = new THREE.Group(); beamG.name = "holeBeams"; beamG.visible = false; G.add(beamG);
  const beams = (sunWorld: THREE.Vector3, len = 3.5) => {
    beamG.clear();
    if (!BT) { const c = mkCanvas(16, 128), g = c.getContext("2d")!, gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.08, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 16, 128); BT = canvasTex(c); }
    const d = sunWorld.clone().normalize().negate().transformDirection(inv), mat = new THREE.MeshBasicMaterial({ map: BT, color: "#FFD58A", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false });
    for (const h of [...list, ...under]) {
      if (h.n.dot(d) > 0) continue;   // the sun must come from the other side of the surface
      const g = new THREE.CylinderGeometry(sz * 0.18, sz * 0.75, len, 10, 1, true); g.translate(0, -len / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d)); g.translate(h.p.x, h.p.y, h.p.z);
      const m = new THREE.Mesh(g, mat); m.userData.noShadow = true; m.castShadow = false; m.renderOrder = 21; m.userData.camFree = true; beamG.add(m);
    }
    noInkAll(beamG);
  };
  const setBeams = (k: number) => { beamG.visible = k > 0.002; beamG.children.forEach((m: any) => (m.material.opacity = 0.32 * k)); };
  return { list, under, group: G, beams, setBeams };
}

// ---------------- the inside: cockpit and crew body (indoor set, outlined) ----------------
function panelTex() {
  const c = mkCanvas(1024, 384), g = c.getContext("2d")!; g.fillStyle = "#2B2629"; g.fillRect(0, 0, 1024, 384);
  rs = 19;
  for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
    const x = 70 + i * 110 + (row ? 40 : 0), y = 110 + row * 160, r = 44;
    g.fillStyle = "#151116"; g.beginPath(); g.arc(x, y, r + 6, 0, 7); g.fill();
    g.fillStyle = i % 4 === 1 ? "#F2E2B6" : "#E8EEF0"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = "#2B1C1A"; g.lineWidth = 3; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78); g.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95); g.stroke(); }
    const a = rnd() * 6.28; g.strokeStyle = "#C7362F"; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75); g.stroke();
  }
  for (let i = 0; i < 14; i++) { g.fillStyle = i % 3 ? "#D8D2C2" : "#E2B23C"; g.fillRect(40 + i * 70, 20, 26, 14); }
  return canvasTex(c);
}
function skinTex() {   // inside of the body: aluminium panels with rivet rows
  const c = mkCanvas(512, 512), g = c.getContext("2d")!; g.fillStyle = "#AEB2A8"; g.fillRect(0, 0, 512, 512);
  rs = 23; for (let i = 0; i < 40; i++) { g.fillStyle = rnd() < 0.5 ? "#9EA398" : "#BDC1B6"; g.globalAlpha = 0.5; g.fillRect(rnd() * 512, rnd() * 512, 60 + rnd() * 140, 30 + rnd() * 90); }
  g.globalAlpha = 1; g.strokeStyle = "#7E8278"; g.lineWidth = 3; for (let x = 0; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); } for (let y = 0; y <= 512; y += 170) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.fillStyle = "#6E7268"; for (let x = 0; x <= 512; x += 128) for (let y = 6; y < 512; y += 14) { g.beginPath(); g.arc(x + 6, y, 1.6, 0, 7); g.fill(); }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, name = "") => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (name) m.name = name; return m; };

export type Cockpit = { group: THREE.Group; seats: { pilot: V3; copilot: V3 }; crew: { at: V3; yaw: number; sit: boolean; job: string }[]; window: V3; radius: number; length: number };
/** The inside of the bomber: flight deck with two seats, yokes, instrument panel, windscreen and side windows (the sun comes in
 *  through them with bar shadows), then the crew body behind (navigator desk, radio desk, ammo, oxygen bottles, waist windows).
 *  Indoor set: everything outlined. Forward = +x, floor at y = 0, windscreen at x = 0. Glass is camFree. */
export function cockpit(o: { length?: number } = {}): Cockpit {
  const G = new THREE.Group(); G.name = "cockpitSet"; G.userData.indoor = true;
  const R = 0.88, CY = 0.52, LEN = o.length ?? 9.0, skinT = skinTex(); skinT.repeat.set(LEN / 1.2, 3);
  const skin = new THREE.MeshStandardMaterial({ map: skinT, roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide });
  const green = MR("#8E9C58", 0.7), dark = MR("#3A3438", 0.6), leather = MR("#6A4A32", 0.7), metal = MR("#C9CDD2", 0.35, 0.6);
  const glass = new THREE.MeshStandardMaterial({ color: "#CFE6F2", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false });
  // body shell with window gaps (theta: 0 = right side, pi/2 = bottom, pi = left, 3pi/2 = top)
  const shell = (x0: number, x1: number, gaps: [number, number][], name: string) => {
    const pieces: [number, number][] = []; const all = [...gaps].sort((p, q) => p[0] - q[0]);
    const T0 = -Math.PI / 2 + 0.0001, T1 = (3 * Math.PI) / 2; let cur = T0;
    for (const [g0, g1] of all) { if (g0 > cur) pieces.push([cur, g0]); cur = g1; } if (cur < T1) pieces.push([cur, T1]);
    for (const [t0, t1] of pieces) {
      const g = new THREE.CylinderGeometry(R, R, x1 - x0, 40, 1, true, t0, t1 - t0); g.rotateZ(-Math.PI / 2); g.translate((x0 + x1) / 2, CY, 0);
      G.add(mk(g, skin, 0, 0, 0, name));
    }
    for (const [g0, g1] of all) {   // glass over each gap + window bars
      const g = new THREE.CylinderGeometry(R - 0.01, R - 0.01, x1 - x0, 12, 1, true, g0, g1 - g0); g.rotateZ(-Math.PI / 2); g.translate((x0 + x1) / 2, CY, 0);
      const gl = mk(g, glass, 0, 0, 0, "windowGlass"); gl.castShadow = false; gl.userData.camFree = true; G.add(gl);
      const n = Math.max(2, Math.round((x1 - x0) / 0.4));
      for (let k = 0; k <= n; k++) { const x = x0 + ((x1 - x0) * k) / n, th = (g0 + g1) / 2, y = CY - Math.sin(th) * R, z = Math.cos(th) * R;
        const bar = mk(new THREE.BoxGeometry(0.05, (g1 - g0) * R + 0.06, 0.05), dark, x, y, z, "windowBar"); bar.rotation.x = th; G.add(bar); }
      for (const th of [g0, g1]) { const y = CY - Math.sin(th) * R, z = Math.cos(th) * R; G.add(mk(new THREE.BoxGeometry(x1 - x0, 0.05, 0.05), dark, (x0 + x1) / 2, y, z, "windowBar")); }
    }
  };
  const winL: [number, number] = [Math.PI + 0.12, Math.PI + 0.72], winR: [number, number] = [-0.72, -0.12];
  // shell: flight deck (side windows), crew body (small windows), waist (big gun windows)
  shell(-1.7, 0.35, [[winR[0], winR[1]], winL], "deckShell");
  shell(-5.4, -1.7, [[-0.55, -0.3], [Math.PI + 0.3, Math.PI + 0.55]], "bodyShell");
  shell(-7.4, -5.4, [[-0.75, -0.1], [Math.PI + 0.1, Math.PI + 0.75]], "waistShell");
  shell(-LEN, -7.4, [], "tailShell");
  // ribs (zinc-chromate green) every 0.45 m, merged
  const ribs: THREE.BufferGeometry[] = []; for (let x = 0.3; x > -LEN; x -= 0.55) { const t = new THREE.TorusGeometry(R - 0.02, 0.016, 6, 40); t.rotateY(Math.PI / 2); t.translate(x, CY, 0); ribs.push(t); }
  G.add(mk(mergeGeometries(ribs), green, 0, 0, 0, "ribs"));
  // floor: walkway planks on a metal deck
  const half = Math.sqrt(R * R - CY * CY);
  G.add(mk(new THREE.BoxGeometry(LEN + 0.35, 0.04, half * 2 - 0.02), MR("#7C786C", 0.8), (0.35 - LEN) / 2, 0.0, 0, "floor"));
  G.add(mk(new THREE.BoxGeometry(LEN, 0.03, 0.42), MR("#8A6A48", 0.8), -LEN / 2, 0.035, 0, "walkway"));
  // windscreen: frame bars + glass, slanted, closes the front above the panel
  const ws = new THREE.Group(); ws.name = "windscreen"; ws.position.set(0.3, 0.95, 0); ws.rotation.z = 0.55; G.add(ws);
  const wh = 0.62, ww = 1.5;
  const wg = mk(new THREE.PlaneGeometry(ww, wh), glass, 0, wh / 2, 0, "windscreenGlass"); wg.rotation.y = -Math.PI / 2; wg.castShadow = false; wg.userData.camFree = true; ws.add(wg);
  for (const z of [-0.74, -0.26, 0.26, 0.74]) ws.add(mk(new THREE.BoxGeometry(0.05, wh, 0.05), dark, 0, wh / 2, z, "windscreenBar"));
  for (const y of [0, wh]) ws.add(mk(new THREE.BoxGeometry(0.05, 0.05, ww), dark, 0, y, 0, "windscreenBar"));
  // front below the windscreen: instrument panel + glare shield, closing the nose
  const pT = panelTex();
  G.add(mk(new THREE.BoxGeometry(0.1, 0.5, 1.76), dark, 0.26, 0.72, 0, "panel"));
  G.add(mk(new THREE.BoxGeometry(0.1, 0.47, 1.76), dark, 0.3, 0.235, 0, "noseLower"));
  const face = mk(new THREE.PlaneGeometry(1.24, 0.46), new THREE.MeshStandardMaterial({ map: pT, roughness: 0.4 }), 0.205, 0.72, 0, "dials"); face.rotation.y = -Math.PI / 2; G.add(face);
  G.add(mk(new THREE.BoxGeometry(0.22, 0.05, 1.36), dark, 0.2, 0.98, 0, "glareShield"));
  // seats, yokes, throttles
  const seats = { pilot: [-0.62, 0, -0.36] as V3, copilot: [-0.62, 0, 0.36] as V3 };
  for (const [nm, s] of Object.entries(seats)) {
    const [x, , z] = s;
    G.add(mk(new THREE.BoxGeometry(0.42, 0.08, 0.4), leather, x, 0.38, z, nm + "Seat"));
    G.add(mk(new THREE.BoxGeometry(0.07, 0.62, 0.4), leather, x - 0.24, 0.72, z, nm + "SeatBack"));
    G.add(mk(new THREE.BoxGeometry(0.06, 0.34, 0.06), metal, x, 0.19, z, nm + "SeatPost"));
    G.add(mk(new THREE.CylinderGeometry(0.025, 0.03, 0.62, 8), dark, 0.0, 0.31, z, nm + "YokeColumn"));
    const wheel = mk(new THREE.TorusGeometry(0.11, 0.018, 8, 24, Math.PI * 1.4), dark, -0.02, 0.66, z, nm + "Yoke"); wheel.rotation.y = Math.PI / 2; wheel.rotation.x = Math.PI * 0.8; G.add(wheel);
  }
  G.add(mk(new THREE.BoxGeometry(0.22, 0.14, 0.16), dark, -0.12, 0.62, 0, "throttles"));
  for (let k = 0; k < 4; k++) { const z = -0.06 + k * 0.04; G.add(mk(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), metal, -0.12, 0.76, z, "lever")); G.add(mk(new THREE.SphereGeometry(0.022, 10, 8), MR(k < 2 ? "#C7362F" : "#E2B23C", 0.4), -0.12, 0.84, z, "knob")); }
  // crew body: navigator desk with a map, radio desk, ammo boxes, oxygen bottles (yellow: the place's accent)
  const map = (() => { const c = mkCanvas(256, 192), g = c.getContext("2d")!; g.fillStyle = "#EDE2C4"; g.fillRect(0, 0, 256, 192); g.strokeStyle = "#7FA6C6"; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 140); g.bezierCurveTo(80, 100, 120, 160, 256, 110); g.stroke(); g.strokeStyle = "#C7362F"; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(30, 40); g.lineTo(210, 150); g.stroke(); return canvasTex(c); })();
  G.add(mk(new THREE.BoxGeometry(0.6, 0.05, 0.36), MR("#7A5A3A", 0.7), -2.6, 0.62, 0.4, "navDesk"));
  const mp = mk(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshStandardMaterial({ map, roughness: 0.8 }), -2.6, 0.651, 0.4, "navMap"); mp.rotation.x = -Math.PI / 2; mp.castShadow = false; G.add(mp);
  G.add(mk(new THREE.BoxGeometry(0.5, 0.36, 0.3), MR("#4A4E44", 0.6), -4.2, 0.78, -0.45, "radio"));
  for (let k = 0; k < 3; k++) { const d = mk(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 14), MR("#E8EEF0", 0.4), -4.06 - k * 0.12, 0.84, -0.29, "radioDial"); d.rotation.x = Math.PI / 2; G.add(d); }
  for (let k = 0; k < 6; k++) G.add(mk(new THREE.BoxGeometry(0.3, 0.22, 0.2), MR("#5E6B3A", 0.7), -3.2 - k * 0.7, 0.13, k % 2 ? 0.5 : -0.5, "ammoBox"));
  for (let k = 0; k < 4; k++) { const b = mk(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 14), MR("#E2B23C", 0.45), -1.9 - k * 1.6, 1.0, k % 2 ? -0.6 : 0.6, "oxygen"); b.rotation.x = 0.5 * (k % 2 ? 1 : -1); G.add(b); }
  const tail = mk(new THREE.CircleGeometry(R, 40), skin, -LEN, CY, 0, "tailBulkhead"); tail.rotation.y = Math.PI / 2; G.add(tail);
  G.add(mk(new THREE.BoxGeometry(0.04, 0.9, 0.5), MR("#5A4A3A", 0.7), -LEN + 0.03, 0.5, 0, "tailDoor"));
  // ten crew spots (the two pilots first). yaw: the way they face (0 = +x)
  const crew = [
    { at: seats.pilot, yaw: 0, sit: true, job: "pilot" }, { at: seats.copilot, yaw: 0, sit: true, job: "copilot" },
    { at: [-1.25, 0, 0] as V3, yaw: 0, sit: false, job: "engineer" }, { at: [-2.6, 0, 0.05] as V3, yaw: Math.PI / 2, sit: true, job: "navigator" },
    { at: [-3.1, 0, -0.3] as V3, yaw: 0, sit: false, job: "bombardier" }, { at: [-4.2, 0, -0.1] as V3, yaw: -Math.PI / 2, sit: true, job: "radio" },
    { at: [-5.0, 0, 0.25] as V3, yaw: Math.PI, sit: false, job: "ballGunner" }, { at: [-6.1, 0, -0.35] as V3, yaw: -Math.PI / 2, sit: false, job: "waistL" },
    { at: [-6.7, 0, 0.35] as V3, yaw: Math.PI / 2, sit: false, job: "waistR" }, { at: [-8.2, 0, 0] as V3, yaw: Math.PI, sit: true, job: "tail" },
  ];
  return { group: G, seats, crew, window: [0.4, 1.25, 0], radius: R, length: LEN };
}

// LOG (newest first)
// 2026-11-20  Nose found from the shape (fin = back); the bone guess had front and back swapped.
// 2026-11-20  Parked nose-up on two main wheels + tail wheel (pitch from the measured belly and tail).
// 2026-11-20  Belly found by rays down through the body (the box bottom was 2 m too low).
// 2026-11-20  Own simple landing gear (gear 0..1) + groundY; the model's gear animation scattered its doors.
// 2026-11-20  Up is found from the shape (fin above the wing); the bone guess turned the plane upside down.
// 2026-11-20  Paint in the shader (read-back did nothing); thinner softer sun rays, bigger holes, thinner ribs.
// 2026-11-20  File created for the Wald bomber video: loadBomber / bomber / holes (+ sun rays) / cockpit.

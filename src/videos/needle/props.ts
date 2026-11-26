// Our own props for "Needle at light speed" (2026-11-16): rocket, light-speed gun, phone, moon ground, stars, Earth.
// All shapes and colours are our own design. The logo is Arian's MAX FILMS picture, used as it is.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MR, MTR, mkCanvas, canvasTex, noInk } from "../../engine/kit";
import { drawMenu } from "./menu";

const glow = (hex: string, k = 2.2) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: k, roughness: 0.4 });
const named = <T extends THREE.Object3D>(o: T, n: string) => { o.name = n; return o; };
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number] = [0, 0, 0], n = "") => { const o = new THREE.Mesh(g, m); o.position.set(...p); o.name = n; o.castShadow = o.receiveShadow = true; return o; };
let sd = 4242; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);

// ---------------- the moon ground ----------------
export function moonGround() {
  const S = 2048, c = mkCanvas(S, S), g = c.getContext("2d")!;      // colour
  const hc = mkCanvas(S, S), h = hc.getContext("2d")!;               // height (for the relief)
  g.fillStyle = "#9C968C"; g.fillRect(0, 0, S, S); h.fillStyle = "#808080"; h.fillRect(0, 0, S, S);
  const wrap = (f: (x: number, y: number) => void, x: number, y: number, r: number) => {   // draw near edges twice so the tile repeats cleanly
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) if (x + dx > -r && x + dx < S + r && y + dy > -r && y + dy < S + r) f(x + dx, y + dy);
  };
  // big soft patches: darker grey "seas" and paler warm highlands
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S, y = rnd() * S, r = 80 + rnd() * 320, d = rnd() < 0.5;
    wrap((X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, r);
      gr.addColorStop(0, d ? "rgba(72,70,74,0.20)" : "rgba(214,204,186,0.18)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(X - r, Y - r, 2 * r, 2 * r); }, x, y, r);
  }
  // fine dust grain (regolith): many tiny specks, light and dark
  const img = g.getImageData(0, 0, S, S), D = img.data;
  for (let i = 0; i < D.length; i += 4) { const n = (rnd() - 0.5) * 26; D[i] += n; D[i + 1] += n; D[i + 2] += n * 0.9; }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 9000; i++) { const x = rnd() * S, y = rnd() * S, r = 0.6 + rnd() * 2.2; g.fillStyle = rnd() < 0.5 ? "rgba(60,58,60,0.35)" : "rgba(235,228,214,0.35)"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  // craters, big to tiny: bowl, lit rim, shadowed inner wall, a ring of thrown-out dust, and a thin dark outline
  const crater = (x: number, y: number, r: number) => wrap((X, Y) => {
    const ej = g.createRadialGradient(X, Y, r, X, Y, r * 1.9); ej.addColorStop(0, "rgba(206,198,182,0.35)"); ej.addColorStop(1, "rgba(206,198,182,0)");
    g.fillStyle = ej; g.beginPath(); g.arc(X, Y, r * 1.9, 0, 7); g.fill();
    const bw = g.createRadialGradient(X - r * 0.25, Y - r * 0.25, r * 0.1, X, Y, r); bw.addColorStop(0, "#8E8880"); bw.addColorStop(0.7, "#7A756E"); bw.addColorStop(1, "#5E5A56");
    g.fillStyle = bw; g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill();
    g.fillStyle = "rgba(48,46,50,0.45)"; g.beginPath(); g.arc(X, Y, r, -0.6, 2.4); g.arc(X - r * 0.18, Y - r * 0.18, r * 0.86, 2.4, -0.6, true); g.fill();   // shadow inside the lit side
    g.strokeStyle = "rgba(236,230,218,0.8)"; g.lineWidth = Math.max(1.2, r * 0.09); g.beginPath(); g.arc(X, Y, r * 1.02, 2.5, 5.6); g.stroke();      // bright rim
    g.strokeStyle = "rgba(42,26,30,0.85)"; g.lineWidth = Math.max(1.4, Math.min(3, r * 0.05)); g.beginPath(); g.arc(X, Y, r * 1.06, 0, 7); g.stroke();   // thin outline
    const hg = h.createRadialGradient(X, Y, 0, X, Y, r * 1.25); hg.addColorStop(0, "#3a3a3a"); hg.addColorStop(0.78, "#6a6a6a"); hg.addColorStop(0.88, "#c8c8c8"); hg.addColorStop(1, "rgba(128,128,128,0)");
    h.fillStyle = hg; h.beginPath(); h.arc(X, Y, r * 1.25, 0, 7); h.fill();
  }, x, y, r * 2);
  for (let i = 0; i < 14; i++) crater(rnd() * S, rnd() * S, 60 + rnd() * 110);
  for (let i = 0; i < 70; i++) crater(rnd() * S, rnd() * S, 16 + rnd() * 40);
  for (let i = 0; i < 260; i++) crater(rnd() * S, rnd() * S, 4 + rnd() * 11);
  // small stones
  for (let i = 0; i < 500; i++) { const x = rnd() * S, y = rnd() * S, r = 2 + rnd() * 4; g.fillStyle = "#6E6A66"; g.beginPath(); g.ellipse(x, y, r, r * 0.7, rnd() * 3, 0, 7); g.fill(); g.fillStyle = "rgba(240,232,220,0.6)"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, 7); g.fill(); }
  // relief: height -> normal map
  const H = h.getImageData(0, 0, S, S).data, nc = mkCanvas(S, S), ng = nc.getContext("2d")!, N = ng.createImageData(S, S);
  const hv = (x: number, y: number) => H[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (hv(x + 1, y) - hv(x - 1, y)) * 6, dy = (hv(x, y + 1) - hv(x, y - 1)) * 6, l = Math.hypot(dx, dy, 1), o = (y * S + x) * 4;
    N.data[o] = (-dx / l * 0.5 + 0.5) * 255; N.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; N.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; N.data[o + 3] = 255;
  }
  ng.putImageData(N, 0, 0);
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 30); t.anisotropy = 8;
  const nt = new THREE.CanvasTexture(nc); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(30, 30); nt.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: t, normalMap: nt, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.97 });
  const m = mesh(new THREE.PlaneGeometry(300, 300), mat, [0, 0, 0], "moon ground"); m.rotation.x = -Math.PI / 2; m.castShadow = false;
  return noInk(m);
}
export function rocks(root: THREE.Object3D) {
  const spots: [number, number, number][] = [[-1.6, 0.9, 0.16], [1.5, 1.2, 0.1], [-2.8, -1.5, 0.28], [0.9, -2.2, 0.2], [-0.9, 2.4, 0.08], [3.6, 0.6, 0.22], [-4.2, -4, 0.45]];
  for (const [x, z, s] of spots) {
    const r = mesh(new THREE.DodecahedronGeometry(s, 0), MR("#8A847C", 0.95), [x, s * 0.45, z], "rock");
    r.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); r.scale.set(1, 0.7, 1.1); root.add(r);
  }
}
// ---------------- sky: stars + the Earth ----------------
export function stars() {
  const G = new THREE.Group(); G.name = "stars"; G.userData.camFree = true;
  const layer = (n: number, R: number, size: number, cols: string[]) => {
    const p = new Float32Array(n * 3), c = new Float32Array(n * 3), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const u = rnd(), a = rnd() * Math.PI * 2, y = 0.02 + u * 0.98, r = Math.sqrt(1 - y * y), rr = R * (0.8 + 0.4 * rnd());
      p.set([Math.cos(a) * r * rr, y * rr, Math.sin(a) * r * rr], i * 3);
      col.set(cols[Math.floor(rnd() * cols.length)]).multiplyScalar(0.75 + 0.6 * rnd()); c.set([col.r, col.g, col.b], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3)); geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
    const s = new THREE.Points(geo, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, map: starDot(), transparent: true, depthWrite: false, toneMapped: false }));
    s.frustumCulled = false; s.renderOrder = -98; G.add(s);
  };
  layer(20000, 600, 2.8, ["#FFFFFF", "#FFF4E0", "#DCE8FF"]);          // far: many small
  layer(4000, 450, 4.8, ["#FFFFFF", "#FFE9C8", "#CFE0FF"]);           // middle
  layer(600, 350, 11, ["#FFFFFF", "#FFE3B0", "#BFD6FF", "#FFD0D0"]); // close: big bright ones (they glow)
  G.add(milkyWay());
  G.traverse((o) => noInk(o));
  return G;
}
// the Milky Way: a glowing band of stars, gas and dark dust lanes across the whole sky, plus a few coloured nebula clouds
function milkyWay() {
  // a detailed Milky Way: bright cream core, blue-white star clouds, many brown dust lanes, small pink glowing spots
  const W = 4096, H = 2048, c = mkCanvas(W, H), g = c.getContext("2d")!, img = g.createImageData(W, H), D = img.data;
  const n = noise2(101), n2 = noise2(202), n3 = noise2(303), n4 = noise2(404);
  const tilt = 1.05, ct = Math.cos(tilt), st = Math.sin(tilt);
  for (let y = 0; y < H; y++) {
    const lat = (0.5 - y / H) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * Math.PI * 2, cx = cl * Math.cos(lon);
      const u = x / W, v = y / H;
      const by = sl * ct - cx * st + 0.05 * (n2(u * 3, v * 3, 4) - 0.5);
      const band = Math.exp(-((by / 0.17) ** 2)), core = Math.exp(-((by / 0.05) ** 2));
      const bulge = Math.exp(-(((lon - 1.2 + Math.PI) % (Math.PI * 2) - Math.PI) ** 2) / 0.35) * Math.exp(-((by / 0.13) ** 2));   // the bright centre of the galaxy
      const along = 0.55 + 0.45 * Math.max(0, Math.cos(lon - 1.2)) ** 2;
      const cloud = n(u * 8, v * 8, 7), fine = n4(u * 24, v * 24, 5);
      let k = band * (0.15 + 1.1 * cloud * cloud * (0.6 + 0.8 * fine)) * along + core * 0.35 * along + bulge * 0.9;
      const dust = n3(u * 10, v * 10, 7), lane = Math.exp(-(((by + 0.01 + 0.03 * (n2(u * 6, v * 6, 4) - 0.5)) / 0.025) ** 2));
      const darken = Math.min(1, Math.max(0, (dust - 0.48) * 3) * band + lane * 0.75 * (0.5 + dust));
      k *= 1 - 0.85 * darken;
      k = Math.max(0, k);
      // colours: warm cream in the centre and the core line, cool blue-white in the clouds; dust is warm brown
      const warm = Math.min(1, bulge * 1.5 + core * 0.6);
      let r = 205 + 35 * warm, gg = 212 + 20 * warm, b = 240 - 30 * warm;
      const kk = k * 0.7;
      let R = r * kk, G = gg * kk, B = b * kk;
      R += 26 * darken * band; G += 16 * darken * band; B += 8 * darken * band;          // the dust glows faintly brown
      const pink = Math.max(0, n2(u * 30 + 3, v * 30, 3) - 0.68) * 5 * band;            // small pink glowing gas spots in the band
      const o = (y * W + x) * 4; D[o] = Math.min(255, R); D[o + 1] = Math.min(255, G); D[o + 2] = Math.min(255, B); D[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = canvasTex(c); t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.SphereGeometry(700, 128, 64), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  // tens of thousands of tiny sharp stars crowded along the band (in the band's own frame, so they follow it)
  const N = 60000, P = new Float32Array(N * 3), C = new Float32Array(N * 3), col = new THREE.Color(), q = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < N; i++) {
    const lon = rnd() * Math.PI * 2, gs = (rnd() + rnd() + rnd() + rnd() - 2) * (i % 3 === 0 ? 0.08 : 0.16);
    q.set(Math.cos(lon), gs, Math.sin(lon)).normalize().applyAxisAngle(Z, -tilt).multiplyScalar(690);
    P.set([q.x, q.y, q.z], i * 3); col.set(["#FFFFFF", "#FFF0D8", "#D8E4FF", "#FFFFFF"][i % 4]).multiplyScalar(0.5 + 0.7 * rnd()); C.set([col.r, col.g, col.b], i * 3);
  }
  const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.BufferAttribute(P, 3)); bg.setAttribute("color", new THREE.BufferAttribute(C, 3));
  const bs = new THREE.Points(bg, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true, map: starDot(), transparent: true, depthWrite: false, toneMapped: false }));
  bs.frustumCulled = false; bs.renderOrder = -98; noInk(bs); m.add(bs);
  m.name = "milky way"; m.rotation.y = 0.9 + Math.PI * 0.85; m.renderOrder = -100; m.frustumCulled = false; noInk(m);
  return m;
}
// far galaxies: small spirals and soft oval ones, scattered over the sky
function galaxyTex(seed: number, arms: number, tint: [number, number, number]) {
  const S = 512, c = mkCanvas(S, S), g = c.getContext("2d")!; let q = seed; const r = () => ((q = (q * 16807) % 2147483647) / 2147483647);
  g.globalCompositeOperation = "lighter";
  const halo = g.createRadialGradient(256, 256, 0, 256, 256, 250); halo.addColorStop(0, `rgba(${tint[0]},${tint[1]},${tint[2]},0.35)`); halo.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = halo; g.fillRect(0, 0, S, S);
  if (arms > 0) for (let i = 0; i < 9000; i++) {                // stars along logarithmic spiral arms
    const arm = i % arms, t = Math.pow(r(), 0.7) * 3.6, a = t * 1.9 + (arm / arms) * Math.PI * 2 + (r() - 0.5) * 0.5, rr = 14 + t * 62 + (r() - 0.5) * 18;
    const x = 256 + Math.cos(a) * rr, y = 256 + Math.sin(a) * rr, s = 0.6 + r() * 1.6, bl = r() < 0.2;
    g.fillStyle = bl ? `rgba(255,150,200,${0.25 + 0.3 * r()})` : `rgba(${200 + 55 * r()},${215 + 40 * r()},255,${0.18 + 0.4 * r()})`;
    g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
  }
  const core = g.createRadialGradient(256, 256, 0, 256, 256, arms > 0 ? 60 : 200);
  core.addColorStop(0, "rgba(255,248,230,1)"); core.addColorStop(0.3, "rgba(255,230,190,0.6)"); core.addColorStop(1, "rgba(255,220,180,0)");
  g.fillStyle = core; g.fillRect(0, 0, S, S);
  return canvasTex(c);
}
export function galaxies() {
  const G = named(new THREE.Group(), "galaxies"); G.userData.camFree = true; G.userData.noShadow = true;
  const list: [number, number, number, number, [number, number, number]][] = [   // az, el, size, arms, tint
    [205, 38, 70, 2, [170, 190, 255]], [150, 12, 34, 3, [200, 200, 255]], [-60, 48, 46, 2, [255, 210, 190]], [80, 40, 30, 0, [255, 220, 200]],
    [-150, 20, 40, 4, [190, 210, 255]], [10, 62, 26, 2, [210, 200, 255]], [240, 8, 22, 0, [255, 230, 210]], [-100, 55, 32, 3, [180, 200, 255]],
  ];
  list.forEach(([az, el, size, arms, tint], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: galaxyTex(1000 + i * 77, arms, tint), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
    m.scale.setScalar(2.2); m.position.set(...dirOf(az, el, 640)); m.lookAt(0, 0, 0); m.rotateX(0.4 + rnd() * 0.8); m.rotateZ(rnd() * 3); m.renderOrder = -99; m.frustumCulled = false;
    G.add(m);
  });
  G.traverse((o) => noInk(o));
  return G;
}
let _dot: THREE.Texture | null = null;
function starDot() {
  if (_dot) return _dot;
  const c = mkCanvas(64, 64), g = c.getContext("2d")!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.95)"); gr.addColorStop(0.5, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _dot = canvasTex(c); return _dot;
}
function noise2(seed: number) {        // smooth value noise that wraps round in x (for a sphere map)
  const P = 256, v = new Float32Array(P * P); let q = seed; for (let i = 0; i < v.length; i++) { q = (q * 16807) % 2147483647; v[i] = q / 2147483647; }
  const at = (x: number, y: number) => v[((y % P + P) % P) * P + ((x % P + P) % P)];
  const sm = (t: number) => t * t * (3 - 2 * t);
  const one = (x: number, y: number, per: number) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi), w = (a: number) => ((a % per) + per) % per;
    const a = at(w(xi), yi), b = at(w(xi + 1), yi), c = at(w(xi), yi + 1), d = at(w(xi + 1), yi + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  return (u: number, v2: number, oct = 6) => { let s = 0, amp = 0.5, f = 4; for (let o = 0; o < oct; o++) { s += amp * one(u * f, v2 * f, f); amp *= 0.5; f *= 2; } return s; };
}
export function earth(pos: [number, number, number], R = 7) {
  const W = 2048, H = 1024, c = mkCanvas(W, H), g = c.getContext("2d")!, img = g.createImageData(W, H), D = img.data;
  const land = noise2(11), detail = noise2(29), cl = noise2(57), cl2 = noise2(83);
  const mix = (a: number[], b: number[], t: number) => a.map((x, i) => x + (b[i] - x) * Math.max(0, Math.min(1, t)));
  for (let y = 0; y < H; y++) {
    const lat = Math.abs(y / H - 0.5) * 2;
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, e = land(u, v) + 0.12 * detail(u * 2, v * 2, 4) - 0.02;
      let col: number[];
      if (e < 0.5) {                                    // ocean: deep blue far out, turquoise near the coast
        col = mix([16, 60, 160], [34, 150, 205], (e - 0.38) / 0.12);
      } else {
        const dry = detail(u + 0.3, v + 0.7, 5), hi = (e - 0.5) / 0.2;
        col = mix([46, 140, 62], [28, 98, 44], dry * 1.3);                       // forests
        if (lat < 0.45 && dry > 0.55) col = mix(col, [214, 178, 104], (dry - 0.55) * 6);   // deserts near the middle
        col = mix(col, [120, 100, 80], hi - 0.6);                                // mountains
      }
      if (lat > 0.82) col = mix(col, [244, 248, 255], (lat - 0.82) * 9);          // ice caps
      const k = cl(u * 1.5 + 0.2 * cl2(u, v, 3), v * 1.2, 5);                     // swirling clouds
      col = mix(col, [255, 255, 255], (k - 0.52) * 4.5);
      const o = (y * W + x) * 4; D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const grp = named(new THREE.Group(), "earth");
  const tx = canvasTex(c); tx.anisotropy = 8;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.55, metalness: 0.05, emissive: "#1A3C8A", emissiveIntensity: 0.25, emissiveMap: tx }));
  ball.rotation.set(0.35, 2.2, 0.15); grp.add(ball);
  // glowing blue rim (atmosphere): a slightly bigger sphere, bright at the edge only
  const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.04, 64, 40), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    vertexShader: "varying vec3 n; varying vec3 vd; void main(){ vec4 p = modelViewMatrix * vec4(position,1.0); n = normalize(normalMatrix*normal); vd = normalize(-p.xyz); gl_Position = projectionMatrix * p; }",
    fragmentShader: "varying vec3 n; varying vec3 vd; void main(){ float f = pow(1.0 - max(dot(n, vd), 0.0), 2.6); gl_FragColor = vec4(vec3(0.35,0.65,1.0)*f*1.8, f); }",
  }));
  grp.add(rim);
  const gc = mkCanvas(256, 256), gg = gc.getContext("2d")!, gr = gg.createRadialGradient(128, 128, 88, 128, 128, 128);
  gr.addColorStop(0, "rgba(60,120,230,0.9)"); gr.addColorStop(0.35, "rgba(25,55,130,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, 256, 256);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(gc), transparent: true, depthWrite: false }));
  halo.scale.setScalar(R * 2.7); halo.renderOrder = 4; grp.add(halo); rim.renderOrder = 6;
  grp.position.set(...pos); grp.userData.camFree = true; grp.userData.noShadow = true;
  grp.traverse((o) => noInk(o));
  return grp;
}

// ---------------- the sun and the far planets (each sits in its own direction; it shows when the camera turns to it) ----------------
const dirOf = (az: number, el: number, d: number): [number, number, number] => { const a = az * Math.PI / 180, e = el * Math.PI / 180; return [Math.sin(a) * Math.cos(e) * d, Math.sin(e) * d, Math.cos(a) * Math.cos(e) * d]; };
export function sun(az: number, el: number) {
  const G = named(new THREE.Group(), "sun"); G.userData.camFree = true; G.userData.noShadow = true;
  const disc = (inner: string, size: number, stops: [number, string][]) => {
    const c = mkCanvas(256, 256), g = c.getContext("2d")!, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    for (const [k, col] of stops) gr.addColorStop(k, col); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); void inner;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(c), transparent: true, depthWrite: false, toneMapped: false }));
    sp.scale.setScalar(size); sp.renderOrder = 5 + G.children.length; G.add(sp);
  };
  disc("", 200, [[0, "rgba(255,246,230,0.85)"], [0.25, "rgba(70,62,52,0.55)"], [0.6, "rgba(20,18,16,0.3)"], [1, "rgba(0,0,0,0)"]]);     // wide soft glow
  disc("", 70, [[0, "rgba(255,255,255,1)"], [0.6, "rgba(255,252,240,1)"], [0.72, "rgba(255,240,215,0.92)"], [1, "rgba(255,225,190,0)"]]);   // the bright disc
  G.position.set(...dirOf(az, el, 520)); G.traverse((o) => noInk(o));
  return G;
}
function planetTex(kind: "mars" | "jupiter" | "saturn") {
  const W = 1024, H = 512, c = mkCanvas(W, H), g = c.getContext("2d")!, img = g.createImageData(W, H), D = img.data;
  const n = noise2(kind === "mars" ? 5 : kind === "jupiter" ? 7 : 9), n2 = noise2(13);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H, lat = Math.abs(v - 0.5) * 2; let col: number[];
    if (kind === "mars") {
      const e = n(u, v), k = n2(u * 2, v * 2, 4);
      col = [196 + 40 * (e - 0.5), 92 + 40 * (e - 0.5), 52 + 20 * (e - 0.5)];
      if (k > 0.56) col = col.map((q, i) => q * (1 - (k - 0.56) * 2.2) + [96, 48, 34][i] * (k - 0.56) * 2.2);
      if (lat > 0.86) col = [248, 244, 240];
    } else {
      const w = Math.sin(v * (kind === "jupiter" ? 34 : 26) + 3 * n(u * 0.5, v * 3, 4)) * 0.5 + 0.5;
      col = kind === "jupiter" ? [214 - 70 * w, 178 - 70 * w, 140 - 60 * w] : [236 - 40 * w, 214 - 46 * w, 160 - 40 * w];
      if (kind === "jupiter") { const dx = (u - 0.62) / 0.06, dy = (v - 0.64) / 0.035, d = dx * dx + dy * dy; if (d < 1) col = col.map((q, i) => q + ([196, 92, 60][i] - q) * (1 - d)); }
    }
    const o = (y * W + x) * 4; D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
  }
  g.putImageData(img, 0, 0); return canvasTex(c);
}
export function planets() {
  const G = named(new THREE.Group(), "planets"); G.userData.camFree = true; G.userData.noShadow = true;
  const ball = (kind: "mars" | "jupiter" | "saturn", R: number, az: number, el: number, d: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), new THREE.MeshStandardMaterial({ map: planetTex(kind), roughness: 0.8, emissive: "#ffffff", emissiveMap: planetTex(kind), emissiveIntensity: 0.18 }));
    m.name = kind; m.position.set(...dirOf(az, el, d)); m.rotation.z = 0.35; G.add(m); return m;
  };
  ball("mars", 3.6, 72, 16, 160);
  ball("jupiter", 7, -28, 34, 260);
  const sat = ball("saturn", 7.5, -112, 22, 240);
  const rc = mkCanvas(512, 8), rg = rc.getContext("2d")!;
  for (let x = 0; x < 512; x++) { const k = x / 512, a = k < 0.08 || (k > 0.55 && k < 0.6) ? 0.05 : 0.55 + 0.35 * Math.sin(k * 60) * Math.sin(k * 13); rg.fillStyle = `rgba(${226 - 40 * k},${206 - 50 * k},${160 - 50 * k},${a})`; rg.fillRect(x, 0, 1, 8); }
  const ringGeo = new THREE.RingGeometry(7.5 * 1.3, 7.5 * 2.3, 128, 1), pos = ringGeo.attributes.position, uv = ringGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (r - 9.75) / 7.5, 0.5); }
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ map: canvasTex(rc), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9, emissive: "#ffffff", emissiveMap: canvasTex(rc), emissiveIntensity: 0.2 }));
  ring.rotation.x = -Math.PI / 2 + 0.45; sat.add(ring);
  G.traverse((o) => noInk(o));
  return G;
}

// ---------------- the rocket (our own design: tall white body, red nose and bands, three swept red fins) ----------------
export function rocket(logo: HTMLImageElement) {
  const R = named(new THREE.Group(), "rocket");
  const WHITE = MR("#F1F1F5", 0.45, 0.05), RED = MR("#D8352A", 0.5), GREY = MR("#5C6170", 0.4, 0.7), DARK = MR("#2E3140", 0.5, 0.5);
  const r = 0.9;
  // body + ogive nose (lathe)
  const prof: THREE.Vector2[] = [];
  prof.push(new THREE.Vector2(0.001, 0.75), new THREE.Vector2(r * 0.98, 0.75), new THREE.Vector2(r, 0.9));
  for (let i = 0; i <= 24; i++) { const u = i / 24, y = 0.9 + u * 5.6; prof.push(new THREE.Vector2(r, y)); }
  for (let i = 1; i <= 24; i++) { const u = i / 24, y = 6.5 + u * 2.4; prof.push(new THREE.Vector2(Math.max(0.001, r * Math.sqrt(1 - u * u * 0.98) * (1 - u * 0.05)), y)); }
  R.add(mesh(new THREE.LatheGeometry(prof, 64), WHITE, [0, 0, 0], "rocket body"));
  // red nose tip
  const tip: THREE.Vector2[] = []; for (let i = 0; i <= 16; i++) { const u = i / 16, y = 8.1 + u * 0.82; const base = 8.1 - 6.5; const uu = (y - 6.5) / 2.4; tip.push(new THREE.Vector2(Math.max(0.001, r * Math.sqrt(Math.max(0, 1 - uu * uu * 0.98)) * (1 - uu * 0.05) + 0.012), y)); void base; }
  tip.push(new THREE.Vector2(0.001, 8.93));
  R.add(mesh(new THREE.LatheGeometry(tip, 64), RED, [0, 0, 0], "rocket nose"));
  // red bands
  for (const [y, h] of [[6.1, 0.32], [2.2, 0.26]] as [number, number][]) R.add(mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.012, h, 64, 1, true), RED, [0, y, 0], "rocket band"));
  // engine bell
  const bell: THREE.Vector2[] = []; for (let i = 0; i <= 12; i++) { const u = i / 12; bell.push(new THREE.Vector2(0.62 - 0.3 * Math.sqrt(u), 0.2 + u * 0.55)); }
  const b = mesh(new THREE.LatheGeometry(bell, 48), GREY, [0, 0, 0], "rocket engine"); (b.material as THREE.Material).side = THREE.DoubleSide; R.add(b);
  // three swept fins (also its legs)
  const fs = new THREE.Shape(); fs.moveTo(0, 2.9); fs.lineTo(0, 0.9); fs.quadraticCurveTo(0.9, 0.55, 1.45, 0.0); fs.lineTo(1.7, 0.0); fs.quadraticCurveTo(1.35, 1.4, 0, 2.9);
  const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }); fg.translate(0, 0, -0.045);
  for (let k = 0; k < 3; k++) { const f = mesh(fg, RED, [0, 0, 0], "rocket fin"); f.position.set(0, 0, 0); const a = (k / 3) * Math.PI * 2 + Math.PI / 2; f.rotation.y = a; f.position.set(Math.cos(a) * 0 , 0, 0); f.translateX(r * 0.92); R.add(f); }
  // round windows (dark glass with a metal rim) in a column on the front
  for (const y of [7.15, 5.4, 4.7]) {
    const w = new THREE.Group(); w.name = "rocket window";
    w.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 32), glow("#3FA9F5", 0.35), [0, 0, 0]));
    w.add(mesh(new THREE.TorusGeometry(0.21, 0.04, 12, 32), MR("#B9BECB", 0.35, 0.8), [0, 0.03, 0])); (w.children[1] as THREE.Mesh).rotation.x = Math.PI / 2;
    const rr = y > 7 ? r * Math.sqrt(1 - ((y - 6.5) / 2.4) ** 2 * 0.98) * (1 - ((y - 6.5) / 2.4) * 0.05) : r;
    w.rotation.x = Math.PI / 2; w.position.set(0, y, rr + 0.005); R.add(w);
  }
  // hatch door + ladder (Max goes in here for his phone)
  const ds = new THREE.Shape(); const dw = 0.36, dh = 0.62, rad = 0.12;
  ds.moveTo(-dw + rad, -dh); ds.lineTo(dw - rad, -dh); ds.quadraticCurveTo(dw, -dh, dw, -dh + rad); ds.lineTo(dw, dh - rad); ds.quadraticCurveTo(dw, dh, dw - rad, dh);
  ds.lineTo(-dw + rad, dh); ds.quadraticCurveTo(-dw, dh, -dw, dh - rad); ds.lineTo(-dw, -dh + rad); ds.quadraticCurveTo(-dw, -dh, -dw + rad, -dh);
  const door = mesh(new THREE.ExtrudeGeometry(ds, { depth: 0.04, bevelEnabled: false }), MR("#C9CDD8", 0.4, 0.5), [0, 1.65, r - 0.01], "rocket door");
  R.add(door);
  R.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), DARK, [0.25, 1.65, r + 0.05], "door handle"));
  const lad = new THREE.Group(); lad.name = "rocket ladder";
  for (const x of [-0.22, 0.22]) { const s = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.25, 8), GREY, [x, 0.55, 0]); lad.add(s); }
  for (let i = 0; i < 5; i++) { const s = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 8), GREY, [0, 0.08 + i * 0.22, 0]); s.rotation.z = Math.PI / 2; lad.add(s); }
  lad.position.set(0, 0, r + 0.32); lad.rotation.x = -0.27; R.add(lad);
  // the MAX FILMS logo (his picture as it is) on the body, below the top band
  const lt = new THREE.Texture(logo); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8; lt.needsUpdate = true;
  const lh = 0.62, lw = lh * (logo.width / logo.height), th = lw / (r + 0.015);
  const lg = new THREE.CylinderGeometry(r + 0.016, r + 0.016, lh, 64, 1, true, -th / 2, th);
  const lm = new THREE.MeshStandardMaterial({ map: lt, transparent: true, alphaTest: 0.35, roughness: 0.5, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const L = new THREE.Mesh(lg, lm); L.name = "rocket logo"; L.position.y = 3.4; L.rotation.y = 0; noInk(L); R.add(L);
  // small bright lights, like a plane's: red on one fin tip, green on another, white on the third, white at the top band and the nose
  const lamp = (col: string, p: [number, number, number], size = 0.07) => {
    const b = mesh(new THREE.SphereGeometry(size, 16, 12), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 9, toneMapped: false }), p, "rocket light");
    const hs = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    hs.scale.setScalar(size * 18); b.add(hs); noInk(b); noInk(hs); b.castShadow = false; R.add(b); return b;
  };
  const ICE = "#E2F4FF";   // glacier white (his choice, 2026-11-16)
  const fins = [0, 1, 2].map((k) => (k / 3) * Math.PI * 2 + Math.PI / 2);
  const finTip = (a: number): [number, number, number] => { const d = r * 0.92 + 1.62; return [Math.sin(a) * d, 0.1, Math.cos(a) * d]; };
  // the fins were rotated by a about y and moved out along their own x: their tip sits at (cos a, -sin a) * d in x / z
  const tip3 = (a: number): [number, number, number] => { const d = r * 0.92 + 1.6; return [Math.cos(a) * d, 0.12, -Math.sin(a) * d]; };
  void finTip;
  lamp(ICE, tip3(fins[0])); lamp(ICE, tip3(fins[1])); lamp(ICE, tip3(fins[2]));
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; lamp(ICE, [Math.sin(a) * (r + 0.03), 6.1, Math.cos(a) * (r + 0.03)], 0.045); }
  lamp(ICE, [0, 8.97, 0], 0.06);
  for (const y of [2.9, 3.9, 4.95]) for (const a of [1.25, -1.25]) lamp(ICE, [Math.sin(a) * (r + 0.03), y, Math.cos(a) * (r + 0.03)], 0.04);   // a row each side, like a plane's
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; lamp(ICE, [Math.sin(a) * (r + 0.03), 1.05, Math.cos(a) * (r + 0.03)], 0.04); }
  return R;
}
let _halo: THREE.Texture | null = null;
function haloTex() {
  if (_halo) return _halo;
  const c = mkCanvas(128, 128), g = c.getContext("2d")!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.15, "rgba(255,255,255,0.8)"); gr.addColorStop(0.4, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); _halo = canvasTex(c); return _halo;
}

// ---------------- the light-speed gun (our own design: chunky white body, orange panels, glowing blue rings, small screen on top) ----------------
// local: barrel along +x, up +y; the origin is the grip (put it on the hand).
export type Gun = { group: THREE.Group; screen: (label: string, sub: string, icon: (g: CanvasRenderingContext2D) => void) => void; menu: (scroll: number, pick?: number) => void; press: (down: number, enter: number) => void };
export function gun(): Gun {
  const G = named(new THREE.Group(), "gun");
  const WHITE = new THREE.MeshStandardMaterial({ map: panelTex("#ECEEF4", 1), roughness: 0.45, metalness: 0.05 });
  const ORANGE = new THREE.MeshStandardMaterial({ map: panelTex("#FF8A1E", 2), roughness: 0.5 });
  const DARK = new THREE.MeshStandardMaterial({ map: gripTex(), roughness: 0.7, metalness: 0.2 });
  const METAL = new THREE.MeshStandardMaterial({ map: brushTex(), roughness: 0.3, metalness: 0.85 });
  const body = mesh(new RoundedBoxGeometry(0.32, 0.12, 0.095, 4, 0.03), WHITE, [0.07, 0.115, 0], "gun body"); G.add(body);
  for (const z of [-1, 1]) G.add(mesh(new RoundedBoxGeometry(0.2, 0.05, 0.01, 2, 0.004), ORANGE, [0.06, 0.1, z * 0.049], "gun panel"));
  // energy window on each side
  for (const z of [-1, 1]) { const w = mesh(new THREE.CapsuleGeometry(0.018, 0.08, 6, 16), glow("#33E1FF", 2.4), [0.08, 0.14, z * 0.05], "gun core"); w.rotation.z = Math.PI / 2; G.add(w); }
  // barrel, glow rings, wide muzzle
  const bar = mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.2, 32), METAL, [0.32, 0.12, 0], "gun barrel"); bar.rotation.z = Math.PI / 2; G.add(bar);
  for (let i = 0; i < 3; i++) { const t = mesh(new THREE.TorusGeometry(0.043, 0.01, 12, 32), glow("#33E1FF", 2.6), [0.27 + i * 0.05, 0.12, 0], "gun ring"); t.rotation.y = Math.PI / 2; G.add(t); }
  const muz = mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.05, 32), WHITE, [0.44, 0.12, 0], "gun muzzle"); muz.rotation.z = Math.PI / 2; G.add(muz);
  const hole = mesh(new THREE.CircleGeometry(0.04, 32), glow("#1BB8FF", 1.6), [0.466, 0.12, 0], "gun mouth"); hole.rotation.y = Math.PI / 2; G.add(hole);
  // grip, trigger, guard
  const grip = mesh(new RoundedBoxGeometry(0.05, 0.13, 0.07, 3, 0.018), DARK, [-0.02, 0.0, 0], "gun grip"); grip.rotation.z = 0.22; G.add(grip);
  G.add(mesh(new THREE.BoxGeometry(0.012, 0.035, 0.02), ORANGE, [0.045, 0.035, 0], "gun trigger"));
  const guard = mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 24, Math.PI), DARK, [0.05, 0.05, 0], "gun guard"); guard.rotation.z = Math.PI; G.add(guard);
  // back stock block
  G.add(mesh(new RoundedBoxGeometry(0.07, 0.09, 0.085, 3, 0.02), ORANGE, [-0.11, 0.11, 0], "gun back"));
  // loading slot (top front, dark mouth with an orange lip)
  G.add(mesh(new RoundedBoxGeometry(0.075, 0.02, 0.05, 2, 0.006), ORANGE, [0.17, 0.18, 0], "gun slot lip"));
  G.add(mesh(new THREE.BoxGeometry(0.055, 0.004, 0.032), MR("#0B0C12", 0.9), [0.17, 0.191, 0], "gun slot"));
  // two thumb buttons on top of the back block: DOWN (blue, with an arrow) and ENTER (orange). press() sinks them.
  const btnDown = new THREE.Group(), btnEnter = new THREE.Group();
  btnDown.add(mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.012, 24), glow("#2FC8FF", 1.4), [0, 0, 0], "gun down button"));
  { const ar = mesh(new THREE.ConeGeometry(0.008, 0.012, 3), MR("#0B1C34", 0.5), [0, 0.0075, 0], "gun down arrow"); ar.rotation.set(-Math.PI / 2, 0, 0); ar.scale.set(1, 1, 0.25); ar.rotation.z = Math.PI / 2; btnDown.add(ar); }
  btnEnter.add(mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.012, 24), glow("#FF9A2E", 1.2), [0, 0, 0], "gun enter button"));
  for (const b of [btnDown, btnEnter]) b.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 24), DARK, [0, -0.005, 0], "gun button ring"));
  btnDown.position.set(-0.056, 0.178, -0.022); btnEnter.position.set(-0.056, 0.178, 0.022); G.add(btnDown, btnEnter);
  const press: Gun["press"] = (down, enter) => { btnDown.children[0].position.y = -0.005 * down; btnDown.children[1].position.y = 0.0075 - 0.005 * down; btnEnter.children[0].position.y = -0.005 * enter; };
  // the small screen on top, tilted toward the shooter
  const SW = 512, SH = 300, sc = mkCanvas(SW * 2, SH * 2), sg = sc.getContext("2d")!, stex = canvasTex(sc);
  const housing = mesh(new RoundedBoxGeometry(0.076, 0.012, 0.11, 2, 0.005), DARK, [0, 0, 0], "gun screen box");
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.098, 0.064), new THREE.MeshBasicMaterial({ map: stex, toneMapped: false }));
  face.name = "gun screen"; face.rotation.x = -Math.PI / 2; face.rotation.z = -Math.PI / 2; face.position.y = 0.0065; noInk(face);
  const scr = named(new THREE.Group(), "gun screen mount"); scr.add(housing, face);
  scr.position.set(0.02, 0.19, 0); scr.rotation.z = 0.5; G.add(scr);
  const screen: Gun["screen"] = (label, sub, icon) => {
    sg.setTransform(2, 0, 0, 2, 0, 0);
    sg.fillStyle = "#0B1C34"; sg.fillRect(0, 0, SW, SH);
    sg.strokeStyle = "#33E1FF"; sg.lineWidth = 8; sg.strokeRect(10, 10, SW - 20, SH - 20);
    sg.save(); sg.translate(130, 150); icon(sg); sg.restore();
    sg.fillStyle = "#E8FBFF"; sg.font = "900 56px Arial Black, Arial, sans-serif"; sg.textAlign = "left"; sg.textBaseline = "middle";
    sg.fillText(label, 240, 115); sg.fillStyle = "#FFB54A"; sg.font = "900 50px Arial Black, Arial, sans-serif"; sg.fillText(sub, 240, 190);
    stex.needsUpdate = true;
  };
  const menu: Gun["menu"] = (scroll, pick = 0) => { sg.setTransform(2, 0, 0, 2, 0, 0); drawMenu(sg, scroll, pick); stex.needsUpdate = true; };
  return { group: G, screen, menu, press };
}
function panelTex(base: string, seed: number) {     // panel seams, small screws, light scuffs
  const S = 512, c = mkCanvas(S, S), g = c.getContext("2d")!; let q = 777 + seed * 101; const r = () => ((q = (q * 16807) % 2147483647) / 2147483647);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)"; g.fillRect(r() * S, r() * S, 1 + r() * 3, 1 + r() * 3); }
  g.strokeStyle = "rgba(40,36,48,0.55)"; g.lineWidth = 3;
  for (const x of [130, 300, 420]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
  for (const y of [170, 360]) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
  g.fillStyle = "rgba(60,60,70,0.7)"; for (const [x, y] of [[150, 190], [280, 190], [150, 340], [280, 340], [440, 60], [440, 300]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(90,80,70,0.18)"; g.lineWidth = 2; for (let i = 0; i < 25; i++) { const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); g.stroke(); }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function gripTex() {                                 // dark rubber with a hex pattern
  const S = 256, c = mkCanvas(S, S), g = c.getContext("2d")!; g.fillStyle = "#30333F"; g.fillRect(0, 0, S, S);
  g.strokeStyle = "rgba(10,10,16,0.7)"; g.lineWidth = 3;
  for (let y = 0; y < S + 20; y += 22) for (let x = 0; x < S + 26; x += 26) { const ox = (Math.round(y / 22) % 2) * 13; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.lineTo(x + ox + Math.cos(a) * 10, y + Math.sin(a) * 10); } g.closePath(); g.stroke(); }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
}
function brushTex() {                                // brushed metal
  const S = 256, c = mkCanvas(S, S), g = c.getContext("2d")!; g.fillStyle = "#A2A8B6"; g.fillRect(0, 0, S, S);
  let q = 99; const r = () => ((q = (q * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 600; i++) { g.strokeStyle = r() < 0.5 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"; g.lineWidth = 1; const y = r() * S; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y + (r() - 0.5) * 4); g.stroke(); }
  return canvasTex(c);
}
export const needleIcon = (g: CanvasRenderingContext2D) => {
  g.rotate(-0.6); g.fillStyle = "#D9E2EE"; g.beginPath(); g.moveTo(-90, 0); g.lineTo(80, -7); g.lineTo(80, 7); g.closePath(); g.fill();
  g.strokeStyle = "#D9E2EE"; g.lineWidth = 6; g.beginPath(); g.ellipse(68, 0, 9, 4, 0, 0, 7); g.stroke();
};

// ---------------- the phone (silver back with a very small MAX FILMS logo, dark screen) ----------------
export function phone(logo: HTMLImageElement) {
  const P = named(new THREE.Group(), "phone");
  P.add(mesh(new RoundedBoxGeometry(0.072, 0.148, 0.009, 3, 0.008), MR("#C7CCD6", 0.3, 0.75), [0, 0, 0], "phone body"));
  const sc = mkCanvas(128, 256), g = sc.getContext("2d")!, gr = g.createLinearGradient(0, 0, 128, 256);
  gr.addColorStop(0, "#1C2A4A"); gr.addColorStop(1, "#0A0E1C"); g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.14), new THREE.MeshStandardMaterial({ map: canvasTex(sc), roughness: 0.15, metalness: 0.1 }));
  scr.position.z = 0.0047; scr.name = "phone screen"; noInk(scr); P.add(scr);
  // camera bump on the back
  P.add(mesh(new RoundedBoxGeometry(0.026, 0.026, 0.004, 2, 0.004), MR("#2A2D36", 0.3, 0.6), [-0.018, 0.052, -0.0055], "phone camera"));
  const lt = new THREE.Texture(logo); lt.colorSpace = THREE.SRGBColorSpace; lt.needsUpdate = true;
  const lw = 0.03, lh = lw * logo.height / logo.width;
  const L = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshStandardMaterial({ map: lt, transparent: true, alphaTest: 0.35, roughness: 0.4 }));
  L.rotation.y = Math.PI; L.position.set(0, -0.01, -0.0047); L.name = "phone logo"; noInk(L); P.add(L);
  return P;
}

// ---------------- Max's hand on the gun: a simple ROUND glove (no fingers) that moves between the buttons (2026-11-16) ----------------
// Lives inside the gun group (gun units). set(at) puts the bottom of the round hand at a point in gun units.
export type Thumb = { group: THREE.Group; set: (at: [number, number, number]) => void };
export function thumb(): Thumb {
  const H = named(new THREE.Group(), "Max hand");
  const GLOVE = new THREE.MeshStandardMaterial({ map: gloveTex(), roughness: 0.85, metalness: 0 });
  const RX = 0.021, RY = 0.016;                                     // round, a little flat
  const ball = mesh(new THREE.SphereGeometry(1, 32, 20), GLOVE, [0, 0, 0], "Max hand ball"); ball.scale.set(RX, RY, RX); H.add(ball);
  // the wrist goes back toward Max (out of the picture), with a blue stripe cuff
  const wrist = mesh(new THREE.CylinderGeometry(0.0145, 0.019, 0.26, 24), GLOVE, [0, 0, 0], "Max wrist"); H.add(wrist);
  const cuff = mesh(new THREE.TorusGeometry(0.0155, 0.0035, 10, 28), MR("#3070D8", 0.6), [0, 0, 0], "Max cuff"); H.add(cuff);
  const back = new THREE.Vector3(-0.45, 0.12, -1).normalize(), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  const set: Thumb["set"] = (at) => {
    const c = new THREE.Vector3(at[0], at[1] + RY, at[2]); ball.position.copy(c);
    wrist.position.copy(c).addScaledVector(back, RX + 0.122); wrist.quaternion.setFromUnitVectors(Y, back);
    cuff.position.copy(c).addScaledVector(back, RX + 0.004); cuff.quaternion.setFromUnitVectors(Z, back);
  };
  set([-0.056, 0.2, -0.022]);
  return { group: H, set };
}
function gloveTex() {                                // white padded glove fabric: soft quilting lines, faint weave
  const S = 256, c = mkCanvas(S, S), g = c.getContext("2d")!; let q = 4242; const r = () => ((q = (q * 16807) % 2147483647) / 2147483647);
  g.fillStyle = "#F1F2F6"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2500; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,20,0.045)" : "rgba(255,255,255,0.1)"; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1); }
  g.strokeStyle = "rgba(120,124,140,0.35)"; g.lineWidth = 2; for (const y of [64, 128, 192]) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

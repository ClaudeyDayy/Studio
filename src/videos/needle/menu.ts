// The gun's pick menu (2026-11-16): Max scrolls past a graphics card and a game controller, then picks the whale.
// All three are OUR OWN designs: no brand names, no copied product shapes.
// Drawn in screen units 512 x 300 (the gun screen canvas is scaled to fit).

type G = CanvasRenderingContext2D;
let q = 31337; const rr = () => ((q = (q * 16807) % 2147483647) / 2147483647);
const rrect = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

// ---------- graphics card: long dark-silver shroud, two big fans, glowing strip, gold contact pins ----------
export function gpuIcon(g: G) {
  // card body
  const body = g.createLinearGradient(0, -48, 0, 48); body.addColorStop(0, "#BFC5CF"); body.addColorStop(0.45, "#7E858F"); body.addColorStop(1, "#3E434B");
  g.fillStyle = body; rrect(g, -120, -46, 240, 88, 10); g.fill();
  g.strokeStyle = "rgba(20,22,28,0.9)"; g.lineWidth = 2; g.stroke();
  // dark inset panel holding the fans
  g.fillStyle = "#23262D"; rrect(g, -112, -38, 224, 66, 7); g.fill();
  // brushed lines
  g.strokeStyle = "rgba(255,255,255,0.06)"; g.lineWidth = 1; for (let i = 0; i < 30; i++) { const y = -36 + i * 2.2; g.beginPath(); g.moveTo(-110, y); g.lineTo(110, y); g.stroke(); }
  // two fans
  for (const cx of [-55, 55]) {
    const R = 30;
    const ring = g.createRadialGradient(cx, -5, R * 0.7, cx, -5, R + 3); ring.addColorStop(0, "#15171C"); ring.addColorStop(1, "#5A606A");
    g.fillStyle = ring; g.beginPath(); g.arc(cx, -5, R + 3, 0, 7); g.fill();
    g.fillStyle = "#0E1014"; g.beginPath(); g.arc(cx, -5, R, 0, 7); g.fill();
    for (let k = 0; k < 9; k++) {   // curved blades
      const a = (k / 9) * Math.PI * 2;
      g.save(); g.translate(cx, -5); g.rotate(a);
      const bl = g.createLinearGradient(0, 0, R, 0); bl.addColorStop(0, "#3A3F48"); bl.addColorStop(1, "#1C1F25");
      g.fillStyle = bl; g.beginPath(); g.moveTo(6, -2); g.quadraticCurveTo(R * 0.55, -R * 0.42, R - 2, -R * 0.12); g.quadraticCurveTo(R * 0.6, 2, 6, 4); g.closePath(); g.fill();
      g.strokeStyle = "rgba(150,160,175,0.35)"; g.lineWidth = 0.8; g.stroke(); g.restore();
    }
    const hub = g.createRadialGradient(cx - 3, -8, 1, cx, -5, 9); hub.addColorStop(0, "#9AA2AE"); hub.addColorStop(1, "#2B2F36");
    g.fillStyle = hub; g.beginPath(); g.arc(cx, -5, 9, 0, 7); g.fill();
  }
  // glowing strip along the top edge
  g.save(); g.shadowColor = "#7FE9FF"; g.shadowBlur = 12; g.fillStyle = "#BFF6FF"; rrect(g, -96, -44, 192, 4, 2); g.fill(); g.restore();
  // gold contact pins under the card
  g.fillStyle = "#1E5A3A"; g.fillRect(-60, 42, 110, 8);
  for (let i = 0; i < 26; i++) { g.fillStyle = "#E6B84A"; g.fillRect(-58 + i * 4.1, 43, 2.6, 7); }
  // metal bracket on the left end
  g.fillStyle = "#AEB4BE"; g.fillRect(-128, -46, 8, 100);
  g.fillStyle = "#2A2D34"; for (let i = 0; i < 4; i++) g.fillRect(-126, -36 + i * 18, 4, 10);
  // shine
  const sh = g.createLinearGradient(-120, -46, 40, 40); sh.addColorStop(0, "rgba(255,255,255,0.28)"); sh.addColorStop(0.35, "rgba(255,255,255,0)");
  g.fillStyle = sh; rrect(g, -120, -46, 240, 88, 10); g.fill();
}

// ---------- game controller: white, our own rounded shape, two sticks, a cross pad, four plain buttons ----------
export function controllerIcon(g: G) {
  const outline = () => {
    g.beginPath();
    g.moveTo(-60, -40); g.lineTo(60, -40);
    g.bezierCurveTo(95, -40, 112, -18, 118, 10);   // right shoulder down to the right handle
    g.bezierCurveTo(126, 44, 110, 64, 92, 62);
    g.bezierCurveTo(74, 60, 64, 36, 44, 30);       // inner curve of the right handle
    g.lineTo(-44, 30);
    g.bezierCurveTo(-64, 36, -74, 60, -92, 62);
    g.bezierCurveTo(-110, 64, -126, 44, -118, 10);
    g.bezierCurveTo(-112, -18, -95, -40, -60, -40);
    g.closePath();
  };
  g.save(); g.shadowColor = "rgba(0,0,0,0.55)"; g.shadowBlur = 14; g.shadowOffsetY = 6;
  const body = g.createLinearGradient(0, -40, 0, 64); body.addColorStop(0, "#FFFFFF"); body.addColorStop(0.6, "#E4E8EF"); body.addColorStop(1, "#AEB5C2");
  g.fillStyle = body; outline(); g.fill(); g.restore();
  g.strokeStyle = "rgba(60,66,80,0.55)"; g.lineWidth = 1.6; outline(); g.stroke();
  // soft grey top band with a thin seam
  g.save(); outline(); g.clip();
  g.fillStyle = "rgba(150,158,172,0.25)"; g.fillRect(-130, -42, 260, 12);
  g.strokeStyle = "rgba(90,96,110,0.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-100, -18); g.quadraticCurveTo(0, -8, 100, -18); g.stroke();
  g.restore();
  // cross pad
  g.fillStyle = "#C9CED8"; g.beginPath(); g.arc(-70, -8, 19, 0, 7); g.fill();
  g.fillStyle = "#4A505C"; rrect(g, -76, -24, 12, 32, 3); g.fill(); rrect(g, -86, -14, 32, 12, 3); g.fill();
  // four plain round buttons in a diamond
  for (const [x, y] of [[70, -24], [86, -8], [70, 8], [54, -8]]) {
    const b = g.createRadialGradient(x - 2, y - 2, 1, x, y, 7); b.addColorStop(0, "#8A919E"); b.addColorStop(1, "#3C414B");
    g.fillStyle = b; g.beginPath(); g.arc(x, y, 6.5, 0, 7); g.fill();
  }
  // two thumb sticks
  for (const x of [-34, 34]) {
    g.fillStyle = "#2E323B"; g.beginPath(); g.arc(x, 14, 14, 0, 7); g.fill();
    const s = g.createRadialGradient(x - 3, 10, 2, x, 14, 11); s.addColorStop(0, "#5E6572"); s.addColorStop(1, "#1A1D23");
    g.fillStyle = s; g.beginPath(); g.arc(x, 14, 11, 0, 7); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.15)"; g.lineWidth = 1; g.beginPath(); g.arc(x, 14, 7, 0, 7); g.stroke();
  }
  // a small round light in the middle
  g.save(); g.shadowColor = "#7FE9FF"; g.shadowBlur = 8; g.fillStyle = "#9FF2FF"; g.beginPath(); g.arc(0, -12, 4, 0, 7); g.fill(); g.restore();
}

// ---------- the whale: a real-looking whale, its body bent in an arc, deep blue water behind ----------
export function whaleIcon(g: G, water = true) {
  if (water) {   // deep water with soft light rays
    const wg = g.createLinearGradient(0, -90, 0, 90); wg.addColorStop(0, "#1E6C9A"); wg.addColorStop(0.5, "#0E3E62"); wg.addColorStop(1, "#061A2E");
    g.fillStyle = wg; rrect(g, -140, -92, 280, 184, 12); g.fill();
    g.save(); rrect(g, -140, -92, 280, 184, 12); g.clip();
    for (let i = 0; i < 6; i++) { const x = -110 + i * 46 + rr() * 10; const ray = g.createLinearGradient(0, -92, 0, 60); ray.addColorStop(0, "rgba(190,235,255,0.20)"); ray.addColorStop(1, "rgba(190,235,255,0)");
      g.fillStyle = ray; g.beginPath(); g.moveTo(x, -92); g.lineTo(x + 16, -92); g.lineTo(x + 40, 60); g.lineTo(x + 10, 60); g.closePath(); g.fill(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(200,235,255,${0.05 + rr() * 0.18})`; g.beginPath(); g.arc(-135 + rr() * 270, -88 + rr() * 176, 0.6 + rr() * 1.4, 0, 7); g.fill(); }
    g.restore();
  }
  // spine: tail (left) -> head (right), arched up in the middle (the bend)
  const P0 = [-86, 22], C = [8, -62], P2 = [118, 12];
  const sp = (s: number) => { const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, c = s * s; return [a * P0[0] + b * C[0] + c * P2[0], a * P0[1] + b * C[1] + c * P2[1]]; };
  const tg = (s: number) => { const dx = 2 * (1 - s) * (C[0] - P0[0]) + 2 * s * (P2[0] - C[0]), dy = 2 * (1 - s) * (C[1] - P0[1]) + 2 * s * (P2[1] - C[1]); const l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  const th = (s: number) => 4 + 52 * Math.pow(Math.min(1, s / 0.6), 1.25) * (s > 0.8 ? Math.sqrt(Math.max(0.16, 1 - Math.pow((s - 0.8) / 0.22, 2))) : 1);   // body thickness (thin tail stock, full chest)
  const pt = (s: number, side: number, k = 1) => { const p = sp(s), t = tg(s), n = [t[1], -t[0]]; const h = th(s) * (side > 0 ? 0.44 : 0.56) * k; return [p[0] + n[0] * h * side, p[1] + n[1] * h * side]; };
  const N = 60;
  const bodyPath = () => {
    g.beginPath();
    for (let i = 0; i <= N; i++) { const [x, y] = pt(i / N, 1); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    const hp = sp(1), ht = tg(1), [ux, uy] = pt(1, 1), [lx, ly] = pt(1, -1);       // blunt rounded head
    g.bezierCurveTo(ux + ht[0] * 14, uy + ht[1] * 14, lx + ht[0] * 16, ly + ht[1] * 16, lx, ly); void hp;
    for (let i = N; i >= 0; i--) { const [x, y] = pt(i / N, -1); g.lineTo(x, y); }
    g.closePath();
  };
  // tail flukes (at the tail end, spread up and down, slightly turned)
  const tp = sp(0), tt = tg(0);
  g.save(); g.translate(tp[0], tp[1]); g.rotate(Math.atan2(tt[1], tt[0])); g.scale(1.05, 1.05);
  const fl = g.createLinearGradient(0, -34, 0, 34); fl.addColorStop(0, "#2C3A4C"); fl.addColorStop(1, "#16202C");
  g.fillStyle = fl;
  g.beginPath(); g.moveTo(4, 0); g.bezierCurveTo(-6, -10, -14, -26, -30, -36); g.bezierCurveTo(-22, -22, -24, -10, -16, -4);
  g.bezierCurveTo(-20, 0, -20, 0, -16, 4); g.bezierCurveTo(-24, 12, -22, 24, -30, 36); g.bezierCurveTo(-14, 26, -6, 10, 4, 0); g.fill();
  g.strokeStyle = "rgba(220,235,245,0.35)"; g.lineWidth = 1; g.stroke();
  g.restore();
  // far pectoral fin (behind the body, darker)
  const fp = pt(0.74, -1, 0.7);
  g.fillStyle = "#1A2533"; g.beginPath(); g.moveTo(fp[0] + 4, fp[1]); g.bezierCurveTo(fp[0] + 12, fp[1] + 20, fp[0] + 6, fp[1] + 44, fp[0] - 4, fp[1] + 52); g.bezierCurveTo(fp[0] - 4, fp[1] + 30, fp[0] - 8, fp[1] + 12, fp[0] - 6, fp[1]); g.fill();
  // body: dark blue-grey back, lighter flank
  g.save(); g.shadowColor = "rgba(0,0,0,0.5)"; g.shadowBlur = 16; g.shadowOffsetY = 8;
  const bg = g.createLinearGradient(0, -70, 0, 40); bg.addColorStop(0, "#3E5266"); bg.addColorStop(0.5, "#2A3A4D"); bg.addColorStop(1, "#1A2532");
  g.fillStyle = bg; bodyPath(); g.fill(); g.restore();
  g.save(); bodyPath(); g.clip();
  // pale belly, following the bend
  g.beginPath();
  for (let i = 8; i <= N; i++) { const [x, y] = pt(i / N, -1, 0.15); i > 8 ? g.lineTo(x, y) : g.moveTo(x, y); }
  for (let i = N; i >= 8; i--) { const [x, y] = pt(i / N, -1, 1.3); g.lineTo(x, y); }
  g.closePath(); g.filter = "blur(3px)"; g.fillStyle = "#C9D2DA"; g.fill(); g.filter = "none";
  // throat grooves (long lines under the head and chest)
  g.strokeStyle = "rgba(70,84,100,0.55)"; g.lineWidth = 0.9;
  for (let j = 0; j < 7; j++) { const k = 0.25 + j * 0.12; g.beginPath(); for (let i = 34; i <= N; i++) { const [x, y] = pt(i / N, -1, k); i > 34 ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  // skin: fine speckle, a few pale scars and barnacle patches
  for (let i = 0; i < 900; i++) { const x = -130 + rr() * 260, y = -70 + rr() * 110; g.fillStyle = rr() < 0.6 ? `rgba(10,16,24,${0.08 + rr() * 0.12})` : `rgba(220,230,240,${0.05 + rr() * 0.12})`; g.fillRect(x, y, 0.8 + rr() * 1.4, 0.8 + rr() * 1.4); }
  g.strokeStyle = "rgba(220,230,240,0.25)"; g.lineWidth = 0.8;
  for (let i = 0; i < 10; i++) { const s = 0.2 + rr() * 0.6, [x, y] = pt(s, 1, rr() * 0.6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 + rr() * 10, y + (rr() - 0.5) * 4); g.stroke(); }
  for (let i = 0; i < 6; i++) { const [x, y] = pt(0.86 + rr() * 0.12, rr() < 0.5 ? 1 : -1, 0.5 + rr() * 0.4); for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(225,228,220,0.55)"; g.beginPath(); g.arc(x + (rr() - 0.5) * 6, y + (rr() - 0.5) * 5, 0.7 + rr() * 0.9, 0, 7); g.fill(); } }
  // small bumps on the top of the head
  for (let i = 0; i < 9; i++) { const [x, y] = pt(0.86 + i * 0.015, 1, 0.75 + (i % 2) * 0.12); g.fillStyle = "#4A5E72"; g.beginPath(); g.arc(x, y, 1.4, 0, 7); g.fill(); }
  // light from above: soft rim along the back, shade under the belly
  g.lineWidth = 5; g.strokeStyle = "rgba(170,215,240,0.35)"; g.filter = "blur(2px)"; g.beginPath();
  for (let i = 4; i <= N; i++) { const [x, y] = pt(i / N, 1, 0.92); i > 4 ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.filter = "none";
  g.restore();
  g.strokeStyle = "rgba(8,14,22,0.7)"; g.lineWidth = 1.2; bodyPath(); g.stroke();
  // mouth line and eye
  g.strokeStyle = "rgba(15,20,28,0.8)"; g.lineWidth = 1.3; g.beginPath();
  for (let i = 44; i <= N; i++) { const [x, y] = pt(i / N, -1, 0.05 + (i - 44) * 0.004); i > 44 ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  const [ex, ey] = pt(0.83, -1, 0.1); g.fillStyle = "#0A0E14"; g.beginPath(); g.ellipse(ex, ey, 2.4, 1.8, 0, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(ex + 0.7, ey - 0.6, 0.6, 0, 7); g.fill();
  // near pectoral fin: long, pale edge, sweeping down and back
  const np = pt(0.72, -1, 0.55);
  g.save(); g.translate(np[0], np[1]); g.rotate(0.35);
  const pf = g.createLinearGradient(-10, 0, 10, 0); pf.addColorStop(0, "#22303F"); pf.addColorStop(1, "#5B6C7C");
  g.fillStyle = pf; g.beginPath(); g.moveTo(6, -2); g.bezierCurveTo(14, 18, 4, 46, -12, 60); g.bezierCurveTo(-10, 40, -10, 18, -8, -2); g.closePath(); g.fill();
  g.strokeStyle = "rgba(225,232,240,0.7)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(6, -2); g.bezierCurveTo(14, 18, 4, 46, -12, 60); g.stroke();
  g.restore();
}

// ---------- the mountain: a real-looking rocky peak with snow, blue sky behind ----------
// The ridges are made with midpoint displacement (rough like real rock), each face lit or shaded by its slope.
function ridge(x0: number, y0: number, x1: number, y1: number, rough: number, depth: number): number[][] {
  let pts = [[x0, y0], [x1, y1]];
  for (let d = 0; d < depth; d++) {
    const n: number[][] = [];
    for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; n.push([ax, ay], [(ax + bx) / 2 + (rr() - 0.5) * rough * 0.3, (ay + by) / 2 + (rr() - 0.5) * rough]); }
    n.push(pts[pts.length - 1]); pts = n; rough *= 0.55;
  }
  return pts;
}
export function mountainIcon(g: G) {
  const sky = g.createLinearGradient(0, -92, 0, 92); sky.addColorStop(0, "#2F6DB0"); sky.addColorStop(0.55, "#8DBDE6"); sky.addColorStop(1, "#E3EEF7");
  g.fillStyle = sky; rrect(g, -140, -92, 280, 184, 12); g.fill();
  g.save(); rrect(g, -140, -92, 280, 184, 12); g.clip();
  // thin clouds
  for (let i = 0; i < 5; i++) { const x = -130 + rr() * 260, y = -80 + rr() * 40; const cg = g.createRadialGradient(x, y, 0, x, y, 40); cg.addColorStop(0, "rgba(255,255,255,0.35)"); cg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = cg; g.beginPath(); g.ellipse(x, y, 60, 10, 0, 0, 7); g.fill(); }
  // far hazy range
  const far = [...ridge(-150, 10, -60, -18, 30, 6), ...ridge(-60, -18, 60, -6, 30, 6).slice(1), ...ridge(60, -6, 150, 14, 30, 6).slice(1)];
  g.fillStyle = "#A8BCD0"; g.beginPath(); far.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineTo(150, 92); g.lineTo(-150, 92); g.fill();
  // the main peak: two big faces with rough edges
  const top = [6, -80];
  const L = ridge(-150, 70, top[0], top[1], 40, 7), R = ridge(top[0], top[1], 150, 62, 40, 7), mid = ridge(top[0], top[1], 18, 92, 26, 6);
  const face = (a: number[][], b: number[][]) => { g.beginPath(); a.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); for (let i = b.length - 1; i >= 0; i--) g.lineTo(b[i][0], b[i][1]); g.closePath(); };
  const leftFace = () => face([[-150, 92], ...L], [[-150, 92], ...mid].reverse().reverse());
  // shaded west face
  g.fillStyle = "#3E4654"; g.beginPath(); g.moveTo(-150, 92); L.forEach(([x, y]) => g.lineTo(x, y)); for (let i = 0; i < mid.length; i++) g.lineTo(mid[i][0], mid[i][1]); g.closePath(); g.fill(); void leftFace;
  // sunlit east face
  const ef = g.createLinearGradient(0, -80, 90, 80); ef.addColorStop(0, "#9C9486"); ef.addColorStop(1, "#6A655C");
  g.fillStyle = ef; g.beginPath(); g.moveTo(top[0], top[1]); R.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(150, 92); for (let i = mid.length - 1; i >= 0; i--) g.lineTo(mid[i][0], mid[i][1]); g.closePath(); g.fill();
  // smaller ridges and gullies on both faces (lit edge + dark side)
  for (let k = 0; k < 9; k++) {
    const sx = top[0] + (rr() - 0.5) * 30, sy = top[1] + 14 + rr() * 30, ex = sx + (k % 2 ? 1 : -1) * (30 + rr() * 60), ey = sy + 50 + rr() * 60;
    const rp = ridge(sx, sy, ex, ey, 14, 5);
    g.strokeStyle = ex > sx ? "rgba(70,62,54,0.55)" : "rgba(20,24,32,0.5)"; g.lineWidth = 2.2; g.beginPath(); rp.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    g.strokeStyle = ex > sx ? "rgba(214,204,186,0.45)" : "rgba(110,120,136,0.35)"; g.lineWidth = 1; g.beginPath(); rp.forEach(([x, y], i) => (i ? g.lineTo(x + 1.2, y - 0.6) : g.moveTo(x + 1.2, y - 0.6))); g.stroke();
  }
  // rock grain
  for (let i = 0; i < 1400; i++) { const x = -140 + rr() * 280, y = -80 + rr() * 172; g.fillStyle = rr() < 0.55 ? `rgba(15,16,20,${0.06 + rr() * 0.1})` : `rgba(240,234,222,${0.04 + rr() * 0.08})`; g.fillRect(x, y, 0.8 + rr(), 0.8 + rr()); }
  // snow: everything above a jagged snow line, kept inside the mountain
  g.save(); g.beginPath(); g.moveTo(-150, 92); L.forEach(([x, y]) => g.lineTo(x, y)); R.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(150, 92); g.closePath(); g.clip();
  const snow = ridge(-80, -14, 90, -8, 34, 7);
  g.beginPath(); g.moveTo(-80, -100); snow.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(90, -100); g.closePath();
  const sg2 = g.createLinearGradient(-30, 0, 40, 0); sg2.addColorStop(0, "#C3D0DF"); sg2.addColorStop(0.45, "#DCE6F0"); sg2.addColorStop(0.55, "#F7FAFD"); sg2.addColorStop(1, "#FFFFFF");
  g.fillStyle = sg2; g.fill();
  // snow streaks running down the gullies below the line
  for (let k = 0; k < 14; k++) { const x = -60 + rr() * 140, y = -20 + rr() * 16; const len = 8 + rr() * 18, dx = (rr() - 0.5) * 6; g.fillStyle = `rgba(240,246,251,${0.35 + rr() * 0.3})`; g.beginPath(); g.moveTo(x - 1.6, y); g.quadraticCurveTo(x + dx * 0.5 - 0.6, y + len * 0.5, x + dx, y + len); g.quadraticCurveTo(x + dx * 0.5 + 0.6, y + len * 0.5, x + 1.6, y); g.fill(); }
  g.restore();
  // pine forest at the foot, then haze
  for (let i = 0; i < 110; i++) { const x = -145 + rr() * 290, y = 66 + rr() * 30, h = 7 + rr() * 9; g.fillStyle = rr() < 0.5 ? "#1B3428" : "#284634"; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.3, y); g.lineTo(x - h * 0.3, y); g.fill(); }
  const hz = g.createLinearGradient(0, 30, 0, 92); hz.addColorStop(0, "rgba(220,235,246,0)"); hz.addColorStop(1, "rgba(220,235,246,0.3)"); g.fillStyle = hz; g.fillRect(-140, 30, 280, 62);
  g.restore();
}

export const MENU = [
  { name: "GPU", sub: "2 kg", icon: gpuIcon },
  { name: "CONTROLLER", sub: "0.3 kg", icon: controllerIcon },
  { name: "WHALE", sub: "180 t", icon: (g: G) => whaleIcon(g) },
  { name: "MOUNTAIN", sub: "360 Gt", icon: mountainIcon },
];

// The whole screen: scroll = which item sits in the middle (0, 1, 2; can be between), pick = 0..1 (the ENTER flash).
// The list moves VERTICALLY: Max presses the DOWN button on the gun to skip, then ENTER to pick (no touch screen).
export function drawMenu(g: G, scroll: number, pick = 0) {
  q = 31337;   // same speckles every frame (no flicker)
  const SW = 512, SH = 300, CX = 236, CY = 150;
  g.fillStyle = "#0B1C34"; g.fillRect(0, 0, SW, SH);
  g.strokeStyle = "#33E1FF"; g.lineWidth = 8; g.strokeRect(10, 10, SW - 20, SH - 20);
  // the list window
  g.save(); g.beginPath(); g.rect(16, 16, 420, SH - 32); g.clip();
  for (let i = 0; i < MENU.length; i++) {
    const d = i - scroll, ad = Math.min(1.5, Math.abs(d));
    const y = CY + d * 190, s = 0.86 * (1 - 0.3 * Math.min(1, ad));
    if (y < -150 || y > SH + 150) continue;
    g.save(); g.translate(CX, y); g.scale(s, s); g.globalAlpha = 1 - 0.6 * Math.min(1, ad);
    if (i < 2) { g.fillStyle = "#12294A"; rrect(g, -140, -92, 280, 184, 12); g.fill(); }
    MENU[i].icon(g);
    g.restore();
  }
  // name tag over the bottom of the middle card
  const cur = MENU[Math.max(0, Math.min(MENU.length - 1, Math.round(scroll)))];
  g.fillStyle = "rgba(6,16,32,0.82)"; rrect(g, CX - 128, 234, 256, 44, 10); g.fill();
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#E8FBFF"; g.font = "900 30px Arial Black, Arial, sans-serif";
  g.fillText(cur.name, CX, 257);
  if (pick > 0) {   // the weight in an orange badge on the card's top corner
    g.font = "900 26px Arial Black, Arial, sans-serif"; const w = g.measureText(cur.sub).width + 24;
    g.fillStyle = "rgba(6,16,32,0.85)"; rrect(g, CX + 116 - w, CY - 78, w, 38, 9); g.fill();
    g.fillStyle = "#FFB54A"; g.fillText(cur.sub, CX + 116 - w / 2, CY - 58);
  }
  g.restore();
  // side bar: up / down arrows and one dot per item
  g.fillStyle = "rgba(127,233,255,0.85)";
  g.beginPath(); g.moveTo(470, 40); g.lineTo(488, 64); g.lineTo(452, 64); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(470, 260); g.lineTo(488, 236); g.lineTo(452, 236); g.closePath(); g.fill();
  for (let i = 0; i < MENU.length; i++) { g.fillStyle = Math.abs(i - scroll) < 0.5 ? "#33E1FF" : "rgba(51,225,255,0.3)"; g.beginPath(); g.arc(470, 99 + i * 34, 8, 0, 7); g.fill(); }
  if (pick > 0) {   // ENTER: a bright frame flash around the picked card
    const a = Math.sin(Math.min(1, pick) * Math.PI);
    g.save(); g.globalAlpha = 0.3 + 0.7 * a; g.shadowColor = "#7FE9FF"; g.shadowBlur = 24; g.strokeStyle = "#BFF6FF"; g.lineWidth = 6;
    rrect(g, CX - 124, CY - 82, 248, 164, 12); g.stroke(); g.restore();
  }
}

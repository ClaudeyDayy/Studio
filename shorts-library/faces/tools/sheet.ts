import { EXPRESSION_NAMES, shapeOf, drawFace, drawHead, faceAt, DEFAULT_RIG } from "../face";
const c = document.createElement("canvas"); c.width = 1080; c.height = 1920; document.body.appendChild(c);
const ctx = c.getContext("2d")!;
(window as any).sheet = () => {
  ctx.fillStyle = "#7FB2E5"; ctx.fillRect(0, 0, 1080, 1920);
  const cells: [string, number][] = [...EXPRESSION_NAMES.map((n) => [n, 0] as [string, number]), ["neutral", -1], ["neutral", 1]];
  cells.forEach(([n, lk], i) => {
    const cx = 200 + (i % 3) * 340, cy = 175 + Math.floor(i / 3) * 375, R = 130;
    drawHead(ctx, cx, cy, R); drawFace(ctx, { ...shapeOf(n), look: lk }, cx, cy, R);
    n = lk ? (lk < 0 ? "look left" : "look right") : n;
    ctx.fillStyle = "#111"; ctx.font = "bold 40px sans-serif"; ctx.textAlign = "center"; ctx.fillText(n, cx, cy + R + 55);
  });
  return c.toDataURL("image/png");
};
(window as any).frame = (t: number, track: any) => {
  ctx.fillStyle = "#7FB2E5"; ctx.fillRect(0, 0, 1080, 1920);
  const f = faceAt(track, t, { blinks: [0.9, 4.1, 8.6] });
  const cx = 540, cy = 860, R = 360;
  ctx.save(); ctx.translate(cx, cy + R); ctx.rotate(f.rot); ctx.scale(f.sx, f.sy); ctx.translate(-cx, -cy - R);
  drawHead(ctx, cx, cy, R); drawFace(ctx, f.face, cx, cy, R); ctx.restore();
  let name = track[0].e; for (const k of track) if (k.t <= t) name = k.e;
  ctx.fillStyle = "#111"; ctx.font = "bold 70px sans-serif"; ctx.textAlign = "center"; ctx.fillText(name, 540, 1500);
  return c.toDataURL("image/jpeg", 0.92);
};

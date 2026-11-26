// Finish check for a rendered video (R3KNRF, 2026-11-11), ported from the reference pack's short_qa.py to Node + ffmpeg
// (no Python needed). It reads every frame of studio/out/<name>.mp4 and reports:
//   SPECS     size, fps, frames, length, sound track (should be none: Arian adds the sound himself)
//   BLACK     frames that are almost black
//   WHITE     frames that are almost white that are NOT one of the video's planned white flashes
//   FROZEN    runs of 12+ frames where nothing moves (the reference camera never stops: every hold creeps)
//   POPS      sudden jumps (a frame much more different from the last one than its neighbours), not at planned dissolves / flashes
//   MOTION    how much of the video is held still
// and makes contact sheets (one per 2 s, 60 frames, frame numbers burned in) in studio/out/qa-<name>/.
//
//   (in a video folder)   node ..\..\engine\qa.mjs            checks studio/out/<folder name>.mp4
//   (anywhere)            node <path>\engine\qa.mjs bank      or a full path to an mp4
// Planned flashes and dissolves are read from the video folder's video.ts (whiteAt / dissolveAt) when it can be loaded.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(ENGINE, "../..");
const arg = process.argv[2];
let mp4, name;
if (arg && arg.toLowerCase().endsWith(".mp4")) { mp4 = path.resolve(arg); name = path.basename(arg, ".mp4"); }
else { name = arg || path.basename(process.cwd()); mp4 = path.join(STUDIO, "out", name + ".mp4"); }
if (!fs.existsSync(mp4)) { console.error("ERROR: no video at " + mp4); process.exit(1); }
const OUT = path.join(STUDIO, "out", "qa-" + name);
fs.mkdirSync(OUT, { recursive: true });
const FF = process.env.FFMPEG || "ffmpeg", FP = process.env.FFPROBE || "ffprobe";
const run = (cmd, args, bin = false) => spawnSync(cmd, args, { maxBuffer: 1 << 30, encoding: bin ? "buffer" : "utf8" });
const R = [];

// ---------- specs ----------
const pr = JSON.parse(run(FP, ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames:format=duration", "-of", "json", mp4]).stdout);
const vs = pr.streams.find((s) => s.codec_type === "video"), au = pr.streams.filter((s) => s.codec_type === "audio");
const [fn, fd] = vs.r_frame_rate.split("/").map(Number), FPS = fn / (fd || 1);
R.push(`SPECS   ${vs.width}x${vs.height}, ${FPS} fps, ${vs.nb_frames} frames, ${(+pr.format.duration).toFixed(2)} s, sound: ${au.length ? au.map((s) => s.codec_name).join(", ") + " (expected muted!)" : "none (muted, good)"}`);

// ---------- planned flashes / dissolves from the video folder ----------
const planned = new Set();
let plannedNote = "planned flashes/dissolves: not loaded (pass the folder name, run inside the video folder)";
const vdir = path.join(STUDIO, "src", "videos", name);
if (fs.existsSync(path.join(vdir, "video.ts"))) {
  try {
    const esbuild = await import("esbuild");
    const tmp = path.join(OUT, "_video.mjs");
    await esbuild.build({
      entryPoints: [path.join(vdir, "video.ts")], bundle: true, outfile: tmp, format: "esm", platform: "node", logLevel: "silent",
      loader: { ".json": "json" }, plugins: [{ name: "shim", setup(b) { b.onResolve({ filter: /^remotion$/ }, () => ({ path: path.join(ENGINE, "remotion-shim.ts") })); } }],
    });
    const v = (await import(pathToFileURL(tmp).href + "?t=" + Date.now())).default;
    const n = Math.round(+pr.format.duration * FPS);
    let a = 0, b = 0;
    for (let f = 0; f < n; f++) {
      const t = f / FPS;
      const w = v.whiteAt ? v.whiteAt(t) : 0, d = v.dissolveAt ? v.dissolveAt(t) : null;
      if (w > 0.02) { a++; for (let k = f - 1; k <= f + 1; k++) planned.add(k); }
      if (d) { b++; for (let k = f - 1; k <= f + 1; k++) planned.add(k); }
    }
    plannedNote = `planned frames from video.ts: ${a} white-flash frames, ${b} dissolve frames (ignored below)`;
    fs.rmSync(tmp, { force: true });
  } catch (e) { plannedNote += " (" + String(e.message || e).split("\n")[0] + ")"; }
}
R.push(plannedNote);

// ---------- every frame, small ----------
const W = 180, H = 320, FS = W * H * 3;
const raw = run(FF, ["-v", "error", "-i", mp4, "-vf", `scale=${W}:${H}:flags=area`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], true).stdout;
const n = Math.floor(raw.length / FS);
const mean = new Float64Array(n), diff = new Float64Array(Math.max(0, n - 1));
for (let i = 0; i < n; i++) {
  let s = 0; const o = i * FS;
  for (let k = 0; k < FS; k += 3) s += 0.2126 * raw[o + k] + 0.7152 * raw[o + k + 1] + 0.0722 * raw[o + k + 2];
  mean[i] = s / (W * H) / 255;
  if (i > 0) { let d = 0; const p = o - FS; for (let k = 0; k < FS; k++) d += Math.abs(raw[o + k] - raw[p + k]); diff[i - 1] = d / FS; }
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; };
const black = [], white = [], pops = [], frozen = [];
for (let i = 0; i < n; i++) { if (mean[i] < 0.04) black.push(i); if (mean[i] > 0.93 && !planned.has(i)) white.push(i); }
for (let i = 0; i < diff.length; i++) {
  const m = med(Array.from(diff.slice(Math.max(0, i - 8), i + 9)));
  if (diff[i] > 3 * m + 1.0 && !planned.has(i + 1)) pops.push(i + 1);
}
let st = null;
for (let i = 0; i <= diff.length; i++) {
  if (i < diff.length && diff[i] < 0.02) { if (st === null) st = i; }
  else { if (st !== null && i - st >= 12) frozen.push([st, i]); st = null; }
}
const fr = (l) => (l.length ? l.slice(0, 30).map((x) => (Array.isArray(x) ? `${x[0]}-${x[1]} (${(x[0] / FPS).toFixed(2)}-${(x[1] / FPS).toFixed(2)} s)` : `${x} (${(x / FPS).toFixed(2)} s)`)).join(", ") + (l.length > 30 ? ` ... +${l.length - 30}` : "") : "none");
R.push(`FRAMES  ${n}`);
R.push(`BLACK   ${fr(black)}`);
R.push(`WHITE   (not planned) ${fr(white)}`);
R.push(`FROZEN  (12+ still frames) ${fr(frozen)}`);
R.push(`POPS    (sudden jumps, not planned) ${fr(pops)}`);
const held = diff.filter((d) => d < 0.3).length;
R.push(`MOTION  mean change ${(diff.reduce((a, b) => a + b, 0) / Math.max(1, diff.length)).toFixed(2)}; held frames ${held} (${Math.round((100 * held) / Math.max(1, diff.length))} %)  (reference: ~10 % held)`);
const ok = !black.length && !white.length && !frozen.length && !pops.length;
R.push(ok ? "RESULT  OK: nothing to fix" : "RESULT  check the frames listed above (open the contact sheets)");

// ---------- contact sheets: 60 frames (2 s) each, 10 x 6, frame numbers burned in ----------
const sheets = Math.ceil(n / 60);
const font = process.platform === "win32" ? "fontfile='C\\:/Windows/Fonts/arial.ttf':" : "";
const sheet = (vf) => run(FF, ["-v", "error", "-y", "-i", mp4, "-vf", vf, "-q:v", "4", path.join(OUT, "sheet_%02d.jpg")]);
let r2 = sheet(`scale=135:240,drawtext=${font}text='%{frame_num}':start_number=0:x=4:y=4:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6,tile=10x6`);
if (r2.status !== 0) r2 = sheet("scale=135:240,tile=10x6");      // ffmpeg without text drawing: sheets without numbers (row = 10 frames)
R.push(r2.status === 0 ? `SHEETS  ${sheets} contact sheets in ${OUT}` : "SHEETS  failed: " + (r2.stderr || "").split("\n")[0]);

const text = R.join("\n");
fs.writeFileSync(path.join(OUT, "report.txt"), text + "\n");
console.log(text);
console.log("\nreport: " + path.join(OUT, "report.txt"));

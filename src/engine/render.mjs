// The shared render script. You do not run this file yourself: each video folder has a tiny render.mjs that calls it.
// It builds engine/main.ts + that folder's video.ts with esbuild, serves it on a tiny local server, opens YOUR Chrome
// (GPU through ANGLE, nothing is downloaded), saves every frame, then makes a MUTED mp4 with ffmpeg.
//
//   (in a video folder)  node render.mjs                 all frames, then the mp4 (studio/out/<folder name>.mp4)
//                        node render.mjs 150             one still          node render.mjs 0,150,207,700   a few stills
//                        node render.mjs 0-59            a range            set RESUME=1 to skip frames that already exist
// Options (cmd: `set NAME=value` before the command):
//   FORMAT=png        png frames instead of jpg (jpg q0.95 is the default)
//   RES=2k            render at 1440x2560 (about 1.8x slower): frames-<name>-2k, out/<name>-2k.mp4
//   ANGLE=gl          if the default d3d11 fails; ANGLE=gl-angle tries --use-gl=angle
//   CHROME=path       another chrome.exe            FINAL=1   slow x264 preset for the final upload
//   NOMUX=1           do not make the mp4           SHOW=1    show the Chrome window (not headless)
//   SOUND=1           put public/<folder name>/sfx.wav in the mp4 (default: muted, Arian adds the sound himself)
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import WebSocket from "ws";
import { checkVideo } from "./guard.mjs";

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(ENGINE, "../..");
const PUBLIC = path.join(STUDIO, "public");
if (!process.env.VIDEO_DIR) { console.error("Run the render.mjs inside a video folder (src/videos/<name>), not this one."); process.exit(1); }
const VIDEO_DIR = path.resolve(process.env.VIDEO_DIR);
const NAME = path.basename(VIDEO_DIR);                             // the folder name names the frames folder and the mp4
const WEB = path.join(STUDIO, "out", ".web-" + NAME);              // the built page (temporary)
const SUF = /^(2k|1440|1440p)$/i.test(process.env.RES || "") ? "-2k" : "";
const FRAMES = path.join(STUDIO, "out", "frames-" + NAME + SUF);
const OUT = path.join(STUDIO, "out", NAME + SUF + ".mp4");
const env = process.env;
const FORMAT = env.FORMAT === "png" ? "png" : "jpg";
const CHROME = env.CHROME || (process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : "/usr/bin/google-chrome");
const ANGLE = env.ANGLE || "d3d11";
const RES2K = /^(2k|1440|1440p)$/i.test(env.RES || "");           // set RES=2k: 1440x2560 (frames-<name>-2k, <name>-2k.mp4)
const RES = RES2K ? 1440 / 1080 : 1;

const log = (...a) => console.log(...a);
const die = (m) => { console.error("\nERROR: " + m); cleanup(); process.exit(1); };

// ---------- 0. the guard (2026-11-16): places come from the place library, no fades. See engine/guard.mjs ----------
{ const g = checkVideo(VIDEO_DIR, STUDIO); for (const l of g.lines) (g.ok ? console.log : console.error)(l); if (!g.ok) process.exit(1); }

// ---------- 1. build ----------
if (!fs.existsSync(path.join(VIDEO_DIR, "video.ts"))) { console.error("ERROR: no video.ts in " + VIDEO_DIR); process.exit(1); }
const shim = {
  name: "video-and-remotion-shim",
  setup(b) {
    b.onResolve({ filter: /^@video$/ }, () => ({ path: path.join(VIDEO_DIR, "video.ts") }));
    b.onResolve({ filter: /^remotion$/ }, () => ({ path: path.join(ENGINE, "remotion-shim.ts") }));
  },
};
fs.mkdirSync(WEB, { recursive: true });
await esbuild.build({
  entryPoints: [path.join(ENGINE, "main.ts")], bundle: true, outfile: path.join(WEB, "main.js"),
  format: "iife", target: "chrome100", loader: { ".json": "json" }, plugins: [shim], logLevel: "warning",
}).catch(() => die("build failed (see above)"));
fs.copyFileSync(path.join(ENGINE, "index.html"), path.join(WEB, "index.html"));
log("built " + NAME);

// ---------- 2. local server: the page from web/, files from studio/public at /public/ ----------
const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".wav": "audio/wav", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const [root, rel] = u.startsWith("/public/") ? [PUBLIC, u.slice(8)] : [WEB, u === "/" ? "index.html" : u.slice(1)];
  const file = path.resolve(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

// ---------- 3. your Chrome ----------
if (!fs.existsSync(CHROME)) die("Chrome not found at " + CHROME + "  (set CHROME=path to chrome.exe)");
const gpuArgs = ANGLE === "gl-angle" ? ["--use-gl=angle"]
  : ANGLE === "swiftshader" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]     // test machines only: very slow
  : ["--use-angle=" + ANGLE];
const args = [
  env.SHOW ? "" : "--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + path.join(STUDIO, "out", ".chrome-profile"),
  "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--mute-audio", "--hide-scrollbars",
  "--force-device-scale-factor=1", "--window-size=1080,1920", "--ignore-gpu-blocklist", "--enable-webgl", "--enable-gpu",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
  ...gpuArgs, ...(process.platform === "linux" && process.getuid?.() === 0 ? ["--no-sandbox"] : []), "about:blank",
].filter(Boolean);
const chrome = spawn(CHROME, args, { stdio: ["ignore", "ignore", "pipe"] });
function cleanup() { try { chrome.kill(); } catch {} try { server.close(); } catch {} }
process.on("SIGINT", () => { log("\nstopped"); cleanup(); process.exit(130); });
const wsUrl = await new Promise((res, rej) => {
  let buf = "";
  const to = setTimeout(() => rej(new Error("Chrome did not start in 30 s")), 30000);
  chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(to); res(m[1]); } });
  chrome.on("exit", (c) => rej(new Error("Chrome closed (code " + c + "):\n" + buf.slice(-2000))));
}).catch((e) => die(e.message));

// ---------- 4. a very small DevTools client ----------
const ws = new WebSocket(wsUrl, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
await new Promise((r, j) => { ws.once("open", r); ws.once("error", j); }).catch((e) => die("DevTools: " + e.message));
let nextId = 1; const waiting = new Map(); const handlers = {};
ws.on("message", (raw) => {
  const m = JSON.parse(raw);
  if (m.id && waiting.has(m.id)) { const { res, rej } = waiting.get(m.id); waiting.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  else if (m.method && handlers[m.method]) handlers[m.method](m.params);
});
let SID;
const send = (method, params = {}, sessionId = SID) => new Promise((res, rej) => {
  const id = nextId++; waiting.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
handlers["Runtime.consoleAPICalled"] = (p) => log("  [page " + p.type + "] " + p.args.map((a) => a.value ?? a.description ?? "").join(" "));
handlers["Runtime.exceptionThrown"] = (p) => log("  [page error] " + (p.exceptionDetails.exception?.description || p.exceptionDetails.text));

const { targetId } = await send("Target.createTarget", { url: "about:blank" }, null);
SID = (await send("Target.attachToTarget", { targetId, flatten: true }, null)).sessionId;
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__RES = ${RES};` });
await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/index.html?res=${RES}` });
for (let i = 0; ; i++) {
  if (await evaluate("typeof window.readyPromise").catch(() => "") === "object") break;
  if (i > 600) die("page did not start in 60 s");
  await new Promise((r) => setTimeout(r, 100));
}
const t0 = Date.now();
const info = await evaluate("window.readyPromise").catch((e) => die("page failed to load: " + e.message));
log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s | GPU: ${info.gpu} | font: ${info.font}`);
log(`picture size: ${info.size[0]} x ${info.size[1]}`);
if (RES2K && info.size[0] !== 1440) die("2K was asked for but the page made " + info.size[0] + " x " + info.size[1]);
if (/swiftshader|llvmpipe|software|basic render/i.test(info.gpu) && ANGLE !== "swiftshader") log("WARNING: Chrome is NOT using your graphics card (very slow). Try: set ANGLE=gl");

// ---------- 4b. `node render.mjs check` (Fable5.2): camera and ground problems, found without rendering ----------
// Options: set STEP=1 (every frame, default every 2nd), set CLEAR=0.4 (lens clearance in m, default 0.3)
if (process.argv[2] === "check") {
  const tc = Date.now();
  const rep = JSON.parse(await evaluate(`window.check(${Number(env.STEP) || 2}, ${Number(env.CLEAR) || 0.3})`).catch((e) => die("check failed: " + e.message)));
  const runs = [], sec = (f) => (f / rep.fps).toFixed(2);
  let cur = null;   // join neighbouring frames with the same finding into one line
  for (const c of rep.cam) {
    if (cur && cur.kind === c.kind && cur.what === c.what && c.f - cur.b <= rep.step * 2) cur.b = c.f;
    else { cur = { ...c, a: c.f, b: c.f }; runs.push(cur); }
  }
  const out = [`CHECK ${NAME}: ${rep.total} frames (every ${rep.step}.), lens clearance ${rep.clear} m, camera near ${rep.near} m / far ${rep.far} m`];
  out.push(runs.length ? `\nCAMERA: ${runs.length} problem(s)` : "\nCAMERA: clean (never through or too close to anything)");
  for (const l of runs) out.push(`  frames ${l.a}-${l.b} (${sec(l.a)}-${sec(l.b)} s): ${l.kind === "THROUGH" ? "goes THROUGH" : `closer than ${rep.clear} m to`} "${l.what}" near [${l.at.join(", ")}]`);
  out.push(rep.flat.length ? `\nGROUND FLICKER: ${rep.flat.length} pair(s)` : "\nGROUND: no flat layers close enough to flicker");
  for (const s of rep.flat) out.push("  " + s);
  if (rep.clipped.length) { out.push(`\nNOT DRAWN: ${rep.clipped.length}`); for (const s of rep.clipped) out.push("  " + s); }
  if (rep.near < 0.1 && rep.far > 150) out.push(`\nDEPTH: near ${rep.near} m with far ${rep.far} m is coarse for a big place: set near: 0.2 in video.ts`);
  const text = out.join("\n");
  log("\n" + text + `\n\n(${((Date.now() - tc) / 1000).toFixed(0)} s) saved to check.txt in the video folder`);
  fs.writeFileSync(path.join(VIDEO_DIR, "check.txt"), text + "\n");
  cleanup(); process.exit(0);
}

// ---------- 5. frames ----------
const TOTAL = info.total;
const spec = process.argv[2] || `0-${TOTAL - 1}`;
const list = [];
for (const part of spec.split(",")) {
  const [a, b] = part.split("-").map((s) => parseInt(s, 10));
  if (Number.isNaN(a)) die("bad frame list: " + spec);
  for (let f = a; f <= (b === undefined || Number.isNaN(b) ? a : b); f++) if (f >= 0 && f < TOTAL) list.push(f);
}
fs.mkdirSync(FRAMES, { recursive: true });
const name = (f) => path.join(FRAMES, `f${String(f).padStart(4, "0")}.${FORMAT}`);
const todo = env.RESUME ? list.filter((f) => !(fs.existsSync(name(f)) && fs.statSync(name(f)).size > 0)) : list;
log(`${todo.length} frame(s) to render (${list.length - todo.length} already there), format ${FORMAT}`);
const tStart = Date.now(); let first = 0, blank = 0;
for (let i = 0; i < todo.length; i++) {
  const f = todo[i], ts = Date.now();
  const url = await evaluate(`window.grab(${f}, "${FORMAT}")`).catch((e) => die(`frame ${f}: ${e.message}`));
  const buf = Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
  // BLANK-FRAME GUARD: if the GPU runs out of memory the 3D picture goes black and only the captions stay (a real frame is much bigger).
  // Such a frame is NOT saved; after 3 in a row the render stops, so a long render never ends as a half-black video.
  // 2026-11-26: a white flash or a plain sky also makes a tiny jpg; only a DARK small frame is a GPU failure
  const small = FORMAT === "jpg" && buf.length < info.size[0] * info.size[1] * 0.025;
  const luma = small ? await evaluate(`(window.lastLuma ? window.lastLuma() : 0)`).catch(() => 0) : 1;
  if (small && luma < 0.12) {
    blank++; if (blank >= 3) die(`frames from ${f - 2} on came out black (the GPU probably ran out of memory). Nothing bad was saved. Close other programs, then run the SAME command again with: set RESUME=1`);
    continue;
  } else blank = 0;
  fs.writeFileSync(name(f), buf);
  const dt = (Date.now() - ts) / 1000;
  if (i === 0) first = dt;
  const avg = (Date.now() - tStart) / 1000 / (i + 1);
  if (i < 3 || i % 30 === 0 || i === todo.length - 1)
    log(`frame ${f}  ${dt.toFixed(2)} s   (avg ${avg.toFixed(2)} s/frame, left about ${Math.round(avg * (todo.length - i - 1) / 60)} min)`);
}
const total = (Date.now() - tStart) / 1000;
const steady = todo.length > 1 ? (total - first) / (todo.length - 1) : first;
const summary = `${todo.length} frames in ${(total / 60).toFixed(1)} min | first frame ${first.toFixed(1)} s | then ${steady.toFixed(2)} s/frame | GPU ${info.gpu}`;
log(summary);
fs.appendFileSync(path.join(VIDEO_DIR, "render-log.txt"), `${new Date().toISOString()}  [${spec}]  ${summary}\n`);
cleanup();

// ---------- 6. mp4 (only when every frame exists). MUTED by default: Arian adds all sound himself. SOUND=1 adds sfx.wav ----------
const missing = [];
for (let f = 0; f < TOTAL; f++) if (!fs.existsSync(name(f))) missing.push(f);
if (missing.length || env.NOMUX) { log(missing.length ? `frames written to ${FRAMES}` : "NOMUX set: no mp4"); process.exit(0); }
const sfx = path.join(PUBLIC, NAME, "sfx.wav");
const withSound = !!env.SOUND && fs.existsSync(sfx);
const ff = ["-y", "-loglevel", "error", "-stats", "-framerate", "30", "-i", path.join(FRAMES, `f%04d.${FORMAT}`),
  ...(withSound ? ["-i", sfx, "-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "192k", "-shortest"] : ["-an"]),
  "-c:v", "libx264", "-preset", env.FINAL ? "slow" : "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT];
log("ffmpeg: making " + OUT + (withSound ? " (with sfx.wav)" : " (muted)"));
const mux = spawnSync("ffmpeg", ff, { stdio: "inherit" });
if (mux.error) die("ffmpeg not found on PATH");
if (mux.status !== 0) die("ffmpeg failed");
log(`done: ${OUT}  (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB). You can delete the frames folder now.`);

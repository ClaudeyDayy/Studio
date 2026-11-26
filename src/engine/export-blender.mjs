// BLENDER BRIDGE (2026-11-26), step 3 of the browser-first workflow: export a locked shot to Blender.
// Builds engine/export-entry.ts with the video's video.ts, opens YOUR Chrome (headless), and writes
//   studio/out/blender-<name>/<name>-f<from>-<to>.glb   every object + the camera, motion baked one key per frame
//   studio/out/blender-<name>/<name>-f<from>-<to>.json  camera fov per frame, notes
// Run (studio folder):   node src/engine/export-blender.mjs src/videos/wald-bomber 0-89
// It changes nothing in the video. Blender only adds the look (blender/bridge_import.py).
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import WebSocket from "ws";

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(ENGINE, "../..");
const PUBLIC = path.join(STUDIO, "public");
const VIDEO_DIR = path.resolve(process.argv[2] || process.env.VIDEO_DIR || "");
if (!fs.existsSync(path.join(VIDEO_DIR, "video.ts"))) { console.error("Usage: node src/engine/export-blender.mjs src/videos/<name> 0-89"); process.exit(1); }
const NAME = path.basename(VIDEO_DIR);
const [A, B] = (process.argv[3] || "0-89").split("-").map((s) => parseInt(s, 10));
const WEB = path.join(STUDIO, "out", ".web-export-" + NAME);
const OUTDIR = path.join(STUDIO, "out", "blender-" + NAME);
const BASE = path.join(OUTDIR, `${NAME}-f${A}-${B}`);
const CHROME = process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const log = (...a) => console.log(...a);
let chrome, server;
const cleanup = () => { try { chrome?.kill(); } catch {} try { server?.close(); } catch {} };
const die = (m) => { console.error("\nERROR: " + m); cleanup(); process.exit(1); };

// 1. build
fs.mkdirSync(WEB, { recursive: true }); fs.mkdirSync(OUTDIR, { recursive: true });
const shim = { name: "video-shim", setup(b) {
  b.onResolve({ filter: /^@video$/ }, () => ({ path: path.join(VIDEO_DIR, "video.ts") }));
  b.onResolve({ filter: /^remotion$/ }, () => ({ path: path.join(ENGINE, "remotion-shim.ts") }));
} };
await esbuild.build({ entryPoints: [path.join(ENGINE, "export-entry.ts")], bundle: true, outfile: path.join(WEB, "main.js"),
  format: "iife", target: "chrome100", loader: { ".json": "json" }, plugins: [shim], logLevel: "warning" }).catch(() => die("build failed"));
fs.writeFileSync(path.join(WEB, "index.html"), '<!doctype html><html><body><canvas id="out"></canvas><script src="main.js"></script></body></html>');
log("built export page for " + NAME);

// 2. server
const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".woff2": "font/woff2" };
server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const [root, rel] = u.startsWith("/public/") ? [PUBLIC, u.slice(8)] : [WEB, u === "/" ? "index.html" : u.slice(1)];
  const file = path.resolve(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

// 3. Chrome
chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + path.join(STUDIO, "out", ".chrome-profile-export"),
  "--no-first-run", "--disable-extensions", "--mute-audio", "--window-size=1080,1920", "--ignore-gpu-blocklist", "--enable-webgl", "--use-angle=d3d11", "about:blank"],
  { stdio: ["ignore", "ignore", "pipe"] });
const wsUrl = await new Promise((res, rej) => {
  let buf = ""; const to = setTimeout(() => rej(new Error("Chrome did not start")), 30000);
  chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(to); res(m[1]); } });
}).catch((e) => die(e.message));
const ws = new WebSocket(wsUrl, { perMessageDeflate: false, maxPayload: 1024 * 1024 * 1024 });
await new Promise((r, j) => { ws.once("open", r); ws.once("error", j); });
let nextId = 1, SID; const waiting = new Map();
ws.on("message", (raw) => { const m = JSON.parse(raw);
  if (m.id && waiting.has(m.id)) { const { res, rej } = waiting.get(m.id); waiting.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  else if (m.method === "Runtime.exceptionThrown") log("  [page error] " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") log("  [page] " + m.params.args.map((a) => a.value ?? a.description).join(" ")); });
const send = (method, params = {}, sid = SID) => new Promise((res, rej) => { const id = nextId++; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) })); });
const evaluate = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const { targetId } = await send("Target.createTarget", { url: "about:blank" }, null);
SID = (await send("Target.attachToTarget", { targetId, flatten: true }, null)).sessionId;
await send("Runtime.enable");
await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/index.html` });
for (let i = 0; ; i++) { if (await evaluate("window.ready === true").catch(() => false)) break; if (i > 600) die("page did not start"); await new Promise((r) => setTimeout(r, 100)); }

// 4. export
log(`exporting frames ${A}-${B} ...`);
const t0 = Date.now();
const r = await evaluate(`window.exportBlender(${A}, ${B})`).catch((e) => die("export failed: " + e.message));
fs.writeFileSync(BASE + ".glb", Buffer.from(r.glb, "base64"));
fs.writeFileSync(BASE + ".json", JSON.stringify(r.info, null, 1));
const i = r.info;
log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${i.objects} objects, ${i.moving} moving, ${i.hidden} hide/show, ${i.tracks} tracks`);
log(`  ${BASE}.glb  (${(fs.statSync(BASE + ".glb").size / 1e6).toFixed(1)} MB)`);
for (const n of i.notes) log("  note: " + n);
for (const w of i.exporterWarnings) log("  exporter: " + w);
cleanup(); process.exit(0);

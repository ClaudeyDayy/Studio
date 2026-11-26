// Renders THIS folder's video with the shared engine (src/engine/render.mjs).
//   node render.mjs            all frames + muted mp4 -> studio\out\<this folder's name>.mp4
//   node render.mjs 150        one still              node render.mjs 0,150,700   a few stills
import { fileURLToPath } from "node:url";
import path from "node:path";
process.env.VIDEO_DIR = path.dirname(fileURLToPath(import.meta.url));
await import("../../engine/render.mjs");

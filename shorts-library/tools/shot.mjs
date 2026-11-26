// node shot.mjs <page.html> <query> <out.png> [w h]
import { spawnSync } from "node:child_process";
import path from "node:path";
const [page, query, out, w = "600", h = "1000"] = process.argv.slice(2);
const r = spawnSync("/usr/bin/google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
  "--default-background-color=00000000", `--window-size=${w},${h}`, `--screenshot=${path.resolve(out)}`, `file://${path.resolve(page)}?${query}`], { encoding: "utf8" });
if (r.status !== 0) { console.error(r.stderr.slice(-800)); process.exit(1); }

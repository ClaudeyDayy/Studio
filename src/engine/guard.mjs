// THE GUARD (2026-11-16). render.mjs runs this before it builds anything. It stops the two things that wasted whole days:
//   1. a video that builds its places from scratch instead of taking them from the place library (engine/places.ts)
//   2. fades / long white flashes between shots (his rule: the camera flies, shot changes are whip pans)
// Rule 1 stops the render. Rule 2 prints a warning. Read src/house/START-HERE.md.
import fs from "node:fs";
import path from "node:path";

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (e.name === "node_modules" || e.name.startsWith("_old") ? [] : walk(path.join(d, e.name))) : e.name.endsWith(".ts") ? [path.join(d, e.name)] : []);

export function checkVideo(VIDEO_DIR, STUDIO) {
  const out = { ok: true, lines: [] };
  const rel = path.relative(path.join(STUDIO, "src", "videos"), VIDEO_DIR).split(path.sep).join("/");
  const src = walk(VIDEO_DIR).map((f) => [f, fs.readFileSync(f, "utf8")]);
  const usesPlaces = src.some(([, s]) => /from\s+["'][^"']*engine\/places["']/.test(s));
  const exemptLine = src.map(([, s]) => s.match(/^[ \t]*\/\/[ \t]*PLACES-EXEMPT:[ \t]*(\S.*)$/m)).find(Boolean);
  let legacy = false;
  try { legacy = fs.readFileSync(path.join(STUDIO, "src", "house", "places-exempt.txt"), "utf8").split(/\r?\n/).map((l) => l.trim()).includes(rel); } catch {}
  if (usesPlaces) out.lines.push("place library: used");
  else if (exemptLine) out.lines.push("place library: NOT used. Reason given: " + exemptLine[1].trim());
  else if (legacy) out.lines.push("place library: not used (a video made before the library)");
  else {
    out.ok = false;
    out.lines.push(
      "", "STOPPED: this video builds its places from scratch.",
      "  Every place (street, sidewalk, stairs, house, shop, bank, lamps, trees) must come from the place library:",
      "      src\\engine\\places.ts      e.g.  neighborhood(root, out, { houses: 4 })   mainStreet(root, out, { shops: 5 })",
      "  Read  src\\house\\START-HERE.md  first. Example:  src\\videos\\_places-test\\world.ts",
      "  If the library lacks a place the story needs: add it to the library, then use it here.",
      "  Only a video with NO place on the ground (space, one indoor room for now) may skip it: put this line in its video.ts",
      "      // PLACES-EXEMPT: <the reason>", "");
  }
  const all = src.map(([, x]) => x).join("\n");
  for (const [f, s] of src) {
    const m = s.match(/makeWhite\(\s*\[([\s\S]*?)\]\s*\)/);
    if (m) for (const t of m[1].matchAll(/\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/g)) if (t[3] - t[1] > 0.45)
      out.lines.push(`WARNING ${path.relative(VIDEO_DIR, f)}: a white flash of ${(t[3] - t[1]).toFixed(2)} s at ${t[1]} s works as a fade. His rule: no fades, the camera flies or whip pans.`);
    if (/dissolve\s*:\s*[\d.]+/.test(s) && !/whip/i.test(all)) out.lines.push(`WARNING ${path.relative(VIDEO_DIR, f)}: a shot uses dissolve but the video has no whip pan (HOUSE.whip / whipBlur). His rule: whip pans, never blends.`);
  }
  return out;
}

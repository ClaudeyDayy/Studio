import fs from "node:fs"; import { fileURLToPath, pathToFileURL } from "node:url"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url)); const ts = require("typescript");
export async function resolve(spec, ctx, next) {
  if ((spec.startsWith(".") || spec.startsWith("/")) && ctx.parentURL?.startsWith("file:")) {
    const base = path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec);
    for (const c of [base + ".ts", base + "/index.ts", base]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return { url: pathToFileURL(c).href, shortCircuit: true };
  }
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.endsWith(".ts")) { const src = fs.readFileSync(fileURLToPath(url), "utf8");
    return { format: "module", shortCircuit: true, source: ts.transpileModule(src, { compilerOptions: { module: "ESNext", target: "ES2022" } }).outputText }; }
  return next(url, ctx);
}

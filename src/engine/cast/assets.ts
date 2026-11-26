// Loads pictures from studio/public (render.mjs serves that folder at /public/).
// The cast pictures live in public/library (filled by tools/pick-assets.mjs from a cast sheet).
export const file = (p: string) => "/public/" + p.replace(/^\/+/, "");

export type Imgs = Record<string, HTMLImageElement>;
// one entry per character: which outfit (library/wardrobe/<outfit>/) and an optional hat (library/hats/<hat>/)
// drawnFace: true = morphing drawn faces (needs cast/<name>/faces/blank.png; pick-assets copies it from head_blank.png)
export type CastSpec = Record<string, { outfit: string; hat?: string; drawnFace?: boolean }>;

const FACES = ["neutral", "smug", "shock", "grin"];
export function castPaths(cast: CastSpec): Record<string, string> {
  const a: Record<string, string> = { body: "library/cast/body.png" };
  for (const [ch, s] of Object.entries(cast)) {
    for (const f of FACES) a[`${ch}_${f}`] = `library/cast/${ch}/faces/${f}.png`;
    a[`${ch}_back`] = `library/cast/${ch}/back.png`;
    if (s.drawnFace) a[`${ch}_blank`] = `library/cast/${ch}/faces/blank.png`;
    a[`${ch}_torso_front`] = `library/wardrobe/${s.outfit}/torso_front.png`;
    a[`${ch}_torso_back`] = `library/wardrobe/${s.outfit}/torso_back.png`;
    if (s.hat) for (const v of ["front", "back", "mask"]) a[`${ch}_hat_${v}`] = `library/hats/${s.hat}/hat_${ch}_${v}.png`;
  }
  return a;
}
// loads every picture; key -> image. Extra pictures of your own: loadImages({ ...castPaths(CAST), tree: "myvideo/tree.png" })
export const loadImages = (paths: Record<string, string>): Promise<Imgs> =>
  Promise.all(Object.entries(paths).map(([k, p]) => new Promise<[string, HTMLImageElement]>((res, rej) => {
    const im = new Image();
    im.onload = () => res([k, im]);
    im.onerror = () => rej(new Error("missing file: public/" + p + (p.startsWith("library/") ? " (run: node tools/pick-assets.mjs <cast-sheet>.json)" : "")));
    im.src = file(p);
  }))).then((l) => Object.fromEntries(l));

// face.json of each drawn-face character (head circle + where the eyes/mouth sit); missing file = measured automatically.
// Pass it on: buildCast(imgs, name, { face: faces[name] })
export const loadFaceInfo = async (cast: CastSpec): Promise<Record<string, any>> => {
  const out: Record<string, any> = {};
  for (const [ch, s] of Object.entries(cast)) {
    if (!s.drawnFace) continue;
    out[ch] = await fetch(file(`library/cast/${ch}/face.json`)).then((r) => (r.ok ? r.json() : undefined)).catch(() => undefined);
  }
  return out;
};

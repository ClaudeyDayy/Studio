// Copies ONLY the library files a video needs into public/library.
// Run from the Remotion project folder (the one with src and public):
//   node pick-assets.mjs cast-sheet.json
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const sheetPath = process.argv[2] || 'cast-sheet.json'
if (!fs.existsSync(sheetPath)) { console.error('Cannot find ' + sheetPath); process.exit(1) }
const sheet = JSON.parse(fs.readFileSync(sheetPath, 'utf8'))

const candidates = [
  process.env.SHORTS_LIBRARY,
  sheet.library,
  path.join(os.homedir(), 'Desktop', 'shorts-library'),
  path.join(os.homedir(), 'OneDrive', 'Desktop', 'shorts-library'),
].filter(Boolean)
const lib = candidates.find((p) => fs.existsSync(p))
if (!lib) { console.error('Library not found. Tried:\n  ' + candidates.join('\n  ')); process.exit(1) }

const out = path.join('public', 'library')
const need = new Set()
const map = {} // real library path -> path inside public/library
map['cast/arian/faces/body.png'] = 'cast/body.png'
need.add('cast/arian/faces/body.png')
const optional = new Set()
for (const s of sheet.scenes || []) {
  const c = s.character
  const outfits = [s.outfit, ...(s.outfitChange ? [s.outfitChange] : [])].filter(Boolean)
  for (const f of s.faces || ['neutral']) { const r = `cast/${c}/faces/head_${f}.png`; need.add(r); map[r] = `cast/${c}/faces/${f}.png` }
  // drawn morphing faces (engine face.ts): the blank head + face.json, copied when the character has them
  optional.add(`cast/${c}/faces/head_blank.png`); map[`cast/${c}/faces/head_blank.png`] = `cast/${c}/faces/blank.png`
  optional.add(`cast/${c}/face.json`)
  if (s.back) { const r = c === 'ava' ? 'cast/ava/faces/ava_back.png' : `cast/${c}/faces/head_back.png`; need.add(r); map[r] = `cast/${c}/back.png` }
  if (s.hat) {                                  // a separate hat from hats/<name>/ (e.g. "hat": "cowboy")
    need.add(`hats/${s.hat}/hat_${c}_front.png`); need.add(`hats/${s.hat}/hat_${c}_mask.png`)
    if (s.back) need.add(`hats/${s.hat}/hat_${c}_back.png`)
  }
  for (const o of outfits) {
    need.add(`wardrobe/${o}/torso_front.png`)
    if (s.back) need.add(`wardrobe/${o}/torso_back.png`)
    optional.add(`wardrobe/${o}/hat_${c}_front.png`)
    if (s.back) optional.add(`wardrobe/${o}/hat_${c}_back.png`)
  }
}
const missing = []
const copied = []
const copy = (rel, must) => {
  const src = path.join(lib, rel)
  if (!fs.existsSync(src)) { if (must) missing.push(rel); return }
  const dst = path.join(out, map[rel] || rel)
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(src, dst); copied.push(rel)
}
fs.rmSync(out, { recursive: true, force: true })
for (const r of need) copy(r, true)
for (const r of optional) copy(r, false)
for (const e of sheet.environments || []) {
  const src = path.join(lib, 'environments', e)
  if (!fs.existsSync(src)) { missing.push('environments/' + e); continue }
  fs.cpSync(src, path.join(out, 'environments', e), { recursive: true }); copied.push('environments/' + e)
}
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ library: lib, copied }, null, 2))
console.log('Library: ' + lib)
console.log('Copied ' + copied.length + ' items into ' + out)
if (missing.length) { console.log('\nMISSING (tell Claude):\n  ' + missing.join('\n  ')); process.exit(2) }
console.log('All needed files found.')

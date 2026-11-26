DRAWN MORPHING FACES (made 2026-11-11)

The eyes, brows and mouth are DRAWN by the engine every frame (not pictures), so a face slides into the next one
on purpose (small overshoot), the head squashes and bounces a little on every change, eyes can blink, and the
eye dots can look left / right / forward.

Faces (names to use in a story):
  neutral    lid line + dot eyes, arched brows, short tapered dash mouth (the main look)
  content    ^ ^ eyes, soft crescent smile
  happy      open eyes, big open smile with tongue
  satisfied  closed relaxed eyes, smug side smile
  strain     > < eyes, gritted-teeth grin (effort)
  angry      lidded eyes, brows pressed down, clenched teeth
  stressed   wide eyes, small pupils, worried brows, wavy mouth
  sad        drooping lids, brows up in the middle, frown
  scared     very wide eyes, tiny pupils, wavy teeth
  surprised  wide eyes, high brows, round open mouth
  confused   one brow up, eyes uneven, crooked mouth
  look: -1 = looks left, 0 = forward, 1 = right (works with every face)

Colours (measured from the reference shorts): skin #FCF2EA, ink #2B1C1A.

Files
  faces/face.ts            the master copy (the engine has the same file in studio\src\engine\cast\face.ts)
  faces/preview-*.png/mp4  all faces + a morph test
  faces/tools/make_blank.py   makes a character's blank head:  python make_blank.py head_neutral.png head_blank.png face.json
  cast/<name>/faces/head_blank.png   OPTIONAL hand-made blank head. Not needed: the engine makes the blank head itself
                             from head_neutral (paints out the eyes, brows, mouth; sets the skin to #FCF2EA) and measures
                             where the eyes and mouth were, so the drawn face sits in the same place.
  cast/<name>/face.json      OPTIONAL override of that layout

Use in a video
  1. cast sheet: as before
  2. buildCast(imgs, "max", { drawnFace: true })
     (optional extras: CastSpec drawnFace: true loads a hand-made head_blank.png; loadFaceInfo(CAST) reads face.json)
  4. new Player(..., { face: [{ t: 0, e: "neutral" }, { t: 2.1, e: "happy" }, { t: 4, e: "neutral", look: -1 }],
                       blinks: [1.3, 5.2], talk })        (talk: the same 0..5 mouth shapes as before)
  Videos without face: [...] look exactly as before.

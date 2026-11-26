THE SHARED ENGINE. Every video folder in src\videos uses it. Never copy it; fix things here once and every video gets them.
  main.ts         draws one frame: world -> ink -> lens blur -> glow -> tone -> colour grade, dissolves, white flash, captions
  render.mjs      runs your Chrome, saves frames, makes the muted mp4 (called by each video folder's render.mjs)
  video.ts        what a video folder must give the engine (see _new-video\video.ts)
  core\camera.ts  shots, moves, creep/drift/orbit, matched dissolves, white flashes, loop helper, camera tilt (roll), impact kicks
  core\lights.ts  light presets (day, sunset, night, indoor), light that changes over time, the grade that follows it
  core\whip.ts    WHIP PANS (house rule 2026-11-15): every shot with `dissolve` swings sideways with motion blur instead of blending
  core\captions.ts  captions from words.json
  core\talk.ts    talking mouths from words.json: makeTalk(WORDS, [{ who, a, b }])
  core\util.ts    small maths helpers (smooth, vectors, seeded random)
  cast\player3d.ts  THE 3D LOOK (new videos): real 3D bodies in 3D clothes (shorts-library\wardrobe3d) + 2D drawn heads that
                  always face the camera, ink arms/legs, talking mouths with teeth and tongue. Bodies turn, never squeezed.
  cast\player.ts  the old flat-card characters (cards, arms, hands, idle sway, sweat, hats, drawn faces) - old videos only
  cast\cardlight.ts  characters that take the scene light (tint + darker, cooler far side)
  fx\fx.ts        effects kit: sparkle, burst, dust, speed lines, dizzy stars, music notes, splash
  qa.mjs          finish check of the mp4: black, white, frozen, sudden jumps + contact sheets (node ..\..\engine\qa.mjs)
  cast\life.ts    faces and sweat over time
  cast\assets.ts  loads pictures from public (cast, outfits, hats, your own)
  post\           ink outlines, lens blur, colour grade, toon shading
  kit.ts          building helpers: MR(colour) / MTR(texture) real materials (3D look), M / MT toon materials (old look), popScale, hull, mkCanvas
  video.ts options for the 3D look:  ink: false (no outlines on the world),  env: 0.55 (soft light from all around)
New video: copy  src\videos\_new-video  (read its README.txt). It is the 3D look; the old 2D template is src\videos\_old\new-video-2d.
Example of every R3KNRF piece (light, lit people, auto blinks, tilt, kick, effects): src\videos\_r3-test
  places.ts       THE PLACE LIBRARY (2026-11-16): neighborhood, mainStreet, house, shop, bank, road, sidewalk, stairs, door, window,
                  fence, mailbox, hydrant, bench, car... Every video takes its places from here. Read src\house\START-HERE.md
  guard.mjs       render.mjs runs it first: stops a video that builds places from scratch, warns about fades
  check the library without rendering:  node --import ./tools/places-check/reg.mjs tools/places-check/smoke.ts   (in Desktop\studio)

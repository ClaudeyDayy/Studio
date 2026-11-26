R3KNRF TEST (2026-11-11): 10 seconds that show every new engine piece.
  - people that take the light (world.ts: Player(..., { lit: true }))
  - automatic blinks (blinks: "auto")
  - light day -> sunset (3.0 s) -> night (6.8 s), with the grade following it (story.ts LIGHT, video.ts gradeAt)
  - camera tilt (the 5th value of P(...)) and an impact kick at 5.0 s (makeCamera(..., { kicks }))
  - effects: sparkle, notes, burst, dizzy stars, dust, speed lines, splash (story.ts FX)
Render:  node render.mjs        -> studio\out\_r3-test.mp4  (muted)
Check:   node ..\..\engine\qa.mjs

BANK: "The pants bet" (66.2 s). Uses the shared engine (src\engine) and its own pictures in public\bank.
1. Open cmd here:            cd C:\Users\Arian\Desktop\studio\src\videos\bank
2. A few stills (test):      node render.mjs 0,165,450,700,960,1290,1600,1824,1977   -> studio\out\frames-bank\
3. Whole video (muted):      node render.mjs            -> studio\out\bank.mp4
4. Stopped half way?         set RESUME=1   then   node render.mjs
5. GPU not used / error?     set ANGLE=gl   then try again.  Final upload quality: set FINAL=1
Files: story.ts (time, people, camera, faces, talking), world.ts (hall, office, fantasy, props, hands), tex.ts (painted textures).

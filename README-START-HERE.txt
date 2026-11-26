SHORTS STUDIO  (a clean Remotion project with the engine files inside)

FIRST TIME ONLY
1. Unzip this folder somewhere with plenty of free space (not inside another zip).
2. Open cmd INSIDE the folder that contains package.json and run:
      npm install
   (needs Node.js; it downloads about 1 GB the first time. Close any old project windows first.)
3. Start the studio:
      npx remotion studio src/index.ts
   You should see a blue screen that says STUDIO READY. If you do, the setup works.

IF SOMETHING FAILS
   Copy the red error text and paste it to Claude.

WHAT IS INSIDE
   src/index.ts, src/Root.tsx        the project entry; each video is registered in Root.tsx
   src/videos/_engine_template/      the engine (world, characters, ink, blur, grade). Copy this folder
                                     to src/videos/<yourvideo>/ for every new short. Do not edit the original.
   public/library/                   filled for each video by tools/pick-assets.mjs
   tools/pick-assets.mjs             copies only the characters and outfits a video needs from
                                     Desktop\shorts-library (run:  node tools/pick-assets.mjs cast-sheet.json)
   scripts/, audio/                  still-image renderer, comparison sheets, QA, and the sound generator (Python)
   ENGINE_*                          the engine author's example script and MIT licence

BEFORE RENDERING
   Every Remotion render copies public/ into your temp folder and never cleans it. If your C: drive is small,
   run  set TEMP=D:\remotion-tmp  and  set TMP=D:\remotion-tmp  first (use any big drive), and delete old
   remotion-webpack-bundle-* folders from time to time.

NOT INCLUDED
   The engine's free prop models (Kenney, CC0): the engine looks for public/bridge/kenney/*.glb and skips
   what it cannot find. Add them later if Claude asks.

FOR CLAUDE, BEFORE EVERY VIDEO: read  src\house\START-HERE.md  (the order of work, the rules, and the place library
src\engine\places.ts that every video must take its places from).

BANK 2: "The pants bet" REMAKE (R3KNRF, 59.75 s, new voice). Uses the shared engine (src\engine) and the pictures in public\bank.
1. Open cmd here:            cd C:\Users\Arian\Desktop\studio\src\videos\bank2
2. A few stills (test):      node render.mjs 0,330,600,840,1005,1180,1317,1446,1650,1776   -> studio\out\frames-bank2\
3. Whole video (muted):      node render.mjs            -> studio\out\bank2.mp4
4. Finish check:             node ..\..\engine\qa.mjs
5. Stopped half way?         set RESUME=1   then   node render.mjs
6. GPU not used / error?     set ANGLE=gl   then try again.  Final upload quality: set FINAL=1
Files: story.ts (time, people, camera, faces, talking, effects), world.ts (hall, office + monitor, fantasy, props, hands, light),
tex.ts (painted textures), video.ts (the security-camera look of the object transition).
The old quick version (stretched to the new voice) is backed up in src\videos\_old\bank2-warp\.

NEW VIDEO = copy this folder.
1. Copy  src\videos\_new-video  and rename the copy, e.g.  src\videos\my-video   (the name becomes the mp4 name)
2. Change, in this order:
     story.ts    length, camera shots, white flashes, faces, prop timings, LOOP on/off
     world.ts    the place, the props, who is in it (CAST)
     words.json  your voice timing (captions). Empty  []  = no captions
3. Test stills:   cd C:\Users\Arian\Desktop\studio\src\videos\my-video
                  node render.mjs 0,60,120
4. Whole video:   node render.mjs        -> studio\out\my-video.mp4  (muted)
   Stopped?  set RESUME=1  then  node render.mjs.   GPU error?  set ANGLE=gl.   Final quality:  set FINAL=1
The engine (ink, blur, glow, colour, captions, characters, render) is shared in  src\engine.  Do not copy it.
Characters come from public\library (fill it with:  node tools\pick-assets.mjs <cast-sheet>.json).

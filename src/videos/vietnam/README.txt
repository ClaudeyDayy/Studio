NEW VIDEO = copy this folder.   (THE 3D LOOK: 3D bodies, 2D drawn heads, a world with no outlines and real light)
The old 2D template (flat cards, ink outlines) is kept in  src\videos\_old\new-video-2d  (copy it into src\videos first to use it).

1. Copy  src\videos\_new-video  and rename the copy, e.g.  src\videos\my-video   (the name becomes the mp4 name)
2. Pick the people and their 3D clothes:
     edit cast-sheet.json (who + outfit), then in  C:\Users\Arian\Desktop\studio  run:
        node tools\pick-assets.mjs src\videos\my-video\cast-sheet.json
     3D clothes: cardigan casual dress fisherman hoodie luckytee office police suit teller  (shorts-library\wardrobe3d)
3. Change, in this order:
     story.ts    length, light, camera shots, faces, who talks when, who turns when, prop timings, LOOP on/off
     world.ts    the place, the props, who is in it (CAST = same people and outfits as cast-sheet.json)
     words.json  your voice timing (captions). Empty  []  = no captions
4. Test stills:   cd C:\Users\Arian\Desktop\studio\src\videos\my-video
                  node render.mjs 0,60,120
5. Whole video:   double-click render.bat   (or: node render.mjs)   -> studio\out\my-video.mp4  (muted)
   Stopped?  set RESUME=1  then  node render.mjs.   GPU error?  set ANGLE=gl.   Final quality:  set FINAL=1
The engine is shared in  src\engine  (people: src\engine\cast\player3d.ts).  Do not copy it.

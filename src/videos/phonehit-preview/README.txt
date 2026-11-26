PHONE HIT PREVIEW, New York area (2026-11-16): 5.7 s, muted.
250 km up over the curve of the Earth (black space at the top), the whole New York area, the red stroke round it, the dive about 5 m behind the phone
down to the Midtown avenue, the very fast pull-back, and the white flash that spreads over the whole area.
region.ts = shared kit (curved ground, red stroke, the New York map, the Gulf map). The detailed Manhattan comes from ../cityhit-preview/city.ts.
  cd /d %USERPROFILE%\Desktop\studio\src\videos\phonehit-preview
  set FORMAT=png            (the white frames need png)
  node render.mjs           ->  studio\out\phonehit-preview.mp4
  node render.mjs 10,75,100,138,150   a few stills
Before a new render: move the old frames away:  mv out\frames-phonehit-preview out\_oldN-frames-phonehit-preview

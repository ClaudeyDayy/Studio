CHESS2: "Infinite chess" v4, now on the shared engine (src\engine). Same picture as before (checked pixel by pixel).
1. Open cmd here:            cd C:\Users\Arian\Desktop\studio\src\videos\chess2
2. A few stills (test):      node render.mjs 0,45,126,265,1695,2016   -> studio\out\frames-chess2\
3. Whole video (muted):      node render.mjs            -> studio\out\chess2.mp4
4. Stopped half way?         set RESUME=1   then   node render.mjs
5. GPU not used / error?     set ANGLE=gl   then try again.  Final upload quality: set FINAL=1

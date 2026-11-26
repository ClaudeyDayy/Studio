3D CLOTHES (2026-11-11) for the 3D look (studio engine: src\engine\cast\player3d.ts).
Every folder is the 3D version of the same outfit in ..\wardrobe (the 2D versions stay there for old videos):
  front.png   the front of the outfit with the painted light and shadow taken out (the real 3D light shades it now)
  back.png    the back, the same way
  body.json   the body shape (half width per picture row, depth) the engine builds the 3D body from
  hat_<name>_front/back.png  (police, fisherman) copied in by pick-assets when the outfit has its own hat
outfits3d.jpg shows all ten on a 3D body.
A NEW outfit: draw torso_front.png + torso_back.png in ..\wardrobe\<name> (same 600x1000 layout as the others),
then Claude runs  tools\make_wardrobe3d.py  to make its 3D version here.

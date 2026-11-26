# make_blank.py - head picture WITHOUT eyes, brows and mouth (for the engine's drawn, morphing faces)
# usage: python make_blank.py head_neutral.png head_blank.png [face.json]
# Finds the skin area (flood fill from the face centre), paints every dark feature inside it with the exact skin
# colour, keeps the outline, hair and anything outside the skin untouched, and writes face.json (head circle in px).
import sys, json
from PIL import Image
import numpy as np
from scipy import ndimage

SKIN = (0xFC, 0xF2, 0xEA)
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA"); a = np.array(im).astype(np.int16)
H, W = a.shape[:2]
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
lum = (r * 3 + g * 6 + b) / 10
sat = np.max(a[..., :3], -1) - np.min(a[..., :3], -1)
skinish = (al > 200) & (lum > 200) & (sat < 40)
lab, n = ndimage.label(skinish)
# the face = the biggest light region in the upper half
sizes = ndimage.sum(skinish, lab, range(1, n + 1))
face = lab == (1 + int(np.argmax(sizes)))
# holes in the face (eyes, brows, mouth) = everything enclosed by the face region
filled = ndimage.binary_fill_holes(face)
ys, xs = np.nonzero(filled)
# close small gaps at the sides (a feature touching the outline would not be a hole)
holes = filled & ~face
holes = ndimage.binary_dilation(holes, iterations=2) & filled
out = a.copy()
out[holes | (face & ~ndimage.binary_erosion(face, iterations=0) )] = (*SKIN, 255)
# whole skin area to the exact skin colour (keep a 2 px band next to the outline as drawn, for soft edges)
core = ndimage.binary_erosion(filled, iterations=3)
out[core] = (*SKIN, 255)
Image.fromarray(out.astype(np.uint8)).save(dst)
x0, x1, y1 = int(xs.min()), int(xs.max()), int(ys.max())
r_ = (x1 - x0) / 2; cx = (x0 + x1) / 2; cy = y1 - r_
# where the old features were (so the drawn face sits in the same place): mouth = lowest part, eyes = the two
# biggest parts above it; given in head-radius units like the engine's FaceRig
fl, k = ndimage.label(filled & ~face)
parts = []
for i in range(1, k + 1):
    py, px = np.nonzero(fl == i)
    if len(px) < 30: continue
    parts.append({"x": px.mean(), "y": py.mean(), "n": len(px), "w": px.max() - px.min()})
rig = {}
if parts:
    mouth = max(parts, key=lambda q: q["y"])
    rest = sorted([q for q in parts if q is not mouth and q["y"] < mouth["y"] - 10], key=lambda q: -q["n"])[:2]
    rig["mouthY"] = round(float((mouth["y"] - cy) / r_), 3)
    if len(rest) == 2:
        rig["eyeX"] = round(float(abs(rest[0]["x"] - rest[1]["x"]) / 2 / r_), 3)
        rig["eyeY"] = round(float(((rest[0]["y"] + rest[1]["y"]) / 2 - cy) / r_ - 0.06), 3)
info = {"head": {"cx": round(cx, 1), "cy": round(cy, 1), "r": round(r_, 1)}, "skin": "#%02X%02X%02X" % SKIN, "rig": rig}
if len(sys.argv) > 3: json.dump(info, open(sys.argv[3], "w"), indent=2)
print(src, "->", dst, info)

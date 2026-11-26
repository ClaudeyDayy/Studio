# Makes the 3D version of every outfit in shorts-library/wardrobe -> shorts-library/wardrobe3d/<outfit>/
#   front.png, back.png  the cloth with the painted shading taken out (the real 3D light shades it now), edges filled
#   body.json            the body shape: half width of the bean per picture row, depth, crop box
# The engine (cast/player3d.ts) wraps front.png round the front half of a 3D bean and back.png round the back half.
# Run (Claude runs it in the cloud; needs python + numpy + pillow):  python make_wardrobe3d.py <shorts-library folder>
import json, os, sys
import numpy as np
from PIL import Image

LIB = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..")
SRC, DST = os.path.join(LIB, "wardrobe"), os.path.join(LIB, "wardrobe3d")
BOX = (180, 440, 420, 750)          # crop box in the 600x1000 library pictures (x0, y0, x1, y1)
SCALE = 2                           # textures are saved at 2x for sharp close-ups
DEPTH = 0.75                        # front-to-back depth of the bean / its width


def blur(a, r):
    k = np.exp(-0.5 * (np.arange(-3 * r, 3 * r + 1) / r) ** 2); k /= k.sum()
    a = np.apply_along_axis(lambda v: np.convolve(v, k, "same"), 0, a.astype(np.float64))
    return np.apply_along_axis(lambda v: np.convolve(v, k, "same"), 1, a)


def deshade(rgba):
    """Divide out the painted light: the big smooth light/dark field on the main cloth colour."""
    rgb, a = rgba[..., :3].astype(np.float64), rgba[..., 3].astype(np.float64) / 255
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722]) + 1.0
    solid = a > 0.5
    chrom = rgb / (rgb.sum(-1, keepdims=True) + 1e-6)
    # main cloth colour: the most common colour (quantised) inside the shape
    q = (rgb[solid] // 16).astype(int)
    keys, counts = np.unique(q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2], return_counts=True)
    k = keys[counts.argmax()]
    sel = solid & ((rgb // 16).astype(int)[..., 0] * 256 + (rgb // 16).astype(int)[..., 1] * 16 + (rgb // 16).astype(int)[..., 2] == k)
    base_chrom, base_lum = np.median(chrom[sel], 0), np.median(lum[sel])
    # every pixel of (about) that hue tells how much light was painted there
    near = solid & (np.abs(chrom - base_chrom).sum(-1) < 0.07) & (lum > 4)
    # painted highlights are paler (less saturated) versions of the cloth: same HUE counts as cloth too
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1)
    def hue(c):
        r, g, b = c[..., 0], c[..., 1], c[..., 2]
        mxx, mnn = c.max(-1), c.min(-1); dd = np.maximum(mxx - mnn, 1e-6)
        h = np.where(mxx == r, ((g - b) / dd) % 6, np.where(mxx == g, (b - r) / dd + 2, (r - g) / dd + 4))
        return h / 6
    bc = np.median(rgb[sel], 0)
    bsat = (bc.max() - bc.min()) / max(bc.max(), 1)
    if bsat > 0.25:
        dh = np.abs(hue(rgb) - hue(bc[None, None, :]))
        dh = np.minimum(dh, 1 - dh)
        near |= solid & (dh < 0.045) & (sat > 0.25 * bsat) & (lum > 4)
    # cloth pixels: the flat cloth colour times only their FINE detail (seams, ribbing, lapel lines stay; the broad
    # painted light and dark bands go). Fine detail = the pixel against its 3 px neighbourhood of cloth pixels.
    m = near.astype(np.float64)
    local = blur(np.where(near, lum, 0), 3) / np.maximum(blur(m, 3), 1e-4)
    d = np.clip(np.where(near, lum / np.maximum(local, 1), 1), 0.3, 2.6)
    base = np.median(rgb[sel], 0)
    # near the outline the painted light bands leave thin seams; they would wrap round the 3D sides as swirls: fade fine
    # detail out over the outer ~24 px of the shape (cloth there is the plain cloth colour)
    dist = np.zeros(solid.shape); cur = solid.copy()
    for i in range(1, 30):
        cur = cur & np.roll(cur, 1, 0) & np.roll(cur, -1, 0) & np.roll(cur, 1, 1) & np.roll(cur, -1, 1)
        dist += cur
    edge = np.clip((dist - 6) / 18, 0, 1)
    d = 1 + (d - 1) * edge
    out = rgb.copy()
    out[near] = np.clip(base[None, :] * d[near][:, None], 0, 255)
    # other colours (badges, ties, collars): only the broad painted field is divided out
    ratio = np.where(near, lum / base_lum, 0)
    S = blur(ratio, 14) / np.maximum(blur(m, 14), 1e-4)
    w = np.clip(blur(m, 14) / 0.15, 0, 1)
    S = np.clip(S * w + (1 - w), 0.9, 1.25)
    out[~near] = np.clip(rgb[~near] / S[~near][:, None], 0, 255)
    return out, a


def fill_edges(rgb, a, n=10):
    """Solid inside the shape, and the cloth colour pushed outward a few px so the 3D edge never samples the background."""
    solid = (a > 0.5).astype(np.float64)
    col = rgb * solid[..., None]
    w = solid.copy()
    for _ in range(n):
        nb = sum(np.roll(np.roll(col, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        nw = sum(np.roll(np.roll(w, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        grow = (w == 0) & (nw > 0)
        col[grow] = nb[grow] / nw[grow, None]
        w[grow] = 1
    return col


def shape(a):
    """half width (px) of the shape per picture row, measured from the centre column 300"""
    solid = a > 0.5
    rows = np.where(solid.any(1))[0]
    top, bot = int(rows.min()), int(rows.max())
    hw = []
    for y in range(top, bot + 1):
        xs = np.where(solid[y])[0]
        hw.append(round(float(max(300 - xs.min(), xs.max() + 1 - 300)), 1))
    return top, bot, hw


os.makedirs(DST, exist_ok=True)
names = sorted(d for d in os.listdir(SRC) if os.path.isfile(os.path.join(SRC, d, "torso_front.png")))
for name in names:
    os.makedirs(os.path.join(DST, name), exist_ok=True)
    info = None
    for side in ("front", "back"):
        p = os.path.join(SRC, name, f"torso_{side}.png")
        if not os.path.exists(p):
            p = os.path.join(SRC, name, "torso_front.png")
        rgba = np.array(Image.open(p).convert("RGBA").resize((600, 1000)))
        rgb, a = deshade(rgba)
        col = fill_edges(rgb, a)
        x0, y0, x1, y1 = BOX
        im = Image.fromarray(col[y0:y1, x0:x1].astype(np.uint8), "RGB")
        im = im.resize(((x1 - x0) * SCALE, (y1 - y0) * SCALE), Image.LANCZOS)
        im.save(os.path.join(DST, name, f"{side}.png"), optimize=True)
        if side == "front":
            top, bot, hw = shape(a)
            info = {"version": 1, "box": list(BOX), "scale": SCALE, "top": top, "bottom": bot, "halfWidth": hw, "depth": DEPTH,
                    "from": f"wardrobe/{name}/torso_front.png + torso_back.png"}
    with open(os.path.join(DST, name, "body.json"), "w") as f:
        json.dump(info, f)
    print("3D outfit:", name)

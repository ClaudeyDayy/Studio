# Old Ava: the library Ava heads with grey hair. Keeps the outer outline and the face edge dark (no light dots),
# makes the skin one flat colour (so the talking-mouth cover matches exactly), no wrinkle lines.
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
SRC="/home/claude/lib/cast/ava/faces/"; OUT="/home/claude/studio/public/bank/cast/ava/"
SKIN=np.array([110,69,47])
def grey(name, out):
    a=np.array(Image.open(SRC+name).convert("RGBA")).astype(float)
    al=a[...,3]>40
    mx=a[...,:3].max(2); mn=a[...,:3].min(2); lum=0.3*a[...,0]+0.59*a[...,1]+0.11*a[...,2]
    neutral=(mx-mn)<30
    skin=al&((a[...,0]-a[...,2])>35)&(lum>40)
    face=ndi.binary_fill_holes(ndi.binary_closing(skin,iterations=6))
    dskin=ndi.distance_transform_edt(~face) if face.any() else np.full(lum.shape,99.0)
    dedge=ndi.distance_transform_edt(a[...,3]>200)              # distance from the transparent outside
    hair=al&neutral&(lum>=14)&(lum<120)&(dskin>7)&(dedge>11)
    line=al&neutral&(lum<14)&(dskin>7)&(dedge>11)                # curl lines inside the hair
    v=np.clip(150+(lum-14)*2.3,0,244)
    for ch,k in enumerate([0.955,0.965,1.03]):
        c=a[...,ch]; c[hair]=np.clip(v[hair]*k,0,255); c[line]=[78,74,92][ch]
    # flat skin: every pixel close to the skin colour becomes exactly the skin colour
    d=np.sqrt(((a[...,:3]-SKIN)**2).sum(2)); flat=face&(d<40)
    for ch in range(3): a[...,ch][flat]=SKIN[ch]
    Image.fromarray(a.astype(np.uint8),"RGBA").save(OUT+out)
for f in ["neutral","smug","shock","grin"]: grey(f"head_{f}.png", f"{f}.png")
grey("ava_back.png","back.png")

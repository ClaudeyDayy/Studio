NEEDLE VIDEO - approved props (2026-11-16)
Unpack this on the Desktop, so the folders land in  Desktop\studio  and  Desktop\shorts-library.
New:  studio\src\videos\needle-preview   (moon, sky, sun, planets, galaxies, rocket, gun, phone, Max and Ava)
      studio\public\needle-preview       (logo, clear helmets)
      shorts-library\wardrobe\astro_max, astro_ava   + wardrobe3d\astro_max, astro_ava   (suits, 50% wider)
      shorts-library\hats\bubble          (clear helmet drawings)
Changed: shorts-library\cast\ava\faces    (small eyelashes). The old faces are in cast\ava\faces_before_lashes.
Test on the PC:  cd Desktop\studio
                 node tools\pick-assets.mjs src\videos\needle-preview\cast-sheet.json
                 cd src\videos\needle-preview
                 node render.mjs 45,105,165,228,285

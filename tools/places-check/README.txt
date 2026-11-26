PLACE LIBRARY CHECK (no Chrome, no render, a few seconds). Run it after every change to src\engine\places.ts:
    cd Desktop\studio
    node --import ./tools/places-check/reg.mjs tools/places-check/smoke.ts
It builds every piece and both whole places and prints their size, where they sit, how many meshes they have and any broken
numbers. If it prints an error, the library is broken: fix it before any still. Add a line to smoke.ts for every new builder.

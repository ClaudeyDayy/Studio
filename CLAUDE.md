# Notes for Claude Code — Arian's studio

Read this first in every session. Written by Claude (claude.ai chat, MAP creation project), 17 Nov 2026.

## Who and how
- Arian, 22, Iran. Makes animated 9:16 story shorts (~60 s) for YouTube.
- Answer **very short, in plain words**. He is not a programmer.
- **Ask him before you create or change anything.** (Exception: the 12 fixes in `src/house/FINAL-PLAN.md` — he already said yes.)
- He adds all sound himself. Deliver a **muted mp4**.
- For every new video, ask whether it should **loop** (ending returns to the opening). Not a default.
- Do not rebuild a skill file after every change. Keep a running list in `src/house/SKILL-CHANGES.md`; build the skill only when he says he is ready.
- Places and props stay **general**, never copied from a reference.

## The studio (this folder)
- `C:\Users\Arian\Desktop\studio` — his own plain three.js engine, rendered by his Chrome GPU (see `src/engine/README.txt`, `render.mjs`).
- Library: `C:\Users\Arian\Desktop\shorts-library`.
- Read `src/house/START-HERE.md` and `src/house/look.ts` before any video work.
- The engine copy inside the old `fable5-2` skill is **older** than this studio. Never copy it over the studio.

## Hard rules
- The studio is shared with a video in progress. **Old videos must render exactly the same.** New features are opt-in only.
- **Copy an engine file before changing it:** `src/videos/_old/<file>-before-<what>.<ext>`.
- **Camera never jumps or cuts.** It only flies, like a drone. Shot changes = whip pans. No fades, no dissolves. One exception: a dream scene (camera flies into a head).
- Edit files in place; never retype a whole file.

## The world map
- One shared town map: `src/map/town.ts` → `buildTown(root, out)`. Main street (4 shops + bank) and a street of 4 houses running north from a corner.
- Places come from the library `src/engine/places.ts`. Never build a place from scratch in a video folder; add missing places to the library first.
- Grow the map slowly: one or two new places per video.
- Not rendered yet. First step there: one still of the town (ask before making the test video).

## Current work: the 12 fixes
- Full plan: `src/house/FINAL-PLAN.md`.
- Progress log: bottom of `src/house/SKILL-CHANGES.md`, lines starting `FINAL:`. Add one line after each finished fix.
- Done so far: flaw 2 only (not a flaw). Drafts waiting, **not in the engine, not tested**: `out/_final-wip/drone.ts` (flaw 1) and `out/_final-wip/final.ts` (the opt-in switch).
- New: you run on his PC, so you **can** run the Chrome renders yourself now (the plan says Arian runs them; that was for the cloud chat).

## Blender (new, 17 Nov)
- Blender 5.3 with the official Blender Lab MCP add-on (server auto-starts on port 9876). Connected to you as the `blender` MCP server.
- His GPU: RX 580 8GB. Eevee works; Cycles cannot use this GPU (CPU only, slow). Use Eevee.
- Blender is only being **tested** for now. three.js stays the main studio until Arian decides. Test in a new, empty scene; never touch the studio for Blender tests.

## End of each session
- Add a short dated line to `src/house/SESSION-LOG.md`: what was done, what is next. (The cloud chat reads it.)

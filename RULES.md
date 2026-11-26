# RULES — read this first, in every chat, with every model

Arian's rules for his video shorts, all in one place. Written 2026-11-26.
More detail lives in: `src/house/START-HERE.md` (how to work), `src/house/look.ts` (his look numbers),
`src/house/OUTDOOR-RULES.md` (outdoor look), `src/house/FINAL-PLAN.md` (the 12 fixes).
**Full rules:** `docs/RULES-all-in-one.md` (all the numbers and details). If this file and that one disagree, that one wins.

---

## 1. How to talk to Arian
- Very short, slow, plain answers. He is not a programmer.
- **Ask before you create or change anything.**
- **Stop and ask before making any visuals.** It is its own step, so he can switch models.
- For every new video, ask: **should it loop?** (the end returns to the opening). Not a default.
  Also ask: how many **object transitions** (0-3)? **Captions** yes or no?
- He adds all sound himself (voice, music, effects). Always deliver a **muted mp4**.
- Do not rebuild a skill file after every change. Keep a running list in `src/house/SKILL-CHANGES.md`.
  Build the skill only when he says he is ready.
- Prompts for Claude Code: long, several steps at once, given in the chat to paste (not saved as files).
- He picks the story. Claude writes the code. Arian supplies `words.json` (voice timing).

## 2. Where things are
- This GitHub repo: `ClaudeyDayy/Studio` (private). It holds the studio and `shorts-library`.
- On his PC: `F:\OLD STUDIO` (older notes say Desktop\studio or D:\Studio; those are out of date).
- Left out of GitHub: `src/videos/_old` (old backups, an old Chrome cache).
- New chat: pull this repo, read this file, then `src/house/START-HERE.md` and `src/house/look.ts`.

## 3. The workflow (new method, from 2026-11-19)
1. **Story first.** Check it against the script structure (section 4). Ask: loop or not.
2. **List the places** the story needs; match them to the place library (`src/engine/places.ts`). Tell him the list.
3. **Ask before visuals.**
4. **Build the whole scene in code** (three.js engine in the browser). Flaws are fast to find and fix there.
5. **Stills first** at 1080x1920. Fix flaws one at a time.
6. Whole video only when the stills are right. **Final render at 2K (1440x2560).**
7. **Then Blender, for polish only:** real materials, sunlight, haze, depth of field, dust.
   Motion and camera are locked from the code version. In Blender use **Eevee** (his RX 580 can't run Cycles).
- Previews must be fast. A 2-hour preview is too slow. Heavy renders run on his PC, not in the cloud. Ask first if unsure.
- The needle video stays on the old workflow. New method is for new videos.

## 4. Script structure (from his reference channel study, STYLE_BIBLE.md)
Hook → setting → escalation → mystery beat → **"You see,"** pivot → ironic payoff.
Brainstorm ideas that follow the reference's virality rules. About 60 s, 9:16.

## 5. Camera (the most important part for him)
- **Never cuts or jumps by itself.** It flies through the 3D world like a drone. Few cuts, long chained moves.
- Most joins are **matched dissolves** (one shape becomes the next), 6-12 frames, camera keeps moving. Land them between sentences.
- 0-1 hard cuts per video (only if he says yes). **Whip pans are rare** (about 0.5 per minute); a video can have none.
- A big change of view direction (more than about 30°) is a matched dissolve, not a camera swing.
- No long white flashes (a time jump = 6-frame white flash).
- Smooth flights that don't stop at every shot. No still hold longer than 1.5 s (holds creep in slowly).
- **Mostly eye level:** camera about 0.8 × character height (people are 1.2 m, so about 1 m). Horizon near mid-frame.
  About 80 % of shots eye level. No roll over 5°.
- The lens never comes closer than **0.3 m** to anything.
- **Lens blur on about 1/3 of shots** (close, medium, inserts). In about 1/3 of close shots, a soft blurred object in the foreground.
- **About 1 shot in 5 is an insert:** a close-up of one object (a hand, a sign, money) for 1.5 to 3 s, with blur.
- When the camera circles something, freeze the sun direction (no spinning shadows).
- One exception to "no cuts": a **dream** (the camera flies into a head and comes out in the dream).

## 6. People
- Main cast: **Arian** (white man, neat short brown hair), **Max** (white man, messy brown hair, thick moustache, often the police),
  **Ava** (Black woman, curly hair, round glasses). Clothes carry the role; a character can change outfits in one video.
- **3D bodies, 2D drawn heads.** Never treat the whole person as one flat card. Never squeezed or thin side-on.
- Heads not perfectly round. Head shapes and skin colours exactly as in the **pants-bet remake of the bank video (bank2)**:
  warm cream skin, dark warm-brown outline.
- Eyes open in most frames. Still eyes = a curved lid line with a dot under it, so they can look around.
- Faces change **smoothly** (eyes and mouth move into the new shape, small head wobble). Never snap.
  Set: neutral, happy, angry, stressed, sad, scared, surprised, confused, squeezed-eyes grin, closed-eyes smile.
- Talking: lips roughly match the words; mouths show **teeth and tongue** (never a black hole);
  people talking **look at each other**.
- Ava has her **small eyelashes** whenever she plays a young person. No lashes only when she plays an old woman.
- Every person and object casts **strong, clean shadows**, in every scene.
- The police outfit is a favourite. Use it.

## 7. The world
- **Never build a place from scratch in a video folder.** Use the place library. Missing place → ask, then add it to the library first.
- One shared town map: `src/map/town.ts`. Grow it slowly, one or two places per video.
- **American** houses, shops, banks and streets, unless the story names another country.
- **Never plain coloured boxes.** Everything detailed: walls, roofs, textures, props. Layered: textures, 3D props, painted far background.
- Places and props are **general**. Never copy a reference's shop or props (they were examples only).
- **Outlines:** indoors everything outlined. Outdoors only small details (doors, windows, walkways, lamps, signs, posts).
  Walls, roofs, ground, roads have no outline and get texture (brick, planks, plaster).
- **Trees** fit the climate. One main kind, a few of a second. Never all identical, never a random mix.
- **One accent colour per place** (usually red). No random colours. Cars mostly muted.
- **Night streets are wet:** they reflect lamps and windows as long streaks.
- His **MAX FILMS logo** (`shorts-library/logo`) can be printed on objects, Zack D Films style. Test on one frame first.

## 8. Light
- In the new method, the browser stage uses **rough plain colours only**. Blender adds colours, materials and light at the end.
- **Strong golden direct sun** in every outdoor scene: sharp shadow edges, visible light shafts (clean, like the bank video).
- Indoors: **sun patches** from windows with sharp bar shadows on tables, shelves, walls (fake bounce: sun shadows + warm fill + glow).
- **Street lamps really shine:** they light the whole area around them, warm.
- Sky always a gradient. Sunset coral to gold. Night saturated blue, never black. Few puffy clouds, no outline.
- Mood: day for the normal story, sunset for drama, night-blue for the explanation.
- To test: darker, warmer shadow colour at sunset (show him one still first).
- When he says "keep it for the next videos": change the number in `src/house/look.ts` and add a line to its LOG.

## 9. Studio safety
- **BACKUP FIRST (his rule, 2026-11-26):** before starting a new video, or any big change, copy the whole studio to a backup folder
  (e.g. `F:\OLD STUDIO\backups\studio-<date>-before-<what>`) and check the copy is there. Then start.
- Old videos must render exactly the same. New features are opt-in (`final: true`).
- Copy an engine file before changing it: `src/videos/_old/<file>-before-<what>.<ext>`.
- Edit files in place; never retype a whole file.
- The engine inside the old skills is older than this studio. Never copy it over the studio.
- End of each session: add a short dated line to `src/house/SESSION-LOG.md` (done, and what's next).

# START HERE (for Claude). Read this before every video and whenever you do not know what to do.

Written 2026-11-16, after the needle video took Arian 8 hours and still came out wrong. The cause was not his PC. The
rules existed, but each video built its world from scratch and the rules never reached it. This file and the place
library (`src/engine/places.ts`) exist so that never happens again.

## The one law
**Never build a place from scratch inside a video folder.** A video picks places from the library. If the library does
not have what the story needs, add it to the library first (see "Something is missing"), then use it.
`render.mjs` enforces this: it refuses a video that does not use `engine/places` and does not say why.

## What already exists (use it, do not rewrite it)
| Need | Use | Where |
|---|---|---|
| A street of family houses (lawns, paths, driveways, cars, fences, trees, lamps) | `neighborhood(root, out, {...})` | `engine/places.ts` |
| A small-town main street (shops, awnings, signs, bank, benches, parked cars) | `mainStreet(root, out, {...})` | `engine/places.ts` |
| One building | `house()` `shop()` `bank()` | `engine/places.ts` |
| Road, sidewalk with kerb, crosswalk, ground, path, driveway | `road()` `sidewalk()` `crosswalk()` `ground()` `flat()` | `engine/places.ts` |
| Any stairway (with or without rails) | `stairs({ steps, width, rails })` | `engine/places.ts` |
| Door, sash window with shutters | `door()` `win()` | `engine/places.ts` |
| Fence, mailbox, hydrant, bench, trash can, utility pole and wires, car, pickup | same file | `engine/places.ts` |
| Street lamps that really light the street | `out.lamp(x, z)` | `engine/outdoor.ts` |
| Trees that fit the place | `scatterTrees(root, climate, spots)` | `engine/trees.ts` |
| Sky, sun, clouds, far hills, haze, rain, snow, light shafts | `new Outdoor(root)` + `out.light(...)` | `engine/outdoor.ts` |
| Indoor light | `houseLight(...)` | `engine/outdoor.ts` |
| Wall pictures (siding, brick, plaster, planks, shingles, asphalt, concrete) | `wallTex()` `sidingTex()` ... | `engine/places.ts`, `engine/outdoor.ts` |
| His standing look numbers (sun, shadows, outlines, lamps, trees, whip pans) | `HOUSE` | `house/look.ts` |
| People, outfits, faces, talking | `Player3D`, cast, wardrobe | `engine/cast/`, `shorts-library` |
| Camera shots, whip pans, kicks, loop helper | `makeCamera`, `whip.ts` | `engine/core/` |
| A working example of all of it | `src/videos/_places-test` | |

Windows glow at night: call `windowsLit(this.out.night)` every frame.

## Order of work for a new video (keep to it; it is what makes a video take an hour, not a day)
1. **Ask first:** the story, and whether the video loops (the end returns to the opening). Check his story against the
   reference rules (STYLE_BIBLE.md in `ricks-research`: hook, setting, escalation, mystery beat, "You see," pivot, ironic payoff).
2. **List the places** the story needs and match each one to the library table above. Tell him the list. Anything not in
   the table goes through "Something is missing" below.
3. **Stop and ask before making any visuals.** This is its own step: he may switch models for it.
4. Copy `src/videos/_new-video`. Write `story.ts` (camera, timings) and `world.ts` (pick places, stand people on
   `place.walk[i]` / `place.doors[i]`). He supplies `words.json` (voice timing).
5. `node render.mjs check` (camera through things, flickering ground). Then **stills first**: `node render.mjs 0,60,120`.
   Fix flaws one at a time on stills, at 1080x1920.
6. Whole video only when the stills are right. **Final render at 2K:** `set RES=2k`. Always a **muted mp4**: he adds all sound.
7. Renders run on **his PC** in cmd (he pastes errors back). **Never render or do anything heavy on the cloud GPU** (renders, long frame batches, big texture bakes): it is far too slow and not his. If a cloud render ever seems needed, ask Arian first.

## Rules that must hold in every video
- **Camera:** it never cuts or jumps by itself; it flies through the 3D world. Shot changes are whip pans. No fades, no
  dissolves, no long white flashes. The lens never comes closer than 0.3 m to anything.
- **Outlines:** indoors everything is outlined. Outdoors only small details (doors, windows, posts, rails, steps, kerbs,
  lamps, signs). Walls, roofs, ground and roads have no outline and are textured. The library already does this.
- **World style:** American houses, shops, banks and streets unless the story names another country. Never plain
  coloured boxes. Places and props are general: never copy a reference picture's shop or props.
- **Trees:** they fit the climate of the place; one main kind, a few of a second; never all identical.
- **Light:** strong golden direct sun in every outdoor scene; strong, clean shadows for every person and object in every
  scene; street lamps brighten the whole area warmly; indoors, sun patches from windows with sharp bar shadows.
- **People:** 3D bodies, 2D heads, never squeezed or side-on thin. Heads are not perfectly round; skin and outline
  colours and head shapes as in the pants-bet (bank2) video. Eyes open; faces change smoothly; talkers look at each other;
  mouths show teeth and tongue. Ava has her small eyelashes whenever she plays a young person.
- **Logo:** his MAX FILMS logo can be printed on objects: test on one frame first, then on the objects he picks.
- **Props:** an object built at the world centre and not moved shows up in every place at the origin: hide or move props outside their own place.
- **Orbits:** when the camera circles something, freeze the sun direction (no spinning shadows).
- **Scale:** people are 1.2 m tall. `SIZE` in `engine/places.ts` has the door, storey, window and step sizes.

## Something is missing (a school, a diner, a gas station, a farm, a harbour, a room)
1. Say so to Arian in one line and ask before building it.
2. Build it **in `engine/places.ts`** as a general builder with options and a seed (not in the video folder), from the
   pieces already there (`big`, `box`, `boxes`, `tbox`, `flat`, `door`, `win`, `stairs`).
3. Add it to `tools/places-check/smoke.ts` and run the check (a few seconds, no render):
   `node --import ./tools/places-check/reg.mjs tools/places-check/smoke.ts`
4. Add a view of it to `src/videos/_places-test` and have him render that one still.
5. Add one line to the LOG at the bottom of `engine/places.ts` and one row to the table above.

**Not in the library yet (2026-11-16):** indoor rooms (bank hall, kitchen, office, shop interior), school, police station,
church, hospital, diner, gas station, farm, city towers, nature places (forest, beach, mountain road).

## Views the library cannot cover (space, the whole Earth, maps, a dive from orbit to a street)
The needle video's Earth scenes were flat map pictures stretched over the ground; from close up they looked garbled.
- Ask Arian before choosing such a view, and show one still of it before building the rest.
- Keep high views high: do not let the camera land on a stretched picture. Where the camera comes close to the ground,
  the ground must be a real library place.
- Put `// PLACES-EXEMPT: <reason>` in that video's `video.ts` only when the video truly has no place on the ground.

## When a look change must stay for the next videos
Change the number in `house/look.ts` and add a line to its LOG. Add one dated line to `house/SKILL-CHANGES.md`.
Do not rebuild or propose the skill file after each change: keep the list and build it only when he says he is ready.

# Hand-off: remake the Vietnam video with the house rules (written 2026-11-15)

Goal: a new folder `src\videos\vietnam3`, same story, script and voice as `vietnam2`, built on the NEW shared pieces.
Do not change `vietnam` or `vietnam2`. Ask Arian before building; show one still per scene before any full render.

Read first, in this order:
1. The fable5-2 skill (SKILL.md, section 5b).
2. `src\house\look.ts` (his standing look: sun, shadows, outlines, lamps, trees, world style) and `src\house\OUTDOOR-RULES.md`.
3. `src\videos\_outdoor-test\world.ts` (how a place uses the outdoor kit) and `src\videos\vietnam2` (story.ts, world.ts, props.ts).

What changes against vietnam2:
- Sky, clouds, far mountains, haze, sun rules, shadow box: delete vietnam2's own code for these and use
  `this.out = new Outdoor(this.root, { far: "hills", hazeTint: "#4C8C52" })` and `this.out.light(...)` every frame.
  The tent and the tunnels are INDOOR places: put each in a group with `userData.indoor = true` and light it with `houseLight`.
- `video.ts`: `ink: true, inkOptions: HOUSE.line`, `bloom: HOUSE.bloom`, `near: 0.2, far: 900`.
- Outlines: indoors everything; outdoors only small details. The engine removes outlines from big outdoor surfaces by itself.
- Trees: `scatterTrees(root, "tropical", spots)` (palms, umbrella trees, bushes). The jungle has many trees: keep it to a few
  hundred, or ask before going higher.
- Lamps: `this.out.lamp(x, z)` where a place has lamps (they switch on by themselves when it is dark).
- Talking: every spoken line gets `to`; use `makeTalkEyes` + `lookEyes` so talkers look at each other.
- This story is set in Vietnam, so the world style is Vietnamese, not American (HOUSE.world says: unless the story names another country).
- Keep from vietnam2: story.ts timings, words.json, cast, props.ts, the two object transitions, camera shots.

Not tested yet: a video that mixes indoor and outdoor places; snow; more than about 6 lit lamps in view.
After building: `node render.mjs check`, then stills, then his review.

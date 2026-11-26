# Changes to put into the fable5-2 skill (rebuild the skill file only when Arian says he is ready)

- 2026-11-15  WHIP PANS: every shot change that used to be a matched dissolve is a whip pan (engine/core/whip.ts, HOUSE.whip).
  The template uses it. Rule 2 of the skill ("matched or camera-led") becomes: whip pan by default; object transitions stay.
- 2026-11-15  Logo: his MAX FILMS logo (shorts-library/logo, polished version) can be printed on objects: vietnam3 world.ts stampLogo().
- 2026-11-15  Trees can be INSTANCED (vietnam3 world.ts plantTrees): thousands of trees for little cost. Worth moving into engine/trees.ts.
- 2026-11-15  Bug found: an object built at the world centre and never moved (vietnam3 kitchen plate shards) shows up in every
  place at the origin. Hide props outside their own place.
- 2026-11-15  A drone circle over a crowd: freeze the sun direction while the camera orbits (no spinning shadows).
- 2026-11-16  PLACE LIBRARY: engine/places.ts (neighborhood, mainStreet, house, shop, bank, road, sidewalk, stairs, door, win, fence,
  mailbox, hydrant, bench, car...). The skill must say: read src/house/START-HERE.md first; never build a place from scratch in a
  video folder; a missing place is added to the library first. render.mjs enforces it (engine/guard.mjs). Test: videos/_places-test.
- 2026-11-16  NO FADES: the camera never cuts or jumps by itself, it flies; shot changes are whip pans; no dissolves, no white flashes
  longer than about 0.4 s (the needle video's moon returns faded in over 0.8 to 1.1 s). guard.mjs warns about them.
- 2026-11-16  SPACE / MAP VIEWS (needle lesson): a flat map picture stretched over the ground looks garbled close up. Ask first,
  show one still first, and where the camera comes near the ground use a real library place.
- 2026-11-16  Not in the library yet: indoor rooms, school, police station, church, hospital, diner, gas station, farm, towers, nature.
- 2026-11-16  CLOUD: Claude never renders or does heavy GPU work in the cloud (renders, frame batches, bakes). Renders run on
  Arian's PC; if a cloud render ever seems needed, ask him first. (Also written into START-HERE.md step 7.)
FINAL: 2026-11-16 flaw 2 (shadow under characters) = NOT a flaw: player3d.ts bodies, heads and legs already cast real shadows. Nothing changed.
FINAL: 2026-11-16 STOPPED EARLY (session ran out). Done: flaw 2 only. Drafts NOT yet in the engine and NOT tested: out/_final-wip/drone.ts (flaw 1 drone camera, goes to src/engine/core/) and final.ts (the opt-in switch, goes to src/engine/). Everything else in claude/final-plan.md is still to do. No engine file was changed for the final plan.

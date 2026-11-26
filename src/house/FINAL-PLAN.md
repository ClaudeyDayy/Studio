# FINAL PLAN: fix the 12 flaws + build the skill "Fable 5.2 final"

Copy of the plan from the claude.ai project (MAP creation), 17 Nov 2026. Arian said on 16 Nov 2026: *all 12 flaws must be fixed in the engine and workflow; build a new skill named "Fable 5.2 final"; change the engine / studio folder as needed without asking again.*

**Progress log:** the bottom of `src\house\SKILL-CHANGES.md` — lines starting `FINAL:`. One line is added after each finished fix. Anything without a `FINAL:` line is NOT done.

## Hard rules (still apply)

- The studio (`C:\Users\Arian\Desktop\studio`) is shared with a video in progress. **Old videos and the video in progress must render exactly the same.** Every new behaviour is opt-in.
- Copy an engine file before changing it: `src\videos\_old\<file>-before-<what>.<ext>`.
- The engine inside the old `fable5-2` skill is older than the studio. Never copy it over the studio.
- The camera never jumps or cuts. Places and props stay general (never copied from a reference).
- Arian wants very short, plain answers. He adds sound himself; deliver muted mp4. Ask per video whether it loops.

## Opt-in switch (build this first)

- New file `src/engine/final.ts`: `export const FINAL = { on: false };` (draft: `out/_final-wip/final.ts`)
- `src/engine/video.ts`: add `final?: boolean` to `VideoDef`. `src/engine/main.ts`: set `FINAL.on = !!video.final` before `makeLayer`.
- Everything below that changes the picture reads `FINAL.on` (or an explicit new option). New videos set `final: true`.

## What the studio already has (verified 16 Nov — not flaws)

Two-tone coloured shadows (`post/shade.ts`, presets in `core/lights.ts`), lit character cards with bright faces (`cast/cardlight.ts`, `lit: true`), fog-tinted fading ink (`post/ink.ts`), grade + vignette (`post/grade.ts`), lens blur (`post/lensblur.ts`; a world's `update()` returns `{ focus, cInf }`), sky/clouds/haze/hills/lamps/glowing windows (`outdoor.ts`, `house/look.ts`), whip pans (`core/whip.ts`), place library (`places.ts`, with the `ext` option), the town map (`src/map/town.ts`: `buildTown(root, out)`).

## The reference's outdoor rules (general rules only)

- Sky always a gradient: strong blue top, paler warm horizon. Sunset coral → pink → lilac, never grey. Night saturated blue, never black.
- Shadows are coloured: day ≈ 0.5 × lit, keeping the surface hue; sunset violet-blue (blue 1.3–3 × the lit blue); night navy.
- One scene = one colour family + ONE accent (usually red). At night the accent is warm windows/lamps.
- Faces stay bright (V ≥ .86) and take the scene tint; soft blob shadow under characters by day, long soft shadow at sunset.
- Ground/walls ~80–85 % flat colour, kept alive by shadows, light pools, a few hand marks. Painted lines 3–5 px, lighter than ink.
- Ink: characters heaviest, near props thin, sky/ground/far world none.
- Depth: far world steps lighter/bluer; lens blur on ~1/3 of shots (close/medium/inserts), with a blurred foreground object in ~1/3 of close/medium shots.
- Clouds 1–6, three tones (white top, mid, lavender underside), no outline.
- Night streets are wet: they mirror lamps and windows as long streaks.
- ~22 % of shots are inserts (object close-ups). ~80 % of shots eye-level, camera ≈ 0.8 × character height, horizon near mid-frame.

## The 12 fixes

1. **Drone camera + jump check.** (draft: `out/_final-wip/drone.ts`, untested) New optional `src/engine/core/drone.ts`: `makeDrone(keys, duration, opts)` returning the same shape as `makeCamera` (`camAt, dissolveAt, collapseAt, creepStart, kickAt`). Keys `{ t, pose, hold?, space?, tag? }`. Per-segment cubic Hermite for position and look point; velocity at key i = (p[i+1] − p[i−1]) / (t[i+1] − t[i−1]), clamped to ≤ 1.5 × the slower neighbouring segment's average speed, 0 at the ends and at `hold` keys. **Never one spline through the whole video** (that swung wildly once). fov/blur/roll smoothstep per segment. No `from`, `dissolveAt` always null. A fast turn = a short segment (≥ 0.28 s) with whip blur, still a real move. Dream exception: a key tagged `dream` may change `space` while the lens is inside a head. In `main.ts` `check()`: add `jumps: [{ f, moved }]` to the JSON (existing rule: shot change moving > 0.6 m, or > 2.5 m in one step; skip `dream`). `render.mjs check`: fail when `video.final` and `jumps` is not empty. Test in node: sample `camAt` every frame, assert no step over the limit and frame-to-frame speed ratio ≤ 1.25 at joins.
2. **Shadow under characters.** DONE — not a flaw (player3d.ts bodies already cast real shadows).
3. **Accent colour.** `places.ts`: optional `accent?: string` on `neighborhood`, `mainStreet`, `shop`, `house`, `car`. When set: cars come from a muted list (`#E9E4D8 #3F4349 #8C8F96 #5E6B7A`) and about 1 in 5 cars/awnings/doors takes the accent (default `#C7362F`). Without it, nothing changes. `town.ts` passes it. Add the rule to `house/OUTDOOR-RULES.md`.
4. **Blur rule.** Workflow rule: blur on ~1/3 of screen time — `cInf` 12–14 px close/medium/insert, 8 full shot, 5 wide, 0 for flights and wides; in ~1/3 of close/medium shots put an object at 0.3–0.5 × the focus distance over 10–25 % of a frame edge. In `check()` add `blurShare` (share of frames with `cInf > 0`); warn outside 0.2–0.45.
5. **Stronger sunset shadows** (`core/lights.ts`, only when `FINAL.on`): today lit `[1.95,1.15,0.62]`, shade `[0.42,0.36,0.62]`. Final: shade `[0.28,0.28,0.80]`, lift `[0.035,0.03,0.075]`. Taste call: Arian must see one still.
6. **Day shade** (only when `FINAL.on`): today `[0.62,0.60,0.64]` → `[0.52,0.47,0.50]`. One still.
7. **Wet night streets.** Optional in `outdoor.ts` (e.g. `out.wet = true`): under every lamp and lit window near a road, a ground streak — a quad 0.5–0.9 m wide, 6–10 m long, lying on the road, pointing from the light's foot toward the camera each frame, additive, soft gradient, the light's colour, strength × `out.night` × 0.5. Night/storm only.
8. **Clouds** (only when `FINAL.on`): count 9 → 5; three tones (top `#FBF8F1`, mid `#E1E5F3`, underside `#C3CBE9`).
9. **Inserts** (skill rule): about 1 shot in 5 is an insert — the drone flies close to one object (a hand, a sign, a clock, money) for 1.5–3 s with blur on.
10. **Flight guardrails.** In `check()` add `flight: { eyeShare, lowShare, highShare }` (camera height vs the 1.2 m character: eye-level = 0.6–1.25 ×). Warn if `eyeShare < 0.6` or roll > 5°. Rule in the skill: mostly eye-level, horizon near mid-frame.
11. **New skill, instructions only.** Name `fable5-2-final`. It carries NO engine copy: "the studio on the PC is the only engine; read `src\house\START-HERE.md` and `look.ts` first". It must contain: the workflow of the old `fable5-2` skill, `final: true` in every new `video.ts`, the town map (`buildTown`), the drone camera rules, accent rule, blur + foreground rule, inserts, guardrails, the measure step, the safety rules above, and Arian's preferences. It replaces `fable5-2` for new videos. Build it only when Arian says he is ready.
12. **Measure a render.** `main.ts`: `window.measure(frame)` renders the frame and reads the 2D canvas at 270 × 480: luma p5/p50/p99, share of near-black (Y′ < 0.05), saturation of the top 10 % rows when it is sky, corner/centre brightness, hue histogram → accent share. `render.mjs`: a `measure <video>` command printing these against the day targets: p50 0.52–0.62, p99 ≥ 0.94, non-ink p5 ≥ 0.15, sky top S ≥ 0.5, corner/centre 0.80–0.95.

## After the fixes

- Type-check, bundle, run the camera test; confirm an old video still renders the same frame (compare one frame before/after).
- Render and show Arian: one town still (day), one sunset still, one night-wet still.

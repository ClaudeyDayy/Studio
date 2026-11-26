# Arian's video rules: all in one (collected 2026-11-19)
(Copy of the NEW METHOD project doc RULES-all-in-one-2026-11-19. Paths in it are old: the studio is now F:\OLD STUDIO on his PC and this GitHub repo.)

Read together with `WORKFLOW-browser-first.md` (the new two-stage workflow).
Sources: skill fable5-2 (newest), skill r3knrf (old text, sections 0-23), handoffs of the needle / Blender work, running change list.
**Priority when rules disagree:** this file's section 12 (newest decisions) > fable5-2 > r3knrf.
**Not included here:** the detail files inside fable5-2 (`reference/camera.md, characters.md, look.md, engine.md, checks.md, lessons.md, story.md`).
If the skill is available, open the one that matches the step. Do not guess numbers from memory.

## 1. How to work with Arian (always)
- VERY short, slow, clearly spoken answers. Plain words.
- ASK BEFORE CREATING anything in his video projects. Before the visuals step, stop and ask (he may switch models for it).
- Muted mp4 only. He adds ALL sound (voice, music, effects). Never edit or re-time his voice: the picture is timed to it. Never call a voice or music service.
- Ask for EVERY new video: loop (ending returns to the opening)? Option, never default. Object transitions 0-3? Captions yes/no?
- Do NOT propose or build a skill file after each change. Keep a running list of changes. Build the file only when he says he is ready.
- Examples taken from references (shop props, lamp, scanner) are examples only. Places and props are general. His videos are not only about grocery stores.
- Never copy a reference character, sign text, name, logo or story.
- Prompts for Claude Code: LONG multi-step batch prompts (fewer round trips). Numbered steps, no questions between steps, save + render after each step, a log file per batch, never overwrite old stills, stop where his eye is needed.
- ALWAYS verify a file committed to his PC (grep / ls) before telling him to run it.
- Long renders run from `.bat` files in a normal terminal, not inside Claude Code. One Blender at a time (RX 580 Vulkan crashes with two).
- Don't keep him up late.
- Two tries per fix, then show him the still and ask.
- Stills are cheap, full renders are not: one still per scene (max 8 per round). Full render once, after he approves the stills.
- Resolution: drafts 1080x1920. FINAL always 2K (1440x2560), only when he says the video is done.
- He lets Claude say which model fits each step (Opus/Fable = building places and hard camera design; Sonnet = small fixes, checks, file moves). He switches models himself.

## 2. Workflow (new, 2026-11-19)
1. Build scene, camera and timing in the browser engine (three.js). Fast preview, fix every flaw here.
2. Lock motion and framing after approval.
3. Export objects, camera path and poses per frame.
4. Blender adds ONLY the look (materials, sunlight, long shadows, haze, depth of field, dust, sparks, smoke). Never changes motion.
5. Compare a browser frame with a Blender frame at the same time: framing must match.
6. Final muted mp4. First test: one 3-second shot through the bridge.
Check tools first, not eyes: `node render.mjs check` (camera and ground problems, ~1 min, no render), then the finish checker on the mp4.

## 3. Story and script
**Start card (new video):** Story (I have one / brainstorm / topic only), Loop, Object transitions, Captions.
**Script formula (from 20 measured reference shorts, 20/20 follow it):**
1. Hook = a paradox stated as fact, sentence 1, 10-16 words, no setup, no greeting, no question first. ("A person did something dumb/impossible with stakes"; "If you X, you'd Y"; "X is illegal, yet ...")
2. Setting in 1-2 lines, present tense, concrete (time, a named everyman, numbers).
3. Escalation, 3-6 beats: others laugh / doubt / mock in short in-character lines; stakes climb; 1-2 exaggeration jokes.
4. Mystery beat about once: a question or "Wait, ...?".
5. Pivot on "You see," into the real mechanism through an everyday analogy ("Ever ...?", "Think about the last time ...").
6. Ironic payoff in the last 1-2 short sentences. Ends on the last word: no question, no "follow", no call to action (loops back only if he chose a loop).
- Modes: story mode (third person, named everyman, present tense) or "Imagine you..." (second person).
- Sentences ~8-15 words (median 13.5), plain spoken English, contractions, numbers as words. ~155-190 words for 55-65 s. Reference voice 3.7 words/s; his own pace is slower (2.7-3.5): count both.
- Voice starts within the first 1-4 frames: no intro, logo, outro.
- Never describe what the viewer already sees. Real facts only: web-check key facts, say which are unchecked; legends are framed "legend says". No real living people as the butt of a joke, nothing graphic, nothing political.
- Many different places (reference changes place often). Every sentence is shown literally; props carry the jokes. One new visual idea every 0.7-1.0 s of narration.
**Story check (when he sends his own story). NEVER rewrite it without asking.** One short table, one line per rule: ✔ / ~ / ✘ and a one-line fix:
1 Hook (paradox, 10-16 words, no setup) | 2 Setting | 3 Escalation | 4 Mystery | 5 "You see," pivot | 6 Payoff (ends on last word) | 7 The twist is SAID aloud | 8 Tense and mode | 9 Sentences ~13.5 words | 10 Speed and length (55-70 s) | 11 Visual (every sentence can be shown; several places) | 12 True (checked).
Then score (✔ of 12), the 2-3 fixes that matter, and ask: "Fix it yourself, or should I write a fixed version?" If he says fix: keep his story, characters, jokes; change only what failed; show old and new side by side.
**Brainstorm:** exactly 10 numbered ideas, 1-2 lines per field: title (5-8 words), hook line (paradox), who mocks, the "You see," example, the twist, mode, why it animates (2-3 big visuals + places), true / disputed / legend (web-checked). Ask for a number or "more".

## 4. Camera
- Almost always moving, calmly, far enough back. No static hold longer than 1.5 s: holds creep in (slow push ~0.14 %/frame). Real 3D parallax, never a 2D zoom.
- Smooth flights that do NOT stop at every shot. Mostly EYE LEVEL (~0.8x character height), horizon about mid-frame. (Blender-era list, 2026-11-17.)
- Drone-camera rule everywhere: one continuous path, a framing guard (character never cut by the frame edge during a move).
- Move = symmetric ease-in-out, ~23 frames; peak speed <= ~25 px/f (720p); about 6 moves per 10 s, each small. Big reframes (other side, height change > 1 m, orbit > 45 deg) at most once per sentence (3-4 s), never twice in a row.
- Plan each shot separately with its own short path. Never one spline for the whole video. Velocity at end of shot N = velocity at start of shot N+1.
- Top-down plan view at most twice (opening and end). Never flip up and back between lines.
- Stay back: place cameras ~1.6x farther than feels natural (table medium shot 1.9-2.5 m; over-the-shoulder ~4.5 m; high three-quarter ~3.5 m). Where a wall stops you, widen the lens (cap ~70 deg). Stay close only on purpose (push into a round white thing before a thought; fantasy exit).
- Narrow 9:16 frame: stage characters in DEPTH, not side by side. Keep faces and key props above y = 1250 (captions and platform UI below).
- Vary shot sizes and angles (hook medium close-up, wide reveal, two-shot, insert close-up on the key object, reaction close-up, environment move for the payoff). About 1 in 5 shots an object close-up (insert). Neighbouring shots differ in height and side.
- Over-the-shoulder: near head dark and blurred, under ~40 % of frame height, never cut by the edge; one in 3-4 scenes.
- Rolls only on purpose: ~3 per 10 s on drama, 3-5 deg typical (up to 8 on big moments), calm keys 0-2 deg.
- Impact kick: picture jumps sideways, flipping direction every frame, ~7 frames, small roll; on the word; push-in stops at the hit. Whip pans rare (~0.5 per minute).
- Hits (needle video rule): fast arrival, camera rises to top view 1 s before impact, impact ring + shake, then pulls away from Earth back to the moon.
- Car scene: consistent camera, one drone path.
- Camera safety: before writing a move, ask what stands between two positions; add `via` (>= 0.5 m clear). Keep lens >= 0.3 m from everything and >= 0.25 m above ground. Name every mesh. `userData.camFree = true` for things the camera passes through on purpose. Run `node render.mjs check`.
- Do not repeat: ~20 big swings in 67 s, six seconds of nonstop swinging, flying to top-down and back six times, moves ending so close heads are cut, the same two shoulder angles back and forth, near-frozen stretches, random tilts.

## 5. Transitions
- 0-1 hard cuts per video (only with his approval). About 11 overlapping transitions per minute, most shape-matched. Overlaps 6-12 frames, camera keeps moving through them. Land every join in the gap between sentences, never in the middle of a key word.
- Types: A shape-match dissolve (most common) | B follow an object | C frame collapse (object transition, exactly the number he chose, never at the fantasy exit) | D iris (max 1 per minute) | E lighting change | F fly-through / whip for place changes | G plain 6-8 frame crossfade only between two places with the camera moving through both.
- A big change of view direction (> ~30 deg) must be a matched dissolve, not a camera swing.
- Time jump: 6-frame white flash. A hero prop must be fully in frame and GONE before a dissolve starts.
- Every scene's shot sheet names its `in` and `out` transition and the match object.
- Plan (`PLAN.md`) before code: frames, words, place, light, camera, cast, effects. Usually one shot per phrase. The twist line gets a sting (push-in with roll); the last shot's physical payoff lands on the final word. Finish every camera arrival on a keyword, 0-3 frames before it. Reactions land 0-3 frames BEFORE the word.
- Thoughts / imagination: fantasy space, never thought bubbles. Entry: push into a round white thing -> white -> fantasy moon. Exit: pull back fast, wider lens -> white -> the next scene starts close on the THINKER's white head and pulls back out of it.
- Fantasy palette: huge pale pink-white moon, sky deep violet `#5A2BC8` -> magenta `#C94FD8` -> hot pink `#F07AC8` at horizon, cobalt water/floor `#2F5FE0`-`#1E3FB0`, white stars, string lights. Keep fantasy frames at mean saturation >= 0.33.

## 6. Characters
- Main cast: **Arian** (white man, neat short brown hair), **Max** (white man, messy brown hair, thick moustache), **Ava** (Black woman, curly hair, round glasses). Library: `shorts-library` (`cast`, `faces`, `hats`, `wardrobe3d`). A character = identity + outfit in layers. A new outfit = a new folder, show a preview first.
- **Ava plays a young person: she ALWAYS has her small eyelashes.** No-lash face only when he says she plays an old woman.
- Likes the police outfit; use it.
- **Bodies are real 3D (they turn); heads are 2D drawings, always flat to the camera;** arms and legs are ink lines. Never squeezed (he flags "squeezed again"), never a paper edge, never vanishing or popping in.
- Heads NOT perfectly round (height/width ~0.93, slightly pointed crown, fuller jaw, ~10 % asymmetry; each character a different silhouette). Exactly the same head shapes and skin colours as the good pants-bet remake.
- Skin `#FCF2EA`, face ink `#2B1C1A` (picked from his references), outline dark warm brown-plum. No blush, no eye highlights, no nose in front view.
- Lines on people thin and soft; on heads the thick side is on the HAIR. Legs are bare ink legs (no pants except as a story prop). Adults ~3.5 head-heights. Almost every character wears a hat or cap.
- Faces: drawn, MORPH smoothly (0.3 s, brows first, small head wobble), never snap. Set: neutral, content, happy, satisfied, strain (`> <` + gritted grin), angry, stressed, sad, scared, surprised, confused, plus the squeezed-eyes grin and closed-eyes smile. Expression changes on almost every key word (~every 0.4-0.6 s) for the subject; side characters react (glance, frown, grin): nobody frozen.
- Normal eye = soft arched lid line with a dot under it; the dot slides to look around. Pupils look at whoever is talking (`look`, `lookEyes`). Auto blinks every 0.5-2.3 s, 4 frames, plus one on every expression change. Characters must NOT have eyes closed in most frames.
- Talking mouths follow the word sounds, WITH teeth and tongue (never a black hole). Every line has a `to` (who it is said to).
- Brows do most of the acting: arched, thick in the middle, pointed at the ends, clear gap above the eye; angry = pressed in, sad/scared = up in the middle, surprised = high, confused = one up one down. Blue sweat drops (3-5) for stress.
- Hands: a held thing sits exactly on the owner's hand in EVERY frame. Round hand disc on the handle, handle passes behind it. A person's R hand stays on her R side. Arms are flat camera-facing strokes from the SHIRT's top corners, not under the head. No extra or floating hand. Carry only what the story says; put-down props stay where put. A secret prop (a number) is shown only on the word, small, held low.
- Sitting: seated characters sit and tilt about the NECK, never the hip. Walkers face where they walk. Idle life (tiny bob, tilt, sway) on EVERY character so nothing freezes. Extras stay still except idle.
- Characters ALWAYS cast shadows (needle fix: Ava_Limbs hard arm shadows were a flaw; keep soft). Strong, high-quality shadows for every character and object in every scene.
- Animation: anticipation (2-3 frame crouch / held wind-up ~6 f), small overshoot, settle. Stamp = 2-frame dip + dust + camera kick. Walk step 9-12 f, bob 3-7 %.

## 7. Look, light, colour
- Real 3D world (three.js). Real materials (`MR`, `MTR`), soft real light and shadows. Houses never look like plain coloured boxes. Walls never bare (pictures, clock, sign, plants, shelves). Wall decor: each item its own depth (no two planes at the same depth). Everything on screen is a story prop. Layered, detailed: textures, 3D props, painted background, nothing plain.
- **Outlines (his rule, 2026-11-14):** INDOORS everything has thin soft dark-brown outlines. OUTDOORS only small details (walkways, doors, windows, awnings, posts, lamps, signs, crates, trees, props); walls, roofs, ground, roads, water, sky, clouds and far things have NONE and are textured (`brickTex`, `plankTex`, `plasterTex`). The engine enforces it (surfaces >= 2.2 m lose outline). Indoor place inside an outdoor video: group with `userData.indoor = true`.
- One colour temperature per place, one visible source per light, a pool of light on the subject. Warm small lights against a cool world. Bloom on every flame and lamp (glow 3-4x its size). Floating dust sparkles in almost every scene. Darks are plum or indigo, never black. Fire: orange-yellow with near-white centre.
- **Direct sunlight:** sun patches through windows with sharp bar shadows on tables, shelves, walls; fake bounce (warm fill + glow); light shafts in the air that look like the clean ones in the bank video. **Strong golden direct sun in EVERY outside scene** (bright sun, sharp shadow edges, visible shafts). Shadow = darker, slightly cooler version of the surface (multiply 0.55-0.7), never flat purple. Test one still for darker, warmer shade/sunset shadows.
- Light follows the story: day normal, golden for decline/drama, night-blue for explanation. Presets: day, sunny, sunset, night, storm, indoor (`lightTrack`, `applyLight` / `houseLight`, `gradeAt`). Sun comes from the SIDE of the main cameras (50-75 deg off axis), never straight behind the camera (flat faces). Characters take the light (`lit: true`).
- Colour: mean saturation >= 0.45 (night/fire richer, day softer ~0.37), vivid pixels 18-29 %, brightness ~0.5-0.67; backgrounds 0.4-0.6, props/clothes/signs ~0.85+. Never neon. One accent colour per place (no random colours). Each side of a story gets one colour; happy end gets a new colour. If pastel, +15-25 % saturation. Grade he liked: sat [1.12,1.3,1.22], bloom 0.62.
- Depth of field on ~1/3 of screen time (focus on the eyes, blur by real distance, wide shots sharp, rack focus ~14 f); big dark blurred foreground object in ~1/3 of shots. Slight vignette, bloom only on real light sources, film grain off.
- Candles/lamps: flame sprite + additive glow + additive pool on the surface (no point lights with the twoTone shader). Night: cool world, warm lamps/windows. Wet reflective streets for night street scenes.
- Effects: flat 2D sprites in the 3D scene (burst, sparkle, stars, notes, dust, speed, splash), ink `#2B1C1A`, sized to the thing (a big puff hides the person); a kick + burst on every hit. Secondary motion everywhere.
- **World style = AMERICAN** unless the story names another country (porches, siding/brick, pitched roofs, mailboxes, picket fences; brick main streets with awnings, yellow lines, hydrants, poles, pickups; banks with columns, steps, vault).
- **Use the place library; never rebuild places from scratch** (trees, streets, stairways, sidewalks were ignored before and cost him ~8 hours). Trees: `scatterTrees` / `makeTree` only (climates: temperate, warm, tropical, desert, cold, autumn), no outlines, never hand-built. Street lamps: `this.out.lamp(x, z)` only (max ~6 lit in view). Outdoor: `new Outdoor(root)` (gradient sky, puffy clouds with lavender undersides, hills, haze, sun glow, stars; flare is only a soft glow). Light shafts outside only at low sun (~5 wide soft rays). Far things pale, hazy, plain. Ground one clear colour with soft blotches.
- Big outdoor places: `near: 0.2`, `far: 300-900`; one ground mesh; flat things on it wrapped `onGround(mesh, 1|2)`; no two flat layers within 3 cm.
- A real outside, not a picture plane: pavement, kerb, road, shop fronts, a big sky sphere. Outside places must look good before the camera goes there. In-world text invented for the story, spelled right, never mirrored (signs FrontSide only).
- Cartoon-stylized worlds for the needle video (cel shading, detail outlines), NOT a realistic moon. Needle: a thin bright line from the side is a known weakness (rim, glint, glow, max 2x thick).

## 8. Captions
Asked on the start card. If yes: ONE word at a time (sometimes 2-3), white bold sans (Arial Black, uppercase) with thin dark outline, lower middle (~y 1300-1350), same place every scene, hard swap on each word, max 3-frame scale pop. 2 words only if together <= 13 characters. Every caption fits 960 px wide. Drawn last, above everything.

## 9. Timing and sync
Time everything to `words.json` (`[{ "w": "ticket", "s": 1.42, "e": 1.8 }]`). Lock picture timing before render. Check phrases.json: pauses at sentence ends. Every narration beat has visible ACTION on screen with hands in frame (no 2 seconds where nothing happens). A prop that only shows time/number goes to a corner as a HUD and the story keeps moving. If the narration says something happens, it happens on screen, timed to the words.

## 10. Self-check before stills (short)
Each scene reads in 1 s with caption covered | each join matches shape | neighbouring scenes differ in height/angle | blurred foreground in ~1/3 | faces sharpest and brightest | same head/hair/tell per character | no paper edge, hands on hands | thin soft outlines, thick on hair | no pants, seated tilt at neck | no flat purple shadows | glows on every lamp/candle | every caption fits 960 px | camera far enough, no path through objects, no 3 fast half-seconds | loop matches if chosen | nothing resembles a reference | script opens with paradox, ends on payoff.
After the full render: finish checker (black, unplanned white, frozen spans, pops, motion share) + `ffmpeg freezedetect/blackdetect`. Pass: 0 hard cuts, 0 dead-hold frames, saturation >= 0.45, vivid >= 18 %, camera move share ~35-65 %.

## 11. Technical (his PC)
- PC: Windows 10, i5 3570, RX 580 8 GB. ffmpeg on PATH. Blender 5.3 (use Eevee).
- Engine shared in `src\engine`, never copied per video. New video = copy `src\videos\_new-video` (outdoor example `_outdoor-test`). Back up to `_old\<name>-before-<what>` before changing; never delete. Don't change the shared engine for one video without asking. Don't run `--repair` over the studio engine.
- Commands: `node render.mjs check | 0,150,300 | (all) | 0-59`; options `RES=2k`, `RESUME=1`, `ANGLE=gl`, `FINAL=1`, `SHOW=1`.
- First printed line must name the Radeon, not SwiftShader.
- Small see-through puffs cast NO shadows (a render hung 1 h on "shadow buffer full"). If a render shows nothing for 15 min, stop and fix.
- A command stuck over ~2 min = hung: Esc once, then "skip it and continue".

## 12. Newest decisions (2026-11-17 to 2026-11-20, win over older text)
- Two-stage workflow (section 2). Blender only polishes, never moves anything.
- Blender-era camera list: smooth flights that don't stop at every shot; mostly eye level (~0.8x); horizon mid-frame; characters always cast shadows; one accent colour per place; lens blur in ~1/3 of shots with soft foreground; ~1 in 5 shots an object close-up; wet reflective night streets.
- Browser stage uses rough plain colours only; Blender does colours, materials and light (2026-11-20).
- Needle video (Blender version, batch 10 done): known open flaws: cartoon worlds only restyled (not rebuilt), ball hands without fingers, thin needle from the side, characters cross the frame edge during camera moves. These are the targets of the new workflow.
- Decision: the needle video stays on the old workflow; new videos use the new one.

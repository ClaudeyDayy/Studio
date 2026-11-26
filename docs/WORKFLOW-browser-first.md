# New workflow: browser first, Blender last (decided 2026-11-19)
(Copy of the NEW METHOD project doc WORKFLOW-browser-first-2026-11-19.)

## Why
The old way (everything in Blender) is too slow: render, find flaws, fix, render again.
Arian's reference slide "Scene first, polish last" shows the right way:
- Stage 1: build the scene in the browser (three.js engine). Every place, character, camera move, timed to the voice. Fast: change anything in minutes.
- Stage 2: polish in Blender. SAME composition, same pose, same camera. Blender only adds the look:
  real materials, sunlight and long shadows, light shafts / haze / glow, depth of field, dust / sparks / smoke.
- Sound (voice, music, effects) is Arian's own. Claude delivers a MUTED mp4.

## The plan
1. Browser stage: build scene, camera moves, timing in the three.js engine. Fast preview. Fix every flaw here until Arian approves.
2. Lock: after approval, motion and framing never change again.
3. Export: engine writes objects, camera path, character poses per frame to a file.
4. Blender stage: Blender loads that file and adds ONLY the look. It never changes motion.
5. Check: compare a browser frame with a Blender frame at the same time. Framing must match.
6. Render: final muted mp4.

First test: ONE 3-second shot through steps 3 to 5. If the bridge works, use it for the whole video.

## Decisions
- No new studio. Keep the same three.js engine. Add one new step: export to Blender.
- Next video gets a fresh project folder.
- No new skill file now. Keep a running list of changes; when Arian says ready, UPDATE the existing fable5-2 skill with a "stage 2: Blender polish" part (not a separate skill).
- Model: Opus for the one-time export bridge and hard camera / animation design. Sonnet is fine for small scene fixes.
- The needle video stays on the old workflow; new videos use this one.

## Arian's rules (keep)
- VERY short, slow, clearly spoken answers.
- Ask before creating anything for his videos.
- Muted mp4 only. He adds all sound.
- For every NEW video, ask: should it loop (ending returns to opening)? Option, not default.
- Do not propose a skill file after every change.
- Examples from references (shop props, lamp, scanner) are examples only. Places and props should be general; videos are not only about grocery stores.
- Long multi-step batch prompt files for Claude Code (fewer round trips). Verify a committed file on his PC before telling him to run it.
- Long renders run from .bat files in a normal terminal, not inside Claude Code. One Blender at a time (RX 580 Vulkan crash).

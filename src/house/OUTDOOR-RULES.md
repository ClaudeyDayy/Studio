# Outdoor look rules (from the 20 reference shorts, studied 2026-11-14)

Numbers live in `src/house/look.ts`. The code is `src/engine/outdoor.ts`. Example: `src/videos/_outdoor-test`.

1. **Sky:** a smooth gradient, deep colour at the top, lighter at the horizon. Noon tops measured `#156DE4`, `#4190DF`,
   `#356AB0`. Sunset `#D38593` (top) to `#FEDB83` (horizon). Night is saturated indigo (`#0B135C` to `#102BA0`) with small stars. Never grey, never black.
2. **Clouds:** few (2 to 6 in frame), puffy, clean edge, white top, flat lavender underside. No outline. Lilac at sunset.
3. **Sun:** strong. Shadows on the ground have hard edges and a cool tint (shadow about 0.6 to 0.75 of the lit colour).
   Day: sun behind the camera, to one side. Sunset: sun in front of the camera, long shadows toward us.
4. **Sun flare:** only a soft warm glow around a low sun, plus bloom. The reference has no hexagons, rings or streaks.
5. **Light shafts outside:** only at low sun or in a storm. 4 to 6 wide soft rays, each about 8 to 14 % of the frame
   width, fanning from the sun, very transparent. Not at noon.
6. **Outlines (his rule):** indoors everything is outlined. Outdoors only the small details: walkways, doors, windows,
   awnings, posts, street lamps and bulbs, signs, crates, trees. House walls, roofs, ground, roads, water, sky, clouds and
   far things have none (`noInk(mesh)`) and get texture: `brickTex`, `plankTex`, `plasterTex`. Lines are thin dark brown.
7. **Distance:** far hills, mesas, castles, cities are pale flat shapes in 2 to 3 layers, fading into the horizon colour.
8. **Ground:** one clear colour with soft blotches and a few pebbles, tufts or tracks. Never fine noise (it flickers).
9. **Things:** chunky, simple shapes with clear flat colours and a few big details. Detail is near the people, not far away.
10. **Weather:** rain = thin slanted pale streaks over a dark indigo scene. Snow = soft white dots. Mist = stronger haze.
11. **Mood by time:** day for the normal story, sunset for decline or drama, night-blue for the explanation.

12. **Places come from the library (2026-11-16):** streets, sidewalks, stairs, houses, shops, banks and street furniture are
    built by `src/engine/places.ts`, which already follows rules 6 to 9. Read `src/house/START-HERE.md`.

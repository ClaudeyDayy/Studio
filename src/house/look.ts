// THE HOUSE LOOK: the one place where Arian's standing look choices live. Every new video reads this file.
// RULE FOR CLAUDE: when Arian says "keep it for the next videos" (stronger sun, softer shadows, more clouds, ...),
//   1. change the number HERE (not only in the video folder),  2. add one dated line to the LOG at the bottom.
// A change that is only for one video stays in that video's folder. This file is never overwritten by --repair.
// Nothing here needs the skill file to be rebuilt.
export const HOUSE = {
  sunGain: 1.0,                 // every sun, inside and outside, times this (1.5 = 50 % stronger everywhere)
  bloom: 0.5,                   // glow on lamps, flames, the sun (video.ts bloom)
  // ---- SHOT CHANGES (his rule, 2026-11-15): every `dissolve` is a WHIP PAN (engine/core/whip.ts), never a blend ----
  whip: { on: true, deg: 70, minHalf: 0.14, blur: 0.42, copies: 16 },   // swing (deg), half-length at least (s), blur length (share of width), blur copies
  // ---- OUTLINES (his rule, 2026-11-14) ----
  // INDOORS: everything has outlines (walls, furniture, props).
  // OUTDOORS: only the small charming details have outlines: walkways, doors, windows, awnings, posts, street lamps and
  //   their bulbs, signs, benches, carts, trees, props. The big surfaces have NO outlines and get texture instead:
  //   house walls (brick, planks, plaster), roofs, the ground, roads, water, the sky, clouds, far hills.
  // How: video.ts  ink: true, inkOptions: HOUSE.line.  A thing that must NOT be outlined: noInk(mesh) from kit.ts.
  line: { color: "#2A1A1E", widthNear: 3.4, widthFar: 2.0, creaseScale: 0.7, strength: 0.92 },   // thin, soft dark brown (reference: 2-3 px, never pure black)
  // ENFORCED by the engine (engine/outdoor.ts outdoorSurfaces, run by Outdoor.light on the first frame): outside, every surface
  // at least `big` metres in two directions loses its outline; a plain coloured one gets a plaster texture of its colour.
  // An indoor place in the same video: put it in a group with userData.indoor = true (it keeps all its outlines).
  outdoorRule: { big: 2.2, autoTexture: true },
  shadow: { map: 4096, bias: -0.0004, normalBias: 0.03 },

  // ---- THE WORLD'S STYLE (his rule, 2026-11-14): AMERICAN, in every video unless the story names another country ----
  // Build houses, banks, shops, streets and props in an American style. Places and props stay general (never copy a reference).
  world: {
    style: "american",
    houses: "wooden siding or brick, a front porch with posts and steps, pitched shingle roof, chimney, sash windows with shutters, a mailbox, a lawn, a picket fence, a driveway",
    town: "main street of brick shops with big windows, striped awnings and painted signs; wide road with yellow centre lines; sidewalks with kerbs; street lamps, fire hydrants, utility poles with wires, parked cars and pickup trucks, a diner, a gas station",
    bank: "stone or brick front with tall columns, wide steps, big double doors, a name sign in metal letters, a flag pole; inside: marble floor, teller counter with brass rails, a round vault door",
    other: "school, police station, church, hospital, office tower, farm with a red barn: the American version of each",
  },

  // ---- TREES (his rule, 2026-11-14): trees belong to the place's climate. One main kind per place, a few of a second
  // kind, rarely a third; never all identical, never a random mix. engine/trees.ts: scatterTrees(root, climate, spots).
  trees: {
    mix: [0.7, 0.25] as [number, number],      // share of the main kind, of the second kind (the rest: the third)
    climates: {
      temperate: ["oak", "pine", "bush"],      // American countryside, towns, farms, parks
      warm: ["umbrella", "cypress", "bush"],   // dry warm hills, the Mediterranean, savanna
      tropical: ["palm", "umbrella", "bush"],  // beaches, jungle edges, islands
      desert: ["cactus", "palm", "bare"],      // deserts, old-west towns
      cold: ["pine", "birch", "bare"],         // mountains, snow, the far north
      autumn: ["birch", "oak", "bare"],        // late in the year, sad or quiet scenes
    },
  },

  // ---- STREET LAMPS (his rule, 2026-11-14): they must really light the street around them, warm ----
  // engine/outdoor.ts: this.out.lamp(x, z). They switch on by themselves at night, at dusk and in a storm.
  lamps: {
    color: "#FF9A3C",            // warm orange-gold (warmer than before)
    power: 30,                   // strength of the real light
    reach: 19,                   // how far it lights the street, m
    pool: 5.0, poolStrength: 0.6,   // the warm pool of light on the ground under it: radius m, brightness
    halo: 1.9, haloStrength: 0.8,   // the soft glow around the bulb: size m, brightness
    height: 2.5,
  },

  indoor: {
    shadowSoft: 4,              // shadow edge blur (1 = sharp, 4 = soft)
    env: 1.0,                   // x video.ts env (soft light from all around)
    skyLight: 0.9,              // the soft fill light from above
  },

  outdoor: {
    light: "sunny" as const,    // the day preset outside (core/lights.ts): his bright sunny day
    sunGain: 2.0,               // direct sun outside is this much stronger (Vietnam: strong golden sun, deep shadows)
    dayElevation: 34,           // day: how high the sun stands, degrees (lower = longer shadows on the ground; the preset alone gave short ones)
    frontSun: 30,               // day: the sun sits behind the camera, this many degrees to its right, so people glow
    lowSunBack: 160,            // sunset / dawn: the sun sits in FRONT of the camera (backlit, long shadows toward us); degrees from the camera's back
    shadowSoft: 1.5,            // crisp shadow edges outside (reference: hard-edged shadows on the ground)
    shadowBox: [4, 22] as [number, number],   // shadow area follows the shot: smallest / largest half-size, m
    env: 0.45,                  // dimmer all-round light outside so the sun and the shadows read
    skyLight: 0.55,
    lowSunFill: 2.4,            // sunset / dawn: the soft fill light is this much stronger, so the ground does not go dark under a low sun
    // outlines outside: details only (see OUTLINES above)

    // ---- sky (a smooth gradient, top -> horizon; the horizon is the lighter one) ----
    sky: {
      dayTop: "#2E7FE0",        // reference noon tops: #156DE4 (desert town), #4190DF (village), #356AB0 (city)
      dayHorizonWhite: 0.25,    // horizon = the light preset's sky colour, this much whiter
      sunsetTop: "#C8829A", sunsetHorizon: "#FFD98A",   // reference: #D38593 -> #FEDB83
      nightTop: "#0B135C", nightHorizon: "#16309E",     // reference night: saturated indigo, never black
      stars: 1.0,               // small white stars at night (0 = none)
    },
    // ---- clouds: few, puffy, clean edge, white top, flat lavender underside, NO outline ----
    clouds: { count: 9, size: 1.0, low: 45, high: 115, drift: 0.6, shade: "#C9CFEA", sunset: "#C9A2D8", night: "#39408C" },
    // ---- distance: the far world fades into the horizon colour ----
    haze: { from: 60, to: 420, tint: "" },              // tint: "" = horizon colour; or a colour (Vietnam jungle: "#4C8C52")
    far: { style: "hills" as "hills" | "mesas" | "peaks" | "none", colors: ["#5E8A70", "#46754F", "#3A6838"] },   // 3 pale layers, farthest first
    // ---- the sun in the sky: a soft glow, no lens-flare shapes (the reference has no hexagons or streaks) ----
    sun: { disc: 1.0, glow: 1.0, color: [1.0, 0.86, 0.62] as [number, number, number] },
    // ---- light shafts in the open air ----
    // when: "low-sun" = only at dawn / sunset when the camera faces the sun (reference). "never" = his Vietnam rule
    // (shafts only through windows, bars, gaps). "always" = also at noon.
    shafts: { when: "low-sun" as "low-sun" | "never" | "always", count: 5, width: 0.10, strength: 0.38, color: [1.6, 1.25, 0.7] as [number, number, number], distance: 12 },   // drawn softly over the whole picture, like the reference
    // ---- weather ----
    rain: { streaks: 2200, length: 0.55, slant: 0.18, speed: 14, opacity: 0.55, color: "#CFE0FF" },
    snow: { flakes: 900, size: 0.045, speed: 0.9, opacity: 0.9 },
  },
};
export type House = typeof HOUSE;

// LOG (newest first). One line per standing change: date, what, his words.
// 2026-11-15  SHOT CHANGES: whip pans instead of dissolves, in every video ("keep it in the engine"; from vietnam3).
// 2026-11-14  STREET LAMPS: stronger and warmer, light the whole area around them ("like a street lamp brightens the streets up").
// 2026-11-14  The outdoor outline rule is now enforced by the engine ("make this a sure thing too").
// 2026-11-14  TREES: by climate of the place; one main kind, some variety, no two identical ("warm place = warm-place trees").
// 2026-11-14  WORLD STYLE: American houses, banks, shops and streets in every next video ("for every next videos").
// 2026-11-14  OUTLINES: indoors everything; outdoors only small details (walkways, lamps, doors, windows...). Houses and
//             ground: no outlines, textured (brick, planks). "Houses must not look like colourful boxes."
// 2026-11-14  Sunset ground was too dark: lowSunFill 2.4.
// 2026-11-14  Day sun lower (34 deg) for longer shadows, sunset rays stronger (0.38).
// 2026-11-14  File created from the look he approved in vietnam2: sunny day, outdoor sun x2, front sun 30 deg,
//             crisp shadows 1.5, all-round light x0.45, sky light 0.55. Outdoor sky / clouds / haze / shafts from
//             the reference pack study. 

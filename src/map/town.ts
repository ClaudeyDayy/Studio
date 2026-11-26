// THE TOWN MAP (2026-11-16): one connected world, shared by the videos. Each place is its own piece; places sit
// next to each other and the camera FLIES between them. Never jump between places.
// The map is small today, so buildTown() builds everything. Later an optional loader can build only the place
// the camera is in plus its neighbours; the `neighbours` lists below are for that.
// In a video's makeWorld, after `this.out = new Outdoor(this.root)`:
//   const town = buildTown(this.root, this.out);
//   town.places["main-street"].doors   // front-door points, world coords ("house-street" the same)
//   town.corner                        // [x, 0, z] on the main road where the house street turns off: fly through here
// LAYOUT: the main street runs along x around the origin. The house street turns off it just past the east
// crosswalk and runs north (+z). One shared ground, so the two places can never flicker against each other.
// Old videos do not read this file and render the same as before.
import * as THREE from "three";
import { Outdoor } from "../engine/outdoor";
import { ground, mainStreet, neighborhood, Placed } from "../engine/places";

export type PlaceName = "main-street" | "house-street";
export type TownPlace = Placed & { neighbours: PlaceName[] };

const MAIN_ROAD = 7.4, MAIN_WALK = 2.4;   // the main street's road and sidewalk widths (places.ts mainStreet)
const HOUSES = 4, LOT = 13;               // the house street: 4 lots of 13 m -> 52 m of houses
const HOUSE_EXT = 12;                     // its road runs 12 m past the houses (engine default 70: too far for a corner)

export function buildTown(root: THREE.Object3D, out: Outdoor | null) {
  const g = ground({ kind: "grass" }); root.add(g);
  const main = mainStreet(root, out, { shops: 4, bank: true, seed: 5, ground: false });
  main.group.name = "main-street";
  const cx = main.length / 2 + 8;         // the corner, just past the east crosswalk (it sits at length/2 + 2.2)
  const cz = MAIN_ROAD / 2 + MAIN_WALK;   // the house road starts north of the main sidewalk (nothing overlaps)
  const hs = neighborhood(root, out, {
    houses: HOUSES, lot: LOT, seed: 3, climate: "temperate", ground: false, ext: HOUSE_EXT,
    x: cx, z: cz + HOUSE_EXT + (HOUSES * LOT) / 2, yaw: -90,   // yaw -90: its local +x points north (+z)
  });
  hs.group.name = "house-street";
  const places: Record<PlaceName, TownPlace> = {
    "main-street": { ...main, neighbours: ["house-street"] },
    "house-street": { ...hs, neighbours: ["main-street"] },
  };
  return { ground: g, places, corner: [cx, 0, 0] as [number, number, number] };
}

// KNOWN FOR NOW (v1):
// - At the corner, the main street's sidewalk runs across the house road's mouth (reads as a raised crossing).
// - The house street's road ends on grass 12 m past the last house.
// LOG (newest first)
// 2026-11-16  v1: main street (4 shops + the bank) + house street (4 houses) meeting at a corner. Arian's yes.

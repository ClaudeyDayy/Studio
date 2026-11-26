// THE WHOLE VIDEO: one world that shows the part named by the camera's `space` and builds it the first time it is needed.
// Heavy parts (the three hit places with their map pictures) are thrown away again when we leave them, so the graphics card never holds
// more than the moon plus the part on screen. The moon stays (it comes back many times).
import * as THREE from "three";
import type { World } from "../../engine/video";
import type { CamState } from "../../engine/core/camera";
import type { Cast3DAssets } from "../../engine/cast/player3d";
import { START } from "./story";
import { MoonWorld, load as loadMoon } from "./moon";
import { SpaceWorld } from "./space";
import { ExplainWorld } from "./explain";
import { FinaleWorld } from "./finale";
import { SimpleWorld as CityWorld } from "./parts/cityhit/world";
import { SimpleWorld as PhoneHitWorld } from "./parts/phonehit/world";
import { SimpleWorld as WhaleHitWorld } from "./parts/whalehit/world";

export const load = loadMoon;
type Entry = { key: string; make: (A: Cast3DAssets) => World; start: number; keep?: boolean };
const PARTS: Record<string, Entry> = {
  moon: { key: "moon", make: (A) => new MoonWorld(A), start: 0, keep: true },
  pov: { key: "moon", make: (A) => new MoonWorld(A), start: 0, keep: true },
  sp1: { key: "sp1", make: (A) => new SpaceWorld("sp1", A), start: START.sp1 },
  sp2: { key: "sp2", make: (A) => new SpaceWorld("sp2", A), start: START.sp2 },
  sp3: { key: "sp3", make: (A) => new SpaceWorld("sp3", A), start: START.sp3 },
  sp4: { key: "sp4", make: (A) => new SpaceWorld("sp4", A), start: START.sp4 },
  city1: { key: "city1", make: (A) => new CityWorld(A), start: START.city1 },
  city2: { key: "city2", make: (A) => new PhoneHitWorld(A), start: START.city2 },
  city3: { key: "city3", make: (A) => new WhaleHitWorld(A), start: START.city3 },
  explain: { key: "explain", make: () => new ExplainWorld(), start: START.explain },
  finale: { key: "finale", make: () => new FinaleWorld(), start: START.finale },
};

function free(o: THREE.Object3D) {
  o.traverse((n) => {
    const m = n as THREE.Mesh; m.geometry?.dispose?.();
    for (const mt of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) {
      for (const k of Object.keys(mt)) { const v = (mt as any)[k]; if (v && v.isTexture) v.dispose(); }
      mt.dispose();
    }
  });
}

export class SegmentWorld implements World {
  root = new THREE.Group();
  private live = new Map<string, World>(); private cur = "";
  constructor(private A: Cast3DAssets) {}
  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, c: CamState) {
    const P = PARTS[c.space] ?? PARTS.moon;
    if (P.key !== this.cur) {
      for (const [k, w] of [...this.live]) {
        if (k === P.key) continue;
        if (PARTS[k].keep && !P.key.startsWith("city")) { w.root.visible = false; continue; }   // the moon stays, except while a heavy hit place is built
        this.root.remove(w.root); free(w.root); this.live.delete(k);
      }
      scene.fog = null;
      if (!this.live.has(P.key)) { const w = P.make(this.A); this.live.set(P.key, w); this.root.add(w.root); }
      this.live.get(P.key)!.root.visible = true; this.cur = P.key;
    }
    return this.live.get(P.key)!.update(t - P.start, cam, scene, c);
  }
}
export const makeWorld = (A: Cast3DAssets) => new SegmentWorld(A);

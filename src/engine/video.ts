// What every video folder gives the engine (in its video.ts):  export default defineVideo({ ... })
import * as THREE from "three";
import type { GradeParams } from "./post/grade";
import type { Cap } from "./core/captions";
import type { CamState } from "./core/camera";

// Your world: everything in the scene. update() places everything for time t and points the camera.
// It gets `pose` = the camera to use (always given by the engine) and returns the focus distance and the blur.
export interface World {
  root: THREE.Object3D;
  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, pose: CamState): { focus: number; cInf: number };
}

export type VideoDef<A = any> = {
  fps?: number;                       // default 30
  total: number;                      // number of frames
  background?: string;                // behind everything, default "#1B1020"
  grade?: GradeParams;                // colour grade, default GRADES.day
  gradeStrength?: number;             // default 1
  gradeAt?: (t: number) => { p: GradeParams; amount?: number };   // optional: a grade that changes over time (lightTrack(...).gradeAt)
  bloom?: number;                     // glow strength, default 0.5
  inkOptions?: import("./post/ink").InkOptions;   // HOUSE 2026-11-14: line colour / width (HOUSE.line)
  ink?: boolean;                      // black outlines on the 3D world (default true). The 3D look: false (the reference world has none)
  env?: number;                       // soft light from all around (a studio environment) on real materials (MR / MTR in kit.ts), e.g. 0.6. Default off
  near?: number;                      // Fable5.2: nearest distance the camera draws, m (default 0.05). Big / outdoor places: 0.2 (finer depth, no ground flicker)
  far?: number;                       // Fable5.2: farthest distance the camera draws, m (default 80). Outdoor: 300-900. Set these here, not in world.update
  camAt: (t: number) => CamState;     // from makeCamera(...)
  dissolveAt?: (t: number) => { w: number; out: CamState; wipe?: [number, number, number]; wipeGlow?: string } | null;   // wipe: optional soft circle (bank2)
  // optional OBJECT TRANSITION (bank2): the old shot (camera `out`) is drawn first, then shrinks into the 4 corners of a surface in
  // the new shot's world (top-left, top-right, bottom-right, bottom-left, world coordinates) and keeps playing there.
  // k = 0..1 progress (eased here), alpha = how much of it shows, style = draw on the old picture before it is mapped (scanlines...).
  collapseAt?: (t: number) => { k: number; u: number; out: CamState; corners: [number, number, number][]; alpha?: number;
    style?: (g: CanvasRenderingContext2D, w: number, h: number, k: number, t: number) => void;
    snapTo?: (c: HTMLCanvasElement) => void } | null;   // snapTo: gets the old picture every frame (e.g. to show it on a 3D screen too)
  whiteAt?: (t: number) => number;    // white flash 0..1
  caps?: Cap[];                       // captions (empty = no captions)
  overlay?: (ctx: CanvasRenderingContext2D, t: number) => void;   // flat 2D drawing on top of the picture (1080x1920), under the white flash and captions
  load: () => Promise<A>;             // load pictures etc. (runs once)
  makeWorld: (assets: A) => World;    // called twice (the second copy draws the incoming shot in dissolves)
};
export const defineVideo = <A>(v: VideoDef<A>) => v;

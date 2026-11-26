// PLACES TEST: 5 views of the place library (engine/places.ts), 2 s each. It is a test sheet, so the camera jumps between views.
import { P, Shot, makeCamera } from "../../engine/core/camera";
import { lightTrack } from "../../engine/core/lights";
import { HOUSE } from "../../house/look";

export const FPS = 30, DURATION = 10, TOTAL = DURATION * FPS;
export const LIGHT = lightTrack([[0, HOUSE.outdoor.light], [8, "night", 0.2]]);
const view = (t: number, pos: [number, number, number], look: [number, number, number], fov: number): Shot => ({ t, from: P(pos, look, fov, 0), to: P(pos, look, fov, 0), move: 0, creep: 0.02, noRamp: true });
const shots: Shot[] = [
  view(0, [-30, 1.5, 1.2], [10, 1.6, -6], 46),            // 1. the street of houses, wide                (still: frame 30)
  view(2, [-3.6, 1.0, 1.4], [-6.2, 1.3, -9], 44),         // 2. one house close, two 1.2 m figures        (frame 90)
  view(4, [-22, 1.5, -148.6], [6, 1.8, -152], 46),        // 3. main street, wide                         (frame 150)
  view(6, [4.5, 1.2, -146.6], [-0.4, 2.6, -160], 44),     // 4. the bank and its steps                    (frame 210)
  view(8, [-13, 1.3, 2.0], [-2, 1.6, -8], 46),            // 5. night: lamps and windows glow             (frame 285)
];
const CAM = makeCamera(shots, DURATION);
export const camAt = CAM.camAt;

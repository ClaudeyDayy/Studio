// BLENDER BRIDGE (2026-11-26): the page side of export-blender.mjs. It builds the video's world WITHOUT the post effects,
// steps it frame by frame exactly like main.ts does (world.update + camera roll), records every object's transform and
// the camera, and writes ONE .glb with that motion baked in (one key per frame) + a small .json (camera fov per frame, notes).
// Blender then only adds the look. Nothing here changes how the video moves.
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
// @ts-ignore  (export-blender.mjs points "@video" at src/videos/<name>/video.ts)
import videoDef from "@video";

const video = videoDef as any;
const FPS: number = video.fps ?? 30;
const W = 1080, H = 1920;

const clean = (s: string) => (s || "").replace(/[^A-Za-z0-9_]/g, "_").slice(0, 34);

async function exportBlender(a: number, b: number) {
  const notes: string[] = [];
  const assets = await video.load();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, W / H, video.near ?? 0.05, video.far ?? 80);
  camera.position.set(0, 0, 5);
  const world = video.makeWorld(assets);
  scene.add(world.root);

  const step = (f: number) => {
    const t = f / FPS;
    if (video.dissolveAt?.(t)) notes.push(`frame ${f}: a dissolve is running (only the base shot is exported)`);
    if (video.collapseAt?.(t)) notes.push(`frame ${f}: the object transition is running (not exported)`);
    const pose = video.camAt(t);
    world.update(t, camera, scene, pose);
    if (video.near) camera.near = video.near;
    if (video.far) camera.far = video.far;
    if (pose.roll) camera.rotateZ((pose.roll * Math.PI) / 180);
    camera.updateProjectionMatrix();
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
  };

  step(a);
  // every object gets a short unique name, so each motion track finds its object in Blender
  const nodes: THREE.Object3D[] = [];
  const names: Record<string, string> = {};
  world.root.traverse((o: THREE.Object3D) => {
    const n = "n" + nodes.length.toString(36) + "_" + clean(o.name || o.type);
    names[n] = o.name || o.type;
    o.name = n;
    nodes.push(o);
  });

  // sample every frame
  const N = b - a + 1, K = nodes.length;
  const pos = new Float32Array(N * K * 3), quat = new Float32Array(N * K * 4), scl = new Float32Array(N * K * 3);
  const vis = new Uint8Array(N * K);
  const camPos: number[] = [], camQuat: number[] = [], fov: number[] = [];
  const m = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  let prevCamQ: THREE.Quaternion | null = null;
  for (let i = 0; i < N; i++) {
    step(a + i);
    for (let k = 0; k < K; k++) {
      const o = nodes[k], j = i * K + k;
      pos.set([o.position.x, o.position.y, o.position.z], j * 3);
      quat.set([o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w], j * 4);
      scl.set([o.scale.x, o.scale.y, o.scale.z], j * 3);
      vis[j] = o.visible ? 1 : 0;
    }
    camera.matrixWorld.decompose(m, q, s);
    if (prevCamQ && prevCamQ.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w);   // no flips between keys
    prevCamQ = q.clone();
    camPos.push(m.x, m.y, m.z); camQuat.push(q.x, q.y, q.z, q.w); fov.push(camera.fov);
  }

  // tracks only for objects that move / change; still objects keep their first-frame state
  const times = Array.from({ length: N }, (_, i) => i / FPS);
  const tracks: THREE.KeyframeTrack[] = [];
  const eps = 1e-5;
  let moving = 0, hidden = 0;
  step(a);   // put everything back to the first frame before writing
  for (let k = 0; k < K; k++) {
    const o = nodes[k];
    const P: number[] = [], Q: number[] = [], S: number[] = [];
    let vp = false, vq = false, vs = false, anyHidden = false;
    for (let i = 0; i < N; i++) {
      const j = i * K + k;
      for (let c = 0; c < 3; c++) { P.push(pos[j * 3 + c]); if (Math.abs(pos[j * 3 + c] - pos[k * 3 + c]) > eps) vp = true; }
      let x = quat[j * 4], y = quat[j * 4 + 1], z = quat[j * 4 + 2], w = quat[j * 4 + 3];
      if (i > 0) { const L = Q.length; if (Q[L - 4] * x + Q[L - 3] * y + Q[L - 2] * z + Q[L - 1] * w < 0) { x = -x; y = -y; z = -z; w = -w; } }
      Q.push(x, y, z, w);
      for (let c = 0; c < 4; c++) if (Math.abs(quat[j * 4 + c] - quat[k * 4 + c]) > eps) vq = true;
      const hid = vis[j] === 0; if (hid) anyHidden = true;
      for (let c = 0; c < 3; c++) { const v = hid ? 0.0001 : scl[j * 3 + c]; S.push(v); if (Math.abs(v - (vis[k] ? scl[k * 3 + c] : 0.0001)) > eps) vs = true; }
    }
    if (anyHidden) hidden++;
    if (vp) tracks.push(new THREE.VectorKeyframeTrack(o.name + ".position", times, P, THREE.InterpolateLinear));
    if (vq) tracks.push(new THREE.QuaternionKeyframeTrack(o.name + ".quaternion", times, Q, THREE.InterpolateLinear));
    if (vs) tracks.push(new THREE.VectorKeyframeTrack(o.name + ".scale", times, S, THREE.InterpolateLinear));
    else if (!vis[k]) o.scale.setScalar(0.0001);   // hidden the whole time
    if (vp || vq || vs) moving++;
    o.visible = true;   // visibility now lives in the scale
  }

  // the shot camera as its own node
  const shotCam = new THREE.PerspectiveCamera(fov[0], W / H, camera.near, camera.far);
  shotCam.name = "ShotCam";
  shotCam.position.set(camPos[0], camPos[1], camPos[2]);
  shotCam.quaternion.set(camQuat[0], camQuat[1], camQuat[2], camQuat[3]);
  scene.add(shotCam);
  tracks.push(new THREE.VectorKeyframeTrack("ShotCam.position", times, camPos, THREE.InterpolateLinear));
  tracks.push(new THREE.QuaternionKeyframeTrack("ShotCam.quaternion", times, camQuat, THREE.InterpolateLinear));
  const clip = new THREE.AnimationClip("shot", (N - 1) / FPS, tracks);

  const warns: string[] = [];
  const ow = console.warn;
  console.warn = (...x: any[]) => { const t = x.join(" "); if (!warns.includes(t)) warns.push(t); };
  let glb: ArrayBuffer;
  try {
    glb = (await new GLTFExporter().parseAsync(scene, { binary: true, animations: [clip], onlyVisible: false, maxTextureSize: 2048 })) as ArrayBuffer;
  } finally { console.warn = ow; }

  const b64: string = await new Promise((res) => {
    const r = new FileReader();
    r.onload = () => { const u = String(r.result); res(u.slice(u.indexOf(",") + 1)); };
    r.readAsDataURL(new Blob([glb]));
  });
  const info = {
    video: video.name ?? "", fps: FPS, from: a, to: b, frames: N, size: [W, H],
    objects: K, moving, hidden, tracks: tracks.length, camFov: fov, camNear: camera.near, camFar: camera.far,
    notes: [...new Set(notes)].slice(0, 40), exporterWarnings: warns.slice(0, 40), names,
  };
  return { glb: b64, info };
}

(window as any).exportBlender = exportBlender;
(window as any).ready = true;

import * as THREE from "three";
import * as P from "../../src/engine/places";
const root = new THREE.Group(); const lamps: number[][] = [];
const out: any = { lamp: (x: number, z: number) => lamps.push([+x.toFixed(1), +z.toFixed(1)]) };
const rep = (name: string, g: THREE.Object3D) => { g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()); let m = 0, tri = 0, bad = 0;
  g.traverse((o: any) => { if (o.isMesh) { m++; const gg = o.geometry; tri += (gg.index ? gg.index.count : gg.attributes.position.count) / 3; const p = gg.attributes.position.array; for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) { bad++; break; } } });
  console.log(name.padEnd(14), "size", s.x.toFixed(1), s.y.toFixed(1), s.z.toFixed(1), "| y", b.min.y.toFixed(2), "..", b.max.y.toFixed(2), "| z", b.min.z.toFixed(1), "..", b.max.z.toFixed(1), "| meshes", m, "tris", Math.round(tri), bad ? "BAD NUMBERS " + bad : ""); };
for (let s = 1; s <= 6; s++) { const h = P.house({ seed: s }); rep("house " + s, h); if (s < 3) console.log("   ", JSON.stringify(h.userData)); }
rep("house brick2", P.house({ wall: "brick", storeys: 2, porch: false, gable: "front" }));
rep("shop", P.shop({ seed: 2 })); rep("shop1", P.shop({ seed: 3, storeys: 1 })); rep("bank", P.bank()); rep("stairs", P.stairs({ steps: 6, rails: true }));
rep("road", P.road()); rep("sidewalk", P.sidewalk()); rep("crosswalk", P.crosswalk()); rep("car", P.car()); rep("pickup", P.car("#333", "pickup"));
rep("fence", P.picketFence(6)); rep("mailbox", P.mailbox()); rep("hydrant", P.hydrant()); rep("bench", P.bench()); rep("trash", P.trashCan()); rep("pole", P.utilityPole()); rep("door", P.door()); rep("win", P.win({ shutters: "#234" }));
const a = P.neighborhood(root, out, { houses: 4, ground: false }); rep("neighborhood", a.group); console.log("    doors", JSON.stringify(a.doors.map((d) => d.map((v) => +v.toFixed(1))))); console.log("    walk", JSON.stringify(a.walk.map((d) => d.map((v) => +v.toFixed(1))))); console.log("    lamps", JSON.stringify(lamps)); lamps.length = 0;
const b = P.mainStreet(root, out, { z: -150, ground: false }); rep("mainStreet", b.group); console.log("    doors", JSON.stringify(b.doors.map((d) => d.map((v) => +v.toFixed(1))))); console.log("    lamps", JSON.stringify(lamps));
const names: Record<string, number> = {}; root.traverse((o: any) => { if (o.isMesh) names[o.name || "?"] = (names[o.name || "?"] || 0) + 1; }); console.log("mesh names", JSON.stringify(names));
console.log("used", JSON.stringify(P.placesUsed()));

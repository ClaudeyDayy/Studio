# BLENDER BRIDGE (2026-11-26), step 4: load a shot exported by export-blender.mjs into a NEW EMPTY Blender file.
# Motion and camera come only from the .glb (one key per frame). This script never moves anything;
# it only sets up the file (30 fps, 1080x1920, the shot camera with its fov per frame) and a first plain look.
# Use (inside Blender):  exec(open(r"F:\OLD STUDIO\studio\src\engine\blender_import.py").read()); bridge_load(r"...\wald-bomber-f0-89.glb")
import bpy, json, math, os

def bridge_load(glb, save_as=None):
    if bpy.data.is_dirty:
        raise RuntimeError("The open Blender file has unsaved changes. Save it first.")
    info = json.load(open(glb[:-4] + ".json"))
    bpy.ops.wm.read_homefile(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = info["fps"]; sc.render.fps_base = 1
    sc.render.resolution_x, sc.render.resolution_y = info["size"]
    sc.render.resolution_percentage = 100
    # timers/bridge calls have no window context; the glTF importer needs one (context.object)
    win = bpy.context.window_manager.windows[0]
    area = max(win.screen.areas, key=lambda a: a.width * a.height)
    with bpy.context.temp_override(window=win, screen=win.screen, area=area, scene=sc, view_layer=sc.view_layers[0]):
        bpy.ops.import_scene.gltf(filepath=glb)

    cam = bpy.data.objects.get("ShotCam")
    if cam is None:
        cam = next(o for o in bpy.data.objects if o.type == "CAMERA")
    sc.camera = cam
    # where does engine frame 0 land in Blender?
    first, last = 10**9, -10**9
    for o in bpy.data.objects:
        ad = o.animation_data
        if ad and ad.action:
            for fc in getattr(ad.action, "fcurves", []):
                first = min(first, fc.range()[0]); last = max(last, fc.range()[1])
    if first == 10**9:
        first, last = 0, info["frames"] - 1
    first, last = int(round(first)), int(round(last))
    sc.frame_start, sc.frame_end = first, last

    cd = cam.data
    cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24.0
    cd.clip_start = info["camNear"]; cd.clip_end = info["camFar"]
    for i, fov in enumerate(info["camFov"]):
        cd.lens = 12.0 / math.tan(math.radians(fov) / 2)
        cd.keyframe_insert("lens", frame=first + i)

    if save_as:
        bpy.ops.wm.save_as_mainfile(filepath=save_as)
    return {"first": first, "last": last, "objects": len(bpy.data.objects), "camera": cam.name}

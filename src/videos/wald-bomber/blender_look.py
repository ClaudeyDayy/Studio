# BLENDER LOOK for wald-bomber (2026-11-26). Look only: never moves anything.
# Use inside Blender, with wald-test.blend open:
#   exec(open(r"F:\OLD STUDIO\studio\src\videos\wald-bomber\blender_look.py").read()); look()
# try 3 (12:10): the camera sees the golden sky, but the plane is lit by a cool white world (engine: hemisphere
# #dfeeff/#8a7a68 + neutral env map), engine sun colour; puffy cloud Sprites rebuilt as camera-facing cards.
import bpy, re, math, random
DETAIL = 4.5       # normal map strength on the plane (rivets, sheet gaps); glTF gave 1.0
HAZE = "#EDE3DF"   # far haze colour (engine fog), used by the cloud cards and the compositor mist

def lin(h):
    h = h.lstrip("#"); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]

def srgb(h):
    h = h.lstrip("#"); return [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]

def mean_lin(img):
    # same as the engine's meanLin(): mean of v^2.2 over pixels brighter than 0.02 (64x64 sample)
    w, h = img.size; px = img.pixels[:]; s = n = 0
    step = max(1, (w * h) // 4096)
    for i in range(0, w * h, step):
        r, g, b = px[i*4:i*4+3]; v = (r + g + b) / 3
        if v > 0.02: s += v ** 2.2; n += 1
    return s / n if n > 50 and s / n > 0.005 else 0.05

def paint_bomber():
    # engine repaint(): colour = paint * clamp(0.45 + 0.55 * lum / mean, 0.4, 1.6), keeps panel lines and rivets
    # (metal and roughness come from the glTF maps: blue*0.08, green*0.65, same as the engine)
    for m in bpy.data.materials:
        if not re.match(r"01(Hull|Wings|Detail)", m.name) or m.get("look_done"): continue
        det = "Detail" in m.name; nt = m.node_tree; N = nt.nodes; L = nt.links
        bsdf = N.get("Principled BSDF")
        tex = next(l.from_node for l in bsdf.inputs["Base Color"].links)
        mean = mean_lin(tex.image)
        bw = N.new("ShaderNodeRGBToBW"); L.new(tex.outputs["Color"], bw.inputs[0])
        k = N.new("ShaderNodeMath"); k.operation = "MULTIPLY_ADD"; L.new(bw.outputs[0], k.inputs[0]); k.inputs[1].default_value = 0.55 / mean; k.inputs[2].default_value = 0.45
        mx = N.new("ShaderNodeMath"); mx.operation = "MINIMUM"; L.new(k.outputs[0], mx.inputs[0]); mx.inputs[1].default_value = 1.6
        mn = N.new("ShaderNodeMath"); mn.operation = "MAXIMUM"; L.new(mx.outputs[0], mn.inputs[0]); mn.inputs[1].default_value = 0.4
        mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1
        mul.inputs["A"].default_value = lin("#B4B6B8" if det else "#9EA2A6")   # Arian 12:17: shiny grey (was olive #6E7A3C)
        L.new(mn.outputs[0], mul.inputs["B"])
        L.new(mul.outputs["Result"], bsdf.inputs["Base Color"])
        # shiny metal: fixed metallic (the glTF map gave ~0); roughness keeps its map (green*0.65, ~0.15)
        for l in list(bsdf.inputs["Metallic"].links): L.remove(l)
        bsdf.inputs["Metallic"].default_value = 0.85
        # tiny details (rivets, gaps between sheets) live in the normal map: stronger so they catch the light like the engine
        nmap = N.get("Normal Map"); nmap.inputs["Strength"].default_value = DETAIL
        for n in N:   # roughness = green * 0.65 from glTF -> a bit smoother so rivet edges sparkle
            if n.type == "MATH" and n.operation == "MULTIPLY" and n.inputs[1].default_value == 0.65: n.inputs[1].default_value = 0.22   # Arian 12:40: a bit more polished
        m["look_done"] = 1

def additive(m, col, strength):
    # sun rays: added light, never grey bars (engine: AdditiveBlending)
    nt = m.node_tree; N = nt.nodes; L = nt.links
    tex = next((n for n in N if n.type == "TEX_IMAGE"), None)
    img = tex.image if tex else None
    N.clear()                       # (python node handles are not stable: never compare them with `is`)
    tex = None
    if img: tex = N.new("ShaderNodeTexImage"); tex.image = img
    out = N.new("ShaderNodeOutputMaterial"); em = N.new("ShaderNodeEmission"); tr = N.new("ShaderNodeBsdfTransparent"); add = N.new("ShaderNodeAddShader")
    em.inputs["Color"].default_value = lin(col)
    if tex:
        a = N.new("ShaderNodeMath"); a.operation = "MULTIPLY"; L.new(tex.outputs["Alpha"], a.inputs[0]); a.inputs[1].default_value = strength
        L.new(a.outputs[0], em.inputs["Strength"])
    else: em.inputs["Strength"].default_value = strength
    # soft sides: fade where the cone turns away from the camera (hard cone edges looked like stripes)
    lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.3
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; L.new(lw.outputs["Facing"], inv.inputs[1])
    pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; L.new(inv.outputs[0], pw.inputs[0]); pw.inputs[1].default_value = 0.7   # try 5 had 2.0: beams vanished
    fin = N.new("ShaderNodeMath"); fin.operation = "MULTIPLY"; L.new(pw.outputs[0], fin.inputs[0])
    src = em.inputs["Strength"].links[0].from_socket if em.inputs["Strength"].links else None
    if src: L.new(src, fin.inputs[1])
    else: fin.inputs[1].default_value = strength
    L.new(fin.outputs[0], em.inputs["Strength"])
    L.new(em.outputs[0], add.inputs[0]); L.new(tr.outputs[0], add.inputs[1]); L.new(add.outputs[0], out.inputs["Surface"])
    m.surface_render_method = "BLENDED"; m.use_transparency_overlap = True
    try: m.use_shadow = False
    except Exception: pass
    for o in bpy.data.objects:
        if any(s.material == m for s in o.material_slots): o.visible_shadow = False

def rays():
    done = set()
    for o in bpy.data.objects:
        if not o.parent: continue
        p = o.parent.name
        if p.endswith("holeBeams") or p.endswith("sunShafts"):
            for s in o.material_slots:
                if s.material and s.material.name not in done:
                    done.add(s.material.name)
                    if p.endswith("holeBeams"): additive(s.material, "#FFD58A", 0.4)
                    else: additive(s.material, "#FFD9A0", 0.05)

def z_ramp(N, L, stops):
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); ramp = N.new("ShaderNodeValToRGB")
    mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = -1; mr.inputs["From Max"].default_value = 1
    L.new(tc.outputs["Generated"], sep.inputs[0]); L.new(sep.outputs["Z"], mr.inputs["Value"]); L.new(mr.outputs["Result"], ramp.inputs[0])
    cr = ramp.color_ramp; cr.interpolation = "B_SPLINE"
    while len(cr.elements) < len(stops): cr.elements.new(0.5)
    for e, (p, c) in zip(cr.elements, stops): e.position = p; e.color = lin(c)
    return ramp

def sky():
    for o in bpy.data.objects:   # engine-only shader objects (no material in Blender): never render as grey
        if o.type == "MESH" and not any(s.material for s in o.material_slots):
            o.hide_render = True; o.hide_viewport = True
    w = bpy.data.worlds.get("WaldSky") or bpy.data.worlds.new("WaldSky")
    w.use_nodes = True; N = w.node_tree.nodes; L = w.node_tree.links; N.clear()
    out = N.new("ShaderNodeOutputWorld")
    # what the CAMERA sees: the golden sky (Arian: "the sky looks pretty good", keep it)
    seen = z_ramp(N, L, [(0.0, "#E9E2DC"), (0.47, "#F7EFE4"), (0.505, "#FBE7BE"), (0.54, "#F6D284"), (0.62, "#F2B37E"), (1.0, "#D69A98")])
    bg_cam = N.new("ShaderNodeBackground"); L.new(seen.outputs["Color"], bg_cam.inputs["Color"]); bg_cam.inputs["Strength"].default_value = 0.75
    # what LIGHTS the plane: engine hemisphere light (sky #dfeeff, ground #8a7a68) + neutral env -> olive + silver metal, not brown
    fill = z_ramp(N, L, [(0.0, "#8A7A68"), (0.45, "#BDB6A8"), (0.55, "#E4E6E2"), (1.0, "#DCE6EE")])   # try 4: less blue
    bg_lit = N.new("ShaderNodeBackground"); L.new(fill.outputs["Color"], bg_lit.inputs["Color"]); bg_lit.inputs["Strength"].default_value = 0.6   # try 3 had 0.7: plane went grey-blue
    lp = N.new("ShaderNodeLightPath"); mix = N.new("ShaderNodeMixShader")
    L.new(lp.outputs["Is Camera Ray"], mix.inputs[0]); L.new(bg_lit.outputs[0], mix.inputs[1]); L.new(bg_cam.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs["Surface"])
    bpy.context.scene.world = w

def sun():
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.data.type == "SUN":
            d = o.data
            d.color = tuple(lin("#FFE4B8")[:3])  # engine sun colour (try 2 was too orange -> brown plane, salmon clouds)
            d.energy = 6.0                     # engine 2.8 x outdoor sunGain 2.0
            d.angle = math.radians(0.8)        # sharp shadow edges
            d.use_shadow = True
        if o.type == "LIGHT" and o.data.type == "POINT": o.hide_render = True

# ---------------- clouds: the engine's puffy Sprites did not export (only their empties came) ----------------
def puff_image(name, top, under, seed):
    # same drawing as engine moreplaces.ts puffTex(): 9 soft round puffs, darker underside (canvas 256x160)
    img = bpy.data.images.get(name)
    if img: return img
    W, H = 256, 160; rnd = random.Random(seed)
    a = [0.0] * (W * H)
    for _ in range(9):
        x = 40 + rnd.random() * 176; y = 60 + rnd.random() * 50; r = 26 + rnd.random() * 34
        for py in range(max(0, int(y - r)), min(H, int(y + r) + 1)):
            for px in range(max(0, int(x - r)), min(W, int(x + r) + 1)):
                t = math.hypot(px - x, py - y) / r
                if t >= 1: continue
                al = 1.0 if t < 0.75 else 1 - (t - 0.75) / 0.25
                i = py * W + px; a[i] = al + a[i] * (1 - al)
    T = srgb(top); U = srgb(under); pix = [0.0] * (W * H * 4)
    for py in range(H):
        s = min(1.0, max(0.0, (py - 80) / 80)); c = [T[k] * (1 - s) + U[k] * s for k in range(3)]
        row = (H - 1 - py) * W                      # Blender rows go bottom-up
        for px in range(W):
            j = (row + px) * 4; pix[j:j+4] = (c[0], c[1], c[2], a[py * W + px])
    img = bpy.data.images.new(name, W, H, alpha=True); img.pixels[:] = pix; img.pack()
    return img

def puff_material(name, img):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True; N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    out = N.new("ShaderNodeOutputMaterial"); tex = N.new("ShaderNodeTexImage"); tex.image = img; tex.extension = "CLIP"
    em = N.new("ShaderNodeEmission"); tr = N.new("ShaderNodeBsdfTransparent"); mix = N.new("ShaderNodeMixShader")
    # engine scene fog (linear, near 60 -> far 420) fades far puffs into the haze; Blender mist skips see-through cards
    cd = N.new("ShaderNodeCameraData"); fr = N.new("ShaderNodeMapRange"); fr.clamp = True
    fr.inputs["From Min"].default_value = 0; fr.inputs["To Min"].default_value = 0.15; fr.inputs["From Max"].default_value = 420; fr.inputs["To Max"].default_value = 0.85
    L.new(cd.outputs["View Distance"], fr.inputs["Value"])
    fg = N.new("ShaderNodeMix"); fg.data_type = "RGBA"; L.new(fr.outputs["Result"], fg.inputs["Factor"])
    L.new(tex.outputs["Color"], fg.inputs["A"]); fg.inputs["B"].default_value = lin(HAZE)
    L.new(fg.outputs["Result"], em.inputs["Color"]); em.inputs["Strength"].default_value = 0.9   # 1.0 = flat pure white up close   # engine Sprite = unlit
    L.new(tex.outputs["Alpha"], mix.inputs[0]); L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs["Surface"])
    m.surface_render_method = "BLENDED"
    try: m.use_shadow = False
    except Exception: pass
    return m

def card_mesh():
    me = bpy.data.meshes.get("cloudCard")
    if me: return me
    me = bpy.data.meshes.new("cloudCard")
    me.from_pydata([(-0.5, 0, -0.5), (0.5, 0, -0.5), (0.5, 0, 0.5), (-0.5, 0, 0.5)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name="UVMap")
    for li, (u, v) in zip(range(4), ((0, 0), (1, 0), (1, 1), (0, 1))): uv.data[li].uv = (u, v)
    return me

def clouds():
    cam = bpy.data.objects.get("ShotCam") or bpy.context.scene.camera
    me = card_mesh(); made = 0
    puff_material("puff0", puff_image("puff0", "#FFFFFF", "#C9CFEA", 40))
    if not me.materials: me.materials.append(bpy.data.materials["puff0"])   # one slot on the mesh, real material per object
    seas = [o for o in bpy.data.objects if o.name.endswith("_cloudSea")]
    for sea in seas:
        storm = sea.matrix_world.translation.y < -800          # second sea = the storm (engine: top #8E97C2, under #3B4378)
        top, under, seed = ("#8E97C2", "#3B4378", 9) if storm else ("#FFFFFF", "#C9CFEA", 4)
        mats = [puff_material(f"puff{'Storm' if storm else ''}{i}", puff_image(f"puff{'Storm' if storm else ''}{i}", top, under, seed * 10 + i)) for i in range(4)]
        kids = [c for c in sea.children if c.type == "EMPTY" and c.name.endswith("_cloud")]
        for i, e in enumerate(kids):
            if any(c.name.startswith("card_") for c in e.children): continue
            ob = bpy.data.objects.new("card_" + e.name, me)
            bpy.context.scene.collection.objects.link(ob)
            ob.parent = e; ob.matrix_parent_inverse.identity()       # empty scale = sprite size (w, 1, 0.62w)
            ob.visible_shadow = False
            c = ob.constraints.new("TRACK_TO"); c.target = cam; c.track_axis = "TRACK_NEGATIVE_Y"; c.up_axis = "UP_Z"
            ob["puff"] = i % 4; made += 1
    # materials per object (the card mesh is shared)
    for ob in bpy.data.objects:
        if ob.name.startswith("card_"):
            storm = ob.parent and ob.parent.parent and ob.parent.parent.matrix_world.translation.y < -800
            ob.material_slots[0].link = "OBJECT"
            ob.material_slots[0].material = bpy.data.materials.get(f"puff{'Storm' if storm else ''}{ob['puff']}")
    return made

def cloud_base():
    # the flat sheet under the puffs: engine #EEF0FA, lit -> white. Add a little self-glow so it never goes salmon.
    for o in bpy.data.objects:
        if not o.name.endswith("_cloudBase"): continue
        for s in o.material_slots:
            m = s.material
            if not m or m.get("look_done"): continue
            b = m.node_tree.nodes.get("Principled BSDF")
            b.inputs["Base Color"].default_value = lin("#D8DBE8")   # #EEF0FA clipped to flat white under the sun
            b.inputs["Emission Color"].default_value = lin("#F4F2EE"); b.inputs["Emission Strength"].default_value = 0.1   # 0.55 clipped to flat white
            m["look_done"] = 1

# ---------------- finish: glow, haze, depth of field (try 7, 12:27) ----------------
def dof():
    # focus on the bullet holes (the story point); far clouds go a little soft
    cam = bpy.context.scene.camera; holes = bpy.data.objects.get("n4u_bulletHoles")
    if not holes: return
    f = bpy.data.objects.get("focusHoles")
    if not f:
        import mathutils
        f = bpy.data.objects.new("focusHoles", None); bpy.context.scene.collection.objects.link(f)
        c = sum((mathutils.Vector(v) for v in holes.bound_box), mathutils.Vector()) / 8
        f.parent = holes; f.matrix_parent_inverse.identity(); f.location = c    # rides with the plane, never moves it
    d = cam.data.dof; d.use_dof = True; d.focus_object = f; d.aperture_fstop = 2.8

def post():
    sc = bpy.context.scene; vl = bpy.context.view_layer
    vl.use_pass_mist = True
    ms = sc.world.mist_settings; ms.start = 40; ms.depth = 380; ms.falloff = "LINEAR"
    ng = bpy.data.node_groups.get("WaldComp")
    if ng: bpy.data.node_groups.remove(ng)
    ng = bpy.data.node_groups.new("WaldComp", "CompositorNodeTree")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    N = ng.nodes; L = ng.links
    rl = N.new("CompositorNodeRLayers"); out = N.new("NodeGroupOutput")
    # glow: bloom only above white, so the lit holes and beams shine, not the whole frame
    gl = N.new("CompositorNodeGlare")
    gl.inputs["Type"].default_value = "Bloom"; gl.inputs["Quality"].default_value = "High"
    gl.inputs["Threshold"].default_value = 0.95; gl.inputs["Strength"].default_value = 0.5; gl.inputs["Size"].default_value = 0.6
    L.new(rl.outputs["Image"], gl.inputs["Image"])
    # haze: warm mist by distance, but not on the sky (sky mist = 1)
    lt = N.new("ShaderNodeMath"); lt.operation = "LESS_THAN"; L.new(rl.outputs["Mist"], lt.inputs[0]); lt.inputs[1].default_value = 0.999
    k = N.new("ShaderNodeMath"); k.operation = "MULTIPLY"; L.new(rl.outputs["Mist"], k.inputs[0]); L.new(lt.outputs[0], k.inputs[1])
    k2 = N.new("ShaderNodeMath"); k2.operation = "MULTIPLY"; L.new(k.outputs[0], k2.inputs[0]); k2.inputs[1].default_value = 0.85
    mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MIX"
    L.new(k2.outputs[0], mx.inputs["Factor"]); L.new(gl.outputs["Image"], mx.inputs["A"]); mx.inputs["B"].default_value = lin(HAZE)
    L.new(mx.outputs["Result"], out.inputs[0])
    sc.compositing_node_group = ng
    try: sc.render.use_compositing = True
    except Exception: pass

def render_setup():
    sc = bpy.context.scene; sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    for a, v in (("taa_render_samples", 32), ("use_shadows", True), ("shadow_ray_count", 1), ("shadow_step_count", 6), ("use_raytracing", False)):
        try: setattr(ee, a, v)
        except Exception: pass
    vs = sc.view_settings
    vs.view_transform = "Standard"; vs.look = "None"   # AgX washed the colours out (try 1); the engine is plain sRGB
    vs.exposure = 0.0
    sc.render.film_transparent = False

def look(save=True):
    paint_bomber(); rays(); sky(); sun(); n = clouds(); cloud_base(); dof(); post(); render_setup()
    if save: bpy.ops.wm.save_mainfile()
    return f"look done, {n} cloud cards"

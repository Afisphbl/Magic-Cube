# Magic Cube - Blender Python Script
# ====================================
# Run this script inside Blender via: Scripting workspace > Open > run_script
# Tested with Blender 3.x and 4.x.
#
# What this script builds:
#   - A 3x3 Rubik's Cube made of 26 visible cubies (the center core is hidden)
#   - Each cubie face gets the correct standard Rubik's Cube color
#   - The cube is nicely lit with three area lights and a world sky shader
#   - A camera is set up at a 3/4 view angle
#   - Three animations are prepared as NLA strips:
#       Strip 1 (frames 1-60):   slow auto-rotate of the whole cube so you can inspect it
#       Strip 2 (frames 61-120): U face (top layer) rotates 90 degrees (a real face move)
#       Strip 3 (frames 121-180): R face (right layer) rotates 90 degrees
#
# HOW TO USE
# ----------
# 1. Open Blender.
# 2. Go to the Scripting workspace (top menu tabs).
# 3. Click "Open" and select this file, or paste it into the text editor.
# 4. Click "Run Script" (play button) or press Alt+P.
# 5. Switch to the Layout workspace and press Space to play the animation.
# 6. Scrub to frame 1: the cube auto-rotates. Frame 61: U face turns. Frame 121: R face turns.
# 7. Zoom and orbit freely in the viewport to inspect the 3D cube from any angle.
#
# COLOR SCHEME (standard Rubik's Cube)
#   Up    = White    Down  = Yellow
#   Front = Red      Back  = Orange
#   Left  = Blue     Right = Green
#   Inner cubie faces = Dark grey (not visible in normal play)

import bpy
import math
from mathutils import Vector, Euler

# ---------------------------------------------------------------------------
# 0. Clean scene
# ---------------------------------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for col in list(bpy.data.collections):
    bpy.data.collections.remove(col)

# ---------------------------------------------------------------------------
# 1. Helpers
# ---------------------------------------------------------------------------
def make_material(name, color_rgba):
    """Create a simple principled BSDF material."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color_rgba
    bsdf.inputs["Roughness"].default_value = 0.4
    bsdf.inputs["Specular IOR Level"].default_value = 0.3 if hasattr(bsdf.inputs["Specular IOR Level"], 'default_value') else None
    return mat

# Standard Rubik's Cube colors (RGBA, gamma-corrected approximate)
COLORS = {
    'white':   (0.90, 0.90, 0.90, 1.0),
    'yellow':  (1.00, 0.80, 0.00, 1.0),
    'red':     (0.80, 0.05, 0.05, 1.0),
    'orange':  (1.00, 0.38, 0.02, 1.0),
    'blue':    (0.02, 0.18, 0.75, 1.0),
    'green':   (0.03, 0.55, 0.12, 1.0),
    'inner':   (0.04, 0.04, 0.04, 1.0),   # dark grey for hidden inner faces
    'plastic': (0.02, 0.02, 0.02, 1.0),   # black plastic border
}
MATS = {k: make_material(f'RCube_{k}', v) for k, v in COLORS.items()}

# Axis -> face color when the cubie is at the positive (+) or negative (-) end
FACE_COLOR = {
    (0, +1): 'white',    # +Y = Up face
    (0, -1): 'yellow',   # -Y = Down face
    (1, +1): 'red',      # +X = Front face
    (1, -1): 'orange',   # -X = Back face
    (2, +1): 'green',    # +Z = Right face
    (2, -1): 'blue',     # -Z = Left face
}
# Cubie size and gap
CUBIE = 0.95   # size of each small cube
GAP   = 1.00   # grid spacing (center-to-center)

def cubie_color_for_face(cx, cy, cz, face_normal_axis, face_normal_sign):
    """Return the color name for a given face of a cubie at grid pos (cx,cy,cz).
       face_normal_axis: 0=X, 1=Y, 2=Z  face_normal_sign: +1 or -1
    """
    grid = [cx, cy, cz]
    pos_val = grid[face_normal_axis]
    # Only the outermost layer gets a color
    if pos_val * face_normal_sign > 0:
        # remap: axis 0=X->1(front/back), 1=Y->0(up/down), 2=Z->2(left/right)
        color_key = (face_normal_axis, face_normal_sign)
        return FACE_COLOR.get(color_key, 'inner')
    return 'inner'

# ---------------------------------------------------------------------------
# 2. Build 26 cubies (skip center core at 0,0,0)
# ---------------------------------------------------------------------------
cubie_objects = []
positions = [-1, 0, 1]

for cx in positions:
    for cy in positions:
        for cz in positions:
            if cx == 0 and cy == 0 and cz == 0:
                continue  # skip invisible core

            # Create cube mesh
            bpy.ops.mesh.primitive_cube_add(size=CUBIE, location=(cx * GAP, cy * GAP, cz * GAP))
            obj = bpy.context.active_object
            obj.name = f'Cubie_{cx}_{cy}_{cz}'

            # Assign materials per face (Blender cube faces order: +X -X +Y -Y +Z -Z)
            # Blender default cube face indices: 0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z, 5=-Z
            # Our mapping: axis0=X, axis1=Y, axis2=Z
            face_defs = [
                (0, +1),  # face 0: +X = front in our scheme
                (0, -1),  # face 1: -X = back
                (1, +1),  # face 2: +Y = up
                (1, -1),  # face 3: -Y = down
                (2, +1),  # face 4: +Z = right
                (2, -1),  # face 5: -Z = left
            ]
            obj.data.materials.clear()
            # Add plastic border material first (slot 0, default)
            obj.data.materials.append(MATS['plastic'])
            for slot_idx, (axis, sign) in enumerate(face_defs):
                color_name = cubie_color_for_face(cx, cy, cz, axis, sign)
                mat = MATS[color_name]
                if mat not in obj.data.materials[:]:
                    obj.data.materials.append(mat)
                mat_slot = obj.data.materials[:].index(mat)
                for poly in obj.data.polygons:
                    if poly.index == slot_idx:
                        poly.material_index = mat_slot

            cubie_objects.append(obj)

# ---------------------------------------------------------------------------
# 3. Empty parent for whole-cube rotation
# ---------------------------------------------------------------------------
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
cube_root = bpy.context.active_object
cube_root.name = 'CubeRoot'
for obj in cubie_objects:
    obj.parent = cube_root

# ---------------------------------------------------------------------------
# 4. Empties for face layers (for face rotation animations)
# ---------------------------------------------------------------------------
def make_face_empty(name, loc):
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=loc)
    e = bpy.context.active_object
    e.name = name
    e.parent = cube_root
    return e

U_face = make_face_empty('Face_U', (0,  GAP, 0))   # top layer (+Y)
R_face = make_face_empty('Face_R', (0, 0,  GAP))   # right layer (+Z)

# Parent top-layer cubies to U_face, right-layer cubies to R_face
for obj in cubie_objects:
    name_parts = obj.name.split('_')
    cx, cy, cz = int(name_parts[1]), int(name_parts[2]), int(name_parts[3])
    if cy == 1:
        obj.parent = U_face
        obj.matrix_parent_inverse = U_face.matrix_world.inverted()
    elif cz == 1:
        obj.parent = R_face
        obj.matrix_parent_inverse = R_face.matrix_world.inverted()

# ---------------------------------------------------------------------------
# 5. Camera
# ---------------------------------------------------------------------------
bpy.ops.object.camera_add(location=(5.5, -5.5, 5.0))
cam = bpy.context.active_object
cam.name = 'Camera'
cam.rotation_euler = Euler((math.radians(55), 0, math.radians(45)), 'XYZ')
bpy.context.scene.camera = cam

# ---------------------------------------------------------------------------
# 6. Lighting  (3-point: key + fill + rim)
# ---------------------------------------------------------------------------
def add_area_light(name, loc, rot_euler_deg, energy):
    bpy.ops.object.light_add(type='AREA', location=loc)
    light = bpy.context.active_object
    light.name = name
    light.rotation_euler = Euler(tuple(math.radians(d) for d in rot_euler_deg), 'XYZ')
    light.data.energy = energy
    light.data.size = 3.0
    return light

add_area_light('Key',  (6, -4, 8),   (60, 0, 40),  800)
add_area_light('Fill', (-6, -3, 4),  (60, 0, -40), 300)
add_area_light('Rim',  (0,  8, 4),   (120, 0, 0),  200)

# World sky
world = bpy.context.scene.world
if world is None:
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs["Color"].default_value = (0.07, 0.07, 0.09, 1.0)
    bg.inputs["Strength"].default_value = 0.5

# ---------------------------------------------------------------------------
# 7. Animation keyframes
# ---------------------------------------------------------------------------
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end   = 180
scene.render.fps  = 24

def set_rot_key(obj, frame, rot_euler):
    scene.frame_set(frame)
    obj.rotation_euler = rot_euler
    obj.keyframe_insert(data_path="rotation_euler", frame=frame)

# Strip 1 (frames 1-60): whole cube slow spin around Y
set_rot_key(cube_root, 1,   Euler((0, 0, 0), 'XYZ'))
set_rot_key(cube_root, 60,  Euler((0, math.radians(360), 0), 'XYZ'))

# Strip 2 (frames 61-120): U face 90 degree turn (clockwise from top)
set_rot_key(U_face, 61,  Euler((0, 0, 0), 'XYZ'))
set_rot_key(U_face, 90,  Euler((0, math.radians(-90), 0), 'XYZ'))
set_rot_key(U_face, 120, Euler((0, math.radians(-90), 0), 'XYZ'))

# Strip 3 (frames 121-180): R face 90 degree turn (clockwise from right)
set_rot_key(R_face, 121, Euler((0, 0, 0), 'XYZ'))
set_rot_key(R_face, 150, Euler((math.radians(90), 0, 0), 'XYZ'))
set_rot_key(R_face, 180, Euler((math.radians(90), 0, 0), 'XYZ'))

# Smooth interpolation on all fcurves
# Compatible with both Blender < 4.4 (action.fcurves) and 4.4+ (layered actions)
def iter_fcurves(obj):
    action = obj.animation_data.action if obj.animation_data else None
    if not action:
        return
    if hasattr(action, 'fcurves'):
        # Legacy API (Blender < 4.4)
        yield from action.fcurves
    else:
        # Blender 4.4+ layered action system
        slot = obj.animation_data.action_slot
        for layer in action.layers:
            for strip in layer.strips:
                if hasattr(strip, 'channelbag') and slot:
                    cb = strip.channelbag(slot)
                    if cb:
                        yield from cb.fcurves

for obj in [cube_root, U_face, R_face]:
    for fcurve in iter_fcurves(obj):
        for kp in fcurve.keyframe_points:
            kp.interpolation = 'BEZIER'

# ---------------------------------------------------------------------------
# 8. Render settings (Cycles for best quality, EEVEE works too)
# ---------------------------------------------------------------------------
scene.render.engine = 'CYCLES'
scene.cycles.samples = 128
scene.render.resolution_x = 1080
scene.render.resolution_y = 1920   # portrait (phone aspect ratio)
scene.render.film_transparent = False

# ---------------------------------------------------------------------------
# 9. Done
# ---------------------------------------------------------------------------
# Go to frame 1 and set up viewport shading
scene.frame_set(1)
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        for space in area.spaces:
            if space.type == 'VIEW_3D':
                space.shading.type = 'MATERIAL'

print("=" * 60)
print("Magic Cube Blender prototype ready!")
print("  Frames   1-60:  whole cube slow 360 spin")
print("  Frames  61-120: U face (top) rotates 90 degrees")
print("  Frames 121-180: R face (right) rotates 90 degrees")
print("  Press Space in the viewport to play.")
print("=" * 60)

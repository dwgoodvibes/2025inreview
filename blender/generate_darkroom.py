"""
Firewatch Darkroom Scene Generator for Blender
Based on the Firewatch-style reference with overhead table lamp lighting.

Run this script in Blender's Scripting workspace to generate the complete scene.
Tested with Blender 3.6+
"""

import bpy
import math
import random
from mathutils import Vector

# =============================================================================
# CONFIGURATION
# =============================================================================

CONFIG = {
    # Colors (linear RGB, will be used in Blender's color space)
    "lamp_color": (1.0, 0.37, 0.0),       # Warm orange #ff5e00
    "lamp_intensity": 100,                 # Watts for point light
    "wood_color": (0.65, 0.25, 0.05),     # Warm reddish-brown (Firewatch style)
    "tray_color": (0.85, 0.82, 0.75),     # Off-white/cream plastic
    "bottle_developer": (0.6, 0.35, 0.15), # Amber bottle
    "bottle_fixer": (0.2, 0.2, 0.2),       # Dark bottle
    
    # Scene settings
    "table_size": (2.5, 1.8, 0.08),        # Width, Depth, Thickness
    "table_height": 0.8,
    "tray_size": (1.0, 0.8, 0.08),          # Width, Depth, Height (larger for main focus)
    "contact_sheet_size": (0.85, 0.65),    # Width, Height (larger to fill tray)
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def clear_scene():
    """Remove all objects from the scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    
    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)

def create_material(name, color, roughness=0.5, metallic=0.0):
    """Create a simple PBR material."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    
    # Get the principled BSDF
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    
    return mat

def create_textured_material(name, color, roughness=0.5, metallic=0.0, usage="general"):
    """Create a PBR material with stylized 'Firewatch' texture using Voronoi."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    
    # Clear default nodes
    for node in nodes:
        nodes.remove(node)
        
    # Create nodes
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    
    # Texture Coordinate & Mapping
    tex_coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])
    
    # Voronoi for painterly look
    voronoi = nodes.new("ShaderNodeTexVoronoi")
    voronoi.inputs["Scale"].default_value = 100.0 if usage != "wall" else 40.0
    voronoi.inputs["Randomness"].default_value = 1.0
    links.new(mapping.outputs["Vector"], voronoi.inputs["Vector"])
    
    # Noise for extra detail (mixed in)
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 50.0
    noise.inputs["Detail"].default_value = 2.0
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    
    # Color Ramp to mix base color with slightly different hue/value
    ramp = nodes.new("ShaderNodeValToRGB")
    
    # Base color calculations
    c = color
    # create a variation color (slightly darker and richer)
    variation = (c[0]*0.8, c[1]*0.75, c[2]*0.7, 1.0)
    base = (*c, 1.0)
    
    ramp.color_ramp.elements[0].position = 0.2
    ramp.color_ramp.elements[0].color = variation
    ramp.color_ramp.elements[1].position = 0.8
    ramp.color_ramp.elements[1].color = base
    
    # Mix Voronoi and Noise
    mix_tex = nodes.new("ShaderNodeMix")
    mix_tex.data_type = 'FLOAT'
    mix_tex.blend_type = 'LINEAR_LIGHT'
    mix_tex.inputs[0].default_value = 0.3 # Factor
    links.new(voronoi.outputs["Distance"], mix_tex.inputs[6]) # A
    links.new(noise.outputs["Fac"], mix_tex.inputs[7])        # B
    
    # Link texture mix to color ramp
    links.new(mix_tex.outputs[2], ramp.inputs["Fac"])
    
    # Output to BSDF
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    
    # Set physical properties
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    
    return mat

    return mat

def create_wood_plank_material(name, color, roughness=0.6):
    """Create a procedural wood plank material using Brick Texture."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    
    # Clear default nodes
    for node in nodes:
        nodes.remove(node)
        
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    
    # Texture Mapping
    tex_coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])
    
    # Brick Texture for Planks
    brick = nodes.new("ShaderNodeTexBrick")
    brick.offset = 0.5
    brick.offset_frequency = 2
    brick.squash = 1.0
    brick.squash_frequency = 2
    
    # Scale for planks (Long on X, narrow on Y)
    # Adjust mapping scale instead of texture scale for better control
    mapping.inputs["Scale"].default_value = (1.0, 1.0, 1.0) 
    
    # Brick settings for "Planks"
    brick.inputs["Scale"].default_value = 4.0 
    brick.inputs["Mortar Size"].default_value = 0.02 # Gap between planks
    brick.inputs["Mortar Smooth"].default_value = 0.01
    brick.inputs["Bias"].default_value = 0.0
    brick.inputs["Brick Width"].default_value = 0.5  # Aspect ratio determining plank length
    brick.inputs["Row Height"].default_value = 0.15
    
    links.new(mapping.outputs["Vector"], brick.inputs["Vector"])
    
    # Wood Grain (Noise)
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 8.0 # Larger scale for painterly look
    noise.inputs["Detail"].default_value = 1.0 # Less detail for cleaner look
    noise.inputs["Roughness"].default_value = 0.4
    # Stretch noise for grain effect
    grain_mapping = nodes.new("ShaderNodeMapping")
    grain_mapping.inputs["Scale"].default_value = (2.0, 20.0, 2.0) # Stretched along Y? Depends on UV. 
    # Planks are usually X or Y aligned. Let's assume grain runs along the plank length.
    
    links.new(tex_coord.outputs["Object"], grain_mapping.inputs["Vector"])
    links.new(grain_mapping.outputs["Vector"], noise.inputs["Vector"])
    
    # Mix Brick Color with Wood Grain
    # Brick gives us random greyscale per plank in "Color" output
    
    # Color Ramp for Wood Colors
    ramp = nodes.new("ShaderNodeValToRGB")
    c = color
    # Darker/Desaturated variation
    v1 = (c[0]*0.6, c[1]*0.5, c[2]*0.4, 1.0)
    v2 = (c[0]*1.1, c[1]*1.0, c[2]*0.9, 1.0)
    
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = v1
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = v2
    
    # Mix Noise and Brick Color to drive the Ramp
    mix_pat = nodes.new("ShaderNodeMix")
    mix_pat.data_type = 'FLOAT'
    mix_pat.blend_type = 'OVERLAY'
    mix_pat.inputs[0].default_value = 0.7 # Factor
    
    # Brick Color output is random color per brick. 
    # But usually it's better to use Bias/Offset? 
    # Brick Texture "Color" output is the color of the brick.
    # We want to use that random value to drive the color ramp position?
    # Actually, Brick texture outputs a Color. We can turn that into a Value (greyscale).
    
    # Let's simple mix: 
    # Base = Brick Color (Randomized)
    # Overlay = Noise
    
    # Actually, let's use the Brick "Color" directly if we set the inputs right.
    # But better: Use the Brick Color as a factor for the ramp?
    # Brick nodes have "Color1", "Color2", "Mortar".
    # We set Color1=Black, Color2=White, Mortar=Black.
    brick.inputs["Color1"].default_value = (0,0,0,1)
    brick.inputs["Color2"].default_value = (1,1,1,1)
    brick.inputs["Mortar"].default_value = (0,0,0,1) # Mortar is black (groove)
    
    # So Brick.Color output is a greyscale map of planks.
    
    links.new(brick.outputs["Color"], mix_pat.inputs[6]) # A
    links.new(noise.outputs["Fac"], mix_pat.inputs[7])   # B (Grain)
    
    links.new(mix_pat.outputs[2], ramp.inputs["Fac"])
    
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    
    # Bump Mapping
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.1 # Softer bump for stylized look
    # Use the Brick geometric info for strong plank edges, and noise for grain
    # Brick.Fac gives the brick shape? No.
    # Brick Color (Greyscale) is good for height if planks are uneven.
    # Better: Use Brick geometry for normal.
    links.new(mix_pat.outputs[2], bump.inputs["Height"])
    
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    
    bsdf.inputs["Roughness"].default_value = roughness
    
    return mat

def create_emission_material(name, color, strength=10):
    """Create an emissive material for the lamp."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    
    # Clear default nodes
    for node in nodes:
        nodes.remove(node)
    
    # Create emission shader
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (*color, 1.0)
    emission.inputs["Strength"].default_value = strength
    
    # Create output
    output = nodes.new("ShaderNodeOutputMaterial")
    links.new(emission.outputs["Emission"], output.inputs["Surface"])
    
    return mat

# =============================================================================
# SCENE OBJECTS
# =============================================================================

def create_displacement_texture(name="Wood_Displacement"):
    """Create a Cloud texture for displacement."""
    if name in bpy.data.textures:
        return bpy.data.textures[name]
    
    tex = bpy.data.textures.new(name, type='CLOUDS')
    tex.noise_scale = 0.5
    tex.noise_depth = 2
    return tex


def create_developer_tray():
    """
    Create a photographic developer tray matching the Firewatch reference.
    
    Features:
    - Off-white/cream plastic color
    - Tapered walls (angled outward)
    - Rounded edges and bevels
    - Positioned on the table surface
    """
    import bmesh
    
    # Tray configuration (matching reference)
    tray_width = 0.92       # X - outer width
    tray_depth = 0.62       # Y - outer depth  
    tray_height = 0.055     # Z - wall height (shallow)
    wall_thickness = 0.02   # Thickness of tray walls
    base_thickness = 0.012  # Thickness of bottom
    taper_angle = 15        # Degrees - walls lean outward
    
    # Material colors
    tray_color = (0.85, 0.82, 0.75)  # Cream/off-white like reference
    
    # Calculate tapered dimensions
    taper = math.radians(taper_angle)
    taper_offset = tray_height * math.tan(taper)
    
    # Inner dimensions
    inner_w_bottom = tray_width - 2 * wall_thickness
    inner_d_bottom = tray_depth - 2 * wall_thickness
    inner_w_top = inner_w_bottom + 2 * taper_offset
    inner_d_top = inner_d_bottom + 2 * taper_offset
    
    # Create bmesh for precise geometry
    bm = bmesh.new()
    
    # Half dimensions for centering
    hw = inner_w_bottom / 2
    hd = inner_d_bottom / 2
    hw_out = tray_width / 2
    hd_out = tray_depth / 2
    hw_top = inner_w_top / 2
    hd_top = inner_d_top / 2
    
    # --- BASE VERTICES ---
    # Bottom inner (at z = base_thickness)
    v_base = [
        bm.verts.new((-hw, -hd, base_thickness)),
        bm.verts.new((hw, -hd, base_thickness)),
        bm.verts.new((hw, hd, base_thickness)),
        bm.verts.new((-hw, hd, base_thickness)),
    ]
    bm.faces.new(v_base)  # Inner bottom
    
    # Bottom outer (at z = 0)
    v_base_out = [
        bm.verts.new((-hw_out, -hd_out, 0)),
        bm.verts.new((hw_out, -hd_out, 0)),
        bm.verts.new((hw_out, hd_out, 0)),
        bm.verts.new((-hw_out, hd_out, 0)),
    ]
    bm.faces.new(reversed(v_base_out))  # Outer bottom
    
    # --- TOP VERTICES ---
    # Top inner (at z = tray_height)
    v_top_inner = [
        bm.verts.new((-hw_top, -hd_top, tray_height)),
        bm.verts.new((hw_top, -hd_top, tray_height)),
        bm.verts.new((hw_top, hd_top, tray_height)),
        bm.verts.new((-hw_top, hd_top, tray_height)),
    ]
    
    # Top outer (at z = tray_height)
    v_top_outer = [
        bm.verts.new((-hw_out, -hd_out, tray_height)),
        bm.verts.new((hw_out, -hd_out, tray_height)),
        bm.verts.new((hw_out, hd_out, tray_height)),
        bm.verts.new((-hw_out, hd_out, tray_height)),
    ]
    
    # --- INNER WALLS ---
    bm.faces.new([v_base[0], v_base[1], v_top_inner[1], v_top_inner[0]])  # Front
    bm.faces.new([v_base[1], v_base[2], v_top_inner[2], v_top_inner[1]])  # Right
    bm.faces.new([v_base[2], v_base[3], v_top_inner[3], v_top_inner[2]])  # Back
    bm.faces.new([v_base[3], v_base[0], v_top_inner[0], v_top_inner[3]])  # Left
    
    # --- OUTER WALLS ---
    bm.faces.new([v_base_out[1], v_base_out[0], v_top_outer[0], v_top_outer[1]])  # Front
    bm.faces.new([v_base_out[2], v_base_out[1], v_top_outer[1], v_top_outer[2]])  # Right
    bm.faces.new([v_base_out[3], v_base_out[2], v_top_outer[2], v_top_outer[3]])  # Back
    bm.faces.new([v_base_out[0], v_base_out[3], v_top_outer[3], v_top_outer[0]])  # Left
    
    # --- BASE EDGES (connecting inner bottom to outer bottom) ---
    bm.faces.new([v_base_out[0], v_base_out[1], v_base[1], v_base[0]])  # Front
    bm.faces.new([v_base_out[1], v_base_out[2], v_base[2], v_base[1]])  # Right
    bm.faces.new([v_base_out[2], v_base_out[3], v_base[3], v_base[2]])  # Back
    bm.faces.new([v_base_out[3], v_base_out[0], v_base[0], v_base[3]])  # Left
    
    # --- RIM (top surface) ---
    bm.faces.new([v_top_inner[0], v_top_inner[1], v_top_outer[1], v_top_outer[0]])  # Front
    bm.faces.new([v_top_inner[1], v_top_inner[2], v_top_outer[2], v_top_outer[1]])  # Right
    bm.faces.new([v_top_inner[2], v_top_inner[3], v_top_outer[3], v_top_outer[2]])  # Back
    bm.faces.new([v_top_inner[3], v_top_inner[0], v_top_outer[0], v_top_outer[3]])  # Left
    
    bm.normal_update()
    
    # Create mesh and object
    mesh = bpy.data.meshes.new("Developer_Tray")
    bm.to_mesh(mesh)
    bm.free()
    
    tray = bpy.data.objects.new("Developer_Tray", mesh)
    bpy.context.collection.objects.link(tray)
    bpy.context.view_layer.objects.active = tray
    tray.select_set(True)
    
    # --- MODIFIERS ---
    # Bevel ONLY for rounded corners/edges - NO subdivision to keep flat bottom
    bevel = tray.modifiers.new(name="Bevel", type='BEVEL')
    bevel.width = 0.012  # Thicker bevel for pronounced rounded rim
    bevel.segments = 4
    bevel.profile = 0.5
    bevel.limit_method = 'ANGLE'
    bevel.angle_limit = math.radians(60)  # Only bevel sharp edges
    
    # Apply bevel modifier
    bpy.ops.object.modifier_apply(modifier="Bevel")
    
    # Smooth shading with angle-based auto-smooth (Blender 4.0+ compatible)
    # In Blender 4.0+, use shade_smooth with use_auto_smooth parameter or shade_smooth_by_angle
    try:
        # Blender 4.1+ method
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(45))
    except AttributeError:
        # Fallback for older Blender
        bpy.ops.object.shade_smooth()
        if hasattr(tray.data, 'use_auto_smooth'):
            tray.data.use_auto_smooth = True
            tray.data.auto_smooth_angle = math.radians(45)
    
    # --- MATERIAL ---
    mat = create_material("Tray_Plastic", tray_color, roughness=0.7)
    tray.data.materials.append(mat)
    
    # --- POSITION ON TABLE ---
    table_height = CONFIG["table_height"]
    table_thickness = CONFIG["table_size"][2]
    tray.location = (0, 0, table_height + table_thickness / 2)
    
    print(f"    Created developer tray at height {tray.location.z:.3f}")
    
    # --- CREATE LIQUID SURFACE ---
    # Liquid fills the tray interior, slightly below the rim
    liquid_height = tray_height * 0.7  # 70% full
    
    # Create liquid plane
    bpy.ops.mesh.primitive_plane_add(size=1)
    liquid = bpy.context.active_object
    liquid.name = "Developer_Liquid"
    
    # Size to fit inside tapered tray walls
    # At liquid height, the inner dimensions are between bottom and top
    liquid_ratio = liquid_height / tray_height
    liquid_inner_w = inner_w_bottom + (inner_w_top - inner_w_bottom) * liquid_ratio
    liquid_inner_d = inner_d_bottom + (inner_d_top - inner_d_bottom) * liquid_ratio
    
    liquid.scale = (liquid_inner_w * 0.95, liquid_inner_d * 0.95, 1)
    bpy.ops.object.transform_apply(scale=True)
    
    # Position: on table, inside tray
    liquid.location = (0, 0, table_height + table_thickness / 2 + liquid_height)
    
    # --- LIQUID MATERIAL (Amber Developer Fluid) ---
    liquid_mat = bpy.data.materials.new(name="Developer_Fluid")
    liquid_mat.use_nodes = True
    nodes = liquid_mat.node_tree.nodes
    links = liquid_mat.node_tree.links
    
    # Clear default nodes
    for node in nodes:
        nodes.remove(node)
    
    # Create output and glass shader
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (400, 0)
    
    # Use Principled BSDF with transmission for liquid look
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (0, 0)
    
    # Amber/brown developer fluid color
    bsdf.inputs["Base Color"].default_value = (0.6, 0.35, 0.15, 1.0)  # Amber
    bsdf.inputs["Roughness"].default_value = 0.1  # Smooth liquid surface
    bsdf.inputs["IOR"].default_value = 1.33  # Water
    bsdf.inputs["Alpha"].default_value = 0.85  # Slight transparency
    
    # Enable transmission for liquid effect
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = 0.3
    elif "Transmission" in bsdf.inputs:
        bsdf.inputs["Transmission"].default_value = 0.3
    
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    
    liquid.data.materials.append(liquid_mat)
    
    # Enable transparency in material settings (Blender 3.x/4.x)
    # These attributes were removed in Blender 5.0
    if hasattr(liquid_mat, 'blend_method'):
        liquid_mat.blend_method = 'BLEND'
    if hasattr(liquid_mat, 'shadow_method'):
        liquid_mat.shadow_method = 'HASHED'
    
    print(f"    Created liquid surface at height {liquid.location.z:.3f}")
    
    return tray

def create_plank_wall(name, width, height, thickness, material, plank_height=0.2):
    """Create a wall made of staggered individual horizontal wood planks."""
    # Create a parent empty/container
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    wall_parent = bpy.context.active_object
    wall_parent.name = name
    
    num_rows = int(height / plank_height)
    if num_rows * plank_height < height:
        num_rows += 1
        
    row_gap = 0.008
    col_gap = 0.005
    
    displacement_tex = create_displacement_texture()
    
    for row_i in range(num_rows):
        current_z = (row_i * plank_height) + (plank_height / 2)
        if current_z > height:
            break
            
        h = plank_height - row_gap
        
        # Fill the row with segments
        current_x = -width / 2
        
        # Stagger start for odd rows to avoid aligned vertical seams
        if row_i % 2 != 0:
            start_len = random.uniform(0.2, 0.6)
            # We don't create a "partial" start plank, we just offset the first cut?
            # Actually, simplify: Just ensure random lengths for every plank.
            # But to ensure staggering, maybe force a short first piece?
            pass

        while current_x < (width / 2) - 0.05:
            # Determine length for this segment
            # Max length 1.5m, Min 0.5m
            seg_len = random.uniform(0.6, 1.8)
            
            # Clip to end
            if current_x + seg_len > width / 2:
                seg_len = (width / 2) - current_x
            
            # Center of the current segment
            seg_center_x = current_x + (seg_len / 2)
            
            # --- CREATE PLANK ---
            # Random variations
            thickness_var = thickness * random.uniform(0.95, 1.1)
            
            # Jitter
            pos_jitter_y = random.uniform(-0.008, 0.008) # Depth/Thickness jitter
            rot_jitter_x = math.radians(random.uniform(-0.8, 0.8))
            rot_jitter_y = math.radians(random.uniform(-0.8, 0.8))
            rot_jitter_z = math.radians(random.uniform(-0.4, 0.4))
            
            bpy.ops.mesh.primitive_cube_add(size=1)
            plank = bpy.context.active_object
            plank.name = f"{name}_Row{row_i}_X{int(current_x*10)}"
            
            # Scale & Position
            # Visual length is segment - gap
            vis_len = max(0.01, seg_len - col_gap)
            
            plank.scale = (vis_len, thickness_var, h)
            plank.location = (seg_center_x, pos_jitter_y, current_z)
            plank.rotation_euler = (rot_jitter_x, rot_jitter_y, rot_jitter_z)
            
            bpy.ops.object.transform_apply(scale=True)
            
            # Modifiers
            bevel = plank.modifiers.new(name="Bevel", type='BEVEL')
            bevel.width = 0.015
            bevel.segments = 2
            bevel.profile = 0.6
            
            subdiv = plank.modifiers.new(name="Subdivision", type='SUBSURF')
            subdiv.levels = 3 # More detail for displacement
            subdiv.render_levels = 3
            subdiv.subdivision_type = 'SIMPLE'
            
            displace = plank.modifiers.new(name="Displace", type='DISPLACE')
            displace.texture = displacement_tex
            displace.strength = 0.006
            
            plank.data.materials.append(material)
            plank.parent = wall_parent
            
            current_x += seg_len
            
    return wall_parent

def create_room():
    """Create the darkroom environment - walls, floor, and ceiling."""
    room_width = 4.0    # X dimension
    room_depth = 3.5    # Y dimension  
    room_height = 2.8   # Z dimension
    wall_thickness = 0.1
    
    # Floor
    bpy.ops.mesh.primitive_cube_add(size=1)
    floor = bpy.context.active_object
    floor.name = "Room_Floor"
    # Full width including walls
    floor.scale = (room_width + wall_thickness * 2, room_depth + wall_thickness * 2, wall_thickness)
    floor.location = (0, 0, -wall_thickness / 2)
    bpy.ops.object.transform_apply(scale=True)
    
    # Dark concrete floor
    floor_mat = create_textured_material("Floor_Concrete", (0.1, 0.09, 0.08), roughness=0.9, usage="floor")
    floor.data.materials.append(floor_mat)
    
    # Dark wood material for walls
    wall_mat = create_textured_material("Wall_DarkWood", (0.15, 0.09, 0.05), roughness=0.85, usage="wall")
    
    # Back wall - spans the entire width plus corner thickness
    # Use create_plank_wall for geometry-based planks
    back_wall = create_plank_wall(
        "Room_BackWall", 
        room_width + wall_thickness * 2, 
        room_height, 
        wall_thickness, 
        wall_mat
    )
    back_wall.location = (0, room_depth / 2 + wall_thickness / 2, 0)
    
    # Left Wall
    left_wall = create_plank_wall(
        "Room_LeftWall", 
        room_depth, 
        room_height, 
        wall_thickness, 
        wall_mat
    )
    left_wall.rotation_euler = (0, 0, math.radians(90))
    left_wall.location = (-room_width / 2 - wall_thickness / 2, 0, 0)
    
    # Right Wall
    right_wall = create_plank_wall(
        "Room_RightWall", 
        room_depth, 
        room_height, 
        wall_thickness, 
        wall_mat
    )
    right_wall.rotation_euler = (0, 0, math.radians(90))
    right_wall.location = (room_width / 2 + wall_thickness / 2, 0, 0)
    
    # Ceiling
    bpy.ops.mesh.primitive_cube_add(size=1)
    ceiling = bpy.context.active_object
    ceiling.name = "Room_Ceiling"
    ceiling.scale = (room_width + wall_thickness * 2, room_depth + wall_thickness * 2, wall_thickness)
    ceiling.location = (0, 0, room_height + wall_thickness / 2)
    bpy.ops.object.transform_apply(scale=True)
    
    ceiling_mat = create_textured_material("Ceiling_Dark", (0.05, 0.04, 0.03), roughness=0.95)
    ceiling.data.materials.append(ceiling_mat)
    
    return floor, back_wall, left_wall, right_wall, ceiling

def create_rug():
    """Create a rug under the table with procedural fabric texture."""
    rug_width = 2.8
    rug_depth = 2.2
    
    bpy.ops.mesh.primitive_plane_add(size=1)
    rug = bpy.context.active_object
    rug.name = "Rug"
    rug.scale = (rug_width, rug_depth, 1) # Correct scale
    rug.location = (0, 0, 0.005)
    
    bpy.ops.object.transform_apply(scale=True)
    
    # Fabric material
    mat = bpy.data.materials.new(name="Rug_Fabric")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    
    for node in nodes:
        nodes.remove(node)
        
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    
    # Wave texture for fabric pattern
    wave = nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 50.0 # Adjusted scale
    wave.inputs["Detail"].default_value = 5.0
    
    # Mix for color variation (red/brown)
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.2, 0.05, 0.05, 1.0) # Dark Red
    ramp.color_ramp.elements[1].color = (0.25, 0.1, 0.08, 1.0) # Light Rub
    
    links.new(wave.outputs["Color"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    
    bsdf.inputs["Roughness"].default_value = 0.95
    
    rug.data.materials.append(mat)
    return rug

def create_table_legs(table_obj):
    """Add legs to the table."""
    width, depth, thick = CONFIG["table_size"]
    height = CONFIG["table_height"]
    
    leg_radius = 0.04
    # Increase offset to bring legs further in
    leg_offset_x = width * 0.4  # Place at 40% of width (from center)
    leg_offset_y = depth * 0.4  # Place at 40% of depth
    
    corners = [
        (leg_offset_x, leg_offset_y),
        (-leg_offset_x, leg_offset_y),
        (leg_offset_x, -leg_offset_y),
        (-leg_offset_x, -leg_offset_y)
    ]
    
    metal_mat = create_textured_material("Table_Leg_Metal", (0.1, 0.1, 0.1), roughness=0.6, metallic=0.8)
    
    legs = []
    # Create legs as separate objects first, then parent
    for i, (x, y) in enumerate(corners):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=16,
            radius=leg_radius,
            depth=height
        )
        leg = bpy.context.active_object
        leg.name = f"Table_Leg_{i}"
        
        # Position: X, Y, and Z center (height/2)
        # Table is at z=height, so legs go from 0 to height
        leg.location = (x, y, height / 2)
        
        leg.data.materials.append(metal_mat)
        legs.append(leg)

    # Parenting logic: Select legs, then scale, then parent
    # NOTE: The table has scale applied, so legs should be children or independent.
    # To be safe for GLTF export, keep them as independent objects grouped logically or parented.
    # Parenting to an object with applied scale is fine.
    
    # Deselect all
    bpy.ops.object.select_all(action='DESELECT')
    
    # Select legs
    for leg in legs:
        leg.select_set(True)
    
    # Select table as active
    table_obj.select_set(True)
    bpy.context.view_layer.objects.active = table_obj
    
    # Parent
    bpy.ops.object.parent_set(type='OBJECT')
    
    return legs

def create_photo_frames():
    """Create simple picture frames on the back wall."""
    # Fix positions: Back wall is at Y = room_depth/2 (approx 1.75)
    # Frames need to be slightly in front of that.
    wall_y = 3.5 / 2 - 0.05 # Room depth is 3.5
    
    frame_configs = [
        {"pos": (-0.8, wall_y, 1.8), "size": (0.4, 0.5)}, # Left
        {"pos": (0.8, wall_y, 1.6), "size": (0.5, 0.4)},  # Right
        {"pos": (0.0, wall_y, 2.0), "size": (0.3, 0.3)}   # Center high
    ]
    
    wood_mat = create_textured_material("Frame_Wood", (0.1, 0.05, 0.02), roughness=0.6)
    paper_mat = create_material("Frame_Paper", (0.9, 0.9, 0.85), roughness=0.9)
    
    frames = []
    
    for i, cfg in enumerate(frame_configs):
        w, h = cfg["size"]
        x, y, z = cfg["pos"]
        
        # Frame
        bpy.ops.mesh.primitive_cube_add(size=1)
        frame = bpy.context.active_object
        frame.name = f"Photo_Frame_{i}"
        # Frame thickness 0.03
        frame.scale = (w, 0.03, h)
        frame.location = (x, y, z)
        bpy.ops.object.transform_apply(scale=True)
        frame.data.materials.append(wood_mat)
        
        # Frame inner (white matte)
        bpy.ops.mesh.primitive_cube_add(size=1)
        matte = bpy.context.active_object
        matte.name = f"Frame_Matte_{i}"
        matte.scale = (w - 0.05, 0.01, h - 0.05)
        # Slightly protruding from frame face (negative Y relative to wall?)
        # Wall is at +Y, camera looks -Y... wait. 
        # Camera is at -Y looking +Y (towards back wall).
        # So back wall is at +Y. Inner matte should be at -Y relative to frame center?
        # Actually frame center is at wall_y.
        # Matte should be slightly `y - 0.02` (closer to camera)
        matte.location = (x, y - 0.02, z) 
        bpy.ops.object.transform_apply(scale=True)
        matte.data.materials.append(paper_mat)
        
        # Parent matte to frame
        matte.parent = frame
        frames.append(frame)
        
    return frames

def create_wooden_table():
    """Create the wooden table surface with segmented planks."""
    table_width, table_depth, table_thick = CONFIG["table_size"]
    
    # Create parent empty for table
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, CONFIG["table_height"]))
    table_parent = bpy.context.active_object
    table_parent.name = "Table"
    
    # "Planks" run along Width (X)
    # We iterate along Depth (Y) to create rows of planks
    plank_width_y = 0.22 # Physical width of a single plank strip
    
    num_rows = int(table_depth / plank_width_y)
    if num_rows * plank_width_y < table_depth:
        num_rows += 1
        
    row_step = table_depth / num_rows 
    
    # Gaps
    gap_y = 0.005 # Between rows
    gap_x = 0.003 # Between segments in a row
    
    wood_mat = create_wood_plank_material("Table_Planks", (0.5, 0.28, 0.1), roughness=0.7)
    displacement_tex = create_displacement_texture()
    
    for r in range(num_rows):
        # Y center of this row
        current_y = -table_depth/2 + (r * row_step) + (row_step / 2)
        p_depth_actual = row_step - gap_y
        
        # Fill X dimension with segments
        current_x = -table_width / 2
        
        # Stagger logic
        if r % 2 != 0:
            # Start with a shorter offset piece or just standard random
            pass 
            
        while current_x < (table_width / 2) - 0.05:
             # Random Segment Length along X
            seg_len = random.uniform(0.4, 1.2)
            
            # Clip
            if current_x + seg_len > table_width / 2:
                seg_len = (table_width / 2) - current_x
            
            center_x = current_x + (seg_len / 2)
            
            # --- CREATE PLANK SEGMENT ---
            thick_var = table_thick * random.uniform(0.95, 1.05)
            height_offset = random.uniform(-0.003, 0.003)
            
            bpy.ops.mesh.primitive_cube_add(size=1)
            plank = bpy.context.active_object
            plank.name = f"Table_R{r}_X{int(current_x*10)}"
            
            vis_len_x = max(0.01, seg_len - gap_x)
            
            plank.scale = (vis_len_x, p_depth_actual, thick_var)
            plank.location = (center_x, current_y, height_offset)
            
            # Jitter
            plank.rotation_euler = (
                math.radians(random.uniform(-0.3, 0.3)), 
                math.radians(random.uniform(-0.3, 0.3)), 
                math.radians(random.uniform(-0.2, 0.2))
            )
            
            bpy.ops.object.transform_apply(scale=True)
            
            # Modifiers
            bevel = plank.modifiers.new(name="Bevel", type='BEVEL')
            bevel.width = 0.012
            bevel.segments = 2
            
            subdiv = plank.modifiers.new(name="Subdivision", type='SUBSURF')
            subdiv.levels = 3
            subdiv.render_levels = 3
            subdiv.subdivision_type = 'SIMPLE'
            
            displace = plank.modifiers.new(name="Displace", type='DISPLACE')
            displace.texture = displacement_tex
            displace.strength = 0.004
            
            plank.data.materials.append(wood_mat)
            plank.parent = table_parent
            
            current_x += seg_len

    create_table_legs(table_parent)
    return table_parent

def create_hanging_lamp():
    """Create a hanging pendant lamp over the center of the desk."""
    # Position: centered over the development tray
    lamp_x = 0.1   # Same X as tray
    lamp_y = 0.1   # Same Y as tray
    ceiling_z = 2.8  # Room ceiling height
    lamp_hang_z = 1.6  # Height of the lamp shade bottom
    
    # Ceiling mount (small cylinder)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=0.04,
        depth=0.03
    )
    mount = bpy.context.active_object
    mount.name = "Lamp_Mount"
    mount.location = (lamp_x, lamp_y, ceiling_z - 0.015)
    
    mount_mat = create_material("Lamp_Metal", (0.15, 0.15, 0.15), roughness=0.4, metallic=0.8)
    mount.data.materials.append(mount_mat)
    
    # Cord (thin cylinder)
    cord_length = ceiling_z - lamp_hang_z - 0.15
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=0.008,
        depth=cord_length
    )
    cord = bpy.context.active_object
    cord.name = "Lamp_Cord"
    cord.location = (lamp_x, lamp_y, ceiling_z - 0.03 - cord_length / 2)
    
    cord_mat = create_material("Lamp_Cord_Mat", (0.05, 0.05, 0.05), roughness=0.8)
    cord.data.materials.append(cord_mat)
    
    # Lamp shade (cone shape) - classic pendant style
    bpy.ops.mesh.primitive_cone_add(
        vertices=12,
        radius1=0.25,  # Bottom opening (wider)
        radius2=0.08,  # Top (narrower)
        depth=0.2
    )
    shade = bpy.context.active_object
    shade.name = "Lamp_Shade"
    shade.location = (lamp_x, lamp_y, lamp_hang_z + 0.1)
    
    # Dark exterior for the shade
    shade_mat = create_material("Lamp_Shade_Mat", (0.08, 0.06, 0.04), roughness=0.7)
    shade.data.materials.append(shade_mat)
    
    # Inner glow surface (disc at bottom of shade)
    bpy.ops.mesh.primitive_circle_add(
        vertices=12,
        radius=0.24,
        fill_type='NGON'
    )
    inner_glow = bpy.context.active_object
    inner_glow.name = "Lamp_InnerGlow"
    inner_glow.location = (lamp_x, lamp_y, lamp_hang_z + 0.01)
    inner_glow.rotation_euler = (0, 0, 0)
    
    # Emissive material for warm glow
    glow_mat = create_emission_material("Lamp_Glow", CONFIG["lamp_color"], strength=5)
    inner_glow.data.materials.append(glow_mat)
    
    # Add actual point light - positioned BELOW the shade to illuminate the table
    bpy.ops.object.light_add(type='POINT')
    light = bpy.context.active_object
    light.name = "Lamp_Light"
    light.location = (lamp_x, lamp_y, lamp_hang_z - 0.1)  # Below the shade
    light.data.energy = CONFIG["lamp_intensity"]
    light.data.color = CONFIG["lamp_color"]
    light.data.shadow_soft_size = 0.3  # Soft shadows
    
    # Parent all lamp parts to mount
    bpy.ops.object.select_all(action='DESELECT')
    cord.select_set(True)
    shade.select_set(True)
    inner_glow.select_set(True)
    mount.select_set(True)
    bpy.context.view_layer.objects.active = mount
    bpy.ops.object.parent_set(type='OBJECT')
    
    return mount, light





def create_chemical_bottles():
    """Create Developer and Fixer bottles."""
    base_z = CONFIG["table_height"] + CONFIG["table_size"][2] / 2
    bottles = []
    
    bottle_configs = [
        {"name": "Developer", "pos": (0.55, 0.3), "height": 0.22, "radius": 0.045, 
         "color": CONFIG["bottle_developer"]},
        {"name": "Fixer", "pos": (0.62, 0.15), "height": 0.18, "radius": 0.035,
         "color": CONFIG["bottle_fixer"]},
    ]
    
    for cfg in bottle_configs:
        # Bottle body
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=32,  # Smoother geometry
            radius=cfg["radius"],
            depth=cfg["height"]
        )
        bottle = bpy.context.active_object
        bottle.name = f"Bottle_{cfg['name']}"
        bottle.location = (cfg["pos"][0], cfg["pos"][1], base_z + cfg["height"] / 2)
        
        # Material
        bottle_mat = create_material(
            f"Bottle_{cfg['name']}_Mat",
            cfg["color"],
            roughness=0.3
        )
        bottle.data.materials.append(bottle_mat)
        
        # Bottle cap
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=32,
            radius=cfg["radius"] * 0.8,
            depth=0.025
        )
        cap = bpy.context.active_object
        cap.name = f"Cap_{cfg['name']}"
        cap.location = (cfg["pos"][0], cfg["pos"][1], base_z + cfg["height"] + 0.012)
        
        cap_mat = create_material(f"Cap_{cfg['name']}_Mat", (0.1, 0.1, 0.1), roughness=0.6)
        cap.data.materials.append(cap_mat)
        
        bottles.append((bottle, cap))
    
    return bottles

def create_scissors():
    """Create low-poly scissors/tongs beside the tray."""
    base_z = CONFIG["table_height"] + CONFIG["table_size"][2] / 2 + 0.005
    scissors_x = 0.45
    scissors_y = 0.1
    
    # Simple scissor representation (two elongated cubes)
    for i, offset in enumerate([-0.015, 0.015]):
        bpy.ops.mesh.primitive_cube_add(size=1)
        blade = bpy.context.active_object
        blade.name = f"Scissors_Blade_{i}"
        blade.scale = (0.12, 0.012, 0.003)
        blade.location = (scissors_x, scissors_y + offset, base_z)
        blade.rotation_euler = (0, 0, math.radians(15 if i == 0 else -15))
        
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        
        metal_mat = create_material("Metal", (0.4, 0.4, 0.45), roughness=0.3, metallic=0.9)
        blade.data.materials.append(metal_mat)
    
    # Handle rings (simplified as cylinders)
    for i, offset in enumerate([-0.02, 0.02]):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.02,
            minor_radius=0.005,
            major_segments=8,
            minor_segments=4
        )
        ring = bpy.context.active_object
        ring.name = f"Scissors_Ring_{i}"
        ring.location = (scissors_x + 0.13, scissors_y + offset, base_z + 0.01)
        ring.rotation_euler = (math.radians(90), 0, 0)
        
        ring_mat = create_material("Handle_Metal", (0.3, 0.3, 0.35), roughness=0.4, metallic=0.8)
        ring.data.materials.append(ring_mat)

def setup_camera():
    """Position camera for the overhead darkroom view."""
    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    camera.name = "Main_Camera"
    
    # Position: looking down at the tray from above and in front
    camera.location = (0.1, -0.8, CONFIG["table_height"] + 0.8)
    camera.rotation_euler = (math.radians(55), 0, 0)
    
    # Camera settings
    camera.data.lens = 35  # Slight wide angle
    camera.data.clip_start = 0.1
    camera.data.clip_end = 100
    
    bpy.context.scene.camera = camera
    
    return camera

def setup_environment():
    """Set up world environment and ambient lighting."""
    world = bpy.context.scene.world
    if not world:
        world = bpy.data.worlds.new("Darkroom_World")
        bpy.context.scene.world = world
    
    world.use_nodes = True
    nodes = world.node_tree.nodes
    
    # Dark ambient with slight warm tint (darkroom atmosphere)
    bg = nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.03, 0.02, 0.015, 1.0)
        bg.inputs["Strength"].default_value = 0.5
    
    # Render settings for Firewatch look
    # Use EEVEE Next for Blender 4.x, fallback to regular EEVEE for 3.x
    if hasattr(bpy.types, 'BLENDER_EEVEE_NEXT'):
        bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'
    else:
        bpy.context.scene.render.engine = 'BLENDER_EEVEE'
    
    eevee = bpy.context.scene.eevee
    
    # Bloom settings - only available in Blender 3.x
    # In Blender 4.0+, bloom is handled via compositor or is automatic
    if hasattr(eevee, 'use_bloom'):
        eevee.use_bloom = True
        eevee.bloom_intensity = 0.1
        eevee.bloom_threshold = 0.8

# =============================================================================
# MAIN EXECUTION
# =============================================================================

def generate_darkroom():
    """Generate the complete Firewatch darkroom scene."""
    print("🔴 Generating Firewatch Darkroom Scene...")
    
    # Start fresh
    clear_scene()
    
    # Create room environment
    print("  → Creating room...")
    create_room()
    
    # Create scene objects
    print("  → Creating table...")
    create_wooden_table()
    
    print("  → Creating hanging lamp...")
    create_hanging_lamp()
    
    print("  → Creating chemical bottles...")
    create_chemical_bottles()
    
    print("  → Creating scissors...")
    create_scissors()
    
    print("  → Creating developer tray...")
    create_developer_tray()
    
    print("  → Creating rug...")
    create_rug()
    
    print("  → Creating photo frames...")
    create_photo_frames()
    
    print("  → Setting up camera...")
    setup_camera()
    
    print("  → Setting up environment...")
    setup_environment()
    
    # Final adjustments
    bpy.ops.object.select_all(action='DESELECT')
    
    print("✅ Darkroom scene generated successfully!")
    
    # Auto-export to GLB
    export_to_glb()

def export_to_glb():
    """Export the scene to GLB format for web use."""
    import os
    
    # Export path - adjust this to your project structure
    export_dir = "/Users/alex/Development/Year in review/public/models"
    export_path = os.path.join(export_dir, "darkroom.glb")
    
    # Create directory if it doesn't exist
    os.makedirs(export_dir, exist_ok=True)
    
    print(f"  → Exporting to: {export_path}")
    
    # Select all mesh objects for export (exclude camera and lights)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.data.objects:
        if obj.type in ['MESH', 'CURVE', 'SURFACE', 'EMPTY']:
            obj.select_set(True)
    
    # Export as GLB
    bpy.ops.export_scene.gltf(
        filepath=export_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,           # Apply modifiers
        export_materials='EXPORT',   # Export materials
        export_cameras=False,        # Don't export cameras (set up in R3F)
        export_lights=False,         # Don't export lights (set up in R3F)
    )
    
    print(f"✅ Exported to: {export_path}")
    print("   Ready for use in React Three Fiber!")

# Run the generator
if __name__ == "__main__":
    generate_darkroom()

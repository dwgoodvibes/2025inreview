"""
Developer Tray Generator for Blender

Creates a realistic photographic developer tray with:
- Tapered walls (angled outward like real trays)
- Rounded rim/lip at the top
- Beveled internal corners
- Dark plastic material

Run this script in Blender's Scripting workspace:
    blender --background --python generate_tray.py

Tested with Blender 3.6+
"""

import bpy
import bmesh
import math
import os

# =============================================================================
# CONFIGURATION
# =============================================================================

CONFIG = {
    # Tray dimensions (matching React Tray.jsx)
    "tray_width": 0.92,       # X - outer width
    "tray_depth": 0.62,       # Y - outer depth  
    "tray_height": 0.055,     # Z - wall height (shallower like reference)
    "wall_thickness": 0.02,   # Thickness of tray walls (thinner)
    "base_thickness": 0.012,  # Thickness of bottom
    
    # Taper angle (outward lean of walls)
    "taper_angle": 15,        # Degrees - walls lean outward (more pronounced)
    
    # Rim dimensions (rolled edge like real photo trays)
    "rim_width": 0.018,       # Width of rolled rim (wider)
    "rim_height": 0.006,      # Height of rim above wall top
    
    # Material - Off-white/cream plastic like reference
    "tray_color": (0.85, 0.82, 0.75),  # Cream/off-white #d9d1bf
    "roughness": 0.7,  # Slightly smoother plastic
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


def create_tray_material():
    """Create a dark plastic material for the tray."""
    mat = bpy.data.materials.new(name="Tray_Plastic")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*CONFIG["tray_color"], 1.0)
        bsdf.inputs["Roughness"].default_value = CONFIG["roughness"]
        bsdf.inputs["Metallic"].default_value = 0.0
        # Slight specular for plastic look
        bsdf.inputs["Specular IOR Level"].default_value = 0.5
    
    return mat


# =============================================================================
# TRAY GEOMETRY
# =============================================================================

def create_developer_tray():
    """
    Create a developer tray using bmesh for precise control.
    
    The tray is modeled as a single mesh with:
    1. Base plate
    2. Four tapered walls
    3. Rounded rim at top
    4. All corners beveled
    """
    
    w = CONFIG["tray_width"]
    d = CONFIG["tray_depth"]  
    h = CONFIG["tray_height"]
    wall_t = CONFIG["wall_thickness"]
    base_t = CONFIG["base_thickness"]
    taper = math.radians(CONFIG["taper_angle"])
    
    # Calculate inner dimensions at bottom and top (due to taper)
    taper_offset = h * math.tan(taper)
    
    # Bottom inner rect
    inner_w_bottom = w - 2 * wall_t
    inner_d_bottom = d - 2 * wall_t
    
    # Top inner rect (wider due to outward taper)
    inner_w_top = inner_w_bottom + 2 * taper_offset
    inner_d_top = inner_d_bottom + 2 * taper_offset
    
    # Create bmesh
    bm = bmesh.new()
    
    # --- BASE PLATE ---
    # Create bottom face (inner bottom of tray)
    hw = inner_w_bottom / 2
    hd = inner_d_bottom / 2
    
    # Bottom vertices (at z = base_t, inner surface)
    v_base = [
        bm.verts.new((-hw, -hd, base_t)),  # 0: front-left
        bm.verts.new((hw, -hd, base_t)),   # 1: front-right
        bm.verts.new((hw, hd, base_t)),    # 2: back-right  
        bm.verts.new((-hw, hd, base_t)),   # 3: back-left
    ]
    bm.faces.new(v_base)  # Inner bottom face
    
    # Outer bottom vertices (at z = 0)
    hw_out = w / 2
    hd_out = d / 2
    v_base_out = [
        bm.verts.new((-hw_out, -hd_out, 0)),  # 4
        bm.verts.new((hw_out, -hd_out, 0)),   # 5
        bm.verts.new((hw_out, hd_out, 0)),    # 6
        bm.verts.new((-hw_out, hd_out, 0)),   # 7
    ]
    bm.faces.new(reversed(v_base_out))  # Outer bottom face (reversed for correct normal)
    
    # --- WALLS ---
    # Top inner vertices (at z = h, inner edge at top)
    hw_top = inner_w_top / 2
    hd_top = inner_d_top / 2
    
    v_top_inner = [
        bm.verts.new((-hw_top, -hd_top, h)),  # 8
        bm.verts.new((hw_top, -hd_top, h)),   # 9
        bm.verts.new((hw_top, hd_top, h)),    # 10
        bm.verts.new((-hw_top, hd_top, h)),   # 11
    ]
    
    # Top outer vertices (at z = h, outer edge - same as bottom outer + height)
    v_top_outer = [
        bm.verts.new((-hw_out, -hd_out, h)),  # 12
        bm.verts.new((hw_out, -hd_out, h)),   # 13
        bm.verts.new((hw_out, hd_out, h)),    # 14
        bm.verts.new((-hw_out, hd_out, h)),   # 15
    ]
    
    # Connect inner walls (from base inner to top inner)
    # Front wall inner
    bm.faces.new([v_base[0], v_base[1], v_top_inner[1], v_top_inner[0]])
    # Right wall inner
    bm.faces.new([v_base[1], v_base[2], v_top_inner[2], v_top_inner[1]])
    # Back wall inner
    bm.faces.new([v_base[2], v_base[3], v_top_inner[3], v_top_inner[2]])
    # Left wall inner
    bm.faces.new([v_base[3], v_base[0], v_top_inner[0], v_top_inner[3]])
    
    # Connect outer walls (from base outer to top outer)
    # Front wall outer
    bm.faces.new([v_base_out[1], v_base_out[0], v_top_outer[0], v_top_outer[1]])
    # Right wall outer  
    bm.faces.new([v_base_out[2], v_base_out[1], v_top_outer[1], v_top_outer[2]])
    # Back wall outer
    bm.faces.new([v_base_out[3], v_base_out[2], v_top_outer[2], v_top_outer[3]])
    # Left wall outer
    bm.faces.new([v_base_out[0], v_base_out[3], v_top_outer[3], v_top_outer[0]])
    
    # Connect base edges (inner bottom to outer bottom)
    # Front edge
    bm.faces.new([v_base_out[0], v_base_out[1], v_base[1], v_base[0]])
    # Right edge
    bm.faces.new([v_base_out[1], v_base_out[2], v_base[2], v_base[1]])
    # Back edge
    bm.faces.new([v_base_out[2], v_base_out[3], v_base[3], v_base[2]])
    # Left edge
    bm.faces.new([v_base_out[3], v_base_out[0], v_base[0], v_base[3]])
    
    # --- RIM (top surface connecting inner and outer top) ---
    # Front rim
    bm.faces.new([v_top_inner[0], v_top_inner[1], v_top_outer[1], v_top_outer[0]])
    # Right rim
    bm.faces.new([v_top_inner[1], v_top_inner[2], v_top_outer[2], v_top_outer[1]])
    # Back rim
    bm.faces.new([v_top_inner[2], v_top_inner[3], v_top_outer[3], v_top_outer[2]])
    # Left rim
    bm.faces.new([v_top_inner[3], v_top_inner[0], v_top_outer[0], v_top_outer[3]])
    
    # Update bmesh
    bm.normal_update()
    
    # Create mesh object
    mesh = bpy.data.meshes.new("Developer_Tray")
    bm.to_mesh(mesh)
    bm.free()
    
    # Create object
    tray = bpy.data.objects.new("Developer_Tray", mesh)
    bpy.context.collection.objects.link(tray)
    bpy.context.view_layer.objects.active = tray
    tray.select_set(True)
    
    # --- MODIFIERS ---
    
    # Bevel for rounded edges
    bevel = tray.modifiers.new(name="Bevel", type='BEVEL')
    bevel.width = 0.008  # 8mm bevel
    bevel.segments = 3
    bevel.profile = 0.5  # Smooth circular profile
    bevel.limit_method = 'ANGLE'
    bevel.angle_limit = math.radians(30)
    
    # Subdivision for smoothness
    subdiv = tray.modifiers.new(name="Subdivision", type='SUBSURF')
    subdiv.levels = 2
    subdiv.render_levels = 2
    
    # Apply modifiers for export
    bpy.ops.object.modifier_apply(modifier="Bevel")
    bpy.ops.object.modifier_apply(modifier="Subdivision")
    
    # Apply smooth shading
    bpy.ops.object.shade_smooth()
    
    # Apply material
    mat = create_tray_material()
    tray.data.materials.append(mat)
    
    return tray


# =============================================================================
# EXPORT
# =============================================================================

def export_tray():
    """Export the tray as GLB."""
    # Ensure export directory exists
    blend_dir = bpy.path.abspath("//")
    if not blend_dir:
        blend_dir = os.path.dirname(os.path.realpath(__file__))
    
    export_dir = os.path.join(blend_dir, "exports")
    os.makedirs(export_dir, exist_ok=True)
    
    export_path = os.path.join(export_dir, "tray.glb")
    
    print(f"📦 Exporting tray to: {export_path}")
    
    bpy.ops.export_scene.gltf(
        filepath=export_path,
        export_format='GLB',
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        use_selection=True,  # Only export the tray
    )
    
    print(f"✅ Export complete!")
    print(f"   File size: {os.path.getsize(export_path) / 1024:.1f} KB")
    
    return export_path


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("🧪 Generating Developer Tray...")
    
    clear_scene()
    tray = create_developer_tray()
    
    # Select tray for export
    bpy.ops.object.select_all(action='DESELECT')
    tray.select_set(True)
    bpy.context.view_layer.objects.active = tray
    
    export_path = export_tray()
    
    print(f"\n🎉 Done! Copy the tray to your public folder:")
    print(f"   cp '{export_path}' '../public/models/'")


if __name__ == "__main__":
    main()

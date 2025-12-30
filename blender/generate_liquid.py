"""
Liquid Surface Generator for Blender

Creates a liquid mesh with shape keys (morph targets) for:
- Idle ripple animation
- Interaction responses (agitation, settling)
- Surface tension effects

The mesh is designed to fit inside the developer tray and exports
with shape keys as morph targets for Three.js animation.

Run this script in Blender:
    blender --background --python generate_liquid.py

Tested with Blender 3.6+
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, noise

# =============================================================================
# CONFIGURATION
# =============================================================================

CONFIG = {
    # Liquid surface dimensions (slightly smaller than tray inner)
    "width": 0.85,          # X dimension
    "depth": 0.55,          # Y dimension
    "subdivisions": 32,     # Grid resolution for smooth deformation
    
    # Shape key deformation intensities
    "ripple_small_amp": 0.003,    # Subtle idle ripples
    "ripple_large_amp": 0.008,    # Larger interaction ripples
    "wave_amp": 0.012,            # Tilt/wave amplitude
    "settle_amp": 0.004,          # Surface tension bulge
    
    # Material - Amber developer fluid
    "liquid_color": (0.72, 0.42, 0.10),  # Amber/brown
    "transparency": 0.75,
    "roughness": 0.05,
    "ior": 1.33,  # Water-like
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


def create_liquid_material():
    """Create an amber liquid material with transparency."""
    mat = bpy.data.materials.new(name="Developer_Liquid")
    mat.use_nodes = True
    mat.blend_method = 'BLEND'
    
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    
    # Clear default nodes
    nodes.clear()
    
    # Create nodes
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (400, 0)
    
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
    
    # Set material properties
    bsdf.inputs["Base Color"].default_value = (*CONFIG["liquid_color"], 1.0)
    bsdf.inputs["Roughness"].default_value = CONFIG["roughness"]
    bsdf.inputs["IOR"].default_value = CONFIG["ior"]
    bsdf.inputs["Alpha"].default_value = CONFIG["transparency"]
    bsdf.inputs["Metallic"].default_value = 0.0
    
    # Transmission for liquid look
    bsdf.inputs["Transmission Weight"].default_value = 0.5
    
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    
    return mat


# =============================================================================
# LIQUID GEOMETRY WITH SHAPE KEYS
# =============================================================================

def create_liquid_surface():
    """
    Create a subdivided plane with shape keys for liquid animation.
    
    Shape keys:
    - Basis: Flat surface (default)
    - Ripple_Small: Concentric small ripples for idle animation
    - Ripple_Large: Larger ripples for interaction feedback
    - Wave_Front: Surface tilted forward
    - Wave_Back: Surface tilted backward
    - Settle: Slight dome/bulge (surface tension)
    """
    
    w = CONFIG["width"]
    d = CONFIG["depth"]
    subdivs = CONFIG["subdivisions"]
    
    # Create a grid mesh
    bpy.ops.mesh.primitive_grid_add(
        x_subdivisions=subdivs,
        y_subdivisions=subdivs,
        size=1.0,
        location=(0, 0, 0)
    )
    
    liquid = bpy.context.active_object
    liquid.name = "Liquid_Surface"
    
    # Scale to correct dimensions
    liquid.scale = (w, d, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    
    # Get mesh data
    mesh = liquid.data
    
    # --- Add Shape Keys ---
    
    # Basis shape key (flat)
    liquid.shape_key_add(name="Basis", from_mix=False)
    
    # Calculate center for radial effects
    center = Vector((0, 0, 0))
    
    # ----- Ripple_Small -----
    sk_ripple_small = liquid.shape_key_add(name="Ripple_Small", from_mix=False)
    for i, vert in enumerate(mesh.vertices):
        pos = vert.co
        dist = (Vector((pos.x, pos.y, 0)) - center).length
        
        # Concentric ripple pattern
        ripple = math.sin(dist * 25.0) * CONFIG["ripple_small_amp"]
        # Fade at edges
        edge_fade = 1.0 - (dist / (max(w, d) * 0.5)) ** 2
        edge_fade = max(0, min(1, edge_fade))
        
        sk_ripple_small.data[i].co = Vector((pos.x, pos.y, pos.z + ripple * edge_fade))
    
    # ----- Ripple_Large -----
    sk_ripple_large = liquid.shape_key_add(name="Ripple_Large", from_mix=False)
    for i, vert in enumerate(mesh.vertices):
        pos = vert.co
        dist = (Vector((pos.x, pos.y, 0)) - center).length
        
        # Larger, slower ripples
        ripple = math.sin(dist * 15.0) * CONFIG["ripple_large_amp"]
        # Add some noise for organic feel
        noise_val = noise.noise(Vector((pos.x * 5, pos.y * 5, 0))) * 0.002
        edge_fade = 1.0 - (dist / (max(w, d) * 0.5)) ** 2
        edge_fade = max(0, min(1, edge_fade))
        
        sk_ripple_large.data[i].co = Vector((pos.x, pos.y, pos.z + (ripple + noise_val) * edge_fade))
    
    # ----- Wave_Front -----
    sk_wave_front = liquid.shape_key_add(name="Wave_Front", from_mix=False)
    for i, vert in enumerate(mesh.vertices):
        pos = vert.co
        # Tilt forward (positive Y direction rises)
        tilt = (pos.y / (d * 0.5)) * CONFIG["wave_amp"]
        sk_wave_front.data[i].co = Vector((pos.x, pos.y, pos.z + tilt))
    
    # ----- Wave_Back -----
    sk_wave_back = liquid.shape_key_add(name="Wave_Back", from_mix=False)
    for i, vert in enumerate(mesh.vertices):
        pos = vert.co
        # Tilt backward (negative Y direction rises)
        tilt = (-pos.y / (d * 0.5)) * CONFIG["wave_amp"]
        sk_wave_back.data[i].co = Vector((pos.x, pos.y, pos.z + tilt))
    
    # ----- Wave_Left -----
    sk_wave_left = liquid.shape_key_add(name="Wave_Left", from_mix=False)
    for i, vert in enumerate(mesh.vertices):
        pos = vert.co
        # Tilt left (negative X direction rises)
        tilt = (-pos.x / (w * 0.5)) * CONFIG["wave_amp"]
        sk_wave_left.data[i].co = Vector((pos.x, pos.y, pos.z + tilt))
    
    # ----- Wave_Right -----
    sk_wave_right = liquid.shape_key_add(name="Wave_Right", from_mix=False)
    for i, vert in enumerate(mesh.vertices):
        pos = vert.co
        # Tilt right (positive X direction rises)
        tilt = (pos.x / (w * 0.5)) * CONFIG["wave_amp"]
        sk_wave_right.data[i].co = Vector((pos.x, pos.y, pos.z + tilt))
    
    # ----- Settle (Surface Tension Dome) -----
    sk_settle = liquid.shape_key_add(name="Settle", from_mix=False)
    for i, vert in enumerate(mesh.vertices):
        pos = vert.co
        dist = (Vector((pos.x, pos.y, 0)) - center).length
        max_dist = math.sqrt((w/2)**2 + (d/2)**2)
        
        # Dome shape - raised in center, flat at edges
        dome = (1.0 - (dist / max_dist) ** 2) * CONFIG["settle_amp"]
        
        sk_settle.data[i].co = Vector((pos.x, pos.y, pos.z + dome))
    
    # Apply smooth shading
    bpy.ops.object.shade_smooth()
    
    # Apply material
    mat = create_liquid_material()
    liquid.data.materials.append(mat)
    
    return liquid


# =============================================================================
# EXPORT
# =============================================================================

def export_liquid():
    """Export the liquid mesh as GLB with morph targets."""
    blend_dir = bpy.path.abspath("//")
    if not blend_dir:
        blend_dir = os.path.dirname(os.path.realpath(__file__))
    
    export_dir = os.path.join(blend_dir, "exports")
    os.makedirs(export_dir, exist_ok=True)
    
    export_path = os.path.join(export_dir, "liquid.glb")
    
    print(f"💧 Exporting liquid to: {export_path}")
    
    bpy.ops.export_scene.gltf(
        filepath=export_path,
        export_format='GLB',
        export_apply=False,  # Keep shape keys (don't apply modifiers)
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_morph=True,               # Export shape keys as morph targets
        export_morph_normal=True,        # Include morph normals
        export_morph_tangent=False,      # Skip tangents for performance
        use_selection=True,
    )
    
    print(f"✅ Export complete!")
    print(f"   File size: {os.path.getsize(export_path) / 1024:.1f} KB")
    
    # List shape keys exported
    liquid = bpy.context.active_object
    if liquid and liquid.data.shape_keys:
        print(f"   Shape keys: {[kb.name for kb in liquid.data.shape_keys.key_blocks]}")
    
    return export_path


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("💧 Generating Liquid Surface with Shape Keys...")
    
    clear_scene()
    liquid = create_liquid_surface()
    
    # Select liquid for export
    bpy.ops.object.select_all(action='DESELECT')
    liquid.select_set(True)
    bpy.context.view_layer.objects.active = liquid
    
    export_path = export_liquid()
    
    print(f"\n🎉 Done! Copy the liquid to your public folder:")
    print(f"   cp '{export_path}' '../public/models/'")


if __name__ == "__main__":
    main()

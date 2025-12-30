"""
GLB Export Script for Firewatch Darkroom Scene

Run this after generating the scene to export optimized GLB for web.
"""

import bpy
import os

# Export configuration
EXPORT_CONFIG = {
    "filepath": "//exports/darkroom.glb",
    
    # Geometry
    "export_format": "GLB",
    "export_apply": True,  # Apply modifiers
    "export_texcoords": True,
    "export_normals": True,
    "export_tangents": True,
    "export_colors": True,  # Vertex colors for baked lighting
    
    # Materials
    "export_materials": "EXPORT",
    "export_image_format": "AUTO",
    
    # Compression
    "export_draco_mesh_compression_enable": True,
    "export_draco_mesh_compression_level": 6,
    "export_draco_position_quantization": 14,
    "export_draco_normal_quantization": 10,
    "export_draco_texcoord_quantization": 12,
}

def export_scene():
    """Export the scene as GLB with web-optimized settings."""
    
    # Ensure export directory exists
    blend_dir = bpy.path.abspath("//")
    export_dir = os.path.join(blend_dir, "exports")
    os.makedirs(export_dir, exist_ok=True)
    
    # Full export path
    export_path = os.path.join(export_dir, "darkroom.glb")
    
    print(f"📦 Exporting scene to: {export_path}")
    
    # Export
    bpy.ops.export_scene.gltf(
        filepath=export_path,
        export_format='GLB',
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_colors=True,
        export_materials='EXPORT',
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    
    print(f"✅ Export complete!")
    print(f"   File size: {os.path.getsize(export_path) / 1024:.1f} KB")

# Run export
if __name__ == "__main__":
    export_scene()

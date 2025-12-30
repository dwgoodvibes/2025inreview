# Phase 1: 3D Art Pipeline (Blender)

> **Goal**: Create the foundational 3D assets that define the Firewatch darkroom world.

## Overview

This phase is the foundation of the entire project. We cannot write meaningful code until the 3D world exists. All assets must embody the Firewatch aesthetic: low-poly geometry, stylized painterly textures, and baked lighting for browser performance.

## 1.1 Environment Modeling

### The Darkroom Layout

Based on the [reference image](../reference/darkroom-reference.png):

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│                       [WALL]                             │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                  WOODEN TABLE                     │   │
│  │                                                   │   │
│  │   🔆 TABLE LAMP      ┌────────────┐   📦 BOTTLES │   │
│  │   (Frosted Globe)    │   TRAY     │   Developer  │   │
│  │                      │            │   Fixer      │   │
│  │                      │ [CONTACT   │              │   │
│  │                      │  SHEET]    │   ✂️ SCISSORS │   │
│  │                      │            │              │   │
│  │                      └────────────┘              │   │
│  │                                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│                      [FLOOR BOARDS]                      │
└─────────────────────────────────────────────────────────┘
```

### Model Specifications

| Object | Poly Target | Notes |
|--------|-------------|-------|
| Wooden Table | 100-200 | Warm wood grain surface, visible planks |
| Table Lamp | 150-250 | Frosted ceramic globe, base + neck. Key light source |
| Development Tray | 100-150 | Shallow cream/white plastic, beveled edges |
| Contact Sheet | 1 plane | **Flat for usability**, sits just below liquid surface |
| Chemical Bottles (×2) | 50-100 each | Developer (amber) + Fixer (dark) with labels |
| Scissors/Tongs | 30-50 | Metal tools beside tray |

### Firewatch Geometry Rules

> [!IMPORTANT]
> **Low-Poly Principles**
> - Hard edges, no smooth shading on architectural elements
> - Bevels should be geometric (1-2 segments max)
> - Silhouettes should be readable and iconic
> - Avoid perfect symmetry—add subtle organic variation

## 1.2 Texturing

### Color Palette

```css
/* Primary Palette */
--slate-dark:     #2a3038;
--slate-mid:      #4a5568;
--copper-glow:    #ff5e00;
--safe-light:     #ff4500;
--sepia-warm:     #d4a574;
--shadow-purple:  #2d1b3d;
--deep-red:       #8b1e3f;

/* Accent Colors */
--chemical-green: #4a7c59;
--label-cream:    #f5e6d3;
--metal-cold:     #6b7280;
```

### Texture Guidelines

| Surface | Approach |
|---------|----------|
| **Slate Sink** | Hand-painted texture with visible brush strokes. Subtle color variation. |
| **Plastic Trays** | Slight sheen, minimal texture detail. Solid colors with subtle gradients. |
| **Chemical Bottles** | Matte labels with period-appropriate typography. Glass areas catch light. |
| **Wood Shelving** | Visible wood grain, warm brown tones. Signs of use and age. |
| **Metal Pipes** | Cold undertones that contrast with warm lighting. Slight oxidation. |

### Texture Resolution

| Use Case | Resolution | Format |
|----------|------------|--------|
| Hero objects (sink, trays) | 1024×1024 | WebP/PNG |
| Secondary props | 512×512 | WebP |
| Background elements | 256×256 | WebP |

## 1.3 Lighting Bake

> [!CAUTION]
> **Performance Critical**
> Real-time shadows are expensive on mobile. Baking ambient occlusion and soft shadows directly into textures is essential for smooth browser performance.

### Bake Settings

```yaml
Bake Type: Combined (Diffuse + AO)
Samples: 512-1024
Margin: 16px
AO Distance: 0.5-1.0 units
Light Sources: 
  - Safe light (point, orange)
  - Subtle fill (ambient, very low)
```

### What to Bake vs. Real-Time

| Baked | Real-Time |
|-------|-----------|
| Ambient occlusion | Safe light glow |
| Soft contact shadows | Specular highlights on liquid |
| Color bleeding from safe light | Volumetric fog |
| Worn edges / subtle highlights | Bloom post-process |

## 1.4 Export Settings

### GLB Configuration

```yaml
Format: glTF Binary (.glb)
Geometry:
  - Apply Modifiers: Yes
  - UVs: Yes
  - Normals: Yes
  - Tangents: Yes (for normal maps)
  - Vertex Colors: Yes (for baked lighting)
  
Materials:
  - Export Materials: Yes
  - Export Textures: Embedded
  - Format: WebP (fallback PNG)
  
Compression:
  - Draco: Yes
  - Compression Level: 6
  - Quantization Position: 14
  - Quantization Normal: 10
  - Quantization UV: 12
```

### File Organization

```
blender/
├── darkroom.blend          # Master file
├── textures/
│   ├── baked/              # Baked lightmaps
│   ├── diffuse/            # Color textures
│   └── normal/             # Normal maps (if used)
└── exports/
    ├── darkroom-full.glb   # Complete scene
    ├── darkroom-lod.glb    # Lower detail for mobile
    └── props/              # Individual prop exports
```

## 1.5 Deliverables Checklist

- [ ] **Environment Model**
  - [ ] Sink/bench geometry
  - [ ] Three development trays
  - [ ] Safe light fixture(s)
  - [ ] Background props (enlarger, bottles, tools)
  - [ ] Ceiling pipes/ventilation
  
- [ ] **Textures**
  - [ ] Painterly textures for all surfaces
  - [ ] Baked ambient occlusion
  - [ ] Baked soft shadows
  - [ ] Color palette consistency check
  
- [ ] **Export**
  - [ ] GLB export with Draco compression
  - [ ] File size under 5MB target
  - [ ] Test load in Three.js/R3F

## 1.6 Reference Resources

### Firewatch Art Style

- Campo Santo GDC talks on art direction
- Low-poly stylized environment tutorials
- Blender painterly texture workflows

### Darkroom Reference

- Traditional B&W darkroom layouts
- Vintage enlarger designs
- Chemical bottle typography (Kodak, Ilford)

---

**Next Phase**: [Phase 2: R3F Scene Setup](02-Phase2-R3FSceneSetup.md)

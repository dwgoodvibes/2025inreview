# Phase 3: Interactive Objects (Sheets & Liquid)

> **Goal**: Create the interactive liquid-filled trays and contact sheet objects that form the core experience.

## Prerequisites

- [ ] Phase 2 complete: Scene rendering with atmosphere
- [ ] Contact sheet images prepared (high-resolution)
- [ ] Basic WebGL shader knowledge helpful

## 3.1 The Liquid Shader

The trays shouldn't be empty. We need a reflective, slightly rippling water shader that catches the safe light and adds life to the scene.

### Water Shader Approach

```
┌─────────────────────────────────────────┐
│           LIQUID SURFACE STACK          │
├─────────────────────────────────────────┤
│  Layer 4: Specular highlights           │
│  Layer 3: Fresnel reflection            │
│  Layer 2: Animated ripples (normal map) │
│  Layer 1: Tinted transparency           │
│  Base:    Tray floor visible below      │
└─────────────────────────────────────────┘
```

### Shader Implementation

```jsx
// src/shaders/LiquidMaterial.jsx
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'

const LiquidShaderMaterial = shaderMaterial(
  // Uniforms
  {
    uTime: 0,
    uColor: new THREE.Color('#1a0a00'),
    uLightColor: new THREE.Color('#ff5e00'),
    uLightPosition: new THREE.Vector3(1, 2.5, 0),
    uRippleStrength: 0.02,
    uFresnelPower: 2.0,
    uOpacity: 0.7
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    
    uniform float uTime;
    uniform float uRippleStrength;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      vec3 pos = position;
      
      // Subtle ripple displacement
      float ripple = sin(pos.x * 10.0 + uTime * 2.0) * 
                     cos(pos.y * 10.0 + uTime * 1.5) * 
                     uRippleStrength;
      pos.z += ripple;
      
      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPosition.xyz;
      
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  // Fragment Shader
  `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    
    uniform vec3 uColor;
    uniform vec3 uLightColor;
    uniform vec3 uLightPosition;
    uniform float uFresnelPower;
    uniform float uOpacity;
    uniform float uTime;
    
    void main() {
      // View direction
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      
      // Fresnel effect (edges more reflective)
      float fresnel = pow(1.0 - dot(viewDir, vNormal), uFresnelPower);
      
      // Light direction and intensity
      vec3 lightDir = normalize(uLightPosition - vWorldPosition);
      float lightDist = length(uLightPosition - vWorldPosition);
      float attenuation = 1.0 / (1.0 + 0.1 * lightDist * lightDist);
      
      // Specular highlight
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0);
      
      // Animated caustics-like pattern
      float caustic = sin(vUv.x * 20.0 + uTime) * 
                      sin(vUv.y * 20.0 + uTime * 0.8) * 0.1;
      
      // Combine colors
      vec3 baseColor = uColor + caustic;
      vec3 specColor = uLightColor * spec * attenuation;
      vec3 fresnelColor = uLightColor * fresnel * 0.3;
      
      vec3 finalColor = baseColor + specColor + fresnelColor;
      
      gl_FragColor = vec4(finalColor, uOpacity + fresnel * 0.2);
    }
  `
)

extend({ LiquidShaderMaterial })

export default function Liquid({ position = [0, 0, 0], size = [1, 1] }) {
  const materialRef = useRef()
  
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uTime = clock.elapsedTime
    }
  })
  
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size[0], size[1], 32, 32]} />
      <liquidShaderMaterial
        ref={materialRef}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
```

### Alternative: Drei's MeshReflectorMaterial

For a simpler approach with screen-space reflections:

```jsx
import { MeshReflectorMaterial } from '@react-three/drei'

<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
  <planeGeometry args={[0.8, 0.5]} />
  <MeshReflectorMaterial
    blur={[300, 100]}
    resolution={512}
    mixBlur={1}
    mixStrength={40}
    roughness={1}
    depthScale={1.2}
    minDepthThreshold={0.4}
    maxDepthThreshold={1.4}
    color="#1a0a00"
    metalness={0.5}
  />
</mesh>
```

## 3.2 The Development Tray Component

```jsx
// src/components/Tray.jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Liquid from '../shaders/LiquidMaterial'
import ContactSheet from './ContactSheet'
import useStore from '../hooks/useStore'

export default function Tray({ 
  index, 
  position, 
  sheetTexture,
  category 
}) {
  const groupRef = useRef()
  const currentTray = useStore(state => state.currentTray)
  const isActive = currentTray === index
  
  // Subtle idle animation
  useFrame(({ clock }) => {
    if (groupRef.current && isActive) {
      // Gentle floating motion when active
      groupRef.current.position.y = 
        position[1] + Math.sin(clock.elapsedTime * 0.5) * 0.002
    }
  })
  
  return (
    <group ref={groupRef} position={position}>
      {/* Tray geometry (from GLB or procedural) */}
      <mesh>
        <boxGeometry args={[0.9, 0.05, 0.6]} />
        <meshStandardMaterial 
          color="#2a2a2a" 
          roughness={0.8}
        />
      </mesh>
      
      {/* Liquid surface */}
      <Liquid 
        position={[0, 0.03, 0]} 
        size={[0.85, 0.55]} 
      />
      
      {/* Contact sheet submerged */}
      <ContactSheet
        texture={sheetTexture}
        position={[0, 0.01, 0]}
        index={index}
      />
      
      {/* Category label (floating above) */}
      {isActive && (
        <Html position={[0, 0.3, 0]} center>
          <div className="tray-label">{category}</div>
        </Html>
      )}
    </group>
  )
}
```

## 3.3 The Contact Sheet Object

> [!IMPORTANT]
> The contact sheet is no longer an HTML `<div>`. It's a 3D plane with the photo grid as a texture.

### Contact Sheet Component

```jsx
// src/components/ContactSheet.jsx
import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../hooks/useStore'

export default function ContactSheet({ 
  texture, 
  position,
  index 
}) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  // Load the contact sheet texture
  const sheetTexture = useTexture(texture)
  sheetTexture.colorSpace = THREE.SRGBColorSpace
  
  const currentTray = useStore(state => state.currentTray)
  const setCameraTarget = useStore(state => state.setCameraTarget)
  const setCurrentPhoto = useStore(state => state.setCurrentPhoto)
  
  const isActive = currentTray === index
  
  // Clarifying animation: rise towards surface when active
  useFrame((state, delta) => {
    if (!meshRef.current) return
    
    const targetY = isActive ? 0.025 : 0.005
    meshRef.current.position.y = THREE.MathUtils.lerp(
      meshRef.current.position.y,
      targetY,
      delta * 2
    )
    
    // Subtle rotation when hovered
    if (hovered && isActive) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.01
    }
  })
  
  const handleClick = (event) => {
    if (!isActive) return
    
    event.stopPropagation()
    
    // Get UV coordinates of click
    const uv = event.uv
    if (uv) {
      // Calculate which photo was clicked based on grid layout
      const photoId = calculatePhotoFromUV(uv)
      setCurrentPhoto(photoId)
      setCameraTarget('photo')
    }
  }
  
  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={handleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <planeGeometry args={[0.75, 0.5]} />
      <meshStandardMaterial
        map={sheetTexture}
        roughness={0.9}
        metalness={0}
        transparent
        opacity={isActive ? 1 : 0.6}
        // Wet paper effect
        envMapIntensity={0.3}
      />
    </mesh>
  )
}

// Helper to map UV to photo grid position
function calculatePhotoFromUV(uv, cols = 6, rows = 4) {
  const col = Math.floor(uv.x * cols)
  const row = Math.floor((1 - uv.y) * rows) // Flip Y
  return row * cols + col
}
```

### Contact Sheet Texture Preparation

> [!TIP]
> Pre-render your photo grids as single large images rather than loading individual photos. This dramatically improves performance.

```
Contact Sheet Specifications:
- Resolution: 2048 x 1365 (3:2 aspect ratio)
- Format: WebP (for compression)
- Layout: 6 columns × 4 rows = 24 photos per sheet
- Each photo cell: ~341 × 341 pixels

Add visible borders between photos to simulate actual contact sheet aesthetic.
```

## 3.4 Photo Hover & Click Raycast

### Enhanced Raycasting for Photo Selection

```jsx
// src/components/PhotoRaycast.jsx
import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../hooks/useStore'

export default function PhotoRaycast() {
  const { camera, scene, raycaster, pointer } = useThree()
  const setCurrentPhoto = useStore(state => state.setCurrentPhoto)
  
  // Highlight mesh for showing which photo is hovered
  const highlightRef = useRef()
  
  useFrame(() => {
    raycaster.setFromCamera(pointer, camera)
    
    // Only raycast against contact sheets
    const sheets = scene.children.filter(c => c.userData.isContactSheet)
    const intersects = raycaster.intersectObjects(sheets, true)
    
    if (intersects.length > 0) {
      const hit = intersects[0]
      const uv = hit.uv
      
      if (uv && highlightRef.current) {
        // Position highlight box over hovered photo
        const photoPos = uvToWorldPosition(uv, hit.object)
        highlightRef.current.position.copy(photoPos)
        highlightRef.current.visible = true
      }
    } else if (highlightRef.current) {
      highlightRef.current.visible = false
    }
  })
  
  return (
    <mesh ref={highlightRef} visible={false}>
      <planeGeometry args={[0.12, 0.12]} />
      <meshBasicMaterial 
        color="#ff5e00" 
        transparent 
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
```

## 3.5 State Management Updates

```jsx
// src/hooks/useStore.js - Add to existing store
{
  // Photo grid data
  sheets: [
    { 
      id: 0, 
      category: 'Spring', 
      texture: '/sheets/spring-2024.webp',
      photos: [...] // Photo metadata
    },
    { 
      id: 1, 
      category: 'Summer', 
      texture: '/sheets/summer-2024.webp',
      photos: [...]
    },
    { 
      id: 2, 
      category: 'Fall', 
      texture: '/sheets/fall-2024.webp',
      photos: [...]
    }
  ],
  
  // Currently viewed photo (for zoom)
  currentPhoto: null,
  currentPhotoPosition: null,
  
  // Actions
  selectPhoto: (sheetId, photoIndex) => set(state => {
    const sheet = state.sheets[sheetId]
    const photo = sheet.photos[photoIndex]
    return {
      currentPhoto: photo,
      currentPhotoPosition: calculateWorldPosition(sheetId, photoIndex),
      cameraTarget: 'photo'
    }
  }),
  
  clearPhoto: () => set({
    currentPhoto: null,
    currentPhotoPosition: null,
    cameraTarget: 'overview'
  })
}
```

## 3.6 Deliverables Checklist

- [ ] **Liquid Shader**
  - [ ] Reflective surface catches safe light
  - [ ] Subtle ripple animation
  - [ ] Fresnel effect at edges
  - [ ] Transparency shows tray beneath
  
- [ ] **Development Trays**
  - [ ] Three trays positioned on sink
  - [ ] Each tray has liquid surface
  - [ ] Active tray highlighted
  
- [ ] **Contact Sheets**
  - [ ] 3D planes with photo textures
  - [ ] "Clarifying" animation (rise from liquid)
  - [ ] Hover detection per-photo
  - [ ] Click triggers zoom target
  
- [ ] **State Management**
  - [ ] Sheet/tray switching works
  - [ ] Photo selection tracked
  - [ ] Camera targets update

## 3.7 Asset Preparation

### Contact Sheet Generator Script

```javascript
// scripts/generate-sheets.js
// Utility to composite photos into contact sheet format

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

async function generateContactSheet(photos, outputPath, options = {}) {
  const {
    cols = 6,
    rows = 4,
    cellWidth = 341,
    cellHeight = 341,
    gap = 4,
    borderColor = '#1a1a1a'
  } = options
  
  const width = cols * cellWidth + (cols - 1) * gap
  const height = rows * cellHeight + (rows - 1) * gap
  
  // Create base image
  const base = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: borderColor
    }
  })
  
  // Composite each photo
  const composites = await Promise.all(
    photos.slice(0, cols * rows).map(async (photo, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      
      const resized = await sharp(photo)
        .resize(cellWidth, cellHeight, { fit: 'cover' })
        .toBuffer()
      
      return {
        input: resized,
        left: col * (cellWidth + gap),
        top: row * (cellHeight + gap)
      }
    })
  )
  
  await base
    .composite(composites)
    .webp({ quality: 85 })
    .toFile(outputPath)
}
```

---

**Previous Phase**: [Phase 2: R3F Scene Setup](02-Phase2-R3FSceneSetup.md)  
**Next Phase**: [Phase 4: Camera Choreography](04-Phase4-CameraChoreography.md)

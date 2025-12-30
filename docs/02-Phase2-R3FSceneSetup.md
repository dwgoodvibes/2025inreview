# Phase 2: R3F Scene Setup (Atmosphere)

> **Goal**: Load the 3D environment into the browser and create the signature Firewatch atmosphere with lighting, fog, and post-processing.

## Prerequisites

- [ ] Phase 1 complete: `.glb` file exported from Blender
- [ ] Node.js 18+ installed
- [ ] Understanding of React and basic Three.js concepts

## 2.1 Project Setup

### Initialize React + Vite Project

```bash
# Create new Vite project with React
npx create-vite@latest year-in-review --template react
cd year-in-review

# Install R3F ecosystem
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing

# Install animation libraries
npm install @theatre/core @theatre/r3f
# OR
npm install gsap

# Install utilities
npm install leva zustand
```

### Project Structure

```
src/
├── components/
│   ├── Scene.jsx           # Main R3F canvas wrapper
│   ├── Darkroom.jsx        # Environment model loader
│   ├── Lighting.jsx        # Safe lights and ambients
│   ├── Atmosphere.jsx      # Fog and environment
│   └── PostProcessing.jsx  # Effects stack
├── hooks/
│   └── useStore.js         # Zustand state management
├── shaders/
│   └── (custom shaders)
├── App.jsx
├── App.css
└── main.jsx
```

## 2.2 Scene Foundation

### Canvas Setup

```jsx
// src/components/Scene.jsx
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Loader } from '@react-three/drei'
import Darkroom from './Darkroom'
import Lighting from './Lighting'
import Atmosphere from './Atmosphere'
import PostProcessing from './PostProcessing'

export default function Scene() {
  return (
    <>
      <Canvas
        camera={{ 
          fov: 50, 
          near: 0.1, 
          far: 100,
          position: [0, 1.6, 3] // Eye-level, standing at sink
        }}
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
        shadows
      >
        <Suspense fallback={null}>
          <Atmosphere />
          <Lighting />
          <Darkroom />
          <PostProcessing />
        </Suspense>
      </Canvas>
      <Loader />
    </>
  )
}
```

### Environment Loading

```jsx
// src/components/Darkroom.jsx
import { useGLTF } from '@react-three/drei'

export default function Darkroom() {
  const { scene } = useGLTF('/models/darkroom.glb')
  
  return (
    <primitive 
      object={scene} 
      position={[0, 0, 0]}
      scale={1}
    />
  )
}

// Preload the model
useGLTF.preload('/models/darkroom.glb')
```

## 2.3 The Safe Light

> [!IMPORTANT]
> The safe light is the defining visual element. It should feel warm, slightly menacing, and cast dramatic shadows.

### Light Configuration

```jsx
// src/components/Lighting.jsx
import { useRef } from 'react'
import { useControls } from 'leva'

export default function Lighting() {
  const lightRef = useRef()
  
  // Debug controls (remove in production)
  const { intensity, color, position } = useControls('Safe Light', {
    intensity: { value: 2, min: 0, max: 10, step: 0.1 },
    color: '#ff5e00',
    position: { value: [1, 2.5, 0], step: 0.1 }
  })
  
  return (
    <>
      {/* Main safe light */}
      <pointLight
        ref={lightRef}
        position={position}
        intensity={intensity}
        color={color}
        distance={15}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      
      {/* Subtle ambient fill */}
      <ambientLight 
        intensity={0.02} 
        color="#1a0a0a" 
      />
      
      {/* Secondary safe light (optional) */}
      <pointLight
        position={[-2, 2.5, -1]}
        intensity={intensity * 0.3}
        color="#ff4500"
        distance={10}
        decay={2}
      />
    </>
  )
}
```

### Light Flickering Effect

```jsx
// Add to Lighting.jsx for intro sequence
import { useFrame } from '@react-three/fiber'
import useStore from '../hooks/useStore'

// Inside component:
const isFlickering = useStore(state => state.isFlickering)
const baseIntensity = 2

useFrame(({ clock }) => {
  if (isFlickering && lightRef.current) {
    // Rapid flicker effect
    const flicker = Math.sin(clock.elapsedTime * 50) * 0.5 + 0.5
    const noise = Math.random() * 0.3
    lightRef.current.intensity = baseIntensity * (flicker + noise) * 5
  }
})
```

## 2.4 Volumetric Fog

### Exponential Fog Setup

```jsx
// src/components/Atmosphere.jsx
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useControls } from 'leva'

export default function Atmosphere() {
  const { scene } = useThree()
  
  const { fogColor, fogNear, fogFar } = useControls('Fog', {
    fogColor: '#ff5e00',
    fogNear: { value: 1, min: 0, max: 10 },
    fogFar: { value: 15, min: 5, max: 50 }
  })
  
  useEffect(() => {
    // Exponential fog for more realistic falloff
    scene.fog = new THREE.FogExp2(fogColor, 0.08)
    scene.background = new THREE.Color('#0a0505')
    
    return () => {
      scene.fog = null
    }
  }, [scene, fogColor])
  
  return null
}
```

### Alternative: Depth-Based Fog in Post-Processing

For more control, fog can be applied as a post-processing effect (see Section 2.5).

## 2.5 Post-Processing Stack

> [!TIP]
> The post-processing stack is what sells the Firewatch look. Each effect contributes to the final atmosphere.

### Effects Configuration

```jsx
// src/components/PostProcessing.jsx
import { 
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
  ToneMapping
} from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useControls } from 'leva'

export default function PostProcessing() {
  const bloom = useControls('Bloom', {
    intensity: { value: 1.5, min: 0, max: 5 },
    luminanceThreshold: { value: 0.4, min: 0, max: 1 },
    luminanceSmoothing: { value: 0.9, min: 0, max: 1 },
    radius: { value: 0.8, min: 0, max: 1 }
  })
  
  return (
    <EffectComposer multisampling={0}>
      {/* Bloom - makes lights glow */}
      <Bloom
        intensity={bloom.intensity}
        luminanceThreshold={bloom.luminanceThreshold}
        luminanceSmoothing={bloom.luminanceSmoothing}
        radius={bloom.radius}
      />
      
      {/* Vignette - darkens edges */}
      <Vignette
        offset={0.3}
        darkness={0.7}
        blendFunction={BlendFunction.NORMAL}
      />
      
      {/* Subtle chromatic aberration */}
      <ChromaticAberration
        offset={[0.002, 0.002]}
        blendFunction={BlendFunction.NORMAL}
      />
      
      {/* Film grain */}
      <Noise
        opacity={0.15}
        blendFunction={BlendFunction.OVERLAY}
      />
      
      {/* Tone mapping for HDR-like look */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
```

### Color Grading (Advanced)

For precise Firewatch color matching, add LUT-based color grading:

```jsx
import { LUT3DEffect } from 'postprocessing'
import { useLoader } from '@react-three/fiber'
import { LUTCubeLoader } from 'postprocessing'

// Load a custom .cube LUT file
const lut = useLoader(LUTCubeLoader, '/luts/firewatch-warm.cube')

// Add to EffectComposer
<primitive object={new LUT3DEffect(lut)} />
```

## 2.6 State Management

### Zustand Store

```jsx
// src/hooks/useStore.js
import { create } from 'zustand'

const useStore = create((set, get) => ({
  // Scene state
  isLoaded: false,
  lightsOn: false,
  isFlickering: false,
  
  // Active content
  currentTray: 0,
  currentPhoto: null,
  
  // Camera targets
  cameraTarget: 'overview',
  
  // Actions
  setLoaded: () => set({ isLoaded: true }),
  
  flickerLights: async () => {
    set({ isFlickering: true })
    await new Promise(r => setTimeout(r, 800))
    set({ isFlickering: false, lightsOn: true })
  },
  
  setCurrentTray: (index) => set({ currentTray: index }),
  setCurrentPhoto: (id) => set({ currentPhoto: id }),
  setCameraTarget: (target) => set({ cameraTarget: target })
}))

export default useStore
```

## 2.7 Deliverables Checklist

- [ ] **Project Setup**
  - [ ] Vite + React initialized
  - [ ] R3F dependencies installed
  - [ ] Folder structure created
  
- [ ] **Scene Loading**
  - [ ] GLB model loads correctly
  - [ ] Model positioned and scaled
  - [ ] No console errors
  
- [ ] **Lighting**
  - [ ] Safe light with correct color (#ff5e00)
  - [ ] Proper shadow casting
  - [ ] Ambient fill for deep shadows
  
- [ ] **Atmosphere**
  - [ ] Exponential fog matching light color
  - [ ] Objects fade into darkness at distance
  
- [ ] **Post-Processing**
  - [ ] Bloom on light sources
  - [ ] Vignette effect
  - [ ] Film grain overlay
  - [ ] Overall "Firewatch" mood achieved

## 2.8 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| FPS (Desktop) | 60 | React DevTools |
| FPS (Mobile) | 30+ | Safari/Chrome DevTools |
| Initial Load | < 3s | Lighthouse |
| GLB Size | < 5MB | File system |
| JS Bundle | < 500KB | Vite build stats |

---

**Previous Phase**: [Phase 1: 3D Art Pipeline](01-Phase1-3DArtPipeline.md)  
**Next Phase**: [Phase 3: Interactive Objects](03-Phase3-InteractiveObjects.md)

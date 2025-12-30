// src/components/Darkroom.jsx
import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import useStore from '../hooks/useStore'
import { useFrame } from '@react-three/fiber'
import { getFlickerBrightness } from '../utils/flicker'

// Wood color palette matching the Firewatch reference
const MATERIAL_COLORS = {
    // Wall planks - dark warm brown
    wall: new THREE.Color(0.12, 0.07, 0.04),
    // Table surface - richer brown
    table: new THREE.Color(0.35, 0.18, 0.08),
    // Floor - dark warm tone
    floor: new THREE.Color(0.08, 0.05, 0.03),
    // Default wood fallback
    wood: new THREE.Color(0.25, 0.14, 0.06)
}

export default function Darkroom() {
    const { scene } = useGLTF('/models/darkroom.glb')

    // Clone the scene to avoid modifying the cached original
    const clonedScene = useMemo(() => scene.clone(true), [scene])

    // Lamp glow reference
    const lampGlowRef = useRef()
    const cameraTarget = useStore(state => state.cameraTarget)
    const isIntro = cameraTarget === 'intro'

    useEffect(() => {
        clonedScene.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase()

                // Tray should not cast or receive shadows (prevents floating shadow effect)
                const isTray = name.includes('tray') || name.includes('developer')
                child.castShadow = !isTray
                child.receiveShadow = !isTray

                // Capture lamp glow mesh
                if (name.includes('glow') || name.includes('lamp_inner')) {
                    lampGlowRef.current = child
                    // Lamp glow should not interact with shadows as it is a light source
                    child.castShadow = false
                    child.receiveShadow = false
                    // Ensure it has an emissive material
                    if (child.material) {
                        child.material = child.material.clone()
                        child.material.emissive = new THREE.Color('#ffaa00') // Warm orange defaults
                        child.material.emissiveIntensity = 5
                    }
                    return // Skip wood coloring
                }

                // Skip other lamp parts for wood coloring
                if (name.includes('lamp') || name.includes('bulb') || name.includes('cord') || name.includes('shade') || name.includes('mount')) {
                    return
                }

                // Apply appropriate colors based on object name
                if (child.material) {
                    // Clone material to avoid affecting cached model
                    child.material = child.material.clone()

                    const name = child.name.toLowerCase()

                    // Determine color based on mesh name
                    let targetColor = MATERIAL_COLORS.wood

                    if (name.includes('wall') || name.includes('plank')) {
                        targetColor = MATERIAL_COLORS.wall
                    } else if (name.includes('table') || name.includes('desk')) {
                        targetColor = MATERIAL_COLORS.table
                    } else if (name.includes('floor') || name.includes('ground')) {
                        targetColor = MATERIAL_COLORS.floor
                    }

                    // Apply the color while preserving other material properties
                    if (child.material.color) {
                        child.material.color = targetColor
                    }

                    // Ensure proper roughness for matte wood look
                    if (child.material.roughness !== undefined) {
                        child.material.roughness = Math.max(0.7, child.material.roughness)
                    }
                }
            }
        })
    }, [clonedScene])

    // Sync lamp mesh emission with Lighting.jsx flicker logic
    useFrame(({ clock }) => {
        if (!lampGlowRef.current || !lampGlowRef.current.material) return

        const time = clock.elapsedTime
        let brightness = 0

        if (isIntro) {
            // Intro mode: Synced via deterministic utility
            // We multiply by a factor to make the physical object glow brighter than the light intensity value logic if needed
            brightness = getFlickerBrightness(time) * 3.0 // Boost for visual glow
        } else {
            // Normal state (On)
            brightness = 10
        }

        lampGlowRef.current.material.emissiveIntensity = brightness
    })

    return (
        <primitive
            object={clonedScene}
            position={[0, 0, 0]}
            scale={1}
        />
    )
}

// Preload the model
useGLTF.preload('/models/darkroom.glb')

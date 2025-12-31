// src/components/Darkroom.jsx
import { useGLTF, useTexture } from '@react-three/drei'
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
    const { scene } = useGLTF('models/darkroom.glb')

    // Load stylized Firewatch textures
    const [woodTexture, trayTexture, devBottleTexture, fixerBottleTexture, framePhoto0, framePhoto1, framePhoto2] = useTexture([
        'textures/wood_grain.png',
        'textures/tray_plastic.png',
        'textures/bottle_developer.png',
        'textures/bottle_fixer.png',
        'textures/frame_photo_0.jpg',
        'textures/frame_photo_1.jpg',
        'textures/frame_photo_2.jpg'
    ])

    // Frame photo textures array for easy indexing
    const framePhotos = useMemo(() => [framePhoto0, framePhoto1, framePhoto2], [framePhoto0, framePhoto1, framePhoto2])

    // Configure texture wrapping for seamless tiling
    useMemo(() => {
        woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping
        woodTexture.repeat.set(2, 2)
        trayTexture.wrapS = trayTexture.wrapT = THREE.RepeatWrapping
        trayTexture.repeat.set(1, 1)
    }, [woodTexture, trayTexture])

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

                // Apply appropriate colors and textures based on object name
                if (child.material) {
                    // Clone material to avoid affecting cached model
                    child.material = child.material.clone()

                    const name = child.name.toLowerCase()

                    // === BOTTLE TEXTURES ===
                    if (name.includes('bottle_developer') || name.includes('bottle') && name.includes('developer')) {
                        child.material.map = devBottleTexture
                        child.material.color = new THREE.Color(0.7, 0.4, 0.15) // Amber tint
                        child.material.roughness = 0.3
                        child.material.needsUpdate = true
                        return
                    }
                    if (name.includes('bottle_fixer') || name.includes('bottle') && name.includes('fixer')) {
                        child.material.map = fixerBottleTexture
                        child.material.color = new THREE.Color(0.2, 0.35, 0.6) // Blue tint
                        child.material.roughness = 0.3
                        child.material.needsUpdate = true
                        return
                    }

                    // === TRAY TEXTURE ===
                    if (name.includes('tray') && !name.includes('liquid')) {
                        child.material.map = trayTexture
                        child.material.color = new THREE.Color(0.9, 0.87, 0.8) // Off-white
                        child.material.roughness = 0.7
                        child.material.needsUpdate = true
                        return
                    }

                    // === TABLE TEXTURE ===
                    if (name.includes('table') || name.includes('desk')) {
                        child.material.map = woodTexture
                        child.material.color = MATERIAL_COLORS.table
                        child.material.roughness = 0.75
                        child.material.needsUpdate = true
                        return
                    }

                    // === PICTURE FRAME PHOTOS ===
                    // Frame mattes are named Frame_Matte_0, Frame_Matte_1, Frame_Matte_2
                    if (name.includes('frame_matte') || name.includes('matte')) {
                        // Extract the frame index from the name
                        const match = child.name.match(/(\d+)/)
                        if (match) {
                            const frameIndex = parseInt(match[1], 10)
                            if (frameIndex >= 0 && frameIndex < framePhotos.length) {
                                child.material.map = framePhotos[frameIndex]
                                child.material.color = new THREE.Color(1, 1, 1) // No tint
                                child.material.roughness = 0.3 // Slightly glossy photo
                                child.material.needsUpdate = true
                                return
                            }
                        }
                    }

                    // Determine color based on mesh name (fallback for other objects)
                    let targetColor = MATERIAL_COLORS.wood

                    if (name.includes('wall') || name.includes('plank')) {
                        targetColor = MATERIAL_COLORS.wall
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
    }, [clonedScene, woodTexture, trayTexture, devBottleTexture, fixerBottleTexture, framePhotos])

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
useGLTF.preload('models/darkroom.glb')

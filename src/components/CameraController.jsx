// src/components/CameraController.jsx
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import useStore from '../hooks/useStore'

// Predefined camera positions - looking DOWN at trays from standing height
const CAMERA_POSITIONS = {
    // Starting position at the doorway - Higher per request
    intro: {
        position: [0, 2.15, 4.5],
        lookAt: [0, 1.0, 0],
        fov: 60
    },
    // Walking in - midway position
    entering: {
        position: [0, 1.9, 1.5], // Higher bridge to avoid dipping
        lookAt: [0, 0.8, 0],
        fov: 55
    },
    // Overview - Changed to match tray view to avoid "zoom out" effect
    overview: {
        position: [0, 2.6, 0.6],
        lookAt: [0, 0.8, 0],
        fov: 45
    },
    tray0: {
        position: [0, 2.6, 0.6],
        lookAt: [0, 0.8, 0],
        fov: 45
    },
    tray1: {
        position: [0, 2.6, 0.6],
        lookAt: [0, 0.8, 0],
        fov: 45
    },
    tray2: {
        position: [0, 2.6, 0.6],
        lookAt: [0, 0.8, 0],
        fov: 45
    }
}

// Mouse movement settings for FPS-style look
const MOUSE_LOOK = {
    horizontalRange: 0.4,   // How far left/right the look target can move
    verticalRange: 0.25,    // How far up/down the look target can move
    smoothing: 0.04,        // Lerp factor for smooth movement (lower = more flowy)
    zoomInfluence: 0.8      // How much the look direction affects zoom target
}

export default function CameraController() {
    const cameraRef = useRef()
    const rigRef = useRef()
    const baseTargetRef = useRef(new THREE.Vector3(0, 0.9, 0))  // Base look target from camera state
    const targetRef = useRef(new THREE.Vector3(0, 0.9, 0))       // Actual look target (with mouse offset)
    const mouseOffsetRef = useRef({ x: 0, y: 0 })
    const currentMouseRef = useRef({ x: 0, y: 0 })
    const currentLookOffsetRef = useRef({ x: 0, y: 0 })  // Smoothed look offset
    const isMoving = useRef(false) // Track if camera is currently animating

    const cameraTarget = useStore(state => state.cameraTarget)
    const currentTray = useStore(state => state.currentTray)
    const currentPhotoPosition = useStore(state => state.currentPhotoPosition)
    const lightsOn = useStore(state => state.lightsOn)

    // Track mouse movement
    useEffect(() => {
        const handleMouseMove = (event) => {
            // Normalize mouse position to -1 to 1
            mouseOffsetRef.current.x = (event.clientX / window.innerWidth - 0.5) * 2
            mouseOffsetRef.current.y = (event.clientY / window.innerHeight - 0.5) * 2
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    // Handle camera transitions
    useEffect(() => {
        if (!rigRef.current || !cameraRef.current) return

        let targetConfig

        if (cameraTarget === 'photo') {
            // Simple zoom: move toward wherever the crosshair is currently pointing
            // Get the current world position of the rig and the look target
            const currentPos = rigRef.current.position.clone()
            const lookTarget = targetRef.current.clone()

            // Calculate direction from camera to look target
            const direction = lookTarget.clone().sub(currentPos).normalize()

            // Fixed zoom distance - move 0.8 units toward the look target
            const zoomDistance = 0.8
            const newPos = currentPos.clone().add(direction.clone().multiplyScalar(zoomDistance))

            console.log('=== Simple zoom toward crosshair ===')
            console.log('Look target:', lookTarget)
            console.log('New position:', newPos)

            targetConfig = {
                position: [newPos.x, newPos.y, newPos.z],
                lookAt: [lookTarget.x, lookTarget.y, lookTarget.z],
                fov: 25 // Narrower FOV for zoom
            }
        } else if (cameraTarget === 'intro') {
            targetConfig = CAMERA_POSITIONS.intro
        } else if (cameraTarget === 'entering') {
            targetConfig = CAMERA_POSITIONS.entering
        } else if (cameraTarget === 'overview') {
            targetConfig = CAMERA_POSITIONS.overview
        } else if (cameraTarget === 'inspecting') {
            // Keep camera close (like overview) but centered on current tray
            const trayConfig = CAMERA_POSITIONS[`tray${currentTray}`] || CAMERA_POSITIONS.overview
            targetConfig = {
                ...trayConfig,
                position: [trayConfig.position[0], 2.2, 0.8], // Lower Y for closer view
                fov: 30 // Narrower FOV for inspection focus
            }
        } else if (!lightsOn) {
            targetConfig = CAMERA_POSITIONS.entering
        } else {
            // Default to tray positions when navigating between trays
            targetConfig = CAMERA_POSITIONS[`tray${currentTray}`] || CAMERA_POSITIONS.overview
        }

        // Determine animation duration - longer for walk-in sequence (slowed down)
        const isWalkIn = cameraTarget === 'entering' || cameraTarget === 'intro'
        const duration = isWalkIn ? 4.5 : 1.5

        // Determine Up vector
        const isTopDown = cameraTarget === 'photo'
        const targetUp = isTopDown ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0)

        // Helper to animate vector
        const currentUp = cameraRef.current.up.clone()

        // Animate RIG position (base camera position)
        gsap.to(rigRef.current.position, {
            x: targetConfig.position[0],
            y: targetConfig.position[1],
            z: targetConfig.position[2],
            duration: duration,
            ease: 'power2.inOut',
            onStart: () => { isMoving.current = true },
            onComplete: () => { isMoving.current = false }
        })

        // Animate base look target (mouse offset applied on top in useFrame)
        gsap.to(baseTargetRef.current, {
            x: targetConfig.lookAt[0],
            y: targetConfig.lookAt[1],
            z: targetConfig.lookAt[2],
            duration: duration,
            ease: 'power2.inOut'
        })

        // Animate Up vector
        gsap.to(cameraRef.current.up, {
            x: targetUp.x,
            y: targetUp.y,
            z: targetUp.z,
            duration: duration,
            ease: 'power2.inOut',
            onUpdate: () => {
                // Changing Up vector requires no explicit update if used in useFrame lookAt
                // But just in case
            }
        })

        // Animate FOV on the camera itself
        gsap.to(cameraRef.current, {
            fov: targetConfig.fov,
            duration: duration,
            ease: 'power2.inOut',
            onUpdate: () => {
                if (cameraRef.current) {
                    cameraRef.current.updateProjectionMatrix()
                }
            }
        })

    }, [cameraTarget, currentTray, currentPhotoPosition, lightsOn])

    // Update camera lookAt with FPS-style mouse look every frame
    useFrame((state) => {
        if (cameraRef.current && rigRef.current && baseTargetRef.current) {
            // Smoothly interpolate current mouse position
            currentMouseRef.current.x += (mouseOffsetRef.current.x - currentMouseRef.current.x) * MOUSE_LOOK.smoothing
            currentMouseRef.current.y += (mouseOffsetRef.current.y - currentMouseRef.current.y) * MOUSE_LOOK.smoothing

            // Only apply FPS look when in overview or tray view (not during intro/entering)
            const shouldLook = cameraTarget === 'overview' || cameraTarget.startsWith?.('tray') || lightsOn

            if (shouldLook) {
                // Calculate look offset based on mouse (FPS style - looking where mouse points)
                currentLookOffsetRef.current.x += ((currentMouseRef.current.x * MOUSE_LOOK.horizontalRange) - currentLookOffsetRef.current.x) * MOUSE_LOOK.smoothing
                // Negative Y because moving mouse down should look down
                currentLookOffsetRef.current.y += ((-currentMouseRef.current.y * MOUSE_LOOK.verticalRange) - currentLookOffsetRef.current.y) * MOUSE_LOOK.smoothing

                // Apply mouse look offset to the base target
                targetRef.current.x = baseTargetRef.current.x + currentLookOffsetRef.current.x
                targetRef.current.y = baseTargetRef.current.y + currentLookOffsetRef.current.y
                targetRef.current.z = baseTargetRef.current.z
            } else {
                // Reset look offset when not in look mode
                currentLookOffsetRef.current.x = 0
                currentLookOffsetRef.current.y = 0
                targetRef.current.copy(baseTargetRef.current)
            }

            // Apply Head Bobble during movement
            // Only bobble during the 'entering' phase or intro AND when actually moving
            let bobbleY = 0
            if (cameraTarget === 'entering' && isMoving.current) {
                bobbleY = Math.sin(state.clock.elapsedTime * 8) * 0.035
            }

            // Camera is at origin of rig, apply bobble locally
            cameraRef.current.position.set(0, bobbleY, 0)

            // Make camera look at the computed target with mouse offset
            cameraRef.current.lookAt(targetRef.current)
        }
    })

    return (
        <group ref={rigRef} position={CAMERA_POSITIONS.intro.position}>
            <PerspectiveCamera
                ref={cameraRef}
                makeDefault
                position={[0, 0, 0]} // Relative to rig
                fov={50}
                near={0.1}
                far={100}
            />
        </group>
    )
}

// src/components/ContactSheet.jsx
import { useRef, useState, useEffect } from 'react'
import { useFrame, extend } from '@react-three/fiber'
import { useTexture, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../hooks/useStore'

// Constants for Grid Layout
const GRID_COLS = 3
const GRID_ROWS = 4
const SHEET_WIDTH = 0.6
const SHEET_HEIGHT = 0.8
const CELL_WIDTH = SHEET_WIDTH / GRID_COLS
const CELL_HEIGHT = SHEET_HEIGHT / GRID_ROWS

// Target Y positions
const TRAY_BASE_HEIGHT = 0.85 // From TrayGroup.jsx
const SURFACE_Y = 0.045
const FLOAT_Y = 0.065 // Raised strictly above water
const DEEP_Y = 0.015

// Custom shader for photo with blur capability and development reveal
// With subtle contrast boost to counteract ambient light wash-out
const PhotoMaterial = shaderMaterial(
    {
        uTexture: null,
        uOpacity: 1.0,
        uBlurryness: 0.0,
        uTime: 0,
        uHover: 0,
        uReveal: 0.0 // 0 = white paper, 1 = full color
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    varying float vElev;
    uniform float uTime;
    uniform float uHover;

    void main() {
        vUv = uv;
        vec3 pos = position;
        // Paper curl/float effect removed for flat look
        pos.z += 0.0; 
        vElev = pos.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
    `,
    // Fragment Shader
    `
    uniform sampler2D uTexture;
    uniform float uOpacity;
    uniform float uBlurryness;
    uniform float uReveal;
    
    varying vec2 vUv;

    void main() {
        vec4 texColor = texture2D(uTexture, vUv, uBlurryness);
        
        // Reduce brightness to counteract ambient light wash-out
        vec3 adjustedColor = texColor.rgb * .4;
        
        // Boost saturation to counteract desaturation
        float luminance = dot(adjustedColor, vec3(0.299, 0.587, 0.114));
        adjustedColor = mix(vec3(luminance), adjustedColor, 1.5); // 1.4 = 40% saturation boost
        adjustedColor = clamp(adjustedColor, 0.0, 1.0);
        
        // Paper color: warm off-white (like photo paper)
        vec3 paperColor = vec3(0.95, 0.93, 0.88);
        
        // Mix between paper and revealed photo
        vec3 finalColor = mix(paperColor, adjustedColor, uReveal);
        
        gl_FragColor = vec4(finalColor, uOpacity);
    }
    `
)

// Simple radial shadow shader
const ShadowMaterial = shaderMaterial(
    {
        uOpacity: 0.0,
        uColor: new THREE.Color('#000000')
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    // Fragment Shader
    `
    uniform float uOpacity;
    uniform vec3 uColor;
    varying vec2 vUv;

    void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center) * 2.0; // 0 to 1 at edges
        
        // Soft circle fade
        // Stronger falloff for a realistic "gap" shadow
        float alpha = (1.0 - smoothstep(0.0, 0.8, dist)) * 0.4; 
        alpha *= uOpacity;
        
        gl_FragColor = vec4(uColor, alpha);
    }
    `
)

// Frame overlay shader with reveal effect
const FrameMaterial = shaderMaterial(
    {
        uTexture: null,
        uOpacity: 0.95,
        uReveal: 0.0 // 0 = white paper, 1 = full color
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    // Fragment Shader
    `
    uniform sampler2D uTexture;
    uniform float uOpacity;
    uniform float uReveal;
    varying vec2 vUv;

    void main() {
        vec4 texColor = texture2D(uTexture, vUv);
        
        // Paper color for unrevealed state
        vec3 paperColor = vec3(0.95, 0.93, 0.88);
        
        // Mix between paper and revealed frame
        vec3 finalColor = mix(paperColor, texColor.rgb, uReveal);
        
        // Keep the alpha from the texture (for transparency in photo areas)
        gl_FragColor = vec4(finalColor, texColor.a * uOpacity);
    }
    `
)

extend({ PhotoMaterial, ShadowMaterial, FrameMaterial })

export default function ContactSheet({
    texture,
    position = [0, 0, 0]
}) {
    const meshRef = useRef()
    const materialRef = useRef()
    const frameMatRef = useRef() // Frame overlay material ref
    const shadowRef = useRef()
    const shadowMatRef = useRef()

    // Lifted state: determines if the photo is floating or submerged
    const [lifted, setLifted] = useState(false)
    const [hovered, setHovered] = useState(false)

    // State for transition
    const [textureUrl, setTextureUrl] = useState(texture)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const opacityRef = useRef(1)

    // Development animation state
    // Phases: 'submerged' | 'developing' | 'revealed' | 'rising'
    const [devPhase, setDevPhase] = useState('submerged') // Wait for user click
    const revealRef = useRef(0) // 0 = white paper, 1 = full color
    const devStartTimeRef = useRef(-1) // -1 = capture time on first frame
    const shakeOffsetRef = useRef({ x: 0, z: 0, rot: 0 })

    // Preload and Texture Management
    const allSheets = useStore(state => state.sheets)
    const loadedTextures = useTexture(allSheets.map(s => s.texture))

    // Load Frame Texture for the overlay
    const frameTexture = useTexture('textures/contact_sheet_frame.png')
    frameTexture.colorSpace = THREE.SRGBColorSpace

    const getTexture = (url) => {
        const index = allSheets.findIndex(s => s.texture === url)
        if (index === -1) return loadedTextures[0] // Fallback
        const tex = loadedTextures[index]
        tex.colorSpace = THREE.SRGBColorSpace
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.generateMipmaps = true
        return tex
    }

    // Handle texture change (sheet switching)
    // Reset to submerged and trigger fade + re-development
    useEffect(() => {
        if (texture === textureUrl) return
        // Start fade out, then swap texture and re-develop
        setIsTransitioning(true)
        setDevPhase('submerged')
        revealRef.current = 0
        devStartTimeRef.current = -1 // Reset timing for next development
        setLifted(false)
    }, [texture, textureUrl])

    const activeTexture = getTexture(textureUrl)
    const cameraTarget = useStore(state => state.cameraTarget)
    const selectPhoto = useStore(state => state.selectPhoto)
    const setCameraTarget = useStore(state => state.setCameraTarget)

    // Base rotation for the sheet (90 degrees to fit tray)
    const BASE_ROTATION = Math.PI / 2

    // Development animation timing constants
    const SHAKE_DURATION = 2.0 // seconds
    const REVEAL_DURATION = 3.0 // seconds
    const SHAKE_INTENSITY = 0.003 // position shake
    const SHAKE_ROT_INTENSITY = 0.02 // rotation shake

    // Main Frame Loop: Animation
    useFrame((state, delta) => {
        if (!meshRef.current || !materialRef.current) return

        const time = state.clock.elapsedTime

        // --- Fade Logic (texture swap) ---
        if (isTransitioning) {
            opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, 0, delta * 8)
            if (opacityRef.current < 0.05) {
                setTextureUrl(texture)
                setIsTransitioning(false)
                // After texture swap, start developing
                setDevPhase('developing')
                devStartTimeRef.current = time
            }
        } else {
            opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, 1, delta * 8)
        }

        // --- Development Phase Logic ---
        if (devPhase === 'developing') {
            // Capture time on first developing frame
            if (devStartTimeRef.current < 0) {
                devStartTimeRef.current = time
            }
            const elapsed = time - devStartTimeRef.current

            // Shake animation (active during development)
            const shakeFreq = 15
            shakeOffsetRef.current = {
                x: Math.sin(time * shakeFreq) * SHAKE_INTENSITY * Math.cos(time * shakeFreq * 0.7),
                z: Math.cos(time * shakeFreq * 1.3) * SHAKE_INTENSITY * Math.sin(time * shakeFreq * 0.5),
                rot: Math.sin(time * shakeFreq * 0.8) * SHAKE_ROT_INTENSITY
            }

            // Color reveal progress
            const revealProgress = Math.min(elapsed / REVEAL_DURATION, 1)
            revealRef.current = THREE.MathUtils.lerp(revealRef.current, revealProgress, delta * 3)

            // Transition to revealed when colors are done
            if (elapsed > REVEAL_DURATION + 0.5) {
                setDevPhase('revealed')
                shakeOffsetRef.current = { x: 0, z: 0, rot: 0 }
            }
        } else if (devPhase === 'revealed') {
            // Colors done, sheet stays submerged until clicked
            revealRef.current = THREE.MathUtils.lerp(revealRef.current, 1, delta * 5)
            // Decay shake smoothly
            shakeOffsetRef.current.x = THREE.MathUtils.lerp(shakeOffsetRef.current.x, 0, delta * 5)
            shakeOffsetRef.current.z = THREE.MathUtils.lerp(shakeOffsetRef.current.z, 0, delta * 5)
            shakeOffsetRef.current.rot = THREE.MathUtils.lerp(shakeOffsetRef.current.rot, 0, delta * 5)
        } else if (devPhase === 'rising') {
            // Sheet is rising to surface
            revealRef.current = 1
            shakeOffsetRef.current.x = THREE.MathUtils.lerp(shakeOffsetRef.current.x, 0, delta * 5)
            shakeOffsetRef.current.z = THREE.MathUtils.lerp(shakeOffsetRef.current.z, 0, delta * 5)
            shakeOffsetRef.current.rot = THREE.MathUtils.lerp(shakeOffsetRef.current.rot, 0, delta * 5)
        } else {
            // Submerged: white paper
            revealRef.current = THREE.MathUtils.lerp(revealRef.current, 0, delta * 5)
        }

        // --- Position Logic ---
        // Only float if lifted AND development is complete
        const canFloat = devPhase === 'revealed' || devPhase === 'rising'
        const isFloating = (cameraTarget === 'photo' || (cameraTarget === 'inspecting' && lifted)) && canFloat
        const targetY = isFloating ? FLOAT_Y : DEEP_Y

        // Update phase when we start rising
        if (isFloating && devPhase === 'revealed') {
            setDevPhase('rising')
        }

        meshRef.current.position.y = THREE.MathUtils.lerp(
            meshRef.current.position.y,
            targetY,
            delta * 3.0
        )

        // Apply shake offset to position
        meshRef.current.position.x = shakeOffsetRef.current.x
        meshRef.current.position.z = shakeOffsetRef.current.z

        const currentY = meshRef.current.position.y

        // --- Blur ---
        let depthFactor = (SURFACE_Y - currentY) / (SURFACE_Y - DEEP_Y)
        depthFactor = THREE.MathUtils.clamp(depthFactor, 0, 1)
        materialRef.current.uBlurryness = THREE.MathUtils.lerp(
            materialRef.current.uBlurryness,
            depthFactor * 1.5,
            delta * 5
        )

        // --- Shadow ---
        if (shadowMatRef.current && shadowRef.current) {
            const heightAboveWater = Math.max(0, currentY - SURFACE_Y)
            const maxFloatHeight = FLOAT_Y - SURFACE_Y
            let shadowOpacity = heightAboveWater / maxFloatHeight
            shadowOpacity = THREE.MathUtils.clamp(shadowOpacity, 0, 1)

            shadowMatRef.current.uOpacity = shadowOpacity
            shadowRef.current.visible = shadowOpacity > 0.01
        }

        // --- Uniforms ---
        materialRef.current.uTime = time
        materialRef.current.uOpacity = opacityRef.current
        materialRef.current.uReveal = revealRef.current
        materialRef.current.uHover = THREE.MathUtils.lerp(
            materialRef.current.uHover,
            hovered ? 1.0 : 0.0,
            delta * 4
        )

        // Update frame material reveal
        if (frameMatRef.current) {
            frameMatRef.current.uReveal = revealRef.current
        }

        // --- Rotation ---
        const baseRotWithShake = BASE_ROTATION + shakeOffsetRef.current.rot
        if (hovered && isFloating) {
            meshRef.current.rotation.z = baseRotWithShake + Math.sin(time * 2) * 0.01
        } else {
            meshRef.current.rotation.z = THREE.MathUtils.lerp(
                meshRef.current.rotation.z,
                baseRotWithShake,
                delta * 4
            )
        }
    })

    // Handler for Grid Cell Clicks
    const handleCellClick = (e, cell) => {
        e.stopPropagation()

        // 1. If looking at room, go to tray
        if (cameraTarget !== 'inspecting' && cameraTarget !== 'photo') {
            setCameraTarget('inspecting')
            return
        }

        // 2. If at tray but submerged, start development and lift
        if (cameraTarget === 'inspecting') {
            if (!lifted) {
                // Trigger development animation if not already developing/revealed
                if (devPhase === 'submerged') {
                    setDevPhase('developing')
                    devStartTimeRef.current = -1 // Will capture time on next frame
                }
                setLifted(true)
                return
            }
        }

        // 3. If in photo mode (zoomed in), CLICK to ZOOM OUT
        if (cameraTarget === 'photo') {
            setCameraTarget('inspecting')
            return
        }

        // 4. If lifted and inspecting, ZOOM IN to this cell
        selectPhoto(cell.id, cell.worldPos)
    }

    // Reset lifted state when backing out
    if (lifted && (cameraTarget !== 'inspecting' && cameraTarget !== 'photo')) {
        setLifted(false)
    }

    const groupPosition = [position[0], 0, position[2]]

    return (
        <group position={groupPosition}>
            {/* Shadow Plane */}
            <mesh
                ref={shadowRef}
                position={[0, 0.044, 0]}
                rotation={[-Math.PI / 2, 0, BASE_ROTATION]}
            >
                <planeGeometry args={[SHEET_WIDTH, SHEET_HEIGHT]} />
                <shadowMaterial
                    ref={shadowMatRef}
                    uOpacity={0.0}
                    transparent
                    depthWrite={false}
                />
            </mesh>

            {/* Visual Group (Photos + Frame) */}
            <group
                ref={meshRef}
                position={[0, 0.01, 0]}
                rotation={[-Math.PI / 2, 0, BASE_ROTATION]}  // 90° Z to fit tray landscape
            >
                {/* 1. PAPER LAYER (Photos) */}
                <mesh
                    userData={{ isContactSheet: true }}
                    castShadow={false}
                    onPointerEnter={() => setHovered(true)}
                    onPointerLeave={() => setHovered(false)}
                    onClick={(e) => {
                        e.stopPropagation()

                        // Calculate click position relative to mesh
                        const uv = e.uv // 0..1
                        if (!uv) return

                        // Invert UV mapping if needed? No, standard UVs (0,0) bottom left
                        // But we rotated 180, so UVs are likely standard relative to visual

                        // Map UV to Grid Col/Row
                        // UV.x -> Col, UV.y -> Row
                        // Note: UV=(0,0) is usually bottom-left. 
                        // Row 0 (Top) is high Y. Row 3 (Bottom) is low Y.

                        const col = Math.floor(uv.x * GRID_COLS)
                        const row = Math.floor((1.0 - uv.y) * GRID_ROWS)

                        console.log('Clicked Grid:', col, row)

                        // 3-3-2-2 Mapping logic matches useStore
                        let id = -1
                        let valid = false

                        if (row === 0) {
                            if (col < 3) { id = col; valid = true }
                        } else if (row === 1) {
                            if (col < 3) { id = 3 + col; valid = true }
                        } else if (row === 2) {
                            if (col < 2) { id = 6 + col; valid = true }
                        } else if (row === 3) {
                            if (col < 2) { id = 8 + col; valid = true }
                        }

                        if (!valid || id >= 10) return

                        // Stable World Pos for Zoom
                        // We use the exact click point for intuitive feeling
                        const stableWorldPos = {
                            x: e.point.x,
                            y: TRAY_BASE_HEIGHT + FLOAT_Y,
                            z: e.point.z
                        }

                        const cell = {
                            id: id,
                            worldPos: stableWorldPos
                        }
                        handleCellClick(e, cell)
                    }}
                >
                    <planeGeometry args={[SHEET_WIDTH, SHEET_HEIGHT, 32, 32]} />
                    <photoMaterial
                        ref={materialRef}
                        uTexture={activeTexture}
                        uOpacity={opacityRef.current}
                        transparent
                        side={THREE.DoubleSide}
                        toneMapped={false}
                    />
                </mesh>

                {/* 2. PLASTIC SLEEVE OVERLAY (Frame) */}
                <mesh position={[0, 0, 0.0005]} receiveShadow={false}>
                    <planeGeometry args={[SHEET_WIDTH, SHEET_HEIGHT]} />
                    <frameMaterial
                        ref={frameMatRef}
                        uTexture={frameTexture}
                        uOpacity={0.95}
                        uReveal={revealRef.current}
                        transparent
                        depthWrite={false}
                    />
                </mesh>
            </group>
        </group>
    )
}

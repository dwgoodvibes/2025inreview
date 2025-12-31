// src/components/Lighting.jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import useStore from '../hooks/useStore'
import { getFlickerBrightness } from '../utils/flicker'

export default function Lighting() {
    const lightRef = useRef()
    const secondaryLightRef = useRef()
    const bulbRef = useRef() // Ref for the visible bulb mesh

    const isFlickering = useStore(state => state.isFlickering)
    const lightsOn = useStore(state => state.lightsOn)
    const cameraTarget = useStore(state => state.cameraTarget)
    const isIntro = cameraTarget === 'intro' || cameraTarget === 'entering'

    // Debug controls (remove in production)
    const { intensity, color, position } = useControls('Safe Light', {
        intensity: { value: 2.5, min: 0, max: 10, step: 0.1 },
        color: '#ffaa55',
        position: { value: [0.1, 1.5, -0.1], step: 0.1 }
    })

    // Base intensity when lights are off (for intro)
    const baseIntensity = lightsOn ? intensity : 0

    // Flickering effect for intro sequence
    useFrame(({ clock }) => {
        const time = clock.elapsedTime

        if (isFlickering && lightRef.current) {
            // ... (keep existing start-up flicker logic)
            // Rapid flicker effect with varied pattern
            const flicker = Math.sin(time * 50) * 0.5 + 0.5
            const noise = Math.random() * 0.3
            const brightness = (flicker + noise) * 6

            lightRef.current.intensity = brightness
            if (secondaryLightRef.current) {
                secondaryLightRef.current.intensity = brightness * 0.3
            }
            // Update bulb mesh
            if (bulbRef.current && bulbRef.current.material) {
                bulbRef.current.material.emissiveIntensity = brightness * 2.0
            }
        } else if (isIntro && lightRef.current) {
            // Intro mode: Synced via deterministic utility
            const brightness = getFlickerBrightness(time)

            lightRef.current.intensity = brightness
            if (secondaryLightRef.current) {
                secondaryLightRef.current.intensity = brightness * 0.3
            }

            // Update bulb mesh with high intensity for "ball of light" effect
            if (bulbRef.current && bulbRef.current.material) {
                bulbRef.current.material.emissiveIntensity = brightness * 15.0
            }
        } else if (lightRef.current) {
            // Normal state
            lightRef.current.intensity = baseIntensity
            if (secondaryLightRef.current) {
                secondaryLightRef.current.intensity = baseIntensity * 0.3
            }
            if (bulbRef.current && bulbRef.current.material) {
                bulbRef.current.material.emissiveIntensity = lightsOn ? 15.0 : 0
            }
        }
    })

    const ambientIntensity = isIntro ? 0.02 : (lightsOn ? 0.15 : 0.02)

    return (
        <>
            {/* Main safe light */}
            <pointLight
                ref={lightRef}
                position={position}
                intensity={baseIntensity}
                color={color}
                distance={15}
                decay={2}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-bias={-0.0001}
                shadow-radius={8}
            />

            {/* Subtle ambient fill - always slightly on for intro visibility */}
            <ambientLight
                intensity={ambientIntensity}
                color="#3a3025"
            />

            {/* Secondary safe light - fill light */}
            <pointLight
                ref={secondaryLightRef}
                position={[-1.5, 2.5, -0.5]}
                intensity={baseIntensity * 0.3}
                color="#ffaa66"
                distance={12}
                decay={2}
            />

            {/* Visible "Ball of Light" Bulb */}
            <mesh ref={bulbRef} position={[position[0], position[1] + 0.12, position[2]]}>
                <sphereGeometry args={[0.06, 32, 32]} />
                <meshStandardMaterial
                    color="#ffaa00"
                    emissive="#ff8800"
                    emissiveIntensity={0}
                    toneMapped={false}
                />
            </mesh>
        </>
    )
}

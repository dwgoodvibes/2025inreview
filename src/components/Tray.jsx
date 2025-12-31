// src/components/Tray.jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import ContactSheet from './ContactSheet'
import LiquidMesh from './LiquidMesh'


export default function Tray({
    index,
    position,
    sheetTexture,
    category
}) {
    const groupRef = useRef()
    // Use ref instead of state to avoid re-renders on every frame
    const agitationRef = useRef(0)

    // Subtle idle floating animation
    useFrame(({ clock }) => {
        if (groupRef.current) {
            groupRef.current.position.y =
                position[1] + Math.sin(clock.elapsedTime * 0.5) * 0.002
        }

        // Gradually reduce agitation over time (using ref, no re-render)
        if (agitationRef.current > 0) {
            agitationRef.current = Math.max(0, agitationRef.current - 0.01)
        }
    })

    const handleSheetMove = () => {
        agitationRef.current = 0.8
    }

    return (
        <group ref={groupRef} position={position}>
            {/* Tray geometry comes from Blender GLB (darkroom.glb) */}

            {/* Animated liquid surface with morph targets */}
            <LiquidMesh
                position={[0, 0.045, 0]}
                agitationRef={agitationRef}
                isActive={true}
            />

            {/* Contact sheet submerged */}
            <ContactSheet
                texture={sheetTexture}
                position={[0, 0.01, 0]}
                index={index}
                onMove={handleSheetMove}
            />

            {/* Category label (floating above tray) */}

        </group>
    )
}


// src/components/IntroText.jsx
import { useRef, useEffect } from 'react'
import { Text } from '@react-three/drei'
import gsap from 'gsap'
import useStore from '../hooks/useStore'

export default function IntroText() {
    const groupRef = useRef()
    const cameraTarget = useStore(state => state.cameraTarget)

    // Text appears during 'intro' state, fades out when moving to 'entering'
    useEffect(() => {
        if (!groupRef.current) return

        if (cameraTarget === 'intro') {
            // Fade in
            gsap.to(groupRef.current, {
                opacity: 1,
                duration: 1.5,
                ease: 'power2.out'
            })
            groupRef.current.children.forEach(child => {
                if (child.material) {
                    gsap.to(child.material, {
                        opacity: 1,
                        duration: 1.5,
                        ease: 'power2.out'
                    })
                }
            })
        } else {
            // Fade out
            groupRef.current.children.forEach(child => {
                if (child.material) {
                    gsap.to(child.material, {
                        opacity: 0,
                        duration: 0.8,
                        ease: 'power2.in'
                    })
                }
            })
        }
    }, [cameraTarget])

    // Position the text in the room - stationary, floating in front of the starting camera position
    // Starting camera is at [0, 1.7, 4.5] looking toward [0, 1.5, 0]
    // Place text at [0, 1.5, 2.5] - centered, eye level, between camera and desk
    return (
        <group ref={groupRef} position={[0, 1.5, 2.5]}>
            {/* Main intro line */}
            <Text
                position={[0, 0.15, 0]}
                fontSize={0.14}
                color="#e8dcc8"
                anchorX="center"
                anchorY="middle"
                font="https://raw.githubusercontent.com/google/fonts/main/ofl/sigmarone/SigmarOne-Regular.ttf"
                maxWidth={3}
                textAlign="center"
                material-transparent={true}
                material-opacity={0}
            >
                It's been a while...
            </Text>

            {/* Second line - contemplative */}
            <Text
                position={[0, -0.12, 0]}
                fontSize={0.1}
                color="#c4b8a8"
                anchorX="center"
                anchorY="middle"
                font="https://raw.githubusercontent.com/google/fonts/main/ofl/sigmarone/SigmarOne-Regular.ttf"
                maxWidth={3}
                textAlign="center"
                material-transparent={true}
                material-opacity={0}
            >
                Let me remember.
            </Text>
        </group>
    )
}

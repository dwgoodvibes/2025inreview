// src/components/Atmosphere.jsx
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useControls } from 'leva'

export default function Atmosphere() {
    const { scene } = useThree()

    const { fogColor, fogDensity } = useControls('Fog', {
        fogColor: '#8b5a2b',
        fogDensity: { value: 0.06, min: 0, max: 0.3, step: 0.01 }
    })

    useEffect(() => {
        // Exponential fog for more realistic falloff
        scene.fog = new THREE.FogExp2(fogColor, fogDensity)
        scene.background = new THREE.Color('#0a0505')

        return () => {
            scene.fog = null
        }
    }, [scene, fogColor, fogDensity])

    return null
}

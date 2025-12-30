// src/shaders/LiquidMaterial.jsx
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

export default function Liquid({ position = [0, 0, 0], size = [1, 1] }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size[0], size[1]]} />
      <MeshTransmissionMaterial
        resolution={512}
        samples={6}
        thickness={0.1}
        roughness={0.1}
        ior={1.33} // Water index of refraction
        transmission={1}
        background={new THREE.Color('#000000')} // Darker transmission background assumption
        color="#cc7722" // Amber tint (developer fluid)
        attenuationColor="#cc7722"
        attenuationDistance={1.0}
        distortion={0.5} // Water-like distortion
        distortionScale={0.3}
        temporalDistortion={0.1} // Movement speed
      />
    </mesh>
  )
}

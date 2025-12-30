// src/components/LiquidMesh.jsx
// Animated liquid surface using vertex shader for ripple effects

import { useRef } from 'react'
import { useFrame, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Custom shader material for animated liquid
const LiquidMaterial = shaderMaterial(
    // Uniforms
    {
        uTime: 0,
        uColor: new THREE.Color('#080a0b'), // Very dark, ink-like
        uOpacity: 0.6, // More transparent
        uRippleIntensity: 0.1,
        uAgitation: 0,
    },
    // Vertex shader
    `
        uniform float uTime;
        uniform float uRippleIntensity;
        uniform float uAgitation;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
            vUv = uv;
            vNormal = normal;
            
            vec3 pos = position;
            
            // Centered UV for radial effects
            vec2 center = uv - 0.5;
            float dist = length(center);
            
            // Idle ripple - concentric waves from center
            float idleRipple = sin(dist * 25.0 - uTime * 2.0) * 0.003 * uRippleIntensity;
            
            // Agitation ripple - faster, more chaotic
            float agitationRipple = sin(dist * 15.0 - uTime * 4.0) * 0.006 * uAgitation;
            
            // Gentle sloshing wave
            float sloshX = sin(uTime * 0.8) * 0.003 * (uv.x - 0.5);
            float sloshY = cos(uTime * 0.6) * 0.003 * (uv.y - 0.5);
            
            // Surface tension dome - slight bulge in center
            float dome = (1.0 - dist * 2.0) * 0.002;
            dome = max(0.0, dome);
            
            // Edge fade to keep edges stable
            float edgeFade = 1.0 - smoothstep(0.3, 0.5, dist);
            
            // Combine all displacement
            pos.z += (idleRipple + agitationRipple + sloshX + sloshY + dome) * edgeFade;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    // Fragment shader
    `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
            vec2 center = vUv - 0.5;
            float dist = length(center);
            float edgeDist = max(abs(center.x), abs(center.y));
            
            // Edge proximity - for meniscus
            float edgeProximity = smoothstep(0.15, 0.48, edgeDist);
            
            // Multiple layered ripple patterns
            float ripple1 = sin(dist * 80.0 - uTime * 3.0) * 0.5 + 0.5;
            float ripple2 = sin(dist * 50.0 + uTime * 2.0) * 0.5 + 0.5;
            
            // Edge-following ripples
            float edgeRipple = sin(atan(center.y, center.x) * 12.0 + uTime * 2.0) * 0.5 + 0.5;
            
            // Combine ripples - stronger near edges
            float rippleEffect = (ripple1 * 0.3 + ripple2 * 0.25 + edgeRipple * 0.2);
            rippleEffect *= edgeProximity * 0.4;
            
            // Base color
            vec3 color = uColor;
            
            // Specular highlights only (no colored glow)
            // Just subtle white sheen on peaks
            float highlight = rippleEffect * 0.15;
            color += vec3(highlight);
            
            // Soft edge fade
            float edgeFade = 1.0 - smoothstep(0.45, 0.5, edgeDist);
            
            // Meniscus darkening (thicker liquid at edges)
            float edgeDarken = 1.0 - (edgeProximity * 0.3);
            
            gl_FragColor = vec4(color * edgeDarken, uOpacity * edgeFade);
        }
    `
)

extend({ LiquidMaterial })

/**
 * LiquidMesh - Animated liquid surface using custom shader
 */
export default function LiquidMesh({
    position = [0, 0.045, 0],
    rippleIntensity = 0.1,
    agitationRef,
    isActive = true
}) {
    const materialRef = useRef()

    // Animate shader uniforms
    useFrame(({ clock }) => {
        if (!materialRef.current) return

        materialRef.current.uTime = clock.elapsedTime
        materialRef.current.uRippleIntensity = rippleIntensity * (isActive ? 1 : 0.3)
        materialRef.current.uAgitation = agitationRef?.current ?? 0
    })

    return (
        // Disable raycasting for the liquid surface to prevent it from blocking clicks on the contact sheet
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} castShadow={false} receiveShadow={false} raycast={() => null}>
            <planeGeometry args={[0.92, 0.62, 32, 32]} />
            <liquidMaterial
                ref={materialRef}
                transparent
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </mesh>
    )
}

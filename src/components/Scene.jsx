// src/components/Scene.jsx
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Loader } from '@react-three/drei'
import { Leva } from 'leva'
import * as THREE from 'three'
import Darkroom from './Darkroom'
import Lighting from './Lighting'
import Atmosphere from './Atmosphere'
import PostProcessing from './PostProcessing'
import TrayGroup from './TrayGroup'
import CameraController from './CameraController'
import IntroSequence from './IntroSequence'
import IntroText from './IntroText'
import AudioManager from './AudioManager'
import NavigationUI from './NavigationUI'
import PhotoDetail from './PhotoDetail'

export default function Scene() {
    return (
        <>
            {/* Debug controls - press 'a' to toggle */}
            <Leva collapsed />
            <Canvas
                gl={{
                    antialias: true,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.2
                }}
                shadows
            >
                <Suspense fallback={null}>
                    <CameraController />
                    <Atmosphere />
                    <Lighting />
                    <Darkroom />
                    <TrayGroup />
                    <PostProcessing />
                    <IntroSequence />
                    <IntroText />
                    <AudioManager />
                    <NavigationUI />
                    <PhotoDetail />
                </Suspense>
            </Canvas>
            <Loader />
        </>
    )
}

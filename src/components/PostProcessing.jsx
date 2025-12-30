// src/components/PostProcessing.jsx
import {
    EffectComposer,
    Bloom,
    Vignette,
    ChromaticAberration,
    Noise,
    ToneMapping
} from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useControls } from 'leva'

export default function PostProcessing() {
    const bloom = useControls('Bloom', {
        intensity: { value: 0.5, min: 0, max: 5, step: 0.1 },
        luminanceThreshold: { value: 0.75, min: 0, max: 1, step: 0.05 },
        luminanceSmoothing: { value: 0.8, min: 0, max: 1, step: 0.05 },
        radius: { value: 0.5, min: 0, max: 1, step: 0.05 }
    })

    const vignette = useControls('Vignette', {
        offset: { value: 0.3, min: 0, max: 1, step: 0.05 },
        darkness: { value: 0.7, min: 0, max: 1, step: 0.05 }
    })

    return (
        <EffectComposer multisampling={0}>
            {/* Bloom - makes lights glow */}
            <Bloom
                intensity={bloom.intensity}
                luminanceThreshold={bloom.luminanceThreshold}
                luminanceSmoothing={bloom.luminanceSmoothing}
                radius={bloom.radius}
            />

            {/* Vignette - darkens edges */}
            <Vignette
                offset={vignette.offset}
                darkness={vignette.darkness}
                blendFunction={BlendFunction.NORMAL}
            />

            {/* Subtle chromatic aberration */}
            <ChromaticAberration
                offset={[0.0001, 0.0001]}
                blendFunction={BlendFunction.NORMAL}
            />

            {/* Film grain */}
            <Noise
                opacity={0.15}
                blendFunction={BlendFunction.OVERLAY}
            />

            {/* Tone mapping for HDR-like look */}
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
    )
}

import { useEffect, useRef } from 'react'
import useStore from '../hooks/useStore'
import * as THREE from 'three'

export default function AudioManager() {
    const cameraTarget = useStore(state => state.cameraTarget)
    const audioContextRef = useRef(null)
    const gainNodeRef = useRef(null)
    const oscillatorsRef = useRef([])

    useEffect(() => {
        const initAudio = () => {
            if (audioContextRef.current) return

            const AudioContext = window.AudioContext || window.webkitAudioContext
            if (!AudioContext) return

            audioContextRef.current = new AudioContext()

            // Master gain
            gainNodeRef.current = audioContextRef.current.createGain()
            gainNodeRef.current.gain.value = 0
            gainNodeRef.current.connect(audioContextRef.current.destination)

            // --- 1. Deep Throbbing Hum (The "Transformer" sound) ---
            const humOsc = audioContextRef.current.createOscillator()
            humOsc.type = 'square'
            humOsc.frequency.value = 50 // Lowered to 50Hz (deep mains)

            const humFilter = audioContextRef.current.createBiquadFilter()
            humFilter.type = 'lowpass'
            humFilter.frequency.value = 400

            const humGain = audioContextRef.current.createGain()
            humGain.gain.value = 0.5

            // LFO to modulate Hum Volume (Make it "less uniform")
            const lfo = audioContextRef.current.createOscillator()
            lfo.type = 'sine'
            lfo.frequency.value = 0.5 // Slow throb (every 2 seconds)

            const lfoGain = audioContextRef.current.createGain()
            lfoGain.gain.value = 0.2 // Modulate volume by +/- 0.2

            lfo.connect(lfoGain)
            lfoGain.connect(humGain.gain)
            lfo.start()

            humOsc.connect(humFilter)
            humFilter.connect(humGain)
            humGain.connect(gainNodeRef.current)
            humOsc.start()

            oscillatorsRef.current.push(humOsc, lfo)

            // --- 2. Low Rumble (Filtered Noise) ---
            const bufferSize = audioContextRef.current.sampleRate * 2
            const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate)
            const data = buffer.getChannelData(0)
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1
            }

            const noise = audioContextRef.current.createBufferSource()
            noise.buffer = buffer
            noise.loop = true

            // Lowpass filter to create "rumble" instead of "hiss"
            const noiseFilter = audioContextRef.current.createBiquadFilter()
            noiseFilter.type = 'lowpass'
            noiseFilter.frequency.value = 150 // Very low rumble

            const noiseGain = audioContextRef.current.createGain()
            noiseGain.gain.value = 0.8

            // Random volume modulation for noise (Brownian-ish walk?)
            // We can just use another LFO at a different rate
            const noiseLfo = audioContextRef.current.createOscillator()
            noiseLfo.type = 'triangle'
            noiseLfo.frequency.value = 0.2 // Very slow drift

            const noiseLfoGain = audioContextRef.current.createGain()
            noiseLfoGain.gain.value = 0.3

            noiseLfo.connect(noiseLfoGain)
            noiseLfoGain.connect(noiseGain.gain)
            noiseLfo.start()

            noise.connect(noiseFilter)
            noiseFilter.connect(noiseGain)
            noiseGain.connect(gainNodeRef.current)
            noise.start()

            oscillatorsRef.current.push(noise, noiseLfo)
        }

        const resumeAudio = () => {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume()
            }
        }

        if (cameraTarget === 'intro') {
            if (!audioContextRef.current) initAudio()
            resumeAudio(); // Added semicolon to prevent ASI issue with next line

            // Event listeners
            ['click', 'keydown', 'mousemove'].forEach(e => window.addEventListener(e, resumeAudio))

            // Fade In
            if (gainNodeRef.current) {
                const now = audioContextRef.current.currentTime
                gainNodeRef.current.gain.cancelScheduledValues(now)
                gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, now)
                gainNodeRef.current.gain.linearRampToValueAtTime(1.0, now + 3)
            }

        } else {
            ['click', 'keydown', 'mousemove'].forEach(e => window.removeEventListener(e, resumeAudio))

            if (gainNodeRef.current && audioContextRef.current) {
                const now = audioContextRef.current.currentTime
                gainNodeRef.current.gain.cancelScheduledValues(now)
                gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, now)
                gainNodeRef.current.gain.exponentialRampToValueAtTime(0.001, now + 1.5)
            }
        }

        return () => {
            ['click', 'keydown', 'mousemove'].forEach(e => window.removeEventListener(e, resumeAudio))
        }
    }, [cameraTarget])

    return null
}

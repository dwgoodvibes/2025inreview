// src/components/IntroSequence.jsx
import { useEffect, useRef } from 'react'
import useStore from '../hooks/useStore'

export default function IntroSequence() {
    const flickerLights = useStore(state => state.flickerLights)
    const setCameraTarget = useStore(state => state.setCameraTarget)
    const setIntroComplete = useStore(state => state.setIntroComplete)
    const resetIntro = useStore(state => state.resetIntro)
    const introComplete = useStore(state => state.introComplete)

    const hasStarted = useRef(false)

    // Auto-start the intro sequence on mount
    useEffect(() => {
        // Skip if already completed or already started
        if (introComplete || hasStarted.current) return
        hasStarted.current = true

        // Ensure we start from a clean state
        resetIntro()

        // Start the "walking in" sequence
        const startSequence = async () => {
            // Small delay for scene to load
            await new Promise(r => setTimeout(r, 600))

            // Stay at intro position with text visible
            // Wait for user click to continue
            await new Promise(resolve => {
                const handler = () => {
                    window.removeEventListener('click', handler)
                    resolve()
                }
                // Add a small delay before listening to avoid immediate clicks
                setTimeout(() => window.addEventListener('click', handler), 100)
            })

            // Set camera to "entering" state - simulates walking in
            setCameraTarget('entering')

            // Wait for walking animation (4.5s). reduce slightly to 4400 to maintain momentum
            await new Promise(r => setTimeout(r, 4400))

            // Flicker the lights on as we reach the desk
            await flickerLights()

            // Move to overview position - leaning over desk
            setCameraTarget('overview')

            // Wait for the camera to settle at overview
            await new Promise(r => setTimeout(r, 2000))

            // Mark intro as complete - show navigation UI
            setIntroComplete(true)
        }

        startSequence()
    }, [flickerLights, setCameraTarget, setIntroComplete, resetIntro, introComplete])

    // No visual overlay - just handles the sequence logic
    return null
}

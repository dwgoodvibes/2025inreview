// src/hooks/useNavigation.js
import { useEffect, useCallback } from 'react'
import useStore from './useStore'

export default function useNavigation() {
    const currentTray = useStore(state => state.currentTray)
    const setCurrentTray = useStore(state => state.setCurrentTray)
    const cameraTarget = useStore(state => state.cameraTarget)
    const totalTrays = useStore(state => state.sheets.length)
    const lightsOn = useStore(state => state.lightsOn)

    const goNext = useCallback(() => {
        if (cameraTarget !== 'photo' && lightsOn) {
            setCurrentTray(Math.min(currentTray + 1, totalTrays - 1))
        }
    }, [currentTray, totalTrays, cameraTarget, setCurrentTray, lightsOn])

    const goPrev = useCallback(() => {
        if (cameraTarget !== 'photo' && lightsOn) {
            setCurrentTray(Math.max(currentTray - 1, 0))
        }
    }, [currentTray, cameraTarget, setCurrentTray, lightsOn])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'd') goNext()
            if (e.key === 'ArrowLeft' || e.key === 'a') goPrev()
            if (e.key === 'Escape') {
                useStore.getState().clearPhoto()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [goNext, goPrev])

    // Touch/swipe handling
    useEffect(() => {
        let startX = 0

        const handleTouchStart = (e) => {
            startX = e.touches[0].clientX
        }

        const handleTouchEnd = (e) => {
            const endX = e.changedTouches[0].clientX
            const diff = startX - endX

            if (Math.abs(diff) > 50) {
                if (diff > 0) goNext()
                else goPrev()
            }
        }

        window.addEventListener('touchstart', handleTouchStart)
        window.addEventListener('touchend', handleTouchEnd)

        return () => {
            window.removeEventListener('touchstart', handleTouchStart)
            window.removeEventListener('touchend', handleTouchEnd)
        }
    }, [goNext, goPrev])

    return { goNext, goPrev }
}

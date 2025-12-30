// src/components/Viewfinder.jsx
// Visual indicator showing where the camera will zoom

import { useEffect, useState } from 'react'
import useStore from '../hooks/useStore'
import './Viewfinder.css'

export default function Viewfinder() {
    const [visible, setVisible] = useState(false)
    const cameraTarget = useStore(state => state.cameraTarget)
    const lightsOn = useStore(state => state.lightsOn)

    // Show viewfinder whenever FPS look is active (lights on, not zoomed into a photo)
    useEffect(() => {
        const isPhotoZoom = cameraTarget === 'photo'
        const isIntro = cameraTarget === 'intro' || cameraTarget === 'entering'
        const shouldShow = lightsOn && !isPhotoZoom && !isIntro
        setVisible(shouldShow)
    }, [cameraTarget, lightsOn])

    if (!visible) return null

    return (
        <div className="viewfinder">
            {/* Corner brackets */}
            <div className="viewfinder-corner top-left" />
            <div className="viewfinder-corner top-right" />
            <div className="viewfinder-corner bottom-left" />
            <div className="viewfinder-corner bottom-right" />

            {/* Center crosshair */}
            <div className="viewfinder-crosshair">
                <div className="crosshair-h" />
                <div className="crosshair-v" />
            </div>
        </div>
    )
}

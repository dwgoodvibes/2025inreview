// src/components/Viewfinder.jsx
// Visual indicator showing where the camera will zoom

import { useEffect, useState } from 'react'
import useStore from '../hooks/useStore'
import './Viewfinder.css'

export default function Viewfinder() {
    // Viewfinder disabled
    return null

    return (
        <div className="viewfinder">
            {/* Corner brackets */}
            <div className="viewfinder-corner top-left" />
            <div className="viewfinder-corner top-right" />
            <div className="viewfinder-corner bottom-left" />
            <div className="viewfinder-corner bottom-right" />


        </div>
    )
}

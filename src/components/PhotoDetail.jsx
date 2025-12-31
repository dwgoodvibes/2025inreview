// src/components/PhotoDetail.jsx
import { Html } from '@react-three/drei'
import useStore from '../hooks/useStore'

export default function PhotoDetail() {
    const currentPhoto = useStore(state => state.currentPhoto)
    const clearPhoto = useStore(state => state.clearPhoto)
    const cameraTarget = useStore(state => state.cameraTarget)

    if (!currentPhoto || cameraTarget !== 'photo') return null

    return (
        <Html fullscreen>
            <div
                className="photo-detail-overlay"
                style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '2rem',
                    background: 'linear-gradient(transparent 60%, rgba(10, 5, 5, 0.8) 100%)',
                    pointerEvents: 'none', // Allow clicks to pass through to 3D scene
                    zIndex: 50,
                    animation: 'fadeIn 0.5s ease'
                }}
            >
                {/* Metadata text removed as per user request */}

                {/* Navigation text removed */}
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
        </Html>
    )
}

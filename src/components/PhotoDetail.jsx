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

                <button
                    className="back-button"
                    onClick={clearPhoto}
                    style={{
                        position: 'fixed',
                        top: '2rem',
                        left: '2rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#ff5e00',
                        fontFamily: 'Georgia, serif',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        padding: '0.5rem 1rem',
                        transition: 'opacity 0.3s ease',
                        letterSpacing: '0.05em',
                        pointerEvents: 'auto' // Re-enable clicks for the button
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = 0.7}
                    onMouseLeave={(e) => e.target.style.opacity = 1}
                >
                    ← Back to sheet
                </button>

                <p
                    style={{
                        position: 'fixed',
                        top: '2rem',
                        right: '2rem',
                        color: 'rgba(255, 94, 0, 0.5)',
                        fontFamily: 'Georgia, serif',
                        fontSize: '0.75rem'
                    }}
                >
                    Press ESC to return
                </p>
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

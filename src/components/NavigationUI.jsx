// src/components/NavigationUI.jsx
import { Html } from '@react-three/drei'
import useStore from '../hooks/useStore'

export default function NavigationUI() {
    const currentTray = useStore(state => state.currentTray)
    const sheets = useStore(state => state.sheets)
    const cameraTarget = useStore(state => state.cameraTarget)
    const lightsOn = useStore(state => state.lightsOn)
    const introComplete = useStore(state => state.introComplete)
    const setCurrentTray = useStore(state => state.setCurrentTray)

    // Hide during intro, before lights, or during photo zoom
    if (!lightsOn || !introComplete || cameraTarget === 'photo' || cameraTarget === 'intro' || cameraTarget === 'entering') {
        return null
    }

    return (
        <Html fullscreen style={{ pointerEvents: 'none' }}>
            {/* Navigation dots */}
            <nav
                className="tray-navigation"
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '1.5rem',
                    zIndex: 50,
                    pointerEvents: 'auto'  // Only nav dots receive clicks
                }}
            >
                {sheets.map((sheet, i) => (
                    <button
                        key={sheet.id}
                        className={`nav-dot ${i === currentTray ? 'active' : ''}`}
                        onClick={() => setCurrentTray(i)}
                        style={{
                            position: 'relative',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: i === currentTray ? '#ff5e00' : 'rgba(255, 94, 0, 0.3)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: i === currentTray ? '0 0 15px rgba(255, 94, 0, 0.6)' : 'none'
                        }}
                    >
                        <span
                            className="nav-label"
                            style={{
                                position: 'absolute',
                                bottom: '1.5rem',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                whiteSpace: 'nowrap',
                                color: i === currentTray ? '#ff5e00' : 'rgba(255, 94, 0, 0.5)',
                                fontFamily: 'Georgia, serif',
                                fontSize: '0.75rem',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                opacity: i === currentTray ? 1 : 0,
                                transition: 'opacity 0.3s ease'
                            }}
                        >
                            {sheet.category}
                        </span>
                    </button>
                ))}
            </nav>


        </Html>
    )
}

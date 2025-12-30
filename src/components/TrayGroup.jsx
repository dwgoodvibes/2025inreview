// src/components/TrayGroup.jsx
import Tray from './Tray'
import useStore from '../hooks/useStore'

export default function TrayGroup() {
    const sheets = useStore(state => state.sheets)
    const currentTray = useStore(state => state.currentTray)

    // Get the current sheet data based on navigation
    const currentSheet = sheets[currentTray]

    // Single tray position - centered on desk
    const trayPosition = [0, 0.85, 0] // Height of sink surface

    return (
        <group position={trayPosition}>
            <Tray
                index={currentTray}
                position={[0, 0, 0]}
                sheetTexture={currentSheet.texture}
                category={currentSheet.category}
            />
        </group>
    )
}

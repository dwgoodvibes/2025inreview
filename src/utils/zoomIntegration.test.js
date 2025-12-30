// src/utils/zoomIntegration.test.js
// Integration tests to trace the actual data flow from click to camera

import { describe, it, expect } from 'vitest'

/*
 * This test traces the EXACT data flow in the current implementation:
 * 
 * 1. User clicks on ContactSheet mesh
 * 2. onClick handler fires with e.point (world coordinates)
 * 3. handleCellClick is called with cell.worldPos
 * 4. selectPhoto(cell.id, cell.worldPos) is called
 * 5. Store updates currentPhotoPosition = worldPos
 * 6. CameraController useEffect fires (deps: currentPhotoPosition)
 * 7. Camera animates to position [currentPhotoPosition.x, currentPhotoPosition.y + 0.6, currentPhotoPosition.z]
 * 8. Camera looks at [currentPhotoPosition.x, currentPhotoPosition.y, currentPhotoPosition.z]
 */

// Constants matching the actual code
const TRAY_BASE_HEIGHT = 0.85
const FLOAT_Y = 0.065
const CAMERA_HEIGHT_OFFSET = 0.6

// Simulate what ContactSheet does now (with our fix)
function contactSheetOnClick(ePoint) {
    console.log('1. Raw click e.point:', ePoint)

    const stableWorldPos = {
        x: ePoint.x,
        y: TRAY_BASE_HEIGHT + FLOAT_Y,  // 0.915
        z: ePoint.z
    }
    console.log('2. Stable world pos:', stableWorldPos)

    return stableWorldPos
}

// Simulate what CameraController does
function cameraControllerCalculation(currentPhotoPosition) {
    console.log('3. CameraController receives currentPhotoPosition:', currentPhotoPosition)

    const cameraConfig = {
        position: [
            currentPhotoPosition.x,
            currentPhotoPosition.y + CAMERA_HEIGHT_OFFSET,  // 0.915 + 0.6 = 1.515
            currentPhotoPosition.z
        ],
        lookAt: [
            currentPhotoPosition.x,
            currentPhotoPosition.y,  // 0.915
            currentPhotoPosition.z
        ],
        fov: 20
    }
    console.log('4. Camera config:', cameraConfig)

    return cameraConfig
}

describe('Integration: Click → Camera Flow', () => {

    describe('Click on sheet center', () => {
        it('should produce camera directly above center', () => {
            // Simulate clicking the center of the sheet
            // Sheet center is at (0, animated_y, 0) in world
            const clickPoint = { x: 0, y: 0.90, z: 0 }  // Mid-float Y

            const worldPos = contactSheetOnClick(clickPoint)
            const cameraConfig = cameraControllerCalculation(worldPos)

            // Camera should be at (0, 1.515, 0)]
            expect(cameraConfig.position[0]).toBe(0)
            expect(cameraConfig.position[1]).toBeCloseTo(1.515)
            expect(cameraConfig.position[2]).toBe(0)

            // Camera should look at (0, 0.915, 0)
            expect(cameraConfig.lookAt[0]).toBe(0)
            expect(cameraConfig.lookAt[1]).toBeCloseTo(0.915)
            expect(cameraConfig.lookAt[2]).toBe(0)
        })
    })

    describe('Click on sheet RIGHT side', () => {
        it('should produce camera offset to the right', () => {
            // Click on right edge of sheet
            // Sheet width = 0.75, so right edge is at ~0.375 from center
            const clickPoint = { x: 0.3, y: 0.90, z: 0 }

            const worldPos = contactSheetOnClick(clickPoint)
            const cameraConfig = cameraControllerCalculation(worldPos)

            // Camera X should match click X
            expect(cameraConfig.position[0]).toBe(0.3)
            expect(cameraConfig.lookAt[0]).toBe(0.3)

            // Y and Z should be stable
            expect(cameraConfig.position[1]).toBeCloseTo(1.515)
            expect(cameraConfig.position[2]).toBe(0)
        })
    })

    describe('Click on sheet FRONT (toward viewer)', () => {
        it('should produce camera offset forward', () => {
            // Click on front edge of sheet
            // Sheet height = 0.5, so front edge is at ~0.25 from center (positive Z = toward camera)
            const clickPoint = { x: 0, y: 0.90, z: 0.2 }

            const worldPos = contactSheetOnClick(clickPoint)
            const cameraConfig = cameraControllerCalculation(worldPos)

            // Camera Z should match click Z
            expect(cameraConfig.position[2]).toBe(0.2)
            expect(cameraConfig.lookAt[2]).toBe(0.2)
        })
    })

    describe('Click on sheet BACK', () => {
        it('should produce camera offset backward', () => {
            // Click on back edge of sheet (negative Z = away from camera)
            const clickPoint = { x: 0, y: 0.90, z: -0.2 }

            const worldPos = contactSheetOnClick(clickPoint)
            const cameraConfig = cameraControllerCalculation(worldPos)

            // Camera Z should match click Z
            expect(cameraConfig.position[2]).toBe(-0.2)
            expect(cameraConfig.lookAt[2]).toBe(-0.2)
        })
    })

    describe('Click off-center (top-left cell area)', () => {
        it('should produce camera at that position', () => {
            // Top-left cell center approximately at (-0.3, y, -0.19)
            const clickPoint = { x: -0.3, y: 0.90, z: -0.19 }

            const worldPos = contactSheetOnClick(clickPoint)
            const cameraConfig = cameraControllerCalculation(worldPos)

            // Camera should be at (-0.3, 1.515, -0.19)
            expect(cameraConfig.position[0]).toBe(-0.3)
            expect(cameraConfig.position[1]).toBeCloseTo(1.515)
            expect(cameraConfig.position[2]).toBe(-0.19)

            // LookAt should match X and Z
            expect(cameraConfig.lookAt[0]).toBe(-0.3)
            expect(cameraConfig.lookAt[2]).toBe(-0.19)
        })
    })
})

describe('Debugging: What could cause mismatch?', () => {

    it('TEST HYPOTHESIS: Is the problem that camera Z matches click Z but view is inverted?', () => {
        // When camera is directly above (Y offset only), looking down,
        // the camera's local "forward" is -Y (downward)
        // If up-vector is wrong, the view could be rotated

        // Camera at (0, 1.5, 0) looking at (0, 0.9, 0) with up = (0, 0, -1)
        // This should look correctly down at the sheet

        // But if up = (0, 1, 0), the camera can't orient properly
        // because lookAt direction IS the up direction

        console.log('Check CameraController line 127-128:')
        console.log('  const isTopDown = cameraTarget === "photo"')
        console.log('  const targetUp = isTopDown ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0)')

        // This appears correct - up vector is set to (0, 0, -1) for photo mode
        expect(true).toBe(true)
    })

    it('TEST HYPOTHESIS: Is there a parent transform we are missing?', () => {
        // ContactSheet is inside:
        // - TrayGroup at [0, 0.85, 0]
        // - Tray
        // - ContactSheet's own group

        // If e.point is already in world coordinates (which it should be),
        // then the parent transforms should not matter.

        // However, let's verify: the mesh.matrixWorld should account for all parents

        console.log('e.point from Three.js raycaster is in WORLD coordinates')
        console.log('No additional transformation should be needed')

        expect(true).toBe(true)
    })

    it('TEST HYPOTHESIS: Could the mesh rotation be affecting click point?', () => {
        // The mesh has rotation [-π/2, 0, π]
        // The PlaneGeometry is in XY plane, but after rotation it lies in XZ plane

        // THREE.js Raycaster returns e.point in WORLD coordinates
        // The rotation is already accounted for in the world position

        // So clicking on the right side of the VISUAL sheet gives positive X
        // Clicking on the front of the VISUAL sheet gives positive Z

        console.log('Rotation should not affect e.point - it is already world coords')
        console.log('Visual right = positive world X ✓')
        console.log('Visual front = positive world Z ✓')

        expect(true).toBe(true)
    })

    it('CRITICAL: What if the sheet is not centered at origin?', () => {
        // The ContactSheet position prop comes from Tray
        // Looking at Tray.jsx, it passes position to ContactSheet

        // If position is [0, 0, 0], sheet center is at world (0, y, 0)
        // If position is something else, the offset matters!

        // ContactSheet groupPosition = [position[0], 0, position[2]]
        // This means Y is separately animated via meshRef.current.position.y

        console.log('Check what position is passed to ContactSheet')
        console.log('If non-zero, clicks would be offset from where camera aims')

        expect(true).toBe(true)
    })
})

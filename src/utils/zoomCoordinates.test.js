// src/utils/zoomCoordinates.test.js
import { describe, it, expect } from 'vitest'
import {
    calculateZoomTarget,
    calculateCameraPosition,
    localToWorld,
    worldToLocal,
    getCellFromUV,
    getCellCenterLocal,
    TRAY_BASE_HEIGHT,
    FLOAT_Y,
    SHEET_WIDTH,
    SHEET_HEIGHT,
    GRID_COLS,
    GRID_ROWS,
    CAMERA_HEIGHT_OFFSET
} from './zoomCoordinates.js'

describe('Zoom Coordinate Transformations', () => {

    describe('calculateZoomTarget', () => {
        it('should use stable float height for Y coordinate', () => {
            const clickPoint = { x: 0.1, y: 0.9, z: -0.05 }  // Arbitrary click
            const result = calculateZoomTarget(clickPoint)

            // Y should be the known float height, NOT the click Y
            expect(result.y).toBe(TRAY_BASE_HEIGHT + FLOAT_Y)
            expect(result.y).toBeCloseTo(0.915)  // 0.85 + 0.065

            // X and Z should pass through unchanged
            expect(result.x).toBe(clickPoint.x)
            expect(result.z).toBe(clickPoint.z)
        })

        it('should ignore the animated click Y value', () => {
            // Even if click Y is wildly different, we use stable height
            const submergedClick = { x: 0, y: 0.86, z: 0 }  // Sheet deep
            const floatingClick = { x: 0, y: 0.92, z: 0 }   // Sheet high

            const result1 = calculateZoomTarget(submergedClick)
            const result2 = calculateZoomTarget(floatingClick)

            // Both should have the same stable Y
            expect(result1.y).toBe(result2.y)
        })
    })

    describe('calculateCameraPosition', () => {
        it('should position camera above target by fixed offset', () => {
            const target = { x: 0.1, y: 0.915, z: -0.05 }
            const result = calculateCameraPosition(target)

            expect(result.x).toBe(target.x)
            expect(result.y).toBe(target.y + CAMERA_HEIGHT_OFFSET)
            expect(result.z).toBe(target.z)
        })

        it('should produce correct camera for centered target', () => {
            const centerTarget = { x: 0, y: TRAY_BASE_HEIGHT + FLOAT_Y, z: 0 }
            const result = calculateCameraPosition(centerTarget)

            expect(result.x).toBe(0)
            expect(result.y).toBeCloseTo(1.515)  // 0.915 + 0.6
            expect(result.z).toBe(0)
        })
    })

    describe('Mesh rotation transformation', () => {
        // The mesh has rotation: [-Math.PI/2, 0, Math.PI]
        // This rotates the XY plane to lie flat with normal pointing up

        it('should transform local center to world center', () => {
            const localCenter = { x: 0, y: 0 }
            const meshWorldY = 0.915
            const world = localToWorld(localCenter, meshWorldY)

            expect(world.x).toBe(0)
            expect(world.y).toBe(meshWorldY)
            expect(world.z).toBe(0)
        })

        it('should correctly map local X to world -X', () => {
            const local = { x: 0.1, y: 0 }
            const world = localToWorld(local, 0.915)

            // Local +X becomes World -X
            expect(world.x).toBe(-0.1)
            expect(world.z).toBe(0)
        })

        it('should correctly map local Y to world Z', () => {
            const local = { x: 0, y: 0.1 }
            const world = localToWorld(local, 0.915)

            // Local +Y becomes World +Z
            expect(world.x).toBe(0)
            expect(world.z).toBe(0.1)
        })

        it('should be invertible via worldToLocal', () => {
            const originalLocal = { x: 0.15, y: -0.08 }
            const meshY = 0.915

            const world = localToWorld(originalLocal, meshY)
            const backToLocal = worldToLocal(world, meshY)

            expect(backToLocal.x).toBeCloseTo(originalLocal.x)
            expect(backToLocal.y).toBeCloseTo(originalLocal.y)
        })
    })

    describe('Cell calculations', () => {
        it('should identify cell 0 at top-left UV', () => {
            const cell = getCellFromUV(0.05, 0.05)  // Near top-left
            expect(cell.col).toBe(0)
            expect(cell.row).toBe(0)
            expect(cell.index).toBe(0)
        })

        it('should identify last cell at bottom-right UV', () => {
            const cell = getCellFromUV(0.95, 0.95)  // Near bottom-right
            expect(cell.col).toBe(5)  // Last column
            expect(cell.row).toBe(3)  // Last row
            expect(cell.index).toBe(23)  // 3 * 6 + 5 = 23
        })

        it('should get correct cell center coordinates', () => {
            const center = getCellCenterLocal(0, 0)  // First cell

            // Cell width = 0.75 / 6 = 0.125
            // Cell height = 0.5 / 4 = 0.125
            // First cell center: (0.5 * 0.125 - 0.375, 0.5 * 0.125 - 0.25)
            expect(center.x).toBeCloseTo(-0.3125)
            expect(center.y).toBeCloseTo(-0.1875)
        })
    })

    describe('Full transformation chain', () => {
        it('should correctly transform a click to camera target', () => {
            // Simulate clicking on the center of the sheet
            const clickPoint = { x: 0, y: 0.91, z: 0 }  // World coords

            const zoomTarget = calculateZoomTarget(clickPoint)
            const cameraPos = calculateCameraPosition(zoomTarget)

            // Camera should be centered above
            expect(cameraPos.x).toBe(0)
            expect(cameraPos.z).toBe(0)
            expect(cameraPos.y).toBeGreaterThan(zoomTarget.y)
        })

        it('should correctly transform a click on right side of sheet', () => {
            // Click on right edge of sheet (world X = positive due to rotation flip)
            const rightEdgeClick = { x: 0.3, y: 0.91, z: 0 }

            const zoomTarget = calculateZoomTarget(rightEdgeClick)
            const cameraPos = calculateCameraPosition(zoomTarget)

            // Camera X should match click X (rightward)
            expect(cameraPos.x).toBe(0.3)
            expect(zoomTarget.x).toBe(0.3)
        })

        it('should correctly transform a click on front of sheet', () => {
            // Click on front edge (positive Z in world = toward viewer)
            const frontClick = { x: 0, y: 0.91, z: 0.2 }

            const zoomTarget = calculateZoomTarget(frontClick)
            const cameraPos = calculateCameraPosition(zoomTarget)

            // Camera Z should match click Z
            expect(cameraPos.z).toBe(0.2)
            expect(zoomTarget.z).toBe(0.2)
        })
    })
})

describe('Current implementation analysis', () => {
    // These tests analyze what the CURRENT code does vs what it should do

    it('demonstrates the original bug: using click Y directly', () => {
        // Old code: { x: e.point.x, y: e.point.y, z: e.point.z }
        const clickWhenSubmerged = { x: 0.1, y: 0.865, z: -0.05 }  // DEEP_Y = 0.015
        const clickWhenFloating = { x: 0.1, y: 0.915, z: -0.05 }   // FLOAT_Y = 0.065

        // OLD: Camera would use these directly, causing 0.05 unit difference
        const oldCamY_submerged = clickWhenSubmerged.y + 0.6  // 1.465
        const oldCamY_floating = clickWhenFloating.y + 0.6    // 1.515

        expect(oldCamY_submerged).not.toBe(oldCamY_floating)
        expect(oldCamY_floating - oldCamY_submerged).toBeCloseTo(0.05)

        // NEW: Both should give same stable Y
        const newTarget1 = calculateZoomTarget(clickWhenSubmerged)
        const newTarget2 = calculateZoomTarget(clickWhenFloating)

        expect(newTarget1.y).toBe(newTarget2.y)
    })
})

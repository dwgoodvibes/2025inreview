// src/utils/zoomCoordinates.js
// Extracted coordinate transformation logic for testing and reuse

// Constants from ContactSheet.jsx
export const GRID_COLS = 6
export const GRID_ROWS = 4
export const SHEET_WIDTH = 0.75
export const SHEET_HEIGHT = 0.5
export const CELL_WIDTH = SHEET_WIDTH / GRID_COLS
export const CELL_HEIGHT = SHEET_HEIGHT / GRID_ROWS

// Height constants
export const TRAY_BASE_HEIGHT = 0.85
export const SURFACE_Y = 0.045
export const FLOAT_Y = 0.065
export const DEEP_Y = 0.015

// Camera configuration  
export const CAMERA_HEIGHT_OFFSET = 0.6
export const ZOOM_FOV = 20

/**
 * The contact sheet mesh hierarchy:
 * 
 * TrayGroup (position: [0, 0.85, 0])
 *   └── Tray
 *       └── ContactSheet (position: [position[0], 0, position[2]])
 *           └── Group (position: [0, animated_y, 0])
 *               └── Mesh (rotation: [-π/2, 0, π])
 *                   └── PlaneGeometry (local XY plane)
 *
 * The PlaneGeometry is in local XY space, but after rotation:
 * - Local X → World -X (due to π Z rotation)  
 * - Local Y → World -Z (due to -π/2 X rotation + π Z rotation)
 * - Local Z → World Y (normal to plane)
 */

/**
 * Calculates the stable world position for camera targeting
 * from a click point on the contact sheet.
 * 
 * @param {Object} clickPoint - The e.point from Three.js raycaster (world coords)
 * @param {Object} options - Configuration options
 * @returns {Object} Stable world position {x, y, z}
 */
export function calculateZoomTarget(clickPoint, options = {}) {
    const {
        trayBaseHeight = TRAY_BASE_HEIGHT,
        floatY = FLOAT_Y
    } = options

    // The click X and Z are correct in world space
    // But Y depends on the animation state, so we use known float height
    return {
        x: clickPoint.x,
        y: trayBaseHeight + floatY,
        z: clickPoint.z
    }
}

/**
 * Calculates camera position for zooming to a target
 * 
 * @param {Object} target - Target position {x, y, z}
 * @param {Object} options - Camera configuration
 * @returns {Object} Camera position {x, y, z}
 */
export function calculateCameraPosition(target, options = {}) {
    const {
        heightOffset = CAMERA_HEIGHT_OFFSET
    } = options

    return {
        x: target.x,
        y: target.y + heightOffset,
        z: target.z
    }
}

/**
 * Debug: Logs the transformation chain from click to camera.
 * Use this to trace coordinate flow in the console.
 */
export function debugCoordinateChain(clickPoint, sheetGroupPosition = [0, 0, 0]) {
    console.log('=== Coordinate Debug Chain ===')
    console.log('1. Raw click point (world):', clickPoint)
    console.log('2. Sheet group position:', sheetGroupPosition)

    const zoomTarget = calculateZoomTarget(clickPoint)
    console.log('3. Zoom target (stable Y):', zoomTarget)

    const cameraPos = calculateCameraPosition(zoomTarget)
    console.log('4. Camera position:', cameraPos)

    console.log('5. Expected view: Camera at', cameraPos, 'looking at', zoomTarget)

    return { clickPoint, zoomTarget, cameraPos }
}

/**
 * Simulates what the mesh rotation does to local coordinates
 * Rotation is: [-Math.PI / 2, 0, Math.PI]
 * 
 * This means:
 * 1. Rotate -90° around X axis (Y becomes -Z, Z becomes Y)
 * 2. Rotate 180° around Z axis (X becomes -X, Y becomes -Y)
 * 
 * Combined: local X → -X, local Y → Z, local Z → Y
 */
export function localToWorld(localPoint, meshWorldY) {
    // After rotation [-π/2, 0, π]:
    // The plane lies flat. Local X maps to -World X, Local Y maps to World Z
    return {
        x: -localPoint.x,
        y: meshWorldY,  // The mesh's world Y position (animated)
        z: localPoint.y
    }
}

/**
 * Inverse: Convert world click point to local sheet coordinates
 */
export function worldToLocal(worldPoint, meshWorldY) {
    return {
        x: -worldPoint.x,
        y: worldPoint.z,
        z: 0  // Flat plane, no depth
    }
}

/**
 * Get cell index from normalized UV coordinates (0-1 range)
 */
export function getCellFromUV(u, v) {
    const col = Math.floor(u * GRID_COLS)
    const row = Math.floor(v * GRID_ROWS)
    const index = row * GRID_COLS + col

    return {
        col: Math.min(col, GRID_COLS - 1),
        row: Math.min(row, GRID_ROWS - 1),
        index: Math.min(index, GRID_COLS * GRID_ROWS - 1)
    }
}

/**
 * Get cell center in local sheet coordinates
 */
export function getCellCenterLocal(col, row) {
    const cellCenterX = (col + 0.5) * CELL_WIDTH - SHEET_WIDTH / 2
    const cellCenterY = (row + 0.5) * CELL_HEIGHT - SHEET_HEIGHT / 2

    return { x: cellCenterX, y: cellCenterY }
}

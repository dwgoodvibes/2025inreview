// src/hooks/useStore.js
import { create } from 'zustand'

// Single tray position - centered on desk
const TRAY_POSITION = [0, 0.85, 0]

// Initial state for reset functionality
const initialState = {
    isLoaded: false,
    lightsOn: false,
    isFlickering: false,
    introComplete: false,
    currentTray: 1,
    currentPhoto: null,
    currentPhotoPosition: null,
    cameraTarget: 'intro'
}

// Calculate world position for a photo in the irregular contact sheet grid
function getPhotoWorldPosition(photoIndex) {
    // Grid Constants matching the new layout
    const GRID_COLS = 3
    const GRID_ROWS = 4

    // Sheet Dimensions (Approx standard 8x10 or A4 proportion)
    // We'll fine tune these to match the ContactSheet mesh size
    const SHEET_WIDTH = 0.85
    const SHEET_HEIGHT = 0.75

    const cellWidth = SHEET_WIDTH / GRID_COLS
    const cellHeight = SHEET_HEIGHT / GRID_ROWS

    let col, row

    // Logic for 3-3-2-2 Layout
    if (photoIndex < 3) {
        // Row 0: 3 photos
        row = 0
        col = photoIndex
    } else if (photoIndex < 6) {
        // Row 1: 3 photos
        row = 1
        col = photoIndex - 3
    } else if (photoIndex < 8) {
        // Row 2: 2 photos
        row = 2
        col = photoIndex - 6
    } else {
        // Row 3: 2 photos
        row = 3
        col = photoIndex - 8
    }

    // Calculate offset from center of sheet
    // Standard centered grid logic applies to columns
    // We shift X based on (col - totalCols/2 + 0.5)

    // However, for the left-aligned rows (2 and 3), are they visually centered or left aligned?
    // "Left aligned" in a grid usually means they occupy column 0 and 1.
    // Our col calculation above (0, 1) puts them in the first two slots.

    const offsetX = (col - GRID_COLS / 2 + 0.5) * cellWidth
    // Add margin offset (0.02) to adjust for visual header shifting photos down
    const offsetZ = (row - GRID_ROWS / 2 + 0.5) * cellHeight + 0.04

    return {
        x: TRAY_POSITION[0] + offsetX,
        y: TRAY_POSITION[1] + 0.04, // Match floating height (0.038) + tiny buffer
        z: TRAY_POSITION[2] + offsetZ
    }
}

const useStore = create((set, get) => ({
    // Scene state
    isLoaded: false,
    lightsOn: false,
    isFlickering: false,

    // Photo grid data
    sheets: [
        {
            id: 0,
            category: 'China',
            texture: 'sheets/china.webp',
            photos: Array.from({ length: 10 }, (_, i) => ({
                id: i,
                title: `China Memory ${i + 1}`,
                date: '2024',
                description: 'Adventures in China.'
            }))
        },
        {
            id: 1,
            category: 'Wedding',
            texture: 'sheets/wedding.webp',
            photos: Array.from({ length: 10 }, (_, i) => ({
                id: i,
                title: `Wedding Moment ${i + 1}`,
                date: '2024',
                description: 'Beautiful wedding memories.'
            }))
        },
        {
            id: 2,
            category: 'Europe',
            texture: 'sheets/europe.webp',
            photos: Array.from({ length: 10 }, (_, i) => ({
                id: i,
                title: `Europe Adventure ${i + 1}`,
                date: '2024',
                description: 'Exploring Europe.'
            }))
        },
        {
            id: 3,
            category: 'Family',
            texture: 'sheets/family.webp',
            photos: Array.from({ length: 10 }, (_, i) => ({
                id: i,
                title: `Family Moment ${i + 1}`,
                date: '2024',
                description: 'Precious family memories.'
            }))
        }
    ],

    // Active content
    currentTray: 1, // Start with middle tray
    currentPhoto: null,
    currentPhotoPosition: null,

    // Camera targets
    cameraTarget: 'intro',

    // Actions
    setLoaded: () => set({ isLoaded: true }),

    setLightsOn: (value) => set({ lightsOn: value }),

    // Intro state
    introComplete: false,
    setIntroComplete: (value) => set({ introComplete: value }),

    flickerLights: async () => {
        set({ isFlickering: true })

        // Simulate flicker duration
        await new Promise(r => setTimeout(r, 800))

        set({ isFlickering: false, lightsOn: true })
    },

    setCurrentTray: (index) => set({ currentTray: index }),

    selectPhoto: (photoIndex, zoomTarget = null) => set(state => {
        const sheet = state.sheets[state.currentTray]
        const photo = sheet?.photos?.[photoIndex] || null

        // Use provided target (click point) OR calculate standard position
        const position = zoomTarget ?
            { x: zoomTarget.x, y: zoomTarget.y, z: zoomTarget.z } :
            getPhotoWorldPosition(photoIndex)

        return {
            currentPhoto: photo,
            currentPhotoPosition: position,
            cameraTarget: 'photo'
        }
    }),

    clearPhoto: () => set({
        currentPhoto: null,
        currentPhotoPosition: null,
        cameraTarget: 'overview'
    }),

    setCameraTarget: (target) => set({ cameraTarget: target }),

    // Reset intro state - called on page load
    resetIntro: () => set({
        lightsOn: false,
        isFlickering: false,
        introComplete: false,
        cameraTarget: 'intro'
    })
}))

// Reset intro on HMR or page load for development
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        useStore.getState().resetIntro()
    })
}

export default useStore

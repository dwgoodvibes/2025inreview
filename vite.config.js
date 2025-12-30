import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    assetsInclude: ['**/*.glb'],
    base: './', // Ensures assets load correctly if hosted in a subdirectory
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    assetsInclude: ['**/*.glb'],
    base: '/2025inreview/', // Matches repository name for GitHub Pages
})

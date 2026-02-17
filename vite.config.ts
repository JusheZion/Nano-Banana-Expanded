import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '/Users/apoaaron/.gemini/Antigravity/Nano Banana Expanded',
  build: {
    outDir: '../dist',
  }
})

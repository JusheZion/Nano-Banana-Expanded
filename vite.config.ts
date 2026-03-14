import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      '28da55332603f5.lhr.life/',  // exact tunnel domain
      '.lhr.life'                  // optional: wildcard for any *.lhr.life
    ],
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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

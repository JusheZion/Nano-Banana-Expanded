import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [react(), cloudflare()],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [...configDefaults.exclude, '.worktrees/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.split(path.sep).join('/');
          if (normalizedId.includes('/node_modules/konva/') || normalizedId.includes('/node_modules/react-konva/')) return 'comic-renderer';
          if (normalizedId.includes('/node_modules/jspdf/')) return 'pdf-export';
          return undefined;
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: [
      '28da55332603f5.lhr.life/',  // exact tunnel domain
      '.lhr.life'                  // optional: wildcard for any *.lhr.life
    ],
  },
})

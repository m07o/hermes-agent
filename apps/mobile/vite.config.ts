import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const configDir = fileURLToPath(new URL('.', import.meta.url))

// Hermes Mobile — Vite config.
//
// Port 5177 keeps us out of the way of the other TS workspaces:
//   web                5173 (vite default)
//   apps/desktop       5174
//   apps/bootstrap-installer 5175 (+5176 HMR)
//
// `build.outDir: 'dist'` is Capacitor's `webDir`; `cap sync android` copies it
// into android/app/src/main/assets/public (git-ignored, regenerated on build).

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(configDir, './src')
    }
  },
  clearScreen: false,
  server: {
    port: 5177,
    strictPort: true,
    host: '127.0.0.1'
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true
  }
})

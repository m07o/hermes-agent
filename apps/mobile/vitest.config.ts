import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const configDir = fileURLToPath(new URL('.', import.meta.url))

// The shell's *logic* (URL parsing, status parsing, the saved-server store) is
// platform-independent and runs in node; the DOM/Capacitor wiring around it is
// thin enough to review by eye. Keep it that way: new behaviour goes in
// src/lib/ with a colocated *.test.ts.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(configDir, './src')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 15_000
  }
})

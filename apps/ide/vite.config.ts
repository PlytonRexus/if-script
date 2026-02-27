import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['if-script-core', 'showdown']
  },
  resolve: {
    alias: [
      {
        find: /NodeFileAdapter\.mjs$/,
        replacement: 'BrowserFileAdapter.mjs'
      }
    ]
  },
  base: './',
  worker: {
    format: 'es'
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts']
  },
  build: {
    sourcemap: true,
    target: 'es2022'
  }
})

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
  base: process.env.GITHUB_PAGES ? '/if-script/' : './',
  worker: {
    format: 'es'
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['./src/tests/**/*.test.ts', './src/tests/**/*.test.tsx']
  },
  build: {
    sourcemap: true,
    target: 'es2022'
  }
})

import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'frontend',
  build: {
    outDir: '../frontend-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'frontend/index.html'),
        editor: resolve(__dirname, 'frontend/editor.html'),
        error: resolve(__dirname, 'frontend/error.jl.html')
      }
    }
  },
  server: {
    port: 1234,
    open: true
  }
})
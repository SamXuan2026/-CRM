import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const EXTERNAL_HOST = '172.16.1.32'
const DEV_HOST = '0.0.0.0'
const BACKEND_URL = 'http://127.0.0.1:5006'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: DEV_HOST,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/health': {
        target: BACKEND_URL,
        changeOrigin: true,
      }
    },
    middlewareMode: false,
  },
  preview: {
    host: DEV_HOST,
    port: 4173,
  },
  define: {
    __EXTERNAL_HOST__: JSON.stringify(EXTERNAL_HOST),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})

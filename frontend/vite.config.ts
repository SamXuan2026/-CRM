import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const externalHost = env.CRM_PUBLIC_HOST || '172.16.1.32'
  const devHost = env.CRM_DEV_HOST || '0.0.0.0'
  const backendPort = env.CRM_BACKEND_PORT || '5006'
  const frontendPort = Number(env.CRM_FRONTEND_PORT || '3000')
  const backendUrl = env.VITE_BACKEND_URL || `http://127.0.0.1:${backendPort}`

  return {
    plugins: [react()],
    server: {
      port: frontendPort,
      host: devHost,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path,
        },
        '/health': {
          target: backendUrl,
          changeOrigin: true,
        }
      },
      middlewareMode: false,
    },
    preview: {
      host: devHost,
      port: 4173,
    },
    define: {
      __EXTERNAL_HOST__: JSON.stringify(externalHost),
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined
            }

            if (id.includes('@chakra-ui') || id.includes('@emotion') || id.includes('framer-motion')) {
              return 'chakra-vendor'
            }

            if (id.includes('react-router-dom')) {
              return 'router-vendor'
            }

            if (id.includes('react-icons')) {
              return 'icons-vendor'
            }

            return 'vendor'
          },
        },
      },
    },
  }
})

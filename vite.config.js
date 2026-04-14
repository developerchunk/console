import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.VITE_API_BASE_URL = env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL
  const apiTarget = process.env.VITE_API_BASE_URL || 'https://api.ketoy.dev'
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Local proxy avoids browser CORS issues against remote APIs.
      proxy: {
        '/__api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/__api/, '')
        }
      }
    }
  }
})

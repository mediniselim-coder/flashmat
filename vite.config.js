import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.VERCEL_DEPLOYMENT_ID
  || `local-${Date.now()}`

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-router')) return 'router'
          if (id.includes('@supabase')) return 'supabase'
          return 'vendor'
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
})

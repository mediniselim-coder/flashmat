import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.VERCEL_DEPLOYMENT_ID
  || `local-${Date.now()}`

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
})

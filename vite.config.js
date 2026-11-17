import { defineConfig } from 'vite'

// Build label shown small on the class-code screen and Teacher Dashboard, so you can tell which
// version a browser is running. Vercel provides the commit; local builds say "local".
const sha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || 'local'
const built = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

export default defineConfig({
  root: '.',
  define: {
    __BUILD_ID__: JSON.stringify(`${sha} · ${built}`),
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes asset paths relative, so the build works at any subpath
// (e.g. username.github.io/repo-name/) without configuration changes.
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})

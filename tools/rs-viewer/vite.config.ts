import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  plugins: [react(), glsl()],
  server: {
    proxy: {
      '/api/openrs2': {
        target: 'https://archive.openrs2.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openrs2/, ''),
      },
    },
  },
})

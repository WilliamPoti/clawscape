import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    fs: {
      allow: ['..']
    }
  },
  resolve: {
    alias: {
      '@clawscape/shared': path.resolve(__dirname, '../shared/src')
    }
  },
  publicDir: 'public'
});

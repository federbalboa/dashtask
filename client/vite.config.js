import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En GitHub Codespaces el preview se sirve por HTTPS a través de un proxy:
// el HMR debe usar wss:443 y el servidor escuchar en todas las interfaces.
const inCodespaces = !!process.env.CODESPACES;

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    open: false,
    ...(inCodespaces ? { hmr: { protocol: 'wss', clientPort: 443 } } : {}),
    proxy: {
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true,
      },
    },
  },
});

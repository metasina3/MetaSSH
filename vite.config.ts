import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
      overlay: true,
    },
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**', '**/dist/**', '**/dist-electron/**'],
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});


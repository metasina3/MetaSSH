import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: '../dist-electron',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'main.ts'),
        preload: resolve(__dirname, 'preload.ts'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },
});


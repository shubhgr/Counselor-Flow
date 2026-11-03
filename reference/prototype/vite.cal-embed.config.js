import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    emptyOutDir: false,
    outDir: 'js',
    lib: {
      entry: 'js/cal-onboard-embed.jsx',
      name: 'GradRightCalOnboard',
      formats: ['es'],
      fileName: () => 'cal-onboard-embed.bundle.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'cal-onboard-embed[extname]',
      },
    },
  },
});

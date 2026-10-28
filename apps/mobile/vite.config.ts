import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the build works from file:// inside a Capacitor WebView and from any static host
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', chunkSizeWarningLimit: 800 },
});

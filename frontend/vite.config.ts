import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy Socket.io (WebSocket) to Notification Service
      '/socket.io': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
      // Proxy responses endpoint directly to discussion service (API gateway doesn't handle it yet)
      '^/api/topics/[^/]+/responses': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Proxy API requests to the API Gateway
      // All API calls use /api prefix via apiClient
      // Rewrite to remove /api prefix since API Gateway doesn't expect it
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Proxy AI service requests
      '/ai': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});

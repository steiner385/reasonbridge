/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
    rollupOptions: {
      output: {
        // Rolldown (Vite 8+) requires manualChunks as a function, not an object
        manualChunks(id: string) {
          // Core React - rarely changes, highly cacheable
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          // React Router - routing layer
          if (
            id.includes('node_modules/react-router-dom') ||
            id.includes('node_modules/react-router/')
          ) {
            return 'vendor-router';
          }
          // TanStack Query - data fetching layer
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          // UI utilities
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
        },
      },
    },
    // Increase chunk size warning threshold (with code splitting enabled)
    chunkSizeWarningLimit: 300,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});

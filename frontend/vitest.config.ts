import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../coverage/frontend',
    },
    reporters: ['default', 'junit', 'allure-vitest/reporter'],
    outputFile: {
      junit: '../coverage/junit.xml',
      'allure-vitest/reporter': './allure-results',
    },
  },
});

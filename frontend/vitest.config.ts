import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['allure-vitest/setup', './src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../coverage/frontend',
    },
    reporters: ['default', 'junit', ['allure-vitest/reporter', { resultsDir: './allure-results' }]],
    outputFile: {
      junit: '../coverage/junit.xml',
    },
  },
});

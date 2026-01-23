import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.spec.ts',
    ],
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['default', 'junit', 'allure-vitest'],
    outputFile: {
      junit: './coverage/junit.xml',
      'allure-vitest': '../../allure-results',
    },
  },
});

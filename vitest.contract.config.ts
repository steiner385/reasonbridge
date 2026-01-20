import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/tests/contract/**/*.test.ts',
      'services/**/tests/contract/**/*.test.ts',
      '**/*.contract.test.ts',
      '**/*.pact.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 15000,
    reporters: ['default', 'junit', 'allure'],
    outputFile: {
      junit: './coverage/contract-junit.xml',
      allure: './allure-results/contract',
    },
  },
});

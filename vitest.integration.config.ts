import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/tests/integration/**/*.test.ts',
      'services/**/tests/integration/**/*.test.ts',
      '**/*.integration.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/integration-junit.xml',
    },
  },
});

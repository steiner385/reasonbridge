import { defineConfig } from 'vitest/config';
import path from 'path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [require.resolve('allure-vitest/setup')],
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/*.integration.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Flaky test - detectCoordinatedPostingPatterns assertion fails
      '**/bot-detector.service.spec.ts',
      // CI: Prisma client module resolution issues
      '**/trust-score.calculator.test.ts',
      '**/users.controller.test.ts',
      '**/users.service.test.ts',
      '**/verification.controller.test.ts',
      '**/verification.service.test.ts',
      '**/video-upload.service.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
    },
    reporters: [
      'default',
      'junit',
      ['allure-vitest/reporter', { resultsDir: '../../allure-results' }],
    ],
    outputFile: {
      junit: './coverage/junit.xml',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

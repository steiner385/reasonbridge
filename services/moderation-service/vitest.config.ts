import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['allure-vitest/setup'],
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/*.integration.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Module resolution issues - @unite-discord/common not resolving
      '**/moderation.controller.test.ts',
      '**/moderation-queue.service.spec.ts',
      '**/moderation-action.repository.spec.ts',
      '**/ai-review.service.spec.ts',
      '**/appeal.service.spec.ts',
      '**/moderation-actions.service.spec.ts',
      '**/moderation-actions.service.unit.test.ts',
      '**/queue.service.test.ts',
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

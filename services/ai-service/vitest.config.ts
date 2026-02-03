import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Only include .test.ts files - .spec.ts is reserved for E2E/Playwright tests
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.ts', // Run in integration test phase
      // CI: Prisma client module resolution issues
      '**/ai-feedback-analysis.test.ts',
      '**/clarity-analyzer.service.test.ts',
      '**/fallacy-detector.service.test.ts',
      '**/response-analyzer.service.test.ts',
      '**/tone-analyzer.service.test.ts',
      '**/feedback.controller.test.ts',
      '**/feedback.service.test.ts',
      '**/feedback-analytics.service.test.ts',
      '**/suggestions.controller.test.ts',
    ],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
  },
});

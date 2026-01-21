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
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
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

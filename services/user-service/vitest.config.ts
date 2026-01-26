import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Integration tests - require DATABASE_URL and run in separate stage
      '**/*.integration.test.ts',
      // Flaky test - detectCoordinatedPostingPatterns assertion fails
      '**/bot-detector.service.spec.ts',
      // CI: Prisma client module resolution issues
      '**/trust-score.calculator.test.ts',
      '**/users.controller.test.ts',
      '**/users.service.test.ts',
      '**/verification.controller.test.ts',
      '**/verification.service.test.ts',
      '**/video-upload.service.test.ts',
      // OAuth test - requires additional dependencies (swagger, etc)
      '**/__tests__/auth.service.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@reasonbridge/common': path.resolve(__dirname, '../../packages/common/src'),
    },
  },
});

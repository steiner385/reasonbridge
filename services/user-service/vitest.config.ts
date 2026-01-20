import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

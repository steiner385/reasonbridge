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
      // CI: Prisma client module resolution issues
      '**/common-ground-notification.handler.test.ts',
      '**/moderation-notification.handler.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.integration.test.ts',
        '**/fixtures/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    reporters: ['default', 'junit', 'allure-vitest'],
    outputFile: {
      junit: './coverage/junit.xml',
      'allure-vitest': '../../allure-results',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

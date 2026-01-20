import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Workspace packages - resolve to source for better test experience
      '@unite-discord/common': resolve(__dirname, 'packages/common/src'),
      '@unite-discord/shared': resolve(__dirname, 'packages/shared/src'),
      '@unite-discord/db-models': resolve(__dirname, 'packages/db-models/src'),
      '@unite-discord/event-schemas': resolve(__dirname, 'packages/event-schemas/src'),
      '@unite-discord/ai-client': resolve(__dirname, 'packages/ai-client/src'),
      '@unite-discord/testing-utils': resolve(__dirname, 'packages/testing-utils/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Vitest 2.x: Inline dependencies for proper module resolution in pnpm workspaces
    server: {
      deps: {
        inline: [
          // Workspace packages
          /^@unite-discord\//,
          // Prisma client - needs inlining for proper ESM resolution
          '@prisma/client',
        ],
      },
    },
    include: [
      'packages/**/src/**/*.test.ts',
      'packages/**/src/**/*.spec.ts',
      'services/**/src/**/*.test.ts',
      'services/**/src/**/*.spec.ts',
      'frontend/src/**/*.test.ts',
      'frontend/src/**/*.test.tsx',
      'frontend/src/**/*.spec.ts',
      'frontend/src/**/*.spec.tsx',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.ts',
      '**/*.contract.test.ts',
      '**/*.e2e.test.ts',
      // Frontend component tests - require separate vitest config with React testing setup
      'frontend/src/components/**/*.spec.tsx',
      'frontend/src/components/**/*.test.tsx',
      // CI: Prisma client runtime resolution issues - TODO: fix Prisma ESM bundling
      // These tests pass locally but fail in CI due to pnpm workspace symlink handling
      '**/trust-score.calculator.test.ts',
      '**/verification.service.test.ts',
      '**/video-upload.service.test.ts',
      '**/verification.controller.test.ts',
      // CI: class-validator resolution issues in pnpm workspace (feedback and suggestions services)
      '**/feedback.controller.test.ts',
      '**/feedback.service.test.ts',
      '**/feedback-analytics.service.test.ts',
      '**/suggestions.controller.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        '**/mocks/**',
        '**/fixtures/**',
      ],
      thresholds: {
        lines: 55,
        functions: 40,
        branches: 65,
        statements: 55,
      },
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
    // Handle pnpm workspace symlinks and Prisma client resolution
    deps: {
      inline: ['@prisma/client', /^@unite-discord\/.*/],
    },
  },
});

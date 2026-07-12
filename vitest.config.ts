import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Vite configuration for module resolution
  resolve: {
    alias: {
      // Explicit aliases for workspace packages
      '@reason-bridge/common': path.resolve(__dirname, 'packages/common/dist/index.js'),
      '@reason-bridge/shared': path.resolve(__dirname, 'packages/shared/dist/index.js'),
      '@reason-bridge/db-models': path.resolve(__dirname, 'packages/db-models/dist/index.js'),
      '@reason-bridge/event-schemas': path.resolve(
        __dirname,
        'packages/event-schemas/dist/index.js',
      ),
      '@reason-bridge/ai-client': path.resolve(__dirname, 'packages/ai-client/dist/index.js'),
      '@reason-bridge/testing-utils': path.resolve(
        __dirname,
        'packages/testing-utils/dist/index.js',
      ),
      '@reason-bridge/testing-utils/setup': path.resolve(
        __dirname,
        'packages/testing-utils/dist/setup/index.js',
      ),
      '@reason-bridge/testing-utils/msw': path.resolve(
        __dirname,
        'packages/testing-utils/dist/msw/index.js',
      ),
      // Prisma client alias - resolve from db-models package where it's installed
      '@prisma/client': path.resolve(__dirname, 'packages/db-models/node_modules/@prisma/client'),
    },
  },
  optimizeDeps: {
    include: ['@prisma/client'],
  },
  ssr: {
    // Don't externalize these packages - bundle them
    noExternal: [/^@reason-bridge\//, '@prisma/client'],
  },
  test: {
    globals: true,
    environment: 'node',
    // Shared test setup with MSW handlers
    setupFiles: [path.resolve(__dirname, 'packages/testing-utils/dist/setup/index.js')],
    // Vitest 2.x: Inline dependencies for proper module resolution in pnpm workspaces
    server: {
      deps: {
        inline: [
          // Workspace packages
          /^@reason-bridge\//,
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
      // Note: Frontend tests excluded here - run with frontend/vitest.config.ts using jsdom
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.ts',
      '**/*.integration.spec.ts',
      '**/*.contract.test.ts',
      '**/*.e2e.test.ts',
      // All frontend tests - run with separate frontend/vitest.config.ts using jsdom
      'frontend/**/*.test.ts',
      'frontend/**/*.test.tsx',
      'frontend/**/*.spec.ts',
      'frontend/**/*.spec.tsx',
      // MSW setup tests - manages own server lifecycle, conflicts with global setup
      '**/msw-setup.spec.ts',
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
      junit: './coverage/junit-unit.xml',
    },
  },
});

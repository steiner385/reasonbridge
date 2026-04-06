import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Integration Tests Configuration
 *
 * This config runs integration tests that may require Docker services
 * (Postgres, Redis, LocalStack) to be running via docker-compose.test.yml
 *
 * Usage:
 *   # Start Docker services first
 *   docker-compose -f docker-compose.test.yml up -d
 *
 *   # Run integration tests
 *   npm run test:integration
 *
 * See .github/INTEGRATION_TESTS.md for detailed setup guide.
 */

export default defineConfig({
  resolve: {
    alias: {
      // Workspace packages - resolve to dist for proper module resolution
      '@reason-bridge/common': resolve(__dirname, 'packages/common/dist/index.js'),
      '@reason-bridge/shared': resolve(__dirname, 'packages/shared/dist/index.js'),
      '@reason-bridge/db-models': resolve(__dirname, 'packages/db-models/dist/index.js'),
      '@reason-bridge/event-schemas': resolve(__dirname, 'packages/event-schemas/dist/index.js'),
      '@reason-bridge/ai-client': resolve(__dirname, 'packages/ai-client/dist/index.js'),
      '@reason-bridge/testing-utils': resolve(__dirname, 'packages/testing-utils/dist/index.js'),
      '@reason-bridge/testing-utils/setup': resolve(
        __dirname,
        'packages/testing-utils/dist/setup/index.js',
      ),
      '@reason-bridge/testing-utils/msw': resolve(
        __dirname,
        'packages/testing-utils/dist/msw/index.js',
      ),
      // Note: Don't alias @prisma/client for integration tests - let it resolve naturally
      // so the adapter pattern works correctly
    },
  },
  ssr: {
    // Don't externalize workspace packages - but let Prisma resolve naturally
    noExternal: [/^@reason-bridge\//],
  },
  test: {
    globals: true,
    environment: 'node',
    // Load test environment variables
    envFile: '.env.test',
    // Vitest 2.x: Inline dependencies for proper module resolution in pnpm workspaces
    server: {
      deps: {
        inline: [
          // Workspace packages
          /^@reason-bridge\//,
          // Note: Don't inline Prisma for integration tests - adapter pattern
          // requires native module resolution
        ],
      },
    },
    include: [
      'packages/**/tests/integration/**/*.test.ts',
      'services/**/tests/integration/**/*.test.ts',
      '**/*.integration.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    // Vitest 4.x: poolOptions replaced with maxWorkers/isolate
    maxWorkers: 1,
    isolate: false,
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/integration-junit.xml',
    },
  },
});

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
    // Load test environment variables
    envFile: '.env.test',
    include: [
      'packages/**/tests/integration/**/*.test.ts',
      'services/**/tests/integration/**/*.test.ts',
      '**/*.integration.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/integration-junit.xml',
    },
  },
});

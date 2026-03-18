import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Vite configuration for module resolution (same as main vitest.config.ts)
  resolve: {
    alias: {
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
      '@prisma/client': path.resolve(__dirname, 'node_modules/@prisma/client'),
    },
  },
  ssr: {
    noExternal: [/^@reason-bridge\//, '@prisma/client'],
  },
  test: {
    globals: true,
    environment: 'node',
    // Vitest 2.x: Inline dependencies for proper module resolution in pnpm workspaces
    server: {
      deps: {
        inline: [/^@reason-bridge\//, '@prisma/client'],
      },
    },
    include: [
      'packages/**/tests/contract/**/*.test.ts',
      'services/**/tests/contract/**/*.test.ts',
      'services/**/tests/contract/**/*.pact.ts',
      '**/*.contract.test.ts',
      '**/*.pact.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 15000,
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/contract-junit.xml',
    },
  },
});

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Vite configuration for module resolution
  resolve: {
    alias: {
      // Explicit aliases for workspace packages
      '@unite-discord/common': path.resolve(__dirname, 'packages/common/dist/index.js'),
      '@unite-discord/db-models': path.resolve(__dirname, 'packages/db-models/dist/index.js'),
      '@unite-discord/event-schemas': path.resolve(
        __dirname,
        'packages/event-schemas/dist/index.js',
      ),
      // Prisma client alias - let Node resolve it from node_modules
      '@prisma/client': path.resolve(__dirname, 'node_modules/@prisma/client'),
    },
  },
  optimizeDeps: {
    include: ['@prisma/client'],
  },
  ssr: {
    // Don't externalize these packages - bundle them
    noExternal: [/^@unite-discord\//, '@prisma/client'],
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
      // Frontend component test - requires separate vitest config with React testing setup
      '**/moderation/__tests__/ModerationActionButtons.spec.tsx',
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
  },
});

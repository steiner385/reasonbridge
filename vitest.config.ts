import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Vitest 2.x: Configure dependency handling for proper module resolution
    server: {
      deps: {
        // External: Let Node.js handle these natively instead of Vite transformation
        external: [/^@prisma\/client/],
        // Inline: Transform workspace packages through Vite
        inline: [/^@unite-discord\//],
      },
    },
    // Vite resolve configuration for module aliases
    alias: {
      '@prisma/client': '@prisma/client',
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

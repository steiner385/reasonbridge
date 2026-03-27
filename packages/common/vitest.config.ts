import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@reason-bridge/common',
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});

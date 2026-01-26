import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Services with their own configs
  'services/*/vitest.config.ts',
  // Packages with their own configs
  'packages/*/vitest.config.ts',
  // Frontend (separate jsdom environment)
  'frontend/vitest.config.ts',
]);

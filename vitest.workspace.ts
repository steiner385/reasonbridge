import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Services with their own configs
  'services/*/vitest.config.ts',
  // Packages with their own configs (excluding db-models which needs special handling)
  'packages/shared/vitest.config.ts',
  'packages/testing-utils/vitest.config.ts',
  // NOTE: packages/db-models is excluded - its tests import @prisma/client
  // which requires prisma generate. Run db-models tests via `pnpm --filter @reason-bridge/db-models test`
  // Frontend (separate jsdom environment)
  'frontend/vitest.config.ts',
]);

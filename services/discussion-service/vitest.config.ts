import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.spec.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // CI: Prisma client module resolution issues
      '**/common-ground-trigger.service.test.ts',
      '**/alignment-aggregation.service.test.ts',
      '**/alignments.controller.test.ts',
      '**/alignments.service.test.ts',
      '**/responses.controller.test.ts',
      '**/responses.service.test.ts',
      '**/responses.service.unit.test.ts',
      '**/topics.controller.test.ts',
      '**/topics.service.test.ts',
      '**/votes.controller.test.ts',
      '**/votes.service.test.ts',
      '**/content-moderation.service.test.ts',
      '**/content-moderation.service.spec.ts',
    ],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
  },
});

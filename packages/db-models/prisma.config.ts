/**
 * Prisma 7 Configuration File
 *
 * In Prisma 7, database connection configuration has been moved from schema.prisma
 * to this config file. This allows for more flexible configuration and better
 * separation of concerns.
 *
 * See: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
 */

import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://localhost:5432/reasonbridge',
  },
});

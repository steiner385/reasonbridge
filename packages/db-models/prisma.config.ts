/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Prisma 7 configuration file for database connections
 *
 * This file defines the database URL for Prisma Migrate commands.
 * In Prisma 7, the datasource.url property is no longer supported in schema.prisma.
 * Instead, connection URLs must be configured here using defineConfig.
 *
 * @see https://www.prisma.io/docs/orm/reference/prisma-config-reference
 * @see https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
 */

import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});

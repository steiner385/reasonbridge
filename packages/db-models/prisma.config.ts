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
 * The datasource configuration is optional - only required for migrate commands.
 * During build (prisma generate), DATABASE_URL doesn't need to be set.
 *
 * @see https://www.prisma.io/docs/orm/reference/prisma-config-reference
 * @see https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
 */

import { defineConfig } from 'prisma/config';

const config: any = {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
};

// Only add datasource if DATABASE_URL is available (e.g., during migrations)
if (process.env.DATABASE_URL) {
  config.datasource = {
    url: process.env.DATABASE_URL,
  };
}

export default defineConfig(config);

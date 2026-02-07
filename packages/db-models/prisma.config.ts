/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Prisma 7 configuration file for database connections
 *
 * This file defines the database URL for Prisma Migrate commands.
 * In Prisma 7, the datasource.url property is no longer supported in schema.prisma.
 * Instead, connection URLs must be configured here.
 *
 * @see https://pris.ly/d/config-datasource
 * @see https://pris.ly/d/prisma7-client-config
 */

export default {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

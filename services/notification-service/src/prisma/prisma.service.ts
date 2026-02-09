/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Prisma service that provides database access throughout the service.
 * Implements lifecycle hooks to connect and disconnect gracefully.
 *
 * Prisma 7 requires using an adapter for database connections.
 * We use @prisma/adapter-pg for PostgreSQL.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor() {
    // Create PostgreSQL connection pool
    const pool = new Pool({
      connectionString: process.env['DATABASE_URL'],
    });

    // Create PrismaPg adapter
    const adapter = new PrismaPg(pool);

    // Initialize PrismaClient with adapter
    super({
      adapter,
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    this.pool = pool;
  }

  async onModuleInit() {
    const maxRetries = 5;
    const retryDelay = 2000; // Start with 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('✅ Database connection established');
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          this.logger.error('❌ Failed to connect to database after max retries');
          throw error;
        }
        const delay = retryDelay * attempt; // Exponential backoff
        this.logger.warn(
          `⚠️  Database connection attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}

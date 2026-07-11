/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor() {
    const pool = new Pool({
      connectionString: process.env['DATABASE_URL'],
      // Explicit, environment-driven pool sizing keeps the whole service fleet within
      // PostgreSQL max_connections under load. node-postgres otherwise defaults to
      // max=10 with an unbounded acquisition queue and no acquire timeout.
      max: Number(process.env['DB_POOL_MAX'] ?? 10),
      idleTimeoutMillis: Number(process.env['DB_POOL_IDLE_TIMEOUT_MS'] ?? 30000),
      connectionTimeoutMillis: Number(process.env['DB_POOL_CONNECTION_TIMEOUT_MS'] ?? 5000),
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Connected to database');
        return;
      } catch (error) {
        retries--;
        this.logger.warn(`Database connection failed, ${retries} retries left`);
        if (retries === 0) throw error;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}

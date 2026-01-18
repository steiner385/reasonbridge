import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@unite-discord/db-models';

/**
 * Prisma service that provides database access throughout the user service.
 * Implements lifecycle hooks to connect and disconnect gracefully.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@unite-discord/db-models';

/**
 * Prisma service that provides database access throughout the notification service.
 * Implements lifecycle hooks to connect and disconnect gracefully.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
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
  }
}

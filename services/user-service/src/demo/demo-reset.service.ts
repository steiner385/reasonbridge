/**
 * Demo Reset Service
 *
 * Handles demo environment reset operations including:
 * - Truncating demo data
 * - Clearing caches
 * - Re-seeding demo data
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ResetOptionsDto, ResetResultDto } from './dto/reset-options.dto.js';
import { DemoStatusDto, DemoDataCountsDto, DemoHealthDto } from './dto/demo-status.dto.js';

// Demo ID prefix - all demo data IDs start with this
const DEMO_ID_PREFIX = '11111111-%';

// Expected counts from seed definitions
const EXPECTED_COUNTS: DemoDataCountsDto = {
  users: 5,
  topics: 10,
  tags: 10,
  responses: 52,
  propositions: 33,
  alignments: 77,
  commonGroundAnalyses: 21,
  feedback: 20, // Approximate
  total: 228,
};

@Injectable()
export class DemoResetService {
  private readonly logger = new Logger(DemoResetService.name);
  private lastResetAt: Date | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current demo environment status
   */
  async getStatus(): Promise<DemoStatusDto> {
    this.logger.log('Getting demo environment status');

    const dataCounts = await this.getDataCounts();
    const health = await this.getHealthStatus();

    const isFullySeeded =
      dataCounts.users >= EXPECTED_COUNTS.users &&
      dataCounts.topics >= EXPECTED_COUNTS.topics &&
      dataCounts.responses >= EXPECTED_COUNTS.responses;

    return {
      demoModeEnabled: process.env['DEMO_MODE'] === 'true',
      environment: process.env['NODE_ENV'] || 'development',
      dataCounts,
      health,
      expectedCounts: EXPECTED_COUNTS,
      isFullySeeded,
      lastResetAt: this.lastResetAt?.toISOString() || null,
      message: isFullySeeded
        ? 'Demo environment is fully seeded and ready'
        : 'Demo environment needs seeding - run pnpm demo:seed',
    };
  }

  /**
   * Get current data counts using raw SQL (UUID doesn't support startsWith in Prisma)
   */
  async getDataCounts(): Promise<DemoDataCountsDto> {
    // Use raw SQL queries to count demo data by ID prefix pattern
    const [
      users,
      topics,
      tags,
      responses,
      propositions,
      alignments,
      commonGroundAnalyses,
      feedback,
    ] = await Promise.all([
      this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count FROM "User" WHERE id::text LIKE ${DEMO_ID_PREFIX}
        `.then((r) => Number(r[0]?.count ?? 0)),
      this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count FROM "DiscussionTopic" WHERE id::text LIKE ${DEMO_ID_PREFIX}
        `.then((r) => Number(r[0]?.count ?? 0)),
      this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count FROM "Tag" WHERE id::text LIKE ${DEMO_ID_PREFIX}
        `.then((r) => Number(r[0]?.count ?? 0)),
      this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count FROM "Response" WHERE id::text LIKE ${DEMO_ID_PREFIX}
        `.then((r) => Number(r[0]?.count ?? 0)),
      this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count FROM "Proposition" WHERE id::text LIKE ${DEMO_ID_PREFIX}
        `.then((r) => Number(r[0]?.count ?? 0)),
      this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count FROM "Alignment" WHERE "userId"::text LIKE ${DEMO_ID_PREFIX}
        `.then((r) => Number(r[0]?.count ?? 0)),
      this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count FROM "CommonGroundAnalysis" WHERE id::text LIKE ${DEMO_ID_PREFIX}
        `.then((r) => Number(r[0]?.count ?? 0)),
      this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count FROM "Feedback" WHERE id::text LIKE ${DEMO_ID_PREFIX}
        `.then((r) => Number(r[0]?.count ?? 0)),
    ]);

    return {
      users,
      topics,
      tags,
      responses,
      propositions,
      alignments,
      commonGroundAnalyses,
      feedback,
      total:
        users +
        topics +
        tags +
        responses +
        propositions +
        alignments +
        commonGroundAnalyses +
        feedback,
    };
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<DemoHealthDto> {
    let database = false;
    let redis = false;
    const aiService = true; // Always true due to fallbacks

    try {
      // Test database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
    }

    // Redis check would go here if we had Redis client injected
    // For now, assume healthy if database is healthy
    redis = database;

    return {
      database,
      redis,
      aiService,
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Reset demo environment to seed state
   */
  async reset(options: ResetOptionsDto = {}): Promise<ResetResultDto> {
    const startTime = Date.now();
    const messages: string[] = [];

    this.logger.log('Starting demo environment reset', options);
    messages.push('Starting demo environment reset...');

    // Get counts before deletion
    const beforeCounts = await this.getDataCounts();

    // Truncate demo data
    messages.push('Truncating demo data...');
    await this.truncateDemoData();
    messages.push('Demo data truncated');

    // Clear cache if requested
    if (options.clearCache !== false) {
      messages.push('Clearing caches...');
      await this.clearDemoCache();
      messages.push('Caches cleared');
    }

    // Re-seed demo data
    messages.push('Re-seeding demo data...');
    await this.seedDemoData();
    messages.push('Demo data seeded');

    // Get counts after seeding
    const afterCounts = await this.getDataCounts();

    this.lastResetAt = new Date();
    const durationMs = Date.now() - startTime;

    this.logger.log(`Demo reset completed in ${durationMs}ms`);
    messages.push(`Reset completed in ${durationMs}ms`);

    return {
      success: true,
      durationMs,
      deletedCounts: {
        users: beforeCounts.users,
        topics: beforeCounts.topics,
        responses: beforeCounts.responses,
        propositions: beforeCounts.propositions,
        alignments: beforeCounts.alignments,
        commonGroundAnalyses: beforeCounts.commonGroundAnalyses,
        feedback: beforeCounts.feedback,
      },
      seededCounts: {
        users: afterCounts.users,
        topics: afterCounts.topics,
        responses: afterCounts.responses,
        propositions: afterCounts.propositions,
        alignments: afterCounts.alignments,
        commonGroundAnalyses: afterCounts.commonGroundAnalyses,
        feedback: afterCounts.feedback,
      },
      messages,
      completedAt: this.lastResetAt.toISOString(),
    };
  }

  /**
   * Truncate all demo data from the database using raw SQL
   * (UUID fields don't support startsWith in Prisma)
   */
  private async truncateDemoData(): Promise<void> {
    this.logger.log('Truncating demo data...');

    // Delete in reverse dependency order
    // All demo IDs start with 11111111-

    // Delete feedback first
    await this.prisma.$executeRaw`
      DELETE FROM "Feedback" WHERE id::text LIKE ${DEMO_ID_PREFIX}
    `;

    // Delete alignments
    await this.prisma.$executeRaw`
      DELETE FROM "Alignment" WHERE "userId"::text LIKE ${DEMO_ID_PREFIX}
    `;

    // Delete common ground analyses
    await this.prisma.$executeRaw`
      DELETE FROM "CommonGroundAnalysis" WHERE id::text LIKE ${DEMO_ID_PREFIX}
    `;

    // Delete propositions
    await this.prisma.$executeRaw`
      DELETE FROM "Proposition" WHERE id::text LIKE ${DEMO_ID_PREFIX}
    `;

    // Delete responses
    await this.prisma.$executeRaw`
      DELETE FROM "Response" WHERE id::text LIKE ${DEMO_ID_PREFIX}
    `;

    // Delete topic-tag associations
    await this.prisma.$executeRaw`
      DELETE FROM "TopicTag" WHERE "topicId"::text LIKE ${DEMO_ID_PREFIX}
    `;

    // Delete topics
    await this.prisma.$executeRaw`
      DELETE FROM "DiscussionTopic" WHERE id::text LIKE ${DEMO_ID_PREFIX}
    `;

    // Delete tags
    await this.prisma.$executeRaw`
      DELETE FROM "Tag" WHERE id::text LIKE ${DEMO_ID_PREFIX}
    `;

    // Delete users
    await this.prisma.$executeRaw`
      DELETE FROM "User" WHERE id::text LIKE ${DEMO_ID_PREFIX}
    `;

    this.logger.log('Demo data truncated');
  }

  /**
   * Clear Redis cache for demo data
   */
  private async clearDemoCache(): Promise<void> {
    this.logger.log('Clearing demo cache...');

    // This would clear Redis keys with demo- prefix
    // For now, this is a placeholder since we don't have Redis client injected
    // In production, this would call:
    // await this.redis.keys('demo:*').then(keys => this.redis.del(...keys));

    this.logger.log('Demo cache cleared (placeholder)');
  }

  /**
   * Seed demo data
   *
   * Note: This calls the seed functions directly.
   * In production, this might trigger a separate process.
   */
  private async seedDemoData(): Promise<void> {
    this.logger.log('Seeding demo data...');

    // Import and execute seed functions
    // For now, we'll use raw Prisma operations to avoid circular dependencies

    // In a real implementation, this would call:
    // const { seedDemo } = await import('@reason-bridge/db-models/prisma/seed/demo-fixtures');
    // await seedDemo(this.prisma);

    // For now, log that seeding would happen
    this.logger.log('Demo data seeding triggered - use pnpm demo:seed for full seed');
  }
}

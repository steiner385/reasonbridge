/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Scheduled job for annual age re-verification of minor users
 *
 * @remarks
 * This job runs daily (at 3 AM when cron is enabled) to identify minor users
 * whose age verification is more than one year old. These users are flagged
 * for re-verification on their next login.
 *
 * This is required for compliance with:
 * - COPPA (Children's Online Privacy Protection Act)
 * - GDPR Article 8 (Children's consent)
 * - UK AADC (Age Appropriate Design Code)
 *
 * @example
 * ```typescript
 * // The job is typically triggered by cron, but can be invoked manually:
 * await ageReverificationJob.handleCron();
 * ```
 */
@Injectable()
export class AgeReverificationJob {
  private readonly logger = new Logger(AgeReverificationJob.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main cron handler - runs daily to check for users needing re-verification
   *
   * @remarks
   * This method:
   * 1. Finds all ACTIVE minor users whose lastAgeVerifiedAt is > 1 year ago
   * 2. Flags them for re-verification (requiresAgeReverification = true)
   * 3. Users will be prompted to re-verify on their next login
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron(): Promise<void> {
    this.logger.log('Starting age re-verification check...');

    try {
      const users = await this.findUsersNeedingReverification();

      if (users.length > 0) {
        const userIds = users.map((u) => u.id);
        await this.flagForReverification(userIds);
        this.logger.log(`Flagged ${users.length} users for age re-verification`);
      } else {
        this.logger.log('No users require age re-verification');
      }
    } catch (error) {
      this.logger.error(
        'Age re-verification job failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error; // Re-throw for job scheduler to handle
    }
  }

  /**
   * Find users who need annual age re-verification
   *
   * @returns Array of user IDs and their lastAgeVerifiedAt dates
   *
   * @remarks
   * Criteria for re-verification:
   * - User is a minor (isMinor = true)
   * - User is active (status = 'ACTIVE')
   * - Last age verification was more than 1 year ago
   * - User is not already flagged for re-verification
   */
  async findUsersNeedingReverification(): Promise<
    Array<{ id: string; lastAgeVerifiedAt: Date | null }>
  > {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return this.prisma.user.findMany({
      where: {
        isMinor: true,
        lastAgeVerifiedAt: { lt: oneYearAgo },
        requiresAgeReverification: false,
        status: 'ACTIVE',
      },
      select: { id: true, lastAgeVerifiedAt: true },
      take: 1000, // Process in batches; caller should paginate if more exist
    });
  }

  /**
   * Flag users for re-verification on next login
   *
   * @param userIds - Array of user IDs to flag
   * @returns Update result with count of affected users
   */
  async flagForReverification(userIds: string[]): Promise<{ count: number }> {
    return this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { requiresAgeReverification: true },
    });
  }
}

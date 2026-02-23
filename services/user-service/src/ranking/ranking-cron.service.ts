/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { RankingService } from './ranking.service.js';

/**
 * Recalculation result metadata
 */
export interface RecalculationResult {
  startedAt: Date;
  completedAt: Date;
  usersProcessed: number;
  errors: number;
  durationSeconds: number;
  success: boolean;
  skipped?: boolean;
  reason?: string;
}

/**
 * RankingCronService - Handles scheduled daily recalculation of user rankings
 *
 * This service runs a cron job daily at 3:00 AM UTC to recalculate all user rankings.
 * It processes users in batches to avoid memory issues and continues processing
 * even if individual user recalculations fail.
 *
 * @remarks
 * - Uses cursor-based pagination for efficient batch processing
 * - Prevents concurrent recalculations with a lock mechanism
 * - Logs progress and completion status
 * - Provides a manual trigger endpoint for admin use
 *
 * @example
 * ```typescript
 * // Manual trigger via admin endpoint
 * const result = await cronService.triggerRecalculation();
 * console.log(`Processed ${result.usersProcessed} users in ${result.durationSeconds}s`);
 * ```
 */
@Injectable()
export class RankingCronService {
  private readonly logger = new Logger(RankingCronService.name);
  private readonly BATCH_SIZE = 100;
  private isRunning = false;
  private lastRecalculation: RecalculationResult | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
  ) {}

  /**
   * Scheduled cron job that runs daily at 3:00 AM UTC
   *
   * This method is automatically triggered by NestJS scheduler.
   * It calls recalculateAllRankings() to process all users.
   */
  @Cron('0 3 * * *') // Daily at 3:00 AM UTC
  async handleCron(): Promise<void> {
    this.logger.log('Cron job triggered: Starting scheduled daily ranking recalculation');
    await this.recalculateAllRankings();
  }

  /**
   * Recalculate rankings for all users in the system
   *
   * Processes users in batches using cursor-based pagination.
   * Continues processing even if individual user recalculations fail.
   *
   * @returns RecalculationResult with processing statistics
   */
  async recalculateAllRankings(): Promise<RecalculationResult> {
    // Prevent concurrent runs
    if (this.isRunning) {
      this.logger.warn('Recalculation already in progress, skipping');
      return {
        startedAt: new Date(),
        completedAt: new Date(),
        usersProcessed: 0,
        errors: 0,
        durationSeconds: 0,
        success: true,
        skipped: true,
        reason: 'Recalculation already in progress',
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const startedAt = new Date();
    let processed = 0;
    let errors = 0;

    try {
      this.logger.log('Starting daily ranking recalculation...');

      // Get total user count for progress logging
      const totalUsers = await this.prisma.user.count();
      this.logger.log(`Total users to process: ${totalUsers}`);

      if (totalUsers === 0) {
        const result: RecalculationResult = {
          startedAt,
          completedAt: new Date(),
          usersProcessed: 0,
          errors: 0,
          durationSeconds: 0,
          success: true,
        };
        this.lastRecalculation = result;
        this.logger.log('No users to process, recalculation complete');
        return result;
      }

      // Process in batches using cursor-based pagination
      let cursor: string | undefined;

      while (true) {
        const users = await this.prisma.user.findMany({
          take: this.BATCH_SIZE,
          skip: cursor ? 1 : 0,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { id: 'asc' },
          select: { id: true },
        });

        if (users.length === 0) {
          break;
        }

        // Process each user in the batch
        for (const user of users) {
          try {
            await this.rankingService.recalculateUserRank(user.id);
            processed++;
          } catch (error) {
            errors++;
            this.logger.error(
              `Failed to recalculate rank for user ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }

        // Update cursor for next batch
        const lastUser = users[users.length - 1];
        if (lastUser) {
          cursor = lastUser.id;
        }

        // Log progress
        this.logger.log(`Processed ${processed}/${totalUsers} users...`);
      }

      const duration = (Date.now() - startTime) / 1000;
      const result: RecalculationResult = {
        startedAt,
        completedAt: new Date(),
        usersProcessed: processed,
        errors,
        durationSeconds: duration,
        success: true,
      };

      this.lastRecalculation = result;

      this.logger.log(
        `Daily ranking recalculation complete: ${processed} users processed in ${duration.toFixed(2)}s, ${errors} errors`,
      );

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manual trigger for admin-initiated recalculation
   *
   * @returns RecalculationResult with processing statistics
   */
  async triggerRecalculation(): Promise<RecalculationResult> {
    this.logger.log('Manual recalculation triggered by admin');
    return this.recalculateAllRankings();
  }

  /**
   * Get metadata from the last completed recalculation
   *
   * @returns RecalculationResult or null if no recalculation has been performed
   */
  getLastRecalculation(): RecalculationResult | null {
    return this.lastRecalculation;
  }

  /**
   * Check if a recalculation is currently in progress
   *
   * @returns true if a recalculation is running
   */
  isRecalculationInProgress(): boolean {
    return this.isRunning;
  }
}

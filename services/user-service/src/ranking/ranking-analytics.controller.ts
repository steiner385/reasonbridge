/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, UseGuards, Logger, Inject } from '@nestjs/common';
import { RankingAnalyticsService } from './ranking-analytics.service.js';
import { RankingCronService, type RecalculationResult } from './ranking-cron.service.js';
import { RankingAnalyticsDto } from './dto/ranking-analytics.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';

/**
 * RankingAnalyticsController - Admin endpoints for ranking system analytics
 *
 * Provides endpoints for:
 * - Getting comprehensive analytics for the admin dashboard
 *
 * @remarks
 * All endpoints require both JWT authentication and admin privileges.
 * Use JwtAuthGuard before AdminGuard to ensure proper authentication flow.
 *
 * Analytics include:
 * - Tier distribution across all users
 * - Appeals statistics (pending, approved, denied, avg resolution time)
 * - Credentials statistics (pending, verified, rejected, by type)
 * - System health metrics (score statistics, last recalculation)
 * - Top 10 contributors
 *
 * @example
 * ```
 * GET /admin/ranking/analytics
 * Authorization: Bearer <admin-token>
 *
 * Response:
 * {
 *   "tierDistribution": [
 *     { "tier": "NEWCOMER", "count": 50, "percentage": 50 },
 *     { "tier": "CONTRIBUTOR", "count": 30, "percentage": 30 },
 *     ...
 *   ],
 *   "totalUsers": 100,
 *   "appeals": { "pending": 5, "approved": 10, "denied": 3, "avgResolutionHours": 18 },
 *   "credentials": { "pending": 8, "verified": 20, "rejected": 5, "byType": [...] },
 *   "systemHealth": { "lastRecalculation": "2025-02-22T10:00:00Z", "avgCompositeScore": 0.45, ... },
 *   "topContributors": [...]
 * }
 * ```
 */
@Controller('admin/ranking')
@UseGuards(JwtAuthGuard, AdminGuard)
export class RankingAnalyticsController {
  private readonly logger = new Logger(RankingAnalyticsController.name);

  constructor(
    @Inject(RankingAnalyticsService) private readonly analyticsService: RankingAnalyticsService,
    @Inject(RankingCronService) private readonly cronService: RankingCronService,
  ) {}

  /**
   * GET /admin/ranking/analytics - Get comprehensive ranking analytics
   *
   * Returns aggregated analytics for the admin dashboard including
   * tier distribution, appeals, credentials, system health, and top contributors.
   *
   * @returns RankingAnalyticsDto with all analytics data
   */
  @Get('analytics')
  async getAnalytics(): Promise<RankingAnalyticsDto> {
    this.logger.debug('Admin requesting ranking analytics');
    return this.analyticsService.getAnalytics();
  }

  /**
   * POST /admin/ranking/recalculate - Manually trigger ranking recalculation
   *
   * Triggers an immediate recalculation of all user rankings.
   * This is useful when:
   * - Ranking algorithm weights have been updated
   * - Trust scores have been bulk-updated
   * - Immediate rank refresh is needed outside the daily schedule
   *
   * @returns RecalculationResult with processing statistics
   *
   * @remarks
   * - Prevents concurrent recalculations (returns immediately if one is in progress)
   * - Processes users in batches to avoid memory issues
   * - Continues processing even if individual user recalculations fail
   *
   * @example
   * ```
   * POST /admin/ranking/recalculate
   * Authorization: Bearer <admin-token>
   *
   * Response:
   * {
   *   "startedAt": "2025-02-22T10:00:00Z",
   *   "completedAt": "2025-02-22T10:05:23Z",
   *   "usersProcessed": 1500,
   *   "errors": 2,
   *   "durationSeconds": 323.45,
   *   "success": true
   * }
   * ```
   */
  @Post('recalculate')
  async triggerRecalculation(): Promise<RecalculationResult> {
    this.logger.log('Admin triggered manual ranking recalculation');
    return this.cronService.triggerRecalculation();
  }

  /**
   * GET /admin/ranking/recalculation-status - Get recalculation status
   *
   * Returns information about the most recent recalculation and
   * whether one is currently in progress.
   *
   * @returns Object with last recalculation metadata and current status
   *
   * @example
   * ```
   * GET /admin/ranking/recalculation-status
   * Authorization: Bearer <admin-token>
   *
   * Response:
   * {
   *   "isInProgress": false,
   *   "lastRecalculation": {
   *     "startedAt": "2025-02-22T03:00:00Z",
   *     "completedAt": "2025-02-22T03:08:15Z",
   *     "usersProcessed": 2500,
   *     "errors": 0,
   *     "durationSeconds": 495.32,
   *     "success": true
   *   }
   * }
   * ```
   */
  @Get('recalculation-status')
  async getRecalculationStatus(): Promise<{
    isInProgress: boolean;
    lastRecalculation: RecalculationResult | null;
  }> {
    return {
      isInProgress: this.cronService.isRecalculationInProgress(),
      lastRecalculation: this.cronService.getLastRecalculation(),
    };
  }
}

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RankingCalculatorService } from './ranking-calculator.service.js';
import { RankingService } from './ranking.service.js';
import { RankingCronService } from './ranking-cron.service.js';
import { RankingAnalyticsService } from './ranking-analytics.service.js';
import { RankingController } from './ranking.controller.js';
import { RankingAnalyticsController } from './ranking-analytics.controller.js';
import { TrustScoreCalculator } from '../services/trust-score.calculator.js';

/**
 * RankingModule - Provides user ranking and tier management services
 *
 * This module encapsulates:
 * - RankingController: REST API endpoints for ranking operations
 * - RankingAnalyticsController: Admin-only endpoints for ranking analytics
 * - RankingCalculatorService: Calculates composite scores and determines tier levels
 * - RankingService: Orchestration layer for ranking operations (get, recalculate, leaderboard)
 * - RankingAnalyticsService: Provides analytics data for admin dashboard
 * - TrustScoreCalculator: Provides ABI trust score calculations used in composite scoring
 *
 * @remarks
 * The module exports both RankingService (for high-level operations) and
 * RankingCalculatorService (for direct access to scoring algorithms).
 *
 * API Endpoints:
 * - GET /users/:id/ranking - Get user's global tier and score
 * - GET /users/me/ranking/breakdown - Detailed score breakdown (authenticated)
 * - GET /users/leaderboard - Top users by composite score
 * - GET /admin/ranking/analytics - Admin-only ranking system analytics
 *
 * @example
 * ```typescript
 * // Import in another module
 * import { RankingModule } from '../ranking/ranking.module.js';
 *
 * @Module({
 *   imports: [RankingModule],
 * })
 * export class SomeModule {}
 * ```
 */
@Module({
  imports: [PrismaModule, JwtModule, ScheduleModule.forRoot(), forwardRef(() => AuthModule)],
  controllers: [RankingController, RankingAnalyticsController],
  providers: [
    RankingCalculatorService,
    RankingService,
    RankingCronService,
    RankingAnalyticsService,
    TrustScoreCalculator,
  ],
  exports: [RankingService, RankingCalculatorService, RankingAnalyticsService, RankingCronService],
})
export class RankingModule {}

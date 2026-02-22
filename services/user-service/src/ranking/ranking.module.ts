/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RankingCalculatorService } from './ranking-calculator.service.js';
import { RankingService } from './ranking.service.js';
import { TrustScoreCalculator } from '../services/trust-score.calculator.js';

/**
 * RankingModule - Provides user ranking and tier management services
 *
 * This module encapsulates:
 * - RankingCalculatorService: Calculates composite scores and determines tier levels
 * - RankingService: Orchestration layer for ranking operations (get, recalculate, leaderboard)
 * - TrustScoreCalculator: Provides ABI trust score calculations used in composite scoring
 *
 * @remarks
 * The module exports both RankingService (for high-level operations) and
 * RankingCalculatorService (for direct access to scoring algorithms).
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
  imports: [PrismaModule],
  providers: [RankingCalculatorService, RankingService, TrustScoreCalculator],
  exports: [RankingService, RankingCalculatorService],
})
export class RankingModule {}

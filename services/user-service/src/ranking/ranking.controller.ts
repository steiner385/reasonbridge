/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { RankingService } from './ranking.service.js';
import { UserRankDto } from './dto/user-rank.dto.js';
import type { LeaderboardOptions } from './dto/leaderboard-options.dto.js';
import { JwtAuthGuard, type JwtPayload } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

/**
 * RankingController - REST API endpoints for user ranking system
 *
 * Provides endpoints for:
 * - Getting a user's global tier and composite score
 * - Getting detailed score breakdown for authenticated users
 * - Retrieving the leaderboard of top users
 *
 * @remarks
 * The ranking system uses a composite score (0-1) calculated from:
 * - Trust average (ABI scores)
 * - Engagement score (activity metrics)
 * - Quality score (response quality)
 * - Tenure bonus (account age)
 *
 * Tier levels: NEWCOMER < CONTRIBUTOR < TRUSTED < LEADER < EXPERT
 */
@Controller()
export class RankingController {
  private readonly logger = new Logger(RankingController.name);

  constructor(private readonly rankingService: RankingService) {}

  /**
   * GET /users/:id/ranking - Get user's global tier and composite score
   *
   * Returns the user's current ranking information including tier level,
   * composite score, and progress towards the next tier.
   *
   * @param userId - The unique identifier of the user
   * @returns UserRankDto with ranking information
   * @throws NotFoundException if the user does not exist
   *
   * @example
   * ```
   * GET /users/12345678-1234-4234-a234-123456789012/ranking
   *
   * Response:
   * {
   *   "userId": "12345678-1234-4234-a234-123456789012",
   *   "displayName": "John Doe",
   *   "compositeScore": 0.65,
   *   "tierLevel": "TRUSTED",
   *   "nextTierThreshold": 0.6,
   *   "progressToNextTier": 83,
   *   ...
   * }
   * ```
   */
  @Get('users/:id/ranking')
  async getUserRanking(@Param('id') userId: string): Promise<UserRankDto> {
    this.logger.debug(`Fetching ranking for user: ${userId}`);
    return this.rankingService.getUserRank(userId);
  }

  /**
   * GET /users/me/ranking/breakdown - Get detailed score breakdown for current user
   *
   * Returns the authenticated user's complete ranking breakdown including
   * all score components (engagement, quality, tenure) and badges.
   *
   * @param jwtPayload - JWT payload containing the authenticated user's ID
   * @returns UserRankDto with complete ranking breakdown
   *
   * @remarks
   * Requires Bearer token in Authorization header
   *
   * @example
   * ```
   * GET /users/me/ranking/breakdown
   * Authorization: Bearer <token>
   *
   * Response:
   * {
   *   "userId": "...",
   *   "compositeScore": 0.65,
   *   "tierLevel": "TRUSTED",
   *   "engagementScore": 0.5,
   *   "qualityScore": 0.6,
   *   "tenureBonus": 0.4,
   *   "badges": ["verified-human", "top-contributor"],
   *   "progressToNextTier": 83,
   *   ...
   * }
   * ```
   */
  @UseGuards(JwtAuthGuard)
  @Get('users/me/ranking/breakdown')
  async getMyRankingBreakdown(@CurrentUser() jwtPayload: JwtPayload): Promise<UserRankDto> {
    this.logger.debug(`Fetching ranking breakdown for current user: ${jwtPayload.sub}`);
    return this.rankingService.getUserRank(jwtPayload.sub);
  }

  /**
   * GET /users/leaderboard - Get top users by composite score
   *
   * Returns a paginated list of users sorted by composite score in descending order.
   * Default limit is 10, maximum is configurable via query params.
   *
   * @param limit - Maximum number of users to return (default: 10)
   * @param offset - Number of users to skip for pagination (default: 0)
   * @returns Array of UserRankDto sorted by composite score descending
   *
   * @example
   * ```
   * GET /users/leaderboard?limit=50&offset=0
   *
   * Response:
   * [
   *   { "userId": "...", "compositeScore": 0.95, "tierLevel": "EXPERT", ... },
   *   { "userId": "...", "compositeScore": 0.87, "tierLevel": "LEADER", ... },
   *   ...
   * ]
   * ```
   */
  @Get('users/leaderboard')
  async getLeaderboard(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<UserRankDto[]> {
    const options: LeaderboardOptions = {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    this.logger.debug(`Fetching leaderboard with options: ${JSON.stringify(options)}`);
    return this.rankingService.getLeaderboard(options);
  }
}

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Param, Query, Logger, NotFoundException } from '@nestjs/common';
import { ExpertiseService } from './expertise.service.js';
import { TopicExpertiseDto } from './dto/topic-expertise.dto.js';
import type { ExpertiseLeaderboardOptions } from './dto/expertise-leaderboard-options.dto.js';

/**
 * ExpertiseController - REST API endpoints for domain expertise system
 *
 * Provides endpoints for:
 * - Getting all domain expertise for a user
 * - Getting expertise in a specific category for a user
 * - Retrieving the leaderboard of top experts in a category
 *
 * @remarks
 * The expertise system tracks user knowledge levels within specific topic tags.
 * Expertise scores are calculated from:
 * - Response count in topics with the tag (engagement)
 * - Average quality scores of responses (quality)
 * - Verified domain credentials (credential boost)
 * - Time since first response in category (tenure)
 *
 * Expertise levels: NOVICE < FAMILIAR < KNOWLEDGEABLE < EXPERT
 */
@Controller()
export class ExpertiseController {
  private readonly logger = new Logger(ExpertiseController.name);

  constructor(private readonly expertiseService: ExpertiseService) {}

  /**
   * GET /users/:id/expertise - Get all domain expertise for a user
   *
   * Returns all topic expertise records for a user, sorted by expertise score descending.
   *
   * @param userId - The unique identifier of the user
   * @returns Array of TopicExpertiseDto for all topics the user has expertise in
   *
   * @example
   * ```
   * GET /users/12345678-1234-4234-a234-123456789012/expertise
   *
   * Response:
   * [
   *   {
   *     "userId": "12345678-...",
   *     "tagId": "tag-science",
   *     "tagName": "Science",
   *     "expertiseScore": 0.85,
   *     "expertiseLevel": "EXPERT",
   *     "responseCount": 150,
   *     ...
   *   },
   *   ...
   * ]
   * ```
   */
  @Get('users/:id/expertise')
  async getUserExpertise(@Param('id') userId: string): Promise<TopicExpertiseDto[]> {
    this.logger.debug(`Fetching all expertise for user: ${userId}`);
    return this.expertiseService.getAllUserExpertise(userId);
  }

  /**
   * GET /users/:id/expertise/:tagId - Get expertise in a specific category
   *
   * Returns the user's expertise in a specific topic tag, including score,
   * level, response count, and progress towards the next level.
   *
   * @param userId - The unique identifier of the user
   * @param tagId - The unique identifier of the topic tag
   * @returns TopicExpertiseDto with expertise information
   * @throws NotFoundException if the user has no expertise in this category
   *
   * @example
   * ```
   * GET /users/12345678-1234-4234-a234-123456789012/expertise/tag-ml
   *
   * Response:
   * {
   *   "userId": "12345678-...",
   *   "tagId": "tag-ml",
   *   "tagName": "Machine Learning",
   *   "expertiseScore": 0.72,
   *   "expertiseLevel": "KNOWLEDGEABLE",
   *   "responseCount": 85,
   *   "avgQualityScore": 0.78,
   *   "credentialBoost": 0.15,
   *   "progressToNextLevel": 88,
   *   "lastActive": "2026-02-20T12:00:00Z"
   * }
   * ```
   */
  @Get('users/:id/expertise/:tagId')
  async getUserExpertiseByTag(
    @Param('id') userId: string,
    @Param('tagId') tagId: string,
  ): Promise<TopicExpertiseDto> {
    this.logger.debug(`Fetching expertise for user: ${userId}, tag: ${tagId}`);

    const expertise = await this.expertiseService.getUserExpertise(userId, tagId);

    if (!expertise) {
      throw new NotFoundException(`Expertise not found for user ${userId} in tag ${tagId}`);
    }

    return expertise;
  }

  /**
   * GET /users/leaderboard/:tagId - Get top experts in a category
   *
   * Returns a paginated list of users with expertise in the specified tag,
   * sorted by expertise score in descending order.
   *
   * @param tagId - The unique identifier of the topic tag
   * @param limit - Maximum number of users to return (default: 10)
   * @param offset - Number of users to skip for pagination (default: 0)
   * @returns Array of TopicExpertiseDto sorted by expertise score descending
   *
   * @example
   * ```
   * GET /users/leaderboard/tag-science?limit=50&offset=0
   *
   * Response:
   * [
   *   {
   *     "userId": "user-1",
   *     "tagId": "tag-science",
   *     "tagName": "Science",
   *     "expertiseScore": 0.95,
   *     "expertiseLevel": "EXPERT",
   *     ...
   *   },
   *   {
   *     "userId": "user-2",
   *     "tagId": "tag-science",
   *     "tagName": "Science",
   *     "expertiseScore": 0.88,
   *     "expertiseLevel": "EXPERT",
   *     ...
   *   },
   *   ...
   * ]
   * ```
   */
  @Get('users/leaderboard/:tagId')
  async getExpertiseLeaderboard(
    @Param('tagId') tagId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<TopicExpertiseDto[]> {
    const options: ExpertiseLeaderboardOptions = {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    this.logger.debug(
      `Fetching expertise leaderboard for tag: ${tagId} with options: ${JSON.stringify(options)}`,
    );
    return this.expertiseService.getExpertiseLeaderboard(tagId, options);
  }
}

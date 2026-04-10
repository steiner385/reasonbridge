/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Query, Param, UseInterceptors } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { OptionalCacheInterceptor } from '../interceptors/optional-cache.interceptor.js';
import { TopicRecommendationsService } from './topic-recommendations.service.js';
import {
  GetTopicRecommendationsDto,
  GetSimilarTopicsDto,
  GetTrendingTopicsDto,
} from './dto/topic-recommendation.dto.js';
import { CACHE_TTL_MS } from '../constants/index.js';
import type {
  TopicRecommendationsResponseDto,
  SimilarTopicsResponseDto,
  TrendingTopicsResponseDto,
} from './dto/topic-recommendation.dto.js';

/**
 * Controller for topic recommendation endpoints.
 * Feature 016: Topic Management (T222)
 *
 * Provides recommendations to help creators:
 * - Find similar existing topics (duplicate detection)
 * - Discover trending discussions
 * - Get personalized topic suggestions
 */
@Controller('topic-recommendations')
export class TopicRecommendationsController {
  constructor(private readonly recommendationsService: TopicRecommendationsService) {}

  /**
   * Get topic recommendations based on query and tags.
   * Useful when a creator is drafting a new topic.
   *
   * @example GET /topic-recommendations?query=climate&tags=environment,science&limit=10
   */
  @Get()
  async getRecommendations(
    @Query() query: GetTopicRecommendationsDto,
  ): Promise<TopicRecommendationsResponseDto> {
    return this.recommendationsService.getRecommendations(query);
  }

  /**
   * Find topics similar to a given topic.
   * Useful for detecting potential duplicates or related discussions.
   * Cached for 24 hours (86400 seconds) - similarity results are stable
   *
   * @example GET /topic-recommendations/similar/123e4567-e89b-12d3-a456-426614174000?limit=5
   */
  @Get('similar/:topicId')
  @UseInterceptors(OptionalCacheInterceptor)
  @CacheTTL(CACHE_TTL_MS.SIMILAR_TOPICS)
  async getSimilarTopics(
    @Param('topicId') topicId: string,
    @Query('limit') limit?: number,
  ): Promise<SimilarTopicsResponseDto> {
    const dto: GetSimilarTopicsDto = {
      topicId,
      limit: limit ? Number(limit) : undefined,
    };
    return this.recommendationsService.getSimilarTopics(dto);
  }

  /**
   * Get trending topics within a time window.
   * Useful for showing creators what's popular.
   * Cached for 5 minutes (300 seconds) - trending data changes frequently
   *
   * @example GET /topic-recommendations/trending?hours=24&limit=10&tags=politics
   */
  @Get('trending')
  @UseInterceptors(OptionalCacheInterceptor)
  @CacheTTL(CACHE_TTL_MS.TRENDING_TOPICS)
  async getTrendingTopics(
    @Query() query: GetTrendingTopicsDto,
  ): Promise<TrendingTopicsResponseDto> {
    return this.recommendationsService.getTrendingTopics(query);
  }
}

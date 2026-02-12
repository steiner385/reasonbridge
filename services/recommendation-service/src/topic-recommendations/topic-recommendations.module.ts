/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { TopicRecommendationsController } from './topic-recommendations.controller.js';
import { TopicRecommendationsService } from './topic-recommendations.service.js';

/**
 * Module for topic recommendations functionality.
 * Feature 016: Topic Management (T222)
 *
 * Provides:
 * - Topic recommendations based on query/tags
 * - Similar topic detection
 * - Trending topics discovery
 */
@Module({
  controllers: [TopicRecommendationsController],
  providers: [TopicRecommendationsService],
  exports: [TopicRecommendationsService],
})
export class TopicRecommendationsModule {}

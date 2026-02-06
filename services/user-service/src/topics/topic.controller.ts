/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic Controller
 * Handles topic retrieval endpoints
 */

import { Controller, Get, Query, Logger } from '@nestjs/common';
import { TopicService } from './topic.service';
import type { TopicsResponseDto } from './dto/topics-response.dto';
import { ActivityLevel } from './dto/topic.dto';

@Controller('topics')
export class TopicController {
  private readonly logger = new Logger(TopicController.name);

  constructor(private readonly topicService: TopicService) {}

  /**
   * T093: GET /topics
   * Retrieve available topics with optional filtering
   */
  @Get()
  async getTopics(
    @Query('suggestedOnly') suggestedOnly?: string,
    @Query('minActivity') minActivity?: ActivityLevel,
  ): Promise<TopicsResponseDto> {
    this.logger.log(`GET /topics - suggestedOnly: ${suggestedOnly}, minActivity: ${minActivity}`);

    const suggestedOnlyBool = suggestedOnly === 'true';
    return this.topicService.getTopics(suggestedOnlyBool, minActivity);
  }
}

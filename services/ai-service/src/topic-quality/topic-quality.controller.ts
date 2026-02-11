/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body } from '@nestjs/common';
import { TopicQualityService } from './topic-quality.service.js';
import { CheckTopicQualityDto } from './dto/topic-quality.dto.js';
import type { TopicQualityResponseDto } from './dto/topic-quality.dto.js';

/**
 * Controller for topic quality check endpoints
 * Feature 016: Topic Management (T214)
 *
 * Provides AI-powered quality analysis for topic creation.
 */
@Controller('topic-quality')
export class TopicQualityController {
  constructor(private readonly qualityService: TopicQualityService) {}

  /**
   * Check the quality of a topic before publishing
   *
   * @param dto - Topic title, description, and optional tags
   * @returns Quality analysis with score, issues, and suggestions
   */
  @Post('check')
  async checkQuality(@Body() dto: CheckTopicQualityDto): Promise<TopicQualityResponseDto> {
    return this.qualityService.checkQuality(dto);
  }
}

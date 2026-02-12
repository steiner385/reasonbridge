/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TopicDuplicateDetectorService } from '../services/topic-duplicate-detector.service.js';
import type {
  CheckDuplicatesDto,
  DuplicateDetectionResultDto,
  SemanticAvailabilityDto,
} from './dto/topic-duplicate.dto.js';

/**
 * Controller for topic duplicate detection API
 * Feature 016: Topic Management (T221)
 *
 * Provides endpoints for semantic similarity analysis of topics
 * to enhance duplicate detection beyond trigram matching.
 */
@Controller('topic-duplicate')
export class TopicDuplicateController {
  constructor(private readonly duplicateDetector: TopicDuplicateDetectorService) {}

  /**
   * Analyze candidate topics for semantic similarity
   *
   * Takes candidates identified by trigram matching in the discussion service
   * and enhances similarity scores using AI embeddings.
   *
   * @param dto - The title, description, and candidates to check
   * @returns Duplicate analysis results with enhanced scores
   */
  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async analyzeDuplicates(@Body() dto: CheckDuplicatesDto): Promise<DuplicateDetectionResultDto> {
    return this.duplicateDetector.analyzeCandidates(dto.title, dto.description, dto.candidates);
  }

  /**
   * Check if semantic analysis is available
   *
   * Useful for the discussion service to determine whether to call
   * the semantic analysis endpoint or fall back to trigram-only.
   *
   * @returns Availability status
   */
  @Get('availability')
  async checkAvailability(): Promise<SemanticAvailabilityDto> {
    const available = await this.duplicateDetector.isSemanticAnalysisAvailable();
    return {
      available,
      reason: available ? undefined : 'OpenAI API key not configured',
    };
  }
}

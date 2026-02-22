/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { GroomingDetectorService } from '../services/grooming-detector.service.js';
import type {
  GroomingDetectionResult,
  DetailedGroomingAnalysis,
} from '../services/grooming-detector.service.js';
import { AnalyzeContentDto } from './dto/analyze-content.dto.js';

/**
 * Controller for grooming detection endpoints
 *
 * @remarks
 * This controller exposes the GroomingDetectorService functionality via REST API.
 * It provides two endpoints:
 * - `/ai/grooming/analyze` - Quick analysis returning detection result and recommendation
 * - `/ai/grooming/detailed` - Detailed analysis for moderator review
 *
 * These endpoints are called by the moderation-service's GroomingClientService
 * to integrate grooming detection into the content screening pipeline.
 *
 * @example
 * ```typescript
 * // Quick analysis
 * POST /ai/grooming/analyze
 * { "content": "Don't tell your parents about this" }
 * // Returns: { detected: true, patternType: "isolation_attempt", ... }
 *
 * // Detailed analysis for moderators
 * POST /ai/grooming/detailed
 * { "content": "How old are you? Are you alone?" }
 * // Returns: { allPatternsFound: [...], riskLevel: "high", ... }
 * ```
 */
@Controller('ai/grooming')
export class GroomingController {
  constructor(private readonly groomingDetector: GroomingDetectorService) {}

  /**
   * Analyze content for grooming patterns
   *
   * @param dto - Request containing content to analyze
   * @returns GroomingDetectionResult with detection status, confidence, and recommendations
   *
   * @remarks
   * This endpoint performs a quick analysis of the content and returns:
   * - Whether grooming patterns were detected
   * - Confidence score (0.0-1.0)
   * - Primary pattern type if detected
   * - Flagged phrases that triggered detection
   * - Recommended action (BLOCK, REVIEW, FLAG, or ALLOW)
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyze(@Body() dto: AnalyzeContentDto): Promise<GroomingDetectionResult> {
    return this.groomingDetector.analyze(dto.content);
  }

  /**
   * Get detailed grooming analysis for moderator review
   *
   * @param dto - Request containing content to analyze
   * @returns DetailedGroomingAnalysis with full pattern breakdown
   *
   * @remarks
   * This endpoint provides a more comprehensive analysis intended for
   * moderator review. It includes:
   * - All patterns found with their severity scores
   * - Risk level assessment (low, medium, high, critical)
   * - Moderator notes with pattern breakdown
   * - Original content and timestamp for audit purposes
   */
  @Post('detailed')
  @HttpCode(HttpStatus.OK)
  async detailed(@Body() dto: AnalyzeContentDto): Promise<DetailedGroomingAnalysis> {
    return this.groomingDetector.getDetailedAnalysis(dto.content);
  }
}

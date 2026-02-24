/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ContentScreeningService } from '../services/content-screening.service.js';
import type { ChildScreeningResult } from '../services/content-screening.service.js';

/**
 * Request body for child content screening
 */
interface ScreenContentRequest {
  /** The content to screen for child safety */
  content: string;
}

/**
 * Simplified response format for child content screening.
 * This is the format expected by ModerationClientService in discussion-service.
 */
interface ChildScreeningResponse {
  /** Overall child safety risk level */
  childSafetyRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  /** Grooming detection details, if available */
  groomingDetection?: {
    detected: boolean;
    confidence: number;
    patternType: string | null;
    flaggedPhrases: string[];
    recommendedAction: 'BLOCK' | 'REVIEW' | 'FLAG' | 'ALLOW';
    explanation: string;
  };
}

/**
 * Controller for child content safety operations.
 *
 * @remarks
 * This controller exposes endpoints for screening content posted by or visible
 * to minor users. It integrates with the ContentScreeningService which combines
 * grooming detection (via ai-service) with tone analysis to determine child
 * safety risk levels.
 *
 * All endpoints are prefixed with `/moderation/child-content`.
 *
 * @example
 * ```typescript
 * // POST /moderation/child-content/screen
 * const response = await fetch('/moderation/child-content/screen', {
 *   method: 'POST',
 *   body: JSON.stringify({ content: 'Message text to analyze' })
 * });
 * const result = await response.json();
 * // result: { childSafetyRisk: 'none' | 'low' | 'medium' | 'high' | 'critical', groomingDetection?: {...} }
 * ```
 */
@Controller('moderation/child-content')
export class ChildContentController {
  private readonly logger = new Logger(ChildContentController.name);

  constructor(private readonly contentScreeningService: ContentScreeningService) {}

  /**
   * Screen content for child safety.
   *
   * @param body - Request body containing content to screen
   * @returns Child screening result with safety risk level and grooming detection
   *
   * @remarks
   * This endpoint performs:
   * 1. Grooming pattern detection via ai-service
   * 2. Tone analysis for inflammatory content
   * 3. Combined risk assessment returning a child safety risk level
   *
   * Risk levels:
   * - `critical`: BLOCK recommended (severe grooming patterns)
   * - `high`: REVIEW recommended (moderate grooming patterns)
   * - `medium`: FLAG recommended (low grooming or high inflammatory tone)
   * - `low`: Minor concerns detected
   * - `none`: Content appears safe
   */
  @Post('screen')
  @HttpCode(HttpStatus.OK)
  async screenContent(@Body() body: ScreenContentRequest): Promise<ChildScreeningResponse> {
    const { content } = body;

    if (!content || typeof content !== 'string') {
      this.logger.warn('Invalid content received for child screening');
      return { childSafetyRisk: 'none' };
    }

    try {
      // Generate a unique content ID for tracking
      const contentId = `screen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Perform full child content screening
      const result: ChildScreeningResult =
        await this.contentScreeningService.screenContentForChildren(contentId, content);

      // Return simplified response for client consumption
      return {
        childSafetyRisk: result.childSafetyRisk,
        groomingDetection: result.groomingDetection,
      };
    } catch (error) {
      // Log error and return safe default
      this.logger.error('Failed to screen content for children', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Default to safe response on error to allow graceful degradation
      return { childSafetyRisk: 'none' };
    }
  }
}

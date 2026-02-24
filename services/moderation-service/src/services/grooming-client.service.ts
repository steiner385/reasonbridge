/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Types of grooming patterns that can be detected
 */
export type GroomingPatternType =
  | 'isolation_attempt'
  | 'secrecy_request'
  | 'inappropriate_contact'
  | 'age_probing'
  | 'gift_offering'
  | 'excessive_flattery'
  | 'boundary_testing';

/**
 * Result of grooming pattern analysis
 */
export interface GroomingDetectionResult {
  detected: boolean;
  confidence: number;
  patternType: GroomingPatternType | null;
  flaggedPhrases: string[];
  recommendedAction: 'BLOCK' | 'REVIEW' | 'FLAG' | 'ALLOW';
  explanation: string;
}

/**
 * Pattern match details for detailed analysis
 */
export interface PatternMatch {
  type: GroomingPatternType;
  match: string;
  severity: number;
}

/**
 * Detailed analysis result for moderator review
 */
export interface DetailedGroomingAnalysis {
  allPatternsFound: PatternMatch[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  moderatorNotes: string;
  originalContent: string;
  timestamp: Date;
}

/**
 * HTTP client service for communicating with the ai-service's grooming detection endpoints.
 *
 * @remarks
 * This service acts as a client to the ai-service, making HTTP calls to the
 * grooming detection endpoints. It is used by the ContentScreeningService
 * to integrate grooming detection into the content screening pipeline.
 *
 * The service communicates with:
 * - POST /ai/grooming/analyze - Quick analysis for content blocking decisions
 * - POST /ai/grooming/detailed - Full analysis for moderator review
 *
 * @example
 * ```typescript
 * const result = await groomingClient.analyzeForGrooming("Don't tell your parents");
 * if (result.recommendedAction === 'BLOCK') {
 *   // Block content from child-accessible topic
 * }
 * ```
 */
@Injectable()
export class GroomingClientService {
  private readonly aiServiceUrl: string;

  constructor(private readonly httpService: HttpService) {
    // Default to localhost for development, can be overridden via environment
    this.aiServiceUrl = process.env['AI_SERVICE_URL'] || 'http://localhost:3002';
  }

  /**
   * Analyze content for grooming patterns.
   *
   * @param content - The text content to analyze
   * @returns GroomingDetectionResult with detection status and recommendations
   * @throws HttpException if the request fails or returns invalid data
   */
  async analyzeForGrooming(content: string): Promise<GroomingDetectionResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<GroomingDetectionResult>(`${this.aiServiceUrl}/ai/grooming/analyze`, {
          content,
        }),
      );

      if (!response.data) {
        throw new HttpException('Invalid response from grooming analysis', HttpStatus.BAD_GATEWAY);
      }

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to analyze content for grooming', HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * Get detailed grooming analysis for moderator review.
   *
   * @param content - The text content to analyze
   * @returns DetailedGroomingAnalysis with full pattern breakdown
   * @throws HttpException if the request fails or returns invalid data
   */
  async getDetailedAnalysis(content: string): Promise<DetailedGroomingAnalysis> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<DetailedGroomingAnalysis>(
          `${this.aiServiceUrl}/ai/grooming/detailed`,
          { content },
        ),
      );

      if (!response.data) {
        throw new HttpException(
          'Invalid response from detailed grooming analysis',
          HttpStatus.BAD_GATEWAY,
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to get detailed grooming analysis', HttpStatus.BAD_GATEWAY);
    }
  }
}

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ResponseAnalyzerService } from '../services/response-analyzer.service.js';
import type { AnalysisResult } from '../services/response-analyzer.service.js';
import { SemanticCacheService, RedisCacheService, computeContentHash } from '../cache/index.js';
import {
  RequestFeedbackDto,
  FeedbackResponseDto,
  DismissFeedbackDto,
  FeedbackSensitivity,
  PreviewFeedbackDto,
  PreviewFeedbackResultDto,
  PreviewFeedbackResponseDto,
} from './dto/index.js';
import { Prisma } from '@prisma/client';

/** Critical feedback types that should block posting */
const CRITICAL_TYPES = ['INFLAMMATORY', 'FALLACY'] as const;

/** Confidence threshold to consider a critical type as blocking */
const CRITICAL_CONFIDENCE_THRESHOLD = 0.75;

/**
 * Service for handling AI-generated feedback on responses
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzer: ResponseAnalyzerService,
    private readonly semanticCache: SemanticCacheService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  /**
   * Request AI-generated feedback for a response
   * @param dto Request containing responseId, content, and optional sensitivity level
   * @returns Created feedback record
   */
  async requestFeedback(dto: RequestFeedbackDto): Promise<FeedbackResponseDto> {
    // Verify the response exists
    const response = await this.prisma.response.findUnique({
      where: { id: dto.responseId },
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${dto.responseId} not found`);
    }

    // Get cached feedback or generate new analysis
    const aiAnalysis = await this.semanticCache.getOrAnalyze(
      dto.content,
      () => this.analyzer.analyzeContent(dto.content),
      response.topicId,
    );

    // Apply sensitivity filtering
    const sensitivity = dto.sensitivity ?? FeedbackSensitivity.MEDIUM;
    const minThreshold = this.getConfidenceThreshold(sensitivity);
    const shouldDisplay = aiAnalysis.confidenceScore >= minThreshold;

    // Store feedback in database
    const feedback = await this.prisma.feedback.create({
      data: {
        responseId: dto.responseId,
        type: aiAnalysis.type,
        subtype: aiAnalysis.subtype ?? null,
        suggestionText: aiAnalysis.suggestionText,
        reasoning: aiAnalysis.reasoning,
        confidenceScore: new Prisma.Decimal(aiAnalysis.confidenceScore),
        educationalResources: aiAnalysis.educationalResources ?? null,
        displayedToUser: shouldDisplay,
        userAcknowledged: false,
        userRevised: false,
      },
    });

    return this.mapToResponseDto(feedback);
  }

  /**
   * Get feedback by ID
   * @param id Feedback UUID
   * @returns Feedback record
   * @throws NotFoundException if feedback not found
   */
  async getFeedbackById(id: string): Promise<FeedbackResponseDto> {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    return this.mapToResponseDto(feedback);
  }

  /**
   * Dismiss feedback
   * Marks feedback as dismissed with optional reason
   * @param id Feedback UUID
   * @param dto Dismissal information (optional reason)
   * @returns Updated feedback record
   * @throws NotFoundException if feedback not found
   */
  async dismissFeedback(id: string, dto: DismissFeedbackDto): Promise<FeedbackResponseDto> {
    // Verify the feedback exists
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    // Update dismissal tracking fields
    const updatedFeedback = await this.prisma.feedback.update({
      where: { id },
      data: {
        dismissedAt: new Date(),
        dismissalReason: dto.dismissalReason ?? null,
      },
    });

    return this.mapToResponseDto(updatedFeedback);
  }

  /**
   * Get real-time preview feedback for draft content.
   * Unlike requestFeedback, this does NOT:
   * - Require an existing responseId (content hasn't been posted yet)
   * - Store the feedback in the database
   * - Track acknowledgment or revision status
   *
   * @param dto Preview feedback request with content and optional sensitivity
   * @returns All detected feedback items with readiness indicator
   */
  async previewFeedback(
    dto: PreviewFeedbackDto | { content: string; sensitivity?: FeedbackSensitivity },
  ): Promise<PreviewFeedbackResultDto> {
    const startTime = Date.now();
    const sensitivity = dto.sensitivity ?? FeedbackSensitivity.MEDIUM;
    const threshold = this.getConfidenceThreshold(sensitivity);

    let analysisResults: AnalysisResult[];

    // Try Redis cache first for fast response
    const contentHash = computeContentHash(dto.content);
    try {
      const cached = await this.redisCache?.getFeedback(contentHash);
      if (cached) {
        // Cache hit - use cached result (wrapped in array for consistency)
        analysisResults = [cached];
      } else {
        // Cache miss - run full analysis
        analysisResults = await this.analyzer.analyzeContentFull(dto.content);
        // Cache the primary result asynchronously (don't await to keep response fast)
        if (analysisResults[0] && this.redisCache) {
          this.redisCache.setFeedback(contentHash, analysisResults[0]).catch((err) => {
            this.logger.warn('Failed to cache preview feedback', err);
          });
        }
      }
    } catch (err) {
      // Redis error - fall back to fresh analysis (graceful degradation)
      this.logger.warn('Redis cache error, falling back to fresh analysis', err);
      analysisResults = await this.analyzer.analyzeContentFull(dto.content);
    }

    // Map to response DTOs with shouldDisplay flag based on sensitivity threshold
    const feedback: PreviewFeedbackResponseDto[] = analysisResults.map((result) => ({
      type: result.type,
      subtype: result.subtype,
      suggestionText: result.suggestionText,
      reasoning: result.reasoning,
      confidenceScore: result.confidenceScore,
      educationalResources: result.educationalResources,
      shouldDisplay: result.confidenceScore >= threshold,
    }));

    // Determine if content is ready to post (no critical issues above threshold)
    const hasCriticalIssues = analysisResults.some(
      (result) =>
        CRITICAL_TYPES.includes(result.type as (typeof CRITICAL_TYPES)[number]) &&
        result.confidenceScore >= CRITICAL_CONFIDENCE_THRESHOLD,
    );
    const readyToPost = !hasCriticalIssues;

    // Find primary feedback (highest confidence non-AFFIRMATION that should display)
    const nonAffirmations = feedback.filter((f) => f.type !== 'AFFIRMATION' && f.shouldDisplay);
    const primary =
      nonAffirmations.length > 0
        ? nonAffirmations.sort((a, b) => b.confidenceScore - a.confidenceScore)[0]
        : undefined;

    // Generate user-friendly summary message
    const summary = hasCriticalIssues
      ? 'Consider revising your response before posting.'
      : 'Looking good! Your response is ready to post.';

    return {
      feedback,
      primary,
      analysisTimeMs: Date.now() - startTime,
      readyToPost,
      summary,
    };
  }

  /**
   * Get minimum confidence threshold based on sensitivity level
   * @param sensitivity The sensitivity level
   * @returns Minimum confidence threshold (0.0-1.0)
   */
  private getConfidenceThreshold(sensitivity: FeedbackSensitivity): number {
    switch (sensitivity) {
      case FeedbackSensitivity.LOW:
        return 0.5; // Show all feedback
      case FeedbackSensitivity.MEDIUM:
        return 0.7; // Show moderately confident feedback
      case FeedbackSensitivity.HIGH:
        return 0.85; // Show only high-confidence feedback
      default:
        return 0.7; // Default to MEDIUM
    }
  }

  /**
   * Map Prisma Feedback to FeedbackResponseDto
   */
  private mapToResponseDto(feedback: any): FeedbackResponseDto {
    return {
      id: feedback.id,
      responseId: feedback.responseId,
      type: feedback.type,
      subtype: feedback.subtype,
      suggestionText: feedback.suggestionText,
      reasoning: feedback.reasoning,
      confidenceScore: Number(feedback.confidenceScore),
      educationalResources: feedback.educationalResources,
      displayedToUser: feedback.displayedToUser,
      createdAt: feedback.createdAt,
    };
  }
}

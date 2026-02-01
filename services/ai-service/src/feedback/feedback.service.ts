import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ResponseAnalyzerService } from '../services/response-analyzer.service.js';
import { FeedbackCacheService } from '../cache/feedback-cache.service.js';
import {
  RequestFeedbackDto,
  FeedbackResponseDto,
  DismissFeedbackDto,
  FeedbackSensitivity,
} from './dto/index.js';
import { Prisma } from '@prisma/client';

/**
 * Service for handling AI-generated feedback on responses
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzer: ResponseAnalyzerService,
    private readonly feedbackCache: FeedbackCacheService,
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

    const sensitivity = dto.sensitivity ?? FeedbackSensitivity.MEDIUM;

    // Check cache first
    const cachedResult = await this.feedbackCache.getCachedFeedback(dto.content, sensitivity);

    let aiAnalysis;
    if (cachedResult) {
      this.logger.debug(`Using cached feedback for response ${dto.responseId}`);
      aiAnalysis = {
        type: cachedResult.type,
        subtype: cachedResult.subtype ?? undefined,
        suggestionText: cachedResult.suggestionText,
        reasoning: cachedResult.reasoning,
        confidenceScore: cachedResult.confidenceScore,
        educationalResources: cachedResult.educationalResources ?? undefined,
      };
    } else {
      // Generate AI feedback using analyzers
      aiAnalysis = await this.generateFeedback(dto.content);

      // Cache the result for future requests
      await this.feedbackCache.cacheFeedback(dto.content, sensitivity, {
        type: aiAnalysis.type,
        subtype: aiAnalysis.subtype ?? null,
        suggestionText: aiAnalysis.suggestionText,
        reasoning: aiAnalysis.reasoning,
        confidenceScore: aiAnalysis.confidenceScore,
        educationalResources: aiAnalysis.educationalResources ?? null,
      });
    }

    // Apply sensitivity filtering
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
   * Generate feedback using comprehensive analysis
   * Analyzes emotional tone, logical fallacies, and clarity
   * @param content The response content to analyze
   * @returns AI-generated feedback analysis
   */
  private async generateFeedback(content: string) {
    // Use the response analyzer to perform comprehensive analysis
    // This analyzes tone, fallacies, and clarity in parallel
    return this.analyzer.analyzeContent(content);
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

import { Injectable, NotFoundException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ResponseAnalyzerService } from '../services/response-analyzer.service.js';
import type { AnalysisResult } from '../services/response-analyzer.service.js';
import { SemanticCacheService, RedisCacheService, computeContentHash } from '../cache/index.js';
import { BedrockService } from '../ai/bedrock.service.js';
import {
  RequestFeedbackDto,
  FeedbackResponseDto,
  DismissFeedbackDto,
  FeedbackSensitivity,
  PreviewFeedbackDto,
  PreviewFeedbackResultDto,
  PreviewFeedbackResponseDto,
} from './dto/index.js';
import { Prisma, FeedbackType } from '@prisma/client';

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
    private readonly bedrockService: BedrockService,
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
   * Get AI-powered preview feedback using Bedrock.
   * This method uses Claude to analyze content for nuanced issues that
   * regex patterns might miss, such as subtle dismissiveness, condescension,
   * or context-dependent tone problems.
   *
   * @param dto Preview feedback request with content and optional sensitivity
   * @returns AI-analyzed feedback items with readiness indicator
   */
  async previewFeedbackAI(dto: PreviewFeedbackDto): Promise<PreviewFeedbackResultDto> {
    const startTime = Date.now();
    const sensitivity = dto.sensitivity ?? FeedbackSensitivity.MEDIUM;
    const threshold = this.getConfidenceThreshold(sensitivity);

    // Check if Bedrock is available
    const isReady = await this.bedrockService.isReady();
    if (!isReady) {
      this.logger.warn('Bedrock not available for AI feedback analysis');
      // Fallback to regex-based analysis
      return this.previewFeedback(dto);
    }

    try {
      // Try Redis cache first
      const contentHash = computeContentHash(`ai:${dto.content}`);
      const cached = await this.redisCache?.getFeedback(contentHash);

      let analysisResults: AnalysisResult[];

      if (cached) {
        analysisResults = [cached];
      } else {
        // Call Bedrock to analyze content
        const response = await this.bedrockService.complete({
          systemPrompt: `You are an expert content moderator for online discussions. Analyze the user's draft response for potential issues:

1. **Inflammatory language**: Personal attacks, hostile tone, dismissiveness
2. **Logical fallacies**: Strawman, ad hominem, false dichotomy, slippery slope, etc.
3. **Bias**: Confirmation bias, selection bias, implicit bias
4. **Unsourced claims**: Statistical claims or factual assertions without evidence
5. **Positive aspects**: Constructive engagement, good evidence, respectful tone

For each issue found, provide:
- type: INFLAMMATORY | FALLACY | BIAS | UNSOURCED | AFFIRMATION
- subtype: Specific issue (e.g., "ad_hominem", "strawman", "statistical_claim")
- suggestion: Actionable advice for improvement
- reasoning: Brief explanation of the issue
- confidence: 0.0-1.0 score

Return JSON array of feedback items:
[{
  "type": "INFLAMMATORY",
  "subtype": "dismissive_language",
  "suggestion": "Consider rephrasing to focus on ideas rather than people",
  "reasoning": "The phrase 'these people are stupid' attacks individuals rather than arguments",
  "confidence": 0.85
}]

If the content is constructive and well-reasoned, return AFFIRMATION type.`,
          messages: [
            {
              role: 'user',
              content: `Analyze this draft response:\n\n${dto.content}`,
            },
          ],
          maxTokens: 2048,
          temperature: 0.2,
        });

        // Parse JSON response
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          this.logger.warn('Failed to parse AI feedback response, falling back to regex');
          return this.previewFeedback(dto);
        }

        const aiResults = JSON.parse(jsonMatch[0]) as Array<{
          type: string;
          subtype?: string;
          suggestion: string;
          reasoning: string;
          confidence: number;
        }>;

        // Map to AnalysisResult format
        analysisResults = aiResults.map((result) => ({
          type: result.type as FeedbackType,
          subtype: result.subtype,
          suggestionText: result.suggestion,
          reasoning: result.reasoning,
          confidenceScore: result.confidence,
          educationalResources: this.getEducationalResources(result.type as FeedbackType),
        }));

        // Cache the primary result
        if (analysisResults[0] && this.redisCache) {
          this.redisCache.setFeedback(contentHash, analysisResults[0]).catch((err) => {
            this.logger.warn('Failed to cache AI feedback', err);
          });
        }
      }

      // Map to response DTOs
      const feedback: PreviewFeedbackResponseDto[] = analysisResults.map((result) => ({
        type: result.type,
        subtype: result.subtype,
        suggestionText: result.suggestionText,
        reasoning: result.reasoning,
        confidenceScore: result.confidenceScore,
        educationalResources: result.educationalResources,
        shouldDisplay: result.confidenceScore >= threshold,
      }));

      // Determine if content is ready to post
      const hasCriticalIssues = analysisResults.some(
        (result) =>
          CRITICAL_TYPES.includes(result.type as (typeof CRITICAL_TYPES)[number]) &&
          result.confidenceScore >= CRITICAL_CONFIDENCE_THRESHOLD,
      );
      const readyToPost = !hasCriticalIssues;

      // Find primary feedback
      const nonAffirmations = feedback.filter((f) => f.type !== 'AFFIRMATION' && f.shouldDisplay);
      const primary =
        nonAffirmations.length > 0
          ? nonAffirmations.sort((a, b) => b.confidenceScore - a.confidenceScore)[0]
          : undefined;

      const summary = hasCriticalIssues
        ? 'AI detected potential issues. Consider revising before posting.'
        : 'AI analysis complete. Your response looks good!';

      return {
        feedback,
        primary,
        analysisTimeMs: Date.now() - startTime,
        readyToPost,
        summary,
      };
    } catch (error) {
      this.logger.error('AI feedback analysis failed, falling back to regex', error);
      return this.previewFeedback(dto);
    }
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
   * Get educational resources based on feedback type
   */
  private getEducationalResources(type: FeedbackType): Record<string, unknown> {
    const resources: Record<FeedbackType, Record<string, unknown>> = {
      INFLAMMATORY: {
        links: [
          {
            title: 'Constructive Communication Guide',
            url: 'https://en.wikipedia.org/wiki/Nonviolent_Communication',
          },
          {
            title: 'Avoiding Personal Attacks',
            url: 'https://en.wikipedia.org/wiki/Ad_hominem',
          },
        ],
      },
      FALLACY: {
        links: [
          {
            title: 'Logical Fallacies Guide',
            url: 'https://en.wikipedia.org/wiki/List_of_fallacies',
          },
          {
            title: 'Critical Thinking',
            url: 'https://en.wikipedia.org/wiki/Critical_thinking',
          },
        ],
      },
      BIAS: {
        links: [
          {
            title: 'Cognitive Biases',
            url: 'https://en.wikipedia.org/wiki/List_of_cognitive_biases',
          },
          {
            title: 'Confirmation Bias',
            url: 'https://en.wikipedia.org/wiki/Confirmation_bias',
          },
        ],
      },
      UNSOURCED: {
        links: [
          {
            title: 'Evidence-Based Discussion',
            url: 'https://en.wikipedia.org/wiki/Evidence-based_practice',
          },
          {
            title: 'Citing Sources',
            url: 'https://en.wikipedia.org/wiki/Citation',
          },
        ],
      },
      AFFIRMATION: { links: [] },
    };

    return resources[type];
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

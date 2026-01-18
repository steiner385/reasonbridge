import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ResponseAnalyzerService } from '../services/response-analyzer.service.js';
import { RequestFeedbackDto, FeedbackResponseDto } from './dto/index.js';
import { Prisma } from '@unite-discord/db-models';

/**
 * Service for handling AI-generated feedback on responses
 */
@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzer: ResponseAnalyzerService,
  ) {}

  /**
   * Request AI-generated feedback for a response
   * @param dto Request containing responseId and content
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

    // Generate AI feedback using Bedrock
    const aiAnalysis = await this.generateFeedback(dto.content);

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
        displayedToUser: true,
        userAcknowledged: false,
        userRevised: false,
      },
    });

    return this.mapToResponseDto(feedback);
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

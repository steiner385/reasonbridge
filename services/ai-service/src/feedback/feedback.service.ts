import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BedrockService } from '../ai/bedrock.service.js';
import { RequestFeedbackDto, FeedbackResponseDto } from './dto/index.js';
import { FeedbackType, Prisma } from '@unite-discord/db-models';

/**
 * Service for handling AI-generated feedback on responses
 */
@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bedrock: BedrockService,
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
   * Generate feedback using AI (stub implementation for now)
   * @param content The response content to analyze
   * @returns AI-generated feedback analysis
   */
  private async generateFeedback(content: string): Promise<{
    type: FeedbackType;
    subtype?: string;
    suggestionText: string;
    reasoning: string;
    confidenceScore: number;
    educationalResources?: any;
  }> {
    // For now, use the stub Bedrock service
    // In the future, this will make actual AI calls to analyze the content
    await this.bedrock.analyzeContent(content);

    // Stub implementation - returns a generic affirmation
    // This will be replaced with actual AI analysis in future tasks
    return {
      type: FeedbackType.AFFIRMATION,
      suggestionText: 'Your response contributes to constructive dialogue.',
      reasoning:
        'This is a stub implementation. Actual AI analysis will be implemented in future tasks.',
      confidenceScore: 0.5,
    };
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

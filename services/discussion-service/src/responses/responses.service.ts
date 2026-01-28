import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CommonGroundTriggerService } from '../services/common-ground-trigger.service.js';
import { CreateResponseDto } from './dto/create-response.dto.js';
import { UpdateResponseDto } from './dto/update-response.dto.js';
import { ResponseDetailDto } from './dto/response-detail.dto.js';
import type { ResponseDto, CitedSourceDto, UserSummaryDto } from './dto/response.dto.js';
import { DiscussionLogger } from '../utils/logger.js';
import { validateCitationUrl } from '../utils/ssrf-validator.js';

@Injectable()
export class ResponsesService {
  private readonly logger = new DiscussionLogger('ResponsesService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly commonGroundTrigger: CommonGroundTriggerService,
  ) {}

  /**
   * Get all responses for a discussion topic
   * @param topicId - The ID of the topic to get responses for
   * @returns Array of responses for the topic
   */
  async getResponsesForTopic(topicId: string): Promise<ResponseDto[]> {
    // Verify topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Fetch all responses for the topic
    const responses = await this.prisma.response.findMany({
      where: { topicId },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
          },
        },
        propositions: {
          include: {
            proposition: {
              select: {
                id: true,
                statement: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Order by creation time, oldest first
      },
    });

    // Map to ResponseDto array
    return responses.map((response) => this.mapToResponseDto(response));
  }

  /**
   * Create a new response to a discussion topic
   * @param topicId - The ID of the topic to respond to
   * @param authorId - The ID of the user creating the response
   * @param createResponseDto - The response data
   * @returns The created response
   */
  async createResponse(
    topicId: string,
    authorId: string,
    createResponseDto: CreateResponseDto,
  ): Promise<ResponseDto> {
    // Validate input
    if (!createResponseDto.content || createResponseDto.content.trim().length < 10) {
      throw new BadRequestException('Response content must be at least 10 characters');
    }

    if (createResponseDto.content.length > 10000) {
      throw new BadRequestException('Response content must not exceed 10000 characters');
    }

    // Verify topic exists and is active or seeding
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true, status: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    if (topic.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot add responses to archived topics');
    }

    // Verify parent response exists if parentId is provided
    if (createResponseDto.parentId) {
      const parentResponse = await this.prisma.response.findUnique({
        where: { id: createResponseDto.parentId },
        select: { id: true, topicId: true },
      });

      if (!parentResponse) {
        throw new NotFoundException(
          `Parent response with ID ${createResponseDto.parentId} not found`,
        );
      }

      // Verify parent response belongs to the same topic
      if (parentResponse.topicId !== topicId) {
        throw new BadRequestException('Parent response must belong to the same topic');
      }
    }

    // Transform citedSources to JSON format if provided
    let citedSourcesJson: any = null;
    if (createResponseDto.citedSources && createResponseDto.citedSources.length > 0) {
      citedSourcesJson = createResponseDto.citedSources.map((url) => ({
        url,
        title: null,
        extractedAt: new Date().toISOString(),
      }));
    }

    // Create the response
    const response = await this.prisma.response.create({
      data: {
        topicId,
        authorId,
        parentId: createResponseDto.parentId ?? null,
        content: createResponseDto.content.trim(),
        citedSources: citedSourcesJson,
        containsOpinion: createResponseDto.containsOpinion ?? false,
        containsFactualClaims: createResponseDto.containsFactualClaims ?? false,
        status: 'VISIBLE',
        revisionCount: 0,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // Handle proposition associations if provided
    if (createResponseDto.propositionIds && createResponseDto.propositionIds.length > 0) {
      // Create ResponseProposition junction records
      await this.prisma.responseProposition.createMany({
        data: createResponseDto.propositionIds.map((propositionId) => ({
          responseId: response.id,
          propositionId,
        })),
        skipDuplicates: true,
      });
    }

    // Increment topic response count
    await this.prisma.discussionTopic.update({
      where: { id: topicId },
      data: {
        responseCount: {
          increment: 1,
        },
      },
    });

    // Check and trigger common ground analysis if needed
    // This is fire-and-forget - we don't wait for it to complete
    this.commonGroundTrigger.checkAndTrigger(topicId).catch((error) => {
      // Error is already logged in the service, but log here too for visibility
      this.logger.error('Failed to check/trigger common ground analysis', error, {
        metadata: { topicId },
      });
    });

    // Fetch the complete response with all relations
    const completeResponse = await this.prisma.response.findUnique({
      where: { id: response.id },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
          },
        },
        propositions: {
          include: {
            proposition: {
              select: {
                id: true,
                statement: true,
              },
            },
          },
        },
      },
    });

    // Map to ResponseDto
    return this.mapToResponseDto(completeResponse!);
  }

  /**
   * Update an existing response
   * @param responseId - The ID of the response to update
   * @param authorId - The ID of the user requesting the update (for authorization)
   * @param updateResponseDto - The updated response data
   * @returns The updated response
   */
  async updateResponse(
    responseId: string,
    authorId: string,
    updateResponseDto: UpdateResponseDto,
  ): Promise<ResponseDto> {
    // Fetch the existing response
    const existingResponse = await this.prisma.response.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        authorId: true,
        topicId: true,
        status: true,
        topic: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!existingResponse) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    // Authorization: Only the author can edit their response
    if (existingResponse.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own responses');
    }

    // Cannot edit hidden or removed responses
    if (existingResponse.status === 'HIDDEN' || existingResponse.status === 'REMOVED') {
      throw new BadRequestException(
        `Cannot edit responses with status: ${existingResponse.status}`,
      );
    }

    // Cannot edit responses in archived topics
    if (existingResponse.topic.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot edit responses in archived topics');
    }

    // Validate content if provided
    if (updateResponseDto.content !== undefined) {
      if (!updateResponseDto.content || updateResponseDto.content.trim().length < 10) {
        throw new BadRequestException('Response content must be at least 10 characters');
      }

      if (updateResponseDto.content.length > 10000) {
        throw new BadRequestException('Response content must not exceed 10000 characters');
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (updateResponseDto.content !== undefined) {
      updateData.content = updateResponseDto.content.trim();
    }

    if (updateResponseDto.containsOpinion !== undefined) {
      updateData.containsOpinion = updateResponseDto.containsOpinion;
    }

    if (updateResponseDto.containsFactualClaims !== undefined) {
      updateData.containsFactualClaims = updateResponseDto.containsFactualClaims;
    }

    if (updateResponseDto.citedSources !== undefined) {
      updateData.citedSources =
        updateResponseDto.citedSources.length > 0
          ? updateResponseDto.citedSources.map((url) => ({
              url,
              title: null,
              extractedAt: new Date().toISOString(),
            }))
          : null;
    }

    // Increment revision count
    updateData.revisionCount = {
      increment: 1,
    };

    // Update the response
    const updatedResponse = await this.prisma.response.update({
      where: { id: responseId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
          },
        },
        propositions: {
          include: {
            proposition: {
              select: {
                id: true,
                statement: true,
              },
            },
          },
        },
      },
    });

    // Handle proposition associations if provided
    if (updateResponseDto.propositionIds !== undefined) {
      // Delete existing associations
      await this.prisma.responseProposition.deleteMany({
        where: { responseId },
      });

      // Create new associations if provided
      if (updateResponseDto.propositionIds.length > 0) {
        await this.prisma.responseProposition.createMany({
          data: updateResponseDto.propositionIds.map((propositionId) => ({
            responseId,
            propositionId,
          })),
          skipDuplicates: true,
        });
      }

      // Fetch updated response with new propositions
      const responseWithPropositions = await this.prisma.response.findUnique({
        where: { id: responseId },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
            },
          },
          propositions: {
            include: {
              proposition: {
                select: {
                  id: true,
                  statement: true,
                },
              },
            },
          },
        },
      });

      return this.mapToResponseDto(responseWithPropositions!);
    }

    // Map to ResponseDto
    return this.mapToResponseDto(updatedResponse);
  }

  /**
   * Map Prisma Response model to ResponseDto
   */
  private mapToResponseDto(response: any): ResponseDto {
    const citedSources: CitedSourceDto[] | undefined = response.citedSources
      ? Array.isArray(response.citedSources)
        ? response.citedSources
        : []
      : undefined;

    const author: UserSummaryDto | undefined = response.author
      ? {
          id: response.author.id,
          displayName: response.author.displayName,
        }
      : undefined;

    return {
      id: response.id,
      content: response.content,
      authorId: response.authorId,
      parentId: response.parentId ?? null,
      author,
      citedSources,
      containsOpinion: response.containsOpinion,
      containsFactualClaims: response.containsFactualClaims,
      propositions: response.propositions
        ? response.propositions.map((rp: any) => ({
            id: rp.proposition.id,
            statement: rp.proposition.statement,
            relevanceScore: rp.relevanceScore ? Number(rp.relevanceScore) : undefined,
          }))
        : undefined,
      status: response.status.toLowerCase(),
      revisionCount: response.revisionCount,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }

  // ==================== Feature 009: Discussion Participation ====================

  /**
   * T037 [US2] - Create a response for a discussion
   *
   * Requirements:
   * - FR-007: Response 50-25000 chars, max 10 citations
   * - FR-005: Validate citations with SSRF defense
   * - Update discussion metrics (responseCount, participantCount, lastActivityAt)
   * - Update/create ParticipantActivity record
   *
   * @param userId - The ID of the user creating the response
   * @param dto - Response creation data
   * @returns The created response
   */
  async createResponseForDiscussion(
    userId: string,
    dto: CreateResponseDto,
  ): Promise<ResponseDetailDto> {
    // Verify discussion exists and is active
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: dto.discussionId },
      select: {
        id: true,
        topicId: true,
        status: true,
      },
    });

    if (!discussion) {
      throw new NotFoundException(`Discussion with ID ${dto.discussionId} not found`);
    }

    if (discussion.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot add responses to non-active discussions');
    }

    // Verify parent response if specified (for threading in Phase 5)
    if (dto.parentResponseId) {
      const parentResponse = await this.prisma.response.findUnique({
        where: { id: dto.parentResponseId },
        select: {
          id: true,
          discussionId: true,
          deletedAt: true,
        },
      });

      if (!parentResponse) {
        throw new NotFoundException(`Parent response with ID ${dto.parentResponseId} not found`);
      }

      if (parentResponse.discussionId !== dto.discussionId) {
        throw new BadRequestException('Parent response must belong to the same discussion');
      }

      if (parentResponse.deletedAt) {
        throw new BadRequestException('Cannot reply to deleted responses');
      }
    }

    // FR-005: Validate citations with SSRF defense
    const validatedCitations: Array<{
      originalUrl: string;
      normalizedUrl: string;
      title: string | null;
      resolvedIp: string | null;
    }> = [];

    if (dto.citations && dto.citations.length > 0) {
      if (dto.citations.length > 10) {
        throw new BadRequestException('Maximum 10 citations allowed per response');
      }

      for (const citation of dto.citations) {
        const validation = await validateCitationUrl(citation.url);

        if (!validation.safe) {
          this.logger.ssrfBlocked(citation.url, validation.threat || 'UNKNOWN', { userId });
          throw new BadRequestException(`Citation URL blocked: ${validation.error}`);
        }

        validatedCitations.push({
          originalUrl: validation.originalUrl,
          normalizedUrl: validation.normalizedUrl,
          title: citation.title || null,
          resolvedIp: validation.resolvedIp || null,
        });
      }
    }

    // Create response and update metrics in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create response
      const response = await tx.response.create({
        data: {
          topicId: discussion.topicId,
          discussionId: dto.discussionId,
          authorId: userId,
          parentId: dto.parentResponseId || null,
          content: dto.content,
          version: 1,
          editCount: 0,
        },
      });

      // Create citations if present
      if (validatedCitations.length > 0) {
        await tx.citation.createMany({
          data: validatedCitations.map((citation) => ({
            responseId: response.id,
            originalUrl: citation.originalUrl,
            normalizedUrl: citation.normalizedUrl,
            title: citation.title,
            resolvedIp: citation.resolvedIp,
            validationStatus: 'UNVERIFIED',
          })),
        });
      }

      // T039: Update or create ParticipantActivity
      const existingActivity = await tx.participantActivity.findUnique({
        where: {
          discussionId_userId: {
            discussionId: dto.discussionId,
            userId,
          },
        },
      });

      if (existingActivity) {
        await tx.participantActivity.update({
          where: {
            discussionId_userId: {
              discussionId: dto.discussionId,
              userId,
            },
          },
          data: {
            responseCount: { increment: 1 },
            lastContributionAt: new Date(),
          },
        });
      } else {
        await tx.participantActivity.create({
          data: {
            discussionId: dto.discussionId,
            userId,
            responseCount: 1,
            lastContributionAt: new Date(),
          },
        });
      }

      // Update discussion metrics
      const participantCount = await tx.participantActivity.count({
        where: { discussionId: dto.discussionId },
      });

      await tx.discussion.update({
        where: { id: dto.discussionId },
        data: {
          responseCount: { increment: 1 },
          participantCount,
          lastContributionAt: new Date(),
        },
      });

      // Fetch created response with relations
      const createdResponse = await tx.response.findUniqueOrThrow({
        where: { id: response.id },
        include: {
          author: {
            select: { id: true, displayName: true, verificationLevel: true },
          },
          citations: true,
        },
      });

      return createdResponse;
    });

    this.logger.responsePosted(result.id, userId, dto.discussionId);

    // Map to ResponseDetailDto
    return {
      id: result.id,
      discussionId: result.discussionId!,
      content: result.content,
      author: {
        id: result.author.id,
        displayName: result.author.displayName,
        verificationLevel: result.author.verificationLevel,
      },
      parentResponseId: result.parentId,
      citations: result.citations.map((citation) => ({
        id: citation.id,
        originalUrl: citation.originalUrl,
        normalizedUrl: citation.normalizedUrl,
        title: citation.title,
        validationStatus: citation.validationStatus,
        validatedAt: citation.validatedAt?.toISOString() || null,
        createdAt: citation.createdAt.toISOString(),
      })),
      version: result.version,
      editCount: result.editCount,
      editedAt: result.editedAt?.toISOString() || null,
      deletedAt: result.deletedAt?.toISOString() || null,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }

  /**
   * T038 [US2] - Get all responses for a discussion with threading support
   *
   * Requirements:
   * - Exclude soft-deleted responses (deletedAt is not null)
   * - Include author info and citations
   * - Support pagination (Phase 9)
   * - Order by createdAt ascending (chronological)
   *
   * @param discussionId - The ID of the discussion
   * @returns Array of responses for the discussion
   */
  async getDiscussionResponses(discussionId: string): Promise<ResponseDetailDto[]> {
    // Verify discussion exists
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
      select: { id: true },
    });

    if (!discussion) {
      throw new NotFoundException(`Discussion with ID ${discussionId} not found`);
    }

    // Fetch all non-deleted responses
    const responses = await this.prisma.response.findMany({
      where: {
        discussionId,
        deletedAt: null, // Exclude soft-deleted responses
      },
      include: {
        author: {
          select: { id: true, displayName: true, verificationLevel: true },
        },
        citations: true,
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Map to ResponseDetailDto array
    return responses.map((response) => ({
      id: response.id,
      discussionId: response.discussionId!,
      content: response.content,
      author: {
        id: response.author.id,
        displayName: response.author.displayName,
      },
      parentResponseId: response.parentId,
      citations: response.citations.map((citation) => ({
        id: citation.id,
        originalUrl: citation.originalUrl,
        normalizedUrl: citation.normalizedUrl,
        title: citation.title,
        validationStatus: citation.validationStatus,
        validatedAt: citation.validatedAt?.toISOString() || null,
        createdAt: citation.createdAt.toISOString(),
      })),
      version: response.version,
      editCount: response.editCount,
      editedAt: response.editedAt?.toISOString() || null,
      deletedAt: response.deletedAt?.toISOString() || null,
      createdAt: response.createdAt.toISOString(),
      updatedAt: response.updatedAt.toISOString(),
      replyCount: response._count.replies,
    }));
  }
}

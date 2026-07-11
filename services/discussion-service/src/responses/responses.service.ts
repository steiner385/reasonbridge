/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CommonGroundTriggerService } from '../services/common-ground-trigger.service.js';
import { ModerationClientService } from '../clients/moderation-client.service.js';
import { CreateResponseDto } from './dto/create-response.dto.js';
import { UpdateResponseDto } from './dto/update-response.dto.js';
import { ResponseDetailDto } from './dto/response-detail.dto.js';
import type { ResponseDto, CitedSourceDto, UserSummaryDto } from './dto/response.dto.js';
import { getGravatarUrl } from '../dto/user-summary.dto.js';
import { DiscussionLogger } from '../utils/logger.js';
import { validateCitationUrl } from '../utils/ssrf-validator.js';
import { RESPONSE_CONSTRAINTS } from '../constants/index.js';
import { ResponseThreadingService } from './response-threading.service.js';
import type { ThreadedResponse } from './response-threading.service.js';
import { DiscussionGateway } from '../gateways/discussion.gateway.js';

// Re-export ThreadedResponse for consumers
export type { ThreadedResponse } from './response-threading.service.js';

@Injectable()
export class ResponsesService {
  private readonly logger = new DiscussionLogger('ResponsesService');

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CommonGroundTriggerService)
    private readonly commonGroundTrigger: CommonGroundTriggerService,
    @Inject(ResponseThreadingService)
    private readonly threadingService: ResponseThreadingService,
    @Optional() private readonly moderationClient?: ModerationClientService,
    @Optional() @Inject(DiscussionGateway) private readonly discussionGateway?: DiscussionGateway,
  ) {}

  /**
   * Get responses for a discussion topic with pagination
   * @param topicId - The ID of the topic to get responses for
   * @param options - Query options
   * @param options.includePendingReview - Include PENDING_REVIEW responses (for moderators)
   * @param options.limit - Maximum number of responses to return (default: 100, max: 500)
   * @param options.offset - Number of responses to skip (default: 0)
   * @returns Array of responses for the topic
   */
  async getResponsesForTopic(
    topicId: string,
    options: { includePendingReview?: boolean; limit?: number; offset?: number } = {},
  ): Promise<ResponseDto[]> {
    const { includePendingReview = false, limit = 100, offset = 0 } = options;
    // Enforce maximum limit to prevent excessive data fetching
    const safeLimit = Math.min(Math.max(1, limit), 500);
    const safeOffset = Math.max(0, offset);

    // Verify topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Build status filter: exclude PENDING_REVIEW unless explicitly included
    const statusFilter = includePendingReview
      ? undefined // No filter - include all statuses
      : { not: 'PENDING_REVIEW' as const };

    // Fetch responses for the topic with pagination
    const responses = await this.prisma.response.findMany({
      where: {
        topicId,
        ...(statusFilter && { status: statusFilter }),
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            email: true,
            verificationLevel: true,
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
      take: safeLimit,
      skip: safeOffset,
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
    if (
      !createResponseDto.content ||
      createResponseDto.content.trim().length < RESPONSE_CONSTRAINTS.MIN_LENGTH
    ) {
      throw new BadRequestException(
        `Response content must be at least ${RESPONSE_CONSTRAINTS.MIN_LENGTH} characters`,
      );
    }

    if (createResponseDto.content.length > RESPONSE_CONSTRAINTS.MAX_LENGTH) {
      throw new BadRequestException(
        `Response content must not exceed ${RESPONSE_CONSTRAINTS.MAX_LENGTH} characters`,
      );
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma Json field accepts any serializable value
    let citedSourcesJson: any = null;
    if (createResponseDto.citedSources && createResponseDto.citedSources.length > 0) {
      citedSourcesJson = createResponseDto.citedSources.map((url) => ({
        url,
        title: null,
        extractedAt: new Date().toISOString(),
      }));
    }

    // Check if author is a minor for content moderation
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { isMinor: true },
    });

    // Set status based on author type: minors get PENDING_REVIEW, adults get VISIBLE
    const responseStatus = author?.isMinor ? 'PENDING_REVIEW' : 'VISIBLE';

    // Create the response, its proposition links, and the topic stat updates
    // atomically so responseCount and participantCount cannot drift if an
    // intermediate step fails.
    const response = await this.prisma.$transaction(async (tx) => {
      const created = await tx.response.create({
        data: {
          topicId,
          authorId,
          parentId: createResponseDto.parentId ?? null,
          content: createResponseDto.content.trim(),
          citedSources: citedSourcesJson,
          containsOpinion: createResponseDto.containsOpinion ?? false,
          containsFactualClaims: createResponseDto.containsFactualClaims ?? false,
          status: responseStatus,
          revisionCount: 0,
        },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              email: true,
              verificationLevel: true,
            },
          },
        },
      });

      // Handle proposition associations if provided
      if (createResponseDto.propositionIds && createResponseDto.propositionIds.length > 0) {
        // Create ResponseProposition junction records
        await tx.responseProposition.createMany({
          data: createResponseDto.propositionIds.map((propositionId) => ({
            responseId: created.id,
            propositionId,
          })),
          skipDuplicates: true,
        });
      }

      // Only first-time authors increment participantCount. This EXISTS-style
      // lookup (backed by the composite (topicId, authorId) index) avoids
      // re-aggregating every response in the topic on each write, which grew
      // O(responses) with topic size under the previous groupBy approach.
      const priorResponse = await tx.response.findFirst({
        where: {
          topicId,
          authorId,
          id: { not: created.id },
        },
        select: { id: true },
      });

      await tx.discussionTopic.update({
        where: { id: topicId },
        data: {
          responseCount: { increment: 1 },
          ...(priorResponse ? {} : { participantCount: { increment: 1 } }),
        },
      });

      return created;
    });

    // Check and trigger common ground analysis if needed
    // This is fire-and-forget - we don't wait for it to complete
    this.commonGroundTrigger.checkAndTrigger(topicId).catch((error) => {
      // Error is already logged in the service, but log here too for visibility
      this.logger.error('Failed to check/trigger common ground analysis', error, {
        metadata: { topicId },
      });
    });

    // Route child content to moderation queue if author is a minor
    // This is fire-and-forget - we don't wait for it to complete
    this.routeChildContentToModeration(
      response.id,
      topicId,
      authorId,
      createResponseDto.content.trim(),
    ).catch((error) => {
      this.logger.error('Failed to route child content to moderation', error, {
        metadata: { responseId: response.id, topicId, authorId },
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
            avatarUrl: true,
            email: true,
            verificationLevel: true,
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

    // Broadcast a realtime new-response event to clients in the topic room so
    // the "N new responses" banner and sidebar counters update live (#1359).
    if (this.discussionGateway && completeResponse) {
      this.discussionGateway.emitNewResponse({
        topicId: completeResponse.topicId,
        responseId: completeResponse.id,
        authorId: completeResponse.authorId,
        authorName: completeResponse.author?.displayName || 'Anonymous',
        parentId: completeResponse.parentId ?? undefined,
      });
    }

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
      if (
        !updateResponseDto.content ||
        updateResponseDto.content.trim().length < RESPONSE_CONSTRAINTS.MIN_LENGTH
      ) {
        throw new BadRequestException(
          `Response content must be at least ${RESPONSE_CONSTRAINTS.MIN_LENGTH} characters`,
        );
      }

      if (updateResponseDto.content.length > RESPONSE_CONSTRAINTS.MAX_LENGTH) {
        throw new BadRequestException(
          `Response content must not exceed ${RESPONSE_CONSTRAINTS.MAX_LENGTH} characters`,
        );
      }
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma update data with dynamic properties
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
            avatarUrl: true,
            email: true,
            verificationLevel: true,
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

    // Re-screen edited content for child safety (grooming detection + minor
    // routing), mirroring createResponse. Without this, content that already
    // passed screening — or is pending review — could be edited into unsafe or
    // policy-violating content that the moderation pipeline never sees.
    // Fire-and-forget, matching the create path.
    if (updateResponseDto.content !== undefined) {
      this.routeChildContentToModeration(
        responseId,
        existingResponse.topicId,
        authorId,
        updateData.content,
      ).catch((error) => {
        this.logger.error('Failed to route edited child content to moderation', error, {
          metadata: { responseId, topicId: existingResponse.topicId, authorId },
        });
      });
    }

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma response with dynamic includes requires any
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
          avatarUrl: response.author.avatarUrl ?? getGravatarUrl(response.author.email),
          verificationLevel: response.author.verificationLevel,
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
        ? response.propositions.map(
            (rp: { proposition: { id: string; statement: string }; relevanceScore?: number }) => ({
              id: rp.proposition.id,
              statement: rp.proposition.statement,
              relevanceScore: rp.relevanceScore ? Number(rp.relevanceScore) : undefined,
            }),
          )
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
      if (dto.citations.length > RESPONSE_CONSTRAINTS.MAX_CITATIONS) {
        throw new BadRequestException(
          `Maximum ${RESPONSE_CONSTRAINTS.MAX_CITATIONS} citations allowed per response`,
        );
      }

      for (const citation of dto.citations) {
        const validation = await validateCitationUrl(citation.url);

        if (!validation.safe) {
          this.logger.ssrfBlocked(citation.url, validation.threat || 'UNKNOWN', userId);
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

    // Check if author is a minor for content moderation
    const authorInfo = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isMinor: true },
    });

    // Set status based on author type: minors get PENDING_REVIEW, adults get VISIBLE
    const responseStatus = authorInfo?.isMinor ? 'PENDING_REVIEW' : 'VISIBLE';

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
          status: responseStatus,
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
          lastActivityAt: new Date(),
        },
      });

      // Fetch created response with relations
      const createdResponse = await tx.response.findUniqueOrThrow({
        where: { id: response.id },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              email: true,
              verificationLevel: true,
            },
          },
          citations: true,
        },
      });

      return createdResponse;
    });

    this.logger.responsePosted(result.id, userId, dto.discussionId);

    // Route child content to moderation queue if author is a minor
    // This is fire-and-forget - we don't wait for it to complete
    this.routeChildContentToModeration(result.id, discussion.topicId, userId, dto.content).catch(
      (error) => {
        this.logger.error('Failed to route child content to moderation', error, {
          metadata: { responseId: result.id, topicId: discussion.topicId, userId },
        });
      },
    );

    // Map to ResponseDetailDto
    return {
      id: result.id,
      discussionId: result.discussionId!,
      content: result.content,
      author: {
        id: result.author.id,
        displayName: result.author.displayName,
        avatarUrl: result.author.avatarUrl ?? getGravatarUrl(result.author.email),
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
   * T052 [US3] - Reply to a specific response with parent validation
   *
   * Creates a reply to an existing response, automatically deriving the discussionId
   * from the parent response and validating thread depth limits.
   *
   * Requirements:
   * - Verify parent response exists and is not deleted
   * - Inherit discussionId from parent
   * - Check thread depth doesn't exceed limit (5 visual levels)
   * - Rate limiting handled at controller level (10/min)
   *
   * @param parentResponseId - The ID of the response being replied to
   * @param userId - The ID of the user creating the reply
   * @param replyDto - The reply content and metadata
   * @returns The created reply response
   * @throws NotFoundException if parent response doesn't exist
   * @throws BadRequestException if thread depth limit exceeded
   */
  async replyToResponse(
    parentResponseId: string,
    userId: string,
    replyDto: { content: string; citations?: Array<{ url: string; title?: string }> },
  ): Promise<ResponseDetailDto> {
    // Fetch parent response to validate and get discussionId
    const parentResponse = await this.prisma.response.findUnique({
      where: { id: parentResponseId },
      select: {
        id: true,
        discussionId: true,
        deletedAt: true,
        parentId: true,
      },
    });

    if (!parentResponse) {
      throw new NotFoundException(`Parent response with ID ${parentResponseId} not found`);
    }

    if (parentResponse.deletedAt) {
      throw new BadRequestException('Cannot reply to a deleted response');
    }

    // Calculate thread depth to enforce limit (T054)
    await this.threadingService.validateReplyDepth(parentResponseId);

    // Require discussionId for replies - legacy responses without discussions
    // cannot accept threaded replies through this endpoint
    if (!parentResponse.discussionId) {
      throw new BadRequestException(
        'Cannot reply to this response: it belongs to a legacy topic without a discussion. ' +
          'Please use the main discussion interface to respond.',
      );
    }

    // Create the reply using the discussion-based method
    return this.createResponseForDiscussion(userId, {
      discussionId: parentResponse.discussionId,
      content: replyDto.content,
      parentResponseId,
      citations: replyDto.citations,
    });
  }

  /**
   * T054 [US3] - Calculate thread depth for a response
   *
   * @param responseId - The ID of the response to calculate depth for
   * @returns The depth (0 for top-level, 1 for first reply, etc.)
   */
  async calculateThreadDepth(responseId: string): Promise<number> {
    return this.threadingService.calculateThreadDepth(responseId);
  }

  /**
   * T053 [US3] - Build recursive thread tree from flat response list
   *
   * @param responses - Flat array of responses from database
   * @returns Tree structure with responses and nested replies
   */
  buildThreadTree(responses: ResponseDetailDto[]): ThreadedResponse[] {
    return this.threadingService.buildThreadTree(responses);
  }

  /**
   * T038 [US2] - Get responses for a discussion with threading support and pagination
   *
   * Requirements:
   * - Exclude soft-deleted responses (deletedAt is not null)
   * - Exclude PENDING_REVIEW responses by default (for regular users)
   * - Include author info and citations
   * - Pagination with configurable limit and offset
   * - Order by createdAt ascending (chronological)
   *
   * @param discussionId - The ID of the discussion
   * @param options - Query options
   * @param options.includePendingReview - Include PENDING_REVIEW responses (for moderators)
   * @param options.limit - Maximum number of responses to return (default: 100, max: 500)
   * @param options.offset - Number of responses to skip (default: 0)
   * @returns Array of responses for the discussion
   */
  async getDiscussionResponses(
    discussionId: string,
    options: { includePendingReview?: boolean; limit?: number; offset?: number } = {},
  ): Promise<ResponseDetailDto[]> {
    const { includePendingReview = false, limit = 100, offset = 0 } = options;
    // Enforce maximum limit to prevent excessive data fetching
    const safeLimit = Math.min(Math.max(1, limit), 500);
    const safeOffset = Math.max(0, offset);

    // Verify discussion exists
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
      select: { id: true },
    });

    if (!discussion) {
      throw new NotFoundException(`Discussion with ID ${discussionId} not found`);
    }

    // Build status filter: exclude PENDING_REVIEW unless explicitly included
    const statusFilter = includePendingReview
      ? { not: 'REMOVED' as const } // Only exclude REMOVED, include PENDING_REVIEW
      : { notIn: ['REMOVED' as const, 'PENDING_REVIEW' as const] };

    // Fetch non-deleted responses with pagination
    const responses = await this.prisma.response.findMany({
      where: {
        discussionId,
        deletedAt: null, // Exclude soft-deleted responses
        status: statusFilter,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            email: true,
            verificationLevel: true,
          },
        },
        citations: true,
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: safeLimit,
      skip: safeOffset,
    });

    // Map to ResponseDetailDto array
    return responses.map((response) => ({
      id: response.id,
      discussionId: response.discussionId!,
      content: response.content,
      author: {
        id: response.author.id,
        displayName: response.author.displayName,
        avatarUrl: response.author.avatarUrl ?? getGravatarUrl(response.author.email),
        verificationLevel: response.author.verificationLevel,
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

  // ==================== Child-Friendly Mode: Phase 2 Content Safety ====================

  /**
   * Route child-authored content to the moderation queue for review.
   *
   * This method checks if the response author is a minor (isMinor=true) and,
   * if so, screens the content for child safety concerns and queues it for
   * moderator review before it becomes visible.
   *
   * @param responseId - The ID of the created response
   * @param topicId - The ID of the topic containing the response
   * @param authorId - The ID of the response author
   * @param content - The response content text
   *
   * @remarks
   * This is a fire-and-forget operation:
   * - Response creation should not fail if moderation routing fails
   * - Errors are logged but do not block the response creation flow
   * - If ModerationClientService is not available, this method does nothing
   *
   * Process:
   * 1. Check if author is a minor (isMinor=true)
   * 2. If minor, screen content for grooming patterns via moderation-service
   * 3. Queue content in moderation queue with AI flags for priority determination
   *
   * The moderation queue will:
   * - Mark URGENT priority if grooming patterns detected
   * - Mark HIGH priority for other concerning content
   * - Mark NORMAL priority for clean content
   */
  private async routeChildContentToModeration(
    responseId: string,
    topicId: string,
    authorId: string,
    content: string,
  ): Promise<void> {
    // Skip if moderation client is not available (backwards compatibility)
    if (!this.moderationClient) {
      return;
    }

    // Check if author is a minor
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { isMinor: true },
    });

    // Only route to moderation if author is a minor
    if (!author?.isMinor) {
      return;
    }

    this.logger.debug('Routing child content to moderation queue', {
      responseId,
      userId: authorId,
      metadata: { topicId },
    });

    // Screen content for grooming patterns and child safety
    const screening = await this.moderationClient.screenContentForChildren(content);

    // Build AI flags from screening result
    const aiFlags = screening.groomingDetection
      ? {
          grooming: screening.groomingDetection.detected,
          groomingConfidence: screening.groomingDetection.confidence,
          groomingPatternType: screening.groomingDetection.patternType || undefined,
          recommendedAction: screening.groomingDetection.recommendedAction,
        }
      : undefined;

    // Queue content for moderation review
    await this.moderationClient.tryQueueChildContent({
      responseId,
      topicId,
      authorId,
      content,
      aiFlags,
    });

    this.logger.info('Child content queued for moderation', {
      responseId,
      userId: authorId,
      metadata: {
        topicId,
        childSafetyRisk: screening.childSafetyRisk,
        hasGroomingFlags: !!screening.groomingDetection?.detected,
      },
    });
  }
}

/**
 * T016 - Discussion Service (Feature 009)
 *
 * Business logic for discussion operations
 * Implements T021-T022 in Phase 3 (User Story 1)
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DiscussionLogger } from '../utils/logger.js';
import { validateCitationUrl } from '../utils/ssrf-validator.js';
import { CreateDiscussionDto } from './dto/create-discussion.dto.js';
import { DiscussionResponseDto, DiscussionDetailDto } from './dto/discussion-response.dto.js';
import {
  PaginationQueryDto,
  createPaginationMeta,
  PaginatedResponseDto,
} from '../dto/pagination.dto.js';

export interface ListDiscussionsQuery extends PaginationQueryDto {
  topicId?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  sortBy?: 'lastActivityAt' | 'createdAt' | 'responseCount';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class DiscussionsService {
  private readonly logger = new DiscussionLogger('DiscussionsService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * T021 [P] [US1] - Create a new discussion with initial response
   *
   * Requirements:
   * - FR-001: User must be verified to create discussions
   * - FR-002: Title 10-200 chars, initial response 50-25000 chars
   * - FR-005: Validate citations with SSRF defense
   * - Use transaction to ensure atomicity
   *
   * @param userId - The ID of the user creating the discussion
   * @param dto - Discussion creation data with initial response
   * @returns The created discussion with initial response
   */
  async createDiscussion(userId: string, dto: CreateDiscussionDto): Promise<DiscussionDetailDto> {
    // FR-001: Verify user is verified (emailVerified === true)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, emailVerified: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Only verified users can create discussions');
    }

    // Verify topic exists and is active
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: dto.topicId },
      select: { id: true, status: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${dto.topicId} not found`);
    }

    if (topic.status !== 'ACTIVE' && topic.status !== 'SEEDING') {
      throw new BadRequestException('Cannot create discussions in non-active topics');
    }

    // FR-005: Validate citations with SSRF defense
    const validatedCitations: Array<{
      originalUrl: string;
      normalizedUrl: string;
      title: string | null;
      resolvedIp: string | null;
    }> = [];

    if (dto.initialResponse.citations && dto.initialResponse.citations.length > 0) {
      if (dto.initialResponse.citations.length > 10) {
        throw new BadRequestException('Maximum 10 citations allowed per response');
      }

      for (const citation of dto.initialResponse.citations) {
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

    // Create discussion, initial response, and participant activity in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create discussion
      const discussion = await tx.discussion.create({
        data: {
          topicId: dto.topicId,
          creatorId: userId,
          title: dto.title,
          status: 'ACTIVE',
          responseCount: 1, // Initial response counts
          participantCount: 1,
          lastActivityAt: new Date(),
        },
      });

      // Create initial response
      const initialResponse = await tx.response.create({
        data: {
          topicId: dto.topicId,
          discussionId: discussion.id,
          authorId: userId,
          content: dto.initialResponse.content,
          version: 1,
          editCount: 0,
        },
      });

      // Create citations if present
      if (validatedCitations.length > 0) {
        await tx.citation.createMany({
          data: validatedCitations.map((citation) => ({
            responseId: initialResponse.id,
            originalUrl: citation.originalUrl,
            normalizedUrl: citation.normalizedUrl,
            title: citation.title,
            resolvedIp: citation.resolvedIp,
            validationStatus: 'UNVERIFIED',
          })),
        });
      }

      // Create participant activity record
      await tx.participantActivity.create({
        data: {
          discussionId: discussion.id,
          userId,
          responseCount: 1,
          lastActivityAt: new Date(),
        },
      });

      // Fetch created discussion with relations for return
      const createdDiscussion = await tx.discussion.findUniqueOrThrow({
        where: { id: discussion.id },
        include: {
          creator: {
            select: { id: true, displayName: true },
          },
          responses: {
            where: { deletedAt: null },
            include: {
              author: {
                select: { id: true, displayName: true },
              },
              citations: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return createdDiscussion;
    });

    this.logger.discussionCreated(result.id, userId, { topicId: dto.topicId });

    // Map to DiscussionDetailDto
    return {
      id: result.id,
      topicId: result.topicId,
      title: result.title,
      status: result.status,
      creator: {
        id: result.creator.id,
        displayName: result.creator.displayName,
      },
      responseCount: result.responseCount,
      participantCount: result.participantCount,
      lastActivityAt: result.lastActivityAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      responses: result.responses.map((response) => ({
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
      })),
    };
  }

  /**
   * T022 [US1] - List discussions with filtering, sorting, and pagination
   *
   * Requirements:
   * - Support filtering by topicId, status
   * - Support sorting by lastActivityAt (default), createdAt, responseCount
   * - Paginate results (default 50 per page, max 100)
   * - Only show ACTIVE discussions unless filtered otherwise
   *
   * @param query - Query parameters for filtering, sorting, and pagination
   * @returns Paginated list of discussions
   */
  async listDiscussions(
    query: ListDiscussionsQuery,
  ): Promise<PaginatedResponseDto<DiscussionResponseDto>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 100);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'lastActivityAt';
    const sortOrder = query.sortOrder || 'desc';

    // Build where clause
    const where: any = {
      status: query.status || 'ACTIVE', // Default to active discussions
    };

    if (query.topicId) {
      where.topicId = query.topicId;
    }

    // Execute count and query in parallel
    const [totalItems, discussions] = await Promise.all([
      this.prisma.discussion.count({ where }),
      this.prisma.discussion.findMany({
        where,
        include: {
          creator: {
            select: { id: true, displayName: true },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
    ]);

    const paginationMeta = createPaginationMeta(page, limit, totalItems);

    return {
      data: discussions.map((discussion) => ({
        id: discussion.id,
        topicId: discussion.topicId,
        title: discussion.title,
        status: discussion.status,
        creator: {
          id: discussion.creator.id,
          displayName: discussion.creator.displayName,
        },
        responseCount: discussion.responseCount,
        participantCount: discussion.participantCount,
        lastActivityAt: discussion.lastActivityAt.toISOString(),
        createdAt: discussion.createdAt.toISOString(),
        updatedAt: discussion.updatedAt.toISOString(),
      })),
      meta: paginationMeta,
    };
  }

  // Future methods (T023-T024):
  // - getDiscussion(id: string)
  // - updateDiscussionStatus(id: string, status: DiscussionStatus)
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GetTopicsQueryDto } from './dto/get-topics-query.dto.js';
import type { PaginatedTopicsResponseDto, TopicResponseDto } from './dto/topic-response.dto.js';
import { Prisma } from '@unite-discord/db-models';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  async getTopics(query: GetTopicsQueryDto): Promise<PaginatedTopicsResponseDto> {
    const {
      status,
      creatorId,
      tag,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: Prisma.DiscussionTopicWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (tag) {
      where.tags = {
        some: {
          tag: {
            OR: [
              { name: { contains: tag, mode: 'insensitive' } },
              { slug: { contains: tag, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    // Build orderBy clause
    const orderBy: Prisma.DiscussionTopicOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [topics, total] = await Promise.all([
      this.prisma.discussionTopic.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.discussionTopic.count({ where }),
    ]);

    // Map to DTOs
    const data: TopicResponseDto[] = topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      creatorId: topic.creatorId,
      status: topic.status,
      evidenceStandards: topic.evidenceStandards,
      minimumDiversityScore: topic.minimumDiversityScore.toNumber(),
      currentDiversityScore: topic.currentDiversityScore?.toNumber() ?? null,
      participantCount: topic.participantCount,
      responseCount: topic.responseCount,
      crossCuttingThemes: topic.crossCuttingThemes,
      createdAt: topic.createdAt,
      activatedAt: topic.activatedAt,
      archivedAt: topic.archivedAt,
      tags: topic.tags.map((tt) => tt.tag),
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

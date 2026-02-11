/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateTopicLinkDto,
  UpdateTopicLinkStatusDto,
  GetTopicLinksQueryDto,
  TopicLinkResponseDto,
  LinkedTopicResponseDto,
} from './dto/topic-link.dto.js';
import { LinkSource, ConfirmationStatus } from './dto/topic-link.dto.js';
import { Prisma } from '@prisma/client';

/**
 * Service for managing topic links
 * Feature 016: Topic Management - Topic Linking (T217)
 *
 * Topic links create bidirectional relationships between related discussion topics
 * to improve content organization and discoverability.
 */
@Injectable()
export class TopicLinksService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new link between two topics
   *
   * @param sourceTopicId - ID of the source topic
   * @param dto - Link creation details
   * @param proposerId - ID of the user proposing the link
   * @returns Created topic link
   * @throws NotFoundException if either topic doesn't exist
   * @throws BadRequestException if linking a topic to itself
   * @throws ConflictException if link already exists
   */
  async createLink(
    sourceTopicId: string,
    dto: CreateTopicLinkDto,
    proposerId: string,
  ): Promise<TopicLinkResponseDto> {
    // Validate source topic exists
    const sourceTopic = await this.prisma.discussionTopic.findUnique({
      where: { id: sourceTopicId },
      select: { id: true, title: true, slug: true },
    });

    if (!sourceTopic) {
      throw new NotFoundException(`Source topic ${sourceTopicId} not found`);
    }

    // Validate target topic exists
    const targetTopic = await this.prisma.discussionTopic.findUnique({
      where: { id: dto.targetTopicId },
      select: { id: true, title: true, slug: true },
    });

    if (!targetTopic) {
      throw new NotFoundException(`Target topic ${dto.targetTopicId} not found`);
    }

    // Prevent self-linking
    if (sourceTopicId === dto.targetTopicId) {
      throw new BadRequestException('Cannot link a topic to itself');
    }

    // Check if link already exists (in either direction with same relationship)
    const existingLink = await this.prisma.topicLink.findFirst({
      where: {
        OR: [
          {
            sourceTopicId,
            targetTopicId: dto.targetTopicId,
            relationshipType: dto.relationshipType,
          },
          {
            sourceTopicId: dto.targetTopicId,
            targetTopicId: sourceTopicId,
            relationshipType: dto.relationshipType,
          },
        ],
      },
    });

    if (existingLink) {
      throw new ConflictException(
        `A ${dto.relationshipType} link already exists between these topics`,
      );
    }

    // Create the link
    const link = await this.prisma.topicLink.create({
      data: {
        sourceTopicId,
        targetTopicId: dto.targetTopicId,
        relationshipType: dto.relationshipType,
        linkSource: dto.linkSource || LinkSource.USER_PROPOSED,
        proposerId,
        confirmationStatus: ConfirmationStatus.PENDING,
      },
      include: {
        sourceTopic: {
          select: { id: true, title: true, slug: true },
        },
        targetTopic: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    return this.mapToResponseDto(link);
  }

  /**
   * Get all links for a topic (both as source and target)
   *
   * @param topicId - ID of the topic
   * @param query - Filter options
   * @returns Array of topic links
   */
  async getLinksForTopic(
    topicId: string,
    query: GetTopicLinksQueryDto = {},
  ): Promise<TopicLinkResponseDto[]> {
    const where: Prisma.TopicLinkWhereInput = {
      OR: [{ sourceTopicId: topicId }, { targetTopicId: topicId }],
    };

    if (query.relationshipType) {
      where.relationshipType = query.relationshipType;
    }

    if (query.status) {
      where.confirmationStatus = query.status;
    }

    if (query.linkSource) {
      where.linkSource = query.linkSource;
    }

    const links = await this.prisma.topicLink.findMany({
      where,
      include: {
        sourceTopic: {
          select: { id: true, title: true, slug: true },
        },
        targetTopic: {
          select: { id: true, title: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return links.map((link) => this.mapToResponseDto(link));
  }

  /**
   * Get linked topics for display (simplified view)
   *
   * @param topicId - ID of the topic
   * @param confirmedOnly - Only return confirmed links (default: true)
   * @returns Array of linked topics with relationship info
   */
  async getLinkedTopics(topicId: string, confirmedOnly = true): Promise<LinkedTopicResponseDto[]> {
    const where: Prisma.TopicLinkWhereInput = {
      OR: [{ sourceTopicId: topicId }, { targetTopicId: topicId }],
    };

    if (confirmedOnly) {
      where.confirmationStatus = ConfirmationStatus.CONFIRMED;
    }

    const links = await this.prisma.topicLink.findMany({
      where,
      include: {
        sourceTopic: {
          select: { id: true, title: true, slug: true },
        },
        targetTopic: {
          select: { id: true, title: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return links.map((link) => {
      // Return the "other" topic (not the one we're querying for)
      const isSource = link.sourceTopicId === topicId;
      const linkedTopic = isSource ? link.targetTopic : link.sourceTopic;

      return {
        id: linkedTopic.id,
        title: linkedTopic.title,
        slug: linkedTopic.slug,
        relationshipType: link.relationshipType,
        linkId: link.id,
        confirmationStatus: link.confirmationStatus,
      };
    });
  }

  /**
   * Get a specific link by ID
   *
   * @param linkId - ID of the link
   * @returns Topic link or null
   */
  async getLinkById(linkId: string): Promise<TopicLinkResponseDto | null> {
    const link = await this.prisma.topicLink.findUnique({
      where: { id: linkId },
      include: {
        sourceTopic: {
          select: { id: true, title: true, slug: true },
        },
        targetTopic: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    if (!link) {
      return null;
    }

    return this.mapToResponseDto(link);
  }

  /**
   * Update a link's confirmation status
   *
   * @param linkId - ID of the link
   * @param dto - Status update details
   * @param userId - ID of the user updating (for vote tracking)
   * @returns Updated topic link
   * @throws NotFoundException if link doesn't exist
   */
  async updateLinkStatus(
    linkId: string,
    dto: UpdateTopicLinkStatusDto,
    userId: string,
  ): Promise<TopicLinkResponseDto> {
    const existingLink = await this.prisma.topicLink.findUnique({
      where: { id: linkId },
    });

    if (!existingLink) {
      throw new NotFoundException(`Topic link ${linkId} not found`);
    }

    // Update confirmation counts based on status change
    const updateData: Prisma.TopicLinkUpdateInput = {
      confirmationStatus: dto.status,
    };

    if (dto.status === ConfirmationStatus.CONFIRMED) {
      updateData.confirmedByCount = { increment: 1 };
    } else if (dto.status === ConfirmationStatus.REJECTED) {
      updateData.rejectedByCount = { increment: 1 };
    }

    const link = await this.prisma.topicLink.update({
      where: { id: linkId },
      data: updateData,
      include: {
        sourceTopic: {
          select: { id: true, title: true, slug: true },
        },
        targetTopic: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    return this.mapToResponseDto(link);
  }

  /**
   * Delete a topic link
   *
   * @param linkId - ID of the link
   * @returns Deleted link
   * @throws NotFoundException if link doesn't exist
   */
  async deleteLink(linkId: string): Promise<TopicLinkResponseDto> {
    const existingLink = await this.prisma.topicLink.findUnique({
      where: { id: linkId },
      include: {
        sourceTopic: {
          select: { id: true, title: true, slug: true },
        },
        targetTopic: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    if (!existingLink) {
      throw new NotFoundException(`Topic link ${linkId} not found`);
    }

    await this.prisma.topicLink.delete({
      where: { id: linkId },
    });

    return this.mapToResponseDto(existingLink);
  }

  /**
   * Map Prisma TopicLink to response DTO
   */
  private mapToResponseDto(link: any): TopicLinkResponseDto {
    return {
      id: link.id,
      sourceTopicId: link.sourceTopicId,
      targetTopicId: link.targetTopicId,
      relationshipType: link.relationshipType,
      linkSource: link.linkSource,
      confirmationStatus: link.confirmationStatus,
      proposerId: link.proposerId,
      confirmedByCount: link.confirmedByCount,
      rejectedByCount: link.rejectedByCount,
      createdAt: link.createdAt,
      sourceTopic: link.sourceTopic
        ? {
            id: link.sourceTopic.id,
            title: link.sourceTopic.title,
            slug: link.sourceTopic.slug,
          }
        : undefined,
      targetTopic: link.targetTopic
        ? {
            id: link.targetTopic.id,
            title: link.targetTopic.title,
            slug: link.targetTopic.slug,
          }
        : undefined,
    };
  }
}

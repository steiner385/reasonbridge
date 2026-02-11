/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  SaveTopicDraftDto,
  TopicDraftResponseDto,
  TopicDraftsListResponseDto,
} from './dto/topic-draft.dto.js';

/**
 * Service for managing topic drafts
 * Feature 016: Topic Management (T212)
 *
 * Allows users to save work-in-progress topics before publishing.
 * Drafts auto-expire after 30 days by default.
 */
@Injectable()
export class TopicDraftsService {
  private static readonly DRAFT_EXPIRY_DAYS = 30;

  constructor(private prisma: PrismaService) {}

  /**
   * Save a topic draft (create or update)
   * If dto.id is provided, updates existing draft; otherwise creates new
   */
  async saveDraft(userId: string, dto: SaveTopicDraftDto): Promise<TopicDraftResponseDto> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TopicDraftsService.DRAFT_EXPIRY_DAYS);

    if (dto.id) {
      // Update existing draft
      const existingDraft = await this.prisma.topicDraft.findUnique({
        where: { id: dto.id },
      });

      if (!existingDraft) {
        throw new NotFoundException(`Draft with id ${dto.id} not found`);
      }

      if (existingDraft.userId !== userId) {
        throw new ForbiddenException('You can only update your own drafts');
      }

      const updated = await this.prisma.topicDraft.update({
        where: { id: dto.id },
        data: {
          title: dto.title ?? existingDraft.title,
          description: dto.description ?? existingDraft.description,
          tags: dto.tags ?? existingDraft.tags,
          visibility: dto.visibility ?? existingDraft.visibility,
          evidenceStandards: dto.evidenceStandards ?? existingDraft.evidenceStandards,
          isMatureContent: dto.isMatureContent ?? existingDraft.isMatureContent,
          expiresAt, // Reset expiry on update
        },
      });

      return this.toResponseDto(updated);
    }

    // Create new draft
    const created = await this.prisma.topicDraft.create({
      data: {
        userId,
        title: dto.title ?? '',
        description: dto.description ?? '',
        tags: dto.tags ?? [],
        visibility: dto.visibility ?? 'PUBLIC',
        evidenceStandards: dto.evidenceStandards ?? 'STANDARD',
        isMatureContent: dto.isMatureContent ?? false,
        expiresAt,
      },
    });

    return this.toResponseDto(created);
  }

  /**
   * Get all drafts for a user
   */
  async getDrafts(userId: string): Promise<TopicDraftsListResponseDto> {
    const drafts = await this.prisma.topicDraft.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      drafts: drafts.map((d) => this.toResponseDto(d)),
      total: drafts.length,
    };
  }

  /**
   * Get a specific draft by ID
   */
  async getDraft(userId: string, draftId: string): Promise<TopicDraftResponseDto> {
    const draft = await this.prisma.topicDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new NotFoundException(`Draft with id ${draftId} not found`);
    }

    if (draft.userId !== userId) {
      throw new ForbiddenException('You can only access your own drafts');
    }

    // Check if expired
    if (draft.expiresAt && draft.expiresAt < new Date()) {
      throw new NotFoundException(`Draft with id ${draftId} has expired`);
    }

    return this.toResponseDto(draft);
  }

  /**
   * Delete a draft
   */
  async deleteDraft(userId: string, draftId: string): Promise<void> {
    const draft = await this.prisma.topicDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new NotFoundException(`Draft with id ${draftId} not found`);
    }

    if (draft.userId !== userId) {
      throw new ForbiddenException('You can only delete your own drafts');
    }

    await this.prisma.topicDraft.delete({
      where: { id: draftId },
    });
  }

  /**
   * Delete all expired drafts (for scheduled cleanup)
   */
  async cleanupExpiredDrafts(): Promise<number> {
    const result = await this.prisma.topicDraft.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }

  /**
   * Convert Prisma model to response DTO
   */
  private toResponseDto(draft: {
    id: string;
    userId: string;
    title: string;
    description: string;
    tags: string[];
    visibility: string;
    evidenceStandards: string;
    isMatureContent: boolean;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date | null;
  }): TopicDraftResponseDto {
    return {
      id: draft.id,
      userId: draft.userId,
      title: draft.title,
      description: draft.description,
      tags: draft.tags,
      visibility: draft.visibility as 'PUBLIC' | 'PRIVATE' | 'UNLISTED',
      evidenceStandards: draft.evidenceStandards as 'MINIMAL' | 'STANDARD' | 'RIGOROUS',
      isMatureContent: draft.isMatureContent,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      expiresAt: draft.expiresAt,
    };
  }
}

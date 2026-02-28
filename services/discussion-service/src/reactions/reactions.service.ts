/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReactionDto } from './dto/create-reaction.dto.js';
import type { ReactionDto, ReactionListDto, ReactionSummaryDto } from './dto/reaction.dto.js';

@Injectable()
export class ReactionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Add a reaction to a response
   * @param responseId - The ID of the response to react to
   * @param userId - The ID of the user adding the reaction
   * @param dto - The reaction data containing the emoji
   * @returns The created reaction
   * @throws NotFoundException if the response doesn't exist
   * @throws ConflictException if the user already reacted with this emoji
   */
  async addReaction(
    responseId: string,
    userId: string,
    dto: CreateReactionDto,
  ): Promise<ReactionDto> {
    // Verify response exists
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    // Check if reaction already exists
    const existing = await this.prisma.responseReaction.findUnique({
      where: {
        responseId_userId_emoji: {
          responseId,
          userId,
          emoji: dto.emoji,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Reaction already exists');
    }

    const reaction = await this.prisma.responseReaction.create({
      data: {
        responseId,
        userId,
        emoji: dto.emoji,
      },
      include: {
        user: {
          select: { id: true, displayName: true },
        },
      },
    });

    return {
      id: reaction.id,
      responseId: reaction.responseId,
      userId: reaction.userId,
      userName: reaction.user.displayName || 'Anonymous',
      emoji: reaction.emoji,
      createdAt: reaction.createdAt,
    };
  }

  /**
   * Remove a reaction from a response
   * @param responseId - The ID of the response
   * @param userId - The ID of the user removing the reaction
   * @param emoji - The emoji to remove
   * @throws NotFoundException if the reaction doesn't exist
   */
  async removeReaction(responseId: string, userId: string, emoji: string): Promise<void> {
    const reaction = await this.prisma.responseReaction.findUnique({
      where: {
        responseId_userId_emoji: {
          responseId,
          userId,
          emoji,
        },
      },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.prisma.responseReaction.delete({
      where: { id: reaction.id },
    });
  }

  /**
   * Get all reactions for a response, grouped by emoji
   * @param responseId - The ID of the response
   * @param userId - Optional user ID to check if they reacted
   * @returns Reaction summaries grouped by emoji
   */
  async getReactions(responseId: string, userId?: string): Promise<ReactionListDto> {
    const reactions = await this.prisma.responseReaction.findMany({
      where: { responseId },
      include: {
        user: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by emoji
    const emojiGroups = new Map<string, { users: { id: string; displayName: string }[] }>();
    for (const reaction of reactions) {
      const group = emojiGroups.get(reaction.emoji) || { users: [] };
      group.users.push({
        id: reaction.user.id,
        displayName: reaction.user.displayName || 'Anonymous',
      });
      emojiGroups.set(reaction.emoji, group);
    }

    const summaries: ReactionSummaryDto[] = Array.from(emojiGroups.entries()).map(
      ([emoji, group]) => ({
        emoji,
        count: group.users.length,
        users: group.users.slice(0, 10), // Limit to first 10 users
        userReacted: userId ? group.users.some((u) => u.id === userId) : false,
      }),
    );

    return {
      reactions: summaries,
      totalCount: reactions.length,
    };
  }

  /**
   * Get reaction summaries for multiple responses (for list views)
   * @param responseIds - Array of response IDs
   * @param userId - Optional user ID to check if they reacted
   * @returns Map of response ID to reaction list
   */
  async getReactionSummaries(
    responseIds: string[],
    userId?: string,
  ): Promise<Map<string, ReactionListDto>> {
    const reactions = await this.prisma.responseReaction.findMany({
      where: {
        responseId: {
          in: responseIds,
        },
      },
      include: {
        user: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const summariesMap = new Map<string, ReactionListDto>();

    // Initialize empty summaries for all responses
    for (const responseId of responseIds) {
      summariesMap.set(responseId, { reactions: [], totalCount: 0 });
    }

    // Group reactions by response, then by emoji
    const responseGroups = new Map<
      string,
      Map<string, { users: { id: string; displayName: string }[] }>
    >();

    for (const reaction of reactions) {
      if (!responseGroups.has(reaction.responseId)) {
        responseGroups.set(reaction.responseId, new Map());
      }
      const emojiGroups = responseGroups.get(reaction.responseId)!;
      const group = emojiGroups.get(reaction.emoji) || { users: [] };
      group.users.push({
        id: reaction.user.id,
        displayName: reaction.user.displayName || 'Anonymous',
      });
      emojiGroups.set(reaction.emoji, group);
    }

    // Build summaries
    for (const [responseId, emojiGroups] of responseGroups.entries()) {
      const summaries: ReactionSummaryDto[] = Array.from(emojiGroups.entries()).map(
        ([emoji, group]) => ({
          emoji,
          count: group.users.length,
          users: group.users.slice(0, 10),
          userReacted: userId ? group.users.some((u) => u.id === userId) : false,
        }),
      );

      const totalCount = Array.from(emojiGroups.values()).reduce(
        (sum, group) => sum + group.users.length,
        0,
      );

      summariesMap.set(responseId, { reactions: summaries, totalCount });
    }

    return summariesMap;
  }
}

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Inject, NotFoundException, ConflictException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DiscussionGateway } from '../gateways/discussion.gateway.js';
import type { CreateReactionDto } from './dto/create-reaction.dto.js';
import type { ReactionDto, ReactionListDto, ReactionSummaryDto } from './dto/reaction.dto.js';

@Injectable()
export class ReactionsService {
  /** Maximum number of reactor faces surfaced per emoji in a summary. */
  private static readonly REACTION_PREVIEW_LIMIT = 10;
  /**
   * Upper bound on reaction rows fetched to build preview user lists. Exact
   * counts come from a groupBy aggregation, so this only caps the "who reacted"
   * preview and prevents materializing an unbounded number of rows.
   */
  private static readonly REACTION_PREVIEW_FETCH_LIMIT = 200;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(DiscussionGateway) private readonly discussionGateway?: DiscussionGateway,
  ) {}

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

    const reactionDto: ReactionDto = {
      id: reaction.id,
      responseId: reaction.responseId,
      userId: reaction.userId,
      userName: reaction.user.displayName || 'Anonymous',
      emoji: reaction.emoji,
      createdAt: reaction.createdAt,
    };

    // Broadcast WebSocket event for real-time updates
    if (this.discussionGateway && response.topicId) {
      this.discussionGateway.emitReactionAdded(response.topicId, {
        responseId: reaction.responseId,
        userId: reaction.userId,
        userName: reaction.user.displayName || 'Anonymous',
        emoji: reaction.emoji,
      });
    }

    return reactionDto;
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
      include: {
        response: {
          select: { topicId: true },
        },
      },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.prisma.responseReaction.delete({
      where: { id: reaction.id },
    });

    // Broadcast WebSocket event for real-time updates
    if (this.discussionGateway && reaction.response?.topicId) {
      this.discussionGateway.emitReactionRemoved(reaction.response.topicId, {
        responseId,
        userId,
        emoji,
      });
    }
  }

  /**
   * Get all reactions for a response, grouped by emoji
   * @param responseId - The ID of the response
   * @param userId - Optional user ID to check if they reacted
   * @returns Reaction summaries grouped by emoji
   */
  async getReactions(responseId: string, userId?: string): Promise<ReactionListDto> {
    // Exact per-emoji counts come from a database aggregation instead of
    // materializing every reaction row and counting in JS. Preview user lists
    // are built from a bounded fetch, and the caller's own reactions are
    // resolved with a targeted query so userReacted stays accurate regardless
    // of the preview cap.
    const [grouped, previewReactions, userReactions] = await Promise.all([
      this.prisma.responseReaction.groupBy({
        by: ['emoji'],
        where: { responseId },
        _count: { _all: true },
      }),
      this.prisma.responseReaction.findMany({
        where: { responseId },
        include: {
          user: {
            select: { id: true, displayName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: ReactionsService.REACTION_PREVIEW_FETCH_LIMIT,
      }),
      userId
        ? this.prisma.responseReaction.findMany({
            where: { responseId, userId },
            select: { emoji: true },
          })
        : Promise.resolve([] as { emoji: string }[]),
    ]);

    const previewByEmoji = this.buildPreviewUsers(previewReactions);
    const reactedEmojis = new Set(userReactions.map((r) => r.emoji));

    const summaries: ReactionSummaryDto[] = grouped.map((group) => ({
      emoji: group.emoji,
      count: group._count._all,
      users: previewByEmoji.get(group.emoji) ?? [],
      userReacted: reactedEmojis.has(group.emoji),
    }));

    const totalCount = grouped.reduce((sum, group) => sum + group._count._all, 0);

    return {
      reactions: summaries,
      totalCount,
    };
  }

  /**
   * Build capped per-emoji preview user lists from a bounded set of reaction
   * rows (ordered oldest-first).
   */
  private buildPreviewUsers(
    reactions: { emoji: string; user: { id: string; displayName: string | null } }[],
  ): Map<string, { id: string; displayName: string }[]> {
    const previewByEmoji = new Map<string, { id: string; displayName: string }[]>();
    for (const reaction of reactions) {
      const users = previewByEmoji.get(reaction.emoji) ?? [];
      if (users.length < ReactionsService.REACTION_PREVIEW_LIMIT) {
        users.push({
          id: reaction.user.id,
          displayName: reaction.user.displayName || 'Anonymous',
        });
        previewByEmoji.set(reaction.emoji, users);
      }
    }
    return previewByEmoji;
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
    const summariesMap = new Map<string, ReactionListDto>();

    // Initialize empty summaries for all responses
    for (const responseId of responseIds) {
      summariesMap.set(responseId, { reactions: [], totalCount: 0 });
    }

    if (responseIds.length === 0) {
      return summariesMap;
    }

    // Aggregate counts per (response, emoji) in the database; build preview user
    // lists from a bounded fetch and resolve the caller's own reactions with a
    // single targeted query.
    const [grouped, previewReactions, userReactions] = await Promise.all([
      this.prisma.responseReaction.groupBy({
        by: ['responseId', 'emoji'],
        where: { responseId: { in: responseIds } },
        _count: { _all: true },
      }),
      this.prisma.responseReaction.findMany({
        where: { responseId: { in: responseIds } },
        include: {
          user: {
            select: { id: true, displayName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: ReactionsService.REACTION_PREVIEW_FETCH_LIMIT * responseIds.length,
      }),
      userId
        ? this.prisma.responseReaction.findMany({
            where: { responseId: { in: responseIds }, userId },
            select: { responseId: true, emoji: true },
          })
        : Promise.resolve([] as { responseId: string; emoji: string }[]),
    ]);

    // Preview users keyed by responseId → emoji.
    const previewByResponse = new Map<string, Map<string, { id: string; displayName: string }[]>>();
    for (const reaction of previewReactions) {
      let emojiMap = previewByResponse.get(reaction.responseId);
      if (!emojiMap) {
        emojiMap = new Map();
        previewByResponse.set(reaction.responseId, emojiMap);
      }
      const users = emojiMap.get(reaction.emoji) ?? [];
      if (users.length < ReactionsService.REACTION_PREVIEW_LIMIT) {
        users.push({
          id: reaction.user.id,
          displayName: reaction.user.displayName || 'Anonymous',
        });
        emojiMap.set(reaction.emoji, users);
      }
    }

    // Emojis the caller reacted with, keyed by responseId.
    const reactedByResponse = new Map<string, Set<string>>();
    for (const reaction of userReactions) {
      const set = reactedByResponse.get(reaction.responseId) ?? new Set<string>();
      set.add(reaction.emoji);
      reactedByResponse.set(reaction.responseId, set);
    }

    // Group aggregated counts back per response.
    const countsByResponse = new Map<string, { emoji: string; count: number }[]>();
    for (const group of grouped) {
      const entries = countsByResponse.get(group.responseId) ?? [];
      entries.push({ emoji: group.emoji, count: group._count._all });
      countsByResponse.set(group.responseId, entries);
    }

    for (const [responseId, entries] of countsByResponse.entries()) {
      const emojiPreview = previewByResponse.get(responseId);
      const reacted = reactedByResponse.get(responseId);
      const summaries: ReactionSummaryDto[] = entries.map((entry) => ({
        emoji: entry.emoji,
        count: entry.count,
        users: emojiPreview?.get(entry.emoji) ?? [],
        userReacted: reacted?.has(entry.emoji) ?? false,
      }));
      const totalCount = entries.reduce((sum, entry) => sum + entry.count, 0);
      summariesMap.set(responseId, { reactions: summaries, totalCount });
    }

    return summariesMap;
  }
}

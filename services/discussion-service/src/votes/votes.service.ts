/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { VoteDto, VoteSummaryDto } from './dto/vote.dto.js';
import type { CreateVoteDto } from './dto/create-vote.dto.js';

@Injectable()
export class VotesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Create or update a vote on a response
   * If user already voted, updates the vote type
   * If user votes the same type again, removes the vote (toggle behavior)
   */
  async voteOnResponse(
    responseId: string,
    userId: string,
    createVoteDto: CreateVoteDto,
  ): Promise<VoteDto | null> {
    // Verify response exists
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    // Check if user is voting on their own response
    if (response.authorId === userId) {
      throw new BadRequestException('Cannot vote on your own response');
    }

    // Check for existing vote
    const existingVote = await this.prisma.vote.findUnique({
      where: {
        userId_responseId: {
          userId,
          responseId,
        },
      },
    });

    // If vote exists and is the same type, remove it (toggle off)
    if (existingVote && existingVote.voteType === createVoteDto.voteType) {
      await this.prisma.vote.delete({
        where: { id: existingVote.id },
      });
      return null; // Vote removed
    }

    // If vote exists but different type, update it
    if (existingVote) {
      const updatedVote = await this.prisma.vote.update({
        where: { id: existingVote.id },
        data: {
          voteType: createVoteDto.voteType,
        },
      });
      return this.mapToVoteDto(updatedVote);
    }

    // Create new vote
    const newVote = await this.prisma.vote.create({
      data: {
        userId,
        responseId,
        voteType: createVoteDto.voteType,
      },
    });

    return this.mapToVoteDto(newVote);
  }

  /**
   * Get vote summary for a response
   */
  async getVoteSummary(responseId: string, userId?: string): Promise<VoteSummaryDto> {
    // Aggregate counts in the database rather than materializing every vote row
    // and counting in JS. The caller's own vote is fetched with a single
    // indexed lookup on the (userId, responseId) unique key.
    const [grouped, userVoteRow] = await Promise.all([
      this.prisma.vote.groupBy({
        by: ['voteType'],
        where: { responseId },
        _count: { _all: true },
      }),
      userId
        ? this.prisma.vote.findUnique({
            where: { userId_responseId: { userId, responseId } },
            select: { voteType: true },
          })
        : Promise.resolve(null),
    ]);

    let upvotes = 0;
    let downvotes = 0;
    for (const group of grouped) {
      if (group.voteType === 'UPVOTE') {
        upvotes = group._count._all;
      } else if (group.voteType === 'DOWNVOTE') {
        downvotes = group._count._all;
      }
    }

    return {
      upvotes,
      downvotes,
      score: upvotes - downvotes,
      userVote: (userVoteRow?.voteType as 'UPVOTE' | 'DOWNVOTE' | undefined) ?? null,
    };
  }

  /**
   * Get vote summaries for multiple responses (for list views)
   */
  async getVoteSummaries(
    responseIds: string[],
    userId?: string,
  ): Promise<Map<string, VoteSummaryDto>> {
    const summariesMap = new Map<string, VoteSummaryDto>();

    // Initialize empty summaries so every requested id is present in the result.
    for (const responseId of responseIds) {
      summariesMap.set(responseId, { upvotes: 0, downvotes: 0, score: 0, userVote: null });
    }

    if (responseIds.length === 0) {
      return summariesMap;
    }

    // One grouped aggregation for all responses (instead of fetching every vote
    // row and filtering per response in a loop, which was O(responses × votes)),
    // plus a single targeted lookup for the caller's own votes.
    const [grouped, userVotes] = await Promise.all([
      this.prisma.vote.groupBy({
        by: ['responseId', 'voteType'],
        where: { responseId: { in: responseIds } },
        _count: { _all: true },
      }),
      userId
        ? this.prisma.vote.findMany({
            where: { userId, responseId: { in: responseIds } },
            select: { responseId: true, voteType: true },
          })
        : Promise.resolve([] as { responseId: string; voteType: string }[]),
    ]);

    for (const group of grouped) {
      const summary = summariesMap.get(group.responseId);
      if (!summary) {
        continue;
      }
      if (group.voteType === 'UPVOTE') {
        summary.upvotes = group._count._all;
      } else if (group.voteType === 'DOWNVOTE') {
        summary.downvotes = group._count._all;
      }
      summary.score = summary.upvotes - summary.downvotes;
    }

    for (const vote of userVotes) {
      const summary = summariesMap.get(vote.responseId);
      if (summary) {
        summary.userVote = vote.voteType as 'UPVOTE' | 'DOWNVOTE';
      }
    }

    return summariesMap;
  }

  /**
   * Remove a vote from a response
   */
  async removeVote(responseId: string, userId: string): Promise<void> {
    const vote = await this.prisma.vote.findUnique({
      where: {
        userId_responseId: {
          userId,
          responseId,
        },
      },
    });

    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    await this.prisma.vote.delete({
      where: { id: vote.id },
    });
  }

  private mapToVoteDto(vote: {
    id: string;
    userId: string;
    responseId: string;
    voteType: string;
    createdAt: Date;
    updatedAt: Date;
  }): VoteDto {
    return {
      id: vote.id,
      userId: vote.userId,
      responseId: vote.responseId,
      voteType: vote.voteType as 'UPVOTE' | 'DOWNVOTE',
      createdAt: vote.createdAt,
      updatedAt: vote.updatedAt,
    };
  }
}

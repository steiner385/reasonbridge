import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { VoteDto, VoteSummaryDto } from './dto/vote.dto.js';
import type { CreateVoteDto } from './dto/create-vote.dto.js';

@Injectable()
export class VotesService {
  constructor(private readonly prisma: PrismaService) {}

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
    const votes = await this.prisma.vote.findMany({
      where: { responseId },
    });

    const upvotes = votes.filter((v: { voteType: string }) => v.voteType === 'UPVOTE').length;
    const downvotes = votes.filter((v: { voteType: string }) => v.voteType === 'DOWNVOTE').length;
    const score = upvotes - downvotes;

    let userVote: 'UPVOTE' | 'DOWNVOTE' | null = null;
    if (userId) {
      const vote = votes.find((v: { userId: string }) => v.userId === userId);
      if (vote) {
        userVote = vote.voteType as 'UPVOTE' | 'DOWNVOTE';
      }
    }

    return {
      upvotes,
      downvotes,
      score,
      userVote,
    };
  }

  /**
   * Get vote summaries for multiple responses (for list views)
   */
  async getVoteSummaries(
    responseIds: string[],
    userId?: string,
  ): Promise<Map<string, VoteSummaryDto>> {
    const votes = await this.prisma.vote.findMany({
      where: {
        responseId: {
          in: responseIds,
        },
      },
    });

    const summariesMap = new Map<string, VoteSummaryDto>();

    // Initialize summaries for all responses
    for (const responseId of responseIds) {
      const responseVotes = votes.filter((v: { responseId: string }) => v.responseId === responseId);
      const upvotes = responseVotes.filter((v: { voteType: string }) => v.voteType === 'UPVOTE').length;
      const downvotes = responseVotes.filter((v: { voteType: string }) => v.voteType === 'DOWNVOTE').length;
      const score = upvotes - downvotes;

      let userVote: 'UPVOTE' | 'DOWNVOTE' | null = null;
      if (userId) {
        const vote = responseVotes.find((v: { userId: string }) => v.userId === userId);
        if (vote) {
          userVote = vote.voteType as 'UPVOTE' | 'DOWNVOTE';
        }
      }

      summariesMap.set(responseId, {
        upvotes,
        downvotes,
        score,
        userVote,
      });
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

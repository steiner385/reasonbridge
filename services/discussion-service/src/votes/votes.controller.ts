/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { VotesService } from './votes.service.js';
import { CreateVoteDto } from './dto/create-vote.dto.js';
import type { VoteDto, VoteSummaryDto } from './dto/vote.dto.js';
import { JwtAuthGuard, CurrentUser, type JwtPayload } from '../auth/index.js';

@Controller('responses')
export class VotesController {
  constructor(@Inject(VotesService) private readonly votesService: VotesService) {}

  /**
   * Vote on a response (upvote or downvote)
   * POST /responses/:responseId/vote
   *
   * Behavior:
   * - First vote: Creates the vote
   * - Same vote type: Removes the vote (toggle off)
   * - Different vote type: Updates to new vote type
   */
  @Post(':responseId/vote')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async voteOnResponse(
    @Param('responseId') responseId: string,
    @CurrentUser() user: JwtPayload,
    @Body() createVoteDto: CreateVoteDto,
  ): Promise<VoteDto | { message: string }> {
    const vote = await this.votesService.voteOnResponse(responseId, user.sub, createVoteDto);

    if (vote === null) {
      return { message: 'Vote removed' };
    }

    return vote;
  }

  /**
   * Remove a vote from a response
   * DELETE /responses/:responseId/vote
   */
  @Delete(':responseId/vote')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeVote(
    @Param('responseId') responseId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.votesService.removeVote(responseId, user.sub);
  }

  /**
   * Get vote summary for a response
   * GET /responses/:responseId/votes
   */
  @Get(':responseId/votes')
  async getVoteSummary(
    @Param('responseId') responseId: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<VoteSummaryDto> {
    return this.votesService.getVoteSummary(responseId, userId);
  }
}

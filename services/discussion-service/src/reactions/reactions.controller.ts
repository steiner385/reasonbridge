/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ReactionsService } from './reactions.service.js';
import { CreateReactionDto } from './dto/create-reaction.dto.js';
import type { ReactionDto, ReactionListDto } from './dto/reaction.dto.js';
import { JwtAuthGuard, CurrentUser, type JwtPayload } from '../auth/index.js';

@Controller('responses')
export class ReactionsController {
  constructor(@Inject(ReactionsService) private readonly reactionsService: ReactionsService) {}

  /**
   * Add a reaction to a response
   * POST /responses/:responseId/reactions
   */
  @Post(':responseId/reactions')
  @UseGuards(JwtAuthGuard)
  async addReaction(
    @Param('responseId') responseId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReactionDto,
  ): Promise<ReactionDto> {
    return this.reactionsService.addReaction(responseId, user.sub, dto);
  }

  /**
   * Remove a reaction from a response
   * DELETE /responses/:responseId/reactions/:emoji
   */
  @Delete(':responseId/reactions/:emoji')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeReaction(
    @Param('responseId') responseId: string,
    @Param('emoji') emoji: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.reactionsService.removeReaction(responseId, user.sub, emoji);
  }

  /**
   * Get all reactions for a response
   * GET /responses/:responseId/reactions
   */
  @Get(':responseId/reactions')
  async getReactions(
    @Param('responseId') responseId: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<ReactionListDto> {
    return this.reactionsService.getReactions(responseId, userId);
  }
}

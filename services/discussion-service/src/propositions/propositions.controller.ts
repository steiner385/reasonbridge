/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PropositionsService } from './propositions.service.js';
import { CreatePropositionDto } from './dto/create-proposition.dto.js';
import type { PropositionResponseDto } from './dto/create-proposition.dto.js';

/**
 * Controller for proposition management
 * Feature 016: Topic Management - Propositions (T213)
 */
@Controller('topics/:topicId/propositions')
export class PropositionsController {
  constructor(private readonly propositionsService: PropositionsService) {}

  /**
   * Get all propositions for a topic
   */
  @Get()
  async getTopicPropositions(@Param('topicId') topicId: string) {
    return this.propositionsService.findByTopicId(topicId);
  }

  /**
   * Create a new proposition for a topic
   * Feature 016: Topic Management - Initial Propositions (T213)
   *
   * Authentication: Required (user must be logged in)
   * Rate limit: 20 propositions per hour per user
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 per hour
  async createProposition(
    @Param('topicId') topicId: string,
    @Body() createPropositionDto: CreatePropositionDto,
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Request() req: any,
  ): Promise<PropositionResponseDto> {
    // Extract userId from multiple sources
    const userId = userIdHeader || req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found in request. Authentication required.');
    }

    return this.propositionsService.createProposition(topicId, userId, createPropositionDto);
  }
}

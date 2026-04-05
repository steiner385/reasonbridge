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
  Query,
  Headers,
  Request,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PropositionsService } from './propositions.service.js';
import { CreatePropositionDto } from './dto/create-proposition.dto.js';
import type { PropositionResponseDto } from './dto/create-proposition.dto.js';
import { type AuthenticatedRequest, getUserIdFromRequest } from '../auth/index.js';

/**
 * Controller for proposition management
 * Feature 016: Topic Management - Propositions (T213)
 */
@Controller('topics/:topicId/propositions')
export class PropositionsController {
  constructor(
    @Inject(PropositionsService) private readonly propositionsService: PropositionsService,
  ) {}

  /**
   * Get propositions for a topic with pagination
   *
   * @param topicId - The topic ID
   * @param limit - Maximum number of propositions to return (default: 100, max: 500)
   * @param offset - Number of propositions to skip (default: 0)
   */
  @Get()
  async getTopicPropositions(
    @Param('topicId') topicId: string,
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string,
  ) {
    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
    return this.propositionsService.findByTopicId(topicId, limit, offset);
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
    @Request() req: AuthenticatedRequest,
  ): Promise<PropositionResponseDto> {
    // Extract userId from multiple sources
    const userId = getUserIdFromRequest(userIdHeader, req);

    if (!userId) {
      throw new Error('User ID not found in request. Authentication required.');
    }

    return this.propositionsService.createProposition(topicId, userId, createPropositionDto);
  }
}

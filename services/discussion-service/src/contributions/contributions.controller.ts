/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ContributionsController - REST API for user contributions
 *
 * Provides endpoints for fetching user contributions with pagination and filtering.
 */

import { Controller, Get, Param, Query, Inject, ParseUUIDPipe, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ContributionsService } from './contributions.service.js';
import { GetContributionsDto, ContributionType } from './dto/get-contributions.dto.js';
import { ContributionItemDto, ContributionStatsDto } from './dto/contribution-item.dto.js';
import { PaginatedResponseDto } from '../dto/pagination.dto.js';

@ApiTags('contributions')
@Controller('users')
export class ContributionsController {
  constructor(
    @Inject(ContributionsService)
    private readonly contributionsService: ContributionsService,
  ) {}

  /**
   * Get contributions for a user
   * GET /users/:userId/contributions
   */
  @Get(':userId/contributions')
  @ApiOperation({
    summary: 'Get user contributions',
    description:
      'Fetches paginated list of contributions (topics, responses, votes, propositions) for a user',
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-indexed)',
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (max 100)',
    type: 'number',
    example: 50,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by contribution type',
    enum: ContributionType,
  })
  @ApiQuery({
    name: 'topicId',
    required: false,
    description: 'Filter by topic ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (desc = newest first)',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of user contributions',
    type: PaginatedResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  async getContributions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: GetContributionsDto,
  ): Promise<PaginatedResponseDto<ContributionItemDto>> {
    return this.contributionsService.getContributions(userId, query);
  }

  /**
   * Get contribution statistics for a user
   * GET /users/:userId/contributions/stats
   */
  @Get(':userId/contributions/stats')
  @ApiOperation({
    summary: 'Get user contribution statistics',
    description: 'Returns counts of each contribution type for a user',
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contribution statistics',
    type: ContributionStatsDto,
  })
  async getContributionStats(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ContributionStatsDto> {
    return this.contributionsService.getContributionStats(userId);
  }
}

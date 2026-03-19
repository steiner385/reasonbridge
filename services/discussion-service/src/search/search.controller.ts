/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service.js';
import { UnifiedSearchQueryDto } from './dto/unified-search-query.dto.js';
import { UnifiedSearchResultsDto } from './dto/unified-search-results.dto.js';
import { OptionalAuthGuard } from '../auth/index.js';

/**
 * Controller for unified search across discussions
 * Feature #1040: Full-Text Search for Discussions
 *
 * Provides a single endpoint that searches both topics and responses,
 * returning merged, ranked results with optional filtering.
 */
@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Search across topics and responses
   *
   * @param query - Search query parameters
   * @returns Unified search results with pagination
   */
  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search discussions',
    description: `
      Search across all topics and responses using full-text search.

      Features:
      - Full-text search with PostgreSQL tsvector (fast, ranked results)
      - Filter by type (topics only, responses only, or all)
      - Filter by topic, author, or date range
      - Results sorted by relevance or date
      - Highlighted search terms in response content

      Examples:
      - GET /search?q=climate+change
      - GET /search?q=renewable+energy&type=topics
      - GET /search?q=carbon+tax&topicId=123&type=responses
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: UnifiedSearchResultsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search query (too short, invalid parameters)',
  })
  async search(@Query() query: UnifiedSearchQueryDto): Promise<UnifiedSearchResultsDto> {
    return this.searchService.search(query);
  }
}

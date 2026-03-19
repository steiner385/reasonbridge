/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/index.js';
import { TopicsModule } from '../topics/topics.module.js';
import { ResponsesModule } from '../responses/responses.module.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { SearchCacheService } from './search-cache.service.js';

/**
 * Search module for unified full-text search
 * Feature #1040: Full-Text Search for Discussions
 *
 * Provides a single endpoint that searches both topics and responses,
 * combining results from TopicsSearchService and ResponsesSearchService.
 * Results are cached using Redis (via CacheModule) for 5 minutes.
 */
@Module({
  imports: [PrismaModule, AuthModule, TopicsModule, ResponsesModule],
  controllers: [SearchController],
  providers: [SearchService, SearchCacheService],
  exports: [SearchService, SearchCacheService],
})
export class SearchModule {}

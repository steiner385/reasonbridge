/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { CacheModule } from './cache/cache.module.js';
import { HealthModule } from './health/health.module.js';
import { TopicsModule } from './topics/topics.module.js';
import { ResponsesModule } from './responses/responses.module.js';
import { VotesModule } from './votes/votes.module.js';
import { AlignmentsModule } from './alignments/alignments.module.js';
import { DiscussionsModule } from './discussions/discussions.module.js';
import { PropositionsModule } from './propositions/propositions.module.js';
import { TagsModule } from './tags/tags.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { MetricsModule } from './observability/index.js';
import { ReactionsModule } from './reactions/reactions.module.js';
import { BookmarksModule } from './bookmarks/bookmarks.module.js';

/**
 * T009 [P] - Main application module with rate limiting configuration
 * Rate limits (Feature 009 - Discussion Participation):
 * - Global: 100 requests per minute (prevents abuse)
 * - Discussion creation: 5 per day (configured in controller)
 * - Response posting: 10 per minute (configured in controller)
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Look for .env files in order: local service config, then root monorepo config
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    // T009 [P] - Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute globally
      },
      {
        name: 'discussion-creation',
        ttl: 86400000, // 24 hours (1 day)
        limit: 5, // 5 discussions per day
      },
      {
        name: 'response-posting',
        ttl: 60000, // 60 seconds
        limit: 10, // 10 responses per minute
      },
    ]),
    PrismaModule,
    // CacheModule is global - import once here, available everywhere
    CacheModule,
    MetricsModule,
    HealthModule,
    // T015-T044 - Topic management (Feature 016)
    TopicsModule,
    // T037-T087 - Response management (Feature 009)
    ResponsesModule,
    VotesModule,
    AlignmentsModule,
    // T016 - Discussion module (Feature 009)
    DiscussionsModule,
    PropositionsModule,
    // T216 - Tag management (Feature 016)
    TagsModule,
    // T249 - Activity feed integration (#245)
    ClientsModule,
    // UI engagement features - emoji reactions and bookmarks
    ReactionsModule,
    BookmarksModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

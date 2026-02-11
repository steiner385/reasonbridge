/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, forwardRef } from '@nestjs/common';
import { TopicsController } from './topics.controller.js';
import { TopicDraftsController } from './topic-drafts.controller.js';
import { TopicLinksController, LinkedTopicsController } from './topic-links.controller.js';
import { TopicsService } from './topics.service.js';
import { TopicDraftsService } from './topic-drafts.service.js';
import { TopicLinksService } from './topic-links.service.js';
import { CommonGroundExportService } from '../services/common-ground-export.service.js';
import { TopicsSearchService } from './topics-search.service.js';
import { SlugGeneratorService } from './slug-generator.service.js';
import { TopicsEditService } from './topics-edit.service.js';
import { TopicsAnalyticsService } from './topics-analytics.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CacheModule } from '../cache/cache.module.js';
import { PropositionsModule } from '../propositions/propositions.module.js';

@Module({
  imports: [PrismaModule, CacheModule, PropositionsModule],
  controllers: [
    TopicsController,
    TopicDraftsController,
    TopicLinksController,
    LinkedTopicsController,
  ],
  providers: [
    TopicsService,
    TopicDraftsService,
    TopicLinksService,
    CommonGroundExportService,
    TopicsSearchService,
    SlugGeneratorService,
    TopicsEditService,
    TopicsAnalyticsService,
  ],
  exports: [TopicsService, TopicDraftsService, TopicLinksService],
})
export class TopicsModule {}

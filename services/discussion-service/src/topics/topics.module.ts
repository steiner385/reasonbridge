/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller.js';
import { TopicDraftsController } from './topic-drafts.controller.js';
import { TopicLinksController, LinkedTopicsController } from './topic-links.controller.js';
import { TopicAccessController } from './topic-access.controller.js';
import { TopicsService } from './topics.service.js';
import { TopicDraftsService } from './topic-drafts.service.js';
import { TopicLinksService } from './topic-links.service.js';
import { TopicAccessService } from './topic-access.service.js';
import { CommonGroundExportService } from '../services/common-ground-export.service.js';
import { TopicsSearchService } from './topics-search.service.js';
import { SlugGeneratorService } from './slug-generator.service.js';
import { TopicsEditService } from './topics-edit.service.js';
import { TopicsAnalyticsService } from './topics-analytics.service.js';
import { TopicMergeService } from './topic-merge.service.js';
import { TopicStatusService } from './topic-status.service.js';
import { TopicCommonGroundService } from './topic-common-ground.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/index.js';
// CacheModule removed - it's global and imported once in AppModule
import { PropositionsModule } from '../propositions/propositions.module.js';

@Module({
  imports: [PrismaModule, AuthModule, PropositionsModule],
  controllers: [
    TopicsController,
    TopicDraftsController,
    TopicLinksController,
    LinkedTopicsController,
    TopicAccessController,
  ],
  providers: [
    TopicsService,
    TopicDraftsService,
    TopicLinksService,
    TopicAccessService,
    CommonGroundExportService,
    TopicsSearchService,
    SlugGeneratorService,
    TopicsEditService,
    TopicsAnalyticsService,
    TopicMergeService,
    TopicStatusService,
    TopicCommonGroundService,
  ],
  exports: [
    TopicsService,
    TopicDraftsService,
    TopicLinksService,
    TopicsSearchService,
    TopicAccessService,
  ],
})
export class TopicsModule {}

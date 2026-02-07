/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller.js';
import { TopicsService } from './topics.service.js';
import { CommonGroundExportService } from '../services/common-ground-export.service.js';
import { TopicsSearchService } from './topics-search.service.js';
import { SlugGeneratorService } from './slug-generator.service.js';
import { TopicsEditService } from './topics-edit.service.js';
import { TopicsAnalyticsService } from './topics-analytics.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CacheModule } from '../cache/cache.module.js';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [TopicsController],
  providers: [
    TopicsService,
    CommonGroundExportService,
    TopicsSearchService,
    SlugGeneratorService,
    TopicsEditService,
    TopicsAnalyticsService,
  ],
  exports: [TopicsService],
})
export class TopicsModule {}

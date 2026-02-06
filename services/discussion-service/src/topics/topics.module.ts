/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller.js';
import { TopicsService } from './topics.service.js';
import { CommonGroundExportService } from '../services/common-ground-export.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CacheModule } from '../cache/cache.module.js';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [TopicsController],
  providers: [TopicsService, CommonGroundExportService],
  exports: [TopicsService],
})
export class TopicsModule {}

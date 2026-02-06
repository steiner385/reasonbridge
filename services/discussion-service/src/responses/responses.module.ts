/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T017 - Response Module (Extended for Feature 009)
 *
 * Existing module will be extended with new functionality:
 * - Phase 4 (T037-T042): Response posting with discussion linking
 * - Phase 5 (T052-T056): Threaded reply logic
 * - Phase 6 (T066-T072): Response editing with optimistic locking
 * - Phase 7 (T081-T087): Conditional soft/hard delete
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CacheModule } from '../cache/cache.module.js';
import { ResponsesController } from './responses.controller.js';
import { ResponsesService } from './responses.service.js';
import { ContentModerationService } from './services/content-moderation.service.js';
import { CommonGroundTriggerService } from '../services/common-ground-trigger.service.js';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [ResponsesController],
  providers: [ResponsesService, ContentModerationService, CommonGroundTriggerService],
  exports: [ResponsesService, ContentModerationService],
})
export class ResponsesModule {}

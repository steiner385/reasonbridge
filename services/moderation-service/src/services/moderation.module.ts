/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ContentScreeningService } from './content-screening.service.js';
import { AIReviewService } from './ai-review.service.js';
import { ModerationActionsService } from './moderation-actions.service.js';
import { AppealService } from './appeal.service.js';
import { ModerationQueueService } from './moderation-queue.service.js';
import { GroomingClientService } from './grooming-client.service.js';
import { SafetyReportService } from './safety-report.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [PrismaModule, QueueModule, HttpModule],
  providers: [
    ContentScreeningService,
    AIReviewService,
    ModerationActionsService,
    AppealService,
    ModerationQueueService,
    GroomingClientService,
    SafetyReportService,
  ],
  exports: [
    ContentScreeningService,
    AIReviewService,
    ModerationActionsService,
    AppealService,
    ModerationQueueService,
    GroomingClientService,
    SafetyReportService,
  ],
})
export class ModerationModule {}

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ContentScreeningService } from './content-screening.service.js';
import { AIReviewService } from './ai-review.service.js';
import { ModerationActionsService } from './moderation-actions.service.js';
import { AppealService } from './appeal.service.js';
import { ModerationQueueService } from './moderation-queue.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [PrismaModule, QueueModule],
  providers: [
    ContentScreeningService,
    AIReviewService,
    ModerationActionsService,
    AppealService,
    ModerationQueueService,
  ],
  exports: [
    ContentScreeningService,
    AIReviewService,
    ModerationActionsService,
    AppealService,
    ModerationQueueService,
  ],
})
export class ModerationModule {}

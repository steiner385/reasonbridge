import { Module } from '@nestjs/common';
import { ContentScreeningService } from './content-screening.service.js';
import { AIReviewService } from './ai-review.service.js';
import { ModerationActionsService } from './moderation-actions.service.js';
import { AppealService } from './appeal.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [PrismaModule, QueueModule],
  providers: [ContentScreeningService, AIReviewService, ModerationActionsService, AppealService],
  exports: [ContentScreeningService, AIReviewService, ModerationActionsService, AppealService],
})
export class ModerationModule {}

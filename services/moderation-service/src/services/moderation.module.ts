import { Module } from '@nestjs/common';
import { ContentScreeningService } from './content-screening.service.js';
import { AIReviewService } from './ai-review.service.js';
import { ModerationActionsService } from './moderation-actions.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [PrismaModule, QueueModule],
  providers: [ContentScreeningService, AIReviewService, ModerationActionsService],
  exports: [ContentScreeningService, AIReviewService, ModerationActionsService],
})
export class ModerationModule {}

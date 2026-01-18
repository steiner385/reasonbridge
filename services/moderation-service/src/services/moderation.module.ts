import { Module } from '@nestjs/common';
import { ContentScreeningService } from './content-screening.service.js';
import { AIReviewService } from './ai-review.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [ContentScreeningService, AIReviewService],
  exports: [ContentScreeningService, AIReviewService],
})
export class ModerationModule {}

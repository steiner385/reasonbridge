import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AiModule } from './ai/ai.module.js';
import { FeedbackModule } from './feedback/feedback.module.js';

@Module({
  imports: [PrismaModule, HealthModule, AiModule, FeedbackModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

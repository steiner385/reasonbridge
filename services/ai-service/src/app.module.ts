import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AiModule } from './ai/ai.module.js';
import { FeedbackModule } from './feedback/feedback.module.js';
import { SuggestionsModule } from './suggestions/suggestions.module.js';

@Module({
  imports: [PrismaModule, HealthModule, AiModule, FeedbackModule, SuggestionsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

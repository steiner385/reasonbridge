import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AiModule } from './ai/ai.module.js';
import { FeedbackModule } from './feedback/feedback.module.js';
import { SuggestionsModule } from './suggestions/suggestions.module.js';
import { CommonGroundModule } from './common-ground/common-ground.module.js';
import { DemoAIModule } from './demo/demo-ai.module.js';
import { SimulatorModule } from './simulator/simulator.module.js';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AiModule,
    FeedbackModule,
    SuggestionsModule,
    CommonGroundModule,
    DemoAIModule,
    SimulatorModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

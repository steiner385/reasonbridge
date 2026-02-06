/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AiModule } from './ai/ai.module.js';
import { FeedbackModule } from './feedback/feedback.module.js';
import { SuggestionsModule } from './suggestions/suggestions.module.js';
import { CommonGroundModule } from './common-ground/common-ground.module.js';
import { DemoAIModule } from './demo/demo-ai.module.js';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AiModule,
    FeedbackModule,
    SuggestionsModule,
    CommonGroundModule,
    DemoAIModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

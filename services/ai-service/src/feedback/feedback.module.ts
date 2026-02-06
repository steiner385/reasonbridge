/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackService } from './feedback.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CacheModule } from '../cache/index.js';
import { AiModule } from '../ai/ai.module.js';
import { ResponseAnalyzerService } from '../services/response-analyzer.service.js';
import { ToneAnalyzerService } from '../services/tone-analyzer.service.js';
import { FallacyDetectorService } from '../services/fallacy-detector.service.js';
import { ClarityAnalyzerService } from '../services/clarity-analyzer.service.js';
import { FeedbackAnalyticsService } from '../services/feedback-analytics.service.js';

/**
 * Module for feedback functionality
 * Includes Redis caching for analysis results to improve response times
 * Includes AI-powered analysis via Bedrock for enhanced feedback
 */
@Module({
  imports: [PrismaModule, CacheModule, AiModule],
  controllers: [FeedbackController],
  providers: [
    FeedbackService,
    // SemanticCacheService is provided by CacheModule (imported above)
    // BedrockService is provided by AiModule (imported above)
    FeedbackAnalyticsService,
    ResponseAnalyzerService,
    ToneAnalyzerService,
    FallacyDetectorService,
    ClarityAnalyzerService,
  ],
  exports: [FeedbackService],
})
export class FeedbackModule {}

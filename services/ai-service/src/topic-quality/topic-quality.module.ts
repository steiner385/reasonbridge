/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { TopicQualityController } from './topic-quality.controller.js';
import { TopicQualityService } from './topic-quality.service.js';
import { AiModule } from '../ai/ai.module.js';

/**
 * Module for topic quality analysis
 * Feature 016: Topic Management (T214)
 */
@Module({
  imports: [AiModule],
  controllers: [TopicQualityController],
  providers: [TopicQualityService],
  exports: [TopicQualityService],
})
export class TopicQualityModule {}

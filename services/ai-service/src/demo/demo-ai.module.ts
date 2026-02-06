/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo AI Module
 *
 * Provides demo-specific AI functionality with fallback support.
 */

import { Module } from '@nestjs/common';
import { DemoAIController } from './demo-ai.controller.js';
import { DemoAIService } from '../ai/demo-ai.service.js';
import { BedrockService } from '../ai/bedrock.service.js';

@Module({
  controllers: [DemoAIController],
  providers: [DemoAIService, BedrockService],
  exports: [DemoAIService],
})
export class DemoAIModule {}

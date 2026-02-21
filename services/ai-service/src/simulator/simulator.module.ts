/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller.js';
import { SimulatorService } from './simulator.service.js';
import { AiModule } from '../ai/ai.module.js';
import { ModePromptBuilder } from './services/mode-prompt-builder.js';
import { ArgumentAnalyzerService } from './services/argument-analyzer.service.js';
import { ChatService } from './services/chat.service.js';
import { InsightsGeneratorService } from './services/insights-generator.service.js';

/**
 * Module for discussion simulator functionality
 */
@Module({
  imports: [AiModule],
  controllers: [SimulatorController],
  providers: [
    SimulatorService,
    ModePromptBuilder,
    ArgumentAnalyzerService,
    ChatService,
    InsightsGeneratorService,
  ],
  exports: [
    SimulatorService,
    ModePromptBuilder,
    ArgumentAnalyzerService,
    ChatService,
    InsightsGeneratorService,
  ],
})
export class SimulatorModule {}

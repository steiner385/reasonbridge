/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SimulatorService } from './simulator.service.js';
import {
  GenerateResponseDto,
  GenerateResponseResultDto,
  GeneratePositionsDto,
  GeneratePositionsResultDto,
  GeneratePromptDto,
  GeneratePromptResultDto,
  ChatRequestDto,
  AnalyzeArgumentDto,
  GenerateInsightsDto,
} from './dto/index.js';
import { ChatService, type ChatResponse } from './services/chat.service.js';
import { ArgumentAnalyzerService } from './services/argument-analyzer.service.js';
import { InsightsGeneratorService } from './services/insights-generator.service.js';
import { PRESET_PERSONAS } from './data/preset-personas.js';
import type {
  PresetPersona,
  ArgumentAnalysis,
  LearningInsights,
} from './types/conversation-mode.types.js';

/**
 * Controller for discussion simulator endpoints
 *
 * Provides both legacy simulation endpoints and new persona mode endpoints:
 * - Legacy: generate-positions, generate-response, generate-prompt
 * - Persona Mode: personas, chat, analyze, insights
 */
@Controller('simulator')
export class SimulatorController {
  constructor(
    private readonly simulatorService: SimulatorService,
    private readonly chatService: ChatService,
    private readonly argumentAnalyzerService: ArgumentAnalyzerService,
    private readonly insightsGeneratorService: InsightsGeneratorService,
  ) {}

  /**
   * Generate opposing positions for a custom topic
   * POST /simulator/generate-positions
   *
   * @param dto Request containing topic title and optional context
   * @returns Two opposing positions with labels and summaries
   */
  @Post('generate-positions')
  @HttpCode(HttpStatus.OK)
  async generatePositions(@Body() dto: GeneratePositionsDto): Promise<GeneratePositionsResultDto> {
    return this.simulatorService.generatePositions(dto);
  }

  /**
   * Generate an AI agent response
   * POST /simulator/generate-response
   *
   * @param dto Request containing persona, action, and context
   * @returns Generated response with content and reasoning
   */
  @Post('generate-response')
  @HttpCode(HttpStatus.OK)
  async generateResponse(@Body() dto: GenerateResponseDto): Promise<GenerateResponseResultDto> {
    return this.simulatorService.generateResponse(dto);
  }

  /**
   * Generate system prompt from custom persona config
   * POST /simulator/generate-prompt
   *
   * @param dto Request containing persona configuration
   * @returns Generated system prompt ready for use with AI models
   */
  @Post('generate-prompt')
  @HttpCode(HttpStatus.OK)
  async generatePrompt(@Body() dto: GeneratePromptDto): Promise<GeneratePromptResultDto> {
    return this.simulatorService.generatePrompt(dto);
  }

  // =============================================
  // Persona Mode Endpoints (new in v2)
  // =============================================

  /**
   * List all preset personas available for discussion simulation
   * GET /simulator/personas
   *
   * @returns Array of preset personas with their configurations
   */
  @Get('personas')
  getPresetPersonas(): PresetPersona[] {
    return PRESET_PERSONAS;
  }

  /**
   * Generate a persona response in the current conversation
   * POST /simulator/chat
   *
   * @param dto Chat request with persona config, mode, difficulty, and message
   * @returns AI-generated response as the configured persona
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatRequestDto): Promise<ChatResponse> {
    return this.chatService.generateResponse(dto);
  }

  /**
   * Analyze a user's argument for logical fallacies and quality
   * POST /simulator/analyze
   *
   * @param dto Argument analysis request with user message and context
   * @returns Analysis including fallacies, scores, and suggestions
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeArgument(@Body() dto: AnalyzeArgumentDto): Promise<ArgumentAnalysis> {
    return this.argumentAnalyzerService.analyze(dto);
  }

  /**
   * Generate learning insights from a completed conversation transcript
   * POST /simulator/insights
   *
   * @param dto Insights request with transcript, mode, and persona info
   * @returns Learning insights with strengths, improvements, and recommendations
   */
  @Post('insights')
  @HttpCode(HttpStatus.OK)
  async generateInsights(@Body() dto: GenerateInsightsDto): Promise<LearningInsights> {
    return this.insightsGeneratorService.generateInsights(dto);
  }
}

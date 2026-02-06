/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SimulatorService } from './simulator.service.js';
import {
  GenerateResponseDto,
  GenerateResponseResultDto,
  GeneratePositionsDto,
  GeneratePositionsResultDto,
  GeneratePromptDto,
  GeneratePromptResultDto,
} from './dto/index.js';

/**
 * Controller for discussion simulator endpoints
 */
@Controller('simulator')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

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
}

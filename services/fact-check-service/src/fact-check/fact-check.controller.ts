/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FactCheckService } from './fact-check.service.js';
import { FactCheckRequestDto } from './dto/fact-check-request.dto.js';
import {
  FactCheckResponseDto,
  NoFactCheckFoundResponseDto,
} from './dto/fact-check-response.dto.js';

/**
 * Controller for fact-check endpoints
 *
 * Provides endpoints for:
 * - POST /fact-check/request - Check a claim against fact-checking sources
 * - GET /fact-check/health - Get health status of fact-check clients
 */
@Controller('fact-check')
export class FactCheckController {
  constructor(private readonly factCheckService: FactCheckService) {}

  /**
   * Check a claim against multiple fact-checking sources
   *
   * @param request - The fact-check request containing the claim to verify
   * @returns Fact-check results from multiple sources or a "not found" response
   */
  @Post('request')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async checkClaim(
    @Body() request: FactCheckRequestDto,
  ): Promise<FactCheckResponseDto | NoFactCheckFoundResponseDto> {
    return this.factCheckService.checkClaim(request);
  }

  /**
   * Get health status of all configured fact-check clients
   */
  @Get('health')
  async getHealth(): Promise<{ clients: { name: string; isHealthy: boolean; message: string }[] }> {
    const clients = await this.factCheckService.getClientsHealth();
    return { clients };
  }
}

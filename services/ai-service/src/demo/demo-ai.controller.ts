/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo AI Controller
 *
 * Provides endpoints for checking AI service status in demo environments.
 */

import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { BedrockService } from '../ai/bedrock.service.js';
import { DemoAIService } from '../ai/demo-ai.service.js';
import {
  AIServiceStatusDto,
  AICapabilitiesStatusDto,
  AIFeatureStatusDto,
} from './dto/ai-status.dto.js';

@Controller('demo/ai')
export class DemoAIController {
  private readonly logger = new Logger(DemoAIController.name);

  constructor(
    private readonly bedrockService: BedrockService,
    private readonly demoAIService: DemoAIService,
  ) {}

  /**
   * GET /demo/ai/status
   * Returns current AI service status including Bedrock availability and fallback config
   *
   * Public endpoint - no authentication required
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getAIStatus(): Promise<AIServiceStatusDto> {
    this.logger.log('GET /demo/ai/status - checking AI service status');

    const healthCheck = await this.bedrockService.healthCheck();
    const serviceStatus = await this.demoAIService.getStatus();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unavailable';
    let message: string;

    if (healthCheck.healthy) {
      status = 'healthy';
      message = 'All AI features available via AWS Bedrock';
    } else if (serviceStatus.fallbackEnabled) {
      status = 'degraded';
      message = 'Running with fallback responses - Bedrock unavailable';
    } else {
      status = 'unavailable';
      message = 'AI features unavailable';
    }

    return {
      status,
      health: {
        bedrockAvailable: healthCheck.healthy,
        bedrockModelId: healthCheck.modelId,
        lastHealthCheck: serviceStatus.lastHealthCheck?.toISOString() || null,
        latencyMs: healthCheck.latencyMs,
      },
      fallback: {
        cacheEnabled: serviceStatus.cacheEnabled,
        cacheSize: serviceStatus.cacheSize,
        fallbackEnabled: serviceStatus.fallbackEnabled,
        fallbackTypes: ['clarity', 'tone', 'fallacy', 'common-ground'],
      },
      environment: {
        demoMode: process.env['DEMO_MODE'] === 'true',
        nodeEnv: process.env['NODE_ENV'] || 'development',
      },
      message,
    };
  }

  /**
   * GET /demo/ai/capabilities
   * Returns status of individual AI features
   *
   * Public endpoint - no authentication required
   */
  @Get('capabilities')
  @HttpCode(HttpStatus.OK)
  async getAICapabilities(): Promise<AICapabilitiesStatusDto> {
    this.logger.log('GET /demo/ai/capabilities - checking AI capabilities');

    const healthCheck = await this.bedrockService.healthCheck();
    const bedrockAvailable = healthCheck.healthy;

    const features: AIFeatureStatusDto[] = [
      {
        name: 'Clarity Analysis',
        available: true,
        source: bedrockAvailable ? 'bedrock' : 'fallback',
        avgLatencyMs: bedrockAvailable ? 1500 : 50,
      },
      {
        name: 'Tone Detection',
        available: true,
        source: bedrockAvailable ? 'bedrock' : 'fallback',
        avgLatencyMs: bedrockAvailable ? 1200 : 30,
      },
      {
        name: 'Fallacy Detection',
        available: true,
        source: bedrockAvailable ? 'bedrock' : 'fallback',
        avgLatencyMs: bedrockAvailable ? 2000 : 40,
      },
      {
        name: 'Common Ground Analysis',
        available: true,
        source: bedrockAvailable ? 'bedrock' : 'fallback',
        avgLatencyMs: bedrockAvailable ? 3000 : 100,
      },
      {
        name: 'Value Identification',
        available: bedrockAvailable,
        source: bedrockAvailable ? 'bedrock' : 'fallback',
        avgLatencyMs: bedrockAvailable ? 2500 : 60,
      },
      {
        name: 'Text Clustering',
        available: bedrockAvailable,
        source: bedrockAvailable ? 'bedrock' : 'fallback',
        avgLatencyMs: bedrockAvailable ? 3500 : 80,
      },
    ];

    return {
      features,
      ready: true, // Always ready due to fallbacks
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * GET /demo/ai/health
   * Simple health check endpoint
   *
   * Public endpoint - no authentication required
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{ status: string; bedrockHealthy: boolean }> {
    const healthCheck = await this.bedrockService.healthCheck();

    return {
      status: 'ok',
      bedrockHealthy: healthCheck.healthy,
    };
  }
}

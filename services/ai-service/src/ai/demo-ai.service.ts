/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo AI Service
 *
 * Provides AI capabilities for demo environments with graceful fallback.
 * Tries live Bedrock first, falls back to pre-computed responses if unavailable.
 */

import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from './bedrock.service.js';
import { InMemoryDemoCacheStorage } from './demo-cache.interface.js';
import type {
  DemoCacheStorage,
  CachedClarityAnalysis,
  CachedToneAnalysis,
  CachedCommonGroundAnalysis,
} from './demo-cache.interface.js';
import {
  getFallbackClarityAnalysis,
  getFallbackToneAnalysis,
  getFallbackCommonGround,
} from './demo-fallbacks.js';

/**
 * AI analysis result with source tracking
 */
export interface AIAnalysisResult<T> {
  data: T;
  source: 'bedrock' | 'cache' | 'fallback';
  latencyMs: number;
}

/**
 * Service status information
 */
export interface DemoAIServiceStatus {
  bedrockAvailable: boolean;
  bedrockModelId: string | null;
  cacheEnabled: boolean;
  cacheSize: number;
  fallbackEnabled: boolean;
  lastHealthCheck: Date | null;
}

@Injectable()
export class DemoAIService {
  private readonly logger = new Logger(DemoAIService.name);
  private readonly cache: DemoCacheStorage;
  private lastHealthCheck: Date | null = null;
  private bedrockHealthy: boolean = false;

  constructor(private readonly bedrockService: BedrockService) {
    this.cache = new InMemoryDemoCacheStorage();
    this.logger.log('Demo AI Service initialized');
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<DemoAIServiceStatus> {
    const bedrockAvailable = await this.checkBedrockHealth();

    return {
      bedrockAvailable,
      bedrockModelId: process.env['BEDROCK_MODEL_ID'] || null,
      cacheEnabled: true,
      cacheSize: 0, // In-memory cache doesn't track size easily
      fallbackEnabled: true,
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  /**
   * Check Bedrock health status
   */
  async checkBedrockHealth(): Promise<boolean> {
    try {
      const isReady = await this.bedrockService.isReady();
      this.bedrockHealthy = isReady;
      this.lastHealthCheck = new Date();
      return isReady;
    } catch (error) {
      this.logger.warn('Bedrock health check failed', error);
      this.bedrockHealthy = false;
      this.lastHealthCheck = new Date();
      return false;
    }
  }

  /**
   * Analyze response clarity with fallback
   */
  async analyzeClarityWithFallback(
    responseId: string,
    content: string,
  ): Promise<AIAnalysisResult<CachedClarityAnalysis>> {
    const startTime = Date.now();

    // Try cache first
    const cached = await this.cache.getClarityAnalysis(responseId);
    if (cached) {
      return {
        data: cached,
        source: 'cache',
        latencyMs: Date.now() - startTime,
      };
    }

    // Try Bedrock
    if (this.bedrockHealthy || (await this.checkBedrockHealth())) {
      try {
        const result = await this.bedrockService.analyzeContent(content);
        if (result.analyzed) {
          const analysis: CachedClarityAnalysis = {
            responseId,
            analysis: result.content,
            clarityScore: 0.75, // Extracted from AI response in real impl
            suggestions: [],
            cachedAt: new Date(),
          };

          await this.cache.setClarityAnalysis(responseId, analysis);

          return {
            data: analysis,
            source: 'bedrock',
            latencyMs: Date.now() - startTime,
          };
        }
      } catch (error) {
        this.logger.warn('Bedrock clarity analysis failed, using fallback', error);
      }
    }

    // Use fallback
    const fallbackAnalysis = getFallbackClarityAnalysis(content);
    const analysis: CachedClarityAnalysis = {
      responseId,
      analysis: fallbackAnalysis,
      clarityScore: 0.65,
      suggestions: ['Consider adding specific examples', 'Structure with clear sections'],
      cachedAt: new Date(),
    };

    return {
      data: analysis,
      source: 'fallback',
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Analyze response tone with fallback
   */
  async analyzeToneWithFallback(
    responseId: string,
    content: string,
  ): Promise<AIAnalysisResult<CachedToneAnalysis>> {
    const startTime = Date.now();

    // Try cache first
    const cached = await this.cache.getToneAnalysis(responseId);
    if (cached) {
      return {
        data: cached,
        source: 'cache',
        latencyMs: Date.now() - startTime,
      };
    }

    // Try Bedrock
    if (this.bedrockHealthy || (await this.checkBedrockHealth())) {
      try {
        const result = await this.bedrockService.analyzeContent(
          `Analyze the tone of this message: ${content}`,
        );
        if (result.analyzed) {
          const analysis: CachedToneAnalysis = {
            responseId,
            label: 'Constructive',
            score: 0.78,
            feedback: result.content,
            cachedAt: new Date(),
          };

          await this.cache.setToneAnalysis(responseId, analysis);

          return {
            data: analysis,
            source: 'bedrock',
            latencyMs: Date.now() - startTime,
          };
        }
      } catch (error) {
        this.logger.warn('Bedrock tone analysis failed, using fallback', error);
      }
    }

    // Use fallback
    const fallback = getFallbackToneAnalysis(content);
    const analysis: CachedToneAnalysis = {
      responseId,
      ...fallback,
      cachedAt: new Date(),
    };

    return {
      data: analysis,
      source: 'fallback',
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Analyze common ground for a topic with fallback
   */
  async analyzeCommonGroundWithFallback(
    topicId: string,
    responses: string[],
  ): Promise<AIAnalysisResult<CachedCommonGroundAnalysis>> {
    const startTime = Date.now();

    // Try cache first
    const cached = await this.cache.getCommonGroundAnalysis(topicId);
    if (cached) {
      return {
        data: cached,
        source: 'cache',
        latencyMs: Date.now() - startTime,
      };
    }

    // Try Bedrock
    if (this.bedrockHealthy || (await this.checkBedrockHealth())) {
      try {
        const clusters = await this.bedrockService.clusterTexts(responses, 5);
        if (clusters.length > 0) {
          const analysis: CachedCommonGroundAnalysis = {
            topicId,
            agreementZones: clusters.map((c) => c.theme),
            misunderstandings: [],
            genuineDisagreements: [],
            consensusScore: 0.68,
            cachedAt: new Date(),
          };

          await this.cache.setCommonGroundAnalysis(topicId, analysis);

          return {
            data: analysis,
            source: 'bedrock',
            latencyMs: Date.now() - startTime,
          };
        }
      } catch (error) {
        this.logger.warn('Bedrock common ground analysis failed, using fallback', error);
      }
    }

    // Use fallback
    const fallback = getFallbackCommonGround(topicId);
    const analysis: CachedCommonGroundAnalysis = {
      topicId,
      ...fallback,
      cachedAt: new Date(),
    };

    return {
      data: analysis,
      source: 'fallback',
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.logger.log('Demo AI cache cleared');
  }
}

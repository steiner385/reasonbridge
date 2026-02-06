/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DTOs for demo AI status endpoint
 */

/**
 * AI service health status
 */
export class AIServiceHealthDto {
  /** Whether Bedrock is currently available */
  bedrockAvailable!: boolean;

  /** Bedrock model ID being used */
  bedrockModelId!: string | null;

  /** Last successful health check time */
  lastHealthCheck!: string | null;

  /** Health check latency in milliseconds */
  latencyMs!: number;
}

/**
 * Fallback configuration status
 */
export class FallbackConfigDto {
  /** Whether cache is enabled */
  cacheEnabled!: boolean;

  /** Number of cached items */
  cacheSize!: number;

  /** Whether fallback responses are enabled */
  fallbackEnabled!: boolean;

  /** Types of fallbacks available */
  fallbackTypes!: string[];
}

/**
 * Full AI service status response
 */
export class AIServiceStatusDto {
  /** Overall service status */
  status!: 'healthy' | 'degraded' | 'unavailable';

  /** Detailed health information */
  health!: AIServiceHealthDto;

  /** Fallback configuration */
  fallback!: FallbackConfigDto;

  /** Environment information */
  environment!: {
    demoMode: boolean;
    nodeEnv: string;
  };

  /** Status message */
  message!: string;
}

/**
 * AI feature status for specific capabilities
 */
export class AIFeatureStatusDto {
  /** Feature name */
  name!: string;

  /** Whether the feature is available */
  available!: boolean;

  /** Source of the feature (bedrock, fallback, cache) */
  source!: 'bedrock' | 'fallback' | 'cache';

  /** Average latency for this feature */
  avgLatencyMs!: number;
}

/**
 * Full AI capabilities status
 */
export class AICapabilitiesStatusDto {
  /** List of available features */
  features!: AIFeatureStatusDto[];

  /** Overall readiness status */
  ready!: boolean;

  /** Timestamp of status check */
  checkedAt!: string;
}

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { SERVICE_PORTS, getServiceUrl } from '@reason-bridge/common';
import { CircuitBreakerService } from '../resilience/circuit-breaker.service.js';
import { withRetry, isRetryableHttpError } from '../resilience/retry.util.js';

export interface ProxyRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string> | undefined;
  query?: Record<string, string> | undefined;
}

/**
 * Configuration for upstream service resilience
 */
interface ServiceConfig {
  url: string;
  timeout: number;
  retryAttempts: number;
}

/**
 * Default resilience configuration
 * - 5 second timeout per request
 * - 3 retry attempts for transient failures
 * - Circuit breaker trips at 50% failure rate
 */
const DEFAULT_TIMEOUT = 5000;
const DEFAULT_RETRY_ATTEMPTS = 3;

/**
 * ProxyService handles HTTP requests to upstream microservices
 * with built-in resilience patterns:
 *
 * - **Circuit Breaker**: Prevents cascade failures by failing fast
 *   when a service is unhealthy
 * - **Retry with Backoff**: Automatically retries transient failures
 *   (5xx errors, timeouts, network issues)
 * - **Timeouts**: Configurable request timeouts prevent hung connections
 *
 * Each upstream service has its own circuit breaker instance,
 * so failures in one service don't affect others.
 */
@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  private readonly userService: ServiceConfig;
  private readonly discussionService: ServiceConfig;
  private readonly aiService: ServiceConfig;

  constructor(
    @Inject(HttpService) private readonly httpService: HttpService,
    @Optional() @Inject(ConfigService) private readonly configService: ConfigService | null,
    @Inject(CircuitBreakerService) private readonly circuitBreakerService: CircuitBreakerService,
  ) {
    // Helper to get config value with fallback to process.env
    const getConfig = <T>(key: string, defaultValue: T): T => {
      if (this.configService) {
        return this.configService.get<T>(key, defaultValue) ?? defaultValue;
      }
      const envValue = process.env[key];
      if (envValue === undefined) return defaultValue;
      if (typeof defaultValue === 'number') return Number(envValue) as T;
      return envValue as T;
    };

    // Service URLs use single source of truth from @reason-bridge/common
    // Environment variables can override for Docker/production deployments
    this.userService = {
      url: getConfig<string>('USER_SERVICE_URL', getServiceUrl('USER_SERVICE')),
      timeout: getConfig<number>('USER_SERVICE_TIMEOUT', DEFAULT_TIMEOUT),
      retryAttempts: getConfig<number>('USER_SERVICE_RETRY_ATTEMPTS', DEFAULT_RETRY_ATTEMPTS),
    };

    this.discussionService = {
      url: getConfig<string>('DISCUSSION_SERVICE_URL', getServiceUrl('DISCUSSION_SERVICE')),
      timeout: getConfig<number>('DISCUSSION_SERVICE_TIMEOUT', DEFAULT_TIMEOUT),
      retryAttempts: getConfig<number>('DISCUSSION_SERVICE_RETRY_ATTEMPTS', DEFAULT_RETRY_ATTEMPTS),
    };

    this.aiService = {
      url: getConfig<string>('AI_SERVICE_URL', getServiceUrl('AI_SERVICE')),
      // AI service gets longer timeout as it may have longer processing times
      timeout: getConfig<number>('AI_SERVICE_TIMEOUT', 30000),
      retryAttempts: getConfig<number>('AI_SERVICE_RETRY_ATTEMPTS', 2),
    };
  }

  async proxyToUserService<T = unknown>(request: ProxyRequest): Promise<AxiosResponse<T>> {
    return this.proxyWithResilience<T>('user-service', this.userService, request);
  }

  async proxyToDiscussionService<T = unknown>(request: ProxyRequest): Promise<AxiosResponse<T>> {
    return this.proxyWithResilience<T>('discussion-service', this.discussionService, request);
  }

  async proxyToAiService<T = unknown>(request: ProxyRequest): Promise<AxiosResponse<T>> {
    return this.proxyWithResilience<T>('ai-service', this.aiService, request);
  }

  /**
   * Proxy request with circuit breaker and retry logic
   */
  private async proxyWithResilience<T>(
    serviceName: string,
    serviceConfig: ServiceConfig,
    request: ProxyRequest,
  ): Promise<AxiosResponse<T>> {
    // Get or create a circuit breaker that accepts the request as an argument
    // This ensures each request is executed with its own data, not a captured closure
    const breaker = this.circuitBreakerService.getOrCreateWithArgs<
      [ProxyRequest],
      AxiosResponse<T>
    >(
      {
        name: serviceName,
        timeout: serviceConfig.timeout,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 5,
      },
      async (req: ProxyRequest) => {
        return withRetry(
          () => this.executeRequest<T>(serviceConfig.url, req, serviceConfig.timeout),
          {
            maxAttempts: serviceConfig.retryAttempts,
            isRetryable: isRetryableHttpError,
          },
        );
      },
    );

    try {
      // Pass the request as an argument to fire() so each request uses its own data
      return await breaker.fire(request);
    } catch (error) {
      this.logger.error(
        `Request to ${serviceName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Execute HTTP request with timeout
   */
  private async executeRequest<T>(
    baseUrl: string,
    request: ProxyRequest,
    timeout: number,
  ): Promise<AxiosResponse<T>> {
    const url = `${baseUrl}${request.path}`;

    const config: AxiosRequestConfig = {
      method: request.method,
      url,
      data: request.body,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
      params: request.query,
      timeout, // Request timeout
      // Don't throw on non-2xx status - let the gateway handle the response
      validateStatus: () => true,
    };

    // Remove undefined/null headers
    if (config.headers) {
      Object.keys(config.headers).forEach((key) => {
        if (config.headers![key] === undefined || config.headers![key] === null) {
          delete config.headers![key];
        }
      });
    }

    return firstValueFrom(this.httpService.request<T>(config));
  }
}

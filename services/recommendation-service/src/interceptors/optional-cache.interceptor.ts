/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import type { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CACHE_TTL_MS } from '../constants/index.js';

/**
 * Optional Cache Interceptor
 *
 * A cache interceptor that gracefully handles the case when CACHE_MANAGER
 * is not available. This prevents dependency resolution errors when the
 * cache module's async initialization hasn't completed or when caching
 * is disabled.
 *
 * Uses @Optional() decorator to make CACHE_MANAGER injection optional.
 * When cache is unavailable, requests pass through without caching.
 */
@Injectable()
export class OptionalCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OptionalCacheInterceptor.name);

  constructor(
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager: Cache | null,
    private readonly reflector: Reflector,
  ) {
    if (!cacheManager) {
      this.logger.warn('CACHE_MANAGER not available - caching disabled');
    }
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    // If no cache manager, pass through without caching
    if (!this.cacheManager) {
      return next.handle();
    }

    // Capture cacheManager in a const for use in tap callback (TypeScript null narrowing)
    const cache = this.cacheManager;

    const request = context.switchToHttp().getRequest();
    const key = this.generateCacheKey(request);

    // Get TTL from @CacheTTL decorator or use default
    const ttl =
      this.reflector.get<number>('cache_ttl', context.getHandler()) || CACHE_TTL_MS.DEFAULT;

    try {
      // Check cache first
      const cachedValue = await cache.get(key);
      if (cachedValue !== undefined && cachedValue !== null) {
        return of(cachedValue);
      }
    } catch (error) {
      this.logger.warn(`Cache get error for key ${key}: ${error}`);
    }

    // Execute handler and cache result
    return next.handle().pipe(
      tap(async (response) => {
        try {
          await cache.set(key, response, ttl);
        } catch (error) {
          this.logger.warn(`Cache set error for key ${key}: ${error}`);
        }
      }),
    );
  }

  private generateCacheKey(request: { url: string; method: string }): string {
    return `${request.method}:${request.url}`;
  }
}

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

/**
 * Rate Limiter Middleware
 *
 * Implements in-memory rate limiting to prevent abuse of API endpoints.
 * Uses a token bucket algorithm with configurable limits per IP address.
 *
 * Default limits:
 * - 100 requests per minute per IP
 * - Customizable per route via RateLimitConfig
 *
 * For production, consider using @nestjs/throttler with Redis backing.
 */
@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  // Default configuration
  private readonly defaultLimit = 100;
  private readonly defaultWindowMs = 60 * 1000; // 1 minute

  /**
   * Apply rate limiting to incoming requests
   * Tracks requests by IP address and enforces limits
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const ip = this.getClientIp(req);
    const now = Date.now();

    // Get or initialize rate limit tracking for this IP
    let rateLimitData = this.requestCounts.get(ip);

    // Reset if window has expired
    if (!rateLimitData || now > rateLimitData.resetTime) {
      rateLimitData = {
        count: 0,
        resetTime: now + this.defaultWindowMs,
      };
      this.requestCounts.set(ip, rateLimitData);
    }

    // Increment request count
    rateLimitData.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', this.defaultLimit.toString());
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, this.defaultLimit - rateLimitData.count).toString(),
    );
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitData.resetTime).toISOString());

    // Check if limit exceeded
    if (rateLimitData.count > this.defaultLimit) {
      const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      throw new HttpException(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          details: {
            retryAfter,
            limit: this.defaultLimit,
            window: this.defaultWindowMs / 1000,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  /**
   * Extract client IP address from request
   * Handles proxied requests and various header formats
   */
  private getClientIp(req: Request): string {
    // Try X-Forwarded-For header first (for proxied requests)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      if (ip) {
        return ip.trim();
      }
    }

    // Try X-Real-IP header
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      const ip = Array.isArray(realIp) ? realIp[0] : realIp;
      if (ip) {
        return ip;
      }
    }

    // Fall back to socket address
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Clean up expired entries periodically to prevent memory leaks
   * Should be called via a cron job or interval
   */
  cleanup(): void {
    const now = Date.now();
    for (const [ip, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(ip);
      }
    }
  }
}

/**
 * Configuration interface for custom rate limits
 * Can be used with decorators or guards for specific routes
 */
export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  skipIf?: (req: Request) => boolean;
}

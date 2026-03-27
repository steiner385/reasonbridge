/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  UnauthorizedException,
  Logger,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * Guard for internal service-to-service API authentication.
 *
 * Validates `Authorization: ApiKey <key>` header against configured keys.
 * Supports key rotation by accepting both primary and secondary keys.
 *
 * @remarks
 * - Uses timing-safe comparison to prevent timing attacks
 * - In test/development mode, allows requests if no key is configured
 * - In production mode, requires INTERNAL_API_KEY to be set
 *
 * @example
 * ```typescript
 * @Controller('internal/endpoint')
 * @UseGuards(InternalApiKeyGuard)
 * export class InternalController { ... }
 * ```
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(InternalApiKeyGuard.name);
  private readonly primaryKey: string | undefined;
  private readonly secondaryKey: string | undefined;
  private readonly isDevMode: boolean;

  constructor() {
    this.primaryKey = process.env['INTERNAL_API_KEY'];
    this.secondaryKey = process.env['INTERNAL_API_KEY_SECONDARY'];

    const nodeEnv = process.env['NODE_ENV'];
    this.isDevMode = !nodeEnv || nodeEnv === 'development' || nodeEnv === 'test';

    // Require key in production
    if (!this.primaryKey && !this.isDevMode) {
      throw new Error('INTERNAL_API_KEY is required in production');
    }
  }

  /**
   * Validate the API key from the Authorization header.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow requests in dev mode when no key configured
    if (!this.primaryKey && this.isDevMode) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      this.logger.warn('Missing Authorization header on internal endpoint');
      throw new UnauthorizedException('Missing Authorization header');
    }

    const key = this.extractApiKey(authHeader);
    if (!key) {
      this.logger.warn('Malformed Authorization header on internal endpoint');
      throw new UnauthorizedException(
        'Invalid Authorization header format. Expected: ApiKey <key>',
      );
    }

    if (!this.validateKey(key)) {
      this.logger.warn('Invalid API key on internal endpoint');
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  /**
   * Extract API key from Authorization header.
   * Expected format: "ApiKey <key>"
   */
  private extractApiKey(authHeader: string): string | null {
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'ApiKey') {
      return null;
    }
    const key = parts[1];
    if (!key || key.trim() === '') {
      return null;
    }
    return key;
  }

  /**
   * Validate key using timing-safe comparison.
   */
  private validateKey(providedKey: string): boolean {
    // Check primary key
    if (this.primaryKey && this.timingSafeCompare(providedKey, this.primaryKey)) {
      return true;
    }

    // Check secondary key (for rotation)
    if (this.secondaryKey && this.timingSafeCompare(providedKey, this.secondaryKey)) {
      return true;
    }

    return false;
  }

  /**
   * Timing-safe string comparison to prevent timing attacks.
   */
  private timingSafeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'utf8');
      const bufB = Buffer.from(b, 'utf8');

      // Lengths must match for timingSafeEqual
      if (bufA.length !== bufB.length) {
        // Still do a comparison to maintain constant time
        timingSafeEqual(bufA, bufA);
        return false;
      }

      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}

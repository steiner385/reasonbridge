/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * Guard for internal service-to-service API endpoints.
 *
 * Validates the X-Internal-Api-Key header against the INTERNAL_API_KEY
 * environment variable. This provides a simple shared-secret authentication
 * mechanism for internal service communication.
 *
 * @remarks
 * - In test/development mode, the guard is permissive if INTERNAL_API_KEY is not set
 * - In production, INTERNAL_API_KEY must be set or all requests are rejected
 * - Uses timing-safe comparison to prevent timing attacks
 *
 * @example
 * ```typescript
 * @Controller('internal/endpoint')
 * @UseGuards(InternalApiKeyGuard)
 * export class InternalController { }
 * ```
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(InternalApiKeyGuard.name);
  private readonly apiKey: string | undefined;
  private readonly isTestOrDev: boolean;

  constructor() {
    this.apiKey = process.env['INTERNAL_API_KEY'];
    const nodeEnv = process.env['NODE_ENV'];
    this.isTestOrDev = nodeEnv === 'test' || nodeEnv === 'development' || !nodeEnv;

    if (!this.apiKey && !this.isTestOrDev) {
      this.logger.error('INTERNAL_API_KEY is required in production mode');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-internal-api-key'];

    // In test/dev mode without API key configured, allow all requests
    if (!this.apiKey && this.isTestOrDev) {
      this.logger.debug('Internal API key not configured, allowing request in test/dev mode');
      return true;
    }

    // In production without API key configured, reject all requests
    if (!this.apiKey) {
      this.logger.error('Internal API request rejected: INTERNAL_API_KEY not configured');
      throw new UnauthorizedException('Internal API key required');
    }

    // No key provided in request
    if (!providedKey) {
      this.logger.warn('Internal API request rejected: no X-Internal-Api-Key header');
      throw new UnauthorizedException('Internal API key required');
    }

    // Validate key using timing-safe comparison
    const expectedBuffer = Buffer.from(this.apiKey, 'utf8');
    const providedBuffer = Buffer.from(providedKey, 'utf8');

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      this.logger.warn('Internal API request rejected: invalid API key');
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}

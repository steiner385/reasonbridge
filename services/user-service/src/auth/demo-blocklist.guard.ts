/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo Credential Blocklist Guard
 *
 * Prevents demo credentials from being used in production environments.
 * Implements FR-011: System MUST prevent demo credentials from being used in production.
 *
 * This guard should be applied to authentication endpoints in production
 * to block login attempts with demo account emails.
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Demo email domain that is blocked in production
 */
const DEMO_EMAIL_DOMAIN = '@reasonbridge.demo';

/**
 * Guard that blocks demo credentials in production environments
 *
 * @example
 * ```typescript
 * // Apply to login endpoint
 * @UseGuards(DemoBlocklistGuard)
 * @Post('login')
 * async login(@Body() dto: LoginDto) { ... }
 * ```
 */
@Injectable()
export class DemoBlocklistGuard implements CanActivate {
  private readonly isProduction: boolean;
  private readonly demoModeEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.isProduction = nodeEnv === 'production';
    this.demoModeEnabled = this.configService.get<string>('DEMO_MODE', 'false') === 'true';
  }

  canActivate(context: ExecutionContext): boolean {
    // Allow demo credentials in non-production environments
    if (!this.isProduction) {
      return true;
    }

    // Allow demo credentials if DEMO_MODE is explicitly enabled in production
    // This is for dedicated demo servers that run in "production" mode
    if (this.demoModeEnabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const email = this.extractEmail(request);

    if (email && this.isDemoEmail(email)) {
      throw new ForbiddenException(
        'Demo accounts cannot be used in production environments. ' +
          'Please use your registered account credentials.',
      );
    }

    return true;
  }

  /**
   * Extract email from request body (for login endpoints)
   */
  private extractEmail(request: any): string | undefined {
    // Check body for login requests
    if (request.body?.email) {
      return request.body.email;
    }

    // Check query params (for some OAuth flows)
    if (request.query?.email) {
      return request.query.email;
    }

    return undefined;
  }

  /**
   * Check if an email belongs to a demo account
   */
  private isDemoEmail(email: string): boolean {
    return email.toLowerCase().endsWith(DEMO_EMAIL_DOMAIN);
  }
}

/**
 * Utility function to check if an email is a demo email
 * Can be used outside of guard context
 */
export function isDemoCredential(email: string): boolean {
  return email.toLowerCase().endsWith(DEMO_EMAIL_DOMAIN);
}

/**
 * Utility function to check if demo mode is active
 * based on environment variables
 */
export function isDemoEnvironment(): boolean {
  return process.env['DEMO_MODE'] === 'true';
}

/**
 * Utility function to check if current environment is production
 */
export function isProductionEnvironment(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

/**
 * Check if demo credentials should be allowed
 * Returns true in dev/test or when DEMO_MODE=true in production
 */
export function shouldAllowDemoCredentials(): boolean {
  if (!isProductionEnvironment()) {
    return true;
  }
  return isDemoEnvironment();
}

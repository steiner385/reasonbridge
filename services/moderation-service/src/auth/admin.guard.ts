/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  ForbiddenException,
  Logger,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from './jwt-auth.guard.js';

/**
 * Admin Guard - Restricts access to admin-only endpoints
 *
 * This guard should be used AFTER JwtAuthGuard to ensure the user is authenticated.
 * It checks if the authenticated user has admin privileges.
 *
 * Admin users are determined by:
 * 1. Environment variable ADMIN_USERS (comma-separated list of user IDs)
 * 2. Demo admin user (demo-admin) when DEMO_MODE is enabled
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard, AdminGuard)
 * @Post('admin/resource')
 * adminAction() { ... }
 * ```
 *
 * @remarks
 * The guard expects request.user to be populated by JwtAuthGuard.
 * Always use JwtAuthGuard before AdminGuard to ensure user is authenticated.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);
  private readonly adminUsers: Set<string>;
  private readonly demoMode: boolean;

  constructor(private readonly configService: ConfigService) {
    // Parse admin users from environment variable
    const adminUsersEnv = this.configService.get<string>('ADMIN_USERS') ?? '';
    this.adminUsers = new Set(
      adminUsersEnv
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );

    // Check if demo mode is enabled
    this.demoMode = this.configService.get<string>('DEMO_MODE') === 'true';

    // In demo mode, add the demo admin user
    if (this.demoMode) {
      this.adminUsers.add('demo-admin');
    }

    this.logger.debug(`AdminGuard initialized with ${this.adminUsers.size} admin users`);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwtPayload = request.user as JwtPayload | undefined;

    if (!jwtPayload) {
      this.logger.warn('AdminGuard: No user found in request. Ensure JwtAuthGuard runs first.');
      throw new ForbiddenException('Access denied: authentication required');
    }

    const userId = jwtPayload.userId ?? jwtPayload.sub;

    // Check if user is in admin list
    if (this.adminUsers.has(userId) || this.adminUsers.has(jwtPayload.sub)) {
      this.logger.debug(`AdminGuard: Admin access granted for user ${userId}`);
      return true;
    }

    this.logger.warn(`AdminGuard: Access denied for user ${userId}`);
    throw new ForbiddenException('Access denied: admin privileges required');
  }
}

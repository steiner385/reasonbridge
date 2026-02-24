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
import type { JwtPayload } from '../jwt-auth.guard.js';

/**
 * Admin Guard - Restricts access to admin-only endpoints
 *
 * This guard should be used AFTER JwtAuthGuard to ensure the user is authenticated.
 * It checks if the authenticated user has admin privileges.
 *
 * Admin users are determined by:
 * 1. Environment variable ADMIN_USERS (comma-separated list of cognitoSub values)
 * 2. Demo admin user (demo-admin cognitoSub) when DEMO_MODE is enabled
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard, AdminGuard)
 * @Get('admin/resource')
 * getAdminResource() { ... }
 * ```
 *
 * @remarks
 * The guard expects request.user to be populated by JwtAuthGuard.
 * Always use JwtAuthGuard before AdminGuard to ensure user is authenticated.
 *
 * @example
 * Environment configuration:
 * ADMIN_USERS=cognito-sub-1,cognito-sub-2,cognito-sub-3
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

  /**
   * Check if the current user has admin privileges
   *
   * @param context - Execution context containing the request
   * @returns true if user is an admin, throws ForbiddenException otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      this.logger.warn('AdminGuard: No user found in request. Ensure JwtAuthGuard runs first.');
      throw new ForbiddenException('Access denied: authentication required');
    }

    const userId = user.sub;

    if (!this.isAdmin(userId)) {
      this.logger.warn(`AdminGuard: Access denied for user ${userId}`);
      throw new ForbiddenException('Access denied: admin privileges required');
    }

    this.logger.debug(`AdminGuard: Admin access granted for user ${userId}`);
    return true;
  }

  /**
   * Check if a user ID is in the admin list
   *
   * @param userId - The cognitoSub (user ID) to check
   * @returns true if the user is an admin
   */
  isAdmin(userId: string): boolean {
    return this.adminUsers.has(userId);
  }
}

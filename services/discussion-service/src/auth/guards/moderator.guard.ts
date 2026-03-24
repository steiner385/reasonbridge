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
 * Moderator Guard - Restricts access to moderator-only endpoints
 *
 * This guard should be used AFTER JwtAuthGuard to ensure the user is authenticated.
 * It checks if the authenticated user has moderator or admin privileges.
 *
 * Moderator users are determined by:
 * 1. Environment variable MODERATOR_USERS (comma-separated list of user IDs)
 * 2. Environment variable ADMIN_USERS (admins have moderator privileges)
 * 3. Demo moderator user when DEMO_MODE is enabled
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard, ModeratorGuard)
 * @Post('moderate/resource')
 * moderatorAction() { ... }
 * ```
 *
 * @remarks
 * The guard expects request.user to be populated by JwtAuthGuard.
 * Always use JwtAuthGuard before ModeratorGuard to ensure user is authenticated.
 */
@Injectable()
export class ModeratorGuard implements CanActivate {
  private readonly logger = new Logger(ModeratorGuard.name);
  private readonly moderatorUsers: Set<string>;
  private readonly demoMode: boolean;

  constructor(private readonly configService: ConfigService) {
    // Parse moderator users from environment variable
    const moderatorUsersEnv = this.configService.get<string>('MODERATOR_USERS') ?? '';
    this.moderatorUsers = new Set(
      moderatorUsersEnv
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );

    // Admin users also have moderator privileges
    const adminUsersEnv = this.configService.get<string>('ADMIN_USERS') ?? '';
    adminUsersEnv
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .forEach((id) => this.moderatorUsers.add(id));

    // Check if demo mode is enabled
    this.demoMode = this.configService.get<string>('DEMO_MODE') === 'true';

    // In demo mode, add demo users with moderator privileges
    if (this.demoMode) {
      this.moderatorUsers.add('demo-moderator');
      this.moderatorUsers.add('demo-admin');
    }

    this.logger.debug(
      `ModeratorGuard initialized with ${this.moderatorUsers.size} moderator users`,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwtPayload = request.user as JwtPayload | undefined;

    if (!jwtPayload) {
      this.logger.warn('ModeratorGuard: No user found in request. Ensure JwtAuthGuard runs first.');
      throw new ForbiddenException('Access denied: authentication required');
    }

    const userId = jwtPayload.userId ?? jwtPayload.sub;

    // Check if user has moderator privileges
    if (this.moderatorUsers.has(userId) || this.moderatorUsers.has(jwtPayload.sub)) {
      this.logger.debug(`ModeratorGuard: Moderator access granted for user ${userId}`);
      return true;
    }

    this.logger.warn(`ModeratorGuard: Access denied for user ${userId}`);
    throw new ForbiddenException('Access denied: moderator privileges required');
  }
}

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
 * Moderator Guard - Restricts moderation endpoints to moderators and admins.
 *
 * This guard must be used AFTER JwtAuthGuard, which populates `request.user`.
 * It mirrors the discussion-service ModeratorGuard so both services share the
 * same authorization model.
 *
 * Moderator users are determined by:
 * 1. Environment variable MODERATOR_USERS (comma-separated list of user IDs)
 * 2. Environment variable ADMIN_USERS (admins inherit moderator privileges)
 * 3. Demo moderator/admin users when DEMO_MODE is enabled
 *
 * @remarks
 * Always place JwtAuthGuard before ModeratorGuard so the user is authenticated
 * before the privilege check runs.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, ModeratorGuard)
 * @Post('actions')
 * createAction() { ... }
 * ```
 */
@Injectable()
export class ModeratorGuard implements CanActivate {
  private readonly logger = new Logger(ModeratorGuard.name);
  private readonly moderatorUsers: Set<string>;
  private readonly demoMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const moderatorUsersEnv = this.configService.get<string>('MODERATOR_USERS') ?? '';
    this.moderatorUsers = new Set(
      moderatorUsersEnv
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );

    // Admin users also have moderator privileges.
    const adminUsersEnv = this.configService.get<string>('ADMIN_USERS') ?? '';
    adminUsersEnv
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .forEach((id) => this.moderatorUsers.add(id));

    this.demoMode = this.configService.get<string>('DEMO_MODE') === 'true';
    if (this.demoMode) {
      this.moderatorUsers.add('demo-moderator');
      this.moderatorUsers.add('demo-admin');
    }

    this.logger.debug(
      `ModeratorGuard initialized with ${this.moderatorUsers.size} moderator users`,
    );
  }

  /**
   * Grant access only to authenticated users with moderator or admin privileges.
   *
   * @param context - The current execution context
   * @returns True when the user is a moderator/admin
   * @throws {ForbiddenException} When no authenticated user is present
   * @throws {ForbiddenException} When the user lacks moderator privileges
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwtPayload = request.user as JwtPayload | undefined;

    if (!jwtPayload) {
      this.logger.warn('ModeratorGuard: No user found in request. Ensure JwtAuthGuard runs first.');
      throw new ForbiddenException('Access denied: authentication required');
    }

    const userId = jwtPayload.userId ?? jwtPayload.sub;

    if (this.moderatorUsers.has(userId) || this.moderatorUsers.has(jwtPayload.sub)) {
      this.logger.debug(`ModeratorGuard: Moderator access granted for user ${userId}`);
      return true;
    }

    this.logger.warn(`ModeratorGuard: Access denied for user ${userId}`);
    throw new ForbiddenException('Access denied: moderator privileges required');
  }
}

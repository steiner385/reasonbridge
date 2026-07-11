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
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './jwt-auth.guard.js';

/** UUID v1-v5 shape — used to decide whether a JWT subject can be a database user id. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Moderator Guard - Restricts moderation endpoints to moderators and admins.
 *
 * This guard must be used AFTER JwtAuthGuard, which populates `request.user`.
 * It mirrors the discussion-service ModeratorGuard so both services share the
 * same authorization model.
 *
 * Moderator users are determined by:
 * 1. The user's role in the database (MODERATOR or ADMIN) — the primary,
 *    seed-driven source of truth (matches the user-service ModeratorGuard)
 * 2. Environment variable MODERATOR_USERS (comma-separated list of user IDs)
 * 3. Environment variable ADMIN_USERS (admins inherit moderator privileges)
 * 4. Demo moderator/admin users when DEMO_MODE is enabled
 *
 * @remarks
 * Always place JwtAuthGuard before ModeratorGuard so the user is authenticated
 * before the privilege check runs.
 *
 * The database lookup supports both auth modes: in database-auth mode the JWT
 * `sub` claim contains the user's UUID (`users.id`), while Cognito-issued
 * tokens carry the `cognitoSub`. Both are resolved against the users table.
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
  private readonly allowedRoles: Set<UserRole> = new Set([UserRole.MODERATOR, UserRole.ADMIN]);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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

    // Fast path: explicit env-configured moderators/admins (and demo users).
    if (this.moderatorUsers.has(userId) || this.moderatorUsers.has(jwtPayload.sub)) {
      this.logger.debug(`ModeratorGuard: Moderator access granted for user ${userId}`);
      return true;
    }

    // Source of truth: the user's role in the database (MODERATOR or ADMIN).
    const user = await this.findUserByJwtSubject(userId, jwtPayload.sub);
    if (user && this.allowedRoles.has(user.role)) {
      // Attach resolved identity for downstream use (mirrors user-service guard).
      request.userRole = user.role;
      request.userId = user.id;
      this.logger.debug(
        `ModeratorGuard: Moderator access granted for user ${user.id} with role ${user.role}`,
      );
      return true;
    }

    this.logger.warn(`ModeratorGuard: Access denied for user ${userId}`);
    throw new ForbiddenException('Access denied: moderator privileges required');
  }

  /**
   * Resolve a user record from JWT identifiers.
   *
   * @param ids - Candidate identifiers (database user id and/or cognitoSub)
   * @returns The matching user's id and role, or null when not found
   */
  private async findUserByJwtSubject(
    ...ids: (string | undefined)[]
  ): Promise<{ id: string; role: UserRole } | null> {
    for (const id of new Set(ids.filter((value): value is string => Boolean(value)))) {
      const user = await this.prisma.user.findFirst({
        where: UUID_REGEX.test(id) ? { OR: [{ id }, { cognitoSub: id }] } : { cognitoSub: id },
        select: { id: true, role: true },
      });
      if (user) {
        return user;
      }
    }
    return null;
  }
}

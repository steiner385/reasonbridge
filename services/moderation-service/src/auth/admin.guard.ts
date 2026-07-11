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
 * Admin Guard - Restricts access to admin-only endpoints
 *
 * This guard should be used AFTER JwtAuthGuard to ensure the user is authenticated.
 * It checks if the authenticated user has admin privileges.
 *
 * Admin users are determined by:
 * 1. The user's role in the database (ADMIN) — the primary, seed-driven source
 *    of truth (matches the user-service role guards)
 * 2. Environment variable ADMIN_USERS (comma-separated list of user IDs)
 * 3. Demo admin user (demo-admin) when DEMO_MODE is enabled
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
 *
 * The database lookup supports both auth modes: in database-auth mode the JWT
 * `sub` claim contains the user's UUID (`users.id`), while Cognito-issued
 * tokens carry the `cognitoSub`. Both are resolved against the users table.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);
  private readonly adminUsers: Set<string>;
  private readonly demoMode: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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

    // Fast path: explicit env-configured admins (and demo admin).
    if (this.adminUsers.has(userId) || this.adminUsers.has(jwtPayload.sub)) {
      this.logger.debug(`AdminGuard: Admin access granted for user ${userId}`);
      return true;
    }

    // Source of truth: the user's role in the database (ADMIN).
    const user = await this.findUserByJwtSubject(userId, jwtPayload.sub);
    if (user && user.role === UserRole.ADMIN) {
      // Attach resolved identity for downstream use (mirrors user-service guard).
      request.userRole = user.role;
      request.userId = user.id;
      this.logger.debug(`AdminGuard: Admin access granted for user ${user.id} with role ADMIN`);
      return true;
    }

    this.logger.warn(`AdminGuard: Access denied for user ${userId}`);
    throw new ForbiddenException('Access denied: admin privileges required');
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

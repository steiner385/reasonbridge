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
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../jwt-auth.guard.js';

/**
 * Admin Guard - Restricts access to admin-only endpoints
 *
 * This guard should be used AFTER JwtAuthGuard to ensure the user is authenticated.
 * It checks if the authenticated user has admin privileges.
 *
 * Admin users are determined by (in order of precedence):
 * 1. User's role in the database (UserRole.ADMIN)
 * 2. Environment variable ADMIN_USERS (comma-separated list of cognitoSub values) - legacy support
 * 3. Demo admin user (demo-admin cognitoSub) when DEMO_MODE is enabled
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
 * Environment configuration (legacy, prefer database roles):
 * ADMIN_USERS=cognito-sub-1,cognito-sub-2,cognito-sub-3
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);
  private readonly legacyAdminUsers: Set<string>;
  private readonly demoMode: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Parse admin users from environment variable (legacy support)
    const adminUsersEnv = this.configService.get<string>('ADMIN_USERS') ?? '';
    this.legacyAdminUsers = new Set(
      adminUsersEnv
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );

    // Check if demo mode is enabled
    this.demoMode = this.configService.get<string>('DEMO_MODE') === 'true';

    // In demo mode, add the demo admin user
    if (this.demoMode) {
      this.legacyAdminUsers.add('demo-admin');
    }

    this.logger.debug(
      `AdminGuard initialized with ${this.legacyAdminUsers.size} legacy admin users`,
    );
  }

  /**
   * Check if the current user has admin privileges
   *
   * @param context - Execution context containing the request
   * @returns true if user is an admin, throws ForbiddenException otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwtPayload = request.user as JwtPayload | undefined;

    if (!jwtPayload) {
      this.logger.warn('AdminGuard: No user found in request. Ensure JwtAuthGuard runs first.');
      throw new ForbiddenException('Access denied: authentication required');
    }

    const cognitoSub = jwtPayload.sub;

    // Check legacy admin users first (for backward compatibility)
    if (this.legacyAdminUsers.has(cognitoSub)) {
      this.logger.debug(`AdminGuard: Admin access granted for legacy admin ${cognitoSub}`);
      return true;
    }

    // Look up the user's role from the database
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub },
      select: { id: true, role: true },
    });

    if (!user) {
      this.logger.warn(`AdminGuard: User not found for cognitoSub ${cognitoSub}`);
      throw new ForbiddenException('Access denied: user not found');
    }

    if (user.role !== UserRole.ADMIN) {
      this.logger.warn(`AdminGuard: Access denied for user ${user.id} with role ${user.role}`);
      throw new ForbiddenException('Access denied: admin privileges required');
    }

    // Attach user info to request for downstream use
    request.userRole = user.role;
    request.userId = user.id;

    this.logger.debug(`AdminGuard: Admin access granted for user ${user.id}`);
    return true;
  }

  /**
   * Check if a user ID is in the legacy admin list
   *
   * @param userId - The cognitoSub (user ID) to check
   * @returns true if the user is a legacy admin
   * @deprecated Use database role checking instead
   */
  isLegacyAdmin(userId: string): boolean {
    return this.legacyAdminUsers.has(userId);
  }
}

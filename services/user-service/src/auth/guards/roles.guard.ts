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
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../jwt-auth.guard.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * Role hierarchy - higher roles include permissions of lower roles
 */
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.MODERATOR, UserRole.USER],
  [UserRole.MODERATOR]: [UserRole.MODERATOR, UserRole.USER],
  [UserRole.USER]: [UserRole.USER],
};

/**
 * RolesGuard - Generic role-based access control guard
 *
 * This guard should be used AFTER JwtAuthGuard to ensure the user is authenticated.
 * It looks up the user's role from the database and checks against required roles.
 *
 * Supports role hierarchy: ADMIN has all MODERATOR permissions, MODERATOR has all USER permissions.
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('MODERATOR', 'ADMIN')
 * @Get('moderation/queue')
 * getModerationQueue() { ... }
 * ```
 *
 * @remarks
 * - The guard expects request.user to be populated by JwtAuthGuard
 * - Always use JwtAuthGuard before RolesGuard to ensure user is authenticated
 * - If no @Roles() decorator is present, the guard allows access (authentication-only)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles specified, allow access (authentication-only check)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const jwtPayload = request.user as JwtPayload | undefined;

    if (!jwtPayload) {
      this.logger.warn('RolesGuard: No user found in request. Ensure JwtAuthGuard runs first.');
      throw new ForbiddenException('Access denied: authentication required');
    }

    const cognitoSub = jwtPayload.sub;

    // Look up the user's role from the database
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub },
      select: { id: true, role: true },
    });

    if (!user) {
      this.logger.warn(`RolesGuard: User not found for cognitoSub ${cognitoSub}`);
      throw new ForbiddenException('Access denied: user not found');
    }

    // Check if user's role (or any role in their hierarchy) matches required roles
    const userRoles = ROLE_HIERARCHY[user.role] ?? [user.role];
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRequiredRole) {
      this.logger.warn(
        `RolesGuard: Access denied for user ${user.id} with role ${user.role}. Required: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `Access denied: requires one of these roles: ${requiredRoles.join(', ')}`,
      );
    }

    // Attach full user info to request for downstream use
    request.userRole = user.role;
    request.userId = user.id;

    this.logger.debug(`RolesGuard: Access granted for user ${user.id} with role ${user.role}`);
    return true;
  }
}

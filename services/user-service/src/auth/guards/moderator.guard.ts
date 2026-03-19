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
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../jwt-auth.guard.js';

/**
 * ModeratorGuard - Restricts access to moderator and admin users
 *
 * This guard should be used AFTER JwtAuthGuard to ensure the user is authenticated.
 * It checks if the user has MODERATOR or ADMIN role from the database.
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard, ModeratorGuard)
 * @Get('moderation/queue')
 * getModerationQueue() { ... }
 * ```
 *
 * @remarks
 * - ADMIN users automatically have moderator access (role hierarchy)
 * - The guard expects request.user to be populated by JwtAuthGuard
 * - For more flexible role requirements, use RolesGuard with @Roles() decorator
 */
@Injectable()
export class ModeratorGuard implements CanActivate {
  private readonly logger = new Logger(ModeratorGuard.name);
  private readonly allowedRoles: Set<UserRole> = new Set([UserRole.MODERATOR, UserRole.ADMIN]);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwtPayload = request.user as JwtPayload | undefined;

    if (!jwtPayload) {
      this.logger.warn('ModeratorGuard: No user found in request. Ensure JwtAuthGuard runs first.');
      throw new ForbiddenException('Access denied: authentication required');
    }

    const cognitoSub = jwtPayload.sub;

    // Look up the user's role from the database
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub },
      select: { id: true, role: true },
    });

    if (!user) {
      this.logger.warn(`ModeratorGuard: User not found for cognitoSub ${cognitoSub}`);
      throw new ForbiddenException('Access denied: user not found');
    }

    if (!this.allowedRoles.has(user.role)) {
      this.logger.warn(`ModeratorGuard: Access denied for user ${user.id} with role ${user.role}`);
      throw new ForbiddenException('Access denied: moderator privileges required');
    }

    // Attach user info to request for downstream use
    request.userRole = user.role;
    request.userId = user.id;

    this.logger.debug(`ModeratorGuard: Access granted for user ${user.id} with role ${user.role}`);
    return true;
  }
}

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
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Admin emails that have access to compliance reports
 * In production, this would be managed through a roles system
 */
const ADMIN_EMAIL_DOMAINS = ['@reasonbridge.demo'];
const ADMIN_EMAILS = ['demo-admin@reasonbridge.demo'];

/**
 * Guard that restricts access to admin users only
 *
 * @remarks
 * This guard checks if the authenticated user has admin privileges.
 * Admin status is determined by:
 * 1. Email matching known admin emails (for demo mode)
 * 2. Email domain matching admin domains
 * 3. In production, this would check a roles table or JWT claims
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, AdminGuard)
 * @Get('admin-only-endpoint')
 * async adminEndpoint() { ... }
 * ```
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('AdminGuard: No user in request - JwtAuthGuard may not be applied');
      throw new ForbiddenException('Authentication required');
    }

    // Get user email from JWT payload
    const userEmail = user.email;

    if (!userEmail) {
      this.logger.warn('AdminGuard: No email in JWT payload');
      throw new ForbiddenException('User email not found in token');
    }

    // Check if user is an admin
    const isAdmin = await this.isUserAdmin(userEmail);

    if (!isAdmin) {
      this.logger.warn(`AdminGuard: Non-admin access attempt from ${userEmail}`);
      throw new ForbiddenException('Admin access required');
    }

    this.logger.log(`AdminGuard: Admin access granted to ${userEmail}`);
    return true;
  }

  /**
   * Check if a user email has admin privileges
   *
   * @param email - The user's email address
   * @returns true if user has admin privileges
   */
  private async isUserAdmin(email: string): Promise<boolean> {
    // Check explicit admin emails
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      return true;
    }

    // Check admin email domains
    for (const domain of ADMIN_EMAIL_DOMAINS) {
      if (email.toLowerCase().endsWith(domain.toLowerCase())) {
        return true;
      }
    }

    // In production, we would check a roles table here
    // For now, additional admins can be configured via environment variable
    const additionalAdmins = this.configService.get<string>('ADMIN_EMAILS');
    if (additionalAdmins) {
      const adminList = additionalAdmins.split(',').map((e) => e.trim().toLowerCase());
      if (adminList.includes(email.toLowerCase())) {
        return true;
      }
    }

    return false;
  }
}

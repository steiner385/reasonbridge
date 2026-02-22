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
import type { JwtPayload } from '../auth/jwt-auth.guard.js';
import { AccessControlService, TIER_LEVEL_VALUES } from './access-control.service.js';
import { REQUIRE_TIER_KEY, REQUIRE_EXPERTISE_KEY } from './require-tier.decorator.js';
import type { RequireExpertiseOptions } from './require-tier.decorator.js';

/**
 * TierGuard - Restricts access to topics based on user tier level and expertise
 *
 * This guard enforces tier-based access control on topics. It should be used
 * AFTER JwtAuthGuard to ensure the user is authenticated.
 *
 * Access is determined by:
 * 1. Topic's minimumTierLevel - user must have at least this tier
 * 2. Topic's minimumExpertiseLevel + requiredTagId - user must have expertise
 * 3. Provisional access - granted by moderators for users below requirements
 *
 * Additionally, endpoints can use @RequireTier() and @RequireExpertise() decorators
 * to set minimum requirements independent of the topic's settings.
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard, TierGuard)
 * @Post('topics/:topicId/responses')
 * createResponse() { ... }
 *
 * // Or with decorator
 * @UseGuards(JwtAuthGuard, TierGuard)
 * @RequireTier(TierLevel.LEADER)
 * @Post('admin/moderate')
 * moderateContent() { ... }
 * ```
 *
 * @remarks
 * The guard expects request.user to be populated by JwtAuthGuard.
 * Always use JwtAuthGuard before TierGuard to ensure user is authenticated.
 * The topicId can be provided via route params or request body.
 */
@Injectable()
export class TierGuard implements CanActivate {
  private readonly logger = new Logger(TierGuard.name);

  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Check if the current user can access the topic based on tier requirements
   *
   * @param context - Execution context containing the request
   * @returns true if user has access, throws ForbiddenException otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    // Ensure user is authenticated
    if (!user) {
      this.logger.warn('TierGuard: No user found in request. Ensure JwtAuthGuard runs first.');
      throw new ForbiddenException('Access denied: authentication required');
    }

    const userId = user.sub;

    // Check for decorator-based tier requirement first
    const requiredTierLevel = this.reflector.getAllAndOverride<number | undefined>(
      REQUIRE_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Check for decorator-based expertise requirement
    const requiredExpertise = this.reflector.getAllAndOverride<RequireExpertiseOptions | undefined>(
      REQUIRE_EXPERTISE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If decorator requirements exist, check them first
    if (requiredTierLevel !== undefined) {
      const userRank = await this.accessControlService.getUserRank(userId);
      const userTierLevel = userRank ? TIER_LEVEL_VALUES[userRank.tierLevel] : 1;

      if (userTierLevel < requiredTierLevel) {
        const userTierName = userRank?.tierLevel ?? 'NEWCOMER';
        throw new ForbiddenException(
          `Access denied: requires tier level ${requiredTierLevel}, user has ${userTierName}`,
        );
      }
    }

    // If decorator expertise requirement exists, check it
    if (requiredExpertise) {
      const expertise = await this.accessControlService.getUserExpertise(
        userId,
        requiredExpertise.tagId,
      );

      if (!expertise) {
        throw new ForbiddenException('Access denied: requires expertise in category');
      }

      const { EXPERTISE_LEVEL_VALUES } = await import('./access-control.service.js');
      const userExpertiseLevel = EXPERTISE_LEVEL_VALUES[expertise.expertiseLevel];

      if (userExpertiseLevel < requiredExpertise.level) {
        throw new ForbiddenException(
          `Access denied: requires expertise level ${requiredExpertise.level}, user has ${expertise.expertiseLevel}`,
        );
      }
    }

    // Get topicId from params or body
    const topicId = this.extractTopicId(request);

    // If no topicId, we've checked decorator requirements - allow if no topicId needed
    if (!topicId) {
      // If we have decorator requirements and they passed, allow access
      if (requiredTierLevel !== undefined || requiredExpertise) {
        return true;
      }
      throw new ForbiddenException('Topic ID is required');
    }

    // Check topic-based access control
    const accessResult = await this.accessControlService.canAccessTopic(userId, topicId);

    if (!accessResult.allowed) {
      this.logger.warn(
        `TierGuard: Access denied for user ${userId} to topic ${topicId}: ${accessResult.reason}`,
      );
      throw new ForbiddenException(accessResult.reason ?? 'Access denied');
    }

    if (accessResult.provisionalAccess) {
      this.logger.debug(
        `TierGuard: User ${userId} accessed topic ${topicId} via provisional access`,
      );
    }

    return true;
  }

  /**
   * Extract topicId from request params or body
   */
  private extractTopicId(request: any): string | undefined {
    // Try route params first
    if (request.params?.topicId) {
      return request.params.topicId;
    }

    // Try request body
    if (request.body?.topicId) {
      return request.body.topicId;
    }

    return undefined;
  }
}

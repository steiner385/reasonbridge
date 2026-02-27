/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TierLevel, ExpertiseLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Tier level numeric values for comparison
 */
export const TIER_LEVEL_VALUES: Record<TierLevel, number> = {
  NEWCOMER: 1,
  CONTRIBUTOR: 2,
  TRUSTED: 3,
  LEADER: 4,
  EXPERT: 5,
};

/**
 * Expertise level numeric values for comparison
 */
export const EXPERTISE_LEVEL_VALUES: Record<ExpertiseLevel, number> = {
  NOVICE: 1,
  FAMILIAR: 2,
  KNOWLEDGEABLE: 3,
  EXPERT: 4,
};

/**
 * Reverse mapping from numeric level to TierLevel enum
 */
export const TIER_LEVEL_NAMES: Record<number, TierLevel> = {
  1: TierLevel.NEWCOMER,
  2: TierLevel.CONTRIBUTOR,
  3: TierLevel.TRUSTED,
  4: TierLevel.LEADER,
  5: TierLevel.EXPERT,
};

/**
 * Reverse mapping from numeric level to ExpertiseLevel enum
 */
export const EXPERTISE_LEVEL_NAMES: Record<number, ExpertiseLevel> = {
  1: ExpertiseLevel.NOVICE,
  2: ExpertiseLevel.FAMILIAR,
  3: ExpertiseLevel.KNOWLEDGEABLE,
  4: ExpertiseLevel.EXPERT,
};

/**
 * Result of an access check
 */
export interface AccessCheckResult {
  /** Whether access is allowed */
  allowed: boolean;
  /** Reason for denial (null if allowed) */
  reason: string | null;
  /** Whether access was granted via provisional access */
  provisionalAccess?: boolean;
}

/**
 * AccessControlService - Core access control logic for tier-based restrictions
 *
 * Implements the access control logic for checking whether a user can access
 * a topic based on tier requirements, expertise requirements, and provisional access.
 *
 * @remarks
 * - Checks both global tier level and domain-specific expertise
 * - Falls back to provisional access when requirements are not met
 * - Topics can disable provisional access
 *
 * @example
 * ```typescript
 * const result = await accessControlService.canAccessTopic(userId, topicId);
 * if (!result.allowed) {
 *   throw new ForbiddenException(result.reason);
 * }
 * ```
 */
@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a user can access a topic based on tier and expertise requirements
   *
   * @param userId - The user's unique identifier (cognitoSub)
   * @param topicId - The topic's unique identifier
   * @returns AccessCheckResult indicating whether access is allowed and why
   */
  async canAccessTopic(userId: string, topicId: string): Promise<AccessCheckResult> {
    // Fetch topic with tier/expertise requirements
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: {
        id: true,
        title: true,
        minimumTierLevel: true,
        minimumExpertiseLevel: true,
        requiredTagId: true,
        allowProvisionalAccess: true,
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // If no restrictions, allow access
    if (!topic.minimumTierLevel && !topic.minimumExpertiseLevel) {
      return { allowed: true, reason: null };
    }

    // Get user's internal ID from cognitoSub
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check global tier requirement
    if (topic.minimumTierLevel) {
      const tierCheck = await this.checkTierRequirement(
        user.id,
        topic.minimumTierLevel,
        topicId,
        topic.allowProvisionalAccess,
      );

      if (!tierCheck.allowed) {
        return tierCheck;
      }

      // If access was via provisional, we can return early
      if (tierCheck.provisionalAccess) {
        return tierCheck;
      }
    }

    // Check expertise requirement
    if (topic.minimumExpertiseLevel && topic.requiredTagId) {
      const expertiseCheck = await this.checkExpertiseRequirement(
        user.id,
        topic.minimumExpertiseLevel,
        topic.requiredTagId,
        topicId,
        topic.allowProvisionalAccess,
      );

      if (!expertiseCheck.allowed) {
        return expertiseCheck;
      }

      if (expertiseCheck.provisionalAccess) {
        return expertiseCheck;
      }
    }

    return { allowed: true, reason: null };
  }

  /**
   * Check if a user meets the tier requirement for a topic
   */
  private async checkTierRequirement(
    userId: string,
    requiredTierLevel: number,
    topicId: string,
    allowProvisionalAccess: boolean,
  ): Promise<AccessCheckResult> {
    // Get user's rank
    const userRank = await this.prisma.userRank.findUnique({
      where: { userId },
      select: { tierLevel: true },
    });

    // Default to NEWCOMER if no rank exists
    const userTierLevel = userRank ? TIER_LEVEL_VALUES[userRank.tierLevel] : 1;
    const userTierName = userRank?.tierLevel ?? TierLevel.NEWCOMER;

    // Check if user meets the tier requirement
    if (userTierLevel >= requiredTierLevel) {
      return { allowed: true, reason: null };
    }

    // User does not meet tier requirement - check provisional access
    if (allowProvisionalAccess) {
      const hasProvAccess = await this.hasProvisionalAccess(userId, topicId);
      if (hasProvAccess) {
        this.logger.debug(`User ${userId} granted provisional access to topic ${topicId}`);
        return { allowed: true, reason: null, provisionalAccess: true };
      }
    }

    // Access denied
    const requiredTierName = TIER_LEVEL_NAMES[requiredTierLevel] ?? `Level ${requiredTierLevel}`;
    return {
      allowed: false,
      reason: `User tier ${userTierName} does not meet minimum tier ${requiredTierName}`,
    };
  }

  /**
   * Check if a user meets the expertise requirement for a topic
   */
  private async checkExpertiseRequirement(
    userId: string,
    requiredExpertiseLevel: number,
    requiredTagId: string,
    topicId: string,
    allowProvisionalAccess: boolean,
  ): Promise<AccessCheckResult> {
    // Get user's expertise for the required tag
    const expertise = await this.prisma.topicExpertise.findFirst({
      where: {
        userId,
        tagId: requiredTagId,
      },
      select: { expertiseLevel: true },
    });

    // If user has no expertise in this tag
    if (!expertise) {
      if (allowProvisionalAccess) {
        const hasProvAccess = await this.hasProvisionalAccess(userId, topicId);
        if (hasProvAccess) {
          return { allowed: true, reason: null, provisionalAccess: true };
        }
      }
      return {
        allowed: false,
        reason: 'User has no expertise in required category',
      };
    }

    const userExpertiseLevel = EXPERTISE_LEVEL_VALUES[expertise.expertiseLevel];

    // Check if user meets the expertise requirement
    if (userExpertiseLevel >= requiredExpertiseLevel) {
      return { allowed: true, reason: null };
    }

    // User does not meet expertise requirement - check provisional access
    if (allowProvisionalAccess) {
      const hasProvAccess = await this.hasProvisionalAccess(userId, topicId);
      if (hasProvAccess) {
        return { allowed: true, reason: null, provisionalAccess: true };
      }
    }

    // Access denied
    const requiredExpertiseName =
      EXPERTISE_LEVEL_NAMES[requiredExpertiseLevel] ?? `Level ${requiredExpertiseLevel}`;
    return {
      allowed: false,
      reason: `User expertise ${expertise.expertiseLevel} does not meet minimum expertise ${requiredExpertiseName} in category`,
    };
  }

  /**
   * Check if a user has valid provisional access to a topic
   *
   * @param userId - The user's internal ID
   * @param topicId - The topic's unique identifier
   * @returns true if user has valid provisional access
   */
  async hasProvisionalAccess(userId: string, topicId: string): Promise<boolean> {
    const access = await this.prisma.provisionalAccess.findFirst({
      where: {
        userId,
        topicId,
        status: 'ACTIVE',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return access !== null;
  }

  /**
   * Get a user's rank
   *
   * @param userId - The user's unique identifier (cognitoSub)
   * @returns The user's rank or null if not found
   */
  async getUserRank(userId: string): Promise<{ tierLevel: TierLevel } | null> {
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub: userId },
      select: { id: true },
    });

    if (!user) {
      return null;
    }

    const rank = await this.prisma.userRank.findUnique({
      where: { userId: user.id },
      select: { tierLevel: true },
    });

    return rank;
  }

  /**
   * Get a user's expertise for a specific tag
   *
   * @param userId - The user's unique identifier (cognitoSub)
   * @param tagId - The tag's unique identifier
   * @returns The user's expertise or null if not found
   */
  async getUserExpertise(
    userId: string,
    tagId: string,
  ): Promise<{ expertiseLevel: ExpertiseLevel } | null> {
    const user = await this.prisma.user.findUnique({
      where: { cognitoSub: userId },
      select: { id: true },
    });

    if (!user) {
      return null;
    }

    const expertise = await this.prisma.topicExpertise.findFirst({
      where: {
        userId: user.id,
        tagId,
      },
      select: { expertiseLevel: true },
    });

    return expertise;
  }
}

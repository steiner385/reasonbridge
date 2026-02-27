/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { SetMetadata } from '@nestjs/common';
import { TierLevel, ExpertiseLevel } from '@prisma/client';
import { TIER_LEVEL_VALUES, EXPERTISE_LEVEL_VALUES } from './access-control.service.js';

/**
 * Metadata key for RequireTier decorator
 */
export const REQUIRE_TIER_KEY = 'requiredTier';

/**
 * Metadata key for RequireExpertise decorator
 */
export const REQUIRE_EXPERTISE_KEY = 'requiredExpertise';

/**
 * Options for RequireExpertise decorator
 */
export interface RequireExpertiseOptions {
  /** The minimum expertise level required (numeric value) */
  level: number;
  /** The tag ID for the required expertise category */
  tagId: string;
}

/**
 * RequireTier - Decorator to set minimum tier level for an endpoint
 *
 * Use this decorator to enforce a minimum tier level independently of the topic's
 * tier requirements. This is useful for admin endpoints or privileged actions.
 *
 * @param tier - The minimum TierLevel required
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, TierGuard)
 * @RequireTier(TierLevel.LEADER)
 * @Post('topics/:topicId/pin')
 * pinTopic() { ... }
 * ```
 */
export const RequireTier = (tier: TierLevel) =>
  SetMetadata(REQUIRE_TIER_KEY, TIER_LEVEL_VALUES[tier]);

/**
 * RequireExpertise - Decorator to set minimum expertise level for an endpoint
 *
 * Use this decorator to enforce expertise in a specific category. The user must
 * have at least the specified expertise level in the given tag.
 *
 * @param level - The minimum ExpertiseLevel required
 * @param tagId - The tag ID for the required category (optional if inferrable from route)
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, TierGuard)
 * @RequireExpertise(ExpertiseLevel.KNOWLEDGEABLE, 'science-tag-id')
 * @Post('topics/:topicId/expert-responses')
 * createExpertResponse() { ... }
 * ```
 */
export const RequireExpertise = (level: ExpertiseLevel, tagId: string) =>
  SetMetadata(REQUIRE_EXPERTISE_KEY, {
    level: EXPERTISE_LEVEL_VALUES[level],
    tagId,
  } as RequireExpertiseOptions);

/**
 * RequireTierLevel - Decorator to set minimum tier level using numeric value
 *
 * Alternative to RequireTier that accepts a numeric level directly.
 * Useful when the level is determined dynamically.
 *
 * Tier levels:
 * - 1: NEWCOMER
 * - 2: CONTRIBUTOR
 * - 3: TRUSTED
 * - 4: LEADER
 * - 5: EXPERT
 *
 * @param level - The minimum tier level (1-5)
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, TierGuard)
 * @RequireTierLevel(4) // LEADER
 * @Post('topics/:topicId/moderate')
 * moderateTopic() { ... }
 * ```
 */
export const RequireTierLevel = (level: number) => SetMetadata(REQUIRE_TIER_KEY, level);

/**
 * RequireExpertiseLevel - Decorator to set minimum expertise using numeric value
 *
 * Alternative to RequireExpertise that accepts numeric level directly.
 *
 * Expertise levels:
 * - 1: NOVICE
 * - 2: FAMILIAR
 * - 3: KNOWLEDGEABLE
 * - 4: EXPERT
 *
 * @param level - The minimum expertise level (1-4)
 * @param tagId - The tag ID for the required category
 * @returns Method decorator
 */
export const RequireExpertiseLevel = (level: number, tagId: string) =>
  SetMetadata(REQUIRE_EXPERTISE_KEY, { level, tagId } as RequireExpertiseOptions);

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { TierLevel } from '@prisma/client';

/**
 * LeaderboardOptions - Options for querying the leaderboard
 *
 * Supports pagination and optional filtering by tier level or domain expertise.
 */
export interface LeaderboardOptions {
  /** Maximum number of results to return (default: 10) */
  limit?: number;

  /** Number of results to skip for pagination (default: 0) */
  offset?: number;

  /** Filter to only include users of a specific tier level */
  tierLevel?: TierLevel;

  /** Filter to only include users with expertise in a specific topic tag */
  topicTagId?: string;

  /** Time window for activity filter (only include users active within this period) */
  activeWithinDays?: number;
}

/**
 * Default leaderboard options
 */
export const DEFAULT_LEADERBOARD_OPTIONS: Required<
  Omit<LeaderboardOptions, 'tierLevel' | 'topicTagId' | 'activeWithinDays'>
> = {
  limit: 10,
  offset: 0,
};

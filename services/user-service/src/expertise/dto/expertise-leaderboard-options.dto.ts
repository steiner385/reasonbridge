/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExpertiseLevel } from '@prisma/client';

/**
 * ExpertiseLeaderboardOptions - Options for querying the expertise leaderboard
 *
 * Supports pagination and optional filtering by expertise level or activity.
 */
export interface ExpertiseLeaderboardOptions {
  /** Maximum number of results to return (default: 10) */
  limit?: number;

  /** Number of results to skip for pagination (default: 0) */
  offset?: number;

  /** Filter to only include users of a specific expertise level */
  expertiseLevel?: ExpertiseLevel;

  /** Time window for activity filter (only include users active within this period) */
  activeWithinDays?: number;
}

/**
 * Default leaderboard options
 */
export const DEFAULT_EXPERTISE_LEADERBOARD_OPTIONS: Required<
  Omit<ExpertiseLeaderboardOptions, 'expertiseLevel' | 'activeWithinDays'>
> = {
  limit: 10,
  offset: 0,
};

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Badge Calculator
 *
 * Derives badges from user activity thresholds.
 */

import type { GeneratedResponse } from '../generators/response-generator.js';
import type { UserTrustData } from './trust-score-calculator.js';

export interface UserBadges {
  userId: string;
  badges: string[];
}

export const BADGE_DEFINITIONS = {
  FIRST_POST: { name: 'First Post', threshold: 1 },
  CONTRIBUTOR: { name: 'Contributor', threshold: 10 },
  PROLIFIC: { name: 'Prolific', threshold: 50 },
  BRIDGE_BUILDER: { name: 'Bridge Builder', threshold: 10, type: 'synthesis' },
  EVIDENCE_CHAMPION: { name: 'Evidence Champion', threshold: 20, type: 'evidence' },
  EXPERT: { name: 'Expert', rank: 'EXPERT' },
  ESTABLISHED: { name: 'Established Member', rank: 'ESTABLISHED' },
} as const;

/**
 * Calculate badges for all users
 */
export function calculateBadges(
  responses: GeneratedResponse[],
  trustData: UserTrustData[],
): UserBadges[] {
  const results: UserBadges[] = [];

  // Build response counts by user
  const responsesByUser = new Map<string, GeneratedResponse[]>();
  for (const response of responses) {
    const list = responsesByUser.get(response.authorId) || [];
    list.push(response);
    responsesByUser.set(response.authorId, list);
  }

  // Build trust lookup
  const trustByUser = new Map(trustData.map((t) => [t.userId, t]));

  for (const [userId, userResponses] of responsesByUser) {
    const badges: string[] = [];
    const trust = trustByUser.get(userId);

    // Response count badges
    if (userResponses.length >= 1) badges.push('FIRST_POST');
    if (userResponses.length >= 10) badges.push('CONTRIBUTOR');
    if (userResponses.length >= 50) badges.push('PROLIFIC');

    // Type-specific badges
    const synthesisCount = userResponses.filter((r) => r.responseType === 'synthesis').length;
    if (synthesisCount >= 10) badges.push('BRIDGE_BUILDER');

    const evidenceCount = userResponses.filter((r) => r.citedSources.length > 0).length;
    if (evidenceCount >= 20) badges.push('EVIDENCE_CHAMPION');

    // Rank badges
    if (trust?.rank === 'EXPERT') badges.push('EXPERT');
    else if (trust?.rank === 'ESTABLISHED') badges.push('ESTABLISHED');

    results.push({ userId, badges });
  }

  return results;
}

export default calculateBadges;

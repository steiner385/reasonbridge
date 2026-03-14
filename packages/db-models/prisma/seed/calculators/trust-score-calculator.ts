/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Trust Score Calculator
 *
 * Calculates trust scores for users based on their activity, engagement,
 * and contribution quality. Uses the ABI (Ability, Benevolence, Integrity)
 * trust model to derive overall trust scores and user ranks.
 */

import type { GeneratedUserPersona } from '../generators/user-generator.js';
import type { GeneratedResponse } from '../generators/response-generator.js';
import type { GeneratedVote, GeneratedReaction } from '../generators/engagement-generator.js';

// =============================================================================
// INTERFACES
// =============================================================================

export interface TrustScores {
  ability: number;
  benevolence: number;
  integrity: number;
  overall: number;
}

export type UserRank = 'NEWCOMER' | 'MEMBER' | 'ESTABLISHED' | 'EXPERT';

export interface UserTrustData {
  userId: string;
  scores: TrustScores;
  rank: UserRank;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Helpful reaction emojis that indicate constructive contributions */
const HELPFUL_REACTIONS = ['💡', '🎯', '👏'] as const;

/** Maximum responses for volume calculation (caps contribution) */
const MAX_VOLUME_RESPONSES = 50;

/** Score thresholds for rank determination */
const RANK_THRESHOLDS = {
  EXPERT: 0.85,
  ESTABLISHED: 0.7,
  MEMBER: 0.5,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build a map of responses grouped by user ID
 */
function buildResponsesByUser(responses: GeneratedResponse[]): Map<string, GeneratedResponse[]> {
  const map = new Map<string, GeneratedResponse[]>();

  for (const response of responses) {
    const existing = map.get(response.authorId) ?? [];
    existing.push(response);
    map.set(response.authorId, existing);
  }

  return map;
}

/**
 * Build a map of votes grouped by response ID
 */
function buildVotesByResponse(votes: GeneratedVote[]): Map<string, GeneratedVote[]> {
  const map = new Map<string, GeneratedVote[]>();

  for (const vote of votes) {
    const existing = map.get(vote.responseId) ?? [];
    existing.push(vote);
    map.set(vote.responseId, existing);
  }

  return map;
}

/**
 * Build a map of reactions grouped by response ID
 */
function buildReactionsByResponse(
  reactions: GeneratedReaction[],
): Map<string, GeneratedReaction[]> {
  const map = new Map<string, GeneratedReaction[]>();

  for (const reaction of reactions) {
    const existing = map.get(reaction.responseId) ?? [];
    existing.push(reaction);
    map.set(reaction.responseId, existing);
  }

  return map;
}

/**
 * Calculate ability score based on upvote ratio and response volume
 *
 * Formula:
 * - 70% weight: upvote ratio (upvotes / total votes)
 * - 30% weight: volume score (responses / MAX_VOLUME_RESPONSES, capped at 1.0)
 */
function calculateAbility(
  responses: GeneratedResponse[],
  votesByResponse: Map<string, GeneratedVote[]>,
): number {
  if (responses.length === 0) {
    return 0;
  }

  // Calculate upvote ratio across all user's responses
  let totalUpvotes = 0;
  let totalVotes = 0;

  for (const response of responses) {
    const votes = votesByResponse.get(response.id) ?? [];
    for (const vote of votes) {
      totalVotes++;
      if (vote.value === 1) {
        totalUpvotes++;
      }
    }
  }

  // Upvote ratio (default to 0.5 if no votes)
  const upvoteRatio = totalVotes > 0 ? totalUpvotes / totalVotes : 0.5;

  // Volume score (capped at 1.0)
  const volumeScore = Math.min(responses.length / MAX_VOLUME_RESPONSES, 1.0);

  // Weighted combination: 70% upvote ratio, 30% volume
  return upvoteRatio * 0.7 + volumeScore * 0.3;
}

/**
 * Calculate benevolence score based on helpful reactions and synthesis responses
 *
 * Formula:
 * - 60% weight: helpful reaction ratio (helpful reactions / total reactions)
 * - 40% weight: synthesis ratio (synthesis responses / total responses)
 */
function calculateBenevolence(
  responses: GeneratedResponse[],
  reactionsByResponse: Map<string, GeneratedReaction[]>,
): number {
  if (responses.length === 0) {
    return 0;
  }

  // Calculate helpful reaction ratio
  let helpfulReactions = 0;
  let totalReactions = 0;

  for (const response of responses) {
    const reactions = reactionsByResponse.get(response.id) ?? [];
    for (const reaction of reactions) {
      totalReactions++;
      if ((HELPFUL_REACTIONS as readonly string[]).includes(reaction.emoji)) {
        helpfulReactions++;
      }
    }
  }

  // Helpful reaction ratio (default to 0.3 if no reactions)
  const helpfulRatio = totalReactions > 0 ? helpfulReactions / totalReactions : 0.3;

  // Calculate synthesis response ratio
  const synthesisResponses = responses.filter((r) => r.responseType === 'synthesis');
  const synthesisRatio = synthesisResponses.length / responses.length;

  // Weighted combination: 60% helpful reactions, 40% synthesis
  return helpfulRatio * 0.6 + synthesisRatio * 0.4;
}

/**
 * Calculate integrity score based on account age and evidence usage
 *
 * Formula:
 * - 40% weight: account age factor (registrationOffset / 180, capped at 1.0)
 * - 40% weight: evidence ratio (evidence responses / total responses)
 * - 20% base: minimum integrity baseline
 */
function calculateIntegrity(user: GeneratedUserPersona, responses: GeneratedResponse[]): number {
  // Account age factor (capped at 1.0 for 180+ days)
  const ageFactor = Math.min(user.registrationOffset / 180, 1.0);

  // Evidence usage ratio
  let evidenceRatio = 0;
  if (responses.length > 0) {
    const evidenceResponses = responses.filter((r) => r.responseType === 'evidence');
    evidenceRatio = evidenceResponses.length / responses.length;
  }

  // Weighted combination: 40% age, 40% evidence, 20% base
  return ageFactor * 0.4 + evidenceRatio * 0.4 + 0.2;
}

/**
 * Calculate all trust scores for a user
 *
 * Overall score formula:
 * - 40% weight: ability
 * - 30% weight: benevolence
 * - 30% weight: integrity
 */
function calculateUserScores(
  user: GeneratedUserPersona,
  responses: GeneratedResponse[],
  votesByResponse: Map<string, GeneratedVote[]>,
  reactionsByResponse: Map<string, GeneratedReaction[]>,
): TrustScores {
  const ability = calculateAbility(responses, votesByResponse);
  const benevolence = calculateBenevolence(responses, reactionsByResponse);
  const integrity = calculateIntegrity(user, responses);

  // Overall: 40% ability, 30% benevolence, 30% integrity
  const overall = ability * 0.4 + benevolence * 0.3 + integrity * 0.3;

  // Round all scores to 2 decimal places
  return {
    ability: Math.round(ability * 100) / 100,
    benevolence: Math.round(benevolence * 100) / 100,
    integrity: Math.round(integrity * 100) / 100,
    overall: Math.round(overall * 100) / 100,
  };
}

/**
 * Determine user rank based on overall trust score
 */
function getRankFromScore(score: number): UserRank {
  if (score >= RANK_THRESHOLDS.EXPERT) {
    return 'EXPERT';
  }
  if (score >= RANK_THRESHOLDS.ESTABLISHED) {
    return 'ESTABLISHED';
  }
  if (score >= RANK_THRESHOLDS.MEMBER) {
    return 'MEMBER';
  }
  return 'NEWCOMER';
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Calculate trust scores for all users based on their activity and engagement
 *
 * @param users - Array of generated user personas
 * @param responses - Array of generated responses
 * @param votes - Array of generated votes
 * @param reactions - Array of generated reactions
 * @returns Array of user trust data with scores and ranks
 */
export function calculateTrustScores(
  users: GeneratedUserPersona[],
  responses: GeneratedResponse[],
  votes: GeneratedVote[],
  reactions: GeneratedReaction[],
): UserTrustData[] {
  // Build lookup maps for efficient access
  const responsesByUser = buildResponsesByUser(responses);
  const votesByResponse = buildVotesByResponse(votes);
  const reactionsByResponse = buildReactionsByResponse(reactions);

  // Calculate scores for each user
  const trustData: UserTrustData[] = [];

  for (const user of users) {
    const userResponses = responsesByUser.get(user.id) ?? [];
    const scores = calculateUserScores(user, userResponses, votesByResponse, reactionsByResponse);
    const rank = getRankFromScore(scores.overall);

    trustData.push({
      userId: user.id,
      scores,
      rank,
    });
  }

  return trustData;
}

export default calculateTrustScores;

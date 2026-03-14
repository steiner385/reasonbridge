/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Expertise Calculator
 *
 * Calculates per-category expertise levels for users based on their
 * response activity and the quality of engagement (votes) received.
 */

import type { GeneratedResponse } from '../generators/response-generator.js';
import type { GeneratedTopic } from '../generators/topic-generator.js';
import type { GeneratedVote } from '../generators/engagement-generator.js';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type ExpertiseLevel = 'NOVICE' | 'FAMILIAR' | 'PROFICIENT' | 'EXPERT';

export interface UserExpertise {
  userId: string;
  category: string;
  level: ExpertiseLevel;
  responseCount: number;
  positiveRatio: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build a map of topics by ID for quick lookup
 */
function buildTopicMap(topics: GeneratedTopic[]): Map<string, GeneratedTopic> {
  const map = new Map<string, GeneratedTopic>();
  for (const topic of topics) {
    map.set(topic.id, topic);
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
 * Determine expertise level based on response count and positive vote ratio
 */
function determineExpertiseLevel(responseCount: number, positiveRatio: number): ExpertiseLevel {
  if (responseCount >= 50 && positiveRatio >= 0.8) {
    return 'EXPERT';
  }
  if (responseCount >= 20 && positiveRatio >= 0.7) {
    return 'PROFICIENT';
  }
  if (responseCount >= 5) {
    return 'FAMILIAR';
  }
  return 'NOVICE';
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Calculate expertise levels for all users across categories
 *
 * @param responses - Array of generated responses
 * @param topics - Array of generated topics
 * @param votes - Array of generated votes
 * @returns Array of user expertise data per category
 */
export function calculateExpertise(
  responses: GeneratedResponse[],
  topics: GeneratedTopic[],
  votes: GeneratedVote[],
): UserExpertise[] {
  // Build lookup maps
  const topicMap = buildTopicMap(topics);
  const votesByResponse = buildVotesByResponse(votes);

  // Group responses by user AND category
  // Key format: "userId:category"
  const userCategoryResponses = new Map<string, GeneratedResponse[]>();

  for (const response of responses) {
    const topic = topicMap.get(response.topicId);
    if (!topic) {
      continue;
    }

    const key = `${response.authorId}:${topic.category}`;
    const existing = userCategoryResponses.get(key) ?? [];
    existing.push(response);
    userCategoryResponses.set(key, existing);
  }

  // Calculate expertise for each user-category pair
  const results: UserExpertise[] = [];

  for (const [key, categoryResponses] of userCategoryResponses) {
    const [userId, category] = key.split(':');
    if (!userId || !category) {
      continue;
    }

    const responseCount = categoryResponses.length;

    // Calculate positive vote ratio for responses in this category
    let totalVotes = 0;
    let upvotes = 0;

    for (const response of categoryResponses) {
      const responseVotes = votesByResponse.get(response.id) ?? [];
      for (const vote of responseVotes) {
        totalVotes++;
        if (vote.value === 1) {
          upvotes++;
        }
      }
    }

    // Calculate positive ratio (default to 0.5 if no votes)
    const positiveRatio = totalVotes > 0 ? upvotes / totalVotes : 0.5;

    // Round to 2 decimal places
    const roundedRatio = Math.round(positiveRatio * 100) / 100;

    const level = determineExpertiseLevel(responseCount, roundedRatio);

    results.push({
      userId,
      category,
      level,
      responseCount,
      positiveRatio: roundedRatio,
    });
  }

  return results;
}

export default calculateExpertise;

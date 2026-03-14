/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Engagement Generator
 *
 * Generates votes, reactions, bookmarks, and connections for demo seed data.
 * Uses deterministic algorithms for reproducible engagement patterns.
 */

import {
  generateVoteId,
  generateReactionId,
  generateBookmarkId,
  generateConnectionId,
} from '../demo-ids.js';
import type { ScaleConfig } from '../config/distribution.js';
import type { GeneratedUserPersona } from './user-generator.js';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Generated topic interface (minimal fields needed for engagement)
 * Will be imported from topic-generator.ts when available
 */
export interface GeneratedTopic {
  id: string;
  index: number;
  category: string;
  creatorId: string;
}

/**
 * Generated response interface (minimal fields needed for engagement)
 * Will be imported from response-generator.ts when available
 */
export interface GeneratedResponse {
  id: string;
  index: number;
  topicId: string;
  authorId: string;
}

export interface GeneratedVote {
  id: string;
  userId: string;
  responseId: string;
  value: 1 | -1;
  createdAtOffset: number;
}

export interface GeneratedReaction {
  id: string;
  userId: string;
  responseId: string;
  emoji: string;
  createdAtOffset: number;
}

export interface GeneratedBookmark {
  id: string;
  userId: string;
  topicId: string;
  createdAtOffset: number;
}

export interface GeneratedConnection {
  id: string;
  followerId: string;
  followedId: string;
  createdAtOffset: number;
}

export interface GeneratedEngagement {
  votes: GeneratedVote[];
  reactions: GeneratedReaction[];
  bookmarks: GeneratedBookmark[];
  connections: GeneratedConnection[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REACTION_EMOJIS = ['👍', '💡', '🤔', '❤️', '🎯', '👏', '🙌', '💯'] as const;

// Bookmark counts by activity tier
const BOOKMARK_COUNTS = {
  power: 20,
  regular: 10,
  casual: 3,
} as const;

// Follow counts by activity tier
const FOLLOW_COUNTS = {
  power: 30,
  regular: 15,
  casual: 5,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Deterministic pseudo-random number based on seed
 * Returns a value between 0 and 1
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/**
 * Get a deterministic number in range [min, max] based on seed
 */
function getInRange(seed: number, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

/**
 * Shuffle array deterministically based on seed
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    const temp = result[i];
    result[i] = result[j] as T;
    result[j] = temp as T;
  }
  return result;
}

/**
 * Check if user has overlapping interests with another user
 */
function hasOverlappingInterests(
  user1: GeneratedUserPersona,
  user2: GeneratedUserPersona,
): boolean {
  return user1.topicInterests.some((interest) => user2.topicInterests.includes(interest));
}

/**
 * Check if user is interested in a topic's category
 */
function isInterestedInTopic(user: GeneratedUserPersona, topic: GeneratedTopic): boolean {
  // Check if topic category matches any user interest
  return user.topicInterests.some((interest) => {
    const firstWord = interest.toLowerCase().split(' ')[0] ?? '';
    return topic.category.toLowerCase().includes(firstWord);
  });
}

// =============================================================================
// VOTE GENERATION
// =============================================================================

/**
 * Generate votes for responses based on config
 */
export function generateVotes(
  users: GeneratedUserPersona[],
  responses: GeneratedResponse[],
  config: ScaleConfig,
): GeneratedVote[] {
  const votes: GeneratedVote[] = [];
  let voteIndex = 0;

  for (const response of responses) {
    // Determine number of votes for this response
    const [minVotes, maxVotes] = config.votesPerResponse;
    const numVotes = getInRange(response.index, minVotes, maxVotes);

    // Get potential voters (exclude author)
    const potentialVoters = users.filter((u) => u.id !== response.authorId);

    // Select voters deterministically
    const shuffledVoters = shuffleWithSeed(potentialVoters, response.index);
    const selectedVoters = shuffledVoters.slice(0, Math.min(numVotes, shuffledVoters.length));

    for (const voter of selectedVoters) {
      // Determine vote value: mostly +1, some -1 based on deterministic logic
      // Approximately 80% upvotes, 20% downvotes
      const valueSeed = voter.index * 1000 + response.index;
      const value: 1 | -1 = seededRandom(valueSeed) < 0.8 ? 1 : -1;

      // Calculate createdAtOffset (days ago, within response creation window)
      const offsetSeed = voter.index * 100 + voteIndex;
      const createdAtOffset = getInRange(offsetSeed, 0, 30);

      votes.push({
        id: generateVoteId(voter.index, voteIndex++),
        userId: voter.id,
        responseId: response.id,
        value,
        createdAtOffset,
      });
    }
  }

  return votes;
}

// =============================================================================
// REACTION GENERATION
// =============================================================================

/**
 * Generate reactions for responses based on config
 */
export function generateReactions(
  users: GeneratedUserPersona[],
  responses: GeneratedResponse[],
  config: ScaleConfig,
): GeneratedReaction[] {
  const reactions: GeneratedReaction[] = [];
  let reactionIndex = 0;

  for (const response of responses) {
    // Determine number of reactions for this response
    const [minReactions, maxReactions] = config.reactionsPerResponse;
    const numReactions = getInRange(response.index + 500, minReactions, maxReactions);

    // Skip if no reactions
    if (numReactions === 0) continue;

    // Get potential reactors (exclude author)
    const potentialReactors = users.filter((u) => u.id !== response.authorId);

    // Select reactors deterministically
    const shuffledReactors = shuffleWithSeed(potentialReactors, response.index + 1000);
    const selectedReactors = shuffledReactors.slice(
      0,
      Math.min(numReactions, shuffledReactors.length),
    );

    for (const reactor of selectedReactors) {
      // Select emoji deterministically
      const emojiSeed = reactor.index * 100 + response.index;
      const emojiIndex = Math.floor(seededRandom(emojiSeed) * REACTION_EMOJIS.length);
      const emoji = REACTION_EMOJIS[emojiIndex] ?? REACTION_EMOJIS[0];

      // Calculate createdAtOffset
      const offsetSeed = reactor.index * 50 + reactionIndex;
      const createdAtOffset = getInRange(offsetSeed, 0, 30);

      reactions.push({
        id: generateReactionId(reactor.index, reactionIndex++),
        userId: reactor.id,
        responseId: response.id,
        emoji,
        createdAtOffset,
      });
    }
  }

  return reactions;
}

// =============================================================================
// BOOKMARK GENERATION
// =============================================================================

/**
 * Generate bookmarks based on user activity tier and interests
 */
export function generateBookmarks(
  users: GeneratedUserPersona[],
  topics: GeneratedTopic[],
): GeneratedBookmark[] {
  const bookmarks: GeneratedBookmark[] = [];
  let bookmarkIndex = 0;

  for (const user of users) {
    const bookmarkCount = BOOKMARK_COUNTS[user.activityTier];

    // Sort topics by interest match, then deterministically shuffle
    const interestedTopics = topics.filter((t) => isInterestedInTopic(user, t));
    const otherTopics = topics.filter((t) => !isInterestedInTopic(user, t));

    // Prefer interested topics but include some others
    const shuffledInterested = shuffleWithSeed(interestedTopics, user.index);
    const shuffledOther = shuffleWithSeed(otherTopics, user.index + 1000);

    // Take mostly from interested, fill with others if needed
    const interestedCount = Math.min(Math.ceil(bookmarkCount * 0.7), shuffledInterested.length);
    const otherCount = Math.min(bookmarkCount - interestedCount, shuffledOther.length);

    const selectedTopics = [
      ...shuffledInterested.slice(0, interestedCount),
      ...shuffledOther.slice(0, otherCount),
    ];

    for (const topic of selectedTopics) {
      // Calculate createdAtOffset
      const offsetSeed = user.index * 200 + bookmarkIndex;
      const createdAtOffset = getInRange(offsetSeed, 0, user.registrationOffset);

      bookmarks.push({
        id: generateBookmarkId(user.index, bookmarkIndex++),
        userId: user.id,
        topicId: topic.id,
        createdAtOffset,
      });
    }
  }

  return bookmarks;
}

// =============================================================================
// CONNECTION GENERATION
// =============================================================================

/**
 * Generate follow connections based on activity tier and overlapping interests
 */
export function generateConnections(users: GeneratedUserPersona[]): GeneratedConnection[] {
  const connections: GeneratedConnection[] = [];
  let connectionIndex = 0;

  for (const user of users) {
    const followCount = FOLLOW_COUNTS[user.activityTier];

    // Get potential users to follow (exclude self)
    const potentialFollows = users.filter((u) => u.id !== user.id);

    // Prioritize users with overlapping interests
    const withOverlap = potentialFollows.filter((u) => hasOverlappingInterests(user, u));
    const withoutOverlap = potentialFollows.filter((u) => !hasOverlappingInterests(user, u));

    // Shuffle both groups deterministically
    const shuffledWithOverlap = shuffleWithSeed(withOverlap, user.index);
    const shuffledWithoutOverlap = shuffleWithSeed(withoutOverlap, user.index + 2000);

    // Take mostly from overlap group, fill with others
    const overlapCount = Math.min(Math.ceil(followCount * 0.7), shuffledWithOverlap.length);
    const otherCount = Math.min(followCount - overlapCount, shuffledWithoutOverlap.length);

    const selectedFollows = [
      ...shuffledWithOverlap.slice(0, overlapCount),
      ...shuffledWithoutOverlap.slice(0, otherCount),
    ];

    for (const followed of selectedFollows) {
      // Calculate createdAtOffset
      const offsetSeed = user.index * 300 + connectionIndex;
      const maxOffset = Math.min(user.registrationOffset, followed.registrationOffset);
      const createdAtOffset = getInRange(offsetSeed, 0, Math.max(0, maxOffset));

      connections.push({
        id: generateConnectionId(user.index, connectionIndex++),
        followerId: user.id,
        followedId: followed.id,
        createdAtOffset,
      });
    }
  }

  return connections;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate all engagement data (votes, reactions, bookmarks, connections)
 */
export function generateEngagement(
  users: GeneratedUserPersona[],
  responses: GeneratedResponse[],
  topics: GeneratedTopic[],
  config: ScaleConfig,
): GeneratedEngagement {
  const votes = generateVotes(users, responses, config);
  const reactions = generateReactions(users, responses, config);
  const bookmarks = generateBookmarks(users, topics);
  const connections = generateConnections(users);

  return {
    votes,
    reactions,
    bookmarks,
    connections,
  };
}

export default generateEngagement;

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Contribution types for user activity history
 */

/**
 * Type of contribution in user activity history
 */
export type ContributionType = 'TOPIC' | 'RESPONSE' | 'VOTE' | 'PROPOSITION';

/**
 * Topic context for a contribution
 */
export interface ContributionTopicContext {
  /** Topic ID */
  id: string;
  /** Topic title */
  title: string;
  /** Topic status (optional) */
  status?: string;
}

/**
 * Statistics summary for user contributions
 */
export interface ContributionStats {
  /** Number of topics created */
  topicCount: number;
  /** Number of responses posted */
  responseCount: number;
  /** Number of votes cast */
  voteCount: number;
  /** Number of propositions made */
  propositionCount: number;
}

/**
 * A single contribution item in user activity history
 */
export interface ContributionItem {
  /** Unique identifier for the contribution */
  id: string;
  /** Type of contribution */
  type: ContributionType;
  /** ISO 8601 timestamp of when the contribution was created */
  createdAt: Date | string;
  /** Content preview (for topics/responses, max 200 chars) */
  contentPreview?: string;
  /** Topic context for the contribution */
  topic?: ContributionTopicContext;
  /** Response ID (for votes and propositions) */
  responseId?: string;
  /** Vote direction (for votes only) */
  voteDirection?: 'UP' | 'DOWN';
  /** Proposition text (for propositions only) */
  propositionText?: string;
  /** Number of upvotes received (for topics/responses) */
  upvoteCount?: number;
  /** Number of downvotes received (for topics/responses) */
  downvoteCount?: number;
  /** Number of replies (for responses) */
  replyCount?: number;
}

/**
 * Paginated list of contribution items
 */
export interface ContributionList {
  /** Array of contribution items */
  data: ContributionItem[];
  /** Pagination metadata */
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

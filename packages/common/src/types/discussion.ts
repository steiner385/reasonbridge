/**
 * Discussion-related type definitions
 */

import type { UserId } from './user';

/**
 * Unique identifier for a discussion
 */
export type DiscussionId = string;

/**
 * Discussion status
 */
export type DiscussionStatus = 'draft' | 'active' | 'paused' | 'concluded' | 'archived';

/**
 * Discussion topic/category
 */
export interface DiscussionTopic {
  id: string;
  name: string;
  description: string;
}

/**
 * A discussion thread
 */
export interface Discussion {
  id: DiscussionId;
  title: string;
  description: string;
  topic: DiscussionTopic;
  status: DiscussionStatus;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Unique identifier for a contribution
 */
export type ContributionId = string;

/**
 * A contribution to a discussion
 */
export interface Contribution {
  id: ContributionId;
  discussionId: DiscussionId;
  authorId: UserId;
  content: string;
  parentId: ContributionId | null;
  createdAt: Date;
  updatedAt: Date;
}

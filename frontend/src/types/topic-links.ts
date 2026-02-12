/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Type definitions for topic links functionality
 * Feature 016: Topic Management - Topic Linking (T217, T230)
 */

/**
 * Relationship types between linked topics
 */
export type TopicRelationshipType =
  | 'BUILDS_ON'
  | 'RESPONDS_TO'
  | 'CONTRADICTS'
  | 'RELATED'
  | 'SHARES_PROPOSITION';

/**
 * Source of the link (AI suggested or user proposed)
 */
export type LinkSource = 'AI_SUGGESTED' | 'USER_PROPOSED';

/**
 * Confirmation status for a topic link
 */
export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

/**
 * Simplified topic reference for linked topics
 */
export interface LinkedTopicInfo {
  id: string;
  title: string;
  slug: string;
}

/**
 * Full topic link response from the API
 */
export interface TopicLink {
  id: string;
  sourceTopicId: string;
  targetTopicId: string;
  relationshipType: TopicRelationshipType;
  linkSource: LinkSource;
  confirmationStatus: ConfirmationStatus;
  proposerId: string | null;
  confirmedByCount: number;
  rejectedByCount: number;
  createdAt: string;
  sourceTopic?: LinkedTopicInfo;
  targetTopic?: LinkedTopicInfo;
}

/**
 * Simplified linked topic response for display
 */
export interface LinkedTopic {
  id: string;
  title: string;
  slug: string;
  relationshipType: TopicRelationshipType;
  linkId: string;
  confirmationStatus: ConfirmationStatus;
}

/**
 * Request to create a new topic link
 */
export interface CreateTopicLinkRequest {
  targetTopicId: string;
  relationshipType: TopicRelationshipType;
  linkSource?: LinkSource;
}

/**
 * Request to update a topic link status
 */
export interface UpdateTopicLinkStatusRequest {
  status: ConfirmationStatus;
}

/**
 * Query parameters for getting topic links
 */
export interface GetTopicLinksQuery {
  relationshipType?: TopicRelationshipType;
  status?: ConfirmationStatus;
  linkSource?: LinkSource;
}

/**
 * Human-readable labels for relationship types
 */
export const RELATIONSHIP_TYPE_LABELS: Record<TopicRelationshipType, string> = {
  BUILDS_ON: 'Builds On',
  RESPONDS_TO: 'Responds To',
  CONTRADICTS: 'Contradicts',
  RELATED: 'Related',
  SHARES_PROPOSITION: 'Shares Proposition',
};

/**
 * Color schemes for relationship types
 */
export const RELATIONSHIP_TYPE_COLORS: Record<
  TopicRelationshipType,
  { bg: string; text: string; darkBg: string; darkText: string }
> = {
  BUILDS_ON: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    darkBg: 'dark:bg-blue-900',
    darkText: 'dark:text-blue-200',
  },
  RESPONDS_TO: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    darkBg: 'dark:bg-purple-900',
    darkText: 'dark:text-purple-200',
  },
  CONTRADICTS: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    darkBg: 'dark:bg-red-900',
    darkText: 'dark:text-red-200',
  },
  RELATED: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    darkBg: 'dark:bg-gray-700',
    darkText: 'dark:text-gray-200',
  },
  SHARES_PROPOSITION: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900',
    darkText: 'dark:text-green-200',
  },
};

/**
 * Icons for relationship types
 */
export const RELATIONSHIP_TYPE_ICONS: Record<TopicRelationshipType, string> = {
  BUILDS_ON: '↗',
  RESPONDS_TO: '↩',
  CONTRADICTS: '⚡',
  RELATED: '↔',
  SHARES_PROPOSITION: '≡',
};

/**
 * Confirmation status colors
 */
export const CONFIRMATION_STATUS_COLORS: Record<
  ConfirmationStatus,
  { bg: string; text: string; darkBg: string; darkText: string }
> = {
  PENDING: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    darkBg: 'dark:bg-yellow-900',
    darkText: 'dark:text-yellow-200',
  },
  CONFIRMED: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900',
    darkText: 'dark:text-green-200',
  },
  REJECTED: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    darkBg: 'dark:bg-red-900',
    darkText: 'dark:text-red-200',
  },
};

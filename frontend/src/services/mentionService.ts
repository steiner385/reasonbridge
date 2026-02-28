/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mention service for user search in @mentions
 * Provides API calls for searching users with topic participant priority
 */

import { apiClient } from '../lib/api.js';

/**
 * User data returned from mention search
 */
export interface MentionUser {
  /** Unique user identifier */
  id: string;
  /** Username (login name) */
  username: string;
  /** Display name (can be different from username) */
  displayName: string;
  /** Optional avatar URL */
  avatarUrl?: string;
}

/**
 * Search for users to mention in responses
 *
 * @param query - Search query string (partial username or display name)
 * @param topicId - Optional topic ID to prioritize participants
 * @param limit - Maximum number of results (default: 5)
 * @returns Array of matching users, prioritized by topic participation
 *
 * @example
 * ```typescript
 * // Search all users
 * const users = await searchUsers('john');
 *
 * // Prioritize topic participants
 * const users = await searchUsers('john', 'topic-123');
 *
 * // Limit results
 * const users = await searchUsers('john', undefined, 3);
 * ```
 */
export async function searchUsers(
  query: string,
  topicId?: string,
  limit = 5,
): Promise<MentionUser[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (topicId) {
    params.append('topicId', topicId);
  }

  return apiClient.get<MentionUser[]>(`/users/search?${params}`);
}

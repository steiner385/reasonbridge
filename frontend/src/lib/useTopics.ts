/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import type { PaginatedTopicsResponse, GetTopicsParams } from '../types/topic';
import { apiClient } from './api';

/**
 * React Query hook for fetching topics with filtering and pagination
 * Feature 016: Topic Management (T025)
 *
 * Supports filtering by:
 * - status (SEEDING/ACTIVE/ARCHIVED/LOCKED)
 * - visibility (PUBLIC/PRIVATE/UNLISTED)
 * - tags (single tag or array of tags)
 * - search (full-text search on title/description)
 * - creatorId
 *
 * Supports sorting by: createdAt, participantCount, responseCount
 * Supports pagination: page, limit
 */
export function useTopics(params?: GetTopicsParams) {
  return useQuery({
    queryKey: ['topics', params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedTopicsResponse>('/topics', {
        params: params as Record<string, string | number | boolean>,
      });
      return response;
    },
  });
}

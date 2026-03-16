/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import type { BridgingSuggestionsResponse } from '../types/common-ground';
import { apiClient } from './api';

/**
 * React Query hook for fetching bridging suggestions for a topic
 *
 * Fetches bridging suggestions from the ai-service through the API gateway.
 * Requires the ai-service to be running with Qdrant for vector similarity.
 */
export function useBridgingSuggestions(topicId: string | undefined) {
  return useQuery({
    queryKey: ['bridgingSuggestions', topicId],
    queryFn: async (): Promise<BridgingSuggestionsResponse> => {
      if (!topicId) {
        throw new Error('Topic ID is required');
      }

      return apiClient.get<BridgingSuggestionsResponse>(`/topics/${topicId}/bridging-suggestions`);
    },
    enabled: !!topicId,
    // Bridging suggestions require AI service with Qdrant - may not always be available
    retry: false,
    // Stale time: 5 minutes (suggestions don't change frequently)
    staleTime: 5 * 60 * 1000,
  });
}

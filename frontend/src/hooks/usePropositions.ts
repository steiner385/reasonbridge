/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

interface Proposition {
  id: string;
  topicId: string;
  statement: string;
  source: string;
  creatorId: string | null;
  supportCount: number;
  opposeCount: number;
  nuancedCount: number;
  createdAt: string;
  relatedResponses: Array<{ responseId: string }>;
}

/**
 * Hook for fetching propositions for a specific topic
 *
 * @param topicId - The ID of the topic to fetch propositions for
 * @returns React Query result with propositions data
 */
export function usePropositions(topicId: string | null) {
  return useQuery({
    queryKey: ['propositions', topicId],
    queryFn: async () => {
      if (!topicId) return [];

      const response = await apiClient.get<Proposition[]>(`/topics/${topicId}/propositions`);
      return response.data;
    },
    enabled: !!topicId,
    staleTime: 60000, // 60 seconds
  });
}

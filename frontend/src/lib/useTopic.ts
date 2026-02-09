/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import type { Topic } from '../types/topic';
import { apiClient } from './api';

/**
 * React Query hook for fetching a single topic by ID
 */
export function useTopic(topicId: string | undefined) {
  return useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      // No need to check topicId - the query is disabled when topicId is undefined
      // via enabled: !!topicId below
      const response = await apiClient.get<Topic>(`/topics/${topicId!}`);
      return response;
    },
    enabled: !!topicId,
  });
}

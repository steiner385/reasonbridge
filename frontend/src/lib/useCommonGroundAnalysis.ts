/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import type { CommonGroundAnalysis } from '../types/common-ground';
import { apiClient } from './api';
import { adaptCommonGroundResponse, isValidBackendResponse } from './common-ground-adapter';

/**
 * React Query hook for fetching common ground analysis for a topic
 *
 * Fetches common ground analysis from the backend and transforms it
 * to the frontend CommonGroundAnalysis format using an adapter.
 */
export function useCommonGroundAnalysis(topicId: string | undefined) {
  return useQuery({
    queryKey: ['commonGroundAnalysis', topicId],
    queryFn: async (): Promise<CommonGroundAnalysis> => {
      if (!topicId) {
        throw new Error('Topic ID is required');
      }

      // Fetch raw response from backend
      const response = await apiClient.get<unknown>(`/topics/${topicId}/common-ground-analysis`);

      // Validate and transform to frontend format
      if (!isValidBackendResponse(response)) {
        throw new Error('Invalid common ground analysis response from server');
      }

      return adaptCommonGroundResponse(response, topicId);
    },
    enabled: !!topicId,
  });
}

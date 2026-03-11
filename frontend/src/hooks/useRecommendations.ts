/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * React Query hooks for the Recommendation Service
 *
 * Provides hooks for fetching topic recommendations, similar topics,
 * and trending topics from the recommendation-service backend.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type {
  TopicRecommendationsResponse,
  SimilarTopicsResponse,
  TrendingTopicsResponse,
  GetRecommendationsParams,
  GetTrendingParams,
} from '../types/recommendations';

/**
 * Fetch general topic recommendations based on query and tags
 *
 * @param params - Query parameters for filtering recommendations
 * @returns React Query result with recommendations
 */
export function useTopicRecommendations(params: GetRecommendationsParams = {}) {
  const queryParams = new URLSearchParams();

  if (params.query) queryParams.append('query', params.query);
  if (params.tags?.length) queryParams.append('tags', params.tags.join(','));
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.userId) queryParams.append('userId', params.userId);

  const queryString = queryParams.toString();
  const url = `/recommendations/topics${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['topicRecommendations', params],
    queryFn: async () => {
      const response = await apiClient.get<TopicRecommendationsResponse>(url);
      return response;
    },
    staleTime: 60000, // 1 minute
    enabled: Boolean(params.query || params.tags?.length),
  });
}

/**
 * Fetch topics similar to a given topic
 *
 * @param topicId - The topic ID to find similar topics for
 * @param limit - Maximum number of similar topics to return (default: 5)
 * @returns React Query result with similar topics
 */
export function useSimilarTopics(topicId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ['similarTopics', topicId, limit],
    queryFn: async () => {
      if (!topicId) throw new Error('Topic ID is required');
      const response = await apiClient.get<SimilarTopicsResponse>(
        `/recommendations/topics/similar/${topicId}?limit=${limit}`,
      );
      return response;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (matches backend cache)
    enabled: Boolean(topicId),
  });
}

/**
 * Fetch trending topics
 *
 * @param params - Parameters for filtering trending topics
 * @returns React Query result with trending topics
 */
export function useTrendingTopics(params: GetTrendingParams = {}) {
  const queryParams = new URLSearchParams();

  if (params.hours) queryParams.append('hours', params.hours.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.tags?.length) queryParams.append('tags', params.tags.join(','));

  const queryString = queryParams.toString();
  const url = `/recommendations/topics/trending${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['trendingTopics', params],
    queryFn: async () => {
      const response = await apiClient.get<TrendingTopicsResponse>(url);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

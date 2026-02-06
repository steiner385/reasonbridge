/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api';
import type { CommonGround } from '../types/commonGround';

/**
 * React Query hook for fetching common ground analysis for a topic
 */
export function useCommonGround(topicId: string | undefined, version?: number) {
  return useQuery({
    queryKey: ['commonGround', topicId, version],
    queryFn: async () => {
      if (!topicId) {
        throw new Error('Topic ID is required');
      }
      const params = version ? `?version=${version}` : '';
      const response = await apiClient.get<CommonGround>(
        `/topics/${topicId}/common-ground${params}`,
      );
      return response;
    },
    enabled: !!topicId,
  });
}

/**
 * React Query hook for fetching all common ground versions (history) for a topic
 * Since the backend returns a single version, we'll fetch the latest version
 * and use the version number to derive history items
 */
export function useCommonGroundHistory(topicId: string | undefined) {
  return useQuery({
    queryKey: ['commonGroundHistory', topicId],
    queryFn: async () => {
      if (!topicId) {
        throw new Error('Topic ID is required');
      }

      // Fetch the latest version to know how many versions exist
      const latest = await apiClient.get<CommonGround>(`/topics/${topicId}/common-ground`);

      // If only one version exists, return it
      if (latest.version === 1) {
        return [latest];
      }

      // Fetch all versions
      const promises = Array.from({ length: latest.version }, (_, i) =>
        apiClient.get<CommonGround>(`/topics/${topicId}/common-ground?version=${i + 1}`),
      );

      const allVersions = await Promise.all(promises);

      // Sort by version descending (newest first)
      return allVersions.sort((a, b) => b.version - a.version);
    },
    enabled: !!topicId,
  });
}

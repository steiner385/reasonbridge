/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * usePrivacySettings - React Query hooks for managing privacy settings
 *
 * Provides query and mutations for fetching and updating user privacy settings,
 * with optimistic updates for instant UI feedback.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type { PrivacySettings, ProfileVisibility, TrustVisibility } from '../types/user';

/**
 * Privacy settings response from API with metadata
 */
export interface PrivacySettingsResponse extends PrivacySettings {
  userId: string;
  updatedAt: string;
}

/**
 * Partial update DTO for privacy settings
 */
export interface UpdatePrivacySettingsDto {
  activityHistory?: ProfileVisibility;
  detailedTrustScores?: TrustVisibility;
  followerList?: ProfileVisibility;
  followingList?: ProfileVisibility;
}

/**
 * Options for usePrivacySettings hook
 */
export interface UsePrivacySettingsOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 5 minutes) */
  staleTime?: number;
}

/**
 * Result of usePrivacySettings hook
 */
export interface UsePrivacySettingsResult {
  /** Current privacy settings */
  settings: PrivacySettings | null;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether the query encountered an error */
  isError: boolean;
  /** Error object if query failed */
  error: Error | null;
  /** Whether an update is pending */
  isPending: boolean;
  /** Update privacy settings (partial update) */
  updateSettings: (updates: UpdatePrivacySettingsDto) => void;
  /** Update privacy settings and return promise */
  updateSettingsAsync: (updates: UpdatePrivacySettingsDto) => Promise<PrivacySettingsResponse>;
  /** Refetch settings from server */
  refetch: () => void;
}

/**
 * Hook for managing current user's privacy settings
 *
 * @param options - Optional configuration for the query
 * @returns Object with privacy settings and update functions
 *
 * @remarks
 * **Features:**
 * - Fetch current user's privacy settings
 * - Optimistic updates for immediate UI feedback
 * - Automatic rollback on error
 * - Partial updates supported (only send changed fields)
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { settings, isLoading, updateSettings } = usePrivacySettings();
 *
 * // Update a single setting
 * const handleToggle = () => {
 *   updateSettings({
 *     activityHistory: settings?.activityHistory === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'
 *   });
 * };
 *
 * return (
 *   <PrivacyForm
 *     settings={settings}
 *     onChange={updateSettings}
 *     disabled={isLoading}
 *   />
 * );
 * ```
 */
export function usePrivacySettings(
  options: UsePrivacySettingsOptions = {},
): UsePrivacySettingsResult {
  const queryClient = useQueryClient();
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  const queryKey = ['privacySettings'];

  // Query for current privacy settings
  const query = useQuery<PrivacySettingsResponse, Error>({
    queryKey,
    queryFn: async () => {
      return apiClient.get<PrivacySettingsResponse>('/users/me/privacy');
    },
    enabled,
    staleTime,
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Context type for optimistic updates
  type MutationContext = { previousSettings: PrivacySettingsResponse | undefined };

  // Update mutation with optimistic updates
  const updateMutation = useMutation<
    PrivacySettingsResponse,
    Error,
    UpdatePrivacySettingsDto,
    MutationContext
  >({
    mutationFn: async (updates: UpdatePrivacySettingsDto) => {
      return apiClient.patch<PrivacySettingsResponse>('/users/me/privacy', updates);
    },

    // Optimistic update
    onMutate: async (updates) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot current state for rollback
      const previousSettings = queryClient.getQueryData<PrivacySettingsResponse>(queryKey);

      // Optimistically update with new values
      if (previousSettings) {
        queryClient.setQueryData<PrivacySettingsResponse>(queryKey, {
          ...previousSettings,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousSettings };
    },

    // Rollback on error
    onError: (_error, _variables, context) => {
      if (context?.previousSettings !== undefined) {
        queryClient.setQueryData(queryKey, context.previousSettings);
      }
    },

    // Update with server response on success
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  // Extract just the PrivacySettings portion (without metadata)
  const settings: PrivacySettings | null = query.data
    ? {
        activityHistory: query.data.activityHistory,
        detailedTrustScores: query.data.detailedTrustScores,
        followerList: query.data.followerList,
        followingList: query.data.followingList,
        updatedAt: query.data.updatedAt,
      }
    : null;

  return {
    settings,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isPending: updateMutation.isPending,
    updateSettings: updateMutation.mutate,
    updateSettingsAsync: updateMutation.mutateAsync,
    refetch: query.refetch,
  };
}

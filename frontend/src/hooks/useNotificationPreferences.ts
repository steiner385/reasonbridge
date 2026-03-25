/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useNotificationPreferences - React Query hooks for managing notification preferences
 *
 * Provides query and mutations for fetching and updating user notification preferences,
 * with optimistic updates for instant UI feedback.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  /** Whether email notifications are enabled */
  emailNotifications: boolean;
  /** Whether push notifications are enabled */
  pushNotifications: boolean;
  /** Whether weekly digest emails are enabled */
  weeklyDigest: boolean;
}

/**
 * Notification preferences response from API with metadata
 */
export interface NotificationPreferencesResponse extends NotificationPreferences {
  userId: string;
  updatedAt: string;
  /** Whether push notifications are available (user has FCM token) */
  pushAvailable: boolean;
}

/**
 * Partial update DTO for notification preferences
 */
export interface UpdateNotificationPreferencesDto {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  weeklyDigest?: boolean;
}

/**
 * Options for useNotificationPreferences hook
 */
export interface UseNotificationPreferencesOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 5 minutes) */
  staleTime?: number;
}

/**
 * Result of useNotificationPreferences hook
 */
export interface UseNotificationPreferencesResult {
  /** Current notification preferences */
  preferences: NotificationPreferences | null;
  /** Whether push notifications are available */
  pushAvailable: boolean;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether the query encountered an error */
  isError: boolean;
  /** Error object if query failed */
  error: Error | null;
  /** Whether an update is pending */
  isPending: boolean;
  /** Update notification preferences (partial update) */
  updatePreferences: (updates: UpdateNotificationPreferencesDto) => void;
  /** Update notification preferences and return promise */
  updatePreferencesAsync: (
    updates: UpdateNotificationPreferencesDto,
  ) => Promise<NotificationPreferencesResponse>;
  /** Refetch preferences from server */
  refetch: () => void;
}

/**
 * Hook for managing current user's notification preferences
 *
 * @param options - Optional configuration for the query
 * @returns Object with notification preferences and update functions
 *
 * @remarks
 * **Features:**
 * - Fetch current user's notification preferences
 * - Optimistic updates for immediate UI feedback
 * - Automatic rollback on error
 * - Partial updates supported (only send changed fields)
 *
 * @example
 * ```tsx
 * const { preferences, isLoading, updatePreferences, pushAvailable } = useNotificationPreferences();
 *
 * const handleToggleEmail = () => {
 *   updatePreferences({
 *     emailNotifications: !preferences?.emailNotifications
 *   });
 * };
 *
 * return (
 *   <Toggle
 *     checked={preferences?.emailNotifications}
 *     onChange={handleToggleEmail}
 *     disabled={isLoading}
 *   />
 * );
 * ```
 */
export function useNotificationPreferences(
  options: UseNotificationPreferencesOptions = {},
): UseNotificationPreferencesResult {
  const queryClient = useQueryClient();
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  const queryKey = ['notificationPreferences'];

  // Query for current notification preferences
  const query = useQuery<NotificationPreferencesResponse, Error>({
    queryKey,
    queryFn: async () => {
      return apiClient.get<NotificationPreferencesResponse>('/users/me/notifications');
    },
    enabled,
    staleTime,
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Context type for optimistic updates
  type MutationContext = { previousPreferences: NotificationPreferencesResponse | undefined };

  // Update mutation with optimistic updates
  const updateMutation = useMutation<
    NotificationPreferencesResponse,
    Error,
    UpdateNotificationPreferencesDto,
    MutationContext
  >({
    mutationFn: async (updates: UpdateNotificationPreferencesDto) => {
      return apiClient.patch<NotificationPreferencesResponse>('/users/me/notifications', updates);
    },

    // Optimistic update
    onMutate: async (updates) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot current state for rollback
      const previousPreferences =
        queryClient.getQueryData<NotificationPreferencesResponse>(queryKey);

      // Optimistically update with new values
      if (previousPreferences) {
        queryClient.setQueryData<NotificationPreferencesResponse>(queryKey, {
          ...previousPreferences,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousPreferences };
    },

    // Rollback on error
    onError: (_error, _variables, context) => {
      if (context?.previousPreferences !== undefined) {
        queryClient.setQueryData(queryKey, context.previousPreferences);
      }
    },

    // Update with server response on success
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  // Extract just the preferences portion (without metadata)
  const preferences: NotificationPreferences | null = query.data
    ? {
        emailNotifications: query.data.emailNotifications,
        pushNotifications: query.data.pushNotifications,
        weeklyDigest: query.data.weeklyDigest,
      }
    : null;

  return {
    preferences,
    pushAvailable: query.data?.pushAvailable ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isPending: updateMutation.isPending,
    updatePreferences: updateMutation.mutate,
    updatePreferencesAsync: updateMutation.mutateAsync,
    refetch: query.refetch,
  };
}

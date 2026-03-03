/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * React Query hook for updating the current user's profile
 *
 * @remarks
 * Uses optimistic updates to provide instant feedback while the request completes.
 * Automatically invalidates user queries on success to refetch fresh data.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '../lib/api';
import type { UserProfile } from '../types/user';

/** Profile update payload - matches backend UpdateProfileDto */
export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
}

/** Response from the profile update endpoint */
export interface UpdateProfileResponse {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  email: string;
  verificationLevel: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook options for customizing mutation behavior
 */
export interface UseUpdateProfileOptions {
  /** Callback on successful update */
  onSuccess?: (data: UpdateProfileResponse) => void;
  /** Callback on error */
  onError?: (error: ApiError) => void;
}

/**
 * Hook for updating the current user's profile
 *
 * @param userId - The current user's ID (for cache invalidation)
 * @param options - Optional callbacks for success/error handling
 * @returns Mutation object with mutate function and status
 *
 * @example
 * ```tsx
 * const { mutate, isPending, isError, error } = useUpdateProfile(user.id, {
 *   onSuccess: () => toast.success('Profile updated!'),
 *   onError: (err) => toast.error(err.message),
 * });
 *
 * // Update profile
 * mutate({ displayName: 'New Name', bio: 'Updated bio' });
 * ```
 */
export function useUpdateProfile(
  userId: string | undefined,
  options: UseUpdateProfileOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await apiClient.put<UpdateProfileResponse>('/users/me', data);
      return response;
    },

    // Optimistic update for instant feedback
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      // Note: useCurrentUser uses ['user', 'current'] query key
      await queryClient.cancelQueries({ queryKey: ['user', userId] });
      await queryClient.cancelQueries({ queryKey: ['user', 'current'] });

      // Snapshot the previous values
      const previousUser = queryClient.getQueryData<UserProfile>(['user', userId]);
      const previousCurrentUser = queryClient.getQueryData<UserProfile>(['user', 'current']);

      // Optimistically update the cache
      if (previousUser) {
        queryClient.setQueryData<UserProfile>(['user', userId], {
          ...previousUser,
          ...newData,
        });
      }

      if (previousCurrentUser) {
        queryClient.setQueryData<UserProfile>(['user', 'current'], {
          ...previousCurrentUser,
          ...newData,
        });
      }

      // Return context for rollback
      return { previousUser, previousCurrentUser };
    },

    // On error, rollback to previous values
    onError: (error, _variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(['user', userId], context.previousUser);
      }
      if (context?.previousCurrentUser) {
        queryClient.setQueryData(['user', 'current'], context.previousCurrentUser);
      }

      // Call user's error handler
      if (options.onError && error instanceof ApiError) {
        options.onError(error);
      }
    },

    // On success, invalidate queries to refetch fresh data
    onSuccess: (data) => {
      // Invalidate related queries
      // Note: useCurrentUser uses ['user', 'current'] query key
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['user', 'current'] });

      // Call user's success handler
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['user', 'current'] });
    },
  });
}

export default useUpdateProfile;

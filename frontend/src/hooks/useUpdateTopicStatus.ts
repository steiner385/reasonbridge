/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TanStack Query hook for updating topic status
 * Feature 016: Topic Management (T030)
 *
 * Provides mutation for changing topic status (archive, lock, reopen) with:
 * - Optimistic updates
 * - Error handling
 * - Query invalidation for automatic UI refresh
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface UpdateTopicStatusRequest {
  topicId: string;
  status: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';
}

export interface UseUpdateTopicStatusOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for updating a topic's status
 *
 * @param options - Optional callbacks for success and error
 * @returns Mutation object with updateStatus function and state
 *
 * @example
 * ```tsx
 * const { mutate: updateStatus, isPending } = useUpdateTopicStatus({
 *   onSuccess: () => {
 *     showToast('Topic status updated successfully');
 *   },
 * });
 *
 * // In button handler:
 * updateStatus({ topicId: topic.id, status: 'ARCHIVED' });
 * ```
 */
export function useUpdateTopicStatus(options?: UseUpdateTopicStatusOptions) {
  const queryClient = useQueryClient();
  const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

  return useMutation({
    mutationFn: async (request: UpdateTopicStatusRequest) => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/topics/${request.topicId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ status: request.status }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: 'Failed to update topic status' }));
        throw new Error(error.message || 'Failed to update topic status');
      }

      return response.json();
    },

    onSuccess: (_data, variables) => {
      // Invalidate topic list queries to reflect status change
      queryClient.invalidateQueries({ queryKey: ['topics'] });

      // Invalidate specific topic query
      queryClient.invalidateQueries({ queryKey: ['topics', variables.topicId] });

      // Call user-provided success callback
      options?.onSuccess?.();
    },

    onError: (error: Error) => {
      // Call user-provided error callback
      options?.onError?.(error);
    },
  });
}

/**
 * T046 [US2] - TanStack Query hook for response creation (Feature 009)
 *
 * Provides mutation for posting responses with:
 * - Optimistic updates (T048)
 * - Error handling and rollback
 * - Automatic query invalidation
 * - Loading states
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { responseService, type CreateResponseRequest } from '../services/responseService';
import type { ResponseDetail } from '../services/discussionService';

export interface UseCreateResponseOptions {
  onSuccess?: (data: ResponseDetail) => void;
  onError?: (error: Error) => void;
  enableOptimisticUpdate?: boolean;
}

/**
 * Hook for creating a response to a discussion
 *
 * @param options - Optional callbacks and configuration
 * @returns Mutation object with createResponse function and state
 *
 * @example
 * ```tsx
 * const { mutate: createResponse, isPending } = useCreateResponse({
 *   enableOptimisticUpdate: true,
 *   onSuccess: () => {
 *     toast.success('Response posted!');
 *   },
 * });
 *
 * // In form submit handler:
 * createResponse({
 *   discussionId: 'discussion-123',
 *   content: 'I agree with this point...',
 *   citations: [{ url: 'https://example.com/source' }],
 * });
 * ```
 */
export function useCreateResponse(options?: UseCreateResponseOptions) {
  const queryClient = useQueryClient();
  const { enableOptimisticUpdate = true } = options || {};

  return useMutation({
    mutationFn: (data: CreateResponseRequest) => responseService.createResponse(data),

    // T048: Optimistic update - immediately show the response before server confirms
    onMutate: enableOptimisticUpdate
      ? async (newResponse) => {
          const queryKey = ['responses', newResponse.discussionId];

          // Cancel outgoing refetches to prevent overwriting optimistic update
          await queryClient.cancelQueries({ queryKey });

          // Snapshot the previous value for rollback
          const previousResponses = queryClient.getQueryData<ResponseDetail[]>(queryKey);

          // Optimistically update to the new value
          if (previousResponses) {
            const optimisticResponse: ResponseDetail = {
              id: `temp-${Date.now()}`, // Temporary ID
              discussionId: newResponse.discussionId,
              content: newResponse.content,
              author: {
                id: 'current-user',
                displayName: 'You',
              },
              parentResponseId: newResponse.parentResponseId || null,
              citations: newResponse.citations?.map((c, i) => ({
                id: `temp-citation-${i}`,
                originalUrl: c.url,
                normalizedUrl: c.url,
                title: c.title || null,
                validationStatus: 'UNVERIFIED' as const,
                validatedAt: null,
                createdAt: new Date().toISOString(),
              })),
              version: 1,
              editCount: 0,
              editedAt: null,
              deletedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              replyCount: 0,
            };

            queryClient.setQueryData<ResponseDetail[]>(queryKey, [
              ...previousResponses,
              optimisticResponse,
            ]);
          }

          // Return context with previous value for rollback
          return { previousResponses, queryKey };
        }
      : undefined,

    // Rollback on error
    onError: enableOptimisticUpdate
      ? (error: Error, _newResponse, context) => {
          if (context?.previousResponses) {
            queryClient.setQueryData(context.queryKey, context.previousResponses);
          }
          options?.onError?.(error);
        }
      : (error: Error) => {
          options?.onError?.(error);
        },

    onSuccess: (data, variables) => {
      // Invalidate and refetch discussion responses
      queryClient.invalidateQueries({ queryKey: ['responses', variables.discussionId] });

      // Invalidate discussion metadata (responseCount, lastActivityAt)
      queryClient.invalidateQueries({ queryKey: ['discussions', variables.discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });

      options?.onSuccess?.(data);
    },

    // Always refetch after error or success when using optimistic updates
    onSettled: enableOptimisticUpdate
      ? (_data, _error, variables) => {
          queryClient.invalidateQueries({ queryKey: ['responses', variables.discussionId] });
        }
      : undefined,
  });
}

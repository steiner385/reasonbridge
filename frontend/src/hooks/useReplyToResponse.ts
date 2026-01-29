/**
 * T062 [US3] - TanStack Query hook for reply posting (Feature 009)
 *
 * Provides mutation for posting threaded replies with:
 * - Optimistic updates
 * - Thread depth validation
 * - Automatic query invalidation
 * - Loading states
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { responseService, type ReplyToResponseRequest } from '../services/responseService';
import type { ResponseDetail } from '../services/discussionService';

export interface UseReplyToResponseOptions {
  /**
   * Callback when reply is successfully posted
   */
  onSuccess?: (data: ResponseDetail) => void;

  /**
   * Callback when reply posting fails
   */
  onError?: (error: Error) => void;

  /**
   * Enable optimistic UI updates
   * @default true
   */
  enableOptimisticUpdate?: boolean;

  /**
   * Discussion ID for query invalidation
   * Required for proper cache updates
   */
  discussionId: string;
}

/**
 * Hook for replying to a specific response
 *
 * Features:
 * - Posts reply to dedicated /responses/:id/replies endpoint
 * - Automatically inherits discussionId from parent
 * - Enforces thread depth limits (max 10 levels, UI flattens after 5)
 * - Optimistic updates for instant UI feedback
 * - Invalidates response and discussion queries
 *
 * @param parentResponseId - ID of the response being replied to
 * @param options - Configuration and callbacks
 * @returns Mutation object with replyToResponse function and state
 *
 * @example
 * ```tsx
 * const { mutate: replyToResponse, isPending } = useReplyToResponse(
 *   'response-123',
 *   {
 *     discussionId: 'discussion-456',
 *     enableOptimisticUpdate: true,
 *     onSuccess: () => {
 *       toast.success('Reply posted!');
 *       setShowReplyForm(false);
 *     },
 *     onError: (error) => {
 *       if (error.message.includes('depth limit')) {
 *         toast.error('Thread is too deep. Reply to a higher-level response.');
 *       }
 *     },
 *   }
 * );
 *
 * // In form submit handler:
 * replyToResponse({
 *   content: 'I disagree because...',
 *   citations: [{ url: 'https://example.com/source', title: 'Research Paper' }],
 * });
 * ```
 */
export function useReplyToResponse(parentResponseId: string, options: UseReplyToResponseOptions) {
  const queryClient = useQueryClient();
  const { discussionId, enableOptimisticUpdate = true } = options;

  return useMutation({
    mutationFn: (data: ReplyToResponseRequest) =>
      responseService.replyToResponse(parentResponseId, data),

    // Optimistic update - immediately show the reply before server confirms
    onMutate: enableOptimisticUpdate
      ? async (newReply) => {
          const queryKey = ['responses', discussionId];

          // Cancel outgoing refetches to prevent overwriting optimistic update
          await queryClient.cancelQueries({ queryKey });

          // Snapshot the previous value for rollback
          const previousResponses = queryClient.getQueryData<ResponseDetail[]>(queryKey);

          // Optimistically update to the new value
          if (previousResponses) {
            const optimisticReply: ResponseDetail = {
              id: `temp-reply-${Date.now()}`, // Temporary ID
              discussionId,
              content: newReply.content,
              author: {
                id: 'current-user',
                displayName: 'You',
              },
              parentResponseId, // This is the key difference from top-level responses
              citations: newReply.citations?.map((c, i) => ({
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
              optimisticReply,
            ]);
          }

          // Return context with previous value for rollback
          return { previousResponses, queryKey };
        }
      : undefined,

    // Rollback on error
    onError: enableOptimisticUpdate
      ? (error: Error, _newReply, context) => {
          if (context?.previousResponses) {
            queryClient.setQueryData(context.queryKey, context.previousResponses);
          }
          options.onError?.(error);
        }
      : (error: Error) => {
          options.onError?.(error);
        },

    onSuccess: (data) => {
      // Invalidate and refetch discussion responses
      queryClient.invalidateQueries({ queryKey: ['responses', discussionId] });

      // Invalidate parent response (to update reply count)
      queryClient.invalidateQueries({ queryKey: ['response', parentResponseId] });

      // Invalidate discussion metadata (responseCount, lastActivityAt)
      queryClient.invalidateQueries({ queryKey: ['discussions', discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });

      options.onSuccess?.(data);
    },

    // Always refetch after error or success when using optimistic updates
    onSettled: enableOptimisticUpdate
      ? () => {
          queryClient.invalidateQueries({ queryKey: ['responses', discussionId] });
        }
      : undefined,
  });
}

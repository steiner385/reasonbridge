/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useVotes - React Query hook for managing response votes
 *
 * Fetches and caches the vote summary for a single response with optimistic
 * updates and rollback. Backed by React Query so results are shared across
 * every ResponseItem for the same response and survive virtualizer
 * mount/unmount churn instead of refetching on every remount (issue #1363).
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { voteService, type VoteSummary, type VoteType } from '../services/voteService';

export interface UseVotesResult {
  voteSummary: VoteSummary | null;
  isLoading: boolean;
  error: string | null;
  isPending: boolean;
  upvote: () => Promise<void>;
  downvote: () => Promise<void>;
  removeVote: () => Promise<void>;
}

/**
 * Compute the optimistic vote summary when toggling a vote of `voteType`.
 * Mirrors the previous behaviour: casting the same vote again clears it.
 */
function applyVote(prev: VoteSummary, voteType: VoteType): VoteSummary {
  const currentUserVote = prev.userVote;

  let upvotes = prev.upvotes;
  let downvotes = prev.downvotes;
  let userVote: VoteType | null = voteType;

  if (currentUserVote === 'UPVOTE') {
    upvotes--;
  } else if (currentUserVote === 'DOWNVOTE') {
    downvotes--;
  }

  if (currentUserVote === voteType) {
    userVote = null;
  } else if (voteType === 'UPVOTE') {
    upvotes++;
  } else {
    downvotes++;
  }

  return { upvotes, downvotes, score: upvotes - downvotes, userVote };
}

/**
 * Compute the optimistic vote summary when removing the current user's vote.
 */
function applyRemove(prev: VoteSummary): VoteSummary {
  if (!prev.userVote) return prev;

  let upvotes = prev.upvotes;
  let downvotes = prev.downvotes;

  if (prev.userVote === 'UPVOTE') {
    upvotes--;
  } else {
    downvotes--;
  }

  return { upvotes, downvotes, score: upvotes - downvotes, userVote: null };
}

export function useVotes(responseId: string): UseVotesResult {
  const queryClient = useQueryClient();
  const queryKey = ['votes', responseId];

  const query = useQuery<VoteSummary, Error>({
    queryKey,
    queryFn: () => voteService.getVoteSummary(responseId),
    enabled: !!responseId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes - keep across virtualizer remounts
  });

  type MutationContext = { previous: VoteSummary | undefined };

  const voteMutation = useMutation<unknown, Error, VoteType, MutationContext>({
    mutationFn: (voteType: VoteType) => voteService.vote(responseId, voteType),
    onMutate: async (voteType) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<VoteSummary>(queryKey);
      queryClient.setQueryData<VoteSummary>(queryKey, (prev) =>
        prev ? applyVote(prev, voteType) : prev,
      );
      return { previous };
    },
    onError: (_error, _voteType, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeMutation = useMutation<unknown, Error, void, MutationContext>({
    mutationFn: () => voteService.removeVote(responseId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<VoteSummary>(queryKey);
      queryClient.setQueryData<VoteSummary>(queryKey, (prev) => (prev ? applyRemove(prev) : prev));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const isPending = voteMutation.isPending || removeMutation.isPending;

  const castVote = useCallback(
    async (voteType: VoteType) => {
      if (isPending || !query.data) return;
      await voteMutation.mutateAsync(voteType);
    },
    [isPending, query.data, voteMutation],
  );

  const upvote = useCallback(() => castVote('UPVOTE'), [castVote]);
  const downvote = useCallback(() => castVote('DOWNVOTE'), [castVote]);

  const removeVote = useCallback(async () => {
    if (isPending || !query.data?.userVote) return;
    await removeMutation.mutateAsync();
  }, [isPending, query.data?.userVote, removeMutation]);

  const error =
    query.error?.message ?? voteMutation.error?.message ?? removeMutation.error?.message ?? null;

  return {
    voteSummary: query.data ?? null,
    isLoading: query.isLoading,
    error,
    isPending,
    upvote,
    downvote,
    removeVote,
  };
}

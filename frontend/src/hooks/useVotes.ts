/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
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

export function useVotes(responseId: string): UseVotesResult {
  const [voteSummary, setVoteSummary] = useState<VoteSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchVotes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const summary = await voteService.getVoteSummary(responseId);
        if (!cancelled) {
          setVoteSummary(summary);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch votes');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchVotes();

    return () => {
      cancelled = true;
    };
  }, [responseId]);

  const castVote = useCallback(
    async (voteType: VoteType) => {
      if (isPending || !voteSummary) return;

      const previousSummary = voteSummary;
      const currentUserVote = voteSummary.userVote;

      setIsPending(true);
      setVoteSummary((prev) => {
        if (!prev) return prev;

        let newUpvotes = prev.upvotes;
        let newDownvotes = prev.downvotes;
        let newUserVote: VoteType | null = voteType;

        if (currentUserVote === 'UPVOTE') {
          newUpvotes--;
        } else if (currentUserVote === 'DOWNVOTE') {
          newDownvotes--;
        }

        if (currentUserVote === voteType) {
          newUserVote = null;
        } else if (voteType === 'UPVOTE') {
          newUpvotes++;
        } else {
          newDownvotes++;
        }

        return {
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          score: newUpvotes - newDownvotes,
          userVote: newUserVote,
        };
      });

      try {
        await voteService.vote(responseId, voteType);
      } catch (err) {
        setVoteSummary(previousSummary);
        setError(err instanceof Error ? err.message : 'Failed to vote');
      } finally {
        setIsPending(false);
      }
    },
    [responseId, voteSummary, isPending],
  );

  const upvote = useCallback(() => castVote('UPVOTE'), [castVote]);
  const downvote = useCallback(() => castVote('DOWNVOTE'), [castVote]);

  const removeVote = useCallback(async () => {
    if (isPending || !voteSummary) return;

    const previousSummary = voteSummary;

    setIsPending(true);
    setVoteSummary((prev) => {
      if (!prev || !prev.userVote) return prev;

      let newUpvotes = prev.upvotes;
      let newDownvotes = prev.downvotes;

      if (prev.userVote === 'UPVOTE') {
        newUpvotes--;
      } else {
        newDownvotes--;
      }

      return {
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        score: newUpvotes - newDownvotes,
        userVote: null,
      };
    });

    try {
      await voteService.removeVote(responseId);
    } catch (err) {
      setVoteSummary(previousSummary);
      setError(err instanceof Error ? err.message : 'Failed to remove vote');
    } finally {
      setIsPending(false);
    }
  }, [responseId, voteSummary, isPending]);

  return {
    voteSummary,
    isLoading,
    error,
    isPending,
    upvote,
    downvote,
    removeVote,
  };
}

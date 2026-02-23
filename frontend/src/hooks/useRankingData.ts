/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Ranking Data Hooks
 *
 * Custom React hooks for fetching and managing user ranking data.
 * Used by the RankingDashboard page and related components.
 */

import { useState, useCallback, useEffect } from 'react';
import { rankingService } from '../services/rankingService';
import type { UserRank, TopicExpertise, Credential } from '../types/ranking';
import type { Appeal } from '../types/moderation';

/**
 * Hook options for ranking data hooks
 */
export interface UseRankingDataOptions {
  /** Whether to fetch data on mount (default: true) */
  fetchOnMount?: boolean;
}

/**
 * Return type for useMyRanking hook
 */
export interface UseMyRankingReturn {
  data: UserRank | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the current user's ranking breakdown
 */
export function useMyRanking(options: UseRankingDataOptions = {}): UseMyRankingReturn {
  const { fetchOnMount = true } = options;

  const [data, setData] = useState<UserRank | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await rankingService.getMyRankingBreakdown();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ranking data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      refetch();
    }
  }, [fetchOnMount, refetch]);

  return { data, isLoading, error, refetch };
}

/**
 * Return type for useMyExpertise hook
 */
export interface UseMyExpertiseReturn {
  data: TopicExpertise[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the current user's domain expertise
 */
export function useMyExpertise(options: UseRankingDataOptions = {}): UseMyExpertiseReturn {
  const { fetchOnMount = true } = options;

  const [data, setData] = useState<TopicExpertise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await rankingService.getMyExpertise();
      setData(result.expertise);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expertise data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      refetch();
    }
  }, [fetchOnMount, refetch]);

  return { data, isLoading, error, refetch };
}

/**
 * Return type for useMyCredentials hook
 */
export interface UseMyCredentialsReturn {
  data: Credential[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the current user's credentials
 */
export function useMyCredentials(options: UseRankingDataOptions = {}): UseMyCredentialsReturn {
  const { fetchOnMount = true } = options;

  const [data, setData] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await rankingService.getMyCredentials();
      setData(result.credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      refetch();
    }
  }, [fetchOnMount, refetch]);

  return { data, isLoading, error, refetch };
}

/**
 * Return type for useMyAppeals hook
 */
export interface UseMyAppealsReturn {
  data: Appeal[];
  isLoading: boolean;
  error: string | null;
  canSubmit: boolean;
  cooldownEndsAt: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the current user's appeals and submission eligibility
 */
export function useMyAppeals(options: UseRankingDataOptions = {}): UseMyAppealsReturn {
  const { fetchOnMount = true } = options;

  const [data, setData] = useState<Appeal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState(true);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [appealsResult, canSubmitResult] = await Promise.all([
        rankingService.getMyAppeals(),
        rankingService.canSubmitAppeal(),
      ]);

      setData(appealsResult.appeals);
      setCanSubmit(canSubmitResult.canSubmit);
      setCooldownEndsAt(canSubmitResult.cooldownEndsAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appeals data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      refetch();
    }
  }, [fetchOnMount, refetch]);

  return { data, isLoading, error, canSubmit, cooldownEndsAt, refetch };
}

/**
 * Return type for useLeaderboardPreview hook
 */
export interface UseLeaderboardPreviewReturn {
  data: UserRank[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch leaderboard preview (top N users)
 */
export function useLeaderboardPreview(
  limit: number = 5,
  options: UseRankingDataOptions = {},
): UseLeaderboardPreviewReturn {
  const { fetchOnMount = true } = options;

  const [data, setData] = useState<UserRank[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await rankingService.getLeaderboardPreview(limit);
      setData(result.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (fetchOnMount) {
      refetch();
    }
  }, [fetchOnMount, refetch]);

  return { data, isLoading, error, refetch };
}

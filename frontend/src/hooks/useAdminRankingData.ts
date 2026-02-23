/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Admin Ranking Data Hooks
 *
 * Custom React hooks for fetching and managing admin ranking analytics data.
 * Used by the Admin RankingAnalytics dashboard page.
 */

import { useState, useCallback, useEffect } from 'react';
import { adminRankingService } from '../services/adminRankingService';
import type { RankingAnalytics } from '../types/ranking';

/**
 * Hook options for admin ranking data hooks
 */
export interface UseAdminRankingDataOptions {
  /** Whether to fetch data on mount (default: true) */
  fetchOnMount?: boolean;
}

/**
 * Return type for useRankingAnalytics hook
 */
export interface UseRankingAnalyticsReturn {
  data: RankingAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch ranking analytics for admin dashboard
 *
 * @param options - Hook configuration options
 * @returns Object containing analytics data, loading state, error, and refetch function
 */
export function useRankingAnalytics(
  options: UseAdminRankingDataOptions = {},
): UseRankingAnalyticsReturn {
  const { fetchOnMount = true } = options;

  const [data, setData] = useState<RankingAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await adminRankingService.getRankingAnalytics();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
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

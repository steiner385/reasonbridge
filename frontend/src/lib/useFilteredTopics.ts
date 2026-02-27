/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import type { GetTopicsParams } from '../types/topic';
import { useAuthContext } from '../contexts/AuthContext';
import { useTopics } from './useTopics';

/**
 * Hook that wraps useTopics with automatic mature content filtering for minors
 *
 * @remarks
 * This hook automatically applies the `excludeMatureContent` filter when:
 * - The user is a minor (isMinor === true)
 * - The user's parental consent is not verified (parentConsentStatus !== 'VERIFIED')
 *
 * For adult users or minors with verified consent, no filtering is applied
 * unless explicitly requested via the params.
 *
 * @param params - Topic query parameters
 * @returns Same return type as useTopics
 *
 * @example
 * ```tsx
 * function TopicsPage() {
 *   const { data, isLoading } = useFilteredTopics({
 *     page: 1,
 *     limit: 10,
 *   });
 *   // Mature content is automatically filtered for unverified minors
 * }
 * ```
 */
export function useFilteredTopics(params?: GetTopicsParams) {
  const { user } = useAuthContext();

  // Determine if we need to filter mature content
  const shouldFilterMatureContent = useMemo(() => {
    if (!user) return false; // Not logged in, no filtering needed
    if (!user.isMinor) return false; // Not a minor, no filtering needed
    if (user.parentConsentStatus === 'VERIFIED') return false; // Verified consent, no filtering
    return true; // Minor without verified consent, filter mature content
  }, [user]);

  // Apply mature content filter if needed
  const effectiveParams = useMemo(() => {
    if (shouldFilterMatureContent) {
      return { ...params, excludeMatureContent: true };
    }
    return params;
  }, [params, shouldFilterMatureContent]);

  return useTopics(effectiveParams);
}

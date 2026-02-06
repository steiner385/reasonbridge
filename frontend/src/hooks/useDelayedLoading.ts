/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useDelayedLoading - Hook to prevent skeleton flash on fast loads
 * @module hooks/useDelayedLoading
 *
 * Problem: When content loads quickly (<100ms), showing a skeleton loader
 * creates a jarring flash. Users see: content → skeleton → content.
 *
 * Solution: Only show skeleton after a short delay (default 100ms).
 * If content loads before the delay, no skeleton is shown.
 *
 * @example
 * // In a page component
 * const { data, isLoading } = useQuery(...);
 * const showSkeleton = useDelayedLoading(isLoading, 100);
 *
 * if (showSkeleton) {
 *   return <PageSkeleton />;
 * }
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Hook that delays showing loading state to prevent flash on fast loads
 *
 * @param isLoading - Current loading state from data fetching
 * @param delayMs - Milliseconds to wait before showing loading state (default: 100)
 * @returns boolean - Whether to show loading UI (skeleton)
 */
export function useDelayedLoading(isLoading: boolean, delayMs: number = 100): boolean {
  const [showLoading, setShowLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start timer when loading begins
      timerRef.current = setTimeout(() => {
        setShowLoading(true);
      }, delayMs);
    } else {
      // Clear timer and hide loading when data arrives
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShowLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, delayMs]);

  return showLoading;
}

export default useDelayedLoading;

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * usePullToRefresh - Hook for pull-to-refresh gesture on mobile
 *
 * Enables pull-down gesture at the top of scrollable content
 * to trigger a refresh action.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useIsMobileViewport } from './useMediaQuery';

/**
 * Pull-to-refresh state
 */
export interface PullToRefreshState {
  /** Whether currently pulling */
  isPulling: boolean;
  /** Pull distance in pixels */
  pullDistance: number;
  /** Pull progress (0-1) */
  progress: number;
  /** Whether refresh has been triggered */
  isRefreshing: boolean;
  /** Whether pull threshold has been reached */
  canRelease: boolean;
}

/**
 * Options for usePullToRefresh hook
 */
export interface UsePullToRefreshOptions {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Pull distance required to trigger refresh (default: 80px) */
  threshold?: number;
  /** Maximum pull distance (default: 120px) */
  maxPullDistance?: number;
  /** Whether pull-to-refresh is enabled (default: auto-detects mobile) */
  enabled?: boolean;
}

/**
 * Result of usePullToRefresh hook
 */
export interface UsePullToRefreshResult {
  /** Current pull state */
  state: PullToRefreshState;
  /** Ref to attach to scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Touch event handlers */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * Hook for implementing pull-to-refresh gesture
 *
 * @param options - Configuration options
 * @returns State and handlers for pull-to-refresh
 *
 * @example
 * ```tsx
 * const { state, containerRef, handlers } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await refetchTopics();
 *   },
 * });
 *
 * <div ref={containerRef} {...handlers}>
 *   <PullToRefreshIndicator state={state} />
 *   <TopicList />
 * </div>
 * ```
 */
export function usePullToRefresh(options: UsePullToRefreshOptions): UsePullToRefreshResult {
  const { onRefresh, threshold = 80, maxPullDistance = 120, enabled } = options;

  const isMobileViewport = useIsMobileViewport();
  const isEnabled = enabled ?? isMobileViewport;

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    progress: 0,
    isRefreshing: false,
    canRelease: false,
  });

  // Handle touch start
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isEnabled || state.isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      // Only enable pull-to-refresh when scrolled to top
      if (container.scrollTop > 0) return;

      const touch = e.touches[0];
      if (touch) {
        startY.current = touch.clientY;
        currentY.current = touch.clientY;
      }
    },
    [isEnabled, state.isRefreshing],
  );

  // Handle touch move
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isEnabled || state.isRefreshing || startY.current === 0) return;

      const touch = e.touches[0];
      if (!touch) return;

      currentY.current = touch.clientY;
      const deltaY = currentY.current - startY.current;

      // Only handle downward pull
      if (deltaY <= 0) {
        setState((prev) => ({
          ...prev,
          isPulling: false,
          pullDistance: 0,
          progress: 0,
          canRelease: false,
        }));
        return;
      }

      // Apply resistance to pull (gets harder as you pull further)
      const resistance = 0.5;
      const pullDistance = Math.min(deltaY * resistance, maxPullDistance);
      const progress = Math.min(pullDistance / threshold, 1);
      const canRelease = pullDistance >= threshold;

      setState({
        isPulling: true,
        pullDistance,
        progress,
        isRefreshing: false,
        canRelease,
      });

      // Prevent default scroll behavior when pulling
      if (pullDistance > 0) {
        e.preventDefault();
      }
    },
    [isEnabled, state.isRefreshing, threshold, maxPullDistance],
  );

  // Handle touch end
  const onTouchEnd = useCallback(async () => {
    if (!isEnabled || !state.isPulling) return;

    startY.current = 0;
    currentY.current = 0;

    if (state.canRelease) {
      // Trigger refresh
      setState((prev) => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
        pullDistance: threshold, // Keep indicator visible during refresh
      }));

      try {
        await onRefresh();
      } finally {
        setState({
          isPulling: false,
          pullDistance: 0,
          progress: 0,
          isRefreshing: false,
          canRelease: false,
        });
      }
    } else {
      // Cancel pull
      setState({
        isPulling: false,
        pullDistance: 0,
        progress: 0,
        isRefreshing: false,
        canRelease: false,
      });
    }
  }, [isEnabled, state.isPulling, state.canRelease, threshold, onRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      startY.current = 0;
      currentY.current = 0;
    };
  }, []);

  return {
    state,
    containerRef,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}

export default usePullToRefresh;

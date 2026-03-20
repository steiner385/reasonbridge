/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { usePullToRefresh, type PullToRefreshState } from '../../hooks/usePullToRefresh';

export interface PullToRefreshContainerProps {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Child content */
  children: React.ReactNode;
  /** Additional CSS classes for container */
  className?: string;
  /** Whether pull-to-refresh is enabled */
  enabled?: boolean;
}

/**
 * Indicator component for pull-to-refresh state
 */
const PullToRefreshIndicator: React.FC<{ state: PullToRefreshState }> = ({ state }) => {
  const { isPulling, isRefreshing, progress, canRelease, pullDistance } = state;

  if (!isPulling && !isRefreshing && pullDistance === 0) {
    return null;
  }

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900 z-10"
      style={{
        height: pullDistance,
        transition: isPulling ? 'none' : 'height 200ms ease-out',
      }}
    >
      <div
        className="flex flex-col items-center justify-center gap-1"
        style={{
          opacity: Math.min(progress * 1.5, 1),
          transform: `scale(${0.5 + progress * 0.5})`,
          transition: isPulling ? 'none' : 'all 200ms ease-out',
        }}
      >
        {isRefreshing ? (
          <>
            <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Refreshing...</span>
          </>
        ) : canRelease ? (
          <>
            <RefreshCw
              className="w-6 h-6 text-primary-500"
              style={{ transform: `rotate(${progress * 180}deg)` }}
            />
            <span className="text-xs text-primary-500 font-medium">Release to refresh</span>
          </>
        ) : (
          <>
            <ArrowDown
              className="w-6 h-6 text-gray-400 dark:text-gray-500"
              style={{ transform: `rotate(${progress * 180}deg)` }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">Pull to refresh</span>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * PullToRefreshContainer Component
 *
 * Wraps content with pull-to-refresh functionality on mobile devices.
 * Shows visual indicator during pull and triggers refresh on release.
 *
 * @remarks
 * - Only active on mobile viewports by default
 * - Shows progress indicator during pull
 * - Animates smoothly on release
 * - Shows spinner during refresh
 *
 * @example
 * ```tsx
 * <PullToRefreshContainer onRefresh={async () => await refetchTopics()}>
 *   <TopicList topics={topics} />
 * </PullToRefreshContainer>
 * ```
 */
const PullToRefreshContainer: React.FC<PullToRefreshContainerProps> = ({
  onRefresh,
  children,
  className = '',
  enabled,
}) => {
  const { state, containerRef, handlers } = usePullToRefresh({
    onRefresh,
    enabled,
  });

  return (
    <div ref={containerRef} className={`relative overflow-auto ${className}`} {...handlers}>
      <PullToRefreshIndicator state={state} />
      <div
        style={{
          transform: `translateY(${state.pullDistance}px)`,
          transition: state.isPulling ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefreshContainer;

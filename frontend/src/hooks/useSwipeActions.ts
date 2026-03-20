/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useSwipeActions - Hook for handling swipe gestures on responses
 *
 * Provides swipe action handlers for mobile devices:
 * - Swipe right → Reply to response
 * - Swipe left → Toggle bookmark
 *
 * @remarks
 * Only enables swipe gestures on mobile viewports to avoid conflicts
 * with desktop interactions like text selection.
 */

import { useCallback, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import type { SwipeEventData } from 'react-swipeable';
import { useToast } from '../contexts/ToastContext';
import { useIsMobileViewport } from './useMediaQuery';
import { useBookmarkStatus } from './useBookmarks';
import { useRequireAuth } from './useRequireAuth';

/**
 * Swipe direction for visual feedback
 */
export type SwipeDirection = 'left' | 'right' | null;

/**
 * Swipe action state
 */
export interface SwipeState {
  /** Current swipe direction */
  direction: SwipeDirection;
  /** Swipe progress (0-1) for visual feedback */
  progress: number;
  /** Whether a swipe action is active */
  isActive: boolean;
}

/**
 * Options for useSwipeActions hook
 */
export interface UseSwipeActionsOptions {
  /** Response ID for bookmark actions */
  responseId: string;
  /** Callback when swipe-right triggers reply */
  onReply?: () => void;
  /** Minimum swipe distance to trigger action (default: 80px) */
  threshold?: number;
  /** Whether swipe gestures are enabled (default: auto-detects mobile) */
  enabled?: boolean;
}

/**
 * Result of useSwipeActions hook
 */
export interface UseSwipeActionsResult {
  /** Swipeable handlers to spread on container element */
  swipeHandlers: ReturnType<typeof useSwipeable>;
  /** Current swipe state for visual feedback */
  swipeState: SwipeState;
  /** Reset swipe state (call after action completes) */
  resetSwipe: () => void;
}

/**
 * Hook for handling swipe gestures on response items
 *
 * @param options - Configuration options
 * @returns Swipe handlers and state for visual feedback
 *
 * @example
 * ```tsx
 * const { swipeHandlers, swipeState } = useSwipeActions({
 *   responseId: response.id,
 *   onReply: () => setShowReplyForm(true),
 * });
 *
 * <div {...swipeHandlers} className={getSwipeClasses(swipeState)}>
 *   <ResponseContent />
 * </div>
 * ```
 */
export function useSwipeActions(options: UseSwipeActionsOptions): UseSwipeActionsResult {
  const { responseId, onReply, threshold = 80, enabled } = options;

  const isMobileViewport = useIsMobileViewport();
  const { requireAuth } = useRequireAuth();
  const toast = useToast();
  const {
    isBookmarked,
    toggleBookmark,
    isPending: isBookmarkPending,
  } = useBookmarkStatus(responseId);

  // Swipe state for visual feedback
  const [swipeState, setSwipeState] = useState<SwipeState>({
    direction: null,
    progress: 0,
    isActive: false,
  });

  // Reset swipe state
  const resetSwipe = useCallback(() => {
    setSwipeState({ direction: null, progress: 0, isActive: false });
  }, []);

  // Handle swipe right → Reply
  const handleSwipeRight = useCallback(() => {
    if (onReply) {
      requireAuth(() => {
        onReply();
        toast.info('Replying to response');
      });
    }
    resetSwipe();
  }, [onReply, requireAuth, toast, resetSwipe]);

  // Handle swipe left → Toggle bookmark
  const handleSwipeLeft = useCallback(() => {
    if (isBookmarkPending) return;

    requireAuth(() => {
      toggleBookmark();
      toast.success(isBookmarked ? 'Bookmark removed' : 'Bookmarked!');
    });
    resetSwipe();
  }, [isBookmarked, isBookmarkPending, toggleBookmark, requireAuth, toast, resetSwipe]);

  // Track swipe progress for visual feedback
  const handleSwiping = useCallback(
    (eventData: SwipeEventData) => {
      const { deltaX, dir } = eventData;
      const absX = Math.abs(deltaX);
      const progress = Math.min(absX / threshold, 1);

      if (dir === 'Left' || dir === 'Right') {
        setSwipeState({
          direction: dir.toLowerCase() as SwipeDirection,
          progress,
          isActive: true,
        });
      }
    },
    [threshold],
  );

  // Determine if swipe is enabled
  const isSwipeEnabled = enabled ?? isMobileViewport;

  // Configure swipeable
  const swipeHandlers = useSwipeable({
    onSwipedRight: isSwipeEnabled ? handleSwipeRight : undefined,
    onSwipedLeft: isSwipeEnabled ? handleSwipeLeft : undefined,
    onSwiping: isSwipeEnabled ? handleSwiping : undefined,
    onSwiped: resetSwipe,
    trackMouse: false, // Touch only - don't interfere with mouse
    trackTouch: true,
    delta: threshold, // Minimum distance to trigger
    preventScrollOnSwipe: true, // Prevent vertical scroll during horizontal swipe
  });

  return {
    swipeHandlers: isSwipeEnabled ? swipeHandlers : ({} as ReturnType<typeof useSwipeable>),
    swipeState,
    resetSwipe,
  };
}

export default useSwipeActions;

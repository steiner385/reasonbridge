/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MessageSquare, Bookmark } from 'lucide-react';
import { useSwipeActions, type SwipeState } from '../../hooks/useSwipeActions';

export interface SwipeableResponseWrapperProps {
  /** Response ID for actions */
  responseId: string;
  /** Callback when swipe-right triggers reply */
  onReply?: () => void;
  /** Child content to wrap */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get transform style based on swipe state
 */
function getSwipeTransform(swipeState: SwipeState): React.CSSProperties {
  if (!swipeState.isActive || swipeState.progress === 0) {
    return {};
  }

  // Maximum transform distance (in pixels)
  const maxTransform = 60;
  const transform = swipeState.progress * maxTransform;

  return {
    transform: `translateX(${swipeState.direction === 'right' ? transform : -transform}px)`,
    transition: swipeState.progress < 1 ? 'none' : 'transform 200ms ease-out',
  };
}

/**
 * SwipeableResponseWrapper Component
 *
 * Wraps response content with swipe gesture handling and visual feedback.
 * Shows action indicators (reply icon on right, bookmark on left) during swipe.
 *
 * @remarks
 * - Only active on mobile viewports
 * - Swipe right → Reply action
 * - Swipe left → Toggle bookmark
 * - Visual feedback shows progress during swipe
 *
 * @example
 * ```tsx
 * <SwipeableResponseWrapper
 *   responseId={response.id}
 *   onReply={() => setShowReplyForm(true)}
 * >
 *   <ResponseItem response={response} />
 * </SwipeableResponseWrapper>
 * ```
 */
const SwipeableResponseWrapper: React.FC<SwipeableResponseWrapperProps> = ({
  responseId,
  onReply,
  children,
  className = '',
}) => {
  const { swipeHandlers, swipeState } = useSwipeActions({
    responseId,
    onReply,
  });

  const isSwipingRight = swipeState.direction === 'right' && swipeState.isActive;
  const isSwipingLeft = swipeState.direction === 'left' && swipeState.isActive;

  return (
    <div className={`relative overflow-hidden ${className}`} {...swipeHandlers}>
      {/* Left action indicator (appears when swiping right → Reply) */}
      <div
        className={`
          absolute left-0 top-0 bottom-0 flex items-center justify-center
          w-16 bg-primary-500 dark:bg-primary-600
          transition-opacity duration-150
          ${isSwipingRight ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ opacity: isSwipingRight ? swipeState.progress : 0 }}
        aria-hidden="true"
      >
        <MessageSquare
          className="w-6 h-6 text-white"
          style={{
            transform: `scale(${0.5 + swipeState.progress * 0.5})`,
            transition: 'transform 100ms ease-out',
          }}
        />
      </div>

      {/* Right action indicator (appears when swiping left → Bookmark) */}
      <div
        className={`
          absolute right-0 top-0 bottom-0 flex items-center justify-center
          w-16 bg-amber-500 dark:bg-amber-600
          transition-opacity duration-150
          ${isSwipingLeft ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ opacity: isSwipingLeft ? swipeState.progress : 0 }}
        aria-hidden="true"
      >
        <Bookmark
          className="w-6 h-6 text-white"
          style={{
            transform: `scale(${0.5 + swipeState.progress * 0.5})`,
            transition: 'transform 100ms ease-out',
          }}
        />
      </div>

      {/* Main content with transform during swipe */}
      <div className="relative bg-white dark:bg-gray-800" style={getSwipeTransform(swipeState)}>
        {children}
      </div>
    </div>
  );
};

export default SwipeableResponseWrapper;

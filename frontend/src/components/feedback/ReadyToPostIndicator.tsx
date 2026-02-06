/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

export interface ReadyToPostIndicatorProps {
  /** Whether content is ready to post (no critical issues). Null means AI is analyzing - pending state. */
  readyToPost: boolean | null;
  /** Whether the indicator is in a loading state */
  isLoading?: boolean;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * ReadyToPostIndicator - Visual indicator showing content readiness
 *
 * Shows a badge with smooth animation when transitioning between states:
 * - Ready: Green checkmark with "Ready to post"
 * - Review suggested: Yellow warning with "Review suggested"
 *
 * Includes a subtle pulse animation when transitioning to the ready state
 * to draw user attention to the positive change.
 */
export const ReadyToPostIndicator: React.FC<ReadyToPostIndicatorProps> = ({
  readyToPost,
  isLoading = false,
  className = '',
}) => {
  // Track state transitions for animation
  const [animationTriggerTime, setAnimationTriggerTime] = useState<number | null>(null);
  const prevReadyToPostRef = useRef(readyToPost);

  useEffect(() => {
    const wasReady = prevReadyToPostRef.current;
    prevReadyToPostRef.current = readyToPost;

    // Detect transition from not-ready to ready
    if (readyToPost && !wasReady) {
      // Schedule animation trigger asynchronously
      const timer = setTimeout(() => {
        setAnimationTriggerTime(Date.now());
      }, 0);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [readyToPost]);

  // Clear animation after duration
  useEffect(() => {
    if (animationTriggerTime === null) return undefined;

    const timer = setTimeout(() => {
      setAnimationTriggerTime(null);
    }, 600); // Match animation duration

    return () => clearTimeout(timer);
  }, [animationTriggerTime]);

  const justBecameReady = animationTriggerTime !== null;

  if (isLoading) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ${className}`}
        role="status"
        aria-live="polite"
      >
        <span className="animate-pulse">Analyzing...</span>
      </span>
    );
  }

  // Pending state - AI is analyzing, don't show green yet
  if (readyToPost === null) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${className}`}
        role="status"
        aria-live="polite"
      >
        <svg
          className="mr-1 h-3.5 w-3.5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        AI analyzing...
      </span>
    );
  }

  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-300';
  const stateClasses = readyToPost
    ? 'bg-green-100 text-green-800'
    : 'bg-yellow-100 text-yellow-800';
  const animationClasses = justBecameReady ? 'animate-pulse scale-105' : '';

  return (
    <span
      className={`${baseClasses} ${stateClasses} ${animationClasses} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={readyToPost ? 'Content is ready to post' : 'Review suggested before posting'}
    >
      {readyToPost ? (
        <>
          <svg
            className="mr-1 h-3.5 w-3.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Ready to post
        </>
      ) : (
        <>
          <svg
            className="mr-1 h-3.5 w-3.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Review suggested
        </>
      )}
    </span>
  );
};

export default ReadyToPostIndicator;

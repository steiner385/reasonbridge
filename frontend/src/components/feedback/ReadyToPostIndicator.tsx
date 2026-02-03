import React, { useEffect, useState } from 'react';

export interface ReadyToPostIndicatorProps {
  /** Whether content is ready to post (no critical issues) */
  readyToPost: boolean;
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
  const [justBecameReady, setJustBecameReady] = useState(false);
  const [prevReadyToPost, setPrevReadyToPost] = useState(readyToPost);

  useEffect(() => {
    // Detect transition from not-ready to ready
    if (readyToPost && !prevReadyToPost) {
      setJustBecameReady(true);
      // Clear the animation state after animation completes
      const timer = setTimeout(() => {
        setJustBecameReady(false);
      }, 600); // Match animation duration
      setPrevReadyToPost(readyToPost);
      return () => clearTimeout(timer);
    }
    setPrevReadyToPost(readyToPost);
    return undefined;
  }, [readyToPost, prevReadyToPost]);

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
      {readyToPost ? '✓ Ready to post' : '⚠ Review suggested'}
    </span>
  );
};

export default ReadyToPostIndicator;

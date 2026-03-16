/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { forwardRef, useEffect, useCallback, useState } from 'react';
import { useFollow } from '../../hooks/useFollow';
import { useAuth } from '../../hooks/useAuth';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * FollowButton component props
 */
export interface FollowButtonProps {
  /** ID of the user to follow/unfollow */
  userId: string;
  /** Display name of the user (for confirmation dialog) */
  userName?: string;
  /** Initial following state (if known, to avoid initial API call) */
  initialFollowing?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show full text or compact icon-only */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when follow state changes */
  onFollowChange?: (isFollowing: boolean) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether to show confirmation dialog before unfollowing */
  confirmUnfollow?: boolean;
}

/**
 * Loading spinner icon
 */
const LoadingSpinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * Follow icon (user with plus)
 */
const FollowIcon = ({ compact }: { compact: boolean }) => (
  <svg
    className={compact ? 'h-4 w-4' : 'h-4 w-4 mr-1.5'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
    />
  </svg>
);

/**
 * Following icon (checkmark)
 */
const FollowingIcon = ({ compact }: { compact: boolean }) => (
  <svg
    className={compact ? 'h-4 w-4' : 'h-4 w-4 mr-1.5'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

/**
 * FollowButton Component
 *
 * A button that allows users to follow/unfollow other users.
 * Handles API calls, loading states, and displays appropriate visual feedback.
 *
 * Features:
 * - Toggle between Follow/Following states
 * - Loading spinner during API calls
 * - Dark mode support
 * - Multiple size variants
 * - Compact mode for icon-only display
 * - Prevents following yourself
 *
 * @example
 * ```tsx
 * <FollowButton
 *   userId="user-123"
 *   onFollowChange={(isFollowing) => setFollowState(isFollowing)}
 * />
 * ```
 */
export const FollowButton = forwardRef<HTMLButtonElement, FollowButtonProps>(
  (
    {
      userId,
      userName,
      initialFollowing = false,
      size = 'md',
      compact = false,
      className = '',
      onFollowChange,
      onError,
      disabled = false,
      confirmUnfollow = true,
    },
    ref,
  ) => {
    const { user: currentUser } = useAuth();
    const { requireAuth } = useRequireAuth();
    const { isFollowing, isLoading, error, toggleFollow, checkFollowStatus, unfollow } = useFollow(
      userId,
      initialFollowing,
    );

    // Unfollow confirmation modal state
    const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);

    // Check follow status on mount if no initial state provided
    useEffect(() => {
      if (!initialFollowing && currentUser && currentUser.id !== userId) {
        checkFollowStatus();
      }
    }, [initialFollowing, currentUser, userId, checkFollowStatus]);

    // Notify parent when follow state changes
    useEffect(() => {
      onFollowChange?.(isFollowing);
    }, [isFollowing, onFollowChange]);

    // Notify parent on error
    useEffect(() => {
      if (error) {
        onError?.(error);
      }
    }, [error, onError]);

    const handleClick = useCallback(() => {
      requireAuth(async () => {
        // Show confirmation for unfollow if enabled
        if (isFollowing && confirmUnfollow) {
          setShowUnfollowConfirm(true);
          return;
        }
        await toggleFollow();
      });
    }, [requireAuth, toggleFollow, isFollowing, confirmUnfollow]);

    const handleConfirmUnfollow = useCallback(() => {
      requireAuth(async () => {
        setShowUnfollowConfirm(false);
        await unfollow();
      });
    }, [requireAuth, unfollow]);

    const handleCancelUnfollow = useCallback(() => {
      setShowUnfollowConfirm(false);
    }, []);

    // Don't show button for following yourself
    if (currentUser?.id === userId) {
      return null;
    }

    // Size classes
    const sizeClasses = {
      sm: compact ? 'p-1.5' : 'px-3 py-1.5 text-sm',
      md: compact ? 'p-2' : 'px-4 py-2 text-sm',
      lg: compact ? 'p-2.5' : 'px-5 py-2.5 text-base',
    };

    // Base button classes
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    // State-specific classes
    const stateClasses = isFollowing
      ? // Following state: outlined style
        'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:border-red-700 dark:hover:text-red-400 focus:ring-gray-300 dark:focus:ring-gray-600'
      : // Not following state: filled primary style
        'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400';

    // Button text
    const getButtonText = () => {
      if (compact) return null;
      if (isLoading) return 'Loading...';
      return isFollowing ? 'Following' : 'Follow';
    };

    // Aria label for accessibility
    const ariaLabel = isFollowing ? `Unfollow user` : `Follow user`;

    // Render appropriate icon
    const renderIcon = () => {
      if (isLoading) {
        return <LoadingSpinner />;
      }
      if (isFollowing) {
        return <FollowingIcon compact={compact} />;
      }
      return <FollowIcon compact={compact} />;
    };

    return (
      <>
        <button
          ref={ref}
          type="button"
          onClick={handleClick}
          disabled={disabled || isLoading}
          className={`${baseClasses} ${sizeClasses[size]} ${stateClasses} ${className}`}
          aria-label={ariaLabel}
          aria-pressed={isFollowing}
          data-testid="follow-button"
        >
          {renderIcon()}
          {getButtonText()}
        </button>

        {/* Unfollow confirmation modal */}
        <Modal
          isOpen={showUnfollowConfirm}
          onClose={handleCancelUnfollow}
          title="Unfollow User"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to unfollow{' '}
              <span className="font-semibold">{userName || 'this user'}</span>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You will no longer see their updates in your feed, and they may restrict access to
              followers-only content.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={handleCancelUnfollow}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmUnfollow}>
                Unfollow
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  },
);

FollowButton.displayName = 'FollowButton';

export default FollowButton;

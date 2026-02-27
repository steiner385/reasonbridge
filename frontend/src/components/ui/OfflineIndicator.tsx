/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export interface OfflineIndicatorProps {
  /** Custom message to display when offline */
  offlineMessage?: string;
  /** Custom message to display when back online */
  onlineMessage?: string;
  /** Whether to show the "back online" message temporarily */
  showOnlineConfirmation?: boolean;
  /** Duration to show online confirmation in ms (default: 3000) */
  onlineConfirmationDuration?: number;
  /** Position of the indicator */
  position?: 'top' | 'bottom';
  /** Additional CSS classes */
  className?: string;
}

/**
 * OfflineIndicator - Displays a banner when the user is offline
 *
 * Features:
 * - Automatically detects online/offline status
 * - Shows offline warning banner
 * - Optionally shows "back online" confirmation
 * - Smooth slide-in/slide-out animations
 * - Dark mode support
 * - Accessible with ARIA attributes
 *
 * @example
 * ```tsx
 * // Basic usage - place at app root
 * <OfflineIndicator />
 *
 * // With custom messages
 * <OfflineIndicator
 *   offlineMessage="No internet connection. Changes will sync when you reconnect."
 *   showOnlineConfirmation
 * />
 * ```
 */
export function OfflineIndicator({
  offlineMessage = "You're offline. Some features may be unavailable.",
  onlineMessage = "You're back online!",
  showOnlineConfirmation = true,
  onlineConfirmationDuration = 3000,
  position = 'top',
  className = '',
}: OfflineIndicatorProps) {
  const { isOnline, isTransitioning, lastChangedAt } = useOnlineStatus({
    transitionDuration: onlineConfirmationDuration,
  });

  // Derive show online banner from hook state - no separate state needed
  // The hook's isTransitioning clears after transitionDuration (passed as onlineConfirmationDuration)
  const showOnlineBanner =
    isOnline && isTransitioning && showOnlineConfirmation && lastChangedAt !== null;

  // Don't render anything if online and not showing confirmation
  if (isOnline && !showOnlineBanner) {
    return null;
  }

  const positionClasses = position === 'top' ? 'top-0' : 'bottom-0';

  const animationClasses =
    position === 'top' ? 'animate-[slideDown_0.3s_ease-out]' : 'animate-[slideUp_0.3s_ease-out]';

  // Offline banner
  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        data-testid="offline-indicator"
        className={`
          fixed ${positionClasses} left-0 right-0 z-50
          ${animationClasses}
          ${className}
        `}
      >
        <div className="bg-yellow-500 dark:bg-yellow-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            {/* Offline Icon */}
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            <span className="text-sm font-medium">{offlineMessage}</span>
          </div>
        </div>
      </div>
    );
  }

  // Online confirmation banner
  if (showOnlineBanner) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="online-indicator"
        className={`
          fixed ${positionClasses} left-0 right-0 z-50
          ${animationClasses}
          ${className}
        `}
      >
        <div className="bg-green-500 dark:bg-green-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            {/* Online Icon */}
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              />
            </svg>
            <span className="text-sm font-medium">{onlineMessage}</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default OfflineIndicator;

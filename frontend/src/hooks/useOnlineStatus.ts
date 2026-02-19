/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';

export interface OnlineStatusState {
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Whether the status was recently changed (for transition animations) */
  isTransitioning: boolean;
  /** Timestamp of last status change */
  lastChangedAt: Date | null;
  /** Time since last online (in milliseconds), null if currently online */
  offlineDuration: number | null;
}

export interface UseOnlineStatusOptions {
  /** Callback fired when going online */
  onOnline?: () => void;
  /** Callback fired when going offline */
  onOffline?: () => void;
  /** Duration in ms to show transition state (default: 3000) */
  transitionDuration?: number;
}

/**
 * Hook to detect browser online/offline status
 *
 * Uses the Navigator.onLine API and listens for online/offline events.
 * Provides transition state for smooth UI updates when status changes.
 *
 * @param options - Configuration options for callbacks and transition duration
 * @returns OnlineStatusState with current status and metadata
 *
 * @example
 * ```tsx
 * const { isOnline, isTransitioning } = useOnlineStatus({
 *   onOffline: () => toast.warning('You are offline'),
 *   onOnline: () => toast.success('Back online!'),
 * });
 *
 * if (!isOnline) {
 *   return <OfflineBanner />;
 * }
 * ```
 */
export function useOnlineStatus(options: UseOnlineStatusOptions = {}): OnlineStatusState {
  const { onOnline, onOffline, transitionDuration = 3000 } = options;

  // Initialize with navigator.onLine, defaulting to true for SSR
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [lastChangedAt, setLastChangedAt] = useState<Date | null>(null);
  const [offlineDuration, setOfflineDuration] = useState<number | null>(() => {
    // Initialize to 0 if starting offline
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine ? null : 0;
    }
    return null;
  });

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setIsTransitioning(true);
    setLastChangedAt(new Date());
    setOfflineDuration(null);
    onOnline?.();

    // Clear transition state after duration
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, transitionDuration);

    return () => clearTimeout(timer);
  }, [onOnline, transitionDuration]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setIsTransitioning(true);
    setLastChangedAt(new Date());
    setOfflineDuration(0);
    onOffline?.();

    // Clear transition state after duration
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, transitionDuration);

    return () => clearTimeout(timer);
  }, [onOffline, transitionDuration]);

  useEffect(() => {
    // Add event listeners for online/offline changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    isTransitioning,
    lastChangedAt,
    offlineDuration,
  };
}

/**
 * Simple hook that just returns whether the browser is online
 * For cases where you don't need the full state object
 *
 * @returns boolean indicating online status
 *
 * @example
 * ```tsx
 * const isOnline = useIsOnline();
 * ```
 */
export function useIsOnline(): boolean {
  const { isOnline } = useOnlineStatus();
  return isOnline;
}

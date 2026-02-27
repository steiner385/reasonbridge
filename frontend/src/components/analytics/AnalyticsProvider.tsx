/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Analytics Provider
 *
 * Provides analytics context and automatic page view tracking.
 * Wrap your app with this provider to enable analytics.
 *
 * **Child Safety**: Automatically disables all tracking when the current
 * user is detected as a minor (COPPA/GDPR-K compliance).
 *
 * @example
 * ```tsx
 * <AnalyticsProvider>
 *   <App />
 * </AnalyticsProvider>
 * ```
 */

import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, setMinorUserStatus } from '../../lib/analytics';
import { useChildSafety } from '../../contexts/ChildSafetyContext';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const location = useLocation();
  const { isChildMode } = useChildSafety();

  // Sync minor status with analytics module
  // When isChildMode is true, all tracking is disabled at the core level
  useEffect(() => {
    setMinorUserStatus(isChildMode);
  }, [isChildMode]);

  // Track page views on route changes (will be blocked if minor)
  useEffect(() => {
    // Small delay to ensure document.title is updated
    const timeoutId = setTimeout(() => {
      trackPageView(location.pathname + location.search, document.title);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, location.search]);

  return <>{children}</>;
}

export default AnalyticsProvider;

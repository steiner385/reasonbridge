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
 * @example
 * ```tsx
 * <AnalyticsProvider>
 *   <App />
 * </AnalyticsProvider>
 * ```
 */

import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../../lib/analytics';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const location = useLocation();

  // Track page views on route changes
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

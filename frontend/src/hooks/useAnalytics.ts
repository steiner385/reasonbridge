/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useAnalytics Hook
 *
 * React hook for tracking analytics events.
 * Automatically tracks page views on route changes.
 *
 * @example
 * ```tsx
 * const { trackEvent } = useAnalytics();
 *
 * // Track custom event
 * trackEvent('topic_create', { category: 'politics' });
 * ```
 */

import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  trackPageView,
  trackEvent as analyticsTrackEvent,
  type AnalyticsEvent,
} from '../lib/analytics';

interface UseAnalyticsOptions {
  /** Automatically track page views on route changes (default: true) */
  trackPageViews?: boolean;
}

interface UseAnalyticsReturn {
  /** Track a custom event */
  trackEvent: (
    event: Exclude<AnalyticsEvent, 'page_view'>,
    props?: Record<string, string | number | boolean>,
  ) => void;
  /** Manually track a page view */
  trackPage: (path?: string, title?: string) => void;
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const { trackPageViews = true } = options;
  const location = useLocation();

  // Track page views on route changes
  useEffect(() => {
    if (trackPageViews) {
      trackPageView(location.pathname + location.search, document.title);
    }
  }, [location.pathname, location.search, trackPageViews]);

  // Memoized track event function
  const trackEvent = useCallback(
    (
      event: Exclude<AnalyticsEvent, 'page_view'>,
      props?: Record<string, string | number | boolean>,
    ) => {
      analyticsTrackEvent(event, props);
    },
    [],
  );

  // Memoized track page function
  const trackPage = useCallback((path?: string, title?: string) => {
    trackPageView(path || window.location.pathname, title || document.title);
  }, []);

  return {
    trackEvent,
    trackPage,
  };
}

export default useAnalytics;

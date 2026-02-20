/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Analytics Module
 *
 * Privacy-respecting analytics for tracking user interactions.
 * Supports multiple providers with a pluggable architecture:
 * - Development: Console logging
 * - Production: Configurable provider (Plausible, custom API)
 *
 * @remarks
 * All tracking respects user consent and privacy preferences.
 * No PII is collected or transmitted.
 */

export type AnalyticsEvent =
  | 'page_view'
  | 'signup_start'
  | 'signup_complete'
  | 'login'
  | 'logout'
  | 'topic_create'
  | 'topic_view'
  | 'response_create'
  | 'common_ground_view'
  | 'search'
  | 'filter_apply'
  | 'error';

export interface AnalyticsEventData {
  /** Event name */
  event: AnalyticsEvent;
  /** Page path */
  path?: string;
  /** Additional properties */
  props?: Record<string, string | number | boolean>;
}

export interface AnalyticsConfig {
  /** Enable analytics tracking */
  enabled: boolean;
  /** Analytics provider ('console' | 'plausible' | 'custom') */
  provider: 'console' | 'plausible' | 'custom';
  /** Plausible domain (if using Plausible) */
  plausibleDomain?: string;
  /** Custom endpoint URL (if using custom provider) */
  customEndpoint?: string;
  /** Debug mode - logs events to console even in production */
  debug?: boolean;
}

// Default configuration
const defaultConfig: AnalyticsConfig = {
  enabled: import.meta.env.PROD,
  provider: import.meta.env.PROD ? 'plausible' : 'console',
  plausibleDomain: import.meta.env['VITE_PLAUSIBLE_DOMAIN'],
  customEndpoint: import.meta.env['VITE_ANALYTICS_ENDPOINT'],
  debug: import.meta.env.DEV,
};

let config: AnalyticsConfig = { ...defaultConfig };

/**
 * Configure analytics
 */
export function configureAnalytics(newConfig: Partial<AnalyticsConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Check if user has consented to analytics
 * Returns true if no explicit opt-out
 */
function hasConsent(): boolean {
  try {
    const consent = localStorage.getItem('analytics-consent');
    // Default to opt-in unless explicitly opted out
    return consent !== 'denied';
  } catch {
    return true;
  }
}

/**
 * Track a page view
 */
export function trackPageView(path: string, title?: string): void {
  track({
    event: 'page_view',
    path,
    props: title ? { title } : undefined,
  });
}

/**
 * Track a custom event
 */
export function trackEvent(
  event: Exclude<AnalyticsEvent, 'page_view'>,
  props?: Record<string, string | number | boolean>,
): void {
  track({
    event,
    path: window.location.pathname,
    props,
  });
}

/**
 * Core tracking function
 */
function track(data: AnalyticsEventData): void {
  // Check if analytics is enabled
  if (!config.enabled) {
    if (config.debug) {
      console.info('[Analytics Debug - Disabled]', data);
    }
    return;
  }

  // Check user consent
  if (!hasConsent()) {
    if (config.debug) {
      console.info('[Analytics Debug - No Consent]', data);
    }
    return;
  }

  // Route to appropriate provider
  switch (config.provider) {
    case 'console':
      trackConsole(data);
      break;
    case 'plausible':
      trackPlausible(data);
      break;
    case 'custom':
      trackCustom(data);
      break;
  }
}

/**
 * Console logging provider (development)
 */
function trackConsole(data: AnalyticsEventData): void {
  const timestamp = new Date().toISOString();
  console.info(`%c[Analytics] ${data.event}`, 'color: #6366f1; font-weight: bold', {
    timestamp,
    path: data.path || window.location.pathname,
    ...data.props,
  });
}

/**
 * Plausible Analytics provider
 * @see https://plausible.io/docs/custom-event-goals
 */
function trackPlausible(data: AnalyticsEventData): void {
  // Check if Plausible script is loaded
  const plausible = (window as Window & { plausible?: (event: string, options?: object) => void })
    .plausible;

  if (!plausible) {
    if (config.debug) {
      console.warn('[Analytics] Plausible not loaded, falling back to console');
      trackConsole(data);
    }
    return;
  }

  if (data.event === 'page_view') {
    // Plausible tracks page views automatically
    return;
  }

  // Track custom event
  plausible(data.event, {
    props: data.props,
  });

  if (config.debug) {
    trackConsole(data);
  }
}

/**
 * Custom analytics endpoint provider
 */
function trackCustom(data: AnalyticsEventData): void {
  if (!config.customEndpoint) {
    if (config.debug) {
      console.warn('[Analytics] Custom endpoint not configured');
    }
    return;
  }

  // Use sendBeacon for reliable delivery
  const payload = JSON.stringify({
    event: data.event,
    path: data.path || window.location.pathname,
    props: data.props,
    timestamp: new Date().toISOString(),
    // Include anonymous session ID for session tracking
    sessionId: getSessionId(),
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(config.customEndpoint, payload);
  } else {
    // Fallback for older browsers
    fetch(config.customEndpoint, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // Silently fail - analytics should not break the app
    });
  }

  if (config.debug) {
    trackConsole(data);
  }
}

/**
 * Get or create anonymous session ID
 */
function getSessionId(): string {
  const SESSION_KEY = 'analytics-session';
  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return 'anonymous';
  }
}

/**
 * Set user consent preference
 */
export function setAnalyticsConsent(consent: 'granted' | 'denied'): void {
  try {
    localStorage.setItem('analytics-consent', consent);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get current consent status
 */
export function getAnalyticsConsent(): 'granted' | 'denied' | 'unknown' {
  try {
    const consent = localStorage.getItem('analytics-consent');
    if (consent === 'granted' || consent === 'denied') {
      return consent;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

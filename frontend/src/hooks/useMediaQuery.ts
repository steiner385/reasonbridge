/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

/**
 * Hook to detect responsive breakpoints using CSS media queries
 * Returns true if the media query matches, false otherwise
 *
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if the media query matches
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  // Initialize synchronously from the real match so the first committed frame is correct.
  // This is a client-only SPA (no SSR/hydration), so the previous deferred `setTimeout(0)`
  // default of `false` produced a one-frame desktop layout on phones (#1382). Mirrors
  // useBreakpoint, which already initializes synchronously from window.innerWidth.
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false; // SSR / non-browser fallback
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    // Create MediaQueryList object
    const mediaQuery = window.matchMedia(query);

    // Re-sync in case the query changed or the viewport shifted before this effect ran.
    // Wrapped in a helper + functional no-op form (mirrors useBreakpoint) so it doesn't
    // trigger a cascading render.
    const sync = () => {
      setMatches((prev) => (prev !== mediaQuery.matches ? mediaQuery.matches : prev));
    };
    sync();

    // Create event listener for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers use addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Predefined breakpoint hooks for common use cases
 * Based on Tailwind CSS breakpoints
 */

/** Hook to detect extra small screens (< 640px) */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)');
}

/** Hook to detect small screens (640px - 767px) */
export function useIsSmallTablet(): boolean {
  return useMediaQuery('(min-width: 640px) and (max-width: 767px)');
}

/** Hook to detect medium screens (768px - 1023px) */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/** Hook to detect large screens (1024px - 1279px) */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px) and (max-width: 1279px)');
}

/** Hook to detect extra large screens (≥ 1280px) */
export function useIsLargeDesktop(): boolean {
  return useMediaQuery('(min-width: 1280px)');
}

/** Hook to detect if viewport is mobile-sized (< 768px) - for navigation logic */
export function useIsMobileViewport(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/** Hook to detect if viewport is desktop-sized (≥ 768px) - for navigation logic */
export function useIsDesktopViewport(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

/** Hook to detect if user prefers reduced motion (accessibility) */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Hook to detect if user prefers dark color scheme (system preference) */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

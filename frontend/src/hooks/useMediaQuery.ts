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
  // Initialize with false to avoid hydration mismatch (SSR compatibility)
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Create MediaQueryList object
    const mediaQuery = window.matchMedia(query);

    // Set initial value asynchronously to avoid cascading renders
    const initTimer = setTimeout(() => {
      setMatches(mediaQuery.matches);
    }, 0);

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
      clearTimeout(initTimer);
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

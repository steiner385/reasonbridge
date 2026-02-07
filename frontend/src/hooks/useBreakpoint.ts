/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Determine breakpoint based on viewport width
 * Breakpoint thresholds: mobile (≤767px), tablet (768-1279px), desktop (≥1280px)
 */
function getBreakpoint(width: number): Breakpoint {
  if (width < 768) return 'mobile';
  if (width < 1280) return 'tablet';
  return 'desktop';
}

/**
 * Custom hook for responsive design breakpoint detection
 * @returns Current breakpoint ('mobile' | 'tablet' | 'desktop')
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    // Initialize with current window width
    if (typeof window !== 'undefined') {
      return getBreakpoint(window.innerWidth);
    }
    return 'desktop'; // SSR fallback
  });

  useEffect(() => {
    const updateBreakpoint = () => {
      const newBreakpoint = getBreakpoint(window.innerWidth);
      setBreakpoint(newBreakpoint);
    };

    // Update on mount to ensure correct initial value
    updateBreakpoint();

    // Add resize listener with debounce
    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBreakpoint, 100);
    };

    window.addEventListener('resize', debouncedUpdate);

    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  return breakpoint;
}

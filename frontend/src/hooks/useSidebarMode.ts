/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sidebar mode type
 * - 'topics': Show compact site nav + topic navigation
 * - 'full': Show standard full site navigation
 */
export type SidebarMode = 'topics' | 'full';

/**
 * Hook to determine the current sidebar mode
 *
 * @remarks
 * Always returns 'topics' mode for consistent sidebar experience across all routes.
 * This provides:
 * - Compact site nav icons at top (Topics, Simulator, Notifications, Settings, Profile)
 * - Topic navigation list below (search, filter, topic list)
 *
 * Users can quickly navigate between discussions from any page in the app.
 *
 * @example
 * ```tsx
 * const sidebarMode = useSidebarMode();
 * // sidebarMode === 'topics' on all routes
 * ```
 */
export function useSidebarMode(): SidebarMode {
  // Always use 'topics' mode for consistent UX with topic navigation
  // Note: No useLocation() call needed since we always return 'topics'
  return 'topics';
}

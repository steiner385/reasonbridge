/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TopicNavigationContent } from '../topics/TopicNavigationContent';
import { useSidebar } from '../../hooks/useSidebar';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTopicNavigation } from '../../hooks/useTopicNavigation';
import { useTopics } from '../../lib/useTopics';
import { Navigation } from './Navigation';
import { CompactSiteNav } from './CompactSiteNav';

/**
 * Unified Sidebar Component
 *
 * @remarks
 * Route-aware sidebar that adapts its content based on the current route:
 *
 * **Topics Mode** (on /topics, /discussions):
 * - CompactSiteNav (icon-only horizontal nav) at top
 * - TopicNavigationContent (search, filter, topic list) below
 * - Fixed 320px width (never collapses in this mode)
 *
 * **Full Mode** (all other routes):
 * - Standard Navigation component with labels
 * - User profile section at bottom
 * - Can collapse to 80px (icon-only)
 *
 * Hidden on mobile viewports (< 768px) - use MobileDrawer instead.
 */
export function Sidebar() {
  const { isCollapsed, sidebarMode } = useSidebar();
  const { user } = useAuth();
  const { activeTopicId } = useTopicNavigation();
  const { subscribe } = useWebSocket();
  const [unreadMap, setUnreadMap] = useState<Map<string, boolean>>(new Map());

  // Fetch topics when in topics mode
  // When not in topics mode, pass undefined to skip fetching
  // Note: Don't pre-filter by status - let users filter via TopicSearchFilter
  // Memoize params to prevent creating new object reference on every render
  const topicsParams = useMemo(
    () =>
      sidebarMode === 'topics'
        ? {
            sortBy: 'responseCount' as const,
            sortOrder: 'desc' as const,
            page: 1,
            limit: 100,
          }
        : undefined,
    [sidebarMode],
  );

  const { data, isLoading, error } = useTopics(topicsParams);

  const topics = useMemo(() => data?.data || [], [data?.data]);
  const errorMessage = error ? 'Failed to load topics' : null;

  // Subscribe to new response WebSocket messages for unread badges
  useEffect(() => {
    if (sidebarMode !== 'topics') return;

    const unsubscribe = subscribe('NEW_RESPONSE', (message) => {
      const topicId = message.payload.topicId;

      // Don't mark as unread if it's the currently active topic
      if (topicId !== activeTopicId) {
        setUnreadMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(topicId, true);
          return newMap;
        });
      }
    });

    return unsubscribe;
  }, [activeTopicId, subscribe, sidebarMode]);

  // Clear unread status when a topic becomes active
  // Schedule state update asynchronously to avoid cascading renders
  useEffect(() => {
    if (activeTopicId) {
      const timeoutId = setTimeout(() => {
        setUnreadMap((prev) => {
          // Only update if this topic is actually in the unread map
          if (!prev.has(activeTopicId)) return prev;
          const newMap = new Map(prev);
          newMap.delete(activeTopicId);
          return newMap;
        });
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [activeTopicId]);

  // Topics mode: wider sidebar with compact nav + topic list
  if (sidebarMode === 'topics') {
    return (
      <aside
        className="
          hidden md:flex md:flex-col
          fixed left-0 top-16 bottom-0 z-30
          w-80 border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900
          transition-all duration-300 ease-in-out
        "
        aria-label="Topic navigation sidebar"
      >
        {/* Compact Site Navigation */}
        <CompactSiteNav />

        {/* Topic Navigation Content */}
        <div className="flex-1 overflow-hidden">
          <TopicNavigationContent
            topics={topics}
            unreadMap={unreadMap}
            isLoading={isLoading}
            error={errorMessage}
            height={typeof window !== 'undefined' ? window.innerHeight - 120 : 600}
          />
        </div>
      </aside>
    );
  }

  // Full mode: standard collapsible sidebar
  return (
    <aside
      className={`
        hidden md:flex md:flex-col
        fixed left-0 top-16 bottom-0 z-30
        border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
      aria-label="Sidebar navigation"
    >
      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-4">
        <Navigation isCollapsed={isCollapsed} />
      </div>

      {/* User Profile Section (bottom) */}
      {user && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <Link
            to="/profile"
            title={isCollapsed ? `${user.displayName}\n${user.email}` : undefined}
            className={`
              flex items-center gap-3 rounded-lg p-3 transition-colors
              hover:bg-gray-100 dark:hover:bg-gray-800
              ${isCollapsed ? 'justify-center' : ''}
            `}
            aria-label={isCollapsed ? `${user.displayName} - ${user.email}` : 'View profile'}
          >
            {/* Avatar */}
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* User Info (hidden when collapsed) */}
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {user.displayName}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-300">{user.email}</p>
              </div>
            )}
          </Link>
        </div>
      )}
    </aside>
  );
}

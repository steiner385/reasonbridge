/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { TopicNavigationContent } from '../topics/TopicNavigationContent';
import { useSidebar } from '../../hooks/useSidebar';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useElementHeight } from '../../hooks/useElementHeight';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTopicNavigation } from '../../hooks/useTopicNavigation';
import { useTopics } from '../../lib/useTopics';
import Avatar from '../ui/Avatar';
import { Navigation } from './Navigation';
import { CompactSiteNav } from './CompactSiteNav';

/**
 * MobileDrawer Component
 *
 * @remarks
 * Slide-out drawer navigation for mobile viewports (< 768px).
 * Adapts content based on sidebar mode:
 *
 * **Topics Mode** (on /topics, /discussions):
 * - CompactSiteNav at top
 * - TopicNavigationContent (search, filter, topic list)
 *
 * **Full Mode** (all other routes):
 * - Standard Navigation with labels
 * - User profile section at bottom
 *
 * Includes backdrop overlay and closes on navigation, backdrop click, or Escape key.
 */
export function MobileDrawer() {
  const { isMobileOpen, closeMobile, sidebarMode } = useSidebar();
  const { user } = useAuth();
  const { activeTopicId } = useTopicNavigation();
  const { subscribe } = useWebSocket();
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [unreadMap, setUnreadMap] = useState<Map<string, boolean>>(new Map());
  // Live-measured height for the topic virtual list (stays correct after rotation /
  // keyboard viewport shrink — see #1383).
  const [topicListRef, topicListHeight] = useElementHeight<HTMLDivElement>(400);

  // Fetch topics when in topics mode and drawer is open
  // When not in topics mode or drawer is closed, pass undefined to skip fetching
  // Note: Don't pre-filter by status - let users filter via TopicSearchFilter
  // Memoize params to prevent creating new object reference on every render
  const topicsParams = useMemo(
    () =>
      sidebarMode === 'topics' && isMobileOpen
        ? {
            sortBy: 'responseCount' as const,
            sortOrder: 'desc' as const,
            page: 1,
            limit: 100,
          }
        : undefined,
    [sidebarMode, isMobileOpen],
  );

  const { data, isLoading, error, refetch } = useTopics(topicsParams);

  const topics = useMemo(() => data?.data || [], [data?.data]);
  const errorMessage = error ? 'Failed to load topics' : null;

  // Subscribe to new response WebSocket messages for unread badges
  useEffect(() => {
    if (sidebarMode !== 'topics') return;

    const unsubscribe = subscribe('NEW_RESPONSE', (message) => {
      const topicId = message.payload.topicId;

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

  // Close drawer on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileOpen) {
        closeMobile();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileOpen, closeMobile]);

  // Lock body scroll when drawer is open (reference-counted — see #1378).
  useScrollLock(isMobileOpen);

  // Focus trap: Keep focus within drawer when open
  useEffect(() => {
    if (!isMobileOpen) return;

    // Store the element that had focus before drawer opened
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the drawer itself
    drawerRef.current?.focus();

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select',
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: Move focus backward
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: Move focus forward
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    // Restore focus when drawer closes
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      previousFocusRef.current?.focus();
    };
  }, [isMobileOpen]);

  // Handle topic selection - close drawer after selecting
  const handleTopicSelect = () => {
    closeMobile();
  };

  // Use portal to render at document.body level to avoid stacking context issues
  return createPortal(
    <>
      {/* Backdrop - z-[99] to cover header and all other elements */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[99] bg-black/50 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Drawer - z-[100] to stay above backdrop */}
      <aside
        id="mobile-drawer"
        ref={drawerRef}
        tabIndex={-1}
        className={`
          fixed left-0 top-0 bottom-0 z-[100]
          flex flex-col
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-300 ease-in-out
          md:hidden
          ${sidebarMode === 'topics' ? 'w-80' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Mobile navigation drawer"
        aria-hidden={!isMobileOpen}
      >
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"
            onClick={closeMobile}
          >
            <img
              src="/assets/brand/logo-icon.svg"
              alt="ReasonBridge"
              className="h-8 w-8 dark:brightness-110"
            />
            <span>ReasonBridge</span>
          </Link>

          <button
            onClick={closeMobile}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Close navigation drawer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content based on mode */}
        {sidebarMode === 'topics' ? (
          <>
            {/* Compact Site Navigation */}
            <CompactSiteNav onNavigate={closeMobile} />

            {/* Topic Navigation Content */}
            <div ref={topicListRef} className="flex-1 overflow-hidden">
              <TopicNavigationContent
                topics={topics}
                unreadMap={unreadMap}
                isLoading={isLoading}
                error={errorMessage}
                onRetry={() => refetch()}
                height={topicListHeight}
                onTopicSelect={handleTopicSelect}
              />
            </div>
          </>
        ) : (
          <>
            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto p-4">
              <Navigation onNavigate={closeMobile} />
            </div>

            {/* User Profile Section (bottom) */}
            {user && (
              <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={closeMobile}
                  aria-label="View profile"
                >
                  {/* Avatar */}
                  <Avatar user={user} size="md" className="shrink-0" />

                  {/* User Info */}
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {user.displayName}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-300">
                      {user.email}
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </>
        )}
      </aside>
    </>,
    document.body,
  );
}

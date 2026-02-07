/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { useSidebar } from '../../hooks/useSidebar';
import { useAuth } from '../../hooks/useAuth';
import { Navigation } from './Navigation';

/**
 * Sidebar Component
 * Desktop collapsible sidebar with navigation links
 * Collapses to icon-only mode when isCollapsed is true
 * Hidden on mobile viewports (< 768px)
 */

interface SidebarProps {
  /** Optional unread notification count */
  unreadCount?: number;
}

export function Sidebar({ unreadCount = 0 }: SidebarProps) {
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();

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
        <Navigation unreadCount={unreadCount} isCollapsed={isCollapsed} />
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

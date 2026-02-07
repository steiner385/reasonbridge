/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { Dropdown } from '../ui/Dropdown';
import { NotificationItem } from './NotificationItem';

/**
 * Notification dropdown component for header
 *
 * Follows industry standard pattern (Twitter, GitHub, LinkedIn):
 * - Bell icon with unread badge
 * - Dropdown shows preview of recent notifications
 * - "View all" link to full notifications page
 * - Mark as read actions
 */
export function NotificationDropdown() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  // Show only first 5 notifications in dropdown
  const recentNotifications = notifications.slice(0, 5);
  const hasNotifications = recentNotifications.length > 0;

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Dropdown
      trigger={
        <div className="relative inline-flex items-center">
          <Bell className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute right-[-8px] top-[-8px] flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      }
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      align="right"
      className="w-96"
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({unreadCount} unread)
              </span>
            )}
          </h3>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              title="Mark all as read"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Notification list */}
        {!isLoading && hasNotifications && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onClose={handleClose}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasNotifications && (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              No notifications yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
              You&apos;ll be notified when someone interacts with your content
            </p>
          </div>
        )}

        {/* Footer */}
        {!isLoading && hasNotifications && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/notifications"
              onClick={handleClose}
              className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all notifications →
            </Link>
          </div>
        )}
      </div>
    </Dropdown>
  );
}

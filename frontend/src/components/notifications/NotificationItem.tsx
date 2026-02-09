/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { MessageCircle, AtSign, Bell, Heart, CheckCircle } from 'lucide-react';
import type { PageNotification } from '../../hooks/useNotifications';

interface NotificationItemProps {
  notification: PageNotification;
  onMarkAsRead: (id: string) => void;
  onClose?: () => void;
}

/**
 * Individual notification item for dropdown preview
 */
export function NotificationItem({ notification, onMarkAsRead, onClose }: NotificationItemProps) {
  const { id, type, message, timestamp, read, url, actor } = notification;

  // Format relative time
  const getRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get icon and color based on notification type
  const getTypeConfig = () => {
    switch (type) {
      case 'comment':
        return {
          icon: MessageCircle,
          color: 'text-blue-500 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        };
      case 'mention':
        return {
          icon: AtSign,
          color: 'text-purple-500 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        };
      case 'response':
        return {
          icon: MessageCircle,
          color: 'text-green-500 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
        };
      case 'like':
        return {
          icon: Heart,
          color: 'text-red-500 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
        };
      case 'system':
      default:
        return {
          icon: Bell,
          color: 'text-gray-500 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  const handleClick = () => {
    if (!read) {
      onMarkAsRead(id);
    }
    if (onClose) {
      onClose();
    }
  };

  const content = (
    <div
      className={`
        flex items-start gap-3 p-3
        hover:bg-gray-50 dark:hover:bg-gray-700/50
        transition-colors
        ${!read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
      `}
    >
      {/* Unread indicator */}
      {!read && (
        <div className="mt-2">
          <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500" />
        </div>
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 rounded-full p-2 ${config.bgColor}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-tight ${
            read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-medium'
          }`}
        >
          {message}
        </p>

        {actor && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">@{actor.username}</p>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {getRelativeTime(timestamp)}
        </p>
      </div>

      {/* Mark as read button (for unread notifications) */}
      {!read && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkAsRead(id);
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Mark as read"
        >
          <CheckCircle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </button>
      )}
    </div>
  );

  // If notification has a URL, wrap in Link
  if (url) {
    return (
      <Link to={url} onClick={handleClick} className="block">
        {content}
      </Link>
    );
  }

  // Otherwise, just render the content
  return <div onClick={handleClick}>{content}</div>;
}

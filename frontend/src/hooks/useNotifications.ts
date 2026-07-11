/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../lib/api';

/**
 * API response type from the backend
 */
interface NotificationApiResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  metadata: {
    actorId?: string;
    actorUsername?: string;
    actorAvatarUrl?: string;
    relatedContentType?: 'topic' | 'response' | 'user';
    relatedContentId?: string;
    relatedContentTitle?: string;
  } | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationListApiResponse {
  notifications: NotificationApiResponse[];
  total: number;
  unreadCount: number;
}

export interface PageNotification {
  id: string;
  type: 'comment' | 'mention' | 'system' | 'response' | 'like' | 'follow' | 'common_ground';
  message: string;
  /** Optional actor information */
  actor?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  /** Related content */
  relatedContent?: {
    type: 'topic' | 'response' | 'user';
    id: string;
    title?: string;
  };
  timestamp: string;
  read: boolean;
  /** Navigation URL when notification is clicked */
  url?: string;
}

interface UseNotificationsReturn {
  notifications: PageNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Map backend notification type to frontend type
 */
function mapNotificationType(
  backendType: string,
): 'comment' | 'mention' | 'system' | 'response' | 'like' | 'follow' | 'common_ground' {
  const typeMap: Record<string, PageNotification['type']> = {
    mention: 'mention',
    follow: 'follow',
    common_ground: 'common_ground',
    response: 'response',
    reply: 'comment',
    like: 'like',
    system: 'system',
  };
  return typeMap[backendType] || 'system';
}

/**
 * Transform backend notification to frontend format
 */
function transformNotification(apiNotification: NotificationApiResponse): PageNotification {
  const notification: PageNotification = {
    id: apiNotification.id,
    type: mapNotificationType(apiNotification.type),
    message: apiNotification.body,
    timestamp: apiNotification.createdAt,
    read: apiNotification.isRead,
    url: apiNotification.actionUrl ?? undefined,
  };

  // Extract actor information from metadata
  if (apiNotification.metadata?.actorId && apiNotification.metadata?.actorUsername) {
    notification.actor = {
      id: apiNotification.metadata.actorId,
      username: apiNotification.metadata.actorUsername,
      avatarUrl: apiNotification.metadata.actorAvatarUrl,
    };
  }

  // Extract related content from metadata
  if (apiNotification.metadata?.relatedContentType && apiNotification.metadata?.relatedContentId) {
    notification.relatedContent = {
      type: apiNotification.metadata.relatedContentType,
      id: apiNotification.metadata.relatedContentId,
      title: apiNotification.metadata.relatedContentTitle,
    };
  }

  return notification;
}

/**
 * Hook for fetching and managing page notifications
 *
 * Connects to the notification-service REST API for:
 * - Fetching user notifications with pagination
 * - Marking individual notifications as read
 * - Marking all notifications as read
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<PageNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<NotificationListApiResponse>('/notifications', {
        params: { limit: 50 },
      });

      const transformedNotifications = response.notifications.map(transformNotification);
      setNotifications(transformedNotifications);
      setUnreadCount(response.unreadCount);
    } catch (err) {
      if (err instanceof ApiError) {
        // Handle 401 unauthorized - user not logged in
        if (err.status === 401) {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        setError(new Error(`Failed to fetch notifications: ${err.message}`));
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Keep notifications and the unread badge fresh without a page reload (#1364).
  // The notification list previously fetched exactly once on mount, so new
  // reply/mention notifications and the unread count stayed stale for the whole
  // session. Poll on an interval and refetch whenever the tab regains focus /
  // becomes visible again, mirroring React Query's refetchInterval +
  // refetchOnWindowFocus behaviour used elsewhere in the app.
  useEffect(() => {
    const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

    const interval = window.setInterval(() => {
      // Only poll while the tab is visible to avoid needless background traffic
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };

    window.addEventListener('focus', fetchNotifications);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', fetchNotifications);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await apiClient.patch<NotificationApiResponse>(`/notifications/${id}/read`);

        // Optimistically update local state
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // Refetch on error to sync state
        await fetchNotifications();
        throw err;
      }
    },
    [fetchNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.patch<{ count: number; message: string }>('/notifications/mark-all-read');

      // Optimistically update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      // Refetch on error to sync state
      await fetchNotifications();
      throw err;
    }
  }, [fetchNotifications]);

  const refetch = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}

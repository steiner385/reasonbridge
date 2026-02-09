/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export interface PageNotification {
  id: string;
  type: 'comment' | 'mention' | 'system' | 'response' | 'like';
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
 * Hook for fetching and managing page notifications
 *
 * TODO: Connect to real API endpoint when backend is ready
 * Currently uses mock data for UI development
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<PageNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Mock data for initial implementation
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API call
        // const data = await apiClient.get<PageNotification[]>('/notifications');

        // Mock data matching NotificationsPage structure
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

        const mockNotifications: PageNotification[] = [
          {
            id: '1',
            type: 'comment',
            message: 'Alex Johnson commented on your post about climate change',
            actor: {
              id: 'user-1',
              username: 'alexj',
              avatarUrl: undefined,
            },
            relatedContent: {
              type: 'response',
              id: 'response-123',
              title: 'Climate Change Discussion',
            },
            timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
            read: false,
            url: '/topics/topic-123#response-123',
          },
          {
            id: '2',
            type: 'mention',
            message: 'Sam Davis mentioned you in a response',
            actor: {
              id: 'user-2',
              username: 'samd',
            },
            relatedContent: {
              type: 'response',
              id: 'response-456',
            },
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
            read: false,
            url: '/topics/topic-456#response-456',
          },
          {
            id: '3',
            type: 'response',
            message: 'Taylor Chen responded to your topic',
            actor: {
              id: 'user-3',
              username: 'taylorc',
            },
            relatedContent: {
              type: 'topic',
              id: 'topic-789',
              title: 'Education Reform',
            },
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
            read: true,
            url: '/topics/topic-789',
          },
          {
            id: '4',
            type: 'system',
            message: 'Your response received 10 likes',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            read: true,
          },
          {
            id: '5',
            type: 'comment',
            message: 'Jordan Lee commented on your response',
            actor: {
              id: 'user-4',
              username: 'jordanl',
            },
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            read: true,
            url: '/topics/topic-999#response-999',
          },
        ];

        setNotifications(mockNotifications);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    // TODO: Call API endpoint: PATCH /notifications/:id
    // await apiClient.patch(`/notifications/${id}`, { read: true });

    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    // TODO: Call API endpoint: PATCH /notifications/mark-all-read
    // await apiClient.patch('/notifications/mark-all-read');

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const refetch = async () => {
    // TODO: Re-fetch notifications from API
    // For now, just reset loading state
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoading(false);
  };

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

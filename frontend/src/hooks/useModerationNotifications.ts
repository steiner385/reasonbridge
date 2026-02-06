/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useShowNotification } from './useNotification';

interface ModerationNotification {
  id: string;
  targetType: 'response' | 'user' | 'topic';
  actionType: 'educate' | 'warn' | 'hide' | 'remove' | 'suspend' | 'ban';
  severity: 'non_punitive' | 'consequential';
  reasoning: string;
  aiRecommended: boolean;
  aiConfidence?: number;
  createdAt: string;
}

interface UserTrustNotification {
  userId: string;
  previousScore: number;
  newScore: number;
  delta: number;
  reason: string;
}

/**
 * Hook to subscribe to moderation notifications via WebSocket
 * Automatically shows toast notifications when events are received
 */
export function useModerationNotifications() {
  const notification = useShowNotification();

  useEffect(() => {
    let socket: Socket | null = null;

    const connectSocket = () => {
      // Use same-origin for WebSocket (nginx proxies /socket.io/)
      const notificationServiceUrl = import.meta.env['VITE_NOTIFICATION_SERVICE_URL'] || '';

      // Socket.io namespaces are part of the URL, not an option
      socket = io(`${notificationServiceUrl}/notifications`, {
        path: '/socket.io',
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'],
      });

      // Connection handlers
      socket.on('connect', () => {
        notification.info('Connected to notifications', 'You will receive real-time updates');
      });

      socket.on('disconnect', () => {
        // Silently handle disconnection
      });

      socket.on('connect_error', (error: Error) => {
        console.error('[ModerationNotifications] Connection error:', error);
        notification.warning('Connection issue', 'Some real-time updates may be delayed');
      });

      // Moderation action notification
      socket.on('moderation:action-requested', (data: ModerationNotification) => {
        handleModerationAction(data);
      });

      // User trust update notification
      socket.on('user:trust-updated', (data: UserTrustNotification) => {
        handleTrustUpdate(data);
      });
    };

    const handleModerationAction = (data: ModerationNotification) => {
      const actionLabel = getActionLabel(data.actionType);
      const targetLabel = getTargetLabel(data.targetType);

      if (data.aiRecommended) {
        const confidence = data.aiConfidence ? Math.round(data.aiConfidence * 100) : 0;
        notification.info(
          `AI Recommendation: ${actionLabel} ${targetLabel}`,
          `Confidence: ${confidence}% • ${data.reasoning}`,
        );
      } else {
        const severityLabel = data.severity === 'consequential' ? 'Consequential' : 'Non-punitive';
        notification.warning(
          `Moderation Action: ${actionLabel} ${targetLabel}`,
          `${severityLabel} • ${data.reasoning}`,
        );
      }
    };

    const handleTrustUpdate = (data: UserTrustNotification) => {
      const deltaLabel = data.delta > 0 ? 'increased' : 'decreased';
      const changeText = `${deltaLabel} by ${Math.abs(data.delta).toFixed(1)}`;

      if (data.delta > 0) {
        notification.success(
          'Trust Score Improved',
          `Your trust score ${changeText} (reason: ${data.reason})`,
        );
      } else {
        notification.warning(
          'Trust Score Changed',
          `Your trust score ${changeText} (reason: ${data.reason})`,
        );
      }
    };

    connectSocket();

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [notification]);
}

/**
 * Get user-friendly label for action type
 */
function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    educate: 'Educational Action',
    warn: 'Warning',
    hide: 'Content Hidden',
    remove: 'Content Removed',
    suspend: 'Account Suspended',
    ban: 'Account Banned',
  };
  return labels[actionType] || actionType;
}

/**
 * Get user-friendly label for target type
 */
function getTargetLabel(targetType: string): string {
  const labels: Record<string, string> = {
    response: 'on Response',
    user: 'on User',
    topic: 'on Topic',
  };
  return labels[targetType] || targetType;
}

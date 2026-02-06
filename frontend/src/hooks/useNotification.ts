/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext } from 'react';
import { NotificationContext, type NotificationContextType } from '../contexts/NotificationContext';

export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }

  return context;
}

/**
 * Helper function to show a success notification
 */
export function useShowNotification() {
  const { addNotification } = useNotification();

  return {
    success: (title: string, message?: string, duration?: number) =>
      addNotification({
        type: 'success',
        title,
        ...(message !== undefined && { message }),
        ...(duration !== undefined && { duration }),
      }),
    error: (title: string, message?: string, duration?: number) =>
      addNotification({
        type: 'error',
        title,
        ...(message !== undefined && { message }),
        ...(duration !== undefined && { duration }),
      }),
    warning: (title: string, message?: string, duration?: number) =>
      addNotification({
        type: 'warning',
        title,
        ...(message !== undefined && { message }),
        ...(duration !== undefined && { duration }),
      }),
    info: (title: string, message?: string, duration?: number) =>
      addNotification({
        type: 'info',
        title,
        ...(message !== undefined && { message }),
        ...(duration !== undefined && { duration }),
      }),
  };
}

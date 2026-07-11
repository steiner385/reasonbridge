/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo } from 'react';
import type { Toast } from '../components/notifications/Toast';
import { ToastContainer } from '../components/notifications/ToastContainer';
import { NotificationContext } from './NotificationContextFactory';

export interface NotificationContextType {
  addNotification: (notification: Omit<Toast, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export { NotificationContext } from './NotificationContextFactory';

// Provider component exported separately to satisfy react-refresh only-export-components
function NotificationProviderComponent({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addNotification = useCallback((notification: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { ...notification, id };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setToasts([]);
  }, []);

  // Memoize the context value so notification state changes only re-render the
  // ToastContainer, not every consumer of the notification API. See issue #1387.
  const value = useMemo(
    () => ({ addNotification, removeNotification, clearNotifications }),
    [addNotification, removeNotification, clearNotifications],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeNotification} />
    </NotificationContext.Provider>
  );
}

export const NotificationProvider = NotificationProviderComponent;

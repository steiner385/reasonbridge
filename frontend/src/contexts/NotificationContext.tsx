import { useState, useCallback } from 'react';
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

  return (
    <NotificationContext.Provider
      value={{ addNotification, removeNotification, clearNotifications }}
    >
      {children}
      <ToastContainer toasts={toasts} onClose={removeNotification} />
    </NotificationContext.Provider>
  );
}

export const NotificationProvider = NotificationProviderComponent;

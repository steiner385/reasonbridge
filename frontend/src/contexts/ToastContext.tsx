/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import ToastContainer from '../components/ui/ToastContainer';
import type { ToastVariant } from '../components/ui/Toast';

export interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

export interface ToastContextType {
  /**
   * Show a success toast
   */
  success: (message: string, duration?: number) => void;

  /**
   * Show an error toast
   */
  error: (message: string, duration?: number) => void;

  /**
   * Show a warning toast
   */
  warning: (message: string, duration?: number) => void;

  /**
   * Show an info toast
   */
  info: (message: string, duration?: number) => void;

  /**
   * Show a custom toast
   */
  show: (message: string, variant: ToastVariant, duration?: number) => void;

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (id: string) => void;

  /**
   * Dismiss all toasts
   */
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export interface ToastProviderProps {
  children: ReactNode;
  /**
   * Default duration for toasts in milliseconds
   */
  defaultDuration?: number;
  /**
   * Position of toast container
   */
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
}

/**
 * ToastProvider - Provides toast notification functionality to the app
 *
 * Wrap your app with this provider to enable toast notifications:
 *
 * @example
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 */
export function ToastProvider({
  children,
  defaultDuration = 5000,
  position = 'top-right',
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const show = useCallback(
    (message: string, variant: ToastVariant, duration: number = defaultDuration) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastData = {
        id,
        message,
        variant,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    [defaultDuration],
  );

  const success = useCallback(
    (message: string, duration?: number) => {
      show(message, 'success', duration);
    },
    [show],
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      show(message, 'error', duration);
    },
    [show],
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      show(message, 'warning', duration);
    },
    [show],
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      show(message, 'info', duration);
    },
    [show],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextType = {
    success,
    error,
    warning,
    info,
    show,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} position={position} />
    </ToastContext.Provider>
  );
}

/**
 * useToast - Hook to access toast notification functionality
 *
 * @example
 * function MyComponent() {
 *   const toast = useToast();
 *
 *   const handleSave = () => {
 *     try {
 *       // ... save logic
 *       toast.success('Saved successfully!');
 *     } catch (error) {
 *       toast.error('Failed to save');
 *     }
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

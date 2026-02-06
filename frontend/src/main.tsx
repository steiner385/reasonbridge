/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './lib';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/error/ErrorBoundary';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <NotificationProvider>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <SidebarProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </SidebarProvider>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </NotificationProvider>
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>,
);

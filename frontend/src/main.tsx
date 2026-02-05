import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './lib';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { ToastProvider } from './contexts/ToastContext';
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
              <SidebarProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </SidebarProvider>
            </ToastProvider>
          </ThemeProvider>
        </NotificationProvider>
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>,
);

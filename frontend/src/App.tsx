/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useRoutes, useLocation } from 'react-router-dom';
import { routes } from './routes';
import { Header } from './components/layouts/Header';
import { Sidebar } from './components/layouts/Sidebar';
import { MobileDrawer } from './components/layouts/MobileDrawer';
import { OfflineIndicator } from './components/ui/OfflineIndicator';
import { PanicButton, type SafetyReportReason } from './components/safety';
import { LoginModalProvider } from './contexts/LoginModalContext';
import { useSidebar } from './hooks/useSidebar';
import { useIsMobileViewport } from './hooks/useMediaQuery';
import { submitSafetyReport, type SubmitSafetyReportRequest } from './lib/moderation-api';

/**
 * Main App component with conditional layout.
 * - Landing page ('/'): No global header/footer (page has its own)
 * - Other pages: App layout with Header, Sidebar, and main content area
 */
function App() {
  const routing = useRoutes(routes);
  const location = useLocation();
  const { isCollapsed } = useSidebar();
  const isMobile = useIsMobileViewport();

  /**
   * Handle safety report submission from panic button
   * Sends report to moderation service for moderator review
   */
  const handleSafetyReport = useCallback(
    async (data: { reason: SafetyReportReason; additionalInfo?: string }) => {
      // Filter out EXIT_QUICKLY as it's handled by immediate navigation
      if (data.reason === 'EXIT_QUICKLY') {
        return;
      }

      const request: SubmitSafetyReportRequest = {
        reason: data.reason as SubmitSafetyReportRequest['reason'],
        additionalInfo: data.additionalInfo,
      };

      try {
        await submitSafetyReport(request);
        // Report submitted successfully - no toast needed as dialog closes
      } catch (error) {
        // Log error but don't show toast to avoid scaring the child
        console.error('Failed to submit safety report:', error);
      }
    },
    [],
  );

  // Landing page and auth pages have their own complete layout
  const isStandalonePage = ['/', '/register', '/signup', '/forgot-password'].includes(
    location.pathname,
  );

  if (isStandalonePage) {
    return (
      <LoginModalProvider>
        <OfflineIndicator />
        <PanicButton onReport={handleSafetyReport} />
        {routing}
      </LoginModalProvider>
    );
  }

  // App layout with Header + Sidebar for authenticated pages
  return (
    <LoginModalProvider>
      {/* Offline status indicator */}
      <OfflineIndicator />

      {/* Child safety panic button - only visible to minor users */}
      <PanicButton onReport={handleSafetyReport} />

      {/* Skip to main content link (WCAG 2.4.1 Level A) */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex">
          {/* Desktop Sidebar */}
          {!isMobile && <Sidebar />}

          {/* Mobile Drawer */}
          {isMobile && <MobileDrawer />}

          {/* Main Content */}
          <main
            id="main-content"
            className={`flex-1 transition-all duration-300 ${
              !isMobile && !isCollapsed ? 'ml-64' : 'ml-0'
            }`}
          >
            <div className="px-4 py-6 sm:px-6 lg:px-8">{routing}</div>
          </main>
        </div>
      </div>
    </LoginModalProvider>
  );
}

export default App;

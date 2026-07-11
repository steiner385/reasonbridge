/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef } from 'react';
import { useRoutes, useLocation } from 'react-router-dom';
import { routes } from './routes';
import { Header } from './components/layouts/Header';
import { Sidebar } from './components/layouts/Sidebar';
import { MobileDrawer } from './components/layouts/MobileDrawer';
import { OfflineIndicator } from './components/ui/OfflineIndicator';
import { PanicButton, type SafetyReportReason } from './components/safety';
import { LoginModalProvider } from './contexts/LoginModalContext';
import { TourProvider } from './components/tours';
import { useSidebar } from './hooks/useSidebar';
import { useIsMobileViewport } from './hooks/useMediaQuery';
import { submitSafetyReport, type SubmitSafetyReportRequest } from './lib/moderation-api';

// Page titles for routes that don't set their own via useDocumentMeta (WCAG 2.4.2)
const ROUTE_TITLES: Record<string, string> = {
  '/about': 'About',
  '/profile': 'My Profile',
  '/settings': 'Settings',
  '/settings/feedback': 'Feedback Preferences',
  '/notifications': 'Notifications',
  '/feed': 'Activity Feed',
  '/bookmarks': 'Bookmarks',
  '/search': 'Search Results',
  '/admin/moderation': 'Moderation Dashboard',
  '/admin/safety-reports': 'Safety Reports',
  '/admin/ranking': 'Ranking Analytics',
  '/appeals': 'Appeals',
  '/simulator': 'Discussion Simulator',
  '/terms': 'Terms of Service',
  '/privacy': 'Privacy Policy',
  '/verification': 'Verification',
};

function getRouteTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith('/discussions/')) return 'Discussion';
  if (pathname.startsWith('/profile/')) return 'User Profile';
  if (pathname.startsWith('/topics/')) return 'Topic';
  if (pathname.startsWith('/parental-consent/')) return 'Parental Consent';
  if (pathname.startsWith('/parental-dashboard/')) return 'Parental Dashboard';
  if (pathname.startsWith('/onboarding/')) return 'Orientation';
  return 'ReasonBridge';
}

/**
 * Main App component with conditional layout.
 * - Landing page ('/'): No global header/footer (page has its own)
 * - Other pages: App layout with Header, Sidebar, and main content area
 */
function App() {
  const routing = useRoutes(routes);
  const location = useLocation();
  const { isCollapsed, sidebarMode } = useSidebar();
  const isMobile = useIsMobileViewport();
  const mainRef = useRef<HTMLElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);

  // On pathname change: update document.title and announce for screen readers (WCAG 2.4.2 / 2.4.3).
  // Runs on pathname only — search-param changes (e.g. ?topic=) intentionally do not trigger this.
  useEffect(() => {
    const title = getRouteTitle(location.pathname);
    document.title = `${title} | ReasonBridge`;
    if (announcerRef.current) {
      announcerRef.current.textContent = '';
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = `Navigated to ${title}`;
        }
      }, 100);
    }
    mainRef.current?.focus();
  }, [location.pathname]);

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
  const isStandalonePage = [
    '/',
    '/register',
    '/signup',
    '/login',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
  ].includes(location.pathname);

  if (isStandalonePage) {
    return (
      <TourProvider>
        <LoginModalProvider>
          <OfflineIndicator />
          <PanicButton onReport={handleSafetyReport} />
          {/* Skip to main content link (WCAG 2.4.1 Level A) */}
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          {routing}
        </LoginModalProvider>
      </TourProvider>
    );
  }

  // App layout with Header + Sidebar for authenticated pages
  return (
    <TourProvider>
      <LoginModalProvider>
        {/* Offline status indicator */}
        <OfflineIndicator />

        {/* Child safety panic button - only visible to minor users */}
        <PanicButton onReport={handleSafetyReport} />

        {/* Skip to main content link (WCAG 2.4.1 Level A) */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
          <Header />

          {/* Mobile Drawer - rendered outside flex container to avoid stacking context issues */}
          {isMobile && <MobileDrawer />}

          <div className="flex">
            {/* Desktop Sidebar */}
            {!isMobile && <Sidebar />}

            {/* Main Content */}
            {/* tabIndex={-1} enables programmatic focus on route change for keyboard/screen-reader users */}
            <main
              ref={mainRef}
              id="main-content"
              tabIndex={-1}
              className={`flex-1 transition-all duration-300 focus:outline-none ${
                !isMobile
                  ? sidebarMode === 'topics'
                    ? isCollapsed
                      ? 'ml-20' // Topics mode collapsed: 80px
                      : 'ml-80' // Topics mode expanded: 320px
                    : isCollapsed
                      ? 'ml-20' // Full mode collapsed: 80px
                      : 'ml-64' // Full mode expanded: 256px
                  : 'ml-0' // Mobile: no margin
              }`}
            >
              {/* Route announcer: visually hidden, announces page changes to screen readers */}
              <div ref={announcerRef} aria-live="polite" aria-atomic="true" className="sr-only" />
              {/* key on pathname only — search params (e.g. ?topic=) must not remount the page */}
              <div key={location.pathname} className="px-4 py-6 sm:px-6 lg:px-8 route-content">
                {routing}
              </div>
            </main>
          </div>

          {/* Footer landmark for WCAG compliance */}
          <footer
            className={`
            py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-400
            border-t border-gray-200 dark:border-gray-800
            transition-all duration-300
            ${
              !isMobile
                ? sidebarMode === 'topics'
                  ? isCollapsed
                    ? 'ml-20'
                    : 'ml-80'
                  : isCollapsed
                    ? 'ml-20'
                    : 'ml-64'
                : 'ml-0'
            }
          `}
          >
            © 2026 ReasonBridge. Building bridges through rational discussion.
          </footer>
        </div>
      </LoginModalProvider>
    </TourProvider>
  );
}

export default App;

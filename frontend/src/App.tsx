/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRoutes, useLocation } from 'react-router-dom';
import { routes } from './routes';
import { Header } from './components/layouts/Header';
import { Sidebar } from './components/layouts/Sidebar';
import { MobileDrawer } from './components/layouts/MobileDrawer';
import { OfflineIndicator } from './components/ui/OfflineIndicator';
import { LoginModalProvider } from './contexts/LoginModalContext';
import { useSidebar } from './hooks/useSidebar';
import { useIsMobileViewport } from './hooks/useMediaQuery';

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

  // Landing page and auth pages have their own complete layout
  const isStandalonePage = ['/', '/register', '/signup', '/forgot-password'].includes(
    location.pathname,
  );

  if (isStandalonePage) {
    return (
      <LoginModalProvider>
        <OfflineIndicator />
        {routing}
      </LoginModalProvider>
    );
  }

  // App layout with Header + Sidebar for authenticated pages
  return (
    <LoginModalProvider>
      {/* Offline status indicator */}
      <OfflineIndicator />

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
          <main
            id="main-content"
            className={`flex-1 transition-all duration-300 ${
              !isMobile
                ? sidebarMode === 'topics'
                  ? 'ml-80' // Topics mode: 320px sidebar (never collapses)
                  : isCollapsed
                    ? 'ml-20' // Full mode collapsed: 80px
                    : 'ml-64' // Full mode expanded: 256px
                : 'ml-0' // Mobile: no margin
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

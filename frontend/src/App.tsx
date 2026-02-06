/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRoutes, useLocation } from 'react-router-dom';
import { routes } from './routes';
import { Header } from './components/layouts/Header';
import { Sidebar } from './components/layouts/Sidebar';
import { MobileDrawer } from './components/layouts/MobileDrawer';
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
  const { isCollapsed } = useSidebar();
  const isMobile = useIsMobileViewport();

  // Landing page and auth pages have their own complete layout
  const isStandalonePage = ['/', '/register', '/signup', '/forgot-password'].includes(
    location.pathname,
  );

  if (isStandalonePage) {
    return <LoginModalProvider>{routing}</LoginModalProvider>;
  }

  // App layout with Header + Sidebar for authenticated pages
  return (
    <LoginModalProvider>
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

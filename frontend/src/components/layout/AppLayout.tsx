import { Outlet } from 'react-router-dom';
import { Header } from '../layouts/Header';
import { Sidebar } from '../layouts/Sidebar';
import { MobileDrawer } from '../layouts/MobileDrawer';
import { useSidebar } from '../../hooks/useSidebar';

/**
 * AppLayout provides the shared header, sidebar, and footer for internal app pages.
 * The landing page is standalone and doesn't use this layout.
 *
 * Layout structure:
 * - Fixed header at top
 * - Collapsible sidebar on desktop (left side)
 * - Slide-out drawer on mobile
 * - Main content area with responsive margins
 * - Footer at bottom
 */
export const AppLayout: React.FC = () => {
  const { isCollapsed } = useSidebar();

  // TODO: Replace with actual notification count from API
  const unreadCount = 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header - Fixed at top */}
      <Header unreadCount={unreadCount} />

      {/* Sidebar - Desktop only, collapsible */}
      <Sidebar unreadCount={unreadCount} />

      {/* Mobile Drawer - Mobile only, slide-out */}
      <MobileDrawer unreadCount={unreadCount} />

      {/* Main Content - Responsive margin to account for sidebar */}
      <main
        className={`
          flex-1 pt-4 pb-8 px-4
          transition-all duration-300 ease-in-out
          md:ml-20 md:pl-4
          ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}
        `}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`
          bg-gray-800 text-gray-300 py-6 px-4
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}
        `}
      >
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm">
            © 2026 ReasonBridge. Building bridges through rational discussion.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSidebar } from '../../hooks/useSidebar';
import { Navigation } from './Navigation';

/**
 * MobileDrawer Component
 * Slide-out drawer navigation for mobile viewports (< 768px)
 * Includes backdrop overlay and closes on navigation, backdrop click, or Escape key
 */

interface MobileDrawerProps {
  /** Optional unread notification count */
  unreadCount?: number;
  /** Optional user profile data */
  user?: {
    displayName: string;
    email: string;
    avatarUrl?: string;
  } | null;
}

export function MobileDrawer({ unreadCount = 0, user }: MobileDrawerProps) {
  const { isMobileOpen, closeMobile } = useSidebar();
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Close drawer on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileOpen) {
        closeMobile();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileOpen, closeMobile]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Focus trap: Keep focus within drawer when open
  useEffect(() => {
    if (!isMobileOpen) return;

    // Store the element that had focus before drawer opened
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the drawer itself
    drawerRef.current?.focus();

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select',
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: Move focus backward
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: Move focus forward
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    // Restore focus when drawer closes
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      previousFocusRef.current?.focus();
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        ref={drawerRef}
        tabIndex={-1}
        className={`
          fixed left-0 top-0 bottom-0 z-50 w-64
          flex flex-col
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-300 ease-in-out
          md:hidden
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Mobile navigation drawer"
        aria-hidden={!isMobileOpen}
      >
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"
            onClick={closeMobile}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-8 w-8 text-blue-600 dark:text-blue-500"
            >
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
            <span>ReasonBridge</span>
          </Link>

          <button
            onClick={closeMobile}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Close navigation drawer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto p-4">
          <Navigation unreadCount={unreadCount} onNavigate={closeMobile} />
        </div>

        {/* User Profile Section (bottom) */}
        {user && (
          <div className="border-t border-gray-200 p-4 dark:border-gray-800">
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={closeMobile}
              aria-label="View profile"
            >
              {/* Avatar */}
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}

              {/* User Info */}
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {user.displayName}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

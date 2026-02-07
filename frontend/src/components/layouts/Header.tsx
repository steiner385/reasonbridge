/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { useSidebar } from '../../hooks/useSidebar';
import { useIsMobileViewport } from '../../hooks/useMediaQuery';
import { useTheme } from '../../hooks/useTheme';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { useAuth } from '../../hooks/useAuth';
import { NotificationDropdown } from '../notifications/NotificationDropdown';

/**
 * Header Component
 * Persistent top header with logo, mobile menu toggle, search, notifications, and profile
 * Responsive: Shows mobile menu button on small screens, full header on desktop
 */

export function Header() {
  const { isCollapsed, toggleCollapsed, toggleMobile } = useSidebar();
  const isMobile = useIsMobileViewport();
  const { isDark, toggleTheme } = useTheme();
  const { openModal: openLoginModal } = useLoginModal();
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-16 items-center justify-between gap-4 px-4">
        {/* Left: Logo + Menu Toggle */}
        <div className="flex items-center gap-3">
          {isMobile ? (
            // Mobile: Hamburger menu button
            <button
              onClick={toggleMobile}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Toggle mobile menu"
              aria-expanded={false}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          ) : (
            // Desktop: Sidebar collapse toggle
            <button
              onClick={toggleCollapsed}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isCollapsed}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          )}

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            {isMobile ? (
              <img
                src="/assets/brand/logo-icon.svg"
                alt="ReasonBridge"
                className="h-8 w-8 dark:brightness-110"
              />
            ) : (
              <img
                src="/assets/brand/logo-full.svg"
                alt="ReasonBridge"
                className="h-8 dark:brightness-110"
              />
            )}
          </Link>
        </div>

        {/* Center: Search (desktop only) */}
        {!isMobile && (
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <input
                type="search"
                placeholder="Search topics, discussions..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                aria-label="Search"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Right: Theme Toggle + Notifications + Profile */}
        <div className="flex items-center gap-2">
          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              // Sun icon for light mode
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                />
              </svg>
            ) : (
              // Moon icon for dark mode
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                />
              </svg>
            )}
          </button>

          {/* Notifications dropdown */}
          <NotificationDropdown />

          {/* Profile button */}
          {isLoading ? (
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          ) : user ? (
            <Link
              to="/profile"
              className="flex h-10 items-center gap-2 rounded-lg px-3 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Profile"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {!isMobile && (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.displayName}
                </span>
              )}
            </Link>
          ) : (
            <button
              onClick={openLoginModal}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

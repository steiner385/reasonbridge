/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Outlet, Link } from 'react-router-dom';

/**
 * AppLayout provides the shared header and footer for internal app pages.
 * The landing page is standalone and doesn't use this layout.
 */
export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary-500 text-white py-4 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/assets/logos/reasonbridge-icon.svg" alt="" className="h-10 w-10" />
            <div>
              <h1 className="text-2xl font-bold">ReasonBridge</h1>
              <p className="text-primary-100 text-sm">Find common ground</p>
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/topics"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              Topics
            </Link>
            <Link
              to="/profile"
              className="text-white/90 hover:text-white transition-colors font-medium"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-4 py-8 bg-gray-50">
        <Outlet />
      </main>
      <footer className="bg-gray-800 text-gray-300 py-6 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm">
            © 2026 ReasonBridge. Building bridges through rational discussion.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;

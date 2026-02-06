/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * Props for LandingLayout component
 */
interface LandingLayoutProps {
  /** Child content to render */
  children: React.ReactNode;
}

/**
 * LandingLayout - Layout wrapper for the landing page that opts out of App.tsx global wrapper
 *
 * This component provides a clean slate for the landing page with its own header/footer,
 * allowing it to have a different visual treatment than authenticated/internal pages.
 *
 * The landing page uses this layout to:
 * - Display its own branded header with navigation
 * - Show marketing-focused footer
 * - Avoid duplicate headers/footers from App.tsx
 */
export const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {
  return <div className="min-h-screen flex flex-col">{children}</div>;
};

export default LandingLayout;

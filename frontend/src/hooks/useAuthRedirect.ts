/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

/**
 * Hook to redirect authenticated users away from the landing page to topics
 *
 * When an authenticated user visits the root URL (/), they should be
 * redirected to /topics?welcome=true to show them a welcome banner.
 *
 * @param redirectPath - The path to redirect to (default: '/topics')
 * @param showWelcome - Whether to add ?welcome=true query param (default: true)
 */
export function useAuthRedirect(
  redirectPath: string = '/topics',
  showWelcome: boolean = true,
): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if user is authenticated
    if (authService.isAuthenticated()) {
      // Build redirect URL with optional welcome param
      const url = showWelcome ? `${redirectPath}?welcome=true` : redirectPath;

      // Replace current history entry so back button doesn't loop
      navigate(url, { replace: true });
    }
  }, [navigate, redirectPath, showWelcome, location.pathname]);
}

export default useAuthRedirect;

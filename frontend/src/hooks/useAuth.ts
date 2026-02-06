/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useAuth Hook
 *
 * Provides authentication state and user information from AuthContext
 * Must be used within AuthProvider component tree
 */

import { useAuthContext } from '../contexts/AuthContext';

export function useAuth() {
  return useAuthContext();
}

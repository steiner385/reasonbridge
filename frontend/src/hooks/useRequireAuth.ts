/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useLoginModal } from '../contexts/LoginModalContext';
import { useAuth } from './useAuth';

/**
 * Hook that combines authentication check with login modal trigger
 *
 * Use this hook to protect interactive actions that require authentication.
 * When an unauthenticated user triggers an action, the login modal opens
 * instead of executing the action. After login, users can retry the action.
 *
 * @example
 * ```tsx
 * function BookmarkButton({ topicId }: Props) {
 *   const { requireAuth, isAuthenticated } = useRequireAuth();
 *   const bookmarkMutation = useBookmark();
 *
 *   const handleClick = () => {
 *     requireAuth(() => {
 *       bookmarkMutation.mutate(topicId);
 *     });
 *   };
 *
 *   return <button onClick={handleClick}>Bookmark</button>;
 * }
 * ```
 */
export function useRequireAuth() {
  const { isAuthenticated, user } = useAuth();
  const { openModal } = useLoginModal();

  /**
   * Wrap an action to require authentication
   *
   * If the user is authenticated, the action executes immediately.
   * If not authenticated, the login modal opens instead.
   *
   * @param action - The action to execute if authenticated
   */
  const requireAuth = useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
      } else {
        openModal();
      }
    },
    [isAuthenticated, openModal],
  );

  return { isAuthenticated, user, requireAuth };
}

export default useRequireAuth;

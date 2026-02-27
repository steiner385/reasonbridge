/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Topic navigation state and actions
 */
export interface UseTopicNavigationReturn {
  /** Currently selected topic ID (from URL query param) */
  activeTopicId: string | null;
  /** Navigate to a topic (updates URL) */
  navigateToTopic: (topicId: string) => void;
  /** Clear topic selection (removes query param) */
  clearTopic: () => void;
  /** Check if a topic is active */
  isTopicActive: (topicId: string) => boolean;
}

/**
 * Custom hook for managing topic navigation with URL synchronization
 * Uses query parameter ?topic=id for client-side topic switching without page reloads
 *
 * @returns Topic navigation state and actions
 *
 * @example
 * ```tsx
 * function DiscussionPage() {
 *   const { activeTopicId, navigateToTopic, isTopicActive } = useTopicNavigation();
 *
 *   return (
 *     <div>
 *       <button onClick={() => navigateToTopic('topic-123')}>
 *         Select Topic
 *       </button>
 *       {activeTopicId && <p>Active: {activeTopicId}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTopicNavigation(): UseTopicNavigationReturn {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive activeTopicId directly from location - using useMemo to parse search params
  // This ensures we always get the current URL state on every location change
  const activeTopicId = useMemo(() => {
    // Check for topic in URL path (e.g., /topics/123)
    const pathMatch = location.pathname.match(/^\/topics\/([^/]+)/);
    if (pathMatch?.[1]) {
      return pathMatch[1];
    }
    // Fall back to query param (?topic=123)
    const params = new URLSearchParams(location.search);
    return params.get('topic');
  }, [location.pathname, location.search]);

  /**
   * Navigate to a topic discussion
   * Updates the URL query parameter to show the topic in /discussions
   */
  const navigateToTopic = useCallback(
    (topicId: string) => {
      // Navigate directly to /discussions with topic query param
      // This avoids the redirect chain through /topics/:id
      navigate(`/discussions?topic=${topicId}`);
    },
    [navigate],
  );

  /**
   * Clear topic selection by removing the query parameter
   */
  const clearTopic = useCallback(() => {
    // Navigate to discussions without topic param
    navigate('/discussions', { replace: false });
  }, [navigate]);

  /**
   * Check if a specific topic is currently active
   */
  const isTopicActive = useCallback(
    (topicId: string) => {
      return activeTopicId === topicId;
    },
    [activeTopicId],
  );

  return {
    activeTopicId,
    navigateToTopic,
    clearTopic,
    isTopicActive,
  };
}

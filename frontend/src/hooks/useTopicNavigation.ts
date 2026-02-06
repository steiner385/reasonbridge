/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams, setSearchParams] = useSearchParams();
  // Note: useNavigate() not currently needed as we use setSearchParams for navigation
  const [activeTopicId, setActiveTopicId] = useState<string | null>(() => {
    return searchParams.get('topic');
  });

  // Sync activeTopicId with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const topicId = searchParams.get('topic');
    setActiveTopicId(topicId);
  }, [searchParams]);

  /**
   * Navigate to a topic by updating the URL query parameter
   * Uses client-side navigation (no page reload)
   */
  const navigateToTopic = useCallback(
    (topicId: string) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('topic', topicId);
      setSearchParams(newSearchParams, { replace: false });
    },
    [searchParams, setSearchParams],
  );

  /**
   * Clear topic selection by removing the query parameter
   */
  const clearTopic = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('topic');
    setSearchParams(newSearchParams, { replace: false });
  }, [searchParams, setSearchParams]);

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

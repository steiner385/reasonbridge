/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { TopicNavigationContent } from '../topics/TopicNavigationContent';
import { useDiscussionLayout } from '../../contexts/DiscussionLayoutContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import type { Topic } from '../../types/topic';

/**
 * TopicNavigationPanel props
 */
export interface TopicNavigationPanelProps {
  /** Array of all topics to display */
  topics: Topic[];
  /** Map of topic IDs to unread status */
  unreadMap?: Map<string, boolean>;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Height of the panel in pixels (for virtual scrolling) */
  height?: number;
  /** CSS class name */
  className?: string;
}

/**
 * Topic navigation panel for left sidebar within DiscussionLayout
 *
 * @remarks
 * This component wraps TopicNavigationContent with a header that includes
 * a close button for tablet/mobile overlay mode.
 *
 * Note: With the unified sidebar implementation, this panel is typically
 * hidden (using hideSidebar={true} on DiscussionLayout) since topic
 * navigation is handled by the sidebar. However, it remains available
 * for use cases where a standalone topic panel is needed.
 *
 * @param props - Component props
 *
 * @example
 * ```tsx
 * <TopicNavigationPanel
 *   topics={topics}
 *   unreadMap={unreadMap}
 *   isLoading={isLoading}
 *   height={600}
 * />
 * ```
 */
export function TopicNavigationPanel({
  topics,
  unreadMap = new Map(),
  isLoading = false,
  error = null,
  height = 600,
  className = '',
}: TopicNavigationPanelProps) {
  const { closeLeftPanelOverlay } = useDiscussionLayout();
  const breakpoint = useBreakpoint();

  const showCloseButton = breakpoint === 'tablet' || breakpoint === 'mobile';

  // Calculate content height (subtract header height)
  const contentHeight = height - 56; // 56px for header

  return (
    <div className={`topic-navigation-panel flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Topics</h2>
        </div>
        {/* Close button for tablet/mobile overlay */}
        {showCloseButton && closeLeftPanelOverlay && (
          <button
            type="button"
            onClick={closeLeftPanelOverlay}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close topic navigation"
          >
            <svg
              className="w-6 h-6 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Topic Navigation Content */}
      <div className="flex-1 overflow-hidden">
        <TopicNavigationContent
          topics={topics}
          unreadMap={unreadMap}
          isLoading={isLoading}
          error={error}
          height={contentHeight}
        />
      </div>
    </div>
  );
}

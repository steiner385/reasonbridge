/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ChatMessageSkeleton - Loading placeholder for chat messages in discussion simulator
 * @module components/ui/skeletons/ChatMessageSkeleton
 */

import { Skeleton, SkeletonText, A11Y_PROPS } from '../Skeleton';

/**
 * Props for ChatMessageSkeleton component
 */
export interface ChatMessageSkeletonProps {
  /** Whether this is a persona (left-aligned) or user (right-aligned) message */
  isPersona?: boolean;
  /** Whether to show the typing indicator animation */
  showTypingIndicator?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * ChatMessageSkeleton renders a loading placeholder for chat messages.
 * Supports both persona (left-aligned) and user (right-aligned) message layouts
 * with an optional typing indicator animation.
 *
 * @remarks
 * - **Typing Indicator**: Three animated dots that bounce with staggered delays
 * - **Persona Messages**: Left-aligned with avatar on the left
 * - **User Messages**: Right-aligned with avatar on the right
 * - **Dark Mode**: Full support via Tailwind dark: modifier
 *
 * @example
 * // Persona message with typing indicator
 * <ChatMessageSkeleton isPersona showTypingIndicator />
 *
 * @example
 * // User message skeleton
 * <ChatMessageSkeleton isPersona={false} />
 *
 * @example
 * // Persona with content shimmer (no typing indicator)
 * <ChatMessageSkeleton isPersona showTypingIndicator={false} />
 */
export function ChatMessageSkeleton({
  isPersona = true,
  showTypingIndicator = true,
  className = '',
  'data-testid': testId = 'chat-message-skeleton',
}: ChatMessageSkeletonProps) {
  return (
    <div
      className={`flex ${isPersona ? 'justify-start' : 'justify-end'} mb-4 ${className}`}
      {...A11Y_PROPS}
      aria-label={`Loading ${isPersona ? 'persona' : 'user'} message`}
      data-testid={testId}
    >
      <div className={`flex items-start gap-3 max-w-[80%] ${isPersona ? '' : 'flex-row-reverse'}`}>
        {/* Avatar skeleton */}
        <div
          className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0"
          aria-hidden="true"
          data-testid={`${testId}-avatar`}
        />

        <div className={`flex flex-col ${isPersona ? 'items-start' : 'items-end'}`}>
          {/* Name skeleton */}
          <Skeleton width={96} height={16} className="mb-2" data-testid={`${testId}-name`} />

          {/* Message bubble */}
          <div
            className={`rounded-lg p-4 min-w-[120px] ${
              isPersona ? 'bg-gray-100 dark:bg-gray-800' : 'bg-blue-100 dark:bg-blue-900/30'
            }`}
            data-testid={`${testId}-bubble`}
          >
            {showTypingIndicator ? (
              /* Typing indicator with animated dots */
              <div
                className="flex items-center gap-1.5 py-1"
                aria-label="Typing"
                data-testid={`${testId}-typing-indicator`}
              >
                <span
                  className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                  aria-hidden="true"
                />
                <span
                  className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                  aria-hidden="true"
                />
                <span
                  className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                  aria-hidden="true"
                />
              </div>
            ) : (
              /* Shimmer content skeleton */
              <div data-testid={`${testId}-content`}>
                <SkeletonText lines={2} size="md" lastLineWidth={65} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatMessageSkeleton;

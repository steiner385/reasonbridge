/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Props for the TypingIndicator component
 */
export interface TypingIndicatorProps {
  /** The typing message to display (e.g., "Alice is typing...") */
  message: string | null;
  /** Optional CSS class name for additional styling */
  className?: string;
}

/**
 * TypingIndicator - Displays who is currently typing in a discussion
 *
 * Shows an animated typing indicator with bouncing dots when users are typing.
 * Returns null when no one is typing to avoid rendering empty space.
 *
 * @remarks
 * **Features:**
 * - Animated bouncing dots with staggered timing
 * - Dark mode support
 * - Graceful null return when no one is typing
 * - ARIA live region for accessibility
 *
 * **Animation:**
 * Uses CSS keyframe animation with staggered delays (0s, 0.2s, 0.4s)
 * for a smooth bouncing effect that indicates ongoing activity.
 *
 * @param props - Component props
 * @returns The typing indicator element or null if no one is typing
 *
 * @example
 * ```tsx
 * // Basic usage with useTypingIndicator hook
 * const { typingMessage } = useTypingIndicator({ topicId });
 *
 * return (
 *   <div>
 *     <ResponseList ... />
 *     <TypingIndicator message={typingMessage} />
 *   </div>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // With custom styling
 * <TypingIndicator
 *   message="Alice is typing..."
 *   className="mt-4 px-4"
 * />
 * ```
 */
export function TypingIndicator({ message, className = '' }: TypingIndicatorProps) {
  // Return null if no one is typing
  if (!message) {
    return null;
  }

  return (
    <div
      className={`
        flex items-center gap-2
        text-sm text-gray-500 dark:text-gray-400
        py-2 px-3
        ${className}
      `}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Animated bouncing dots */}
      <span className="flex gap-1" aria-hidden="true">
        <span
          className="
            w-1.5 h-1.5 rounded-full
            bg-gray-400 dark:bg-gray-500
            animate-typing-bounce
          "
          style={{ animationDelay: '0s' }}
        />
        <span
          className="
            w-1.5 h-1.5 rounded-full
            bg-gray-400 dark:bg-gray-500
            animate-typing-bounce
          "
          style={{ animationDelay: '0.2s' }}
        />
        <span
          className="
            w-1.5 h-1.5 rounded-full
            bg-gray-400 dark:bg-gray-500
            animate-typing-bounce
          "
          style={{ animationDelay: '0.4s' }}
        />
      </span>

      {/* Typing message */}
      <span className="italic">{message}</span>
    </div>
  );
}

export default TypingIndicator;

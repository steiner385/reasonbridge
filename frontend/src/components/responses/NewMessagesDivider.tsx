/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Props for the NewMessagesDivider component
 */
export interface NewMessagesDividerProps {
  /** Number of new messages to display in label (optional) */
  newMessageCount?: number;
  /** Custom label text (default: "New Messages") */
  label?: string;
  /** Optional CSS class name for additional styling */
  className?: string;
}

/**
 * NewMessagesDivider - Visual separator indicating where new/unread messages begin
 *
 * Displays a horizontal divider with "New Messages" text centered on a colored line.
 * Used to mark the boundary between read and unread responses in a discussion thread.
 *
 * @remarks
 * **Features:**
 * - Red/accent colored line for visual prominence
 * - Dark mode support with appropriate color variants
 * - Optional message count badge
 * - ARIA role="separator" for accessibility
 * - Smooth appearance with fade-in animation
 *
 * **Visual Design:**
 * - Full-width line with centered text label
 * - Red accent color (#ef4444 / red-500) to draw attention
 * - Semi-transparent background for text to overlay line
 * - 44px minimum height for touch accessibility
 *
 * @param props - Component props
 * @returns The divider element
 *
 * @example
 * ```tsx
 * // Basic usage
 * <NewMessagesDivider />
 *
 * // With message count
 * <NewMessagesDivider newMessageCount={5} />
 *
 * // With custom label
 * <NewMessagesDivider label="Unread Responses" />
 *
 * // With custom styling
 * <NewMessagesDivider className="my-6" />
 * ```
 *
 * @example
 * ```tsx
 * // In a response list with read state
 * const { readState } = useReadState(topicId);
 *
 * return (
 *   <div>
 *     {responses.map((response, index) => (
 *       <React.Fragment key={response.id}>
 *         {readState?.lastResponseId === responses[index - 1]?.id && (
 *           <NewMessagesDivider
 *             newMessageCount={responses.length - index}
 *           />
 *         )}
 *         <ResponseCard response={response} />
 *       </React.Fragment>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function NewMessagesDivider({
  newMessageCount,
  label = 'New Messages',
  className = '',
}: NewMessagesDividerProps) {
  // Format the display text
  const displayText = newMessageCount ? `${newMessageCount} ${label}` : label;

  return (
    <div
      className={`
        relative flex items-center justify-center
        py-3 my-4
        min-h-[44px]
        animate-fade-in
        ${className}
      `}
      role="separator"
      aria-label={displayText}
    >
      {/* Horizontal line behind text */}
      <div
        className="
          absolute inset-x-0 top-1/2 -translate-y-1/2
          h-[2px]
          bg-red-500 dark:bg-red-400
        "
        aria-hidden="true"
      />

      {/* Centered text label */}
      <span
        className="
          relative z-10
          px-4 py-1
          text-sm font-medium
          text-red-600 dark:text-red-400
          bg-white dark:bg-gray-900
          rounded-full
          select-none
        "
      >
        {displayText}
      </span>
    </div>
  );
}

export default NewMessagesDivider;

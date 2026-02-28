/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';

export interface MentionRendererProps {
  /** The text content containing @mentions in @[displayName](userId) format */
  content: string;
  /** Additional CSS classes to apply to the wrapper span */
  className?: string;
}

/** Regex pattern to match @[displayName](userId) mention format */
const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Renders text content with @mentions highlighted and linked to user profiles.
 *
 * @remarks
 * - **Mention format**: Parses the `@[displayName](userId)` format
 * - **Visual style**: Renders mentions with primary color and medium font weight
 * - **Navigation**: Links to `/profile/:userId` on click
 * - **Dark mode**: Full dark mode support via Tailwind `dark:` classes
 * - **Accessibility**: Uses semantic link elements for keyboard navigation
 *
 * @param props - Component props
 * @returns Span containing text with highlighted mention links
 *
 * @example
 * ```tsx
 * <MentionRenderer
 *   content="Hey @[John Doe](user-123), check this out!"
 *   className="text-gray-700"
 * />
 * // Renders: Hey <Link to="/profile/user-123">@John Doe</Link>, check this out!
 * ```
 */
export function MentionRenderer({
  content,
  className = '',
}: MentionRendererProps): React.ReactElement {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;

  // Use matchAll to get all matches without modifying global regex state
  const matches = Array.from(content.matchAll(MENTION_PATTERN));

  for (const match of matches) {
    const [fullMatch, displayName, userId] = match;
    const matchStart = match.index!;

    // Add text before this mention
    if (matchStart > lastIndex) {
      parts.push(content.substring(lastIndex, matchStart));
    }

    // Add the mention link
    parts.push(
      <Link
        key={`mention-${keyIndex++}`}
        to={`/profile/${userId}`}
        className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
        data-testid="mention-link"
        data-user-id={userId}
      >
        @{displayName}
      </Link>,
    );

    lastIndex = matchStart + fullMatch.length;
  }

  // Add remaining text after last mention
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  // If no mentions were found, return the content as-is
  if (parts.length === 0) {
    return <span className={className}>{content}</span>;
  }

  return <span className={className}>{parts}</span>;
}

export default MentionRenderer;

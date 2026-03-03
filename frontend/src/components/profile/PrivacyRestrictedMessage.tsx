/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PrivacyRestrictedMessage - Message shown when content is privacy-restricted
 *
 * Displays an informative message when a profile section is not visible
 * due to the user's privacy settings.
 */

import type { ProfileVisibility } from '../../types/user';

export interface PrivacyRestrictedMessageProps {
  /** Type of restriction */
  restrictionType: 'FOLLOWERS_ONLY' | 'PRIVATE';
  /** Custom message to display */
  customMessage?: string;
  /** Name of the restricted section (for default message) */
  sectionName?: string;
  /** Whether to show follow suggestion for FOLLOWERS_ONLY */
  showFollowSuggestion?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get default message based on restriction type
 */
function getDefaultMessage(
  restrictionType: ProfileVisibility,
  sectionName?: string,
): { title: string; description: string } {
  const section = sectionName || 'This section';

  if (restrictionType === 'FOLLOWERS_ONLY') {
    return {
      title: 'Followers Only',
      description: `${section} is only visible to followers.`,
    };
  }

  return {
    title: 'Private',
    description: `${section} is private.`,
  };
}

/**
 * PrivacyRestrictedMessage component
 */
export function PrivacyRestrictedMessage({
  restrictionType,
  customMessage,
  sectionName,
  showFollowSuggestion = true,
  className = '',
}: PrivacyRestrictedMessageProps) {
  const defaultMsg = getDefaultMessage(restrictionType, sectionName);
  const icon = restrictionType === 'FOLLOWERS_ONLY' ? '👥' : '🔒';

  return (
    <div
      className={`text-center py-6 px-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${className}`}
      role="status"
      aria-label={`Privacy restriction: ${defaultMsg.title}`}
    >
      <span className="text-3xl mb-3 block" aria-hidden="true">
        {icon}
      </span>
      <p className="font-medium text-gray-700 dark:text-gray-300">{defaultMsg.title}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {customMessage || defaultMsg.description}
      </p>
      {restrictionType === 'FOLLOWERS_ONLY' && showFollowSuggestion && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
          Follow this user to see this content
        </p>
      )}
    </div>
  );
}

export default PrivacyRestrictedMessage;

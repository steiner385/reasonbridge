/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ProfileBio - Displays user biography with optional edit mode
 *
 * Shows the user's bio with a character-limited display.
 * Supports inline editing for profile owners.
 */

import { useState } from 'react';

export interface ProfileBioProps {
  /** User's biography text */
  bio?: string | null;
  /** Maximum characters to display (default: 300) */
  maxLength?: number;
  /** Whether this is the user's own profile (enables editing) */
  isOwnProfile?: boolean;
  /** Callback when bio is updated */
  onUpdate?: (bio: string) => void;
  /** Whether update is in progress */
  isUpdating?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Profile bio display and edit component
 *
 * @remarks
 * **Features:**
 * - Character counter when editing
 * - Expandable text for long bios
 * - Inline editing with save/cancel
 *
 * @example
 * ```tsx
 * // View mode
 * <ProfileBio bio={user.bio} />
 *
 * // Edit mode
 * <ProfileBio
 *   bio={user.bio}
 *   isOwnProfile={true}
 *   onUpdate={handleBioUpdate}
 *   isUpdating={isPending}
 * />
 * ```
 */
export function ProfileBio({
  bio,
  maxLength = 300,
  isOwnProfile = false,
  onUpdate,
  isUpdating = false,
  className = '',
}: ProfileBioProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState(bio || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedBio.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedBio(bio || '');
    setIsEditing(false);
  };

  // Edit mode
  if (isEditing && isOwnProfile) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="relative">
          <textarea
            value={editedBio}
            onChange={(e) => setEditedBio(e.target.value.slice(0, maxLength))}
            placeholder="Tell others about yourself..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            rows={4}
            disabled={isUpdating}
            aria-label="Edit bio"
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {editedBio.length}/{maxLength}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  // Empty state for own profile
  if (!bio && isOwnProfile) {
    return (
      <div className={`${className}`}>
        <button
          onClick={() => setIsEditing(true)}
          className="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-400 dark:hover:text-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          + Add a bio to tell others about yourself
        </button>
      </div>
    );
  }

  // Empty state for other profiles
  if (!bio) {
    return (
      <div className={`text-gray-500 dark:text-gray-400 italic ${className}`}>No bio provided</div>
    );
  }

  // Display mode with optional expand
  const needsTruncation = bio.length > 200;
  const displayText = needsTruncation && !isExpanded ? bio.slice(0, 200) + '...' : bio;

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{displayText}</p>
      <div className="flex items-center gap-4">
        {needsTruncation && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
        {isOwnProfile && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

export default ProfileBio;

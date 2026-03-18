/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DiscoveredUsers component for showing contacts who are on ReasonBridge
 *
 * @remarks
 * Displays a "People You May Know" list of platform users who were discovered
 * from the user's imported contacts. Each discovered user shows their platform
 * display name and how they're connected through contacts.
 *
 * **Features:**
 * - Shows discovered users matched from imported contacts
 * - Displays platform username and contact relationship
 * - "Invite to Topic" button for each user
 * - Loading states with skeletons
 * - Empty state when no users discovered
 * - Dark mode support
 * - Touch-friendly (44px minimum tap targets)
 *
 * @example
 * ```tsx
 * <DiscoveredUsers
 *   className="max-w-lg"
 *   onInvite={(user) => openInviteModal(user)}
 * />
 * ```
 */

import Button from '../ui/Button';
import Card, { CardHeader, CardBody } from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { useDiscoveredUsers, type DiscoveredUser } from '../../hooks/useContacts';

// ==================
// Helper Functions
// ==================

/**
 * Get initials from a display name
 */
function getInitials(name: string | null): string {
  if (!name) return '?';

  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';

  const parts = trimmed.split(/\s+/);
  const firstName = parts[0] || '';

  if (parts.length === 1 || !firstName) {
    return firstName ? firstName.charAt(0).toUpperCase() : '?';
  }

  const lastName = parts[parts.length - 1] || '';
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

/**
 * Generate a consistent color based on user ID
 */
function getAvatarColor(userId: string): string {
  // Simple hash to get a consistent color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors: string[] = [
    'bg-blue-500 dark:bg-blue-600',
    'bg-green-500 dark:bg-green-600',
    'bg-purple-500 dark:bg-purple-600',
    'bg-orange-500 dark:bg-orange-600',
    'bg-pink-500 dark:bg-pink-600',
    'bg-teal-500 dark:bg-teal-600',
    'bg-indigo-500 dark:bg-indigo-600',
    'bg-rose-500 dark:bg-rose-600',
  ];

  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex] ?? 'bg-gray-500 dark:bg-gray-600';
}

// ==================
// Component Props
// ==================

export interface DiscoveredUsersProps {
  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Callback when user wants to invite a discovered user to a topic
   */
  onInvite?: (user: DiscoveredUser) => void;
}

// ==================
// User Row Component
// ==================

interface UserRowProps {
  user: DiscoveredUser;
  onInvite?: (user: DiscoveredUser) => void;
}

function UserRow({ user, onInvite }: UserRowProps) {
  const initials = getInitials(user.displayName);
  const avatarColor = getAvatarColor(user.userId);
  const platformName = user.displayName || 'Unknown User';
  const contactName = user.contactDisplayName;

  return (
    <div
      className={`
        p-4 rounded-lg
        bg-gray-50 dark:bg-gray-800/50
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-colors
      `}
      role="listitem"
      aria-label={`Discovered user: ${platformName}`}
    >
      {/* Top row: Avatar and name */}
      <div className="flex items-start gap-3">
        {/* Avatar with initials */}
        <div
          className={`
            shrink-0 w-12 h-12 rounded-full flex items-center justify-center
            ${avatarColor} text-white font-semibold text-sm
          `}
        >
          {initials}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{platformName}</p>
          {contactName && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              ({contactName} in your contacts)
            </p>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="mt-3 flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onInvite?.(user)}
          aria-label={`Invite ${platformName} to a topic`}
        >
          Invite to Topic
        </Button>
      </div>
    </div>
  );
}

// ==================
// User Row Skeleton Component
// ==================

function UserRowSkeleton() {
  return (
    <div
      className={`
        p-4 rounded-lg
        bg-gray-50 dark:bg-gray-800/50
        animate-pulse
      `}
      role="presentation"
      aria-hidden="true"
    >
      {/* Top row skeleton */}
      <div className="flex items-start gap-3">
        {/* Avatar skeleton */}
        <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600" />

        {/* Text skeleton */}
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
        </div>
      </div>

      {/* Button skeleton */}
      <div className="mt-3 flex justify-end">
        <div className="h-9 w-28 bg-gray-300 dark:bg-gray-600 rounded-md" />
      </div>
    </div>
  );
}

// ==================
// Main Component
// ==================

export function DiscoveredUsers({ className = '', onInvite }: DiscoveredUsersProps) {
  const { data, isLoading, refetch } = useDiscoveredUsers();

  // Loading state
  if (isLoading) {
    return (
      <Card variant="default" padding="lg" className={className}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            People You May Know
          </h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <UserRowSkeleton key={i} />
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  const users = data?.users ?? [];

  // Empty state
  if (users.length === 0) {
    return (
      <Card variant="default" padding="lg" className={className}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            People You May Know
          </h3>
        </CardHeader>
        <CardBody>
          <EmptyState
            title="No matches found"
            message="We couldn't find any of your contacts on ReasonBridge yet. Import more contacts or check back later."
            showAction={true}
            actionLabel="Refresh"
            onAction={() => refetch()}
            wrapped={false}
            icon={
              <svg
                className="h-8 w-8 text-gray-400 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="lg" className={className}>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          People You May Know
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your contacts who are already on ReasonBridge
        </p>
      </CardHeader>
      <CardBody>
        <div className="space-y-3" role="list" aria-label="Discovered users">
          {users.map((user) => (
            <UserRow key={user.userId} user={user} onInvite={onInvite} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export default DiscoveredUsers;

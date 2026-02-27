/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * InvitationCard component for displaying a single topic invitation
 *
 * @remarks
 * Displays an individual invitation card with different layouts for sent vs received invitations.
 * Received invitations show accept/decline actions, while sent invitations show status.
 *
 * **Features:**
 * - Different layouts for sent vs received invitations
 * - Status indicators with color coding (pending, accepted, declined, expired)
 * - Time remaining until expiry
 * - Accept/Decline buttons for received pending invitations
 * - Dark mode support
 * - Touch-friendly (44px minimum tap targets)
 *
 * @example
 * ```tsx
 * // Received invitation
 * <InvitationCard
 *   invitation={invitation}
 *   type="received"
 *   onAccept={(id) => acceptInvitation(id)}
 *   onDecline={(id) => declineInvitation(id)}
 * />
 *
 * // Sent invitation
 * <InvitationCard
 *   invitation={invitation}
 *   type="sent"
 * />
 * ```
 */

import Button from '../ui/Button';
import type { TopicInvitation, InvitationStatus } from '../../services/contactService';

// ==================
// Helper Functions
// ==================

/**
 * Format relative time from date (e.g., "2 days ago", "in 5 days")
 */
function formatRelativeTime(dateString: string, isFuture = false): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = isFuture ? date.getTime() - now.getTime() : now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMs < 0) {
    return 'expired';
  }

  if (diffDays >= 1) {
    const unit = diffDays === 1 ? 'day' : 'days';
    return isFuture ? `in ${diffDays} ${unit}` : `${diffDays} ${unit} ago`;
  }

  if (diffHours >= 1) {
    const unit = diffHours === 1 ? 'hour' : 'hours';
    return isFuture ? `in ${diffHours} ${unit}` : `${diffHours} ${unit} ago`;
  }

  if (diffMinutes >= 1) {
    const unit = diffMinutes === 1 ? 'minute' : 'minutes';
    return isFuture ? `in ${diffMinutes} ${unit}` : `${diffMinutes} ${unit} ago`;
  }

  return isFuture ? 'soon' : 'just now';
}

/**
 * Get status configuration (icon, color, label)
 */
function getStatusConfig(status: InvitationStatus): {
  icon: string;
  colorClass: string;
  bgClass: string;
  label: string;
} {
  switch (status) {
    case 'PENDING':
      return {
        icon: '\u23F3', // hourglass
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-100 dark:bg-amber-900/30',
        label: 'Pending',
      };
    case 'ACCEPTED':
      return {
        icon: '\u2713', // checkmark
        colorClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-900/30',
        label: 'Accepted',
      };
    case 'DECLINED':
      return {
        icon: '\u2717', // x mark
        colorClass: 'text-gray-600 dark:text-gray-400',
        bgClass: 'bg-gray-100 dark:bg-gray-800/50',
        label: 'Declined',
      };
    case 'EXPIRED':
      return {
        icon: '\u23F0', // alarm clock
        colorClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-100 dark:bg-red-900/30',
        label: 'Expired',
      };
    default:
      return {
        icon: '\u2022', // bullet
        colorClass: 'text-gray-600 dark:text-gray-400',
        bgClass: 'bg-gray-100 dark:bg-gray-800/50',
        label: 'Unknown',
      };
  }
}

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Get the display name for the invitee (email or user ID)
 */
function getInviteeDisplay(invitation: TopicInvitation): string {
  if (invitation.inviteeEmail) {
    return invitation.inviteeEmail;
  }
  if (invitation.inviteeUserId) {
    // In a real app, you might want to look up the user's display name
    return `User ${invitation.inviteeUserId.slice(0, 8)}`;
  }
  return 'Unknown';
}

// ==================
// Component Props
// ==================

export interface InvitationCardProps {
  /**
   * The invitation data to display
   */
  invitation: TopicInvitation;

  /**
   * Whether this is a sent or received invitation
   */
  type: 'sent' | 'received';

  /**
   * Callback when the invitation is accepted (received invitations only)
   */
  onAccept?: (id: string) => void;

  /**
   * Callback when the invitation is declined (received invitations only)
   */
  onDecline?: (id: string) => void;

  /**
   * Whether the accept action is loading
   */
  isAccepting?: boolean;

  /**
   * Whether the decline action is loading
   */
  isDeclining?: boolean;

  /**
   * Custom CSS class name
   */
  className?: string;
}

// ==================
// Mail Icon Components
// ==================

/**
 * Received mail icon
 */
function ReceivedMailIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 12h-6l-2 3H10l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

/**
 * Sent mail icon
 */
function SentMailIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

// ==================
// Status Badge Component
// ==================

interface StatusBadgeProps {
  status: InvitationStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
        ${config.bgClass} ${config.colorClass}
      `}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}

// ==================
// Main Component
// ==================

export function InvitationCard({
  invitation,
  type,
  onAccept,
  onDecline,
  isAccepting = false,
  isDeclining = false,
  className = '',
}: InvitationCardProps) {
  const isReceived = type === 'received';
  const isPending = invitation.status === 'PENDING';
  const isLoading = isAccepting || isDeclining;

  // Calculate time strings
  const sentTimeAgo = formatRelativeTime(invitation.createdAt, false);
  const expiresIn = formatRelativeTime(invitation.expiresAt, true);
  const isExpired = expiresIn === 'expired';

  // Topic title with fallback
  const topicTitle = invitation.topicTitle || 'Untitled Topic';

  // Handle actions
  const handleAccept = () => {
    if (onAccept && !isLoading) {
      onAccept(invitation.id);
    }
  };

  const handleDecline = () => {
    if (onDecline && !isLoading) {
      onDecline(invitation.id);
    }
  };

  return (
    <div
      className={`
        rounded-lg border p-4 sm:p-5
        bg-white dark:bg-gray-800
        border-gray-200 dark:border-gray-700
        transition-colors
        ${className}
      `}
      role="article"
      aria-label={
        isReceived
          ? `Invitation from ${invitation.inviterName || 'unknown'}`
          : `Invitation sent to ${getInviteeDisplay(invitation)}`
      }
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            ${
              isReceived
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }
          `}
        >
          {isReceived ? (
            <ReceivedMailIcon className="w-5 h-5" />
          ) : (
            <SentMailIcon className="w-5 h-5" />
          )}
        </div>

        {/* Title and subtitle */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {isReceived
              ? `Invitation from ${invitation.inviterName || 'Unknown User'}`
              : `Sent to ${getInviteeDisplay(invitation)}`}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 truncate mt-0.5">
            Topic: &quot;{truncateText(topicTitle, 40)}&quot;
          </p>
        </div>

        {/* Status badge (for sent invitations or non-pending received) */}
        {(!isReceived || !isPending) && (
          <div className="flex-shrink-0">
            <StatusBadge status={invitation.status} />
          </div>
        )}
      </div>

      {/* Message (if present) */}
      {invitation.message && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
          &quot;{truncateText(invitation.message, 100)}&quot;
        </p>
      )}

      {/* Time info */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-4">
        {type === 'sent' ? (
          <>
            <span>Sent {sentTimeAgo}</span>
            {!isExpired && isPending && (
              <>
                <span className="mx-2">&bull;</span>
                <span>Expires {expiresIn}</span>
              </>
            )}
          </>
        ) : (
          <>
            {!isExpired && isPending && <span>Expires {expiresIn}</span>}
            {isExpired && <span className="text-red-600 dark:text-red-400">Expired</span>}
          </>
        )}
      </div>

      {/* Actions (for received pending invitations only) */}
      {isReceived && isPending && !isExpired && (
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            disabled={isLoading}
            isLoading={isDeclining}
            aria-label={`Decline invitation to ${topicTitle}`}
          >
            Decline
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAccept}
            disabled={isLoading}
            isLoading={isAccepting}
            aria-label={`Accept invitation and join ${topicTitle}`}
          >
            Accept & Join
          </Button>
        </div>
      )}
    </div>
  );
}

export default InvitationCard;

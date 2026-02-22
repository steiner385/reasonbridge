/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * InvitationsList component for displaying sent and received topic invitations
 *
 * @remarks
 * Provides a tabbed interface for viewing both sent and received invitations.
 * Users can switch between tabs, accept/decline received invitations, and view
 * the status of sent invitations.
 *
 * **Features:**
 * - Tab navigation between sent/received invitations
 * - Badge counts on tabs showing pending invitation counts
 * - Accept/Decline actions for received pending invitations
 * - Status indicators for all invitations
 * - Loading states with skeletons
 * - Empty states for each tab
 * - Dark mode support
 * - Touch-friendly (44px minimum tap targets)
 *
 * @example
 * ```tsx
 * <InvitationsList className="max-w-2xl" />
 * ```
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useSentInvitations,
  useReceivedInvitations,
  useAcceptInvitation,
  useDeclineInvitation,
} from '../../hooks/useInvitations';
import Card, { CardHeader, CardBody } from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { InvitationCard } from './InvitationCard';

// ==================
// Types
// ==================

type TabType = 'received' | 'sent';

// ==================
// Component Props
// ==================

export interface InvitationsListProps {
  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Initial active tab (defaults to 'received')
   */
  initialTab?: TabType;

  /**
   * Callback when an invitation is accepted successfully
   */
  onInvitationAccepted?: (topicId: string) => void;
}

// ==================
// Tab Button Component
// ==================

interface TabButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ label, count, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-4 py-3 text-sm font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        min-h-[44px]
        ${
          isActive
            ? 'text-primary-700 dark:text-primary-400 border-b-2 border-primary-700 dark:border-primary-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-b-2 border-transparent'
        }
      `}
      id={`${label.toLowerCase()}-tab`}
      role="tab"
      aria-selected={isActive}
      aria-controls={`${label.toLowerCase()}-panel`}
    >
      <span>{label}</span>
      {count > 0 && (
        <span
          className={`
            ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium
            ${
              isActive
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }
          `}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

// ==================
// Skeleton Component
// ==================

function InvitationCardSkeleton() {
  return (
    <div
      className={`
        rounded-lg border p-4 sm:p-5
        bg-white dark:bg-gray-800
        border-gray-200 dark:border-gray-700
        animate-pulse
      `}
      role="presentation"
      aria-hidden="true"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Icon skeleton */}
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        {/* Title skeleton */}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </div>
        {/* Badge skeleton */}
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      {/* Message skeleton */}
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-3" />
      {/* Time skeleton */}
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
    </div>
  );
}

// ==================
// Empty State Icons
// ==================

function ReceivedEmptyIcon() {
  return (
    <svg
      className="h-8 w-8 text-gray-400 dark:text-gray-500"
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

function SentEmptyIcon() {
  return (
    <svg
      className="h-8 w-8 text-gray-400 dark:text-gray-500"
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
// Main Component
// ==================

export function InvitationsList({
  className = '',
  initialTab = 'received',
  onInvitationAccepted,
}: InvitationsListProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch invitations
  const { data: receivedData, isLoading: isLoadingReceived } = useReceivedInvitations();

  const { data: sentData, isLoading: isLoadingSent } = useSentInvitations();

  // Mutations
  const acceptInvitation = useAcceptInvitation({
    onSuccess: ({ topicId }) => {
      setProcessingId(null);
      onInvitationAccepted?.(topicId);
      // Navigate to the topic
      navigate(`/topics/${topicId}`);
    },
    onError: () => {
      setProcessingId(null);
    },
  });

  const declineInvitation = useDeclineInvitation({
    onSuccess: () => {
      setProcessingId(null);
    },
    onError: () => {
      setProcessingId(null);
    },
  });

  // Get counts (pending only for received)
  const receivedPendingCount = useMemo(() => {
    if (!receivedData?.invitations) return 0;
    return receivedData.invitations.filter((i) => i.status === 'PENDING').length;
  }, [receivedData]);

  const sentCount = sentData?.total ?? 0;

  // Get current list
  const receivedInvitations = receivedData?.invitations ?? [];
  const sentInvitations = sentData?.invitations ?? [];
  const isLoading = activeTab === 'received' ? isLoadingReceived : isLoadingSent;

  // Handle accept
  const handleAccept = (invitationId: string) => {
    setProcessingId(invitationId);
    acceptInvitation.mutate(invitationId);
  };

  // Handle decline
  const handleDecline = (invitationId: string) => {
    setProcessingId(invitationId);
    declineInvitation.mutate(invitationId);
  };

  return (
    <Card variant="default" padding="none" className={className}>
      {/* Header with tabs */}
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 mb-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Topic Invitations
        </h3>
        <div
          className="flex border-b border-gray-200 dark:border-gray-700"
          role="tablist"
          aria-label="Invitation tabs"
        >
          <TabButton
            label="Received"
            count={receivedPendingCount}
            isActive={activeTab === 'received'}
            onClick={() => setActiveTab('received')}
          />
          <TabButton
            label="Sent"
            count={sentCount}
            isActive={activeTab === 'sent'}
            onClick={() => setActiveTab('sent')}
          />
        </div>
      </CardHeader>

      <CardBody className="px-4 sm:px-6 py-4 sm:py-6">
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3" role="status" aria-label="Loading invitations">
            {[1, 2, 3].map((i) => (
              <InvitationCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Received tab content */}
        {!isLoading && activeTab === 'received' && (
          <div id="received-panel" role="tabpanel" aria-labelledby="received-tab">
            {receivedInvitations.length === 0 ? (
              <EmptyState
                title="No invitations"
                message="You haven't received any topic invitations yet. When someone invites you to join a discussion, it will appear here."
                icon={<ReceivedEmptyIcon />}
                showAction={false}
                wrapped={false}
              />
            ) : (
              <div className="space-y-3">
                {receivedInvitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    type="received"
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    isAccepting={processingId === invitation.id && acceptInvitation.isPending}
                    isDeclining={processingId === invitation.id && declineInvitation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sent tab content */}
        {!isLoading && activeTab === 'sent' && (
          <div id="sent-panel" role="tabpanel" aria-labelledby="sent-tab">
            {sentInvitations.length === 0 ? (
              <EmptyState
                title="No sent invitations"
                message="You haven't sent any topic invitations yet. Invite friends to join your discussions from the topic page."
                icon={<SentEmptyIcon />}
                showAction={false}
                wrapped={false}
              />
            ) : (
              <div className="space-y-3">
                {sentInvitations.map((invitation) => (
                  <InvitationCard key={invitation.id} invitation={invitation} type="sent" />
                ))}
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default InvitationsList;

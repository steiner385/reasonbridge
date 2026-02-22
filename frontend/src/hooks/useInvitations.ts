/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * React Query hooks for topic invitation management
 *
 * Provides queries and mutations for:
 * - Fetching sent and received invitations
 * - Creating new topic invitations
 * - Accepting or declining received invitations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contactService,
  type InvitationStatus,
  type TopicInvitation,
  type CreateInvitationRequest,
  type InvitationsListResponse,
} from '../services/contactService';

// ==================
// Query Keys
// ==================

/**
 * Query key factory for invitation-related queries
 * Enables fine-grained cache invalidation
 */
export const invitationKeys = {
  all: ['invitations'] as const,
  sent: (filters?: { status?: InvitationStatus; page?: number; limit?: number }) =>
    [...invitationKeys.all, 'sent', filters] as const,
  received: (filters?: { page?: number; limit?: number }) =>
    [...invitationKeys.all, 'received', filters] as const,
};

// ==================
// Query Hooks
// ==================

export interface UseSentInvitationsOptions {
  page?: number;
  limit?: number;
  status?: InvitationStatus;
  enabled?: boolean;
}

/**
 * Hook for fetching invitations sent by the current user
 *
 * @param options - Pagination, filter, and query options
 * @returns Query object with sent invitations data and state
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSentInvitations({
 *   page: 1,
 *   limit: 10,
 *   status: 'PENDING',
 * });
 *
 * return (
 *   <InvitationList
 *     invitations={data?.invitations ?? []}
 *     total={data?.total ?? 0}
 *     hasMore={data?.hasMore ?? false}
 *   />
 * );
 * ```
 */
export function useSentInvitations(options: UseSentInvitationsOptions = {}) {
  const { page = 1, limit = 20, status, enabled = true } = options;
  const filters = { page, limit, status };

  return useQuery<InvitationsListResponse, Error>({
    queryKey: invitationKeys.sent(filters),
    queryFn: () => contactService.getSentInvitations({ page, limit, status }),
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute - invitations may change status
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export interface UseReceivedInvitationsOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook for fetching invitations received by the current user
 *
 * @param options - Pagination and query options
 * @returns Query object with received invitations data and state
 *
 * @example
 * ```tsx
 * const { data, isLoading, refetch } = useReceivedInvitations({
 *   page: 1,
 *   limit: 10,
 * });
 *
 * return (
 *   <ReceivedInvitationList
 *     invitations={data?.invitations ?? []}
 *     onRefresh={refetch}
 *   />
 * );
 * ```
 */
export function useReceivedInvitations(options: UseReceivedInvitationsOptions = {}) {
  const { page = 1, limit = 20, enabled = true } = options;
  const filters = { page, limit };

  return useQuery<InvitationsListResponse, Error>({
    queryKey: invitationKeys.received(filters),
    queryFn: () => contactService.getReceivedInvitations({ page, limit }),
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute - invitations may change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });
}

// ==================
// Mutation Hooks
// ==================

export interface UseCreateInvitationOptions {
  onSuccess?: (data: TopicInvitation) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for creating a topic invitation
 *
 * @param options - Mutation callbacks
 * @returns Mutation object with createInvitation function
 *
 * @example
 * ```tsx
 * const { mutate: createInvitation, isPending } = useCreateInvitation({
 *   onSuccess: (invitation) => {
 *     toast.success('Invitation sent!');
 *   },
 *   onError: (error) => {
 *     toast.error(`Failed to send: ${error.message}`);
 *   },
 * });
 *
 * // Invite by user ID
 * createInvitation({
 *   topicId: 'topic-123',
 *   inviteeUserId: 'user-456',
 *   message: 'I thought you might find this discussion interesting!',
 * });
 *
 * // Or invite by email
 * createInvitation({
 *   topicId: 'topic-123',
 *   inviteeEmail: 'friend@example.com',
 * });
 * ```
 */
export function useCreateInvitation(options?: UseCreateInvitationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvitationRequest) => contactService.createInvitation(data),
    onSuccess: (data) => {
      // Invalidate sent invitations to show the new invitation
      queryClient.invalidateQueries({ queryKey: invitationKeys.sent() });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export interface UseAcceptInvitationOptions {
  onSuccess?: (data: { success: boolean; topicId: string }) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for accepting a topic invitation
 *
 * @param options - Mutation callbacks
 * @returns Mutation object with acceptInvitation function
 *
 * @example
 * ```tsx
 * const { mutate: acceptInvitation, isPending } = useAcceptInvitation({
 *   onSuccess: ({ topicId }) => {
 *     toast.success('Invitation accepted!');
 *     navigate(`/topics/${topicId}`);
 *   },
 * });
 *
 * return (
 *   <Button
 *     onClick={() => acceptInvitation(invitation.id)}
 *     disabled={isPending}
 *   >
 *     Accept
 *   </Button>
 * );
 * ```
 */
export function useAcceptInvitation(options?: UseAcceptInvitationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => contactService.acceptInvitation(invitationId),
    onSuccess: (data) => {
      // Invalidate received invitations to remove the accepted invitation
      queryClient.invalidateQueries({ queryKey: invitationKeys.received() });
      // Invalidate sent invitations in case the sender is viewing their list
      queryClient.invalidateQueries({ queryKey: invitationKeys.sent() });
      // Invalidate topics list in case the user navigates to topics page
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export interface UseDeclineInvitationOptions {
  onSuccess?: (data: { success: boolean }) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for declining a topic invitation
 *
 * @param options - Mutation callbacks
 * @returns Mutation object with declineInvitation function
 *
 * @example
 * ```tsx
 * const { mutate: declineInvitation, isPending } = useDeclineInvitation({
 *   onSuccess: () => {
 *     toast.info('Invitation declined');
 *   },
 * });
 *
 * return (
 *   <Button
 *     variant="secondary"
 *     onClick={() => declineInvitation(invitation.id)}
 *     disabled={isPending}
 *   >
 *     Decline
 *   </Button>
 * );
 * ```
 */
export function useDeclineInvitation(options?: UseDeclineInvitationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => contactService.declineInvitation(invitationId),
    onSuccess: (data) => {
      // Invalidate received invitations to remove the declined invitation
      queryClient.invalidateQueries({ queryKey: invitationKeys.received() });
      // Invalidate sent invitations in case the sender is viewing their list
      queryClient.invalidateQueries({ queryKey: invitationKeys.sent() });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

// ==================
// Re-exports for convenience
// ==================

export type { InvitationStatus, TopicInvitation, CreateInvitationRequest };

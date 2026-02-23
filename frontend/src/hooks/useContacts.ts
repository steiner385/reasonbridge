/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * React Query hooks for contact and social connection management
 *
 * Provides queries and mutations for:
 * - OAuth social connections (Google, Facebook)
 * - Contact imports from social providers
 * - User discovery from imported contacts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contactService,
  type SocialProvider,
  type SocialConnection,
  type ImportedContact,
  type DiscoveredUser,
  type ConnectionsResponse,
  type ContactsResponse,
  type DiscoveryResponse,
} from '../services/contactService';

// ==================
// Query Keys
// ==================

/**
 * Query key factory for contact-related queries
 * Enables fine-grained cache invalidation
 */
export const contactKeys = {
  all: ['contacts'] as const,
  connections: () => [...contactKeys.all, 'connections'] as const,
  list: () => [...contactKeys.all, 'list'] as const,
  discovered: () => [...contactKeys.all, 'discovered'] as const,
};

// ==================
// Query Hooks
// ==================

export interface UseConnectionsOptions {
  enabled?: boolean;
}

/**
 * Hook for fetching the current user's social connections
 *
 * @param options - Query options
 * @returns Query object with connections data and state
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useConnections();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorState error={error.message} />;
 *
 * return (
 *   <ConnectionList connections={data?.connections ?? []} />
 * );
 * ```
 */
export function useConnections(options: UseConnectionsOptions = {}) {
  const { enabled = true } = options;

  return useQuery<ConnectionsResponse, Error>({
    queryKey: contactKeys.connections(),
    queryFn: () => contactService.getConnections(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - connections change infrequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

export interface UseContactsOptions {
  limit?: number;
  page?: number;
  enabled?: boolean;
}

/**
 * Hook for fetching imported contacts with pagination
 *
 * @param options - Pagination and query options
 * @returns Query object with contacts data and state
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useContacts({ limit: 20, page: 1 });
 *
 * return (
 *   <ContactList
 *     contacts={data?.contacts ?? []}
 *     total={data?.total ?? 0}
 *   />
 * );
 * ```
 */
export function useContacts(options: UseContactsOptions = {}) {
  const { limit = 20, page = 1, enabled = true } = options;

  return useQuery<ContactsResponse, Error>({
    queryKey: [...contactKeys.list(), { limit, page }],
    queryFn: () => contactService.getContacts({ limit, page }),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export interface UseDiscoveredUsersOptions {
  enabled?: boolean;
}

/**
 * Hook for discovering users from imported contacts
 * Matches imported contacts against registered platform users
 *
 * @param options - Query options
 * @returns Query object with discovered users data and state
 *
 * @example
 * ```tsx
 * const { data, isLoading, refetch } = useDiscoveredUsers();
 *
 * return (
 *   <DiscoveredUserList
 *     users={data?.users ?? []}
 *     onRefresh={refetch}
 *   />
 * );
 * ```
 */
export function useDiscoveredUsers(options: UseDiscoveredUsersOptions = {}) {
  const { enabled = true } = options;

  return useQuery<DiscoveryResponse, Error>({
    queryKey: contactKeys.discovered(),
    queryFn: () => contactService.discoverUsers(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

// ==================
// Mutation Hooks
// ==================

export interface UseInitiateConnectionOptions {
  onSuccess?: (data: { authUrl: string }) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for initiating OAuth connection with a social provider
 *
 * @param options - Mutation callbacks
 * @returns Mutation object with initiateConnection function
 *
 * @example
 * ```tsx
 * const { mutate: initiateConnection, isPending } = useInitiateConnection({
 *   onSuccess: ({ authUrl }) => {
 *     // Redirect to OAuth provider
 *     window.location.href = authUrl;
 *   },
 *   onError: (error) => {
 *     toast.error(`Failed to connect: ${error.message}`);
 *   },
 * });
 *
 * return (
 *   <Button
 *     onClick={() => initiateConnection('GOOGLE')}
 *     disabled={isPending}
 *   >
 *     Connect Google
 *   </Button>
 * );
 * ```
 */
export function useInitiateConnection(options?: UseInitiateConnectionOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: SocialProvider) => contactService.initiateConnection(provider),
    onSuccess: (data) => {
      // Invalidate connections to refetch after OAuth callback completes
      queryClient.invalidateQueries({ queryKey: contactKeys.connections() });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export interface UseImportContactsOptions {
  onSuccess?: (data: { imported: number }) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for importing contacts from a connected social provider
 *
 * @param options - Mutation callbacks
 * @returns Mutation object with importContacts function
 *
 * @example
 * ```tsx
 * const { mutate: importContacts, isPending } = useImportContacts({
 *   onSuccess: ({ imported }) => {
 *     toast.success(`Imported ${imported} contacts`);
 *   },
 * });
 *
 * return (
 *   <Button
 *     onClick={() => importContacts('GOOGLE')}
 *     disabled={isPending}
 *   >
 *     Import Google Contacts
 *   </Button>
 * );
 * ```
 */
export function useImportContacts(options?: UseImportContactsOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: SocialProvider) => contactService.importContacts(provider),
    onSuccess: (data) => {
      // Invalidate contacts list to show newly imported contacts
      queryClient.invalidateQueries({ queryKey: contactKeys.list() });
      // Invalidate discovered users since new contacts may match existing users
      queryClient.invalidateQueries({ queryKey: contactKeys.discovered() });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export interface UseDeleteConnectionOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for deleting a social provider connection
 *
 * @param options - Mutation callbacks
 * @returns Mutation object with deleteConnection function
 *
 * @example
 * ```tsx
 * const { mutate: deleteConnection, isPending } = useDeleteConnection({
 *   onSuccess: () => {
 *     toast.success('Connection removed');
 *   },
 * });
 *
 * return (
 *   <Button
 *     variant="danger"
 *     onClick={() => deleteConnection('GOOGLE')}
 *     disabled={isPending}
 *   >
 *     Disconnect Google
 *   </Button>
 * );
 * ```
 */
export function useDeleteConnection(options?: UseDeleteConnectionOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: SocialProvider) => contactService.deleteConnection(provider),
    onSuccess: () => {
      // Invalidate connections to remove the deleted connection
      queryClient.invalidateQueries({ queryKey: contactKeys.connections() });
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

// ==================
// Re-exports for convenience
// ==================

export type { SocialProvider, SocialConnection, ImportedContact, DiscoveredUser };

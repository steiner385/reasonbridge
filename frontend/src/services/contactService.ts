/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Contact service for social connections, contact imports, and topic invitations
 * Handles OAuth provider connections, contact discovery, and invitation management
 */

import { apiClient } from '../lib/api';

// Types
export type SocialProvider = 'GOOGLE' | 'FACEBOOK';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

/**
 * Social connection (OAuth provider link)
 */
export interface SocialConnection {
  id: string;
  provider: SocialProvider;
  providerUserId: string;
  createdAt: string;
}

/**
 * Imported contact from social provider
 */
export interface ImportedContact {
  id: string;
  displayName: string | null;
  provider: SocialProvider;
  matchedUserId: string | null;
  importedAt: string;
}

/**
 * Discovered user from contact matching
 */
export interface DiscoveredUser {
  userId: string;
  displayName: string | null;
  contactDisplayName: string | null;
}

/**
 * Topic invitation
 */
export interface TopicInvitation {
  id: string;
  topicId: string;
  topicTitle?: string;
  inviterId: string;
  inviterName?: string;
  inviteeUserId: string | null;
  inviteeEmail: string | null;
  status: InvitationStatus;
  message: string | null;
  createdAt: string;
  expiresAt: string;
}

// Response types
/**
 * Response containing social connections
 */
export interface ConnectionsResponse {
  connections: SocialConnection[];
}

/**
 * Paginated contacts response
 */
export interface ContactsResponse {
  contacts: ImportedContact[];
  total: number;
}

/**
 * Discovery response with matched users
 */
export interface DiscoveryResponse {
  users: DiscoveredUser[];
}

/**
 * Paginated invitations response
 */
export interface InvitationsListResponse {
  invitations: TopicInvitation[];
  total: number;
  hasMore: boolean;
}

// Request DTOs
/**
 * Request to create a topic invitation
 */
export interface CreateInvitationRequest {
  topicId: string;
  inviteeUserId?: string;
  inviteeEmail?: string;
  message?: string;
}

/**
 * Pagination options for list requests
 */
export interface PaginationOptions {
  limit?: number;
  page?: number;
}

/**
 * Options for fetching sent invitations
 */
export interface SentInvitationsOptions extends PaginationOptions {
  status?: InvitationStatus;
}

class ContactService {
  // ==================
  // OAuth Connections
  // ==================

  /**
   * Initiate OAuth connection with a social provider
   * @param provider - The social provider to connect
   * @returns Object containing the authorization URL
   */
  async initiateConnection(provider: SocialProvider): Promise<{ authUrl: string }> {
    return apiClient.post<{ authUrl: string }>('/contacts/connections/initiate', { provider });
  }

  /**
   * Get all social connections for the current user
   * @returns Object containing array of connections
   */
  async getConnections(): Promise<ConnectionsResponse> {
    return apiClient.get<ConnectionsResponse>('/contacts/connections');
  }

  /**
   * Delete a social connection
   * @param provider - The social provider to disconnect
   */
  async deleteConnection(provider: SocialProvider): Promise<void> {
    return apiClient.delete(`/contacts/connections/${provider.toLowerCase()}`);
  }

  // ==================
  // Contacts
  // ==================

  /**
   * Import contacts from a social provider
   * @param provider - The social provider to import from
   * @returns Object containing count of imported contacts
   */
  async importContacts(provider: SocialProvider): Promise<{ imported: number }> {
    return apiClient.post<{ imported: number }>('/contacts/import', { provider });
  }

  /**
   * Get imported contacts for the current user
   * @param options - Pagination options
   * @returns Paginated contacts response
   */
  async getContacts(options: PaginationOptions = {}): Promise<ContactsResponse> {
    const { limit = 20, page = 1 } = options;
    return apiClient.get<ContactsResponse>('/contacts', {
      params: { limit, page },
    });
  }

  // ==================
  // Discovery
  // ==================

  /**
   * Discover users from imported contacts
   * Matches imported contacts against registered users
   * @returns Object containing matched users
   */
  async discoverUsers(): Promise<DiscoveryResponse> {
    return apiClient.get<DiscoveryResponse>('/contacts/discover');
  }

  // ==================
  // Invitations
  // ==================

  /**
   * Create a topic invitation
   * @param data - Invitation creation request
   * @returns The created invitation
   */
  async createInvitation(data: CreateInvitationRequest): Promise<TopicInvitation> {
    return apiClient.post<TopicInvitation>('/invitations', data);
  }

  /**
   * Get sent invitations for the current user
   * @param options - Pagination and filter options
   * @returns Paginated invitations response
   */
  async getSentInvitations(options: SentInvitationsOptions = {}): Promise<InvitationsListResponse> {
    const { page = 1, limit = 20, status } = options;
    const params: Record<string, string | number | boolean> = { page, limit };
    if (status) {
      params['status'] = status;
    }
    return apiClient.get<InvitationsListResponse>('/invitations/sent', { params });
  }

  /**
   * Get received invitations for the current user
   * @param options - Pagination options
   * @returns Paginated invitations response
   */
  async getReceivedInvitations(options: PaginationOptions = {}): Promise<InvitationsListResponse> {
    const { page = 1, limit = 20 } = options;
    return apiClient.get<InvitationsListResponse>('/invitations/received', {
      params: { page, limit },
    });
  }

  /**
   * Accept a topic invitation
   * @param invitationId - The invitation ID
   * @returns Object indicating success and the topic ID
   */
  async acceptInvitation(invitationId: string): Promise<{ success: boolean; topicId: string }> {
    return apiClient.post<{ success: boolean; topicId: string }>(
      `/invitations/${invitationId}/accept`,
    );
  }

  /**
   * Decline a topic invitation
   * @param invitationId - The invitation ID
   * @returns Object indicating success
   */
  async declineInvitation(invitationId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`/invitations/${invitationId}/decline`);
  }
}

export const contactService = new ContactService();

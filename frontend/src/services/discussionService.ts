/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Discussion API service for Feature 009
 * Handles discussion creation, listing, and retrieval
 */

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

export interface CitationInput {
  url: string;
  title?: string;
}

export interface CreateDiscussionRequest {
  topicId: string;
  title: string;
  initialResponse: {
    content: string;
    citations?: CitationInput[];
  };
}

export interface UserSummary {
  id: string;
  displayName: string;
}

export interface Citation {
  id: string;
  originalUrl: string;
  normalizedUrl: string;
  title: string | null;
  validationStatus: 'ACTIVE' | 'BROKEN' | 'UNVERIFIED';
  validatedAt: string | null;
  createdAt: string;
}

export interface ResponseDetail {
  id: string;
  discussionId: string;
  content: string;
  author: UserSummary;
  parentResponseId: string | null;
  citations?: Citation[];
  version: number;
  editCount: number;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  replyCount?: number;
  replies?: ResponseDetail[];
}

export interface DiscussionResponse {
  id: string;
  topicId: string;
  title: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  creator: UserSummary;
  responseCount: number;
  participantCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscussionDetail extends DiscussionResponse {
  responses?: ResponseDetail[];
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedDiscussions {
  data: DiscussionResponse[];
  meta: PaginationMeta;
}

export interface ListDiscussionsQuery {
  topicId?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  sortBy?: 'lastActivityAt' | 'createdAt' | 'responseCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

class DiscussionService {
  private getAuthHeaders(): HeadersInit {
    // Check both localStorage (remember me) and sessionStorage (current session)
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Create a new discussion with initial response
   */
  async createDiscussion(data: CreateDiscussionRequest): Promise<DiscussionDetail> {
    const response = await fetch(`${API_BASE_URL}/discussions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create discussion');
    }

    return response.json();
  }

  /**
   * List discussions with filtering, sorting, and pagination
   */
  async listDiscussions(query: ListDiscussionsQuery = {}): Promise<PaginatedDiscussions> {
    const params = new URLSearchParams();

    if (query.topicId) params.append('topicId', query.topicId);
    if (query.status) params.append('status', query.status);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    const url = `${API_BASE_URL}/discussions${params.toString() ? `?${params}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch discussions');
    }

    return response.json();
  }

  /**
   * Get a single discussion by ID
   */
  async getDiscussion(id: string): Promise<DiscussionDetail> {
    const response = await fetch(`${API_BASE_URL}/discussions/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch discussion');
    }

    return response.json();
  }
}

export const discussionService = new DiscussionService();

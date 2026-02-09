/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Response API service for Feature 009
 * Handles response creation, retrieval, and threading
 */

import type { ResponseDetail, CitationInput } from './discussionService';

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

export interface CreateResponseRequest {
  discussionId: string;
  content: string;
  citations?: CitationInput[];
  parentResponseId?: string;
}

/**
 * T062 [US3] - Reply to response request
 * Simplified request for replying to a specific response
 * discussionId is inherited from parent response
 */
export interface ReplyToResponseRequest {
  content: string;
  citations?: CitationInput[];
}

class ResponseService {
  private getAuthHeaders(): HeadersInit {
    // Check both localStorage (remember me) and sessionStorage (current session)
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Create a new response in a discussion
   */
  async createResponse(data: CreateResponseRequest): Promise<ResponseDetail> {
    const response = await fetch(`${API_BASE_URL}/responses`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create response');
    }

    return response.json();
  }

  /**
   * T062 [US3] - Reply to a specific response
   * Creates a threaded reply to an existing response
   * The discussionId is automatically inherited from the parent response
   *
   * @param parentResponseId - The ID of the response being replied to
   * @param data - Reply content and optional citations
   * @returns The created reply
   * @throws Error if parent response doesn't exist or thread depth limit exceeded
   */
  async replyToResponse(
    parentResponseId: string,
    data: ReplyToResponseRequest,
  ): Promise<ResponseDetail> {
    const response = await fetch(`${API_BASE_URL}/responses/${parentResponseId}/replies`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create reply');
    }

    return response.json();
  }

  /**
   * Get all responses for a discussion by topic ID
   * Note: The parameter is named discussionId but actually accepts a topicId
   * for backwards compatibility with existing code.
   */
  async getDiscussionResponses(discussionId: string): Promise<ResponseDetail[]> {
    const response = await fetch(`${API_BASE_URL}/topics/${discussionId}/responses`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch responses');
    }

    return response.json();
  }

  /**
   * Build threaded response tree from flat list
   * Organizes responses into a hierarchical structure based on parentResponseId
   */
  buildThreadTree(responses: ResponseDetail[]): ResponseDetail[] {
    const responseMap = new Map<string, ResponseDetail>();
    const rootResponses: ResponseDetail[] = [];

    // First pass: Create a map of all responses
    responses.forEach((response) => {
      responseMap.set(response.id, { ...response, replies: [] });
    });

    // Second pass: Build the tree structure
    responses.forEach((response) => {
      const currentResponse = responseMap.get(response.id)!;

      if (!response.parentResponseId) {
        // Top-level response
        rootResponses.push(currentResponse);
      } else {
        // Nested reply
        const parent = responseMap.get(response.parentResponseId);
        if (parent) {
          if (!parent.replies) {
            parent.replies = [];
          }
          parent.replies.push(currentResponse);
        } else {
          // Parent not found, treat as top-level
          rootResponses.push(currentResponse);
        }
      }
    });

    return rootResponses;
  }
}

export const responseService = new ResponseService();

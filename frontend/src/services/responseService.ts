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

class ResponseService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
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
   * Get all responses for a discussion
   */
  async getDiscussionResponses(discussionId: string): Promise<ResponseDetail[]> {
    const response = await fetch(`${API_BASE_URL}/discussions/${discussionId}/responses`, {
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

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Read State Service
 *
 * Manages user read state for topics/discussions.
 * Tracks which responses a user has seen to enable "new messages" indicators.
 */

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

/**
 * Read state for a user in a specific topic
 */
export interface ReadState {
  /** User ID */
  userId: string;
  /** Topic ID */
  topicId: string;
  /** ISO timestamp of when user last read the topic */
  lastReadAt: string;
  /** ID of the last response the user has seen, null if none */
  lastResponseId: string | null;
}

/**
 * Service for managing read state of topics
 *
 * @remarks
 * **Key Features:**
 * - Track last read position per topic
 * - Determine unread/new messages
 * - Persist read state to backend
 *
 * **Usage:**
 * - Get read state to determine "new messages" divider position
 * - Update read state when user views topic (on mount or scroll)
 */
class ReadStateService {
  /**
   * Get authentication headers for API requests
   */
  private getAuthHeaders(): HeadersInit {
    // Check both localStorage (remember me) and sessionStorage (current session)
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Get the read state for a topic
   *
   * @param topicId - The ID of the topic to get read state for
   * @returns The read state or null if not found/unauthenticated
   *
   * @example
   * ```typescript
   * const readState = await readStateService.getReadState('topic-123');
   * if (readState) {
   *   console.log('Last read at:', readState.lastReadAt);
   * }
   * ```
   */
  async getReadState(topicId: string): Promise<ReadState | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/topics/${topicId}/read-state`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.status === 404) {
        // No read state exists yet (user hasn't visited this topic)
        return null;
      }

      if (response.status === 401) {
        // User is not authenticated - no read state tracking
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get read state: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      // Network errors or other issues - treat as no read state
      console.warn('Failed to fetch read state:', error);
      return null;
    }
  }

  /**
   * Update the read state for a topic
   *
   * @param topicId - The ID of the topic to update read state for
   * @param lastResponseId - Optional ID of the last response seen. If not provided, marks current time as last read.
   * @returns The updated read state
   *
   * @example
   * ```typescript
   * // Mark topic as read up to a specific response
   * await readStateService.updateReadState('topic-123', 'response-456');
   *
   * // Mark topic as read as of now (no specific response)
   * await readStateService.updateReadState('topic-123');
   * ```
   */
  async updateReadState(topicId: string, lastResponseId?: string): Promise<ReadState> {
    const response = await fetch(`${API_BASE_URL}/topics/${topicId}/read-state`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        lastResponseId: lastResponseId || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update read state: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Mark a topic as fully read (convenience method)
   *
   * @param topicId - The ID of the topic to mark as read
   * @param lastResponseId - ID of the most recent response in the topic
   * @returns The updated read state
   */
  async markAsRead(topicId: string, lastResponseId?: string): Promise<ReadState> {
    return this.updateReadState(topicId, lastResponseId);
  }
}

export const readStateService = new ReadStateService();

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Reaction Service
 *
 * Manages emoji reactions on responses.
 * Allows users to add, remove, and view reactions.
 */

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

/**
 * User information in a reaction summary
 */
export interface ReactionUser {
  /** User ID */
  id: string;
  /** User display name */
  displayName: string;
}

/**
 * Summary of reactions for a single emoji type
 */
export interface ReactionSummary {
  /** The emoji character */
  emoji: string;
  /** Number of users who reacted with this emoji */
  count: number;
  /** List of users who reacted (may be truncated for large counts) */
  users: ReactionUser[];
  /** Whether the current user has reacted with this emoji */
  userReacted: boolean;
}

/**
 * List of all reactions on a response
 */
export interface ReactionList {
  /** Array of reaction summaries grouped by emoji */
  reactions: ReactionSummary[];
  /** Total number of reactions across all emoji types */
  totalCount: number;
}

/**
 * Service for managing response reactions
 *
 * @remarks
 * **Key Features:**
 * - Add/remove emoji reactions on responses
 * - Get reaction summaries with user lists
 * - Check if current user has reacted
 *
 * **Usage:**
 * - Display reaction counts below responses
 * - Toggle reactions with emoji picker
 * - Show who reacted on hover
 *
 * @example
 * ```typescript
 * // Add a reaction
 * await reactionService.addReaction('response-123', '👍');
 *
 * // Remove a reaction
 * await reactionService.removeReaction('response-123', '👍');
 *
 * // Get all reactions for a response
 * const reactions = await reactionService.getReactions('response-123');
 * ```
 */
class ReactionService {
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
   * Add a reaction to a response
   *
   * @param responseId - The ID of the response to react to
   * @param emoji - The emoji character to add as a reaction
   *
   * @example
   * ```typescript
   * await reactionService.addReaction('response-123', '👍');
   * console.log('Reaction added');
   * ```
   */
  async addReaction(responseId: string, emoji: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/responses/${responseId}/reactions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ emoji }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to add reaction: ${response.status}`);
    }
  }

  /**
   * Remove a reaction from a response
   *
   * @param responseId - The ID of the response to remove reaction from
   * @param emoji - The emoji character to remove
   *
   * @example
   * ```typescript
   * await reactionService.removeReaction('response-123', '👍');
   * console.log('Reaction removed');
   * ```
   */
  async removeReaction(responseId: string, emoji: string): Promise<void> {
    const encodedEmoji = encodeURIComponent(emoji);
    const response = await fetch(
      `${API_BASE_URL}/responses/${responseId}/reactions/${encodedEmoji}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      },
    );

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to remove reaction: ${response.status}`);
    }
  }

  /**
   * Get all reactions for a response
   *
   * @param responseId - The ID of the response to get reactions for
   * @returns List of reaction summaries grouped by emoji
   *
   * @example
   * ```typescript
   * const reactions = await reactionService.getReactions('response-123');
   * reactions.reactions.forEach(r => {
   *   console.log(`${r.emoji}: ${r.count} reactions`);
   *   if (r.userReacted) {
   *     console.log('You reacted with this emoji');
   *   }
   * });
   * ```
   */
  async getReactions(responseId: string): Promise<ReactionList> {
    const response = await fetch(`${API_BASE_URL}/responses/${responseId}/reactions`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401) {
      // User is not authenticated - return empty reactions
      return { reactions: [], totalCount: 0 };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get reactions: ${response.status}`);
    }

    return response.json();
  }
}

export const reactionService = new ReactionService();

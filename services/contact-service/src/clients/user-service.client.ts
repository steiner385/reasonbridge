/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { getServiceUrl } from '@reason-bridge/common';

export interface DiscoverableUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  emailHash: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
}

/**
 * HTTP client for calling user-service APIs.
 *
 * Uses fire-and-forget pattern for non-critical operations - failures are
 * logged but don't block the calling operation. This ensures the contact-service
 * remains responsive even when user-service is unavailable.
 *
 * @remarks
 * - findDiscoverableUsersByEmailHashes: Returns empty array on error
 * - getUserById: Returns null on error
 * - All errors are logged but not thrown
 *
 * @example
 * ```typescript
 * // Find users by email hashes
 * const users = await userServiceClient.findDiscoverableUsersByEmailHashes(['hash1', 'hash2']);
 *
 * // Get single user by ID
 * const user = await userServiceClient.getUserById('user-123');
 * ```
 */
@Injectable()
export class UserServiceClient {
  private readonly logger = new Logger(UserServiceClient.name);
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env['USER_SERVICE_URL'] || getServiceUrl('USER_SERVICE');
  }

  /**
   * Find users who are discoverable and match the given email hashes.
   * Fire-and-forget pattern: returns empty array on error.
   *
   * @param emailHashes - Array of SHA-256 email hashes to match against
   * @returns Array of discoverable users matching the hashes, or empty array on error
   */
  async findDiscoverableUsersByEmailHashes(emailHashes: string[]): Promise<DiscoverableUser[]> {
    try {
      const response = await fetch(`${this.baseUrl}/users/discoverable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailHashes }),
      });

      if (!response.ok) {
        this.logger.warn(`Failed to find discoverable users: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.users || [];
    } catch (error) {
      this.logger.warn(`Error calling user-service: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get user profile by ID.
   * Returns null on error.
   *
   * @param userId - The ID of the user to fetch
   * @returns User profile or null if not found/error
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        this.logger.warn(`Failed to get user ${userId}: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      this.logger.warn(`Error fetching user ${userId}: ${(error as Error).message}`);
      return null;
    }
  }
}

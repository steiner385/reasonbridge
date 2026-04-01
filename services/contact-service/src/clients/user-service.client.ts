/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { BaseHttpClient, getServiceUrl } from '@reason-bridge/common';

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

interface DiscoverableUsersResponse {
  users: DiscoverableUser[];
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
export class UserServiceClient extends BaseHttpClient {
  constructor() {
    const baseUrl = process.env['USER_SERVICE_URL'] || getServiceUrl('USER_SERVICE');
    const timeoutMs = parseInt(process.env['USER_SERVICE_TIMEOUT_MS'] || '30000', 10);

    super({
      baseUrl,
      timeoutMs,
      logger: new Logger(UserServiceClient.name),
    });
  }

  /**
   * Find users who are discoverable and match the given email hashes.
   * Fire-and-forget pattern: returns empty array on error.
   *
   * @param emailHashes - Array of SHA-256 email hashes to match against
   * @returns Array of discoverable users matching the hashes, or empty array on error
   */
  async findDiscoverableUsersByEmailHashes(emailHashes: string[]): Promise<DiscoverableUser[]> {
    const result = await this.post<DiscoverableUsersResponse>('/users/discoverable', {
      emailHashes,
    });
    return result?.users ?? [];
  }

  /**
   * Get user profile by ID.
   * Returns null on error.
   *
   * @param userId - The ID of the user to fetch
   * @returns User profile or null if not found/error
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    return this.get<UserProfile>(`/users/${userId}`);
  }
}

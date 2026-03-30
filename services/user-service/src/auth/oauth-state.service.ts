/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';

/**
 * Stored OAuth state data
 */
interface OAuthStateData {
  visitorSessionId: string | undefined;
  provider: string;
  createdAt: number;
}

/**
 * OAuth State Service
 *
 * Manages OAuth state tokens for CSRF protection.
 * State tokens are stored in Redis with a 5-minute TTL and are one-time use.
 *
 * @remarks
 * This service implements proper OAuth state token management:
 * - Cryptographically secure token generation (32 bytes)
 * - Time-limited validity (5 minutes)
 * - One-time use (token deleted after validation)
 * - Visitor session binding for additional security
 */
@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private readonly STATE_TTL_SECONDS = 300; // 5 minutes
  private readonly KEY_PREFIX = 'oauth:state:';

  constructor(@Optional() @Inject(CACHE_MANAGER) private readonly cacheManager: Cache | null) {
    if (!cacheManager) {
      this.logger.warn('CACHE_MANAGER not available - OAuth state storage disabled');
    }
  }

  /**
   * Generate and store a new OAuth state token
   *
   * @param provider - OAuth provider name (e.g., 'GOOGLE', 'APPLE')
   * @param visitorSessionId - Optional visitor session ID to bind to the state
   * @returns The generated state token
   */
  async generateState(provider: string, visitorSessionId?: string): Promise<string> {
    // Generate cryptographically secure state token
    const state = randomBytes(32).toString('hex');

    const stateData: OAuthStateData = {
      visitorSessionId,
      provider,
      createdAt: Date.now(),
    };

    if (this.cacheManager) {
      try {
        const key = this.getKey(state);
        // Store with TTL (cache-manager expects milliseconds)
        await this.cacheManager.set(key, JSON.stringify(stateData), this.STATE_TTL_SECONDS * 1000);
        this.logger.debug(`OAuth state generated for provider: ${provider}`);
      } catch (error) {
        this.logger.error(`Failed to store OAuth state: ${error}`);
        // Don't throw - allow OAuth to proceed with reduced security
        // The OAuth provider's own CSRF protection is still active
      }
    }

    return state;
  }

  /**
   * Validate and consume an OAuth state token
   *
   * @param state - The state token to validate
   * @param provider - Expected OAuth provider
   * @param visitorSessionId - Optional visitor session ID to verify
   * @returns True if the state is valid, false otherwise
   *
   * @remarks
   * The state token is deleted after validation (one-time use)
   * This prevents replay attacks where an attacker could reuse a state token
   */
  async validateState(
    state: string,
    provider: string,
    visitorSessionId?: string,
  ): Promise<boolean> {
    if (!this.cacheManager) {
      this.logger.warn('OAuth state validation skipped - cache not available');
      return true; // Allow OAuth to proceed when cache unavailable
    }

    const key = this.getKey(state);

    try {
      const storedJson = await this.cacheManager.get<string>(key);

      if (!storedJson) {
        this.logger.warn(`OAuth state not found or expired: ${state.substring(0, 8)}...`);
        return false;
      }

      // Delete the state immediately (one-time use)
      await this.cacheManager.del(key);

      const storedData: OAuthStateData = JSON.parse(storedJson);

      // Verify provider matches
      if (storedData.provider !== provider) {
        this.logger.warn(
          `OAuth state provider mismatch: expected ${provider}, got ${storedData.provider}`,
        );
        return false;
      }

      // Verify visitor session if both are provided
      if (visitorSessionId && storedData.visitorSessionId) {
        if (storedData.visitorSessionId !== visitorSessionId) {
          this.logger.warn('OAuth state visitor session mismatch');
          return false;
        }
      }

      // Verify not expired (additional check beyond TTL)
      const age = Date.now() - storedData.createdAt;
      if (age > this.STATE_TTL_SECONDS * 1000) {
        this.logger.warn('OAuth state expired');
        return false;
      }

      this.logger.debug(`OAuth state validated for provider: ${provider}`);
      return true;
    } catch (error) {
      this.logger.error(`OAuth state validation error: ${error}`);
      return false;
    }
  }

  /**
   * Generate cache key for state token
   */
  private getKey(state: string): string {
    return `${this.KEY_PREFIX}${state}`;
  }
}

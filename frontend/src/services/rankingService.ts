/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Ranking Service
 *
 * API service for user ranking system endpoints including:
 * - User ranking breakdown
 * - Domain expertise
 * - Credentials management
 * - Appeals
 * - Leaderboard
 */

import { apiClient } from '../lib/api';
import type { UserRank, TopicExpertise, Credential, SubmitCredentialInput } from '../types/ranking';
import type { Appeal } from '../types/moderation';

/**
 * Response for checking appeal submission eligibility
 */
export interface CanSubmitAppealResponse {
  canSubmit: boolean;
  cooldownEndsAt: string | null;
  reason?: string;
}

/**
 * Response for leaderboard endpoint
 */
export interface LeaderboardResponse {
  users: UserRank[];
  total: number;
}

/**
 * Response for user's appeals
 */
export interface MyAppealsResponse {
  appeals: Appeal[];
  total: number;
}

/**
 * Response for user's credentials
 */
export interface MyCredentialsResponse {
  credentials: Credential[];
  total: number;
}

/**
 * Response for user's expertise
 */
export interface MyExpertiseResponse {
  expertise: TopicExpertise[];
  total: number;
}

class RankingService {
  /**
   * Get the current user's full ranking breakdown
   */
  async getMyRankingBreakdown(): Promise<UserRank> {
    return apiClient.get<UserRank>('/users/me/ranking/breakdown');
  }

  /**
   * Get the current user's domain expertise list
   */
  async getMyExpertise(): Promise<MyExpertiseResponse> {
    return apiClient.get<MyExpertiseResponse>('/expertise/me');
  }

  /**
   * Get the current user's credentials
   */
  async getMyCredentials(): Promise<MyCredentialsResponse> {
    return apiClient.get<MyCredentialsResponse>('/credentials/me');
  }

  /**
   * Submit a new credential for verification
   */
  async submitCredential(data: SubmitCredentialInput): Promise<Credential> {
    return apiClient.post<Credential>('/credentials', data);
  }

  /**
   * Get the current user's appeals
   */
  async getMyAppeals(): Promise<MyAppealsResponse> {
    return apiClient.get<MyAppealsResponse>('/appeals/me');
  }

  /**
   * Check if the current user can submit a new appeal
   */
  async canSubmitAppeal(): Promise<CanSubmitAppealResponse> {
    return apiClient.get<CanSubmitAppealResponse>('/appeals/me/can-submit');
  }

  /**
   * Submit a new appeal
   * @param reason - Reason for the appeal
   */
  async submitAppeal(reason: string): Promise<Appeal> {
    return apiClient.post<Appeal>('/appeals', { reason });
  }

  /**
   * Get leaderboard preview (top N users)
   * @param limit - Number of users to return (default: 5)
   */
  async getLeaderboardPreview(limit: number = 5): Promise<LeaderboardResponse> {
    return apiClient.get<LeaderboardResponse>('/users/leaderboard', {
      params: { limit },
    });
  }

  /**
   * Get full leaderboard with pagination
   * @param limit - Number of users per page
   * @param offset - Offset for pagination
   */
  async getLeaderboard(limit: number = 20, offset: number = 0): Promise<LeaderboardResponse> {
    return apiClient.get<LeaderboardResponse>('/users/leaderboard', {
      params: { limit, offset },
    });
  }
}

export const rankingService = new RankingService();

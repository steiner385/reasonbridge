/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Admin Ranking Service
 *
 * API service for admin-only ranking system endpoints including:
 * - Ranking analytics dashboard data
 * - Tier distribution statistics
 * - Appeals and credentials overview
 * - System health metrics
 */

import { apiClient } from '../lib/api';
import type { RankingAnalytics } from '../types/ranking';

/**
 * Admin Ranking Service class
 *
 * Provides methods for fetching ranking analytics data for the admin dashboard.
 * All endpoints require admin authentication.
 */
class AdminRankingService {
  /**
   * Get comprehensive ranking analytics for the admin dashboard
   *
   * @returns Promise resolving to RankingAnalytics containing tier distribution,
   *          appeals summary, credentials overview, system health, and top contributors
   * @throws ApiError if request fails or user is not authorized
   */
  async getRankingAnalytics(): Promise<RankingAnalytics> {
    return apiClient.get<RankingAnalytics>('/admin/ranking/analytics');
  }
}

/**
 * Singleton instance of AdminRankingService
 */
export const adminRankingService = new AdminRankingService();

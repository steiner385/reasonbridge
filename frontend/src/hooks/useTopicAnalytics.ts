/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T042 [US5] - useTopicAnalytics Hook (Feature 016)
 *
 * TanStack Query hook for fetching topic analytics data
 */

import { useQuery } from '@tanstack/react-query';

export interface DailyAnalytics {
  date: string;
  viewCount: number;
  uniqueViewers: number;
  responseCount: number;
  participantCount: number;
  newParticipants: number;
  avgResponseLength: number;
  engagementScore: number;
  peakActivityHour?: number;
}

export interface TopicAnalyticsData {
  topicId: string;
  summary: {
    totalViews: number;
    totalResponses: number;
    totalParticipants: number;
    avgEngagementScore: number;
    createdAt: string;
    lastActivityAt: string;
  };
  dailyMetrics: DailyAnalytics[];
  trends: {
    viewsGrowth: number;
    responsesGrowth: number;
    participantsGrowth: number;
    engagementTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

export function useTopicAnalytics(topicId: string, daysBack: number = 30) {
  const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

  return useQuery<TopicAnalyticsData>({
    queryKey: ['topics', topicId, 'analytics', daysBack],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/topics/${topicId}/analytics?days=${daysBack}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch analytics: ${response.statusText}`);
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

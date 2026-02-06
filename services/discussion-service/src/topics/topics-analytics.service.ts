/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T040 [US5] - Topics Analytics Service (Feature 016)
 *
 * Provides topic participation and engagement metrics:
 * - Real-time metrics for current day (on-demand computation)
 * - Historical metrics from pre-aggregated daily data
 * - Engagement trends over time
 * - Participant growth tracking
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@reasonbridge/db-models';

export interface DailyAnalytics {
  date: string; // ISO date string (YYYY-MM-DD)
  viewCount: number;
  uniqueViewers: number;
  responseCount: number;
  participantCount: number;
  newParticipants: number;
  avgResponseLength: number;
  engagementScore: number; // 0-100 weighted score
  peakActivityHour?: number; // 0-23
}

export interface TopicAnalyticsResponse {
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
    viewsGrowth: number; // % change from previous period
    responsesGrowth: number;
    participantsGrowth: number;
    engagementTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

@Injectable()
export class TopicsAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive analytics for a topic
   * Combines real-time data for today with historical aggregates
   */
  async getTopicAnalytics(topicId: string, daysBack: number = 30): Promise<TopicAnalyticsResponse> {
    // Verify topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: {
        id: true,
        createdAt: true,
        lastActivityAt: true,
        responseCount: true,
        participantCount: true,
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get historical aggregated metrics
    const historicalMetrics = await this.prisma.topicAnalytics.findMany({
      where: {
        topicId,
        date: {
          gte: startDate,
          lt: endDate, // Exclude today (will be computed real-time)
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Compute real-time metrics for today
    const todayMetrics = await this.computeRealTimeMetrics(topicId);

    // Combine historical and real-time metrics
    const dailyMetrics: DailyAnalytics[] = [
      ...historicalMetrics.map((m) => ({
        date: m.date.toISOString().split('T')[0],
        viewCount: m.viewCount,
        uniqueViewers: m.uniqueViewers,
        responseCount: m.responseCount,
        participantCount: m.participantCount,
        newParticipants: m.newParticipants,
        avgResponseLength: m.avgResponseLength,
        engagementScore: parseFloat(m.engagementScore.toString()),
        peakActivityHour: m.peakActivityHour || undefined,
      })),
      todayMetrics,
    ];

    // Calculate summary metrics
    const summary = this.calculateSummary(topic, dailyMetrics);

    // Calculate trends
    const trends = this.calculateTrends(dailyMetrics);

    return {
      topicId,
      summary,
      dailyMetrics,
      trends,
    };
  }

  /**
   * Compute real-time metrics for the current day
   * Used for today's data since aggregation hasn't run yet
   */
  private async computeRealTimeMetrics(topicId: string): Promise<DailyAnalytics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get responses created today
    const responsesToday = await this.prisma.response.findMany({
      where: {
        topicId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        status: 'VISIBLE',
      },
      select: {
        content: true,
        authorId: true,
        createdAt: true,
      },
    });

    // Calculate metrics
    const responseCount = responsesToday.length;
    const uniqueAuthors = new Set(responsesToday.map((r) => r.authorId));
    const participantCount = uniqueAuthors.size;

    const avgResponseLength =
      responseCount > 0
        ? Math.round(responsesToday.reduce((sum, r) => sum + r.content.length, 0) / responseCount)
        : 0;

    // Calculate peak activity hour
    const hourCounts = new Map<number, number>();
    responsesToday.forEach((r) => {
      const hour = r.createdAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    let peakActivityHour: number | undefined;
    let maxCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        peakActivityHour = hour;
      }
    });

    // Calculate engagement score (weighted formula)
    // Note: viewCount and uniqueViewers would come from tracking system
    // For now, estimate based on responses
    const estimatedViews = responseCount * 10; // Rough estimate: 10 views per response
    const estimatedUniqueViewers = participantCount * 3; // Estimate: 3 unique viewers per participant

    const engagementScore = this.calculateEngagementScore(
      estimatedViews,
      estimatedUniqueViewers,
      responseCount,
      participantCount,
    );

    return {
      date: today.toISOString().split('T')[0],
      viewCount: estimatedViews,
      uniqueViewers: estimatedUniqueViewers,
      responseCount,
      participantCount,
      newParticipants: participantCount, // All participants are "new" for today
      avgResponseLength,
      engagementScore,
      peakActivityHour,
    };
  }

  /**
   * Generate and store daily aggregated metrics
   * Should be run daily (e.g., via cron at midnight)
   */
  async generateDailyAggregate(topicId: string, targetDate?: Date): Promise<void> {
    const date = targetDate || new Date();
    date.setHours(0, 0, 0, 0);

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get responses for the day
    const responses = await this.prisma.response.findMany({
      where: {
        topicId,
        createdAt: {
          gte: date,
          lt: nextDay,
        },
        status: 'VISIBLE',
      },
      select: {
        content: true,
        authorId: true,
        createdAt: true,
      },
    });

    // Calculate metrics
    const responseCount = responses.length;
    const uniqueAuthors = new Set(responses.map((r) => r.authorId));
    const participantCount = uniqueAuthors.size;

    const avgResponseLength =
      responseCount > 0
        ? Math.round(responses.reduce((sum, r) => sum + r.content.length, 0) / responseCount)
        : 0;

    // Calculate peak activity hour
    const hourCounts = new Map<number, number>();
    responses.forEach((r) => {
      const hour = r.createdAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    let peakActivityHour: number | null = null;
    let maxCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        peakActivityHour = hour;
      }
    });

    // Check for new participants (first response on or before this date)
    const newParticipantsCount = await this.countNewParticipants(topicId, date);

    // Estimate views (would come from tracking system in production)
    const estimatedViews = responseCount * 10;
    const estimatedUniqueViewers = participantCount * 3;

    const engagementScore = this.calculateEngagementScore(
      estimatedViews,
      estimatedUniqueViewers,
      responseCount,
      participantCount,
    );

    // Upsert analytics record
    await this.prisma.topicAnalytics.upsert({
      where: {
        topicId_date: {
          topicId,
          date,
        },
      },
      create: {
        topicId,
        date,
        viewCount: estimatedViews,
        uniqueViewers: estimatedUniqueViewers,
        responseCount,
        participantCount,
        newParticipants: newParticipantsCount,
        avgResponseLength,
        engagementScore,
        peakActivityHour,
      },
      update: {
        viewCount: estimatedViews,
        uniqueViewers: estimatedUniqueViewers,
        responseCount,
        participantCount,
        newParticipants: newParticipantsCount,
        avgResponseLength,
        engagementScore,
        peakActivityHour,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Count new participants who made their first response on or before target date
   */
  private async countNewParticipants(topicId: string, targetDate: Date): Promise<number> {
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all participants who responded on target date
    const participantsOnDate = await this.prisma.response.findMany({
      where: {
        topicId,
        createdAt: {
          gte: targetDate,
          lt: nextDay,
        },
        status: 'VISIBLE',
      },
      select: {
        authorId: true,
      },
      distinct: ['authorId'],
    });

    // For each participant, check if this was their first response
    let newCount = 0;
    for (const p of participantsOnDate) {
      const firstResponse = await this.prisma.response.findFirst({
        where: {
          topicId,
          authorId: p.authorId,
          status: 'VISIBLE',
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          createdAt: true,
        },
      });

      if (
        firstResponse &&
        firstResponse.createdAt >= targetDate &&
        firstResponse.createdAt < nextDay
      ) {
        newCount++;
      }
    }

    return newCount;
  }

  /**
   * Calculate engagement score (0-100)
   * Weighted formula: 40% views, 30% responses, 30% participants
   */
  private calculateEngagementScore(
    views: number,
    uniqueViewers: number,
    responses: number,
    participants: number,
  ): number {
    // Normalize metrics to 0-100 scale using logarithmic scaling
    const normalizedViews = Math.min(100, Math.log10(views + 1) * 25);
    const normalizedResponses = Math.min(100, Math.log10(responses + 1) * 33);
    const normalizedParticipants = Math.min(100, Math.log10(participants + 1) * 33);

    // Weighted average
    const score = normalizedViews * 0.4 + normalizedResponses * 0.3 + normalizedParticipants * 0.3;

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate summary metrics from daily data
   */
  private calculateSummary(
    topic: {
      createdAt: Date;
      lastActivityAt: Date;
      responseCount: number;
      participantCount: number;
    },
    dailyMetrics: DailyAnalytics[],
  ) {
    const totalViews = dailyMetrics.reduce((sum, m) => sum + m.viewCount, 0);
    const totalResponses = topic.responseCount;
    const totalParticipants = topic.participantCount;
    const avgEngagementScore =
      dailyMetrics.length > 0
        ? dailyMetrics.reduce((sum, m) => sum + m.engagementScore, 0) / dailyMetrics.length
        : 0;

    return {
      totalViews,
      totalResponses,
      totalParticipants,
      avgEngagementScore: Math.round(avgEngagementScore * 100) / 100,
      createdAt: topic.createdAt.toISOString(),
      lastActivityAt: topic.lastActivityAt.toISOString(),
    };
  }

  /**
   * Calculate growth trends comparing first and second half of period
   */
  private calculateTrends(dailyMetrics: DailyAnalytics[]) {
    if (dailyMetrics.length < 2) {
      return {
        viewsGrowth: 0,
        responsesGrowth: 0,
        participantsGrowth: 0,
        engagementTrend: 'stable' as const,
      };
    }

    const midpoint = Math.floor(dailyMetrics.length / 2);
    const firstHalf = dailyMetrics.slice(0, midpoint);
    const secondHalf = dailyMetrics.slice(midpoint);

    // Calculate averages for each half
    const avgViews1 = firstHalf.reduce((sum, m) => sum + m.viewCount, 0) / firstHalf.length;
    const avgViews2 = secondHalf.reduce((sum, m) => sum + m.viewCount, 0) / secondHalf.length;

    const avgResponses1 = firstHalf.reduce((sum, m) => sum + m.responseCount, 0) / firstHalf.length;
    const avgResponses2 =
      secondHalf.reduce((sum, m) => sum + m.responseCount, 0) / secondHalf.length;

    const avgParticipants1 =
      firstHalf.reduce((sum, m) => sum + m.participantCount, 0) / firstHalf.length;
    const avgParticipants2 =
      secondHalf.reduce((sum, m) => sum + m.participantCount, 0) / secondHalf.length;

    const avgEngagement1 =
      firstHalf.reduce((sum, m) => sum + m.engagementScore, 0) / firstHalf.length;
    const avgEngagement2 =
      secondHalf.reduce((sum, m) => sum + m.engagementScore, 0) / secondHalf.length;

    // Calculate percentage growth
    const viewsGrowth = avgViews1 > 0 ? ((avgViews2 - avgViews1) / avgViews1) * 100 : 0;
    const responsesGrowth =
      avgResponses1 > 0 ? ((avgResponses2 - avgResponses1) / avgResponses1) * 100 : 0;
    const participantsGrowth =
      avgParticipants1 > 0 ? ((avgParticipants2 - avgParticipants1) / avgParticipants1) * 100 : 0;

    // Determine engagement trend
    const engagementChange = avgEngagement2 - avgEngagement1;
    let engagementTrend: 'increasing' | 'stable' | 'decreasing';
    if (engagementChange > 5) {
      engagementTrend = 'increasing';
    } else if (engagementChange < -5) {
      engagementTrend = 'decreasing';
    } else {
      engagementTrend = 'stable';
    }

    return {
      viewsGrowth: Math.round(viewsGrowth * 100) / 100,
      responsesGrowth: Math.round(responsesGrowth * 100) / 100,
      participantsGrowth: Math.round(participantsGrowth * 100) / 100,
      engagementTrend,
    };
  }
}

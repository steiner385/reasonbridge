/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FeedbackAnalyticsDto, FeedbackAnalyticsQueryDto } from '../feedback/dto/index.js';
import { HelpfulRating, FeedbackType } from '@prisma/client';

/**
 * Service for analyzing feedback effectiveness
 * Provides insights into how users interact with AI-generated feedback
 */
@Injectable()
export class FeedbackAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive feedback effectiveness analytics
   * @param query Query parameters for filtering analytics
   * @returns Analytics data with metrics and insights
   */
  async getAnalytics(query: FeedbackAnalyticsQueryDto): Promise<FeedbackAnalyticsDto> {
    // Parse date range (default to last 30 days)
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Build filter conditions
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.feedbackType) {
      where.type = query.feedbackType as FeedbackType;
    }

    if (query.responseId) {
      where.responseId = query.responseId;
    }

    // Fetch all feedback matching criteria
    const feedbackItems = await this.prisma.feedback.findMany({
      where,
      select: {
        id: true,
        type: true,
        confidenceScore: true,
        userAcknowledged: true,
        userRevised: true,
        userHelpfulRating: true,
        dismissedAt: true,
        dismissalReason: true,
      },
    });

    const totalFeedback = feedbackItems.length;

    // Calculate acknowledgment metrics
    const acknowledgedCount = feedbackItems.filter((f) => f.userAcknowledged).length;
    const acknowledgmentRate = totalFeedback > 0 ? (acknowledgedCount / totalFeedback) * 100 : 0;

    // Calculate revision metrics
    const revisionCount = feedbackItems.filter((f) => f.userRevised).length;
    const revisionRate = totalFeedback > 0 ? (revisionCount / totalFeedback) * 100 : 0;

    // Calculate dismissal metrics
    const dismissedCount = feedbackItems.filter((f) => f.dismissedAt !== null).length;
    const dismissalRate = totalFeedback > 0 ? (dismissedCount / totalFeedback) * 100 : 0;

    // Calculate helpful ratings distribution
    const helpfulRatings = {
      HELPFUL: feedbackItems.filter((f) => f.userHelpfulRating === HelpfulRating.HELPFUL).length,
      NOT_HELPFUL: feedbackItems.filter((f) => f.userHelpfulRating === HelpfulRating.NOT_HELPFUL)
        .length,
    };

    // Calculate average helpful score
    const ratingScores = {
      [HelpfulRating.HELPFUL]: 1,
      [HelpfulRating.NOT_HELPFUL]: 0,
    };

    const ratedItems = feedbackItems.filter((f) => f.userHelpfulRating !== null);
    const totalScore = ratedItems.reduce(
      (sum, f) => sum + (f.userHelpfulRating ? ratingScores[f.userHelpfulRating] : 0),
      0,
    );
    const averageHelpfulScore = ratedItems.length > 0 ? totalScore / ratedItems.length : 0;

    // Group by feedback type
    const typeGroups = new Map<string, any[]>();
    feedbackItems.forEach((f) => {
      const existing = typeGroups.get(f.type) || [];
      existing.push(f);
      typeGroups.set(f.type, existing);
    });

    const byType = Array.from(typeGroups.entries()).map(([type, items]) => {
      const acknowledgedCount = items.filter((f) => f.userAcknowledged).length;
      const revisionCount = items.filter((f) => f.userRevised).length;
      const dismissedCount = items.filter((f) => f.dismissedAt !== null).length;
      const totalConfidence = items.reduce((sum, f) => sum + Number(f.confidenceScore), 0);
      const averageConfidence = items.length > 0 ? totalConfidence / items.length : 0;

      return {
        type,
        count: items.length,
        acknowledgedCount,
        revisionCount,
        dismissedCount,
        averageConfidence,
      };
    });

    // Get top dismissal reasons
    const dismissalReasons = feedbackItems
      .filter((f) => f.dismissalReason !== null)
      .map((f) => f.dismissalReason as string);

    const reasonCounts = new Map<string, number>();
    dismissalReasons.forEach((reason) => {
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    });

    const topDismissalReasons = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 reasons

    return {
      totalFeedback,
      acknowledgedCount,
      acknowledgmentRate,
      revisionCount,
      revisionRate,
      dismissedCount,
      dismissalRate,
      helpfulRatings,
      averageHelpfulScore,
      byType,
      topDismissalReasons,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    };
  }
}

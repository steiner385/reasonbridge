/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic Service
 * Handles topic retrieval and activity level computation
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TopicDto, ActivityLevel } from './dto/topic.dto';
import { TopicsResponseDto } from './dto/topics-response.dto';

@Injectable()
export class TopicService {
  private readonly logger = new Logger(TopicService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * T090-T092: Get topics with activity level computation and filtering
   * @param suggestedOnly - Filter to only suggested topics
   * @param minActivity - Minimum activity level filter
   */
  async getTopics(
    suggestedOnly: boolean = false,
    minActivity?: ActivityLevel,
  ): Promise<TopicsResponseDto> {
    this.logger.log(
      `Fetching topics - suggestedOnly: ${suggestedOnly}, minActivity: ${minActivity}`,
    );

    // Fetch all discussion topics from database
    const topics = await this.prisma.discussionTopic.findMany({
      where: suggestedOnly ? { suggestedForNewUsers: true } : undefined,
      select: {
        id: true,
        title: true,
        description: true,
        suggestedForNewUsers: true,
        activeDiscussionCount: true,
        participantCount: true,
        createdAt: true,
      },
      orderBy: [
        { suggestedForNewUsers: 'desc' }, // Suggested topics first
        { participantCount: 'desc' }, // Then by popularity
      ],
    });

    // T091: Compute activity level for each topic
    const topicsWithActivity = topics.map((topic) => ({
      ...topic,
      activityLevel: this.computeActivityLevel(topic.activeDiscussionCount, topic.participantCount),
    }));

    // T092: Apply minimum activity filter
    const filteredTopics = minActivity
      ? topicsWithActivity.filter((topic) =>
          this.isActivityLevelSufficient(topic.activityLevel, minActivity),
        )
      : topicsWithActivity;

    // Map to DTOs
    const topicDtos: TopicDto[] = filteredTopics.map((topic) => ({
      id: topic.id,
      name: topic.title,
      description: topic.description || '',
      activityLevel: topic.activityLevel,
      discussionCount: topic.activeDiscussionCount,
      participantCount: topic.participantCount,
      suggested: topic.suggestedForNewUsers,
      createdAt: topic.createdAt.toISOString(),
    }));

    this.logger.log(`Returning ${topicDtos.length} topics`);

    return {
      topics: topicDtos,
      total: topicDtos.length,
      minSelection: 2,
      maxSelection: 3,
    };
  }

  /**
   * T091: Compute activity level based on discussion and participant counts
   * HIGH: 20+ discussions OR 100+ participants
   * MEDIUM: 5+ discussions OR 20+ participants
   * LOW: otherwise
   */
  private computeActivityLevel(discussionCount: number, participantCount: number): ActivityLevel {
    if (discussionCount >= 20 || participantCount >= 100) {
      return ActivityLevel.HIGH;
    }
    if (discussionCount >= 5 || participantCount >= 20) {
      return ActivityLevel.MEDIUM;
    }
    return ActivityLevel.LOW;
  }

  /**
   * Helper: Check if activity level meets minimum requirement
   */
  private isActivityLevelSufficient(actual: ActivityLevel, minimum: ActivityLevel): boolean {
    const levels = [ActivityLevel.LOW, ActivityLevel.MEDIUM, ActivityLevel.HIGH];
    const actualIndex = levels.indexOf(actual);
    const minimumIndex = levels.indexOf(minimum);
    return actualIndex >= minimumIndex;
  }

  /**
   * Get high-activity topics for suggestions
   */
  async getHighActivityTopics(limit: number = 5): Promise<TopicDto[]> {
    const topics = await this.prisma.discussionTopic.findMany({
      orderBy: [{ participantCount: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        suggestedForNewUsers: true,
        activeDiscussionCount: true,
        participantCount: true,
        createdAt: true,
      },
    });

    return topics
      .filter(
        (topic) =>
          this.computeActivityLevel(topic.activeDiscussionCount, topic.participantCount) ===
          ActivityLevel.HIGH,
      )
      .map((topic) => ({
        id: topic.id,
        name: topic.title,
        description: topic.description || '',
        activityLevel: ActivityLevel.HIGH,
        discussionCount: topic.activeDiscussionCount,
        participantCount: topic.participantCount,
        suggested: topic.suggestedForNewUsers,
        createdAt: topic.createdAt.toISOString(),
      }));
  }

  /**
   * Get topic by ID
   */
  async getTopicById(id: string): Promise<TopicDto | null> {
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        suggestedForNewUsers: true,
        activeDiscussionCount: true,
        participantCount: true,
        createdAt: true,
      },
    });

    if (!topic) {
      return null;
    }

    return {
      id: topic.id,
      name: topic.title,
      description: topic.description || '',
      activityLevel: this.computeActivityLevel(topic.activeDiscussionCount, topic.participantCount),
      discussionCount: topic.activeDiscussionCount,
      participantCount: topic.participantCount,
      suggested: topic.suggestedForNewUsers,
      createdAt: topic.createdAt.toISOString(),
    };
  }
}

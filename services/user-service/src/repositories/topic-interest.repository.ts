import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TopicInterest } from '@prisma/client';

/**
 * Topic Interest Repository
 *
 * Data access layer for TopicInterest entity operations.
 * Manages user topic selections during onboarding.
 *
 * Handles:
 * - Saving user topic interests with priority
 * - Retrieving user's selected topics
 * - Updating topic priorities
 * - Removing topic interests
 */
@Injectable()
export class TopicInterestRepository {
  private readonly logger = new Logger(TopicInterestRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create topic interest for a user
   *
   * @param data - Object containing userId, topicId, and priority
   * @returns Created topic interest
   */
  async create(data: {
    userId: string;
    topicId: string;
    priority: number;
  }): Promise<TopicInterest> {
    try {
      this.logger.debug(
        `Creating topic interest for user ${data.userId}, topic ${data.topicId}, priority ${data.priority}`,
      );

      const interest = await this.prisma.topicInterest.create({
        data: {
          userId: data.userId,
          topicId: data.topicId,
          priority: data.priority,
        },
      });

      this.logger.log(`Topic interest created: ${interest.id}`);
      return interest;
    } catch (error: any) {
      this.logger.error(`Failed to create topic interest: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create multiple topic interests in a transaction
   *
   * @param userId - User ID
   * @param topics - Array of { topicId, priority }
   * @returns Array of created topic interests
   */
  async createMany(
    userId: string,
    topics: Array<{ topicId: string; priority: number }>,
  ): Promise<TopicInterest[]> {
    try {
      this.logger.debug(`Creating ${topics.length} topic interests for user: ${userId}`);

      // Delete existing interests first to avoid duplicates
      await this.prisma.topicInterest.deleteMany({
        where: { userId },
      });

      // Create new interests
      const interests = await Promise.all(
        topics.map((topic) =>
          this.prisma.topicInterest.create({
            data: {
              userId,
              topicId: topic.topicId,
              priority: topic.priority,
            },
          }),
        ),
      );

      this.logger.log(`Created ${interests.length} topic interests for user: ${userId}`);
      return interests;
    } catch (error: any) {
      this.logger.error(`Failed to create topic interests: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all topic interests for a user
   *
   * @param userId - User ID
   * @returns Array of topic interests with topic details
   */
  async findByUserId(userId: string): Promise<Array<TopicInterest & { topic: any }>> {
    try {
      return await this.prisma.topicInterest.findMany({
        where: { userId },
        include: {
          topic: true,
        },
        orderBy: {
          priority: 'asc',
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to find topic interests: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find topic interest by user and topic
   *
   * @param userId - User ID
   * @param topicId - Topic ID
   * @returns Topic interest or null if not found
   */
  async findByUserAndTopic(userId: string, topicId: string): Promise<TopicInterest | null> {
    try {
      return await this.prisma.topicInterest.findUnique({
        where: {
          userId_topicId: {
            userId,
            topicId,
          },
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to find topic interest: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update topic interest priority
   *
   * @param userId - User ID
   * @param topicId - Topic ID
   * @param priority - New priority
   * @returns Updated topic interest
   */
  async updatePriority(userId: string, topicId: string, priority: number): Promise<TopicInterest> {
    try {
      this.logger.debug(`Updating priority for user ${userId}, topic ${topicId} to ${priority}`);

      const interest = await this.prisma.topicInterest.update({
        where: {
          userId_topicId: {
            userId,
            topicId,
          },
        },
        data: {
          priority,
        },
      });

      this.logger.log(`Topic interest priority updated: ${interest.id}`);
      return interest;
    } catch (error: any) {
      this.logger.error(`Failed to update priority: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete topic interest
   *
   * @param userId - User ID
   * @param topicId - Topic ID
   */
  async delete(userId: string, topicId: string): Promise<void> {
    try {
      this.logger.debug(`Deleting topic interest for user ${userId}, topic ${topicId}`);

      await this.prisma.topicInterest.delete({
        where: {
          userId_topicId: {
            userId,
            topicId,
          },
        },
      });

      this.logger.log(`Topic interest deleted for user ${userId}, topic ${topicId}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete topic interest: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete all topic interests for a user
   *
   * @param userId - User ID
   * @returns Number of deleted records
   */
  async deleteAllByUserId(userId: string): Promise<number> {
    try {
      this.logger.debug(`Deleting all topic interests for user: ${userId}`);

      const result = await this.prisma.topicInterest.deleteMany({
        where: { userId },
      });

      this.logger.log(`Deleted ${result.count} topic interests for user: ${userId}`);
      return result.count;
    } catch (error: any) {
      this.logger.error(`Failed to delete topic interests: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if user has selected topics
   *
   * @param userId - User ID
   * @returns True if user has selected at least one topic
   */
  async hasSelectedTopics(userId: string): Promise<boolean> {
    try {
      const count = await this.prisma.topicInterest.count({
        where: { userId },
      });
      return count > 0;
    } catch (error: any) {
      this.logger.error(`Failed to check topic selection: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get count of users interested in a topic
   *
   * @param topicId - Topic ID
   * @returns Number of users interested
   */
  async countUsersByTopic(topicId: string): Promise<number> {
    try {
      return await this.prisma.topicInterest.count({
        where: { topicId },
      });
    } catch (error: any) {
      this.logger.error(`Failed to count users by topic: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get most popular topics based on user interests
   *
   * @param limit - Maximum number of topics to return
   * @returns Array of { topicId, count }
   */
  async getMostPopularTopics(
    limit: number = 10,
  ): Promise<Array<{ topicId: string; count: number }>> {
    try {
      const results = await this.prisma.topicInterest.groupBy({
        by: ['topicId'],
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: limit,
      });

      return results.map((result) => ({
        topicId: result.topicId,
        count: result._count.userId,
      }));
    } catch (error: any) {
      this.logger.error(`Failed to get popular topics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Replace all topic interests for a user
   * Useful for updating selections during onboarding
   *
   * @param userId - User ID
   * @param topics - Array of { topicId, priority }
   * @returns Array of created topic interests
   */
  async replaceAll(
    userId: string,
    topics: Array<{ topicId: string; priority: number }>,
  ): Promise<TopicInterest[]> {
    try {
      this.logger.debug(`Replacing all topic interests for user: ${userId}`);

      return await this.prisma.$transaction(async (tx) => {
        // Delete existing
        await tx.topicInterest.deleteMany({
          where: { userId },
        });

        // Create new
        const interests = await Promise.all(
          topics.map((topic) =>
            tx.topicInterest.create({
              data: {
                userId,
                topicId: topic.topicId,
                priority: topic.priority,
              },
            }),
          ),
        );

        return interests;
      });
    } catch (error: any) {
      this.logger.error(`Failed to replace topic interests: ${error.message}`, error.stack);
      throw error;
    }
  }
}

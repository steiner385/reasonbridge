import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { VisitorSession } from '@prisma/client';

/**
 * Visitor Session Repository
 *
 * Data access layer for VisitorSession entity operations.
 * Tracks pre-authentication visitor activity for demo content and analytics.
 *
 * Handles:
 * - Creating visitor sessions
 * - Tracking demo discussion views
 * - Recording interaction timestamps
 * - Converting visitors to users
 */
@Injectable()
export class VisitorSessionRepository {
  private readonly logger = new Logger(VisitorSessionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new visitor session
   *
   * @param sessionId - Unique session identifier (UUID)
   * @param referralSource - How the visitor found the platform
   * @returns Created visitor session
   */
  async create(sessionId: string, referralSource?: string): Promise<VisitorSession> {
    try {
      this.logger.debug(`Creating visitor session: ${sessionId}`);

      const session = await this.prisma.visitorSession.create({
        data: {
          sessionId,
          referralSource,
          viewedDemoDiscussionIds: [],
          interactionTimestamps: [],
        },
      });

      this.logger.log(`Visitor session created: ${session.id}`);
      return session;
    } catch (error: any) {
      this.logger.error(`Failed to create visitor session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find visitor session by session ID
   *
   * @param sessionId - Session identifier
   * @returns Visitor session or null if not found
   */
  async findBySessionId(sessionId: string): Promise<VisitorSession | null> {
    try {
      return await this.prisma.visitorSession.findUnique({
        where: { sessionId },
      });
    } catch (error: any) {
      this.logger.error(`Failed to find visitor session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find or create visitor session
   *
   * @param sessionId - Session identifier
   * @param referralSource - Optional referral source
   * @returns Existing or newly created visitor session
   */
  async findOrCreate(sessionId: string, referralSource?: string): Promise<VisitorSession> {
    try {
      const existing = await this.findBySessionId(sessionId);

      if (existing) {
        return existing;
      }

      return await this.create(sessionId, referralSource);
    } catch (error: any) {
      this.logger.error(`Failed to find or create visitor session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add viewed demo discussion to session
   *
   * @param sessionId - Session identifier
   * @param discussionId - Demo discussion ID
   * @returns Updated visitor session
   */
  async addViewedDiscussion(sessionId: string, discussionId: string): Promise<VisitorSession> {
    try {
      this.logger.debug(`Adding viewed discussion ${discussionId} to session ${sessionId}`);

      const session = await this.findBySessionId(sessionId);

      if (!session) {
        throw new Error('Visitor session not found');
      }

      // Check if already viewed
      if (session.viewedDemoDiscussionIds.includes(discussionId)) {
        return session;
      }

      // Add discussion ID to array
      const updatedSession = await this.prisma.visitorSession.update({
        where: { sessionId },
        data: {
          viewedDemoDiscussionIds: {
            push: discussionId,
          },
          interactionTimestamps: {
            push: new Date(),
          },
        },
      });

      this.logger.log(`Demo discussion view recorded for session: ${sessionId}`);
      return updatedSession;
    } catch (error: any) {
      this.logger.error(`Failed to add viewed discussion: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Record interaction timestamp
   *
   * @param sessionId - Session identifier
   * @returns Updated visitor session
   */
  async recordInteraction(sessionId: string): Promise<VisitorSession> {
    try {
      this.logger.debug(`Recording interaction for session: ${sessionId}`);

      const session = await this.prisma.visitorSession.update({
        where: { sessionId },
        data: {
          interactionTimestamps: {
            push: new Date(),
          },
        },
      });

      return session;
    } catch (error: any) {
      this.logger.error(`Failed to record interaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Convert visitor session to user
   * Links session to newly created user account
   *
   * @param sessionId - Session identifier
   * @param userId - User ID
   * @returns Updated visitor session
   */
  async convertToUser(sessionId: string, userId: string): Promise<VisitorSession> {
    try {
      this.logger.debug(`Converting visitor session ${sessionId} to user ${userId}`);

      const session = await this.prisma.visitorSession.update({
        where: { sessionId },
        data: {
          convertedToUserId: userId,
          convertedAt: new Date(),
        },
      });

      this.logger.log(`Visitor session converted to user: ${sessionId} -> ${userId}`);
      return session;
    } catch (error: any) {
      this.logger.error(`Failed to convert visitor session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get visitor session statistics
   *
   * @param sessionId - Session identifier
   * @returns Statistics object
   */
  async getStatistics(sessionId: string): Promise<{
    viewedDiscussionsCount: number;
    interactionCount: number;
    sessionDurationMinutes: number;
    converted: boolean;
  }> {
    try {
      const session = await this.findBySessionId(sessionId);

      if (!session) {
        throw new Error('Visitor session not found');
      }

      const viewedDiscussionsCount = session.viewedDemoDiscussionIds.length;
      const interactionCount = session.interactionTimestamps.length;

      // Calculate session duration
      let sessionDurationMinutes = 0;
      if (interactionCount > 0) {
        const firstInteraction = session.interactionTimestamps[0];
        const lastInteraction = session.interactionTimestamps[interactionCount - 1];
        if (firstInteraction && lastInteraction) {
          const durationMs = lastInteraction.getTime() - firstInteraction.getTime();
          sessionDurationMinutes = Math.round(durationMs / 1000 / 60);
        }
      }

      return {
        viewedDiscussionsCount,
        interactionCount,
        sessionDurationMinutes,
        converted: !!session.convertedToUserId,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get session statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get conversion rate for sessions with referral source
   *
   * @param referralSource - Referral source filter
   * @returns Conversion statistics
   */
  async getConversionRate(referralSource?: string): Promise<{
    total: number;
    converted: number;
    conversionRate: number;
  }> {
    try {
      const whereClause = referralSource ? { referralSource } : {};

      const total = await this.prisma.visitorSession.count({
        where: whereClause,
      });

      const converted = await this.prisma.visitorSession.count({
        where: {
          ...whereClause,
          convertedToUserId: {
            not: null,
          },
        },
      });

      const conversionRate = total > 0 ? (converted / total) * 100 : 0;

      return {
        total,
        converted,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get conversion rate: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Clean up old visitor sessions
   * Delete sessions older than specified days
   *
   * @param olderThanDays - Number of days
   * @returns Number of deleted sessions
   */
  async cleanupOldSessions(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma.visitorSession.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          // Don't delete converted sessions (for analytics)
          convertedToUserId: null,
        },
      });

      this.logger.log(`Cleaned up ${result.count} old visitor sessions`);
      return result.count;
    } catch (error: any) {
      this.logger.error(`Failed to cleanup old sessions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get most viewed demo discussions
   *
   * @param limit - Maximum number of results
   * @returns Array of { discussionId, viewCount }
   */
  async getMostViewedDemoDiscussions(
    limit: number = 10,
  ): Promise<Array<{ discussionId: string; viewCount: number }>> {
    try {
      // This requires a raw query since we're querying array elements
      const result = await this.prisma.$queryRaw<
        Array<{ discussion_id: string; view_count: bigint }>
      >`
        SELECT
          unnest(viewed_demo_discussion_ids::text[]) as discussion_id,
          COUNT(*) as view_count
        FROM visitor_sessions
        WHERE array_length(viewed_demo_discussion_ids, 1) > 0
        GROUP BY discussion_id
        ORDER BY view_count DESC
        LIMIT ${limit}
      `;

      return result.map((row) => ({
        discussionId: row.discussion_id,
        viewCount: Number(row.view_count),
      }));
    } catch (error: any) {
      this.logger.error(`Failed to get most viewed discussions: ${error.message}`, error.stack);
      throw error;
    }
  }
}

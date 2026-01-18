import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CommonGroundGeneratedEvent,
  CommonGroundUpdatedEvent,
} from '@unite-discord/event-schemas/ai';

/**
 * Handles common ground analysis events and creates notifications
 */
@Injectable()
export class CommonGroundNotificationHandler {
  private readonly logger = new Logger(CommonGroundNotificationHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle common-ground.generated event
   * Creates notification when initial common ground analysis is available
   */
  async handleCommonGroundGenerated(event: CommonGroundGeneratedEvent): Promise<void> {
    this.logger.log(
      `Processing common-ground.generated event for topic ${event.payload.topicId}`,
    );

    try {
      // Fetch topic details to get title and participants
      const topic = await this.prisma.discussionTopic.findUnique({
        where: { id: event.payload.topicId },
        select: {
          id: true,
          title: true,
          creatorId: true,
          participantCount: true,
        },
      });

      if (!topic) {
        this.logger.warn(
          `Topic ${event.payload.topicId} not found, skipping notification`,
        );
        return;
      }

      // Build notification content based on analysis results
      const { agreementZones, misunderstandings, genuineDisagreements, overallConsensusScore } =
        event.payload;

      const title = `Common ground analysis available for "${topic.title}"`;
      const body = this.buildGeneratedNotificationBody(
        agreementZones.length,
        misunderstandings.length,
        genuineDisagreements.length,
        overallConsensusScore,
      );

      // TODO: Fetch topic participants when participant tracking is implemented
      // For now, notify topic creator only
      const recipientIds = [topic.creatorId];

      // Create notifications for all recipients
      await this.createNotifications({
        recipientIds,
        type: 'common_ground',
        title,
        body,
        actionUrl: `/topics/${topic.id}/common-ground`,
        metadata: {
          topicId: topic.id,
          version: event.payload.version,
          agreementZoneCount: agreementZones.length,
          misunderstandingCount: misunderstandings.length,
          disagreementCount: genuineDisagreements.length,
          consensusScore: overallConsensusScore,
        },
      });

      this.logger.log(
        `Created ${recipientIds.length} notifications for common-ground.generated event`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle common-ground.generated event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle common-ground.updated event
   * Creates notification when common ground analysis is updated with new insights
   */
  async handleCommonGroundUpdated(event: CommonGroundUpdatedEvent): Promise<void> {
    this.logger.log(
      `Processing common-ground.updated event for topic ${event.payload.topicId}`,
    );

    try {
      // Fetch topic details
      const topic = await this.prisma.discussionTopic.findUnique({
        where: { id: event.payload.topicId },
        select: {
          id: true,
          title: true,
          creatorId: true,
          participantCount: true,
        },
      });

      if (!topic) {
        this.logger.warn(
          `Topic ${event.payload.topicId} not found, skipping notification`,
        );
        return;
      }

      // Build notification content based on changes
      const { changes, newAnalysis } = event.payload;

      const title = `New insights in "${topic.title}"`;
      const body = this.buildUpdatedNotificationBody(changes);

      // TODO: Fetch topic participants when participant tracking is implemented
      // For now, notify topic creator only
      const recipientIds = [topic.creatorId];

      // Create notifications for all recipients
      await this.createNotifications({
        recipientIds,
        type: 'common_ground',
        title,
        body,
        actionUrl: `/topics/${topic.id}/common-ground`,
        metadata: {
          topicId: topic.id,
          previousVersion: event.payload.previousVersion,
          newVersion: event.payload.newVersion,
          changes: changes,
          consensusScore: newAnalysis.overallConsensusScore,
          reason: event.payload.reason,
        },
      });

      this.logger.log(
        `Created ${recipientIds.length} notifications for common-ground.updated event`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle common-ground.updated event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Build notification body for initial common ground generation
   */
  private buildGeneratedNotificationBody(
    agreementCount: number,
    misunderstandingCount: number,
    disagreementCount: number,
    consensusScore?: number,
  ): string {
    const parts: string[] = [];

    if (agreementCount > 0) {
      parts.push(`${agreementCount} area${agreementCount === 1 ? '' : 's'} of agreement found`);
    }

    if (misunderstandingCount > 0) {
      parts.push(`${misunderstandingCount} misunderstanding${misunderstandingCount === 1 ? '' : 's'} identified`);
    }

    if (disagreementCount > 0) {
      parts.push(`${disagreementCount} genuine disagreement${disagreementCount === 1 ? '' : 's'} analyzed`);
    }

    if (consensusScore !== undefined) {
      const percentage = Math.round(consensusScore * 100);
      parts.push(`Overall consensus: ${percentage}%`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'Common ground analysis completed';
  }

  /**
   * Build notification body for updated common ground analysis
   */
  private buildUpdatedNotificationBody(changes: CommonGroundUpdatedEvent['payload']['changes']): string {
    const highlights: string[] = [];

    // Highlight new agreements
    if (changes.newAgreementZones > 0) {
      highlights.push(`${changes.newAgreementZones} new agreement${changes.newAgreementZones === 1 ? '' : 's'}`);
    }

    // Highlight resolved misunderstandings
    if (changes.resolvedMisunderstandings > 0) {
      highlights.push(`${changes.resolvedMisunderstandings} misunderstanding${changes.resolvedMisunderstandings === 1 ? '' : 's'} resolved`);
    }

    // Highlight consensus change
    if (changes.consensusScoreChange !== undefined && changes.consensusScoreChange !== 0) {
      const change = changes.consensusScoreChange > 0 ? 'improved' : 'decreased';
      const percentage = Math.abs(Math.round(changes.consensusScoreChange * 100));
      highlights.push(`Consensus ${change} by ${percentage}%`);
    }

    // Highlight new misunderstandings if no positive changes
    if (highlights.length === 0 && changes.newMisunderstandings > 0) {
      highlights.push(`${changes.newMisunderstandings} new misunderstanding${changes.newMisunderstandings === 1 ? '' : 's'}`);
    }

    // Highlight new disagreements if no other changes
    if (highlights.length === 0 && changes.newDisagreements > 0) {
      highlights.push(`${changes.newDisagreements} new disagreement${changes.newDisagreements === 1 ? '' : 's'}`);
    }

    return highlights.length > 0
      ? highlights.join(' • ')
      : 'Common ground analysis updated';
  }

  /**
   * Create notification records
   * NOTE: This currently logs notifications until the Notification model is implemented in the database
   */
  private async createNotifications(params: {
    recipientIds: string[];
    type: string;
    title: string;
    body: string;
    actionUrl: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    const { recipientIds, type, title, body, actionUrl, metadata } = params;

    // Log notification details (placeholder until Notification model exists in schema)
    this.logger.log(
      `Would create ${recipientIds.length} notification(s) of type "${type}"`,
    );
    this.logger.debug(
      `Notification details: title="${title}", body="${body}", actionUrl="${actionUrl}"`,
    );
    this.logger.debug(`Recipients: ${recipientIds.join(', ')}`);
    this.logger.debug(`Metadata: ${JSON.stringify(metadata)}`);

    // TODO: Uncomment when Notification model is added to Prisma schema (see task T198)
    /*
    await this.prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        type,
        title,
        body,
        actionUrl,
        metadata: JSON.stringify(metadata),
        isRead: false,
      })),
    });
    */

    // TODO: Emit WebSocket events for real-time delivery when WebSocket gateway is implemented (see task T200)
    // TODO: Queue email/push notifications based on user preferences
  }
}

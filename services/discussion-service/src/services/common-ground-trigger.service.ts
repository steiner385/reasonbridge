import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Service responsible for triggering common ground analysis
 * when certain thresholds are met.
 *
 * Trigger conditions (from data-model.md):
 * - Response count increases by 10+ OR
 * - 6+ hours have elapsed since last analysis
 */
@Injectable()
export class CommonGroundTriggerService {
  private readonly logger = new Logger(CommonGroundTriggerService.name);

  // Trigger thresholds
  private readonly RESPONSE_DELTA_THRESHOLD = 10;
  private readonly TIME_THRESHOLD_HOURS = 6;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if common ground analysis should be triggered for a topic
   * and trigger it if conditions are met.
   *
   * @param topicId - The ID of the topic to check
   * @returns true if analysis was triggered, false otherwise
   */
  async checkAndTrigger(topicId: string): Promise<boolean> {
    try {
      // Get topic with current counts
      const topic = await this.prisma.discussionTopic.findUnique({
        where: { id: topicId },
        select: {
          id: true,
          responseCount: true,
          participantCount: true,
        },
      });

      if (!topic) {
        this.logger.warn(`Topic ${topicId} not found`);
        return false;
      }

      // Get latest common ground analysis (if any)
      const lastAnalysis = await this.prisma.commonGroundAnalysis.findFirst({
        where: { topicId },
        orderBy: { version: 'desc' },
        select: {
          responseCountAtGeneration: true,
          createdAt: true,
        },
      });

      // Check trigger conditions
      const shouldTrigger = this.shouldTriggerAnalysis(topic, lastAnalysis);

      if (shouldTrigger) {
        this.logger.log(`Triggering common ground analysis for topic ${topicId}`);
        await this.triggerAnalysis(topicId);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Error checking/triggering common ground analysis for topic ${topicId}:`,
        error,
      );
      // Don't throw - we don't want to block response creation if trigger fails
      return false;
    }
  }

  /**
   * Determine if analysis should be triggered based on thresholds
   */
  private shouldTriggerAnalysis(
    topic: { responseCount: number; participantCount: number },
    lastAnalysis: { responseCountAtGeneration: number; createdAt: Date } | null,
  ): boolean {
    // If no analysis exists yet, don't trigger until we have enough participation
    if (!lastAnalysis) {
      // Require at least 10 participants and 10 responses before first analysis
      return topic.participantCount >= 10 && topic.responseCount >= 10;
    }

    // Condition 1: Response count increased by 10+
    const responsesDelta = topic.responseCount - lastAnalysis.responseCountAtGeneration;
    if (responsesDelta >= this.RESPONSE_DELTA_THRESHOLD) {
      this.logger.debug(
        `Response delta threshold met: ${responsesDelta} >= ${this.RESPONSE_DELTA_THRESHOLD}`,
      );
      return true;
    }

    // Condition 2: 6+ hours elapsed
    const hoursSinceLastAnalysis =
      (Date.now() - lastAnalysis.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastAnalysis >= this.TIME_THRESHOLD_HOURS) {
      this.logger.debug(
        `Time threshold met: ${hoursSinceLastAnalysis.toFixed(2)} hours >= ${this.TIME_THRESHOLD_HOURS} hours`,
      );
      return true;
    }

    return false;
  }

  /**
   * Trigger common ground analysis by calling AI service
   *
   * Note: This is a placeholder implementation. In the full implementation,
   * this would either:
   * 1. Make an HTTP call to the AI service's /generate/common-ground endpoint
   * 2. Publish an event to trigger the AI service
   *
   * For now, we'll just log that the trigger would happen.
   */
  private async triggerAnalysis(topicId: string): Promise<void> {
    // TODO: Implement actual trigger mechanism
    // Options:
    // 1. HTTP POST to ai-service: POST /generate/common-ground
    // 2. Publish event: 'common-ground.trigger-requested'

    this.logger.log(`[PLACEHOLDER] Would trigger common ground analysis for topic ${topicId}`);
    this.logger.log(
      `Next step: Implement HTTP client to call AI service /generate/common-ground endpoint`,
    );

    // Future implementation would look like:
    // const propositions = await this.fetchPropositions(topicId);
    // const responses = await this.fetchResponses(topicId);
    // await this.aiServiceClient.post('/generate/common-ground', {
    //   topicId,
    //   propositions,
    //   responses,
    // });
  }
}

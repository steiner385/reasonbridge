/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Interface for topic edit history record
 */
export interface TopicEditRecord {
  id: string;
  topicId: string;
  editorId: string;
  editedAt: Date;
  previousTitle?: string;
  newTitle?: string;
  previousDescription?: string;
  newDescription?: string;
  previousTags: string[];
  newTags: string[];
  changeReason?: string;
  flaggedForReview: boolean;
}

/**
 * Service for managing topic edit history
 * Feature 016: Topic Management (T012)
 *
 * Provides immutable audit trail for all topic changes
 * No updates/deletes - only inserts and reads
 */
@Injectable()
export class TopicsEditService {
  private readonly logger = new Logger(TopicsEditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an edit history record
   * T012: Record topic changes for transparency and audit
   *
   * @param params - Edit history parameters
   * @returns Created edit record
   */
  async createEditRecord(params: {
    topicId: string;
    editorId: string;
    previousTitle?: string;
    newTitle?: string;
    previousDescription?: string;
    newDescription?: string;
    previousTags?: string[];
    newTags?: string[];
    changeReason?: string;
    flagForReview?: boolean;
  }): Promise<TopicEditRecord> {
    try {
      const editRecord = await this.prisma.topicEdit.create({
        data: {
          topicId: params.topicId,
          editorId: params.editorId,
          previousTitle: params.previousTitle,
          newTitle: params.newTitle,
          previousDescription: params.previousDescription,
          newDescription: params.newDescription,
          previousTags: params.previousTags || [],
          newTags: params.newTags || [],
          changeReason: params.changeReason,
          flaggedForReview: params.flagForReview || false,
        },
      });

      this.logger.log(
        `Created edit record ${editRecord.id} for topic ${params.topicId} by user ${params.editorId}`,
      );

      return editRecord as TopicEditRecord;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create edit record: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get edit history for a topic
   * T012: Retrieve complete change log
   *
   * @param topicId - Topic ID
   * @param limit - Maximum number of records to return (default 50)
   * @returns Array of edit records, newest first
   */
  async getTopicEditHistory(topicId: string, limit: number = 50): Promise<TopicEditRecord[]> {
    try {
      const history = await this.prisma.topicEdit.findMany({
        where: { topicId },
        orderBy: { editedAt: 'desc' },
        take: limit,
      });

      this.logger.debug(`Retrieved ${history.length} edit records for topic ${topicId}`);
      return history as TopicEditRecord[];
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to retrieve edit history: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get edit history for a user
   * T012: Retrieve all edits by a specific user
   *
   * @param editorId - User ID
   * @param limit - Maximum number of records to return (default 50)
   * @returns Array of edit records, newest first
   */
  async getUserEditHistory(editorId: string, limit: number = 50): Promise<TopicEditRecord[]> {
    try {
      const history = await this.prisma.topicEdit.findMany({
        where: { editorId },
        orderBy: { editedAt: 'desc' },
        take: limit,
      });

      this.logger.debug(`Retrieved ${history.length} edit records for user ${editorId}`);
      return history as TopicEditRecord[];
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to retrieve user edit history: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get edits flagged for moderator review
   * T012: Retrieve edits that need moderation attention
   *
   * @param limit - Maximum number of records to return (default 20)
   * @returns Array of flagged edit records, newest first
   */
  async getFlaggedEdits(limit: number = 20): Promise<TopicEditRecord[]> {
    try {
      const flaggedEdits = await this.prisma.topicEdit.findMany({
        where: { flaggedForReview: true },
        orderBy: { editedAt: 'desc' },
        take: limit,
      });

      this.logger.debug(`Retrieved ${flaggedEdits.length} flagged edit records`);
      return flaggedEdits as TopicEditRecord[];
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to retrieve flagged edits: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get the most recent edit for a topic
   * T012: Helper method for displaying latest change
   *
   * @param topicId - Topic ID
   * @returns Most recent edit record or null if no edits
   */
  async getLatestEdit(topicId: string): Promise<TopicEditRecord | null> {
    try {
      const latestEdit = await this.prisma.topicEdit.findFirst({
        where: { topicId },
        orderBy: { editedAt: 'desc' },
      });

      return latestEdit as TopicEditRecord | null;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to retrieve latest edit: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Count total edits for a topic
   * T012: Helper method for displaying edit count
   *
   * @param topicId - Topic ID
   * @returns Total number of edits
   */
  async countTopicEdits(topicId: string): Promise<number> {
    try {
      const count = await this.prisma.topicEdit.count({
        where: { topicId },
      });

      return count;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to count edits: ${err.message}`, err.stack);
      throw error;
    }
  }
}

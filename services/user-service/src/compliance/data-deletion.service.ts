/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, NotFoundException, Optional, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ComplianceAuditService } from './compliance-audit.service.js';
import { S3Service } from '../services/s3.service.js';
import {
  DeletionStatus,
  ComplianceAction,
  AccountStatus,
  Prisma,
  type DataDeletionRequest,
} from '@prisma/client';

/**
 * Result of a deletion request creation
 */
export interface CreateDeletionRequestResult {
  id: string;
  userId: string;
  requestedBy: string;
  scheduledFor: Date;
  status: DeletionStatus;
}

/**
 * Result of executing a deletion
 */
export interface ExecuteDeletionResult {
  success: boolean;
  deletionLog?: DeletionLog;
  error?: string;
}

/**
 * Log of what was deleted during data deletion
 */
export interface DeletionLog {
  userId: string;
  responsesAnonymized: number;
  topicsDeleted: number;
  topicsTransferred: number;
  parentalConsentDeleted: boolean;
  verificationRecordsDeleted: number;
  videoUploadsDeleted: number;
  videoObjectsDeleted: number;
  verificationTokensDeleted: number;
  activityEventsDeleted: number;
  userAnonymized: boolean;
  retainedRecords: string[];
  completedAt: string;
  error?: string;
}

/**
 * Result of batch processing deletion requests
 */
export interface ProcessDeletionResult {
  processed: number;
  succeeded: number;
  failed: number;
}

/**
 * Types of requestors for data deletion
 */
export type DeletionRequestor = 'PARENT' | 'USER' | 'SYSTEM';

/**
 * Service for managing COPPA/GDPR-compliant data deletion requests
 *
 * @remarks
 * This service handles:
 * - Creating data deletion requests with 48-hour grace period
 * - Processing pending deletion requests
 * - Executing deletions (anonymizing user data, deleting content)
 * - Retaining legally required records (ComplianceAuditLog, SafetyReports)
 *
 * Deletion scope:
 * - User record: Anonymized (keep ID for referential integrity)
 * - Responses: Delete content, keep tombstone
 * - ParentalConsent: Deleted
 * - Topics created: Transfer ownership or delete if empty
 * - ComplianceAuditLog: RETAINED (legal requirement)
 * - SafetyReports: RETAINED (legal requirement)
 *
 * @example
 * ```typescript
 * // Create deletion request when consent is withdrawn
 * const request = await dataDeletionService.createDeletionRequest(userId, 'PARENT');
 *
 * // Process pending deletions (run via cron job)
 * const result = await dataDeletionService.processDeletionRequests();
 * ```
 */
@Injectable()
export class DataDeletionService {
  private readonly logger = new Logger(DataDeletionService.name);
  private readonly DELETION_DELAY_HOURS = 48;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: ComplianceAuditService,
    // Optional so unit tests and environments without object storage configured
    // still construct the service; S3 object cleanup is skipped (and logged)
    // when it is not provided.
    @Optional() @Inject(S3Service) private readonly s3Service?: S3Service,
  ) {}

  /**
   * Create a data deletion request with 48-hour scheduled deletion
   *
   * @param userId - The user whose data should be deleted
   * @param requestedBy - Who requested the deletion (PARENT, USER, SYSTEM)
   * @returns The created deletion request
   */
  async createDeletionRequest(
    userId: string,
    requestedBy: DeletionRequestor,
  ): Promise<CreateDeletionRequestResult> {
    this.logger.log(`Creating data deletion request for user ${userId} by ${requestedBy}`);

    const scheduledFor = new Date(Date.now() + this.DELETION_DELAY_HOURS * 60 * 60 * 1000);

    const request = await this.prisma.dataDeletionRequest.create({
      data: {
        userId,
        requestedBy,
        scheduledFor,
        status: DeletionStatus.PENDING,
      },
    });

    // Log audit action - audit failure should not fail the main operation
    try {
      await this.auditService.logAction(userId, ComplianceAction.DATA_DELETION_REQUESTED, {
        requestedBy,
        scheduledFor: scheduledFor.toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to log DATA_DELETION_REQUESTED for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(
      `Data deletion request created for user ${userId}, scheduled for ${scheduledFor.toISOString()}`,
    );

    return {
      id: request.id,
      userId: request.userId,
      requestedBy: request.requestedBy,
      scheduledFor: request.scheduledFor,
      status: request.status,
    };
  }

  /**
   * Get pending deletion requests that are due for processing
   *
   * @returns Array of pending deletion requests
   */
  async getPendingDeletionRequests(): Promise<DataDeletionRequest[]> {
    return this.prisma.dataDeletionRequest.findMany({
      where: {
        status: DeletionStatus.PENDING,
        scheduledFor: { lte: new Date() },
      },
      orderBy: { scheduledFor: 'asc' },
      take: 100, // Process in batches; caller should paginate if more exist
    });
  }

  /**
   * Best-effort deletion of S3 objects (e.g. identity-verification videos).
   *
   * @param keys - S3 object keys to delete
   * @param userId - The owning user (for logging)
   * @returns The number of objects successfully deleted
   *
   * @remarks
   * Never throws: object storage is not transactional, so a failure here must
   * not roll back an already-committed database deletion. Failures are logged
   * for follow-up.
   */
  private async deleteS3Objects(keys: string[], userId: string): Promise<number> {
    if (!this.s3Service) {
      this.logger.warn(
        `S3Service unavailable; ${keys.length} verification video object(s) for user ${userId} were not removed from storage`,
      );
      return 0;
    }

    let deleted = 0;
    for (const key of keys) {
      try {
        await this.s3Service.deleteObject(key);
        deleted += 1;
      } catch (error) {
        this.logger.error(
          `Failed to delete S3 object ${key} for user ${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return deleted;
  }

  /**
   * Execute data deletion for a specific request
   *
   * @param requestId - The ID of the deletion request to execute
   * @returns Result of the deletion execution
   */
  async executeDeletion(requestId: string): Promise<ExecuteDeletionResult> {
    this.logger.log(`Executing data deletion for request ${requestId}`);

    const request = await this.prisma.dataDeletionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Deletion request ${requestId} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${request.userId} not found`);
    }

    const deletionLog: DeletionLog = {
      userId: request.userId,
      responsesAnonymized: 0,
      topicsDeleted: 0,
      topicsTransferred: 0,
      parentalConsentDeleted: false,
      verificationRecordsDeleted: 0,
      videoUploadsDeleted: 0,
      videoObjectsDeleted: 0,
      verificationTokensDeleted: 0,
      activityEventsDeleted: 0,
      userAnonymized: false,
      retainedRecords: ['ComplianceAuditLog', 'SafetyReports'],
      completedAt: '',
    };

    // S3 keys of verification videos, captured inside the transaction so the
    // objects can be deleted from object storage after the DB commit.
    let videoS3Keys: string[] = [];

    try {
      // Mark as in progress
      await this.prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: { status: DeletionStatus.IN_PROGRESS },
      });

      // Execute deletion in a transaction
      await this.prisma.$transaction(async (tx) => {
        // 1. Anonymize responses (delete content, keep tombstone)
        const responseCount = await tx.response.count({
          where: { authorId: request.userId },
        });

        if (responseCount > 0) {
          await tx.response.updateMany({
            where: { authorId: request.userId },
            data: {
              content: '[Content deleted per user request]',
              status: 'REMOVED',
              deletedAt: new Date(),
            },
          });
          deletionLog.responsesAnonymized = responseCount;
        }

        // 2. Handle topics created by user
        const topics = await tx.discussionTopic.findMany({
          where: { creatorId: request.userId },
          select: { id: true, responseCount: true },
          take: 10000, // Limit to prevent unbounded results
        });

        // Delete empty topics
        const emptyTopicIds = topics.filter((t) => t.responseCount === 0).map((t) => t.id);
        if (emptyTopicIds.length > 0) {
          await tx.discussionTopic.deleteMany({
            where: { id: { in: emptyTopicIds } },
          });
          deletionLog.topicsDeleted = emptyTopicIds.length;
        }

        // Transfer non-empty topics to system user (keep content accessible)
        const nonEmptyTopicIds = topics.filter((t) => t.responseCount > 0).map((t) => t.id);
        if (nonEmptyTopicIds.length > 0) {
          // Note: In production, we'd transfer to a system user ID
          // For now, we just anonymize the creator reference
          await tx.discussionTopic.updateMany({
            where: { id: { in: nonEmptyTopicIds } },
            data: { title: '[Author account deleted]' },
          });
          deletionLog.topicsTransferred = nonEmptyTopicIds.length;
        }

        // 3. Delete parental consent record
        try {
          await tx.parentalConsent.delete({
            where: { userId: request.userId },
          });
          deletionLog.parentalConsentDeleted = true;
        } catch {
          // May not exist, that's OK
          this.logger.debug(`No parental consent record found for user ${request.userId}`);
        }

        // 4. Delete identity-verification data. The user row is anonymized in
        //    place (not hard-deleted), so onDelete: Cascade never fires — these
        //    rows must be removed explicitly or they retain PII (phone numbers,
        //    S3 video keys, potentially of minors).
        const videoUploads = await tx.videoUpload.findMany({
          where: { userId: request.userId },
          select: { s3Key: true },
          take: 10000,
        });
        videoS3Keys = videoUploads.map((v) => v.s3Key);

        const videoUploadsDeleted = await tx.videoUpload.deleteMany({
          where: { userId: request.userId },
        });
        deletionLog.videoUploadsDeleted = videoUploadsDeleted.count;

        const verificationRecordsDeleted = await tx.verificationRecord.deleteMany({
          where: { userId: request.userId },
        });
        deletionLog.verificationRecordsDeleted = verificationRecordsDeleted.count;

        const verificationTokensDeleted = await tx.verificationToken.deleteMany({
          where: { userId: request.userId },
        });
        deletionLog.verificationTokensDeleted = verificationTokensDeleted.count;

        // 5. Delete the user's activity feed events (contain denormalized PII).
        const activityEventsDeleted = await tx.activityEvent.deleteMany({
          where: { userId: request.userId },
        });
        deletionLog.activityEventsDeleted = activityEventsDeleted.count;

        // 6. Anonymize user record (keep ID for referential integrity). Null out
        //    every remaining PII column — including emailHash (used for contact
        //    discovery, so a "deleted" user would otherwise stay findable),
        //    parentPhone, bio, and avatar references.
        await tx.user.update({
          where: { id: request.userId },
          data: {
            email: `deleted-${request.userId}@deleted.reasonbridge.org`,
            emailHash: null,
            displayName: '[Deleted User]',
            passwordHash: null,
            phoneNumber: null,
            phoneVerified: false,
            emailVerified: false,
            birthDate: null,
            parentEmail: null,
            parentPhone: null,
            bio: null,
            avatarUrl: null,
            avatarS3Key: null,
            avatarUrls: Prisma.DbNull,
            accountStatus: AccountStatus.DELETED,
          },
        });
        deletionLog.userAnonymized = true;
      });

      // Best-effort deletion of verification-video objects from S3. Done after
      // the DB commit (S3 is not transactional); failures are logged but must
      // not roll back the completed database deletion.
      if (videoS3Keys.length > 0) {
        deletionLog.videoObjectsDeleted = await this.deleteS3Objects(videoS3Keys, request.userId);
      }

      // Mark as completed
      deletionLog.completedAt = new Date().toISOString();
      await this.prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: DeletionStatus.COMPLETED,
          completedAt: new Date(),
          // Use JSON serialization to ensure Prisma JSON compatibility
          deletionLog: JSON.parse(JSON.stringify(deletionLog)),
        },
      });

      // Log audit action
      try {
        await this.auditService.logAction(
          request.userId,
          ComplianceAction.DATA_DELETION_COMPLETED,
          {
            requestId,
            completedAt: deletionLog.completedAt,
            deletionLog,
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to log DATA_DELETION_COMPLETED for user ${request.userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      this.logger.log(`Data deletion completed for user ${request.userId}`);

      return { success: true, deletionLog };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      deletionLog.error = errorMessage;

      // Mark as failed
      await this.prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: DeletionStatus.FAILED,
          // Use JSON serialization to ensure Prisma JSON compatibility
          deletionLog: JSON.parse(JSON.stringify(deletionLog)),
        },
      });

      this.logger.error(
        `Data deletion failed for request ${requestId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process all pending deletion requests that are due
   *
   * @returns Result of batch processing
   */
  async processDeletionRequests(): Promise<ProcessDeletionResult> {
    this.logger.log('Processing pending data deletion requests');

    const pendingRequests = await this.getPendingDeletionRequests();
    const result: ProcessDeletionResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
    };

    for (const request of pendingRequests) {
      result.processed++;

      try {
        const deletionResult = await this.executeDeletion(request.id);
        if (deletionResult.success) {
          result.succeeded++;
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        this.logger.error(
          `Failed to process deletion request ${request.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    this.logger.log(
      `Processed ${result.processed} deletion requests: ${result.succeeded} succeeded, ${result.failed} failed`,
    );

    return result;
  }
}

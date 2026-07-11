/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VideoUploadService } from './video-upload.service.js';
import { VerificationService } from './verification.service.js';

/**
 * Scheduled retention cleanup for identity-verification data (issue #1304).
 *
 * @remarks
 * The user-service already relies on `@nestjs/schedule` (see
 * {@link DataDeletionJob}), but the two documented retention mechanisms were
 * never wired to a cron trigger, so identity-verification face videos and
 * phone-number PII accumulated indefinitely. This job runs daily to:
 *
 * 1. Delete expired {@link VideoUpload} records **and their S3 objects**.
 * 2. Purge `phoneNumber` / OTP fields from expired or consumed
 *    `VerificationRecord` rows.
 *
 * Each step is best-effort and independently guarded so one failure does not
 * prevent the other from running.
 */
@Injectable()
export class VerificationRetentionJob {
  private readonly logger = new Logger(VerificationRetentionJob.name);

  constructor(
    private readonly videoUploadService: VideoUploadService,
    private readonly verificationService: VerificationService,
  ) {}

  /**
   * Daily retention sweep. Runs at midnight when cron is enabled.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron(): Promise<void> {
    this.logger.log('Starting verification-data retention job...');

    try {
      const videosDeleted = await this.videoUploadService.deleteExpiredVideoUploads();
      this.logger.log(`Retention: removed ${videosDeleted} expired video upload(s)`);
    } catch (error) {
      this.logger.error(
        'Retention: failed to delete expired video uploads',
        error instanceof Error ? error.stack : String(error),
      );
    }

    try {
      const purged = await this.verificationService.purgeExpiredVerificationData();
      this.logger.log(`Retention: purged PII from ${purged} verification record(s)`);
    } catch (error) {
      this.logger.error(
        'Retention: failed to purge expired verification data',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

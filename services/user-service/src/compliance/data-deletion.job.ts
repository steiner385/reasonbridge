/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataDeletionService } from './data-deletion.service.js';

/**
 * Scheduled job for processing data deletion requests after 48-hour grace period
 *
 * @remarks
 * This job runs hourly (when cron is enabled) to process pending data deletion
 * requests that have passed their 48-hour grace period. This grace period allows
 * parents/guardians to reconsider before permanent data deletion.
 *
 * This is required for compliance with:
 * - COPPA (Children's Online Privacy Protection Act) - Right to deletion
 * - GDPR Article 17 (Right to erasure)
 * - GDPR-K Article 8 (Children's data protection)
 *
 * Deletion workflow:
 * 1. Parent/user requests deletion → DataDeletionRequest created with 48-hour delay
 * 2. This job runs hourly to find requests past their scheduledFor time
 * 3. For each due request, executes data deletion (anonymization)
 * 4. Audit logs are retained for legal compliance
 *
 * @example
 * ```typescript
 * // The job is typically triggered by cron, but can be invoked manually:
 * await dataDeletionJob.handleCron();
 * ```
 */
@Injectable()
export class DataDeletionJob {
  private readonly logger = new Logger(DataDeletionJob.name);

  constructor(private readonly dataDeletionService: DataDeletionService) {}

  /**
   * Main cron handler - runs hourly to process pending deletion requests
   *
   * @remarks
   * This method:
   * 1. Finds all PENDING deletion requests where scheduledFor <= now
   * 2. Executes data deletion for each request
   * 3. Logs success/failure for monitoring
   *
   * The 48-hour grace period is enforced by the DataDeletionService.createDeletionRequest()
   * method which sets scheduledFor = requestedAt + 48 hours.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    this.logger.log('Starting data deletion processing job...');

    try {
      const result = await this.dataDeletionService.processDeletionRequests();

      if (result.processed === 0) {
        this.logger.log('No pending deletion requests to process');
      } else {
        this.logger.log(
          `Data deletion job completed: ${result.succeeded}/${result.processed} succeeded, ${result.failed} failed`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Data deletion job failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error; // Re-throw for job scheduler to handle
    }
  }

  /**
   * Get count of pending deletion requests
   *
   * @returns Count of deletion requests waiting to be processed
   *
   * @remarks
   * Useful for monitoring and alerting. High counts may indicate:
   * - Increased deletion requests (possibly due to compliance concerns)
   * - Job execution failures
   */
  async getPendingCount(): Promise<number> {
    const pendingRequests = await this.dataDeletionService.getPendingDeletionRequests();
    return pendingRequests.length;
  }
}

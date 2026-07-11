/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ComplianceAuditService,
  CONTACT_METADATA_RETENTION_DAYS,
} from './compliance-audit.service.js';

/**
 * Scheduled job that enforces the retention window for contact PII stored in
 * compliance audit-log metadata.
 *
 * @remarks
 * Compliance audit rows are retained indefinitely for COPPA/GDPR legal
 * requirements, but the ipAddress/userAgent values inside their `metadata` are
 * subject to GDPR data minimisation. This job strips that PII once the audit
 * row is older than {@link CONTACT_METADATA_RETENTION_DAYS}, leaving the rest
 * of the immutable audit trail intact.
 *
 * @example
 * ```typescript
 * // Normally cron-triggered, but can be invoked manually:
 * await piiRetentionJob.handleCron();
 * ```
 */
@Injectable()
export class PiiRetentionJob {
  private readonly logger = new Logger(PiiRetentionJob.name);

  constructor(private readonly auditService: ComplianceAuditService) {}

  /**
   * Main cron handler - runs daily to strip expired contact PII from audit logs.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleCron(): Promise<void> {
    this.logger.log('Starting compliance audit-log PII retention sweep...');

    try {
      const stripped = await this.auditService.stripExpiredContactMetadata();
      if (stripped === 0) {
        this.logger.log('No compliance audit logs required PII stripping');
      }
    } catch (error) {
      this.logger.error(
        'Compliance audit-log PII retention job failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error; // Re-throw for job scheduler to handle
    }
  }
}

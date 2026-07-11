/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VerificationService } from './verification.service.js';

/**
 * Scheduled cleanup of expired email verification tokens (issue #1304).
 *
 * @remarks
 * {@link VerificationService.cleanupExpiredTokens} was documented as "should be
 * called periodically via cron job" but had no callers anywhere, so expired and
 * used 6-digit email verification codes accumulated forever. This job wires it
 * to a daily trigger.
 */
@Injectable()
export class VerificationTokenCleanupJob {
  private readonly logger = new Logger(VerificationTokenCleanupJob.name);

  constructor(private readonly verificationService: VerificationService) {}

  /**
   * Daily cleanup of expired/used verification tokens. Runs at 01:00 when cron
   * is enabled (offset from other midnight jobs to spread database load).
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleCron(): Promise<void> {
    this.logger.log('Starting expired verification-token cleanup job...');

    try {
      const removed = await this.verificationService.cleanupExpiredTokens();
      this.logger.log(`Cleaned up ${removed} expired verification token(s)`);
    } catch (error) {
      this.logger.error(
        'Verification-token cleanup job failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

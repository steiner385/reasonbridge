/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Request DTO for bot detection flag
 */
export interface BotFlaggedDto {
  /** User ID flagged for bot suspicion */
  userId: string;
  /** Bot detection risk score (0.0 - 1.0) */
  riskScore: number;
  /** Detected patterns (e.g., 'very_new_account', 'rapid_posting') */
  patterns: string[];
  /** Human-readable reasoning */
  reasoning: string;
  /** When the detection was made */
  detectedAt: string;
}

/**
 * Response DTO for bot flag operation
 */
export interface BotFlaggedResponse {
  success: boolean;
  reportId?: string;
  error?: string;
}

/**
 * Internal controller for bot detection integration.
 *
 * Called by user-service when bot-like patterns are detected.
 * Creates a report in the moderation queue for review.
 *
 * @remarks
 * This is an internal endpoint without JWT protection, intended for
 * service-to-service communication only.
 */
@Controller('internal/bot-flagged')
export class InternalBotFlaggedController {
  private readonly logger = new Logger(InternalBotFlaggedController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle bot detection flag from user-service.
   *
   * Creates a Report with category BOT_SUSPICION for moderator review.
   * Priority is determined by the risk score.
   *
   * @param dto - Bot detection data
   * @returns Result with report ID
   */
  @Post()
  async handleBotFlagged(@Body() dto: BotFlaggedDto): Promise<BotFlaggedResponse> {
    this.logger.log(`Received bot flag for user ${dto.userId} with risk score ${dto.riskScore}`);

    try {
      // Check if there's already a pending bot suspicion report for this user
      const existingReport = await this.prisma.report.findFirst({
        where: {
          contentType: 'user',
          contentId: dto.userId,
          category: 'BOT_SUSPICION',
          status: 'PENDING',
        },
      });

      if (existingReport) {
        this.logger.log(
          `Bot suspicion report already exists for user ${dto.userId}: ${existingReport.id}`,
        );
        return {
          success: true,
          reportId: existingReport.id,
        };
      }

      // Create a system report for bot suspicion
      // Use a system user ID or null for automated reports
      const report = await this.prisma.report.create({
        data: {
          reporterId: dto.userId, // Self-report (system-generated)
          contentType: 'user',
          contentId: dto.userId,
          category: 'BOT_SUSPICION',
          description: this.buildDescription(dto),
          status: 'PENDING',
        },
      });

      this.logger.log(`Created bot suspicion report ${report.id} for user ${dto.userId}`);

      return {
        success: true,
        reportId: report.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create bot suspicion report: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build description for the bot suspicion report.
   */
  private buildDescription(dto: BotFlaggedDto): string {
    const parts = [
      `Risk Score: ${(dto.riskScore * 100).toFixed(0)}%`,
      `Detected Patterns: ${dto.patterns.join(', ') || 'None'}`,
      `Analysis: ${dto.reasoning}`,
      `Detected At: ${dto.detectedAt}`,
    ];
    return parts.join('\n');
  }
}

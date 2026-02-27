/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Param, HttpCode, HttpStatus, Logger, Inject } from '@nestjs/common';
import { ParentalConsentService } from './parental-consent.service.js';
import type {
  ChildActivitySummaryDto,
  WithdrawConsentResponseDto,
} from './dto/child-activity.dto.js';

/**
 * Controller for parental dashboard functionality
 *
 * @remarks
 * This controller provides endpoints for parents to:
 * - View their child's activity summary
 * - Withdraw consent for their child's account
 *
 * All endpoints are token-authenticated (using the consent token from email)
 * rather than requiring login, for easier parent access.
 */
@Controller('parental-dashboard')
export class ParentalDashboardController {
  private readonly logger = new Logger(ParentalDashboardController.name);

  constructor(
    @Inject(ParentalConsentService) private readonly consentService: ParentalConsentService,
  ) {}

  /**
   * Get child's activity summary
   *
   * @param token - The consent token from the parental consent email
   * @returns Child activity summary including account info and activity stats
   */
  @Get('child/:token')
  async getChildSummary(@Param('token') token: string): Promise<ChildActivitySummaryDto> {
    this.logger.log(`Fetching child summary for token (length: ${token.length})`);
    return this.consentService.getChildActivitySummary(token);
  }

  /**
   * Withdraw parental consent for a child's account
   *
   * @param token - The consent token from the parental consent email
   * @returns Success response
   *
   * @remarks
   * After withdrawal:
   * - Child's access is restricted to read-only
   * - Child cannot create new topics or responses
   * - Child can still view content but not participate
   */
  @Post('withdraw/:token')
  @HttpCode(HttpStatus.OK)
  async withdrawConsent(@Param('token') token: string): Promise<WithdrawConsentResponseDto> {
    this.logger.log(`Processing consent withdrawal for token (length: ${token.length})`);
    await this.consentService.withdrawConsentByToken(token);
    return {
      success: true,
      message: 'Parental consent has been withdrawn. Your child will have restricted access.',
    };
  }
}

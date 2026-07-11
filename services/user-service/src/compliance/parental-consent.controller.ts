/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Ip,
  HttpCode,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { redactEmail } from '@reason-bridge/common';
import { JwtAuthGuard, type JwtPayload } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ParentalConsentService } from './parental-consent.service.js';
import {
  RequestConsentDto,
  RequestConsentResponseDto,
  VerifyConsentResponseDto,
  ConsentStatusDto,
} from './dto/parental-consent.dto.js';

/**
 * Controller for managing parental consent flows
 *
 * @remarks
 * Endpoints:
 * - POST /parental-consent/request - Request consent (requires auth)
 * - GET /parental-consent/verify/:token - Verify consent (public)
 * - GET /parental-consent/status - Get current status (requires auth)
 * - POST /parental-consent/resend - Resend consent email (requires auth)
 */
@Controller('parental-consent')
export class ParentalConsentController {
  private readonly logger = new Logger(ParentalConsentController.name);

  constructor(
    @Inject(ParentalConsentService) private readonly consentService: ParentalConsentService,
  ) {}

  /**
   * Request parental consent for the current user
   *
   * @remarks
   * Used when a minor wants to provide their parent's email
   * and initiate the consent process.
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async requestConsent(
    @CurrentUser() jwtPayload: JwtPayload,
    @Body() dto: RequestConsentDto,
  ): Promise<RequestConsentResponseDto> {
    this.logger.log(
      `Consent request from user ${jwtPayload.sub} to ${redactEmail(dto.parentEmail)}`,
    );

    const result = await this.consentService.initiateConsent(jwtPayload.sub, dto.parentEmail);

    return {
      message: 'Consent request email sent to parent',
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  /**
   * Verify parental consent via token
   *
   * @remarks
   * Public endpoint - called when parent clicks the consent link.
   * The token is validated and the child's account is activated.
   */
  @Get('verify/:token')
  async verifyConsent(
    @Param('token') token: string,
    @Ip() ipAddress: string,
  ): Promise<VerifyConsentResponseDto> {
    this.logger.log(`Consent verification attempt from IP ${ipAddress}`);

    return this.consentService.verifyConsent(token, ipAddress);
  }

  /**
   * Get the current user's consent status
   *
   * @remarks
   * Returns the current status, parent email, and expiration info.
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser() jwtPayload: JwtPayload): Promise<ConsentStatusDto> {
    const status = await this.consentService.getConsentStatus(jwtPayload.sub);

    return {
      status: status.status,
      parentEmail: status.parentEmail,
      expiresAt: status.expiresAt,
      verifiedAt: status.verifiedAt,
    };
  }

  /**
   * Resend the consent email with a new token
   *
   * @remarks
   * Generates a new token and sends a fresh consent email.
   * The old token is invalidated.
   */
  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async resendConsentEmail(
    @CurrentUser() jwtPayload: JwtPayload,
  ): Promise<RequestConsentResponseDto> {
    this.logger.log(`Resending consent email for user ${jwtPayload.sub}`);

    const result = await this.consentService.resendConsentEmail(jwtPayload.sub);

    return {
      message: 'Consent request email has been resent',
      expiresAt: result.expiresAt.toISOString(),
    };
  }
}

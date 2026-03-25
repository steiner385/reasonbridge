/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';
import { SmsService, type SmsResult } from '../services/sms.service.js';

/**
 * DTO for sending a verification code via SMS
 */
export class SendVerificationCodeDto {
  /**
   * Phone number in E.164 format (e.g., +14155551234)
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +14155551234)',
  })
  phoneNumber!: string;

  /**
   * Verification code to send (typically 6 digits)
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code!: string;
}

/**
 * Response DTO for SMS send result
 */
export interface SendSmsResponseDto {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Internal SMS Controller
 *
 * Provides internal endpoints for service-to-service SMS operations.
 * These endpoints are not protected by JWT auth since they're for
 * internal microservice communication only.
 *
 * @remarks
 * - Endpoints prefixed with /internal are for service-to-service calls
 * - Should only be accessible within the internal network (not exposed via API gateway)
 * - Uses fire-and-forget pattern on client side but returns result for error handling
 */
@Controller('internal/sms')
export class InternalSmsController {
  private readonly logger = new Logger(InternalSmsController.name);

  constructor(private readonly smsService: SmsService) {}

  /**
   * Send a verification code via SMS
   *
   * Called by user-service during phone verification flow.
   * Uses AWS SNS to deliver the SMS message.
   *
   * @param dto - Phone number and verification code
   * @returns Result with success status and optional messageId
   */
  @Post('verification-code')
  @HttpCode(HttpStatus.OK)
  async sendVerificationCode(@Body() dto: SendVerificationCodeDto): Promise<SendSmsResponseDto> {
    this.logger.log(`Sending verification code to ${this.maskPhone(dto.phoneNumber)}`);

    const result: SmsResult = await this.smsService.sendVerificationCode(dto.phoneNumber, dto.code);

    if (!result.success) {
      this.logger.warn(
        `Failed to send verification SMS to ${this.maskPhone(dto.phoneNumber)}: ${result.error}`,
      );
    }

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * Mask phone number for logging (privacy)
   */
  private maskPhone(phoneNumber: string): string {
    if (phoneNumber.length < 4) return '****';
    return phoneNumber.substring(0, 3) + '****' + phoneNumber.substring(phoneNumber.length - 2);
  }
}

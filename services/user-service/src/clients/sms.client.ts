/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { getServiceUrl } from '@reason-bridge/common';

/**
 * Result of an SMS send operation
 */
export interface SmsDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SMS Client for notification-service
 *
 * Provides SMS delivery capabilities by calling the notification-service's
 * internal SMS endpoint. Used primarily for phone verification OTP codes.
 *
 * @remarks
 * - Calls notification-service's /internal/sms/verification-code endpoint
 * - Returns delivery result for error handling (not fire-and-forget)
 * - Phone numbers must be in E.164 format (e.g., +14155551234)
 *
 * @example
 * ```typescript
 * const result = await smsClient.sendVerificationCode('+14155551234', '123456');
 * if (!result.success) {
 *   logger.warn(`Failed to send SMS: ${result.error}`);
 * }
 * ```
 */
@Injectable()
export class SmsClient {
  private readonly logger = new Logger(SmsClient.name);
  private readonly baseUrl: string;
  private readonly internalApiKey: string | undefined;

  constructor() {
    this.baseUrl = process.env['NOTIFICATION_SERVICE_URL'] || getServiceUrl('NOTIFICATION_SERVICE');
    this.internalApiKey = process.env['INTERNAL_API_KEY'];
  }

  /**
   * Build headers for internal API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.internalApiKey) {
      headers['X-Internal-Api-Key'] = this.internalApiKey;
    }
    return headers;
  }

  /**
   * Send a verification code via SMS
   *
   * Calls notification-service to deliver the SMS via AWS SNS.
   * Returns result to allow caller to handle delivery failures.
   *
   * @param phoneNumber - E.164 format phone number
   * @param code - Verification code to send
   * @returns Delivery result with success status
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<SmsDeliveryResult> {
    const endpoint = `${this.baseUrl}/internal/sms/verification-code`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ phoneNumber, code }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(
          `SMS delivery failed for ${this.maskPhone(phoneNumber)}: HTTP ${response.status}`,
        );
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const result = (await response.json()) as SmsDeliveryResult;

      if (result.success) {
        this.logger.log(
          `SMS sent to ${this.maskPhone(phoneNumber)}, messageId: ${result.messageId}`,
        );
      } else {
        this.logger.warn(`SMS delivery failed for ${this.maskPhone(phoneNumber)}: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending SMS to ${this.maskPhone(phoneNumber)}: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Mask phone number for logging (privacy)
   */
  private maskPhone(phoneNumber: string): string {
    if (phoneNumber.length < 4) return '****';
    return phoneNumber.substring(0, 3) + '****' + phoneNumber.substring(phoneNumber.length - 2);
  }
}

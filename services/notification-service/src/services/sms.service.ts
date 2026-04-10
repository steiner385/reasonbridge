/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { SNSClient, PublishCommand, SetSMSAttributesCommand } from '@aws-sdk/client-sns';
import { SMS_RATE_LIMITS } from '../constants/index.js';

/**
 * SMS delivery result
 */
export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Rate limit tracking for SMS
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * SMS Service using AWS SNS
 *
 * Handles SMS delivery for urgent parent notifications and verification codes.
 * Uses AWS SNS which routes to appropriate SMS providers.
 *
 * Rate limiting:
 * - 5 SMS per phone number per hour (configurable)
 * - 100 SMS per hour globally (cost protection)
 */
@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private readonly snsClient: SNSClient;

  // Rate limiting maps
  private readonly phoneRateLimits = new Map<string, RateLimitEntry>();
  private globalSmsCount = 0;
  private globalResetAt = 0;

  // Configuration (from constants)
  private readonly MAX_SMS_PER_PHONE_PER_HOUR = SMS_RATE_LIMITS.MAX_PER_PHONE_PER_HOUR;
  private readonly MAX_SMS_GLOBAL_PER_HOUR = SMS_RATE_LIMITS.MAX_GLOBAL_PER_HOUR;
  private readonly RATE_LIMIT_WINDOW_MS = SMS_RATE_LIMITS.WINDOW_MS;

  constructor() {
    const region = process.env['AWS_REGION'] || 'us-east-1';
    const endpoint = process.env['AWS_ENDPOINT']; // LocalStack endpoint for dev

    this.snsClient = new SNSClient({
      region,
      ...(endpoint && { endpoint }),
      credentials: {
        accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || 'test',
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || 'test',
      },
    });
  }

  async onModuleInit(): Promise<void> {
    // Configure SNS SMS attributes for better deliverability
    try {
      await this.snsClient.send(
        new SetSMSAttributesCommand({
          attributes: {
            DefaultSMSType: 'Transactional', // Higher priority, costs more
            DefaultSenderID: 'ReasonBridge',
          },
        }),
      );
      this.logger.log('SNS SMS attributes configured');
    } catch (error) {
      // Non-fatal - LocalStack may not support all attributes
      this.logger.warn('Could not configure SNS SMS attributes (may be LocalStack)', error);
    }
  }

  /**
   * Send SMS message
   *
   * @param phoneNumber - E.164 format phone number (e.g., +14155551234)
   * @param message - SMS message content (max 160 chars for single SMS)
   * @returns Result with success status and message ID
   */
  async sendSms(phoneNumber: string, message: string): Promise<SmsResult> {
    // Validate phone number format (E.164)
    if (!this.isValidE164(phoneNumber)) {
      return {
        success: false,
        error: `Invalid phone number format: ${phoneNumber}. Expected E.164 format (e.g., +14155551234)`,
      };
    }

    // Check rate limits
    const rateLimitError = this.checkRateLimits(phoneNumber);
    if (rateLimitError) {
      this.logger.warn(`SMS rate limited for ${this.maskPhone(phoneNumber)}: ${rateLimitError}`);
      return { success: false, error: rateLimitError };
    }

    try {
      const command = new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'ReasonBridge',
          },
        },
      });

      const response = await this.snsClient.send(command);

      // Update rate limit counters
      this.incrementRateLimits(phoneNumber);

      this.logger.log(
        `SMS sent to ${this.maskPhone(phoneNumber)}, messageId: ${response.MessageId}`,
      );

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send SMS to ${this.maskPhone(phoneNumber)}: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send urgent parent notification via SMS
   */
  async sendParentAlert(
    phoneNumber: string,
    childName: string,
    alertType: string,
    shortMessage: string,
  ): Promise<SmsResult> {
    // Keep SMS short and actionable
    const message = `ReasonBridge Alert: ${alertType} involving ${childName}. ${shortMessage} Check your email for details.`;

    // Truncate to 160 chars if needed (single SMS segment)
    const truncatedMessage = message.length > 160 ? message.substring(0, 157) + '...' : message;

    return this.sendSms(phoneNumber, truncatedMessage);
  }

  /**
   * Send verification code via SMS
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<SmsResult> {
    const message = `Your ReasonBridge verification code is: ${code}. This code expires in 10 minutes.`;
    return this.sendSms(phoneNumber, message);
  }

  /**
   * Validate E.164 phone number format
   */
  private isValidE164(phoneNumber: string): boolean {
    // E.164: + followed by 1-15 digits
    return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
  }

  /**
   * Check rate limits for a phone number
   */
  private checkRateLimits(phoneNumber: string): string | null {
    const now = Date.now();

    // Check global limit
    if (now > this.globalResetAt) {
      this.globalSmsCount = 0;
      this.globalResetAt = now + this.RATE_LIMIT_WINDOW_MS;
    }
    if (this.globalSmsCount >= this.MAX_SMS_GLOBAL_PER_HOUR) {
      return 'Global SMS rate limit exceeded. Please try again later.';
    }

    // Check per-phone limit
    const phoneLimit = this.phoneRateLimits.get(phoneNumber);
    if (phoneLimit) {
      if (now > phoneLimit.resetAt) {
        this.phoneRateLimits.delete(phoneNumber);
      } else if (phoneLimit.count >= this.MAX_SMS_PER_PHONE_PER_HOUR) {
        return 'Too many SMS sent to this number. Please try again later.';
      }
    }

    return null;
  }

  /**
   * Increment rate limit counters after successful send
   */
  private incrementRateLimits(phoneNumber: string): void {
    const now = Date.now();

    // Increment global counter
    this.globalSmsCount++;

    // Increment per-phone counter
    const existing = this.phoneRateLimits.get(phoneNumber);
    if (existing && now < existing.resetAt) {
      existing.count++;
    } else {
      this.phoneRateLimits.set(phoneNumber, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW_MS,
      });
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

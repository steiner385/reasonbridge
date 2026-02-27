/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

/**
 * Parameters for sending a digest email.
 */
export interface DigestEmailParams {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML version of the email body */
  html: string;
  /** Plain text version of the email body */
  text: string;
}

/**
 * Service for sending emails via AWS SES.
 *
 * @remarks
 * This service handles email sending for the notification service,
 * including parent activity digest emails.
 *
 * In development, uses LocalStack SES endpoint.
 * In production, uses actual AWS SES.
 *
 * @example
 * ```typescript
 * await emailService.sendDigestEmail({
 *   to: 'parent@example.com',
 *   subject: 'Weekly Activity Summary',
 *   html: '<h1>Summary</h1>',
 *   text: 'Summary',
 * });
 * ```
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly fromAddress: string;

  constructor() {
    const region = process.env['AWS_REGION'] || 'us-east-1';
    const endpoint = process.env['AWS_ENDPOINT'];

    this.sesClient = new SESClient({
      region,
      ...(endpoint && { endpoint }),
    });

    this.fromAddress = process.env['EMAIL_FROM_ADDRESS'] || 'noreply@reasonbridge.org';

    this.logger.log(
      `EmailService initialized with region: ${region}, endpoint: ${endpoint || 'AWS default'}`,
    );
  }

  /**
   * Send a digest email.
   *
   * @param params - Email parameters
   * @throws Error if email sending fails
   */
  async sendDigestEmail(params: DigestEmailParams): Promise<void> {
    const command = new SendEmailCommand({
      Source: this.fromAddress,
      Destination: {
        ToAddresses: [params.to],
      },
      Message: {
        Subject: {
          Data: params.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: params.html,
            Charset: 'UTF-8',
          },
          Text: {
            Data: params.text,
            Charset: 'UTF-8',
          },
        },
      },
    });

    try {
      await this.sesClient.send(command);
      this.logger.log(`Digest email sent to ${params.to}`);
    } catch (error) {
      this.logger.error(`Failed to send digest email to ${params.to}:`, error);
      throw error;
    }
  }
}

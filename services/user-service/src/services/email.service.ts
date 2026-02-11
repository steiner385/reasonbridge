/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

/**
 * Parameters for sending parental consent emails
 */
export interface ParentalConsentEmailParams {
  parentEmail: string;
  childDisplayName: string;
  consentToken: string;
  expiresAt: Date;
}

/**
 * Service for sending emails via AWS SES
 *
 * @remarks
 * This service handles:
 * - Parental consent request emails
 * - Email template rendering (HTML and plain text)
 *
 * In development, uses LocalStack SES endpoint.
 * In production, uses actual AWS SES.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly fromAddress: string;
  private readonly appBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    const endpoint = this.configService.get<string>('AWS_ENDPOINT');

    this.sesClient = new SESClient({
      region,
      ...(endpoint && { endpoint }),
    });

    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM_ADDRESS') || 'noreply@reasonbridge.org';
    this.appBaseUrl = this.configService.get<string>('APP_BASE_URL') || 'http://localhost:5173';

    this.logger.log(
      `EmailService initialized with region: ${region}, endpoint: ${endpoint || 'AWS default'}`,
    );
  }

  /**
   * Send a parental consent request email to a parent/guardian
   *
   * @param params - Email parameters including parent email, child name, and consent token
   */
  async sendParentalConsentEmail(params: ParentalConsentEmailParams): Promise<void> {
    const consentUrl = `${this.appBaseUrl}/parental-consent/verify/${params.consentToken}`;
    const expiresFormatted = this.formatDate(params.expiresAt);

    const htmlBody = this.buildConsentEmailHtml(
      params.childDisplayName,
      consentUrl,
      expiresFormatted,
    );
    const textBody = this.buildConsentEmailText(
      params.childDisplayName,
      consentUrl,
      expiresFormatted,
    );

    const command = new SendEmailCommand({
      Source: this.fromAddress,
      Destination: {
        ToAddresses: [params.parentEmail],
      },
      Message: {
        Subject: {
          Data: 'Parental Consent Required - ReasonBridge',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    try {
      await this.sesClient.send(command);
      this.logger.log(`Parental consent email sent to ${params.parentEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send parental consent email to ${params.parentEmail}:`, error);
      throw error;
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private buildConsentEmailHtml(
    childDisplayName: string,
    consentUrl: string,
    dashboardUrl: string,
    expiresFormatted: string,
  ): string {
    const currentYear = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Parental Consent Required</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background-color: #4F46E5; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .warning { background-color: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6B7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header"><h1>ReasonBridge</h1><p>Parental Consent Required</p></div>
  <div class="content">
    <p>Hello,</p>
    <p><strong>${childDisplayName}</strong> has registered for a ReasonBridge account and has indicated that you are their parent or guardian.</p>
    <p>ReasonBridge is a discussion platform designed for thoughtful, evidence-based conversations. Because ${childDisplayName} is under the age of consent in your region, we require your permission before they can fully access the platform.</p>
    <h3>What ReasonBridge Offers:</h3>
    <ul>
      <li>Structured debates and discussions</li>
      <li>AI-powered feedback to encourage thoughtful responses</li>
      <li>Bias detection and claim verification</li>
      <li>A moderated, safe environment</li>
    </ul>
    <p><strong>To grant consent, please click the button below:</strong></p>
    <p style="text-align: center;"><a href="${consentUrl}" class="button">Grant Parental Consent</a></p>
    <div class="warning">
      <strong>Important:</strong>
      <ul style="margin: 5px 0; padding-left: 20px;">
        <li>This link expires on <strong>${expiresFormatted}</strong></li>
        <li>Only click this link if you approve of ${childDisplayName} using ReasonBridge</li>
        <li>You can withdraw consent at any time by contacting us</li>
      </ul>
    </div>
    <h3>Parental Dashboard</h3>
    <p>After granting consent, you can monitor your child's activity at any time:</p>
    <p><a href="${dashboardUrl}" style="color: #4F46E5;">View Parental Dashboard</a></p>
    <p>From the dashboard, you can also withdraw consent if needed.</p>
    <p>If you did not expect this email, please disregard this message.</p>
    <p>Best regards,<br>The ReasonBridge Team</p>
  </div>
  <div class="footer">
    <p>This email was sent because someone registered for ReasonBridge and provided your email.</p>
    <p>&copy; ${currentYear} ReasonBridge. All rights reserved.</p>
  </div>
</body>
</html>`;
  }

  private buildConsentEmailText(
    childDisplayName: string,
    consentUrl: string,
    dashboardUrl: string,
    expiresFormatted: string,
  ): string {
    const currentYear = new Date().getFullYear();
    return `PARENTAL CONSENT REQUIRED - REASONBRIDGE
=========================================

Hello,

${childDisplayName} has registered for a ReasonBridge account and has indicated that you are their parent or guardian.

ReasonBridge is a discussion platform designed for thoughtful, evidence-based conversations. Because ${childDisplayName} is under the age of consent in your region, we require your permission before they can fully access the platform.

WHAT REASONBRIDGE OFFERS:
- Structured debates and discussions
- AI-powered feedback to encourage thoughtful responses
- Bias detection and claim verification
- A moderated, safe environment

TO GRANT CONSENT:
Please visit the following link:
${consentUrl}

IMPORTANT:
- This link expires on ${expiresFormatted}
- Only click this link if you approve of ${childDisplayName} using ReasonBridge
- You can withdraw consent at any time by contacting us

If you did not expect this email, please disregard this message.

Best regards,
The ReasonBridge Team

---
(c) ${currentYear} ReasonBridge. All rights reserved.`;
  }
}

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';

/**
 * Push notification payload
 */
export interface PushPayload {
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Optional image URL */
  imageUrl?: string;
  /** Deep link URL for the app */
  actionUrl?: string;
  /** Custom data payload */
  data?: Record<string, string>;
  /** Notification priority */
  priority?: 'high' | 'normal';
}

/**
 * Push delivery result
 */
export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Push Notification Service using Firebase Cloud Messaging (FCM)
 *
 * Handles push notification delivery to mobile devices and web browsers.
 * Requires FCM credentials to be configured via environment variables.
 *
 * Environment variables:
 * - FCM_PROJECT_ID: Firebase project ID
 * - FCM_PRIVATE_KEY: Firebase service account private key
 * - FCM_CLIENT_EMAIL: Firebase service account email
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private fcmInitialized = false;

  // FCM HTTP v1 API endpoint
  private readonly FCM_API_URL = 'https://fcm.googleapis.com/v1/projects';

  // Configuration from environment
  private projectId: string | undefined;
  private privateKey: string | undefined;
  private clientEmail: string | undefined;

  async onModuleInit(): Promise<void> {
    this.projectId = process.env['FCM_PROJECT_ID'];
    this.privateKey = process.env['FCM_PRIVATE_KEY']?.replace(/\\n/g, '\n');
    this.clientEmail = process.env['FCM_CLIENT_EMAIL'];

    if (this.projectId && this.privateKey && this.clientEmail) {
      this.fcmInitialized = true;
      this.logger.log('FCM push notification service initialized');
    } else {
      this.logger.warn(
        'FCM credentials not configured. Push notifications will be disabled. ' +
          'Set FCM_PROJECT_ID, FCM_PRIVATE_KEY, and FCM_CLIENT_EMAIL environment variables.',
      );
    }
  }

  /**
   * Check if push notifications are available
   */
  isAvailable(): boolean {
    return this.fcmInitialized;
  }

  /**
   * Send push notification to a device
   *
   * @param fcmToken - Device FCM registration token
   * @param payload - Notification content
   * @returns Result with success status and message ID
   */
  async sendPush(fcmToken: string, payload: PushPayload): Promise<PushResult> {
    if (!this.fcmInitialized) {
      return {
        success: false,
        error: 'Push notifications not configured. FCM credentials missing.',
      };
    }

    if (!fcmToken) {
      return {
        success: false,
        error: 'FCM token is required',
      };
    }

    try {
      const accessToken = await this.getAccessToken();

      const message = {
        message: {
          token: fcmToken,
          notification: {
            title: payload.title,
            body: payload.body,
            ...(payload.imageUrl && { image: payload.imageUrl }),
          },
          data: {
            ...(payload.actionUrl && { actionUrl: payload.actionUrl }),
            ...payload.data,
          },
          android: {
            priority: payload.priority === 'high' ? 'HIGH' : 'NORMAL',
            notification: {
              click_action: 'OPEN_APP',
              channel_id: 'parent_alerts',
            },
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: payload.title,
                  body: payload.body,
                },
                sound: payload.priority === 'high' ? 'default' : undefined,
                badge: 1,
              },
            },
          },
          webpush: {
            notification: {
              title: payload.title,
              body: payload.body,
              icon: '/icons/notification-icon.png',
              ...(payload.actionUrl && { click_action: payload.actionUrl }),
            },
          },
        },
      };

      const response = await fetch(`${this.FCM_API_URL}/${this.projectId}/messages:send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`FCM API error: ${response.status} ${errorBody}`);
      }

      const result = (await response.json()) as { name?: string };
      const messageId = result.name?.split('/').pop() || result.name;

      this.logger.log(`Push notification sent, messageId: ${messageId}`);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send push notification: ${errorMessage}`);

      // Check for token expiration/invalidity
      if (errorMessage.includes('UNREGISTERED') || errorMessage.includes('INVALID_ARGUMENT')) {
        return {
          success: false,
          error: 'Device token is invalid or expired. User needs to re-register.',
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send parent safety alert push notification
   */
  async sendParentAlert(
    fcmToken: string,
    childName: string,
    alertType: string,
    message: string,
    actionUrl?: string,
  ): Promise<PushResult> {
    return this.sendPush(fcmToken, {
      title: `Safety Alert: ${childName}`,
      body: `${alertType}: ${message}`,
      actionUrl,
      priority: 'high',
      data: {
        type: 'parent_safety_alert',
        alertType,
      },
    });
  }

  /**
   * Get OAuth2 access token for FCM HTTP v1 API
   * Uses service account credentials with JWT
   */
  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    // Create JWT header and claims
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const claims: Record<string, string | number> = {
      iss: this.clientEmail!,
      sub: this.clientEmail!,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    };

    // Create JWT (simplified - in production use a proper JWT library)
    const jwt = await this.createJwt(header, claims);

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  /**
   * Create signed JWT for Google OAuth2
   */
  private async createJwt(
    header: Record<string, string>,
    claims: Record<string, string | number>,
  ): Promise<string> {
    const { createSign } = await import('crypto');

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signatureInput = `${encodedHeader}.${encodedClaims}`;

    const sign = createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(this.privateKey!, 'base64url');

    return `${signatureInput}.${signature}`;
  }
}

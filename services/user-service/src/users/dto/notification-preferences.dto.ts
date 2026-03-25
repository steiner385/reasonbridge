/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsBoolean, IsOptional } from 'class-validator';

/**
 * NotificationPreferencesDto - Full notification preferences representation
 */
export class NotificationPreferencesDto {
  /**
   * Whether to receive email notifications
   */
  @IsBoolean()
  emailNotifications!: boolean;

  /**
   * Whether to receive push notifications
   */
  @IsBoolean()
  pushNotifications!: boolean;

  /**
   * Whether to receive weekly digest emails
   */
  @IsBoolean()
  weeklyDigest!: boolean;

  /**
   * Create default notification preferences
   */
  static getDefaults(): NotificationPreferencesDto {
    const dto = new NotificationPreferencesDto();
    dto.emailNotifications = true;
    dto.pushNotifications = false;
    dto.weeklyDigest = true;
    return dto;
  }
}

/**
 * UpdateNotificationPreferencesDto - Partial update for notification preferences
 * All fields are optional for PATCH-style updates
 */
export class UpdateNotificationPreferencesDto {
  /**
   * Update email notifications preference
   */
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  /**
   * Update push notifications preference
   */
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  /**
   * Update weekly digest preference
   */
  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;
}

/**
 * NotificationPreferencesResponseDto - Response DTO with metadata
 */
export class NotificationPreferencesResponseDto extends NotificationPreferencesDto {
  /**
   * User ID these preferences belong to
   */
  userId!: string;

  /**
   * When preferences were last updated
   */
  updatedAt!: Date;

  /**
   * Whether push notifications are available (user has FCM token)
   */
  pushAvailable!: boolean;

  constructor(
    userId: string,
    preferences: {
      emailNotifications: boolean;
      pushNotifications: boolean;
      weeklyDigest: boolean;
    },
    updatedAt: Date,
    pushAvailable: boolean,
  ) {
    super();
    this.userId = userId;
    this.emailNotifications = preferences.emailNotifications;
    this.pushNotifications = preferences.pushNotifications;
    this.weeklyDigest = preferences.weeklyDigest;
    this.updatedAt = updatedAt;
    this.pushAvailable = pushAvailable;
  }
}

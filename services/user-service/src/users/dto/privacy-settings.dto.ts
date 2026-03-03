/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEnum, IsOptional } from 'class-validator';

/**
 * Profile visibility levels for privacy settings
 * - PUBLIC: Visible to all users
 * - FOLLOWERS_ONLY: Visible to followers only
 * - PRIVATE: Visible only to the user themselves
 */
export enum ProfileVisibility {
  PUBLIC = 'PUBLIC',
  FOLLOWERS_ONLY = 'FOLLOWERS_ONLY',
  PRIVATE = 'PRIVATE',
}

/**
 * Trust score visibility (cannot be PRIVATE for platform integrity)
 * Trust scores contribute to platform-wide credibility and must remain somewhat visible.
 */
export enum TrustVisibility {
  PUBLIC = 'PUBLIC',
  FOLLOWERS_ONLY = 'FOLLOWERS_ONLY',
}

/**
 * PrivacySettingsDto - Full privacy settings representation
 */
export class PrivacySettingsDto {
  /**
   * Visibility of activity history (contributions, topics, responses)
   */
  @IsEnum(ProfileVisibility)
  activityHistory!: ProfileVisibility;

  /**
   * Visibility of detailed trust score breakdown (ABI components)
   * Cannot be PRIVATE - trust scores are part of platform integrity
   */
  @IsEnum(TrustVisibility)
  detailedTrustScores!: TrustVisibility;

  /**
   * Visibility of follower list
   */
  @IsEnum(ProfileVisibility)
  followerList!: ProfileVisibility;

  /**
   * Visibility of following list
   */
  @IsEnum(ProfileVisibility)
  followingList!: ProfileVisibility;

  /**
   * Create default privacy settings (all public)
   */
  static getDefaults(): PrivacySettingsDto {
    const dto = new PrivacySettingsDto();
    dto.activityHistory = ProfileVisibility.PUBLIC;
    dto.detailedTrustScores = TrustVisibility.PUBLIC;
    dto.followerList = ProfileVisibility.PUBLIC;
    dto.followingList = ProfileVisibility.PUBLIC;
    return dto;
  }
}

/**
 * UpdatePrivacySettingsDto - Partial update for privacy settings
 * All fields are optional for PATCH-style updates
 */
export class UpdatePrivacySettingsDto {
  /**
   * Update activity history visibility
   */
  @IsOptional()
  @IsEnum(ProfileVisibility)
  activityHistory?: ProfileVisibility;

  /**
   * Update detailed trust scores visibility
   */
  @IsOptional()
  @IsEnum(TrustVisibility)
  detailedTrustScores?: TrustVisibility;

  /**
   * Update follower list visibility
   */
  @IsOptional()
  @IsEnum(ProfileVisibility)
  followerList?: ProfileVisibility;

  /**
   * Update following list visibility
   */
  @IsOptional()
  @IsEnum(ProfileVisibility)
  followingList?: ProfileVisibility;
}

/**
 * PrivacySettingsResponseDto - Response DTO with metadata
 */
export class PrivacySettingsResponseDto extends PrivacySettingsDto {
  /**
   * User ID these settings belong to
   */
  userId!: string;

  /**
   * When settings were last updated
   */
  updatedAt!: Date;

  constructor(
    userId: string,
    settings: {
      activityHistory: ProfileVisibility;
      detailedTrustScores: TrustVisibility;
      followerList: ProfileVisibility;
      followingList: ProfileVisibility;
    },
    updatedAt: Date,
  ) {
    super();
    this.userId = userId;
    this.activityHistory = settings.activityHistory;
    this.detailedTrustScores = settings.detailedTrustScores;
    this.followerList = settings.followerList;
    this.followingList = settings.followingList;
    this.updatedAt = updatedAt;
  }
}

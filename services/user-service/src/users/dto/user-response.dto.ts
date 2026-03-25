/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  User,
  VerificationLevel,
  UserStatus,
  UserRole,
  UserPrivacySettings,
} from '@prisma/client';
import { PrivacySettingsDto, ProfileVisibility, TrustVisibility } from './privacy-settings.dto.js';

/**
 * Response DTO for user data (includes private fields like email)
 */
export class UserResponseDto {
  id!: string;
  email!: string;
  displayName!: string;
  bio!: string | null;
  avatarUrl!: string | null;
  verificationLevel!: VerificationLevel;
  trustScoreAbility!: number;
  trustScoreBenevolence!: number;
  trustScoreIntegrity!: number;
  moralFoundationProfile!: any | null;
  positionFingerprint!: any | null;
  topicAffinities!: any | null;
  status!: UserStatus;
  role!: UserRole;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.displayName = user.displayName ?? '';
    this.bio = user.bio ?? null;
    this.avatarUrl = user.avatarUrl ?? null;
    this.verificationLevel = user.verificationLevel;
    this.trustScoreAbility = Number(user.trustScoreAbility);
    this.trustScoreBenevolence = Number(user.trustScoreBenevolence);
    this.trustScoreIntegrity = Number(user.trustScoreIntegrity);
    this.moralFoundationProfile = user.moralFoundationProfile;
    this.positionFingerprint = user.positionFingerprint;
    this.topicAffinities = user.topicAffinities;
    this.status = user.status;
    this.role = user.role;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}

/**
 * Public response DTO for viewing other users' profiles
 * Does not expose sensitive information like email
 */
export class PublicUserResponseDto {
  id!: string;
  displayName!: string;
  bio!: string | null;
  avatarUrl!: string | null;
  verificationLevel!: VerificationLevel;
  trustScoreAbility!: number;
  trustScoreBenevolence!: number;
  trustScoreIntegrity!: number;
  status!: UserStatus;
  createdAt!: Date;
  followerCount?: number;
  followingCount?: number;
  privacySettings!: PrivacySettingsDto;

  constructor(
    user: User & { privacySettings?: UserPrivacySettings | null },
    followerCount?: number,
    followingCount?: number,
  ) {
    this.id = user.id;
    this.displayName = user.displayName ?? '';
    this.bio = user.bio ?? null;
    this.avatarUrl = user.avatarUrl ?? null;
    this.verificationLevel = user.verificationLevel;
    this.trustScoreAbility = Number(user.trustScoreAbility);
    this.trustScoreBenevolence = Number(user.trustScoreBenevolence);
    this.trustScoreIntegrity = Number(user.trustScoreIntegrity);
    this.status = user.status;
    this.createdAt = user.createdAt;
    this.followerCount = followerCount;
    this.followingCount = followingCount;

    // Map privacy settings or use defaults if not set
    if (user.privacySettings) {
      this.privacySettings = {
        activityHistory: user.privacySettings.activityHistory as ProfileVisibility,
        detailedTrustScores: user.privacySettings.detailedTrustScores as TrustVisibility,
        followerList: user.privacySettings.followerList as ProfileVisibility,
        followingList: user.privacySettings.followingList as ProfileVisibility,
      };
    } else {
      this.privacySettings = PrivacySettingsDto.getDefaults();
    }
  }
}

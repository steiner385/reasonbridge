/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { User, VerificationLevel, UserStatus } from '@prisma/client';

/**
 * Response DTO for user data (includes private fields like email)
 */
export class UserResponseDto {
  id!: string;
  email!: string;
  displayName!: string;
  verificationLevel!: VerificationLevel;
  trustScoreAbility!: number;
  trustScoreBenevolence!: number;
  trustScoreIntegrity!: number;
  moralFoundationProfile!: any | null;
  positionFingerprint!: any | null;
  topicAffinities!: any | null;
  status!: UserStatus;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.displayName = user.displayName ?? '';
    this.verificationLevel = user.verificationLevel;
    this.trustScoreAbility = Number(user.trustScoreAbility);
    this.trustScoreBenevolence = Number(user.trustScoreBenevolence);
    this.trustScoreIntegrity = Number(user.trustScoreIntegrity);
    this.moralFoundationProfile = user.moralFoundationProfile;
    this.positionFingerprint = user.positionFingerprint;
    this.topicAffinities = user.topicAffinities;
    this.status = user.status;
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
  verificationLevel!: VerificationLevel;
  trustScoreAbility!: number;
  trustScoreBenevolence!: number;
  trustScoreIntegrity!: number;
  status!: UserStatus;
  createdAt!: Date;

  constructor(user: User) {
    this.id = user.id;
    this.displayName = user.displayName ?? '';
    this.verificationLevel = user.verificationLevel;
    this.trustScoreAbility = Number(user.trustScoreAbility);
    this.trustScoreBenevolence = Number(user.trustScoreBenevolence);
    this.trustScoreIntegrity = Number(user.trustScoreIntegrity);
    this.status = user.status;
    this.createdAt = user.createdAt;
  }
}

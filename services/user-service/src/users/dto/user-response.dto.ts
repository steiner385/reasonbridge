/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { User, VerificationLevel, UserStatus, UserRole } from '@prisma/client';

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

  constructor(user: User, followerCount?: number, followingCount?: number) {
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
  }
}

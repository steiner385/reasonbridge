/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * User types matching the backend User entity
 */

export enum VerificationLevel {
  BASIC = 'BASIC',
  ENHANCED = 'ENHANCED',
  VERIFIED_HUMAN = 'VERIFIED_HUMAN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  verificationLevel: VerificationLevel;
  trustScoreAbility: number;
  trustScoreBenevolence: number;
  trustScoreIntegrity: number;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;

  // Optional fields
  moralFoundationProfile?: unknown;
  positionFingerprint?: unknown;
  topicAffinities?: unknown;
}

export interface UserProfile extends User {
  // Additional profile-specific data can be added here
  followerCount?: number;
  followingCount?: number;
  topicCount?: number;
  responseCount?: number;
}

export interface UserSummary {
  id: string;
  displayName: string;
}

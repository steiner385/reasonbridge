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

/**
 * User role for platform permissions
 */
export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

/**
 * Parental consent status for minor users
 */
export type ParentConsentStatus = 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'WITHDRAWN';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  verificationLevel: VerificationLevel;
  trustScoreAbility: number;
  trustScoreBenevolence: number;
  trustScoreIntegrity: number;
  status: UserStatus;
  role?: UserRole;
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
  avatarUrl?: string;

  /**
   * Whether the user is a minor (under age of consent in their region)
   */
  isMinor?: boolean;

  /**
   * Parental consent status for minor users
   */
  parentConsentStatus?: ParentConsentStatus;
}

export interface UserSummary {
  id: string;
  displayName: string;
}

/**
 * Profile visibility levels for privacy settings
 */
export type ProfileVisibility = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';

/**
 * Trust score visibility (cannot be PRIVATE for platform integrity)
 */
export type TrustVisibility = 'PUBLIC' | 'FOLLOWERS_ONLY';

/**
 * User privacy preferences for profile sections
 */
export interface PrivacySettings {
  activityHistory: ProfileVisibility;
  detailedTrustScores: TrustVisibility;
  followerList: ProfileVisibility;
  followingList: ProfileVisibility;
  updatedAt?: string;
}

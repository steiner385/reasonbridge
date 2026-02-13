/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Response DTO for follow/unfollow operations
 */
export class FollowResponseDto {
  /** Whether the operation was successful */
  success: boolean;

  /** Human-readable message */
  message: string;

  /** Current follow state */
  isFollowing: boolean;

  /** ID of the followed user */
  followedUserId: string;

  /** Timestamp of the follow action (if following) */
  followedAt?: string;

  constructor(partial: {
    success: boolean;
    message: string;
    isFollowing: boolean;
    followedUserId: string;
    followedAt?: Date;
  }) {
    this.success = partial.success;
    this.message = partial.message;
    this.isFollowing = partial.isFollowing;
    this.followedUserId = partial.followedUserId;
    this.followedAt = partial.followedAt?.toISOString();
  }
}

/**
 * Response DTO for follow status check
 */
export class FollowStatusDto {
  /** Whether the current user is following the target user */
  isFollowing: boolean;

  /** Number of followers the target user has */
  followerCount: number;

  /** Number of users the target user is following */
  followingCount: number;

  constructor(partial: { isFollowing: boolean; followerCount: number; followingCount: number }) {
    this.isFollowing = partial.isFollowing;
    this.followerCount = partial.followerCount;
    this.followingCount = partial.followingCount;
  }
}

/**
 * User summary for follower/following lists
 */
export class FollowUserDto {
  /** User ID */
  id: string;

  /** Display name */
  displayName: string | null;

  /** When the follow relationship was created */
  followedAt: string;

  constructor(partial: { id: string; displayName: string | null; followedAt: Date }) {
    this.id = partial.id;
    this.displayName = partial.displayName;
    this.followedAt = partial.followedAt.toISOString();
  }
}

/**
 * Response DTO for paginated followers list
 */
export class FollowersResponseDto {
  /** List of followers */
  followers: FollowUserDto[];

  /** Total number of followers */
  total: number;

  /** Current limit */
  limit: number;

  /** Current offset */
  offset: number;

  constructor(partial: {
    followers: Array<{
      id: string;
      displayName: string | null;
      followedAt: Date;
    }>;
    total: number;
    limit: number;
    offset: number;
  }) {
    this.followers = partial.followers.map((f) => new FollowUserDto(f));
    this.total = partial.total;
    this.limit = partial.limit;
    this.offset = partial.offset;
  }
}

/**
 * Response DTO for paginated following list
 */
export class FollowingResponseDto {
  /** List of users being followed */
  following: FollowUserDto[];

  /** Total number of users being followed */
  total: number;

  /** Current limit */
  limit: number;

  /** Current offset */
  offset: number;

  constructor(partial: {
    following: Array<{
      id: string;
      displayName: string | null;
      followedAt: Date;
    }>;
    total: number;
    limit: number;
    offset: number;
  }) {
    this.following = partial.following.map((f) => new FollowUserDto(f));
    this.total = partial.total;
    this.limit = partial.limit;
    this.offset = partial.offset;
  }
}

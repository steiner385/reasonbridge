/**
 * User-related type definitions
 */

/**
 * Unique identifier for a user in the system
 */
export type UserId = string;

/**
 * Discord snowflake ID
 */
export type DiscordId = string;

/**
 * User role in the platform
 */
export type UserRole = 'participant' | 'moderator' | 'admin';

/**
 * Base user representation
 */
export interface User {
  id: UserId;
  discordId: DiscordId;
  username: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User profile with additional metadata
 */
export interface UserProfile extends User {
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  participationScore: number;
}

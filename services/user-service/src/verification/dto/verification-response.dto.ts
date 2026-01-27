/**
 * Response DTO for verification requests
 * Contains information about the initiated verification process
 */
export class VerificationResponseDto {
  /**
   * Unique identifier for this verification attempt
   * Used to correlate with confirmation/completion steps
   */
  verificationId!: string;

  /**
   * Type of verification initiated
   */
  type!: string;

  /**
   * When this verification request expires
   * Verification attempts must be completed before this time
   */
  expiresAt!: string; // ISO 8601 datetime

  /**
   * For phone verification: message indicating next steps
   * For government ID: session URL or redirect information
   * For video verification: challenge instruction text
   */
  message?: string;

  /**
   * For government ID verification: URL where user should complete verification
   */
  sessionUrl?: string;

  /**
   * For video verification: details about the challenge to complete
   */
  challenge?: VideoChallenge;

  /**
   * For video verification: pre-signed S3 URL where user uploads video
   */
  videoUploadUrl?: string;

  /**
   * For video verification: when the upload URL expires
   */
  videoUploadExpiresAt?: string; // ISO 8601 datetime

  /**
   * For video verification: maximum allowed file size in bytes
   */
  videoMaxFileSize?: number;

  /**
   * For video verification: minimum video duration in seconds
   */
  videoMinDurationSeconds?: number;

  /**
   * For video verification: maximum video duration in seconds
   */
  videoMaxDurationSeconds?: number;
}

/**
 * Video challenge details
 */
export interface VideoChallenge {
  /**
   * Type of challenge: RANDOM_PHRASE, RANDOM_GESTURE, or TIMESTAMP
   */
  type: string;

  /**
   * Instructions for the user to complete the challenge
   */
  instruction: string;

  /**
   * Random value (phrase or gesture) for RANDOM_PHRASE/RANDOM_GESTURE challenges
   */
  randomValue?: string;

  /**
   * Timestamp for TIMESTAMP challenge
   */
  timestamp?: string;
}

/**
 * DTO for verification record representation
 * Represents a completed or in-progress verification
 */
export class VerificationRecordDto {
  id!: string;
  userId!: string;
  type!: string;
  status!: string; // PENDING | VERIFIED | REJECTED | EXPIRED
  verifiedAt?: string; // ISO 8601 datetime
  expiresAt?: string; // ISO 8601 datetime
  createdAt!: string; // ISO 8601 datetime
}

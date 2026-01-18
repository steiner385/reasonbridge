/**
 * DTO for verification response
 * Contains next steps and necessary information for user
 */
export class VerificationResponseDto {
  verificationId!: string;
  type!: string;
  expiresAt!: string; // ISO 8601 format
  message?: string;
  sessionUrl?: string; // For government ID
  challenge?: VideoChallenge;
  videoUploadUrl?: string; // Pre-signed S3 URL
  videoMaxFileSize?: number;
  videoMinDurationSeconds?: number;
  videoMaxDurationSeconds?: number;
}

/**
 * Video challenge details
 * Specifies what the user must do in their verification video
 */
export interface VideoChallenge {
  type: 'RANDOM_PHRASE' | 'RANDOM_GESTURE' | 'TIMESTAMP';
  instruction: string;
  randomValue?: string; // For phrase challenges
  timestamp?: string; // For timestamp challenges
}

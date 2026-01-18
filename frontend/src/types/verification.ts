/**
 * Verification types and interfaces for user authentication flows
 */

export enum VerificationType {
  PHONE = 'PHONE',
  GOVERNMENT_ID = 'GOVERNMENT_ID',
  VIDEO = 'VIDEO',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum VideoChallengType {
  RANDOM_PHRASE = 'RANDOM_PHRASE',
  RANDOM_GESTURE = 'RANDOM_GESTURE',
  TIMESTAMP = 'TIMESTAMP',
}

export interface VideoChallenge {
  type: VideoChallengType;
  instruction: string;
  randomValue?: string;
  timestamp?: string;
}

export interface VerificationRequest {
  type: VerificationType;
  phoneNumber?: string;
  challengeType?: VideoChallengType;
}

export interface VerificationResponse {
  verificationId: string;
  type: VerificationType;
  expiresAt: string;
  message?: string;
  sessionUrl?: string;
  challenge?: VideoChallenge;
  videoUploadUrl?: string;
  videoUploadExpiresAt?: string;
  videoMaxFileSize?: number;
  videoMinDurationSeconds?: number;
  videoMaxDurationSeconds?: number;
}

export interface VerificationRecord {
  id: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  verifiedAt?: string;
  expiresAt: string;
  providerReference?: string;
  createdAt: string;
}

export interface VideoUploadRequest {
  verificationId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface VideoUploadResponse {
  uploadId: string;
  verificationId: string;
  userId: string;
  s3Key: string;
  s3Url: string;
  uploadedAt: string;
  completedAt?: string;
  expiresAt: string;
}

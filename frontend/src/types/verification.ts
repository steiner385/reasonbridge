/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Verification types and interfaces for user authentication and video recording flows
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

export enum VideoChallengeType {
  RANDOM_PHRASE = 'RANDOM_PHRASE',
  RANDOM_GESTURE = 'RANDOM_GESTURE',
  TIMESTAMP = 'TIMESTAMP',
}

export interface VideoChallenge {
  type: VideoChallengeType;
  instruction: string;
  randomValue?: string; // For RANDOM_PHRASE
  timestamp?: string; // For TIMESTAMP
}

export interface VideoConstraints {
  maxFileSize: number; // in bytes
  minDurationSeconds: number;
  maxDurationSeconds: number;
  supportedMimeTypes: string[];
}

export interface VerificationRequest {
  type: VerificationType;
  phoneNumber?: string;
  challengeType?: VideoChallengeType;
}

export interface VerificationResponse {
  verificationId: string;
  type: VerificationType;
  status: VerificationStatus;
  expiresAt: string; // ISO 8601 datetime
  message: string;
  sessionUrl?: string;
  challenge?: VideoChallenge;
  videoUploadUrl?: string; // Pre-signed S3 URL
  videoUploadExpiresAt?: string; // Upload window expiry
  videoConstraints?: VideoConstraints;
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

export interface VideoUploadMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSeconds: number;
}

export interface VideoUploadResponse {
  videoUploadId: string;
  verificationId: string;
  s3Url: string;
  fileName: string;
  fileSize: number;
  completedAt: string;
  expiresAt: string; // 30-day retention
  message: string;
}

export interface VideoRecorderState {
  isRecording: boolean;
  recordedBlob: Blob | null;
  recordedVideoUrl: string | null;
  recordingDuration: number; // in seconds
  error: string | null;
}

export interface VideoRecorderControls {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  discardRecording: () => void;
  getRecordedBlob: () => Blob | null;
}

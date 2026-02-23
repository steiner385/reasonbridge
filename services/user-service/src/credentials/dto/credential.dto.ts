/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { CredentialType, CredentialStatus } from '@prisma/client';

/**
 * CredentialDto - Data transfer object for domain credential information
 *
 * Contains the credential details, verification status, and boost value
 * for a user's domain expertise claim.
 */
export class CredentialDto {
  /** The unique identifier of the credential */
  id: string;

  /** The unique identifier of the user who owns this credential */
  userId: string;

  /** The unique identifier of the topic tag this credential applies to */
  tagId: string;

  /** Name of the topic tag for display purposes */
  tagName: string;

  /** The type of credential (e.g., ACADEMIC_DOCTORATE, PROFESSIONAL_LICENSE) */
  type: CredentialType;

  /** Human-readable name of the credential type */
  typeName: string;

  /** The title of the credential (e.g., "PhD in Clinical Psychology") */
  title: string;

  /** The issuing institution (e.g., "Stanford University") */
  institution: string;

  /** URL to the uploaded proof document (optional) */
  documentUrl?: string;

  /** External URL for verification (optional) */
  verificationUrl?: string;

  /** Current verification status */
  status: CredentialStatus;

  /** The expertise boost value (0-1 scale) */
  boostValue: number;

  /** ID of the admin who reviewed this credential (if reviewed) */
  reviewedBy?: string;

  /** Notes from the admin review (if reviewed) */
  reviewNotes?: string;

  /** Timestamp when the credential was verified (if verified) */
  verifiedAt?: Date;

  /** Timestamp when the credential expires (for time-limited certs) */
  expiresAt?: Date;

  /** Timestamp when the credential was created */
  createdAt: Date;

  constructor(data: {
    id: string;
    userId: string;
    tagId: string;
    tagName: string;
    type: CredentialType;
    typeName: string;
    title: string;
    institution: string;
    documentUrl?: string;
    verificationUrl?: string;
    status: CredentialStatus;
    boostValue: number;
    reviewedBy?: string;
    reviewNotes?: string;
    verifiedAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.tagId = data.tagId;
    this.tagName = data.tagName;
    this.type = data.type;
    this.typeName = data.typeName;
    this.title = data.title;
    this.institution = data.institution;
    if (data.documentUrl) this.documentUrl = data.documentUrl;
    if (data.verificationUrl) this.verificationUrl = data.verificationUrl;
    this.status = data.status;
    this.boostValue = data.boostValue;
    if (data.reviewedBy) this.reviewedBy = data.reviewedBy;
    if (data.reviewNotes) this.reviewNotes = data.reviewNotes;
    if (data.verifiedAt) this.verifiedAt = data.verifiedAt;
    if (data.expiresAt) this.expiresAt = data.expiresAt;
    this.createdAt = data.createdAt;
  }

  /**
   * Check if the credential is currently active (verified and not expired)
   */
  isActive(): boolean {
    if (this.status !== CredentialStatus.VERIFIED) {
      return false;
    }
    if (this.expiresAt && this.expiresAt < new Date()) {
      return false;
    }
    return true;
  }

  /**
   * Check if the credential is pending review
   */
  isPending(): boolean {
    return this.status === CredentialStatus.PENDING;
  }

  /**
   * Check if the credential has been rejected
   */
  isRejected(): boolean {
    return this.status === CredentialStatus.REJECTED;
  }

  /**
   * Check if the credential has expired
   */
  isExpired(): boolean {
    if (this.status === CredentialStatus.EXPIRED) {
      return true;
    }
    if (this.expiresAt && this.expiresAt < new Date()) {
      return true;
    }
    return false;
  }

  /**
   * Get a human-readable status description
   */
  getStatusDisplayName(): string {
    const displayNames: Record<CredentialStatus, string> = {
      [CredentialStatus.PENDING]: 'Pending Review',
      [CredentialStatus.VERIFIED]: 'Verified',
      [CredentialStatus.REJECTED]: 'Rejected',
      [CredentialStatus.EXPIRED]: 'Expired',
    };
    return displayNames[this.status];
  }
}

/**
 * SubmitCredentialDto - Data transfer object for submitting a new credential
 *
 * Contains the required and optional fields for creating a credential submission.
 */
export class SubmitCredentialDto {
  /** The topic tag ID this credential applies to */
  tagId: string;

  /** The type of credential */
  type: CredentialType;

  /** The title of the credential (e.g., "PhD in Clinical Psychology") */
  title: string;

  /** The issuing institution (e.g., "Stanford University") */
  institution: string;

  /** URL to the uploaded proof document (optional) */
  documentUrl?: string;

  /** External URL for verification (optional) */
  verificationUrl?: string;

  /** Expiration date for time-limited certifications (optional) */
  expiresAt?: Date;

  constructor(data: {
    tagId: string;
    type: CredentialType;
    title: string;
    institution: string;
    documentUrl?: string;
    verificationUrl?: string;
    expiresAt?: Date;
  }) {
    this.tagId = data.tagId;
    this.type = data.type;
    this.title = data.title;
    this.institution = data.institution;
    if (data.documentUrl) this.documentUrl = data.documentUrl;
    if (data.verificationUrl) this.verificationUrl = data.verificationUrl;
    if (data.expiresAt) this.expiresAt = data.expiresAt;
  }
}

/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProvisionalAccessStatus } from '@prisma/client';

/**
 * ProvisionalAccessDto - Data transfer object for provisional access information
 *
 * Contains the provisional access grant details including the user, topic,
 * granter, and expiration status.
 */
export class ProvisionalAccessDto {
  /** The unique identifier of the provisional access record */
  id: string;

  /** The unique identifier of the user who has access */
  userId: string;

  /** Display name of the user who has access */
  userName: string;

  /** The unique identifier of the topic */
  topicId: string;

  /** Title of the topic */
  topicTitle: string;

  /** The unique identifier of the user who granted access */
  grantedBy: string;

  /** Display name of the user who granted access */
  grantedByName: string;

  /** Optional reason for the access grant */
  reason?: string;

  /** When the access expires */
  expiresAt: Date;

  /** Current status of the provisional access */
  status: ProvisionalAccessStatus;

  /** When the access was created */
  createdAt: Date;

  constructor(data: {
    id: string;
    userId: string;
    userName: string;
    topicId: string;
    topicTitle: string;
    grantedBy: string;
    grantedByName: string;
    reason?: string;
    expiresAt: Date;
    status: ProvisionalAccessStatus;
    createdAt: Date;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.userName = data.userName;
    this.topicId = data.topicId;
    this.topicTitle = data.topicTitle;
    this.grantedBy = data.grantedBy;
    this.grantedByName = data.grantedByName;
    if (data.reason) this.reason = data.reason;
    this.expiresAt = data.expiresAt;
    this.status = data.status;
    this.createdAt = data.createdAt;
  }

  /**
   * Check if the provisional access is currently active
   */
  isActive(): boolean {
    if (this.status !== 'ACTIVE') {
      return false;
    }
    if (this.expiresAt < new Date()) {
      return false;
    }
    return true;
  }

  /**
   * Check if the provisional access has expired
   */
  isExpired(): boolean {
    if (this.status === 'EXPIRED') {
      return true;
    }
    if (this.expiresAt < new Date()) {
      return true;
    }
    return false;
  }

  /**
   * Check if the provisional access has been revoked
   */
  isRevoked(): boolean {
    return this.status === 'REVOKED';
  }

  /**
   * Get a human-readable status description
   */
  getStatusDisplayName(): string {
    const displayNames: Record<ProvisionalAccessStatus, string> = {
      ACTIVE: 'Active',
      EXPIRED: 'Expired',
      REVOKED: 'Revoked',
    };
    return displayNames[this.status];
  }
}

/**
 * RequestAccessDto - Data transfer object for requesting provisional access
 *
 * Contains the optional reason for requesting access to a restricted topic.
 */
export class RequestAccessDto {
  /** Optional reason for requesting access */
  reason?: string;

  constructor(data?: { reason?: string }) {
    if (data?.reason) this.reason = data.reason;
  }
}

/**
 * AccessRequestDto - Data transfer object for a pending access request
 *
 * Contains the request details before approval/denial.
 */
export class AccessRequestDto {
  /** The unique identifier of the access request record */
  id: string;

  /** The unique identifier of the user requesting access */
  userId: string;

  /** Display name of the user requesting access */
  userName: string;

  /** The unique identifier of the topic */
  topicId: string;

  /** Title of the topic */
  topicTitle: string;

  /** Optional reason for requesting access */
  reason?: string;

  /** When the request was created */
  createdAt: Date;

  constructor(data: {
    id: string;
    userId: string;
    userName: string;
    topicId: string;
    topicTitle: string;
    reason?: string;
    createdAt: Date;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.userName = data.userName;
    this.topicId = data.topicId;
    this.topicTitle = data.topicTitle;
    if (data.reason) this.reason = data.reason;
    this.createdAt = data.createdAt;
  }
}

/**
 * ApproveAccessDto - Data transfer object for approving an access request
 *
 * Contains the optional reason for approval.
 */
export class ApproveAccessDto {
  /** Optional reason for approval */
  reason?: string;

  constructor(data?: { reason?: string }) {
    if (data?.reason) this.reason = data.reason;
  }
}

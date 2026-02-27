/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Service for privacy-preserving contact data handling.
 * Emails are normalized and hashed so raw emails are never stored.
 * Display names are truncated to protect privacy.
 */
@Injectable()
export class ContactHashService {
  /**
   * Hash an email address using SHA-256.
   * Email is normalized (lowercase, trimmed) before hashing.
   */
  hashEmail(email: string): string {
    const normalized = this.normalizeEmail(email);
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Normalize an email address for consistent hashing.
   */
  normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Truncate display name for privacy.
   * "John Smith" becomes "John S."
   * "John Michael Smith" becomes "John S."
   */
  truncateDisplayName(name: string | null): string | null {
    if (!name || name.trim() === '') {
      return null;
    }

    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0];
    }

    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
  }
}

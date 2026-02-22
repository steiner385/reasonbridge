/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ContactHashService } from '../contact-hash.service.js';

describe('ContactHashService', () => {
  const service = new ContactHashService();

  describe('hashEmail', () => {
    it('should generate consistent SHA-256 hash for same email', () => {
      const hash1 = service.hashEmail('test@example.com');
      const hash2 = service.hashEmail('test@example.com');

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should normalize emails before hashing (lowercase)', () => {
      const hash1 = service.hashEmail('Test@Example.COM');
      const hash2 = service.hashEmail('test@example.com');

      expect(hash1).toBe(hash2);
    });

    it('should normalize emails before hashing (trim whitespace)', () => {
      const hash1 = service.hashEmail('  test@example.com  ');
      const hash2 = service.hashEmail('test@example.com');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different emails', () => {
      const hash1 = service.hashEmail('user1@example.com');
      const hash2 = service.hashEmail('user2@example.com');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('truncateDisplayName', () => {
    it('should truncate full name to first name + last initial', () => {
      const result = service.truncateDisplayName('John Smith');

      expect(result).toBe('John S.');
    });

    it('should handle single name without truncation', () => {
      const result = service.truncateDisplayName('John');

      expect(result).toBe('John');
    });

    it('should handle multiple names (first + last initial)', () => {
      const result = service.truncateDisplayName('John Michael Smith');

      expect(result).toBe('John S.');
    });

    it('should return null for null input', () => {
      const result = service.truncateDisplayName(null);

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = service.truncateDisplayName('');

      expect(result).toBeNull();
    });
  });

  describe('normalizeEmail', () => {
    it('should lowercase and trim email', () => {
      const result = service.normalizeEmail('  TEST@EXAMPLE.COM  ');

      expect(result).toBe('test@example.com');
    });
  });
});

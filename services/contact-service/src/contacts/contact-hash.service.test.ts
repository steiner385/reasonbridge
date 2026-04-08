/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'crypto';

import { ContactHashService } from './contact-hash.service.js';

describe('ContactHashService', () => {
  let service: ContactHashService;

  beforeEach(() => {
    service = new ContactHashService();
  });

  describe('hashEmail', () => {
    it('should hash normalized email using SHA-256', () => {
      const email = 'test@example.com';
      const expectedHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

      const result = service.hashEmail(email);

      expect(result).toBe(expectedHash);
      expect(result).toHaveLength(64); // SHA-256 hex is 64 characters
    });

    it('should produce same hash for emails with different casing', () => {
      const email1 = 'Test@Example.COM';
      const email2 = 'test@example.com';
      const email3 = 'TEST@EXAMPLE.COM';

      const hash1 = service.hashEmail(email1);
      const hash2 = service.hashEmail(email2);
      const hash3 = service.hashEmail(email3);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should produce same hash for emails with leading/trailing whitespace', () => {
      const email1 = '  test@example.com  ';
      const email2 = 'test@example.com';
      const email3 = '\t test@example.com \n';

      const hash1 = service.hashEmail(email1);
      const hash2 = service.hashEmail(email2);
      const hash3 = service.hashEmail(email3);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should produce different hashes for different emails', () => {
      const hash1 = service.hashEmail('alice@example.com');
      const hash2 = service.hashEmail('bob@example.com');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('normalizeEmail', () => {
    it('should lowercase email', () => {
      const result = service.normalizeEmail('Test@Example.COM');

      expect(result).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      const result = service.normalizeEmail('  test@example.com  ');

      expect(result).toBe('test@example.com');
    });

    it('should handle both lowercase and trim together', () => {
      const result = service.normalizeEmail('  TEST@EXAMPLE.COM  ');

      expect(result).toBe('test@example.com');
    });

    it('should handle already normalized email', () => {
      const result = service.normalizeEmail('test@example.com');

      expect(result).toBe('test@example.com');
    });
  });

  describe('truncateDisplayName', () => {
    it('should return null for null input', () => {
      const result = service.truncateDisplayName(null);

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = service.truncateDisplayName('');

      expect(result).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      const result = service.truncateDisplayName('   ');

      expect(result).toBeNull();
    });

    it('should return single name unchanged', () => {
      const result = service.truncateDisplayName('John');

      expect(result).toBe('John');
    });

    it('should truncate two-part name to first name + last initial', () => {
      const result = service.truncateDisplayName('John Smith');

      expect(result).toBe('John S.');
    });

    it('should truncate multi-part name to first name + last initial', () => {
      const result = service.truncateDisplayName('John Michael Smith');

      expect(result).toBe('John S.');
    });

    it('should handle extra whitespace between parts', () => {
      const result = service.truncateDisplayName('  John   Smith  ');

      expect(result).toBe('John S.');
    });

    it('should uppercase the last initial', () => {
      const result = service.truncateDisplayName('john smith');

      expect(result).toBe('john S.');
    });

    it('should handle names with many parts correctly', () => {
      const result = service.truncateDisplayName('John van der Berg');

      expect(result).toBe('John B.');
    });
  });
});

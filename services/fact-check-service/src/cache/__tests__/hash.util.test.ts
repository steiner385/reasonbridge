/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { normalizeContent, computeContentHash } from '../hash.util.js';

describe('hash.util', () => {
  describe('normalizeContent', () => {
    it('should trim whitespace', () => {
      expect(normalizeContent('  hello world  ')).toBe('hello world');
    });

    it('should convert to lowercase', () => {
      expect(normalizeContent('Hello WORLD')).toBe('hello world');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeContent('hello    world')).toBe('hello world');
    });

    it('should handle tabs and newlines', () => {
      expect(normalizeContent('hello\t\nworld')).toBe('hello world');
    });

    it('should handle all transformations together', () => {
      expect(normalizeContent('  Hello   WORLD  \n\t  ')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(normalizeContent('')).toBe('');
    });
  });

  describe('computeContentHash', () => {
    it('should return consistent hash for same content', () => {
      const hash1 = computeContentHash('test claim');
      const hash2 = computeContentHash('test claim');
      expect(hash1).toBe(hash2);
    });

    it('should return same hash for equivalent normalized content', () => {
      const hash1 = computeContentHash('Test Claim');
      const hash2 = computeContentHash('  test   claim  ');
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different content', () => {
      const hash1 = computeContentHash('test claim one');
      const hash2 = computeContentHash('test claim two');
      expect(hash1).not.toBe(hash2);
    });

    it('should return 64-character hex string (SHA-256)', () => {
      const hash = computeContentHash('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { computeContentHash, normalizeContent } from '../hash.util.js';

describe('Hash Utility', () => {
  describe('normalizeContent', () => {
    it('should trim whitespace', () => {
      expect(normalizeContent('  hello world  ')).toBe('hello world');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeContent('hello    world')).toBe('hello world');
    });

    it('should normalize newlines', () => {
      expect(normalizeContent('hello\n\nworld')).toBe('hello world');
    });

    it('should lowercase content', () => {
      expect(normalizeContent('Hello World')).toBe('hello world');
    });
  });

  describe('computeContentHash', () => {
    it('should return consistent hash for same content', () => {
      const hash1 = computeContentHash('test content');
      const hash2 = computeContentHash('test content');
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different content', () => {
      const hash1 = computeContentHash('content one');
      const hash2 = computeContentHash('content two');
      expect(hash1).not.toBe(hash2);
    });

    it('should normalize before hashing', () => {
      const hash1 = computeContentHash('Hello World');
      const hash2 = computeContentHash('  hello   world  ');
      expect(hash1).toBe(hash2);
    });

    it('should return 64-character hex string (SHA-256)', () => {
      const hash = computeContentHash('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });
});

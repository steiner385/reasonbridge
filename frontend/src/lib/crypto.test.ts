/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { getMD5Hash } from './crypto';

/**
 * Test MD5 hash implementation against known test vectors
 * These vectors match the Node.js crypto.createHash('md5') implementation
 * Verified with: node -e "const crypto = require('crypto'); console.log(crypto.createHash('md5').update('...').digest('hex'))"
 */
describe('getMD5Hash', () => {
  // Test vectors from Node.js crypto module (which uses OpenSSL MD5)
  it('should hash empty string correctly', () => {
    const result = getMD5Hash('');
    expect(result).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });

  it('should hash simple string correctly', () => {
    const result = getMD5Hash('hello');
    expect(result).toBe('5d41402abc4b2a76b9719d911017c592');
  });

  it('should hash email addresses correctly', () => {
    const result = getMD5Hash('user@example.com');
    // Matches Node.js: crypto.createHash('md5').update('user@example.com').digest('hex')
    expect(result).toBe('b58996c504c5638798eb6b511e6f49af');
  });

  it('should be case-sensitive', () => {
    const uppercase = getMD5Hash('TEST@EXAMPLE.COM');
    const lowercase = getMD5Hash('test@example.com');
    expect(uppercase).not.toBe(lowercase);
  });

  it('should handle whitespace in input', () => {
    const withSpace = getMD5Hash(' user@example.com ');
    const trimmed = getMD5Hash('user@example.com');
    expect(withSpace).not.toBe(trimmed);
  });

  it('should hash longer strings correctly', () => {
    const result = getMD5Hash('The quick brown fox jumps over the lazy dog');
    expect(result).toBe('9e107d9d372bb6826bd81d3542a419d6');
  });

  it('should produce consistent results', () => {
    const input = 'consistent-hash-test@example.com';
    const hash1 = getMD5Hash(input);
    const hash2 = getMD5Hash(input);
    expect(hash1).toBe(hash2);
  });

  it('should produce 32-character lowercase hex output', () => {
    const result = getMD5Hash('test');
    expect(result).toHaveLength(32);
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  it('should handle UTF-8 characters', () => {
    const result = getMD5Hash('café');
    expect(result).toHaveLength(32);
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  it('should handle special characters', () => {
    const result = getMD5Hash('user+tag@example.com');
    expect(result).toHaveLength(32);
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  it('should match backend implementation for Gravatar', () => {
    // Test vector: crypto.createHash('md5').update('test@example.com').digest('hex')
    const result = getMD5Hash('test@example.com');
    expect(result).toBe('55502f40dc8b7c769880b10874abc9d0');
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = getMD5Hash('user1@example.com');
    const hash2 = getMD5Hash('user2@example.com');
    expect(hash1).not.toBe(hash2);
  });
});

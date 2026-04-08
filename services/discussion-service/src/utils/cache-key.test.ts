/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';

import { generateCacheKey } from './cache-key.js';

describe('generateCacheKey', () => {
  it('should generate a cache key with prefix and hash', () => {
    const result = generateCacheKey('topics:list', { page: 1, limit: 20 });

    expect(result).toMatch(/^topics:list:[a-f0-9]{16}$/);
  });

  it('should generate same key regardless of property order', () => {
    const key1 = generateCacheKey('topics:list', { page: 1, limit: 20, status: 'ACTIVE' });
    const key2 = generateCacheKey('topics:list', { status: 'ACTIVE', page: 1, limit: 20 });
    const key3 = generateCacheKey('topics:list', { limit: 20, status: 'ACTIVE', page: 1 });

    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
  });

  it('should generate different keys for different values', () => {
    const key1 = generateCacheKey('topics:list', { page: 1 });
    const key2 = generateCacheKey('topics:list', { page: 2 });

    expect(key1).not.toBe(key2);
  });

  it('should generate different keys for different prefixes', () => {
    const key1 = generateCacheKey('topics:list', { page: 1 });
    const key2 = generateCacheKey('topics:search', { page: 1 });

    expect(key1).not.toBe(key2);
  });

  it('should handle nested objects deterministically', () => {
    const key1 = generateCacheKey('test', {
      filter: { status: 'ACTIVE', type: 'PUBLIC' },
      page: 1,
    });
    const key2 = generateCacheKey('test', {
      page: 1,
      filter: { type: 'PUBLIC', status: 'ACTIVE' },
    });

    expect(key1).toBe(key2);
  });

  it('should handle arrays', () => {
    const key1 = generateCacheKey('test', { tags: ['a', 'b', 'c'] });
    const key2 = generateCacheKey('test', { tags: ['a', 'b', 'c'] });

    expect(key1).toBe(key2);
  });

  it('should differentiate arrays with different order', () => {
    const key1 = generateCacheKey('test', { tags: ['a', 'b', 'c'] });
    const key2 = generateCacheKey('test', { tags: ['c', 'b', 'a'] });

    // Arrays are order-sensitive (different semantic meaning)
    expect(key1).not.toBe(key2);
  });

  it('should handle null and undefined values', () => {
    const key1 = generateCacheKey('test', { value: null });
    const key2 = generateCacheKey('test', { value: undefined });

    // null and undefined should produce different keys
    expect(key1).not.toBe(key2);
  });

  it('should handle empty objects', () => {
    const result = generateCacheKey('topics:list', {});

    expect(result).toMatch(/^topics:list:[a-f0-9]{16}$/);
  });

  it('should handle deeply nested objects', () => {
    const key1 = generateCacheKey('test', {
      level1: {
        level2: {
          level3: { value: 'deep' },
        },
      },
    });
    const key2 = generateCacheKey('test', {
      level1: {
        level2: {
          level3: { value: 'deep' },
        },
      },
    });

    expect(key1).toBe(key2);
  });

  it('should handle mixed types', () => {
    const result = generateCacheKey('test', {
      string: 'hello',
      number: 42,
      boolean: true,
      array: [1, 2, 3],
      nested: { key: 'value' },
    });

    expect(result).toMatch(/^test:[a-f0-9]{16}$/);
  });
});

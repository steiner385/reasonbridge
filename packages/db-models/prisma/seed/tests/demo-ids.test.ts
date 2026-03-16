/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  generateTopicId,
  generateBridgingId,
  generateResponseId,
  generatePropositionId,
  generateCommonGroundId,
} from '../demo-ids.js';

describe('ID Generation', () => {
  describe('generateTopicId', () => {
    it('should generate deterministic topic IDs', () => {
      const id1 = generateTopicId(113);
      const id2 = generateTopicId(113);
      expect(id1).toBe(id2);
      expect(id1).toBe('11111111-0000-4000-8000-000000000113');
    });

    it('should generate unique IDs for different topics', () => {
      const id1 = generateTopicId(113);
      const id2 = generateTopicId(114);
      expect(id1).not.toBe(id2);
    });

    it('should support topic numbers up to 999', () => {
      const id = generateTopicId(999);
      expect(id).toBe('11111111-0000-4000-8000-000000000999');
    });
  });

  describe('generateBridgingId', () => {
    it('should generate deterministic bridging IDs', () => {
      const id1 = generateBridgingId(101, 1);
      const id2 = generateBridgingId(101, 1);
      expect(id1).toBe(id2);
    });

    it('should use 004 prefix for bridging', () => {
      const id = generateBridgingId(101, 1);
      expect(id).toMatch(/^11111111-0000-4000-8000-004/);
    });
  });

  describe('existing ID generators', () => {
    it('should maintain backward compatibility', () => {
      expect(generateResponseId(101, 1)).toBe('11111111-0000-4000-8000-000101000001');
      expect(generatePropositionId(101, 1)).toBe('11111111-0000-4000-8000-001101000001');
      expect(generateCommonGroundId(101, 1)).toBe('11111111-0000-4000-8000-003101000001');
    });
  });
});

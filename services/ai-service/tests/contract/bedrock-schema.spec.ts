/**
 * Contract tests validating Bedrock response schemas
 * Ensures responses from Bedrock match expected structures
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import * as fixtures from '../fixtures/bedrock-responses';

// Schema definitions matching expected Bedrock response formats
const ClusterSchema = z.object({
  theme: z.string().min(1),
  members: z.array(z.number().int().positive()),
});

const ClusterResponseSchema = z.array(ClusterSchema);

const ValuesResponseSchema = z.array(z.string().min(1));

const MoralFoundationsSchema = z.object({
  care: z.number().min(0).max(1),
  fairness: z.number().min(0).max(1),
  loyalty: z.number().min(0).max(1),
  authority: z.number().min(0).max(1),
  sanctity: z.number().min(0).max(1),
  liberty: z.number().min(0).max(1),
});

const ModerationResponseSchema = z.union([z.literal('SAFE'), z.string().regex(/^FLAGGED:/)]);

describe('Bedrock Response Schema Validation', () => {
  describe('ClusterResponse schema', () => {
    it('validates successful cluster response', () => {
      const fixture = fixtures.clusterTextsSuccess;
      const parsed = JSON.parse(fixture.response!.content);

      const result = ClusterResponseSchema.safeParse(parsed);
      expect(result.success).toBe(true);
    });

    it('validates empty cluster response', () => {
      const fixture = fixtures.clusterTextsEmpty;
      const parsed = JSON.parse(fixture.response!.content);

      const result = ClusterResponseSchema.safeParse(parsed);
      expect(result.success).toBe(true);
      expect(parsed).toHaveLength(0);
    });

    it('rejects cluster with missing theme', () => {
      const invalid = [{ members: [1, 2, 3] }];

      const result = ClusterResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects cluster with non-integer members', () => {
      const invalid = [{ theme: 'Test', members: [1.5, 2.7] }];

      const result = ClusterResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ValuesResponse schema', () => {
    it('validates successful values response', () => {
      const fixture = fixtures.identifyValuesSuccess;
      const parsed = JSON.parse(fixture.response!.content);

      const result = ValuesResponseSchema.safeParse(parsed);
      expect(result.success).toBe(true);
    });

    it('rejects empty string values', () => {
      const invalid = ['fairness', '', 'liberty'];

      const result = ValuesResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('MoralFoundations schema', () => {
    it('validates successful moral foundations response', () => {
      const fixture = fixtures.analyzeValuesSuccess;
      const parsed = JSON.parse(fixture.response!.content);

      const result = MoralFoundationsSchema.safeParse(parsed);
      expect(result.success).toBe(true);
    });

    it('validates mixed foundations response', () => {
      const fixture = fixtures.analyzeValuesMixed;
      const parsed = JSON.parse(fixture.response!.content);

      const result = MoralFoundationsSchema.safeParse(parsed);
      expect(result.success).toBe(true);
    });

    it('validates low-signal foundations response', () => {
      const fixture = fixtures.analyzeValuesNoMatch;
      const parsed = JSON.parse(fixture.response!.content);

      const result = MoralFoundationsSchema.safeParse(parsed);
      expect(result.success).toBe(true);
    });

    it('rejects scores outside 0-1 range', () => {
      const invalid = {
        care: 1.5,
        fairness: 0.5,
        loyalty: 0.5,
        authority: 0.5,
        sanctity: 0.5,
        liberty: 0.5,
      };

      const result = MoralFoundationsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects missing foundations', () => {
      const invalid = { care: 0.5, fairness: 0.5 }; // Missing other foundations

      const result = MoralFoundationsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Malformed response handling', () => {
    it('fails to parse malformed JSON', () => {
      const fixture = fixtures.malformedResponse;

      expect(() => JSON.parse(fixture.response!.content)).toThrow();
    });

    it('extracts JSON from mixed content using regex', () => {
      // Simulating the service's JSON extraction pattern
      const mixedContent =
        'Here is the analysis:\n\n[{"theme": "test", "members": [1]}]\n\nHope this helps!';
      const jsonMatch = mixedContent.match(/\[[\s\S]*\]/);

      expect(jsonMatch).not.toBeNull();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(ClusterResponseSchema.safeParse(parsed).success).toBe(true);
    });
  });

  describe('Moderation response schema', () => {
    it('validates SAFE response', () => {
      const result = ModerationResponseSchema.safeParse('SAFE');
      expect(result.success).toBe(true);
    });

    it('validates FLAGGED response with reason', () => {
      const result = ModerationResponseSchema.safeParse('FLAGGED: Contains inappropriate content');
      expect(result.success).toBe(true);
    });

    it('rejects invalid moderation response', () => {
      const result = ModerationResponseSchema.safeParse('MAYBE');
      expect(result.success).toBe(false);
    });
  });
});
